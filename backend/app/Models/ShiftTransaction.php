<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ShiftTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'shift_id',
        'user_id',
        'type',
        'amount',
        'direction',
        'payment_method',
        'source_type',
        'source_id',
        'idempotency_key',
        'category',
        'reason',
        'authorized_by',
    ];

    protected $casts = [
        'amount' => 'integer',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeInflows($query)
    {
        return $query->where('direction', 'inflow');
    }

    public function scopeOutflows($query)
    {
        return $query->where('direction', 'outflow');
    }

    public function scopeCash($query)
    {
        return $query->where('payment_method', 'cash');
    }

    public function scopeForShift($query, int $shiftId)
    {
        return $query->where('shift_id', $shiftId);
    }

    // ── Static Ledger Helper ──────────────────────────────────────────────────

    /**
     * Atomically records an immutable financial event into the shift ledger.
     * Prevents duplicate double-postings using the idempotency key if provided.
     */
    public static function recordEvent(Shift $shift, array $data): self
    {
        $idempotencyKey = $data['idempotency_key'] ?? null;

        if ($idempotencyKey) {
            $existing = static::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing;
            }
        }

        $direction = $data['direction'] ?? (in_array($data['type'] ?? '', ['petty_expense', 'safe_drop', 'refund']) ? 'outflow' : 'inflow');
        $paymentMethod = $data['payment_method'] ?? 'cash';
        $amount = (int) ($data['amount'] ?? 0);

        return static::create([
            'shift_id'        => $shift->id,
            'user_id'         => $data['user_id'] ?? $shift->user_id,
            'type'            => $data['type'],
            'amount'          => $amount,
            'direction'       => $direction,
            'payment_method'  => $paymentMethod,
            'source_type'     => $data['source_type'] ?? null,
            'source_id'       => $data['source_id'] ?? null,
            'idempotency_key' => $idempotencyKey,
            'category'        => $data['category'] ?? ucfirst(str_replace('_', ' ', $data['type'])),
            'reason'          => $data['reason'] ?? '',
            'authorized_by'   => $data['authorized_by'] ?? $shift->supervisor_name,
        ]);
    }
}
