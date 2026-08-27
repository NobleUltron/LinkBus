<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\PromoCode;
use App\Models\SeatLock;
use App\Models\Ticket;
use App\Models\Trip;
use App\Models\TripSeat;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService,
        protected WhatsAppService $whatsAppService
    ) {}
    /**
     * Lock a seat for 10 minutes (during booking flow).
     */
    public function lockSeat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'trip_id' => 'required|exists:trips,id',
            'seat_id' => 'required|exists:trip_seats,id',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($data, $user) {
            // Clean expired locks
            SeatLock::where('seat_id', $data['seat_id'])
                ->where('expires_at', '<', now())
                ->delete();

            // Check if seat is already locked or booked
            $seat = TripSeat::lockForUpdate()->findOrFail($data['seat_id']);

            if ($seat->status === 'booked') {
                return response()->json(['message' => 'Seat is already booked.'], 409);
            }

            $existingLock = SeatLock::where('seat_id', $data['seat_id'])
                ->where('expires_at', '>=', now())
                ->where('user_id', '!=', $user->id)
                ->first();

            if ($existingLock) {
                return response()->json(['message' => 'Seat is currently locked by another user.'], 409);
            }

            // Update or create lock for this user
            $lockMin = (int) Setting::getValue('seat_lock_minutes', 10);
            $lock = SeatLock::updateOrCreate(
                ['seat_id' => $data['seat_id'], 'user_id' => $user->id],
                ['trip_id' => $data['trip_id'], 'expires_at' => now()->addMinutes($lockMin)]
            );

            $seat->update(['status' => 'locked']);

            return response()->json([
                'message'    => 'Seat locked successfully.',
                'expires_at' => $lock->expires_at->toISOString(),
                'lock_id'    => $lock->id,
            ]);
        });
    }

    /**
     * Release a previously locked seat.
     */
    public function unlockSeat(Request $request): JsonResponse
    {
        $request->validate(['seat_id' => 'required|exists:trip_seats,id']);

        DB::transaction(function () use ($request) {
            $lock = SeatLock::where('seat_id', $request->seat_id)
                ->where('user_id', $request->user()->id)
                ->first();

            if ($lock) {
                $lock->delete();
                TripSeat::where('id', $request->seat_id)
                    ->where('status', 'locked')
                    ->update(['status' => 'available']);
            }
        });

        return response()->json(['message' => 'Seat unlocked.']);
    }

    /**
     * Release all active locks held by the current user on a trip.
     */
    public function releaseUserTripLocks(Request $request, Trip $trip): JsonResponse
    {
        $user = $request->user();
        $seatIds = SeatLock::where('trip_id', $trip->id)
            ->where('user_id', $user->id)
            ->pluck('seat_id')
            ->all();

        if (!empty($seatIds)) {
            SeatLock::whereIn('seat_id', $seatIds)->delete();
            TripSeat::whereIn('id', $seatIds)
                ->where('status', 'locked')
                ->update(['status' => 'available']);
        }

        return response()->json(['message' => 'Seats released successfully.']);
    }

    /**
     * Admin/Staff manual release of an abandoned seat lock.
     */
    public function adminReleaseLock(Request $request, TripSeat $seat): JsonResponse
    {
        SeatLock::where('seat_id', $seat->id)->delete();
        $seat->update(['status' => 'available']);

        return response()->json(['message' => "Hold on seat {$seat->seat_number} released successfully."]);
    }

    /**
     * Validate a promo code.
     */
    public function validatePromo(Request $request): JsonResponse
    {
        $request->validate([
            'code'    => 'required|string',
            'amount'  => 'required|integer|min:0',
        ]);

        $code = strtoupper(trim($request->code));
        $promo = PromoCode::where('code', $code)->first();

        if (!$promo) {
            return response()->json(['message' => "Promo code '{$code}' does not exist."], 422);
        }

        $user = $request->user();
        $error = $promo->getValidationError($user, (int) $request->amount);

        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        $discount = $promo->calculateDiscount((int) $request->amount);

        return response()->json([
            'valid'              => true,
            'code'               => $promo->code,
            'description'        => $promo->description,
            'discount_type'      => $promo->discount_type,
            'discount_value'     => $promo->discount_value,
            'discount_amount'    => $discount,
            'max_uses_per_user'  => $promo->max_uses_per_user,
            'first_booking_only' => $promo->first_booking_only,
        ]);
    }

    /**
     * Create a booking with tickets and payment — atomically.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'trip_id'        => 'required|exists:trips,id',
            'seats'          => 'required|array|min:1',
            'seats.*.seat_id'           => 'required|exists:trip_seats,id',
            'seats.*.passenger_name'    => 'required|string|max:255',
            'seats.*.passenger_phone'   => 'nullable|string|max:30',
            'payment_method'  => 'required|in:cash,mtn_mobile_money,airtel_money,card',
            'promo_code'      => 'nullable|string',
        ]);

        $trip = Trip::findOrFail($data['trip_id']);
        if (!in_array($trip->status, ['scheduled', 'boarding'])) {
            return response()->json([
                'message' => "This departure is not accepting bookings (status: {$trip->status}). Please select an upcoming scheduled departure.",
            ], 422);
        }

        $booking = DB::transaction(function () use ($data, $request, $trip) {
            $user = $request->user();

            // Validate and lock seats
            $seatIds = array_column($data['seats'], 'seat_id');
            $seats = TripSeat::whereIn('id', $seatIds)->lockForUpdate()->get()->keyBy('id');

            foreach ($seatIds as $seatId) {
                $seat = $seats[$seatId] ?? null;
                if (!$seat) {
                    abort(422, "Seat ID {$seatId} not found on this trip.");
                }

                $isHeldByCurrentUser = false;
                if ($seat->status === 'locked') {
                    $isHeldByCurrentUser = SeatLock::where('seat_id', $seat->id)
                        ->where('user_id', $user->id)
                        ->where('expires_at', '>=', now())
                        ->exists();
                }

                if ($seat->status !== 'available' && !$isHeldByCurrentUser) {
                    abort(422, "Seat {$seat->seat_number} is no longer available.");
                }
            }

            // Calculate amounts
            $subtotal = $seats->sum('price');
            $discount = 0;
            $appliedPromoCode = null;

            if (!empty($data['promo_code'])) {
                $code = strtoupper(trim($data['promo_code']));
                $promo = PromoCode::where('code', $code)
                    ->lockForUpdate()
                    ->first();
                if ($promo) {
                    $promoError = $promo->getValidationError($user, $subtotal);
                    if ($promoError) {
                        abort(422, $promoError);
                    }
                    $discount = $promo->calculateDiscount($subtotal);
                    $appliedPromoCode = $promo->code;
                    $promo->increment('used_count');
                } else {
                    abort(422, "Invalid promo code '{$code}'.");
                }
            }

            $taxRate  = (int) Setting::getValue('tax_rate', 0);
            $taxAmount = (int) round(($subtotal - $discount) * $taxRate / 100);
            $total    = $subtotal - $discount + $taxAmount;

            // Payment and ticket status resolution
            $isCounterSale = $request->boolean('is_counter_sale') && $user->isStaff();
            $isCash = $data['payment_method'] === 'cash';
            $isPaid = !$isCash || $isCounterSale;

            $shiftId = null;
            if ($isCounterSale || ($isCash && $user->isStaff())) {
                $activeShift = \App\Models\Shift::where('user_id', $user->id)
                    ->where('status', 'open')
                    ->first();
                if (!$activeShift) {
                    abort(403, 'Forbidden: Shift is Closed — You must open your cash drawer shift before processing counter sales.');
                }
                $shiftId = $activeShift->id;
            }
            
            $bookingStatus = $isPaid ? 'confirmed' : 'pending';
            $paymentStatus = $isPaid ? 'completed' : 'pending';
            $ticketStatus  = $isPaid ? 'active' : 'pending_payment';

            // Create booking
            $booking = Booking::create([
                'booking_number'   => Booking::generateBookingNumber(),
                'user_id'          => $user->id,
                'trip_id'          => $trip->id,
                'shift_id'         => $shiftId,
                'status'           => $bookingStatus,
                'subtotal'         => $subtotal,
                'discount_amount'  => $discount,
                'tax_amount'       => $taxAmount,
                'total_amount'     => $total,
                'payment_method'   => $data['payment_method'],
                'promo_code'       => $appliedPromoCode,
            ]);

            // Create tickets and mark seats booked
            foreach ($data['seats'] as $seatData) {
                $seat = $seats[$seatData['seat_id']];
                $seat->update(['status' => 'booked']);

                // Clear any lock
                SeatLock::where('seat_id', $seat->id)->delete();

                Ticket::create([
                    'booking_id'       => $booking->id,
                    'trip_seat_id'     => $seat->id,
                    'passenger_name'   => $seatData['passenger_name'],
                    'passenger_phone'  => $seatData['passenger_phone'] ?? null,
                    'ticket_number'    => Ticket::generateTicketNumber(),
                    'qr_code'          => 'QR-' . strtoupper(uniqid()),
                    'status'           => $ticketStatus,
                ]);
            }

            // Create payment record
            Payment::create([
                'booking_id'     => $booking->id,
                'method'         => $data['payment_method'],
                'amount'         => $total,
                'status'         => $paymentStatus,
                'transaction_id' => $isPaid ? Payment::generateTransactionId($data['payment_method']) : null,
            ]);

            // Update trip available seats
            $trip->recomputeAvailableSeats();

            $booking->load(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'trip.bus', 'tickets.seat', 'payment', 'user']);

            return $booking;
        });

        if ($booking instanceof JsonResponse) {
            return $booking;
        }

        // Trigger multi-channel notifications (In-App, SMS, Email)
        try {
            $this->notificationService->notifyBookingConfirmed($booking);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Booking notification error: " . $e->getMessage());
        }

        return response()->json([
            'booking' => $this->formatBooking($booking),
        ], 201);
    }

    /**
     * Confirm cash payment at terminal counter (Staff/Admin only).
     */
    public function confirmPayment(Request $request, Booking $booking): JsonResponse
    {
        $user = $request->user();
        if (!$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized. Staff role required to collect cash.'], 403);
        }

        if ($booking->status === 'confirmed' && $booking->payment?->status === 'completed') {
            return response()->json(['message' => 'This booking has already been paid in full.'], 422);
        }

        DB::transaction(function () use ($booking) {
            $booking->update(['status' => 'confirmed']);

            if ($booking->payment) {
                $booking->payment->update([
                    'status'         => 'completed',
                    'transaction_id' => Payment::generateTransactionId('cash'),
                ]);
            } else {
                Payment::create([
                    'booking_id'     => $booking->id,
                    'method'         => 'cash',
                    'amount'         => $booking->total_amount,
                    'status'         => 'completed',
                    'transaction_id' => Payment::generateTransactionId('cash'),
                ]);
            }

            // Activate all tickets for bus boarding
            $booking->tickets()->where('status', 'pending_payment')->update(['status' => 'active']);
        });

        $booking->load(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'trip.bus', 'tickets.seat', 'payment', 'user']);

        // Trigger confirmation notification
        try {
            $this->notificationService->notifyBookingConfirmed($booking);
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => "Payment of UGX " . number_format($booking->total_amount) . " confirmed successfully. Boarding pass activated.",
            'booking' => $this->formatBooking($booking),
        ]);
    }

    /**
     * Verify/simulate Mobile Money USSD push transaction.
     */
    public function verifyMomo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'    => 'required|string',
            'amount'   => 'required|numeric|min:500',
            'provider' => 'required|in:mtn,airtel',
        ]);

        $txId = strtoupper($data['provider']) . '-MM-' . date('ymd') . '-' . strtoupper(\Illuminate\Support\Str::random(6));

        return response()->json([
            'status'         => 'approved',
            'transaction_id' => $txId,
            'message'        => 'Mobile Money payment prompt authorized successfully.',
        ]);
    }

    /**
     * List bookings for the authenticated user (or all if admin/staff).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Booking::with(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'trip.bus', 'tickets.seat', 'payment'])
            ->leftJoin('trips', 'bookings.trip_id', '=', 'trips.id')
            ->select('bookings.*');

        if (!$user->isStaff()) {
            $query->where('bookings.user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('bookings.user_id', $request->user_id);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('bookings.booking_number', 'like', "%{$search}%")
                  ->orWhereHas('tickets', function ($tq) use ($search) {
                      $tq->where('ticket_number', 'like', "%{$search}%")
                         ->orWhere('qr_code', 'like', "%{$search}%")
                         ->orWhere('passenger_name', 'like', "%{$search}%")
                         ->orWhere('passenger_phone', 'like', "%{$search}%");
                  })
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%")
                         ->orWhere('phone', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('status')) {
            $query->where('bookings.status', $request->status);
        }
        if ($request->filled('trip_id')) {
            $query->where('bookings.trip_id', $request->trip_id);
        }
        if ($request->filled('date')) {
            $query->whereDate('bookings.created_at', $request->date);
        }
        if ($request->filled('from') || $request->filled('date_from')) {
            $from = $request->input('from', $request->input('date_from'));
            $query->whereDate('bookings.created_at', '>=', $from);
        }
        if ($request->filled('to') || $request->filled('date_to')) {
            $to = $request->input('to', $request->input('date_to'));
            $query->whereDate('bookings.created_at', '<=', $to);
        }

        // Smart Urgency Ordering: Active upcoming trips first (soonest first), then past trips, then cancelled
        $query->orderByRaw("
            CASE 
                WHEN bookings.status != 'cancelled' AND trips.departure_time >= NOW() THEN 0
                WHEN bookings.status != 'cancelled' AND trips.departure_time < NOW() THEN 1
                ELSE 2
            END ASC
        ")
        ->orderByRaw("
            CASE 
                WHEN bookings.status != 'cancelled' AND trips.departure_time >= NOW() THEN trips.departure_time 
                ELSE NULL 
            END ASC
        ")
        ->orderBy('trips.departure_time', 'desc')
        ->orderBy('bookings.id', 'desc');

        $perPage = (int) $request->get('per_page', 20);
        $bookings = $query->paginate($perPage);

        return response()->json([
            'bookings' => $bookings->map(fn($b) => $this->formatBooking($b)),
            'meta'     => [
                'current_page' => $bookings->currentPage(),
                'last_page'    => $bookings->lastPage(),
                'total'        => $bookings->total(),
            ],
        ]);
    }

    public function show(Request $request, Booking $booking): JsonResponse
    {
        // Passengers can only view their own bookings
        if (!$request->user()->isStaff() && $booking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $booking->load(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'trip.bus', 'tickets.seat', 'payment', 'luggage']);

        return response()->json(['booking' => $this->formatBooking($booking)]);
    }

    /**
     * Cancel a booking.
     */
    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        if (!$request->user()->isStaff() && $booking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if (!in_array($booking->status, ['pending', 'confirmed'])) {
            return response()->json(['message' => 'Booking cannot be cancelled.'], 422);
        }

        DB::transaction(function () use ($booking) {
            $feePct = (int) Setting::getValue('cancellation_fee_pct', 10);
            $fee    = (int) round($booking->total_amount * $feePct / 100);

            $booking->update([
                'status'           => 'cancelled',
                'cancellation_fee' => $fee,
                'cancelled_at'     => now(),
            ]);

            // Release seats
            $booking->tickets->each(function ($ticket) {
                $ticket->seat?->update(['status' => 'available']);
                $ticket->update(['status' => 'cancelled']);
            });

            // Recompute trip seats
            $booking->trip->recomputeAvailableSeats();
        });

        // Trigger cancellation notification
        try {
            $this->notificationService->notifyBookingCancelled($booking);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Booking cancellation notification error: " . $e->getMessage());
        }

        return response()->json(['booking' => $booking->fresh()->only(['id', 'booking_number', 'status', 'cancellation_fee'])]);
    }

    /**
     * Board a passenger (scan QR / ticket number).
     */
    public function boardPassenger(Request $request): JsonResponse
    {
        $request->validate(['ticket_number' => 'required|string']);

        $raw = trim($request->ticket_number);
        // Clean URL or payload if scanner read full URL
        if (str_starts_with($raw, 'http://') || str_starts_with($raw, 'https://')) {
            $raw = basename($raw);
        }

        $ticket = Ticket::with(['booking.trip.route.originTerminal', 'booking.trip.route.destinationTerminal', 'booking.trip.bus', 'seat'])
            ->where('ticket_number', $raw)
            ->orWhere('qr_code', $raw)
            ->first();

        if (!$ticket) {
            return response()->json(['message' => "Ticket '{$raw}' not found."], 404);
        }

        if ($ticket->status === 'used') {
            return response()->json(['message' => 'Passenger already boarded.'], 409);
        }

        if ($ticket->status === 'cancelled') {
            return response()->json(['message' => 'Ticket is cancelled.'], 422);
        }

        if ($ticket->status === 'pending_payment' || $ticket->booking?->status === 'pending') {
            $amt = number_format($ticket->booking?->total_amount ?? 0);
            return response()->json([
                'message' => "Cannot board passenger: Payment of UGX {$amt} is pending at station counter. Please direct passenger to ticket counter to complete payment.",
            ], 422);
        }

        $ticket->update(['status' => 'used', 'boarded_at' => now()]);

        // Trigger boarded notification
        try {
            $this->notificationService->notifyPassengerBoarded($ticket);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Passenger boarding notification error: " . $e->getMessage());
        }

        return response()->json([
            'message'        => 'Passenger boarded successfully.',
            'passenger_name' => $ticket->passenger_name,
            'seat_number'    => $ticket->seat?->seat_number,
            'ticket_number'  => $ticket->ticket_number,
        ]);
    }

    /**
     * Look up / verify a single ticket by QR code or ticket number.
     */
    public function verifyTicket(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string']);
        $raw = trim($request->code);
        if (str_starts_with($raw, 'http://') || str_starts_with($raw, 'https://')) {
            $raw = basename($raw);
        }

        $ticket = Ticket::with(['booking.trip.route.originTerminal', 'booking.trip.route.destinationTerminal', 'booking.trip.bus', 'seat', 'booking.user'])
            ->where('ticket_number', $raw)
            ->orWhere('qr_code', $raw)
            ->first();

        if (!$ticket) {
            return response()->json(['message' => "No ticket found matching '{$raw}'."], 404);
        }

        return response()->json([
            'ticket' => [
                'id'              => $ticket->id,
                'booking_id'      => $ticket->booking_id,
                'trip_seat_id'    => $ticket->trip_seat_id,
                'passenger_name'  => $ticket->passenger_name,
                'passenger_phone' => $ticket->passenger_phone,
                'ticket_number'   => $ticket->ticket_number,
                'qr_code'         => $ticket->qr_code,
                'status'          => $ticket->status,
                'boarded_at'      => $ticket->boarded_at?->toISOString(),
                'seat'            => [
                    'id'          => $ticket->seat?->id ?? 0,
                    'trip_id'     => $ticket->booking?->trip_id ?? 0,
                    'seat_number' => $ticket->seat?->seat_number ?? '—',
                    'seat_class'  => $ticket->seat?->seat_class ?? 'standard',
                    'status'      => $ticket->seat?->status ?? 'booked',
                ],
                'trip'            => $ticket->booking?->trip ? [
                    'id'             => $ticket->booking->trip->id,
                    'departure_time' => $ticket->booking->trip->departure_time?->toISOString(),
                    'arrival_time'   => $ticket->booking->trip->arrival_time?->toISOString(),
                    'fare'           => $ticket->booking->trip->fare,
                    'status'         => $ticket->booking->trip->status,
                    'origin'         => [
                        'id'   => $ticket->booking->trip->route?->originTerminal?->id,
                        'name' => $ticket->booking->trip->route?->originTerminal?->name,
                        'city' => $ticket->booking->trip->route?->originTerminal?->city,
                    ],
                    'destination'    => [
                        'id'   => $ticket->booking->trip->route?->destinationTerminal?->id,
                        'name' => $ticket->booking->trip->route?->destinationTerminal?->name,
                        'city' => $ticket->booking->trip->route?->destinationTerminal?->city,
                    ],
                    'bus'            => [
                        'id'           => $ticket->booking->trip->bus?->id,
                        'plate_number' => $ticket->booking->trip->bus?->plate_number,
                        'model'        => $ticket->booking->trip->bus?->model,
                        'bus_type'     => $ticket->booking->trip->bus?->bus_type,
                    ],
                ] : null,
                'booking'         => [
                    'id'             => $ticket->booking?->id,
                    'booking_number' => $ticket->booking?->booking_number,
                    'total_amount'   => $ticket->booking?->total_amount,
                    'payment_method' => $ticket->booking?->payment_method,
                    'status'         => $ticket->booking?->status,
                    'created_at'     => $ticket->booking?->created_at?->toISOString(),
                ],
            ]
        ]);
    }

    // ─── Formatting helpers ──────────────────────────────────────────

    private function formatBooking(Booking $booking): array
    {
        return [
            'id'              => $booking->id,
            'booking_number'  => $booking->booking_number,
            'status'          => $booking->status,
            'subtotal'        => $booking->subtotal,
            'discount_amount' => $booking->discount_amount,
            'tax_amount'      => $booking->tax_amount,
            'total_amount'    => $booking->total_amount,
            'payment_method'  => $booking->payment_method,
            'cancellation_fee'=> $booking->cancellation_fee,
            'cancelled_at'    => $booking->cancelled_at?->toISOString(),
            'created_at'      => $booking->created_at?->toISOString(),
            'trip'            => $booking->relationLoaded('trip') ? [
                'id'             => $booking->trip?->id,
                'departure_time' => $booking->trip?->departure_time?->toISOString(),
                'arrival_time'   => $booking->trip?->arrival_time?->toISOString(),
                'fare'           => $booking->trip?->fare,
                'status'         => $booking->trip?->status,
                'origin'         => $booking->trip?->route?->originTerminal?->name,
                'destination'    => $booking->trip?->route?->destinationTerminal?->name,
                'bus'            => $booking->trip?->bus?->plate_number,
            ] : null,
            'tickets' => $booking->relationLoaded('tickets') ? $booking->tickets->map(fn($t) => [
                'id'             => $t->id,
                'ticket_number'  => $t->ticket_number,
                'qr_code'        => $t->qr_code,
                'passenger_name' => $t->passenger_name,
                'passenger_phone'=> $t->passenger_phone,
                'seat_number'    => $t->seat?->seat_number,
                'seat_class'     => $t->seat?->seat_class,
                'status'         => $t->status,
                'boarded_at'     => $t->boarded_at?->toISOString(),
            ]) : null,
            'payment' => ($booking->relationLoaded('payment') || $booking->relationLoaded('payments')) ? [
                'method'         => $booking->payment?->method ?? $booking->payment_method,
                'amount'         => ($booking->relationLoaded('payments') && $booking->payments->isNotEmpty())
                    ? $booking->payments->sum('amount')
                    : ($booking->payment?->amount ?? $booking->total_amount),
                'status'         => $booking->payment?->status ?? ($booking->status === 'confirmed' ? 'completed' : 'pending'),
                'transaction_id' => $booking->payment?->transaction_id ?? $booking->payments?->first()?->transaction_id,
            ] : null,
        ];
    }

    /**
     * Get pre-formatted WhatsApp share link and text for a booking.
     */
    public function getWhatsappShare(Booking $booking): JsonResponse
    {
        $booking->loadMissing(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'trip.bus', 'tickets.seat', 'user']);

        $firstPassenger = $booking->tickets->first();
        $phone = $firstPassenger?->passenger_phone ?? $booking->user?->phone ?? '';
        $text = $this->whatsAppService->buildBookingConfirmationText($booking);
        $shareUrl = $this->whatsAppService->getWhatsAppShareLink($phone, $text);

        return response()->json([
            'phone'     => $phone,
            'text'      => $text,
            'share_url' => $shareUrl,
        ]);
    }

    /**
     * Resend automated WhatsApp message for a booking.
     */
    public function resendWhatsapp(Booking $booking): JsonResponse
    {
        $booking->loadMissing(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'trip.bus', 'tickets.seat', 'user']);
        $result = $this->whatsAppService->sendBookingConfirmationWhatsApp($booking);

        return response()->json([
            'success' => $result['success'] ?? false,
            'message' => $result['success'] ? 'WhatsApp ticket confirmation dispatched!' : ('Failed: ' . ($result['error'] ?? 'Unknown error')),
            'result'  => $result,
        ]);
    }

    /**
     * Confirm physical cash payment for a counter/pending booking.
     */
    public function confirmCashPayment(Request $request, Booking $booking): JsonResponse
    {
        $user = $request->user();
        if (!$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized. Only station staff can confirm cash collections.'], 403);
        }

        $activeShift = \App\Models\Shift::where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        if (!$activeShift) {
            return response()->json([
                'message' => 'Forbidden: Shift is Closed — You must open your duty shift float before collecting cash.'
            ], 403);
        }

        DB::transaction(function () use ($booking, $activeShift) {
            $booking->update([
                'status'   => 'confirmed',
                'shift_id' => $activeShift->id,
            ]);

            $booking->tickets()->update(['status' => 'active']);

            Payment::updateOrCreate(
                ['booking_id' => $booking->id],
                [
                    'method'         => 'cash',
                    'amount'         => $booking->total_amount,
                    'status'         => 'completed',
                    'transaction_id' => 'CSH-' . strtoupper(uniqid()),
                ]
            );
        });

        $booking->loadMissing(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'trip.bus', 'tickets.seat', 'payment', 'payments']);

        return response()->json([
            'message' => "Cash payment confirmed for Booking #{$booking->booking_number}.",
            'booking' => $this->formatBooking($booking),
        ]);
    }
}
