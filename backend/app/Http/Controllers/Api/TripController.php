<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\BusRoute;
use App\Models\Driver;
use App\Models\Terminal;
use App\Models\Trip;
use App\Services\NotificationService;
use App\Services\TripSchedulingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TripController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService,
        protected TripSchedulingService $schedulingService
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

        self::ensureUpcomingTrips();

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
            $query->where('departure_time', '>=', now()->subHours(2));
        }

        $trips = $query->orderBy('departure_time', 'asc')->limit(50)->get();

        // If specific date had 0 results, fallback to any upcoming trips on the same route
        if ($trips->isEmpty() && $request->filled('origin_id') && $request->filled('destination_id')) {
            $trips = Trip::with(['route.originTerminal', 'route.destinationTerminal', 'bus', 'driver.user'])
                ->whereIn('status', ['scheduled', 'boarding'])
                ->where('departure_time', '>=', now()->subHours(2))
                ->whereHas('route', function ($q) use ($request) {
                    $q->where('status', 'active')
                      ->whereHas('originTerminal', fn($t) => $t->where('status', 'active'))
                      ->whereHas('destinationTerminal', fn($t) => $t->where('status', 'active'))
                      ->where('origin_terminal_id', $request->origin_id)
                      ->where('destination_terminal_id', $request->destination_id);
                })
                ->orderBy('departure_time', 'asc')
                ->limit(20)
                ->get();
        }

        return response()->json([
            'trips' => $trips->map(fn($t) => $this->formatTrip($t, false)),
        ]);
    }

    /**
     * List all upcoming trips (admin/staff view).
     */
    public function index(Request $request): JsonResponse
    {
        self::ensureUpcomingTrips();

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
        if ($request->filled('bus_id')) {
            $query->where('bus_id', $request->bus_id);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->whereHas('route.originTerminal', fn($t) => $t->where('name', 'like', "%{$s}%")->orWhere('city', 'like', "%{$s}%"))
                  ->orWhereHas('route.destinationTerminal', fn($t) => $t->where('name', 'like', "%{$s}%")->orWhere('city', 'like', "%{$s}%"))
                  ->orWhereHas('bus', fn($b) => $b->where('plate_number', 'like', "%{$s}%"))
                  ->orWhereHas('driver.user', fn($u) => $u->where('name', 'like', "%{$s}%"));
            });
        }

        $perPage = (int) $request->input('per_page', 50);
        $trips = $query->orderBy('departure_time', 'desc')->paginate($perPage);

        return response()->json([
            'trips' => array_map(fn($t) => $this->formatTrip($t, false), $trips->items()),
            'data'  => array_map(fn($t) => $this->formatTrip($t, false), $trips->items()),
            'meta'  => [
                'current_page' => $trips->currentPage(),
                'per_page'     => $trips->perPage(),
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
                    'seat_id'     => $lock->seat_id,
                    'seat_number' => $lock->seat?->seat_number,
                    'user_id'     => $lock->user_id,
                    'user_name'   => $lock->user?->name,
                    'user_phone'  => $lock->user?->phone,
                    'expires_at'  => $lock->expires_at?->toISOString(),
                ];
            });

        return response()->json([
            'trip'         => $this->formatTrip($trip, true),
            'tickets'      => $formattedTickets,
            'active_locks' => $activeLocks,
            'summary'      => [
                'total_seats'     => $trip->bus?->capacity ?? 0,
                'available_seats' => $trip->available_seats,
                'booked_seats'    => $tickets->count(),
                'boarded_count'   => $tickets->where('status', 'used')->count(),
                'active_locks'    => $activeLocks->count(),
            ],
        ]);
    }

    /**
     * Board passenger from trip manifest modal.
     */
    public function boardPassenger(Request $request, Trip $trip): JsonResponse
    {
        $request->validate([
            'ticket_id' => 'required|exists:tickets,id',
        ]);

        $ticket = \App\Models\Ticket::where('id', $request->ticket_id)
            ->whereHas('booking', fn($q) => $q->where('trip_id', $trip->id))
            ->firstOrFail();

        if ($ticket->status === 'used') {
            return response()->json([
                'message' => "Passenger {$ticket->passenger_name} was already boarded at " . ($ticket->boarded_at ? $ticket->boarded_at->format('H:i') : 'earlier') . '.',
                'ticket'  => $ticket,
            ]);
        }

        $ticket->update([
            'status'     => 'used',
            'boarded_at' => now(),
        ]);

        $ticket->load('seat', 'booking.user');

        return response()->json([
            'message' => "Passenger {$ticket->passenger_name} successfully boarded onto Coach {$trip->bus?->plate_number} (Seat {$ticket->seat?->seat_number}).",
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

    public function show(Trip $trip): JsonResponse
    {
        self::cleanupExpiredLocks($trip->id);
        $trip->load(['route.originTerminal', 'route.destinationTerminal', 'bus', 'driver.user', 'seats.seatLock']);
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

        $conflicts = $this->schedulingService->validateTrip([
            'route_id'       => (int) $request->route_id,
            'departure_time' => $request->departure_time,
            'arrival_time'   => $request->arrival_time,
            'driver_id'      => $request->filled('driver_id') ? (int) $request->driver_id : null,
            'bus_id'         => $request->filled('bus_id') ? (int) $request->bus_id : null,
            'status'         => 'scheduled',
        ], excludeTripId: $request->filled('exclude_trip_id') ? (int) $request->exclude_trip_id : null);

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

        $route = BusRoute::with(['originTerminal', 'destinationTerminal'])->findOrFail($data['route_id']);
        if ($route->status !== 'active' || $route->originTerminal?->status !== 'active' || $route->destinationTerminal?->status !== 'active') {
            return response()->json([
                'message' => 'Cannot schedule trip: The assigned route corridor or terminal station is currently inactive / closed.'
            ], 422);
        }

        // Auto-calculate arrival_time based on route duration
        $dep = Carbon::parse($data['departure_time']);
        $durationMinutes = $route->estimated_duration_minutes ?: 240;
        if (empty($data['arrival_time']) || Carbon::parse($data['arrival_time'])->lte($dep)) {
            $data['arrival_time'] = $dep->copy()->addMinutes($durationMinutes)->toDateTimeString();
        }

        // Validate operational conflicts through TripSchedulingService
        $conflicts = $this->schedulingService->validateTrip([
            'route_id'       => (int) $data['route_id'],
            'departure_time' => (string) $data['departure_time'],
            'arrival_time'   => (string) $data['arrival_time'],
            'driver_id'      => (int) $data['driver_id'],
            'bus_id'         => (int) $data['bus_id'],
            'status'         => $data['status'] ?? 'scheduled',
        ]);

        if (!empty($conflicts)) {
            return response()->json([
                'message'   => $conflicts[0],
                'conflicts' => $conflicts,
            ], 422);
        }

        $bus = Bus::findOrFail($data['bus_id']);
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
            $dep = Carbon::parse($data['departure_time']);
            $route = $trip->route ?? BusRoute::find($trip->route_id);
            $durationMinutes = $route?->estimated_duration_minutes ?: 240;
            if (empty($data['arrival_time']) || Carbon::parse($data['arrival_time'])->lte($dep)) {
                $data['arrival_time'] = $dep->copy()->addMinutes($durationMinutes)->toDateTimeString();
            }
        }

        // Validate scheduling conflicts if driver, bus, or times are updated
        $isChangingSchedule = isset($data['driver_id']) || isset($data['bus_id']) || isset($data['departure_time']) || isset($data['arrival_time']);
        if ($isChangingSchedule && ($data['status'] ?? $trip->status) !== 'cancelled') {
            $conflicts = $this->schedulingService->validateTrip([
                'route_id'       => (int) ($data['route_id'] ?? $trip->route_id),
                'departure_time' => (string) ($data['departure_time'] ?? $trip->departure_time),
                'arrival_time'   => (string) ($data['arrival_time'] ?? $trip->arrival_time),
                'driver_id'      => isset($data['driver_id']) ? (int) $data['driver_id'] : $trip->driver_id,
                'bus_id'         => isset($data['bus_id']) ? (int) $data['bus_id'] : $trip->bus_id,
                'status'         => $data['status'] ?? $trip->status,
            ], excludeTripId: $trip->id);

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

    public static function ensureUpcomingTrips(): void
    {
        $upcomingCount = Trip::where('departure_time', '>=', now())
            ->whereIn('status', ['scheduled', 'boarding'])
            ->count();

        if ($upcomingCount >= 30) {
            return;
        }

        try {
            app(TripSchedulingService::class)->generateRealisticTimetable(Carbon::today(), 21);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("TripSchedulingService auto-fill fallback: " . $e->getMessage());
        }
    }

    /**
     * Web-based trigger to generate schedules for upcoming days with full summary metrics.
     */
    public function generateSchedules(Request $request): JsonResponse
    {
        $days = (int) $request->input('days', 30);
        $days = max(1, min(60, $days));

        $summary = $this->schedulingService->generateRealisticTimetable(Carbon::today(), $days);
        $totalScheduled = Trip::where('status', 'scheduled')->where('departure_time', '>=', now())->count();

        return response()->json([
            'message'         => "Successfully generated realistic fleet schedules for {$days} days.",
            'total_scheduled' => $totalScheduled,
            'summary'         => $summary,
        ]);
    }

    /**
     * Audit upcoming trips for operational conflicts.
     */
    public function audit(): JsonResponse
    {
        $auditReport = $this->schedulingService->auditExistingTrips();
        return response()->json($auditReport);
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
                'id'              => $trip->driver->id,
                'name'            => $trip->driver->user?->name,
                'license_number'  => $trip->driver->license_number,
                'assigned_bus_id' => $trip->driver->assigned_bus_id,
            ] : null,
        ];

        if ($withSeats) {
            $user = auth('sanctum')->user() ?? request()->user();
            $data['seats'] = $trip->seats?->map(fn($s) => [
                'id'              => $s->id,
                'trip_id'         => $s->trip_id,
                'seat_number'     => $s->seat_number,
                'seat_class'      => $s->seat_class,
                'status'          => $s->status,
                'locked_by_me'    => (bool) ($s->seatLock && $user && $s->seatLock->user_id === $user->id && $s->seatLock->expires_at >= now()),
                'lock_expires_at' => $s->seatLock?->expires_at?->toISOString(),
            ]);
        }

        return $data;
    }

    private function generateSeatsForTrip(Trip $trip, Bus $bus): void
    {
        $capacity = $bus->capacity;
        $seatClass = $bus->bus_type === 'vip' ? 'vip' : 'standard';
        $seats = [];

        for ($i = 1; $i <= $capacity; $i++) {
            $seats[] = [
                'trip_id'     => $trip->id,
                'seat_number' => (string) $i,
                'seat_class'  => $seatClass,
                'status'      => 'available',
                'created_at'  => now(),
                'updated_at'  => now(),
            ];
        }
        \App\Models\TripSeat::insert($seats);
    }
}
