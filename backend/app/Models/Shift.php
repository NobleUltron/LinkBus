<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = [
        'shift_code',
        'user_id',
        'terminal_id',
        'bus_id',
        'starting_cash',
        'expected_cash',
        'actual_cash',
        'difference',
        'denominations',
        'status',
        'opened_at',
        'closed_at',
        'closed_by_user_id',
        'supervisor_name',
        'variance_reason',
        'closing_notes',
    ];

    protected $casts = [
        'starting_cash' => 'integer',
        'expected_cash' => 'integer',
        'actual_cash'   => 'integer',
        'difference'    => 'integer',
        'denominations' => 'array',
        'opened_at'     => 'datetime',
        'closed_at'     => 'datetime',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    public function terminal(): BelongsTo
    {
        return $this->belongsTo(Terminal::class);
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(ShiftTransaction::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function luggage(): HasMany
    {
        return $this->hasMany(Luggage::class);
    }

    public function parcels(): HasMany
    {
        return $this->hasMany(Parcel::class);
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }

    public function scopeSuspended($query)
    {
        return $query->where('status', 'suspended');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    // ── Financial Calculation & Business Logic ────────────────────────────────

    /**
     * Calculates the exact expected physical cash sitting in the till.
     * Expected Cash = Starting Float + Inflows (Cash Tickets + Cash Luggage + Cash Parcels + Cash-In Topups + Cash Adjustments)
     *               - Outflows (Petty Expenses + Safe Drops + Cash Refunds + Cash Out Adjustments)
     */
    public function calculateExpectedCash(): int
    {
        $openingFloat = (int) $this->starting_cash;

        // Cash Inflows from Collections
        $ticketCash = (int) $this->bookings()
            ->where('payment_method', 'cash')
            ->whereIn('status', ['confirmed', 'completed'])
            ->sum('total_amount');

        $luggageCash = (int) $this->luggage()
            ->where('payment_method', 'cash')
            ->sum('price');

        $parcelCash = (int) $this->parcels()
            ->where('payment_method', 'cash')
            ->sum('price');

        // Cash Movements from Immutable Drawer Transactions
        $cashIn = (int) $this->transactions()
            ->where('type', 'cash_in')
            ->where('payment_method', 'cash')
            ->sum('amount');

        $pettyExpenses = (int) $this->transactions()
            ->where('type', 'petty_expense')
            ->where('payment_method', 'cash')
            ->sum('amount');

        $safeDrops = (int) $this->transactions()
            ->where('type', 'safe_drop')
            ->where('payment_method', 'cash')
            ->sum('amount');

        $refunds = (int) $this->transactions()
            ->where('type', 'refund')
            ->where('payment_method', 'cash')
            ->sum('amount');

        $adjustmentsIn = (int) $this->transactions()
            ->where('type', 'adjustment')
            ->where('direction', 'inflow')
            ->where('payment_method', 'cash')
            ->sum('amount');

        $adjustmentsOut = (int) $this->transactions()
            ->where('type', 'adjustment')
            ->where('direction', 'outflow')
            ->where('payment_method', 'cash')
            ->sum('amount');

        $expected = ($openingFloat + $ticketCash + $luggageCash + $parcelCash + $cashIn + $adjustmentsIn)
            - ($pettyExpenses + $safeDrops + $refunds + $adjustmentsOut);

        return max(0, $expected);
    }

    /**
     * Real-time financial metrics breakdown for Z-Report and POS top status ribbon.
     */
    public function getLiveMetrics(): array
    {
        // 1. Ticket Sales by payment channel
        $ticketSales = $this->bookings()
            ->whereIn('status', ['confirmed', 'completed'])
            ->get();

        $ticketCash = (int) $ticketSales->where('payment_method', 'cash')->sum('total_amount');
        $ticketMomo = (int) $ticketSales->where('payment_method', 'mtn_mobile_money')->sum('total_amount');
        $ticketAirtel = (int) $ticketSales->where('payment_method', 'airtel_money')->sum('total_amount');
        $ticketCard = (int) $ticketSales->where('payment_method', 'card')->sum('total_amount');
        $ticketTotal = (int) $ticketSales->sum('total_amount');
        $ticketCount = $ticketSales->count();

        // 2. Luggage collections
        $luggageItems = $this->luggage()->get();
        $luggageCash = (int) $luggageItems->where('payment_method', 'cash')->sum('price');
        $luggageMomo = (int) $luggageItems->where('payment_method', 'mtn_mobile_money')->sum('price');
        $luggageAirtel = (int) $luggageItems->where('payment_method', 'airtel_money')->sum('price');
        $luggageTotal = (int) $luggageItems->sum('price');
        $luggageCount = $luggageItems->count();

        // 3. Parcel waybills
        $parcelItems = $this->parcels()->get();
        $parcelCash = (int) $parcelItems->where('payment_method', 'cash')->sum('price');
        $parcelMomo = (int) $parcelItems->where('payment_method', 'mtn_mobile_money')->sum('price');
        $parcelAirtel = (int) $parcelItems->where('payment_method', 'airtel_money')->sum('price');
        $parcelTotal = (int) $parcelItems->sum('price');
        $parcelCount = $parcelItems->count();

        // 4. Drawer transactions
        $txs = $this->transactions()->latest()->get();
        $cashInTotal = (int) $txs->where('type', 'cash_in')->sum('amount');
        $expensesTotal = (int) $txs->where('type', 'petty_expense')->sum('amount');
        $safeDropsTotal = (int) $txs->where('type', 'safe_drop')->sum('amount');
        $refundsTotal = (int) $txs->where('type', 'refund')->sum('amount');

        $openingFloat = (int) $this->starting_cash;
        $expectedCash = $this->calculateExpectedCash();

        $expectedMomo = $ticketMomo + $luggageMomo + $parcelMomo;
        $expectedAirtel = $ticketAirtel + $luggageAirtel + $parcelAirtel;
        $expectedCard = $ticketCard;
        $expectedGross = $expectedCash + $expectedMomo + $expectedAirtel + $expectedCard;

        return [
            'shift_id'              => $this->id,
            'shift_code'            => $this->shift_code,
            'status'                => $this->status,
            'opened_at'             => $this->opened_at?->toIso8601String(),
            'closed_at'             => $this->closed_at?->toIso8601String(),
            'terminal_id'           => $this->terminal_id,
            'terminal_name'         => $this->terminal?->name ?? 'Namayiba / Central Terminal',
            'terminal_city'         => $this->terminal?->city ?? 'Kampala',
            'cashier_id'            => $this->user_id,
            'cashier_name'          => $this->user?->name ?? 'Counter Clerk',
            'supervisor_name'       => $this->supervisor_name ?? 'Station Duty Supervisor',
            'closed_by_name'        => $this->closedBy?->name ?? null,

            'opening_float'         => $openingFloat,
            'starting_cash'         => $openingFloat,
            'cash_in_total'         => $cashInTotal,
            'cash_out_expenses'     => $expensesTotal,
            'safe_drops_total'      => $safeDropsTotal,
            'cash_refunds_total'    => $refundsTotal,
            'drawer_transactions'   => $txs,

            // Ticket breakdown
            'ticket_sales_cash'     => $ticketCash,
            'ticket_sales_momo'     => $ticketMomo,
            'ticket_sales_airtel'   => $ticketAirtel,
            'ticket_sales_card'     => $ticketCard,
            'ticket_sales_total'    => $ticketTotal,
            'ticket_count'          => $ticketCount,

            // Luggage breakdown
            'luggage_fees_cash'     => $luggageCash,
            'luggage_fees_momo'     => $luggageMomo,
            'luggage_fees_airtel'   => $luggageAirtel,
            'luggage_fees_total'    => $luggageTotal,
            'luggage_count'         => $luggageCount,

            // Parcel breakdown
            'parcel_fees_cash'      => $parcelCash,
            'parcel_fees_momo'      => $parcelMomo,
            'parcel_fees_airtel'    => $parcelAirtel,
            'parcel_fees_total'     => $parcelTotal,
            'parcel_count'          => $parcelCount,

            // Grand balances
            'system_expected_cash'  => $expectedCash,
            'system_expected_momo'  => $expectedMomo,
            'system_expected_airtel'=> $expectedAirtel,
            'system_expected_card'  => $expectedCard,
            'system_expected_total' => $expectedGross,

            'actual_counted_cash'   => $this->actual_cash,
            'variance_cash'         => $this->difference,
            'difference'            => $this->difference,
            'variance_reason'       => $this->variance_reason,
            'closing_notes'         => $this->closing_notes,
            'denominations'         => $this->denominations,
        ];
    }
}
