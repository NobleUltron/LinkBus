<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Luggage;
use App\Models\Payment;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LuggageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Luggage::with([
            'booking.trip.route.originTerminal',
            'booking.trip.route.destinationTerminal',
            'booking.tickets.seat',
            'booking.user',
        ]);

        if ($request->filled('booking_id')) {
            $query->where('booking_id', $request->booking_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }
        if ($request->filled('from') || $request->filled('date_from')) {
            $from = $request->input('from', $request->input('date_from'));
            $query->whereDate('created_at', '>=', $from);
        }
        if ($request->filled('to') || $request->filled('date_to')) {
            $to = $request->input('to', $request->input('date_to'));
            $query->whereDate('created_at', '<=', $to);
        }

        $statsQuery = clone $query;
        $stats = [
            'total_count'  => (int) (clone $statsQuery)->count(),
            'excess_total' => (int) (clone $statsQuery)->sum('price'),
            'in_transit'   => (int) (clone $statsQuery)->where('status', 'in_transit')->count(),
            'delivered'    => (int) (clone $statsQuery)->where('status', 'delivered')->count(),
            'checked_in'   => (int) (clone $statsQuery)->where('status', 'checked_in')->count(),
        ];

        $luggage = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'luggage' => $luggage->map(fn($l) => $this->formatLuggage($l)),
            'meta'    => ['current_page' => $luggage->currentPage(), 'last_page' => $luggage->lastPage(), 'total' => $luggage->total()],
            'stats'   => $stats,
        ]);
    }

    public function lookup(Request $request): JsonResponse
    {
        $ref = trim($request->get('reference', ''));
        if (empty($ref)) {
            return response()->json(['message' => 'Please enter a booking number or ticket number.'], 422);
        }

        $cleanRef = ltrim($ref, '#');

        $booking = Booking::with([
            'trip.route.originTerminal',
            'trip.route.destinationTerminal',
            'tickets.seat',
            'user',
            'luggage',
        ])
            ->where('booking_number', $cleanRef)
            ->orWhere('booking_number', $ref)
            ->orWhere('id', is_numeric($cleanRef) ? (int)$cleanRef : 0)
            ->orWhereHas('tickets', fn($q) => $q->where('ticket_number', $cleanRef)->orWhere('ticket_number', $ref))
            ->first();

        if (!$booking) {
            return response()->json(['message' => "No reservation found matching reference '{$ref}'."], 404);
        }

        $firstTicket = $booking->tickets->first();
        $origin = $booking->trip?->route?->originTerminal?->name ?? 'Kampala';
        $destination = $booking->trip?->route?->destinationTerminal?->name ?? 'Upcountry';

        return response()->json([
            'booking_id'     => $booking->id,
            'booking_number' => $booking->booking_number,
            'passenger_name' => $firstTicket?->passenger_name ?? $booking->user?->name ?? 'Passenger',
            'route'          => "{$origin} → {$destination}",
            'departure_time' => $booking->trip?->departure_time?->toISOString() ?? $booking->created_at?->toISOString(),
            'items'          => $booking->luggage->map(fn($l) => $this->formatLuggage($l)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $bookingId = $request->input('booking_id');
        if (!is_numeric($bookingId) || !Booking::where('id', $bookingId)->exists()) {
            $ref = ltrim((string) $bookingId, '#');
            $foundBooking = Booking::where('booking_number', $ref)
                ->orWhere('booking_number', (string) $bookingId)
                ->orWhereHas('tickets', fn($q) => $q->where('ticket_number', $ref))
                ->first();

            if ($foundBooking) {
                $bookingId = $foundBooking->id;
            }
        }

        $request->merge(['booking_id' => $bookingId]);

        $data = $request->validate([
            'booking_id'     => 'required|exists:bookings,id',
            'trip_seat_id'   => 'nullable|exists:trip_seats,id',
            'description'    => 'required|string',
            'weight_kg'      => 'required|numeric|min:0',
            'payment_method' => 'nullable|string|in:cash,mtn_mobile_money,airtel_money,card',
            'notes'          => 'nullable|string',
        ]);

        $paymentMethod = $data['payment_method'] ?? 'cash';
        unset($data['payment_method']);

        // 1. Calculate excess fee from system settings
        $freeAllowance = (float) (Setting::getValue('free_luggage_kg', 20) ?? 20);
        $ratePerKg = (float) (Setting::getValue('excess_luggage_fee_per_kg', 2000) ?? 2000);
        $weight = (float) $data['weight_kg'];
        $excessKg = max(0, $weight - $freeAllowance);
        $excessFee = (int) round($excessKg * $ratePerKg);

        $shiftId = null;
        $activeShift = \App\Models\Shift::where('user_id', $request->user()->id)->where('status', 'open')->first();
        if ($paymentMethod === 'cash' && $excessFee > 0) {
            if (!$activeShift) {
                return response()->json([
                    'message' => 'Shift is Closed! You must open your cash drawer shift before accepting cash baggage fees, or choose MTN MoMo / Airtel Money / Card payment.'
                ], 403);
            }
            $shiftId = $activeShift->id;
        } elseif ($excessFee > 0 && $activeShift) {
            $shiftId = $activeShift->id;
        }

        // 2. Create the Luggage record and atomic ledger entry
        $luggage = DB::transaction(function () use ($data, $paymentMethod, $excessFee, $shiftId, $bookingId, $request, $activeShift) {
            $l = Luggage::create([
                ...$data,
                'tag_number'     => Luggage::generateTagNumber(),
                'payment_method' => $paymentMethod,
                'price'          => $excessFee,
                'shift_id'       => $shiftId,
                'status'         => 'checked_in',
            ]);

            // 3. If excess fee is charged, record a completed Payment transaction
            if ($excessFee > 0) {
                Payment::create([
                    'booking_id'     => $bookingId,
                    'method'         => $paymentMethod,
                    'amount'         => $excessFee,
                    'status'         => 'completed',
                    'transaction_id' => Payment::generateTransactionId($paymentMethod),
                ]);

                if ($activeShift) {
                    \App\Models\ShiftTransaction::recordEvent($activeShift, [
                        'user_id'         => $request->user()->id,
                        'type'            => 'cash_fee_luggage',
                        'amount'          => $excessFee,
                        'direction'       => 'inflow',
                        'payment_method'  => $paymentMethod,
                        'category'        => 'Excess Luggage',
                        'reason'          => "Excess baggage fee for Tag #{$l->tag_number} ({$l->weight_kg}kg)",
                        'authorized_by'   => $request->user()->name,
                        'source_type'     => \App\Models\Luggage::class,
                        'source_id'       => $l->id,
                        'idempotency_key' => "luggage-{$l->id}-fee",
                    ]);
                }
            }

            return $l;
        });

        $luggage->load([
            'booking.trip.route.originTerminal',
            'booking.trip.route.destinationTerminal',
            'booking.tickets.seat',
            'booking.user',
        ]);

        return response()->json(['luggage' => $this->formatLuggage($luggage)], 201);
    }

    public function update(Request $request, Luggage $luggage): JsonResponse
    {
        $data = $request->validate([
            'status'      => 'sometimes|in:checked_in,in_transit,delivered,lost',
            'description' => 'sometimes|string',
            'weight_kg'   => 'sometimes|numeric|min:0',
            'notes'       => 'nullable|string',
        ]);

        $luggage->update($data);
        $luggage->load([
            'booking.trip.route.originTerminal',
            'booking.trip.route.destinationTerminal',
            'booking.tickets.seat',
            'booking.user',
        ]);

        return response()->json(['luggage' => $this->formatLuggage($luggage)]);
    }

    private function formatLuggage(Luggage $l): array
    {
        $firstTicket = $l->booking?->tickets?->first();
        $origin = $l->booking?->trip?->route?->originTerminal?->name ?? '—';
        $destination = $l->booking?->trip?->route?->destinationTerminal?->name ?? '—';
        $route = ($origin !== '—' && $destination !== '—') ? "{$origin} → {$destination}" : '—';
        $passengerName = $firstTicket?->passenger_name ?? $l->booking?->user?->name ?? '—';
        $seatNumber = $firstTicket?->seat?->seat_number;
        $departureTime = $l->booking?->trip?->departure_time?->toISOString() ?? $l->created_at?->toISOString();

        return [
            'id'             => $l->id,
            'booking_id'     => $l->booking_id,
            'tag_number'     => $l->tag_number,
            'description'    => $l->description,
            'weight_kg'      => (float) $l->weight_kg,
            'payment_method' => $l->payment_method ?? 'cash',
            'price'          => (int) ($l->price ?? 0),
            'excess_fee'     => (int) ($l->price ?? 0),
            'shift_id'       => $l->shift_id,
            'status'         => $l->status,
            'notes'          => $l->notes ?? '',
            'booking_number' => $l->booking?->booking_number ?? '',
            'passenger_name' => $passengerName,
            'seat_number'    => $seatNumber,
            'route'          => $route,
            'departure_time' => $departureTime,
            'created_at'     => $l->created_at?->toISOString(),
        ];
    }
}
