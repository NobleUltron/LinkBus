<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Terminal;
use App\Models\BusRoute;
use App\Models\Trip;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TripController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}
    /**
     * Search trips by origin + destination + date.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'origin_id'      => 'nullable|integer|exists:terminals,id',
            'destination_id' => 'nullable|integer|exists:terminals,id',
            'date'           => 'nullable|date',
        ]);

        $query = Trip::with(['route.originTerminal', 'route.destinationTerminal', 'bus', 'driver.user'])
            ->whereIn('status', ['scheduled', 'boarding'])
            ->whereHas('route', function ($q) use ($request) {
                $q->where('status', 'active')
                  ->whereHas('originTerminal', fn($t) => $t->where('status', 'active'))
                  ->whereHas('destinationTerminal', fn($t) => $t->where('status', 'active'));

                if ($request->filled('origin_id') && $request->filled('destination_id')) {
                    $q->where('origin_terminal_id', $request->origin_id)
                      ->where('destination_terminal_id', $request->destination_id);
                } elseif ($request->filled('origin_id')) {
                    $q->where('origin_terminal_id', $request->origin_id);
                } elseif ($request->filled('destination_id')) {
                    $q->where('destination_terminal_id', $request->destination_id);
                }
            });

        if ($request->filled('date')) {
            $query->whereDate('departure_time', $request->date);
        } else {
            // Default: show trips from now onwards
            $query->where('departure_time', '>=', now());
        }

        $trips = $query->with('seats')->orderBy('departure_time', 'asc')->limit(50)->get();

        // If specific date had 0 results, fallback to any upcoming trips on the same route
        if ($trips->isEmpty() && $request->filled('origin_id') && $request->filled('destination_id')) {
            $trips = Trip::with(['route.originTerminal', 'route.destinationTerminal', 'bus', 'driver.user'])
                ->whereIn('status', ['scheduled', 'boarding'])
                ->where('departure_time', '>=', now())
                ->whereHas('route', function ($q) use ($request) {
                    $q->where('status', 'active')
                      ->whereHas('originTerminal', fn($t) => $t->where('status', 'active'))
                      ->whereHas('destinationTerminal', fn($t) => $t->where('status', 'active'))
                      ->where('origin_terminal_id', $request->origin_id)
                      ->where('destination_terminal_id', $request->destination_id);
                })
                ->where('departure_time', '>=', now()->subDay())
                ->orderBy('departure_time', 'asc')
                ->limit(20)
                ->with('seats')
                ->get();
        }

        return response()->json([
            'trips' => $trips->map(fn($t) => $this->formatTrip($t, true)),
        ]);
    }

    /**
     * List all upcoming trips (admin/staff view).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Trip::with(['route.originTerminal', 'route.destinationTerminal', 'bus', 'driver.user']);

        if ($request->filled('status')) {
            $statuses = array_filter(explode(',', $request->status));
            if (count($statuses) > 1) {
                $query->whereIn('status', $statuses);
            } else {
                $query->where('status', $request->status);
            }
        }
        if ($request->filled('date')) {
            $query->whereDate('departure_time', $request->date);
        }
        if ($request->filled('from') || $request->filled('date_from')) {
            $from = $request->input('from', $request->input('date_from'));
            $query->whereDate('departure_time', '>=', $from);
        }
        if ($request->filled('to') || $request->filled('date_to')) {
            $to = $request->input('to', $request->input('date_to'));
            $query->whereDate('departure_time', '<=', $to);
        }
        if ($request->filled('route_id')) {
            $query->where('route_id', $request->route_id);
        }
        if ($request->filled('driver_id')) {
            $query->where('driver_id', $request->driver_id);
        }
        if ($request->filled('user_id')) {
            $userId = (int) $request->user_id;
            $driverUser = \App\Models\User::with('role')->find($userId);
            if ($driverUser && $driverUser->role?->slug === 'driver') {
                $query->whereHas('driver', function ($q) use ($userId) {
                    $q->where('user_id', $userId);
                });
            }
        }

        $perPage = (int) $request->get('per_page', 50);
        $trips = $query->orderBy('departure_time', 'asc')->paginate($perPage);

        return response()->json([
            'trips' => $trips->map(fn($t) => $this->formatTrip($t)),
            'meta'  => [
                'current_page' => $trips->currentPage(),
                'last_page'    => $trips->lastPage(),
                'total'        => $trips->total(),
            ],
        ]);
    }

    /**
     * Get passenger boarding manifest for a specific trip.
     */
    public function manifest(Trip $trip): JsonResponse
    {
        $trip->loadMissing(['route.originTerminal', 'route.destinationTerminal', 'bus', 'driver.user']);

        $tickets = \App\Models\Ticket::with(['seat', 'booking.user'])
            ->whereHas('booking', function ($q) use ($trip) {
                $q->where('trip_id', $trip->id)
                  ->where('status', '!=', 'cancelled');
            })
            ->where('status', '!=', 'cancelled')
            ->get();

        $formattedTickets = $tickets->map(function ($ticket) use ($trip) {
            return [
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
                    'trip_id'     => $trip->id,
                    'seat_number' => $ticket->seat?->seat_number ?? '—',
                    'seat_class'  => $ticket->seat?->seat_class ?? 'standard',
                    'status'      => $ticket->seat?->status ?? 'booked',
                ],
                'trip'            => $this->formatTrip($trip),
            ];
        });

        self::cleanupExpiredLocks($trip->id);

        $activeLocks = \App\Models\SeatLock::with(['seat', 'user'])
            ->where('trip_id', $trip->id)
            ->where('expires_at', '>=', now())
            ->get()
            ->map(function ($lock) {
                return [
                    'id'               => $lock->id,
                    'seat_id'          => $lock->seat_id,
                    'seat_number'      => $lock->seat?->seat_number ?? '—',
                    'seat_class'       => $lock->seat?->seat_class ?? 'standard',
                    'user_id'          => $lock->user_id,
                    'user_name'        => $lock->user?->name ?? 'Guest Passenger',
                    'user_phone'       => $lock->user?->phone ?? '—',
                    'expires_at'       => $lock->expires_at?->toISOString(),
                    'remaining_seconds'=> max(0, (int) now()->diffInSeconds($lock->expires_at, false)),
                ];
            });

        return response()->json([
            'trip'       => $this->formatTrip($trip),
            'manifest'   => $formattedTickets,
            'data'       => $formattedTickets,
            'held_seats' => $activeLocks,
            'total'      => $formattedTickets->count(),
            'boarded'    => $formattedTickets->filter(fn($t) => $t['status'] === 'used' || !empty($t['boarded_at']))->count(),
        ]);
    }

    /**
     * Board a passenger on a trip manifest (by ticket_id or ticket_number).
     */
    public function boardPassenger(Request $request, Trip $trip): JsonResponse
    {
        $request->validate([
            'ticket_id'     => 'nullable|exists:tickets,id',
            'ticket_number' => 'nullable|string',
        ]);

        $query = \App\Models\Ticket::whereHas('booking', fn($q) => $q->where('trip_id', $trip->id));

        if ($request->filled('ticket_id')) {
            $query->where('id', $request->ticket_id);
        } elseif ($request->filled('ticket_number')) {
            $query->where('ticket_number', $request->ticket_number);
        } else {
            return response()->json(['message' => 'Please provide a ticket ID or ticket number.'], 422);
        }

        $ticket = $query->first();

        if (!$ticket) {
            return response()->json(['message' => 'Ticket not found on this departure manifest.'], 404);
        }

        $ticket->update([
            'status'     => 'used',
            'boarded_at' => now(),
        ]);

        $ticket->load('seat', 'booking');

        return response()->json([
            'message' => "Passenger {$ticket->passenger_name} checked in successfully.",
            'ticket'  => [
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
                    'trip_id'     => $trip->id,
                    'seat_number' => $ticket->seat?->seat_number ?? '—',
                    'seat_class'  => $ticket->seat?->seat_class ?? 'standard',
                    'status'      => 'booked',
                ],
            ],
        ]);
    }

    /**
     * Generic ticket check-in by ID.
     */
    public function boardTicketById(\App\Models\Ticket $ticket): JsonResponse
    {
        $ticket->update([
            'status'     => 'used',
            'boarded_at' => now(),
        ]);

        $ticket->load('seat', 'booking.trip');

        return response()->json([
            'message' => "Passenger {$ticket->passenger_name} checked in successfully.",
            'ticket'  => [
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
                    'status'      => 'booked',
                ],
            ],
        ]);
    }

    public function show(Trip $trip): JsonResponse
    {
        $trip->load(['route.originTerminal', 'route.destinationTerminal', 'bus', 'driver.user', 'seats']);
        return response()->json(['trip' => $this->formatTrip($trip, true)]);
    }

    public function checkConflicts(Request $request): JsonResponse
    {
        $request->validate([
            'driver_id'       => 'nullable|exists:drivers,id',
            'bus_id'          => 'nullable|exists:buses,id',
            'route_id'        => 'required|exists:bus_routes,id',
            'departure_time'  => 'required|date',
            'arrival_time'    => 'required|date|after:departure_time',
            'exclude_trip_id' => 'nullable|integer',
        ]);

        $conflicts = $this->findSchedulingConflicts(
            routeId: (int) $request->route_id,
            departureTime: $request->departure_time,
            arrivalTime: $request->arrival_time,
            driverId: $request->filled('driver_id') ? (int) $request->driver_id : null,
            busId: $request->filled('bus_id') ? (int) $request->bus_id : null,
            excludeTripId: $request->filled('exclude_trip_id') ? (int) $request->exclude_trip_id : null,
        );

        return response()->json([
            'has_conflicts' => !empty($conflicts),
            'conflicts'     => $conflicts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'route_id'       => 'required|exists:bus_routes,id',
            'bus_id'         => 'required|exists:buses,id',
            'driver_id'      => 'required|exists:drivers,id',
            'departure_time' => 'required|date',
            'arrival_time'   => 'nullable|date',
            'fare'           => 'required|integer|min:0',
            'status'         => 'in:scheduled,boarding,in_transit,completed,cancelled',
        ]);

        $route = \App\Models\BusRoute::with(['originTerminal', 'destinationTerminal'])->findOrFail($data['route_id']);
        if ($route->status !== 'active' || $route->originTerminal?->status !== 'active' || $route->destinationTerminal?->status !== 'active') {
            return response()->json([
                'message' => 'Cannot schedule trip: The assigned route corridor or terminal station is currently inactive / closed.'
            ], 422);
        }

        // Auto-calculate arrival_time based on route duration
        $dep = \Carbon\Carbon::parse($data['departure_time']);
        $durationMinutes = $route->estimated_duration_minutes ?: 240;
        if (empty($data['arrival_time']) || \Carbon\Carbon::parse($data['arrival_time'])->lte($dep)) {
            $data['arrival_time'] = $dep->copy()->addMinutes($durationMinutes)->toDateTimeString();
        }

        // Validate driver & bus scheduling conflicts
        $conflicts = $this->findSchedulingConflicts(
            routeId: (int) $data['route_id'],
            departureTime: (string) $data['departure_time'],
            arrivalTime: (string) $data['arrival_time'],
            driverId: (int) $data['driver_id'],
            busId: (int) $data['bus_id'],
        );

        if (!empty($conflicts)) {
            return response()->json([
                'message'   => $conflicts[0],
                'conflicts' => $conflicts,
            ], 422);
        }

        $bus = \App\Models\Bus::findOrFail($data['bus_id']);
        $data['available_seats'] = $bus->capacity;

        $trip = Trip::create($data);

        // Auto-generate seats
        $this->generateSeatsForTrip($trip, $bus);

        $trip->load(['route.originTerminal', 'route.destinationTerminal', 'bus', 'driver.user']);
        return response()->json(['trip' => $this->formatTrip($trip)], 201);
    }

    public function update(Request $request, Trip $trip): JsonResponse
    {
        $data = $request->validate([
            'status'         => 'sometimes|in:scheduled,boarding,in_transit,completed,cancelled',
            'departure_time' => 'sometimes|date',
            'arrival_time'   => 'nullable|date',
            'fare'           => 'sometimes|integer|min:0',
            'bus_id'         => 'sometimes|exists:buses,id',
            'driver_id'      => 'sometimes|exists:drivers,id',
        ]);

        if (isset($data['departure_time'])) {
            $dep = \Carbon\Carbon::parse($data['departure_time']);
            $route = $trip->route ?? \App\Models\BusRoute::find($trip->route_id);
            $durationMinutes = $route?->estimated_duration_minutes ?: 240;
            if (empty($data['arrival_time']) || \Carbon\Carbon::parse($data['arrival_time'])->lte($dep)) {
                $data['arrival_time'] = $dep->copy()->addMinutes($durationMinutes)->toDateTimeString();
            }
        }

        // Validate scheduling conflicts if driver, bus, or times are updated
        $isChangingSchedule = isset($data['driver_id']) || isset($data['bus_id']) || isset($data['departure_time']) || isset($data['arrival_time']);
        if ($isChangingSchedule && ($data['status'] ?? $trip->status) !== 'cancelled') {
            $conflicts = $this->findSchedulingConflicts(
                routeId: (int) ($data['route_id'] ?? $trip->route_id),
                departureTime: (string) ($data['departure_time'] ?? $trip->departure_time),
                arrivalTime: (string) ($data['arrival_time'] ?? $trip->arrival_time),
                driverId: isset($data['driver_id']) ? (int) $data['driver_id'] : $trip->driver_id,
                busId: isset($data['bus_id']) ? (int) $data['bus_id'] : $trip->bus_id,
                excludeTripId: $trip->id,
            );

            if (!empty($conflicts)) {
                return response()->json([
                    'message'   => $conflicts[0],
                    'conflicts' => $conflicts,
                ], 422);
            }
        }

        $oldStatus = $trip->status;
        $oldDepTime = $trip->departure_time;

        $trip->update($data);
        $trip->load(['route.originTerminal', 'route.destinationTerminal', 'bus', 'driver.user']);

        // Check for trip events to notify booked passengers
        try {
            if (isset($data['status']) && $data['status'] !== $oldStatus) {
                $this->notificationService->notifyTripUpdate(
                    trip: $trip,
                    changeType: $data['status'],
                    context: ['previous_status' => $oldStatus]
                );
            } elseif (isset($data['departure_time']) && $oldDepTime && $trip->departure_time->ne($oldDepTime)) {
                $this->notificationService->notifyTripUpdate(
                    trip: $trip,
                    changeType: 'rescheduled',
                    context: ['previous_departure' => $oldDepTime->toISOString()]
                );
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Trip update notification error: " . $e->getMessage());
        }

        return response()->json(['trip' => $this->formatTrip($trip)]);
    }

    public static function cleanupExpiredLocks(?int $tripId = null): void
    {
        $query = \App\Models\SeatLock::where('expires_at', '<', now());
        if ($tripId) {
            $query->where('trip_id', $tripId);
        }
        $expiredSeatIds = $query->pluck('seat_id')->all();

        if (!empty($expiredSeatIds)) {
            \App\Models\SeatLock::whereIn('seat_id', $expiredSeatIds)->delete();
            \App\Models\TripSeat::whereIn('id', $expiredSeatIds)
                ->where('status', 'locked')
                ->update(['status' => 'available']);
        }

        // Also safeguard any TripSeat marked 'locked' that has no active SeatLock record
        $orphanedSeatIds = \App\Models\TripSeat::where('status', 'locked')
            ->when($tripId, fn($q) => $q->where('trip_id', $tripId))
            ->whereDoesntHave('seatLock', fn($q) => $q->where('expires_at', '>=', now()))
            ->pluck('id')
            ->all();

        if (!empty($orphanedSeatIds)) {
            \App\Models\TripSeat::whereIn('id', $orphanedSeatIds)
                ->update(['status' => 'available']);
        }
    }

    /**
     * Get seat map for a trip.
     */
    public function seats(Trip $trip): JsonResponse
    {
        self::cleanupExpiredLocks($trip->id);

        $user = request()->user();
        $seats = $trip->seats()->with(['seatLock.user'])->get();

        return response()->json([
            'seats' => $seats->map(fn($s) => [
                'id'              => $s->id,
                'trip_id'         => $s->trip_id,
                'seat_number'     => $s->seat_number,
                'seat_class'      => $s->seat_class,
                'status'          => $s->status,
                'locked_by_me'    => $s->seatLock && $user && $s->seatLock->user_id === $user->id,
                'lock_expires_at' => $s->seatLock?->expires_at?->toISOString(),
                'locked_by_name'  => ($user && $user->isStaff() && $s->seatLock) ? $s->seatLock->user?->name : null,
                'locked_by_phone' => ($user && $user->isStaff() && $s->seatLock) ? $s->seatLock->user?->phone : null,
            ]),
        ]);
    }

    // ─── Private helpers ─────────────────────────────────────────────

    private function formatTrip(Trip $trip, bool $withSeats = false): array
    {
        $data = [
            'id'              => $trip->id,
            'route_id'        => $trip->route_id,
            'bus_id'          => $trip->bus_id,
            'driver_id'       => $trip->driver_id,
            'departure_time'  => $trip->departure_time?->toISOString(),
            'arrival_time'    => $trip->arrival_time?->toISOString(),
            'fare'            => $trip->fare,
            'status'          => $trip->status,
            'available_seats' => $trip->available_seats,
            'route'           => $trip->route ? [
                'id'                     => $trip->route->id,
                'distance_km'            => $trip->route->distance_km,
                'estimated_duration_min' => $trip->route->estimated_duration_minutes,
                'origin'                 => $trip->route->originTerminal ? [
                    'id'   => $trip->route->originTerminal->id,
                    'name' => $trip->route->originTerminal->name,
                    'city' => $trip->route->originTerminal->city,
                ] : null,
                'destination'            => $trip->route->destinationTerminal ? [
                    'id'   => $trip->route->destinationTerminal->id,
                    'name' => $trip->route->destinationTerminal->name,
                    'city' => $trip->route->destinationTerminal->city,
                ] : null,
            ] : null,
            'bus'             => $trip->bus ? [
                'id'           => $trip->bus->id,
                'plate_number' => $trip->bus->plate_number,
                'model'        => $trip->bus->model,
                'bus_type'     => $trip->bus->bus_type,
                'capacity'     => $trip->bus->capacity,
            ] : null,
            'driver'          => $trip->driver ? [
                'id'   => $trip->driver->id,
                'name' => $trip->driver->user?->name,
            ] : null,
        ];

        if ($withSeats) {
            $data['seats'] = $trip->seats?->map(fn($s) => [
                'id'          => $s->id,
                'seat_number' => $s->seat_number,
                'seat_class'  => $s->seat_class,
                'status'      => $s->status,
            ]);
        }

        return $data;
    }

    private function generateSeatsForTrip(Trip $trip, \App\Models\Bus $bus): void
    {
        $capacity = $bus->capacity;
        $seatClass = $bus->bus_type === 'vip' ? 'vip' : 'standard';
        $seats = [];

        $row = 1;
        $generated = 0;
        while ($generated < $capacity) {
            foreach (['A', 'B', 'C', 'D'] as $letter) {
                if ($generated >= $capacity) break;
                $seats[] = [
                    'trip_id'     => $trip->id,
                    'seat_number' => "{$row}{$letter}",
                    'seat_class'  => $seatClass,
                    'status'      => 'available',
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];
                $generated++;
            }
            $row++;
        }
        \App\Models\TripSeat::insert($seats);
    }

    private function findSchedulingConflicts(
        int $routeId,
        string $departureTime,
        string $arrivalTime,
        ?int $driverId = null,
        ?int $busId = null,
        ?int $excludeTripId = null,
    ): array {
        $conflicts = [];
        $dep = \Carbon\Carbon::parse($departureTime);
        $arr = \Carbon\Carbon::parse($arrivalTime);
        $route = \App\Models\BusRoute::with(['originTerminal', 'destinationTerminal'])->find($routeId);

        if (!$route) {
            return ['Selected route corridor was not found.'];
        }

        $originName = $route->originTerminal?->name ?? 'Origin Terminal';
        $destName = $route->destinationTerminal?->name ?? 'Destination Terminal';

        // ── 1. Driver Conflicts ──────────────────────────────────────────
        if ($driverId) {
            $driver = \App\Models\Driver::with('user')->find($driverId);
            $driverName = $driver?->user?->name ?? 'Selected Driver';

            if ($driver?->status !== 'active') {
                $conflicts[] = "Driver Status Conflict: {$driverName} is currently marked as '{$driver?->status}'.";
            }

            // 1.A: Time Overlap
            $overlapTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal', 'bus'])
                ->where('driver_id', $driverId)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->where(function ($q) use ($dep, $arr) {
                    $q->where('departure_time', '<', $arr)
                      ->where('arrival_time', '>', $dep);
                })
                ->first();

            if ($overlapTrip) {
                $ovOrigin = $overlapTrip->route?->originTerminal?->name ?? 'Origin';
                $ovDest = $overlapTrip->route?->destinationTerminal?->name ?? 'Destination';
                $ovDep = $overlapTrip->departure_time->format('d M H:i');
                $ovArr = $overlapTrip->arrival_time->format('H:i');
                $conflicts[] = "Driver Time Overlap: {$driverName} is already assigned to Trip #{$overlapTrip->id} ({$ovOrigin} → {$ovDest}, {$ovDep} - {$ovArr}).";
            }

            // 1.B: Preceding Trip Location Continuity & Turnaround
            $prevTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('driver_id', $driverId)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->where('arrival_time', '<=', $dep)
                ->orderBy('arrival_time', 'desc')
                ->first();

            if ($prevTrip) {
                $prevDestId = $prevTrip->route?->destination_terminal_id;
                $prevDestName = $prevTrip->route?->destinationTerminal?->name ?? 'Unknown Station';
                $prevArrTime = $prevTrip->arrival_time;

                if ($prevDestId && $prevDestId !== $route->origin_terminal_id) {
                    $conflicts[] = "Driver Location Mismatch: {$driverName} completes their previous trip in {$prevDestName} (arrives {$prevArrTime->format('d M H:i')}), but this trip departs from {$originName}.";
                }

                $restMinutes = $dep->diffInMinutes($prevArrTime);
                if ($restMinutes < 45) {
                    $earliestDep = $prevArrTime->copy()->addMinutes(45)->format('H:i');
                    $conflicts[] = "Driver Turnaround Violation: {$driverName} only has {$restMinutes} min rest after arriving in {$prevDestName} at {$prevArrTime->format('H:i')}. Minimum 45 min buffer required (Earliest departure: {$earliestDep}).";
                }
            }

            // 1.C: Subsequent Trip Location Continuity & Turnaround
            $nextTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('driver_id', $driverId)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->where('departure_time', '>=', $arr)
                ->orderBy('departure_time', 'asc')
                ->first();

            if ($nextTrip) {
                $nextOriginId = $nextTrip->route?->origin_terminal_id;
                $nextOriginName = $nextTrip->route?->originTerminal?->name ?? 'Unknown Station';
                $nextDepTime = $nextTrip->departure_time;

                if ($nextOriginId && $nextOriginId !== $route->destination_terminal_id) {
                    $conflicts[] = "Driver Location Mismatch: This trip arrives in {$destName} at {$arr->format('d M H:i')}, but {$driverName}'s next scheduled trip departs from {$nextOriginName} at {$nextDepTime->format('d M H:i')}.";
                }

                $restMinutes = $nextDepTime->diffInMinutes($arr);
                if ($restMinutes < 45) {
                    $conflicts[] = "Driver Turnaround Violation: Next trip departs from {$nextOriginName} at {$nextDepTime->format('H:i')}, leaving only {$restMinutes} min buffer after this trip arrives at {$arr->format('H:i')}. Minimum 45 min required.";
                }
            }
        }

        // ── 2. Bus Conflicts ─────────────────────────────────────────────
        if ($busId) {
            $bus = \App\Models\Bus::find($busId);
            $busPlate = $bus?->plate_number ?? 'Selected Bus';

            if ($bus?->status !== 'active') {
                $conflicts[] = "Bus Status Conflict: Bus {$busPlate} is currently marked as '{$bus?->status}'.";
            }

            // 2.A: Bus Time Overlap
            $overlapBusTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('bus_id', $busId)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->where(function ($q) use ($dep, $arr) {
                    $q->where('departure_time', '<', $arr)
                      ->where('arrival_time', '>', $dep);
                })
                ->first();

            if ($overlapBusTrip) {
                $ovOrigin = $overlapBusTrip->route?->originTerminal?->name ?? 'Origin';
                $ovDest = $overlapBusTrip->route?->destinationTerminal?->name ?? 'Destination';
                $ovDep = $overlapBusTrip->departure_time->format('d M H:i');
                $ovArr = $overlapBusTrip->arrival_time->format('H:i');
                $conflicts[] = "Bus Time Overlap: Bus {$busPlate} is already assigned to Trip #{$overlapBusTrip->id} ({$ovOrigin} → {$ovDest}, {$ovDep} - {$ovArr}).";
            }

            // 2.B: Bus Preceding Trip Location Continuity
            $prevBusTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('bus_id', $busId)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->where('arrival_time', '<=', $dep)
                ->orderBy('arrival_time', 'desc')
                ->first();

            if ($prevBusTrip) {
                $prevDestId = $prevBusTrip->route?->destination_terminal_id;
                $prevDestName = $prevBusTrip->route?->destinationTerminal?->name ?? 'Unknown Station';
                $prevArrTime = $prevBusTrip->arrival_time;

                if ($prevDestId && $prevDestId !== $route->origin_terminal_id) {
                    $conflicts[] = "Bus Location Mismatch: Bus {$busPlate} arrives in {$prevDestName} (at {$prevArrTime->format('d M H:i')}), but this trip departs from {$originName}.";
                }

                $bufferMinutes = $dep->diffInMinutes($prevArrTime);
                if ($bufferMinutes < 30) {
                    $conflicts[] = "Bus Turnaround Violation: Bus {$busPlate} arrives in {$prevDestName} at {$prevArrTime->format('H:i')}. Needs at least 30 min for inspection and cleaning before next departure.";
                }
            }

            // 2.C: Bus Subsequent Trip Location Continuity
            $nextBusTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('bus_id', $busId)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->where('departure_time', '>=', $arr)
                ->orderBy('departure_time', 'asc')
                ->first();

            if ($nextBusTrip) {
                $nextOriginId = $nextBusTrip->route?->origin_terminal_id;
                $nextOriginName = $nextBusTrip->route?->originTerminal?->name ?? 'Unknown Station';

                if ($nextOriginId && $nextOriginId !== $route->destination_terminal_id) {
                    $conflicts[] = "Bus Location Mismatch: This trip arrives in {$destName} at {$arr->format('d M H:i')}, but Bus {$busPlate} is next scheduled to depart from {$nextOriginName}.";
                }
            }
        }

        return $conflicts;
    }
}
