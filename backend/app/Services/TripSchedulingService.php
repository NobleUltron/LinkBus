<?php

namespace App\Services;

use App\Models\Bus;
use App\Models\BusRoute;
use App\Models\Driver;
use App\Models\Setting;
use App\Models\Trip;
use App\Models\TripSeat;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TripSchedulingService
{
    /**
     * Minimum turnaround buffer in minutes required between consecutive trips on the same day.
     */
    public function getMinimumTurnaroundMinutes(): int
    {
        try {
            $setting = Setting::where('key', 'scheduling.min_turnaround_minutes')->first();
            if ($setting && is_numeric($setting->value)) {
                return (int) $setting->value;
            }
        } catch (\Throwable $e) {
            // Fallback default
        }
        return 30; // 30 minutes default operational buffer
    }

    /**
     * Validate all LinkBus operational constraints for creating or updating a trip.
     * Returns an array of error messages. Empty array = 100% Valid & Conflict-Free.
     *
     * @param array $data [route_id, departure_time, arrival_time, driver_id, bus_id, status]
     * @param int|null $excludeTripId
     * @return array
     */
    public function validateTrip(array $data, ?int $excludeTripId = null, array $excludeTripIds = []): array
    {
        $conflicts = [];

        $routeId = (int) ($data['route_id'] ?? 0);
        $departureTime = $data['departure_time'] ?? null;
        $arrivalTime = $data['arrival_time'] ?? null;
        $driverId = isset($data['driver_id']) && $data['driver_id'] ? (int) $data['driver_id'] : null;
        $busId = isset($data['bus_id']) && $data['bus_id'] ? (int) $data['bus_id'] : null;
        $status = $data['status'] ?? 'scheduled';

        if ($status === 'cancelled') {
            // Cancelled trips do not occupy resources
            return [];
        }

        if (!$routeId || !$departureTime || !$arrivalTime) {
            return ['Route corridor, departure time, and arrival time are required.'];
        }

        $route = BusRoute::with(['originTerminal', 'destinationTerminal'])->find($routeId);
        if (!$route) {
            return ['Selected route corridor does not exist.'];
        }

        $dep = Carbon::parse($departureTime);
        $arr = Carbon::parse($arrivalTime);

        if ($arr->lte($dep)) {
            $conflicts[] = 'Arrival time must be strictly after departure time.';
        }

        $originName = $route->originTerminal?->name ?? 'Origin Terminal';
        $destName = $route->destinationTerminal?->name ?? 'Destination Terminal';
        $originCity = $route->originTerminal?->city ?? $originName;
        $destCity = $route->destinationTerminal?->city ?? $destName;
        $minTurnaround = $this->getMinimumTurnaroundMinutes();

        // ── 1. One Driver ↔ One Coach Permanent Assignment Rule ─────────────
        $driver = $driverId ? Driver::with(['user', 'assignedBus'])->find($driverId) : null;
        $bus = $busId ? Bus::with('assignedDriver.user')->find($busId) : null;

        if ($driver && $bus) {
            // Driver must be assigned to this specific bus
            if ($driver->assigned_bus_id && $driver->assigned_bus_id !== $bus->id) {
                $assignedPlate = $driver->assignedBus?->plate_number ?? "Coach #{$driver->assigned_bus_id}";
                $conflicts[] = "Driver Assignment Conflict: {$driver->user?->name} is permanently assigned to Coach {$assignedPlate} and cannot be assigned to Coach {$bus->plate_number}.";
            }

            // Bus must not be assigned to another active driver
            if ($bus->assignedDriver && $bus->assignedDriver->id !== $driver->id && $bus->assignedDriver->status === 'active') {
                $otherDriverName = $bus->assignedDriver->user?->name ?? "Driver #{$bus->assignedDriver->id}";
                $conflicts[] = "Bus Assignment Conflict: Coach {$bus->plate_number} is permanently assigned to {$otherDriverName}. A coach cannot be operated by multiple drivers.";
            }
        }

        // ── 2. Driver Availability & Location Continuity ────────────────────
        if ($driver) {
            $driverName = $driver->user?->name ?? "Driver #{$driver->id}";

            if ($driver->status !== 'active') {
                $conflicts[] = "Driver Status Conflict: {$driverName} is currently marked as '{$driver->status}'.";
            }

            // 2.A: Driver Time Overlap across duration
            $overlapTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('driver_id', $driver->id)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->when(!empty($excludeTripIds), fn($q) => $q->whereNotIn('id', $excludeTripIds))
                ->where(function ($q) use ($dep, $arr) {
                    $q->where('departure_time', '<', $arr)
                      ->where('arrival_time', '>', $dep);
                })
                ->first();

            if ($overlapTrip) {
                $ovOrigin = $overlapTrip->route?->originTerminal?->city ?? 'Origin';
                $ovDest = $overlapTrip->route?->destinationTerminal?->city ?? 'Destination';
                $ovDep = $overlapTrip->departure_time->format('d M H:i');
                $ovArr = $overlapTrip->arrival_time->format('H:i');
                $conflicts[] = "Driver Time Overlap: {$driverName} is already driving Trip #{$overlapTrip->id} ({$ovOrigin} → {$ovDest}, {$ovDep} - {$ovArr}).";
            }

            // 2.B: Preceding Trip Location Continuity & Turnaround
            $prevTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('driver_id', $driver->id)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->when(!empty($excludeTripIds), fn($q) => $q->whereNotIn('id', $excludeTripIds))
                ->where('arrival_time', '<=', $dep)
                ->orderBy('arrival_time', 'desc')
                ->first();

            if ($prevTrip) {
                $prevDestId = $prevTrip->route?->destination_terminal_id;
                $prevDestCity = $prevTrip->route?->destinationTerminal?->city ?? $prevTrip->route?->destinationTerminal?->name ?? 'Unknown Station';
                $prevArrTime = $prevTrip->arrival_time;

                if ($prevDestId && $prevDestId !== $route->origin_terminal_id) {
                    $conflicts[] = "Driver Location Mismatch: {$driverName} finishes previous trip in {$prevDestCity} (arrives {$prevArrTime->format('d M H:i')}), but this trip departs from {$originCity}.";
                }

                $restMinutes = $prevArrTime->diffInMinutes($dep, false);
                if ($restMinutes >= 0 && $restMinutes < $minTurnaround && $dep->isSameDay($prevArrTime)) {
                    $earliestDep = $prevArrTime->copy()->addMinutes($minTurnaround)->format('H:i');
                    $conflicts[] = "Driver Turnaround Violation: {$driverName} only has {$restMinutes} min rest after arriving in {$prevDestCity} at {$prevArrTime->format('H:i')}. Minimum {$minTurnaround} min buffer required (Earliest departure: {$earliestDep}).";
                }
            }

            // 2.C: Subsequent Trip Location Continuity & Turnaround
            $nextTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('driver_id', $driver->id)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->when(!empty($excludeTripIds), fn($q) => $q->whereNotIn('id', $excludeTripIds))
                ->where('departure_time', '>=', $arr)
                ->orderBy('departure_time', 'asc')
                ->first();

            if ($nextTrip) {
                $nextOriginId = $nextTrip->route?->origin_terminal_id;
                $nextOriginCity = $nextTrip->route?->originTerminal?->city ?? $nextTrip->route?->originTerminal?->name ?? 'Unknown Station';
                $nextDepTime = $nextTrip->departure_time;

                if ($nextOriginId && $nextOriginId !== $route->destination_terminal_id) {
                    $conflicts[] = "Driver Location Mismatch: This trip arrives in {$destCity} at {$arr->format('d M H:i')}, but {$driverName}'s next scheduled trip departs from {$nextOriginCity} at {$nextDepTime->format('d M H:i')}.";
                }

                $restMinutes = $arr->diffInMinutes($nextDepTime, false);
                if ($restMinutes >= 0 && $restMinutes < $minTurnaround && $arr->isSameDay($nextDepTime)) {
                    $conflicts[] = "Driver Turnaround Violation: Next trip departs from {$nextOriginCity} at {$nextDepTime->format('H:i')}, leaving only {$restMinutes} min buffer after this trip arrives at {$arr->format('H:i')}. Minimum {$minTurnaround} min required.";
                }
            }
        }

        // ── 3. Coach Availability & Location Continuity ─────────────────────
        if ($bus) {
            $busPlate = $bus->plate_number;

            if ($bus->status !== 'active') {
                $conflicts[] = "Bus Status Conflict: Coach {$busPlate} is currently marked as '{$bus->status}'.";
            }

            // 3.A: Coach Time Overlap across duration
            $overlapBusTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('bus_id', $bus->id)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->when(!empty($excludeTripIds), fn($q) => $q->whereNotIn('id', $excludeTripIds))
                ->where(function ($q) use ($dep, $arr) {
                    $q->where('departure_time', '<', $arr)
                      ->where('arrival_time', '>', $dep);
                })
                ->first();

            if ($overlapBusTrip) {
                $ovOrigin = $overlapBusTrip->route?->originTerminal?->city ?? 'Origin';
                $ovDest = $overlapBusTrip->route?->destinationTerminal?->city ?? 'Destination';
                $ovDep = $overlapBusTrip->departure_time->format('d M H:i');
                $ovArr = $overlapBusTrip->arrival_time->format('H:i');
                $conflicts[] = "Bus Time Overlap: Coach {$busPlate} is already operating Trip #{$overlapBusTrip->id} ({$ovOrigin} → {$ovDest}, {$ovDep} - {$ovArr}).";
            }

            // 3.B: Preceding Coach Trip Location Continuity & Inspection Buffer
            $prevBusTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('bus_id', $bus->id)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->when(!empty($excludeTripIds), fn($q) => $q->whereNotIn('id', $excludeTripIds))
                ->where('arrival_time', '<=', $dep)
                ->orderBy('arrival_time', 'desc')
                ->first();

            if ($prevBusTrip) {
                $prevDestId = $prevBusTrip->route?->destination_terminal_id;
                $prevDestCity = $prevBusTrip->route?->destinationTerminal?->city ?? 'Station';
                $prevArrTime = $prevBusTrip->arrival_time;

                if ($prevDestId && $prevDestId !== $route->origin_terminal_id) {
                    $conflicts[] = "Bus Location Mismatch: Coach {$busPlate} finishes in {$prevDestCity} (at {$prevArrTime->format('d M H:i')}), but this trip departs from {$originCity}.";
                }

                $bufferMinutes = $prevArrTime->diffInMinutes($dep, false);
                if ($bufferMinutes >= 0 && $bufferMinutes < 20 && $dep->isSameDay($prevArrTime)) {
                    $conflicts[] = "Bus Turnaround Violation: Coach {$busPlate} arrives in {$prevDestCity} at {$prevArrTime->format('H:i')}. Needs at least 20 min for refueling and cleaning before next departure.";
                }
            }

            // 3.C: Subsequent Coach Trip Location Continuity
            $nextBusTrip = Trip::with(['route.originTerminal', 'route.destinationTerminal'])
                ->where('bus_id', $bus->id)
                ->where('status', '!=', 'cancelled')
                ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
                ->when(!empty($excludeTripIds), fn($q) => $q->whereNotIn('id', $excludeTripIds))
                ->where('departure_time', '>=', $arr)
                ->orderBy('departure_time', 'asc')
                ->first();

            if ($nextBusTrip) {
                $nextOriginId = $nextBusTrip->route?->origin_terminal_id;
                $nextOriginCity = $nextBusTrip->route?->originTerminal?->city ?? 'Station';

                if ($nextOriginId && $nextOriginId !== $route->destination_terminal_id) {
                    $conflicts[] = "Bus Location Mismatch: This trip arrives in {$destCity} at {$arr->format('d M H:i')}, but Coach {$busPlate} is next scheduled to depart from {$nextOriginCity}.";
                }
            }
        }

        // ── 4. Exact Duplicate Prevention ───────────────────────────────────
        $duplicateTrip = Trip::where('route_id', $routeId)
            ->where('departure_time', $dep->toDateTimeString())
            ->where('status', '!=', 'cancelled')
            ->when($excludeTripId, fn($q) => $q->where('id', '!=', $excludeTripId))
            ->when(!empty($excludeTripIds), fn($q) => $q->whereNotIn('id', $excludeTripIds))
            ->when($busId, fn($q) => $q->where('bus_id', $busId))
            ->first();

        if ($duplicateTrip) {
            $conflicts[] = "Exact Duplicate Trip: A departure on this route at {$dep->format('d M Y H:i')} with this coach already exists (Trip #{$duplicateTrip->id}).";
        }

        return $conflicts;
    }

    /**
     * Generate realistic, operationally feasible bus duty rotations across the fleet.
     * Core Algorithm: Driver ↔ Assigned Coach → Feasible Corridor Duty Rotations.
     *
     * @param Carbon $startDate
     * @param int $days
     * @param bool $purgeUnbooked When true, cleanly removes unbooked legacy/duplicate trips before regenerating
     * @param bool $dryRun
     * @return array
     */
    public function generateRealisticTimetable(Carbon $startDate, int $days = 30, bool $purgeUnbooked = false, bool $dryRun = false): array
    {
        $startDate = $startDate->copy()->startOfDay();
        $endDate = $startDate->copy()->addDays($days - 1)->endOfDay();

        $routes = BusRoute::with(['originTerminal', 'destinationTerminal'])
            ->where('status', 'active')
            ->get();

        $drivers = Driver::with(['user', 'assignedBus'])
            ->where('status', 'active')
            ->whereNotNull('assigned_bus_id')
            ->whereHas('assignedBus', fn($b) => $b->where('status', 'active'))
            ->get();

        $unbookedPurged = 0;
        if ($purgeUnbooked && !$dryRun) {
            $unbookedTrips = Trip::where('departure_time', '>=', $startDate)
                ->where('departure_time', '<=', $endDate)
                ->where('status', 'scheduled')
                ->doesntHave('bookings')
                ->get();

            $unbookedIds = $unbookedTrips->pluck('id')->all();
            if (!empty($unbookedIds)) {
                TripSeat::whereIn('trip_id', $unbookedIds)->delete();
                Trip::whereIn('id', $unbookedIds)->delete();
                $unbookedPurged = count($unbookedIds);
            }
        }

        if ($drivers->isEmpty() || $routes->isEmpty()) {
            return [
                'start_date'           => $startDate->format('d M Y'),
                'end_date'             => $endDate->format('d M Y'),
                'days'                 => $days,
                'unbooked_purged'      => $unbookedPurged,
                'trips_generated'      => 0,
                'coaches_used'         => [],
                'coaches_used_count'   => 0,
                'drivers_used'         => [],
                'drivers_used_count'   => 0,
                'corridors_served'     => [],
                'conflicts_prevented'  => 0,
                'duplicates_prevented' => 0,
            ];
        }

        // Map bilateral route pairs (Always Outbound from Kampala Hub first, Return to Kampala)
        $routePairs = [];
        foreach ($routes as $r) {
            $returnRoute = $routes->first(fn($other) => 
                $other->origin_terminal_id === $r->destination_terminal_id && 
                $other->destination_terminal_id === $r->origin_terminal_id
            );
            if ($returnRoute) {
                $isKampalaOrigin = str_contains(strtolower($r->originTerminal?->city ?? $r->originTerminal?->name ?? ''), 'kampala');
                $outbound = $isKampalaOrigin ? $r : $returnRoute;
                $inbound = $isKampalaOrigin ? $returnRoute : $r;

                $pairKey = min($outbound->id, $inbound->id);
                if (!isset($routePairs[$pairKey])) {
                    $routePairs[$pairKey] = [
                        'outbound' => $outbound,
                        'return'   => $inbound,
                    ];
                }
            }
        }

        // Build duty circuits dynamically based on available Driver ↔ Coach units:
        $dutyCircuits = [];
        $pairList = array_values($routePairs);
        $pairCount = count($pairList);

        foreach ($drivers as $index => $driver) {
            $bus = $driver->assignedBus;
            if (!$bus) continue;

            $assignedPair = $pairList[$index % max(1, $pairCount)] ?? null;
            if (!$assignedPair) continue;

            $out = $assignedPair['outbound'];
            $ret = $assignedPair['return'];
            $duration = max(60, $out->estimated_duration_minutes ?: 90);
            $corridorTitle = ($out->originTerminal?->city ?? 'Origin') . ' ↔ ' . ($out->destinationTerminal?->city ?? 'Dest') . ' (' . $bus->plate_number . ')';
            
            $baseFareOut = $out->base_fare ?: ($duration <= 120 ? 15000 : 30000);
            $baseFareRet = $ret->base_fare ?: ($duration <= 120 ? 15000 : 30000);

            // Short shuttle (< 120 mins) gets 2 out-and-back round trips per day (4 legs)
            if ($duration <= 120) {
                $dutyCircuits[] = [
                    'corridor'  => $corridorTitle,
                    'bus'       => $bus,
                    'driver'    => $driver,
                    'legs'      => [
                        ['route' => $out, 'hour' => 7,  'min' => 30, 'fare' => $baseFareOut],
                        ['route' => $ret, 'hour' => 10, 'min' => 30, 'fare' => $baseFareRet],
                        ['route' => $out, 'hour' => 14, 'min' => 00, 'fare' => $baseFareOut],
                        ['route' => $ret, 'hour' => 17, 'min' => 00, 'fare' => $baseFareRet],
                    ],
                ];
            } else {
                // Long-haul corridor gets 1 out-and-back round trip per day with 2.5h - 3.5h layover
                $depHour = 7 + ($index % 3); // Stagger morning departures (07:00, 08:00, 09:00)
                $retHour = max(14, (int) ceil(($depHour * 60 + $duration + 150) / 60));

                $dutyCircuits[] = [
                    'corridor'  => $corridorTitle,
                    'bus'       => $bus,
                    'driver'    => $driver,
                    'legs'      => [
                        ['route' => $out, 'hour' => $depHour, 'min' => 0,  'fare' => $baseFareOut],
                        ['route' => $ret, 'hour' => $retHour, 'min' => 30, 'fare' => $baseFareRet],
                    ],
                ];
            }
        }

        $tripsGenerated = 0;
        $duplicatesPrevented = 0;
        $conflictsPrevented = 0;
        $coachesUsed = [];
        $driversUsed = [];
        $corridorsServed = [];

        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            foreach ($dutyCircuits as $circuit) {
                $bus = $circuit['bus'];
                $driver = $circuit['driver'];
                $corridorName = $circuit['corridor'];

                if (!isset($corridorsServed[$corridorName])) {
                    $corridorsServed[$corridorName] = 0;
                }

                foreach ($circuit['legs'] as $leg) {
                    $route = $leg['route'];
                    $departure = $currentDate->copy()->setTime($leg['hour'], $leg['min'], 0);
                    $duration = $route->estimated_duration_minutes ?: 240;
                    $arrival = $departure->copy()->addMinutes($duration);

                    if ($departure->isPast()) {
                        continue;
                    }

                    // Check exact duplicate
                    $existingTrip = Trip::where('route_id', $route->id)
                        ->where('departure_time', $departure->toDateTimeString())
                        ->where('status', '!=', 'cancelled')
                        ->first();

                    if ($existingTrip) {
                        $duplicatesPrevented++;
                        continue;
                    }

                    // Validate through centralized scheduling engine
                    $conflicts = $this->validateTrip([
                        'route_id'       => $route->id,
                        'departure_time' => $departure->toDateTimeString(),
                        'arrival_time'   => $arrival->toDateTimeString(),
                        'driver_id'      => $driver->id,
                        'bus_id'         => $bus->id,
                        'status'         => 'scheduled',
                    ]);

                    if (!empty($conflicts)) {
                        $conflictsPrevented++;
                        Log::warning("Skipping trip generation due to operational conflict: " . implode(' | ', $conflicts));
                        continue;
                    }

                    if (!$dryRun) {
                        DB::transaction(function () use ($route, $bus, $driver, $departure, $arrival, $leg, &$tripsGenerated, &$corridorsServed, $corridorName) {
                            $trip = Trip::create([
                                'route_id'        => $route->id,
                                'bus_id'          => $bus->id,
                                'driver_id'       => $driver->id,
                                'departure_time'  => $departure,
                                'arrival_time'    => $arrival,
                                'fare'            => $leg['fare'],
                                'status'          => 'scheduled',
                                'available_seats' => $bus->capacity,
                            ]);

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
                            TripSeat::insert($seats);

                            $tripsGenerated++;
                            $corridorsServed[$corridorName]++;
                        });
                    } else {
                        $tripsGenerated++;
                        $corridorsServed[$corridorName]++;
                    }

                    $coachesUsed[$bus->plate_number] = true;
                    $driversUsed[$driver->user?->name ?? "Driver #{$driver->id}"] = true;
                }
            }
            $currentDate->addDay();
        }

        return [
            'start_date'           => $startDate->format('d M Y'),
            'end_date'             => $endDate->format('d M Y'),
            'days'                 => $days,
            'unbooked_purged'      => $unbookedPurged,
            'trips_generated'      => $tripsGenerated,
            'coaches_used'         => array_keys($coachesUsed),
            'coaches_used_count'   => count($coachesUsed),
            'drivers_used'         => array_keys($driversUsed),
            'drivers_used_count'   => count($driversUsed),
            'corridors_served'     => $corridorsServed,
            'conflicts_prevented'  => $conflictsPrevented,
            'duplicates_prevented' => $duplicatesPrevented,
        ];
    }

    /**
     * Prune all unbooked duplicate and conflicting trips across the database.
     * Preserves all trips with passenger bookings (zero data loss).
     *
     * @param bool $dryRun
     * @return array
     */
    public function pruneDuplicateAndConflictingTrips(bool $dryRun = false): array
    {
        $futureTrips = Trip::with(['route', 'bus.assignedDriver', 'driver.assignedBus', 'bookings'])
            ->where('departure_time', '>=', now()->subHours(2))
            ->where('status', '!=', 'cancelled')
            ->orderBy('departure_time', 'asc')
            ->get();

        $tripsToDelete = [];
        $exactDuplicatesCount = 0;
        $assignmentConflictsCount = 0;
        $overlapConflictsCount = 0;
        $locationConflictsCount = 0;
        $bookedPreservedCount = 0;

        // Step 1: Detect explicit driver-bus assignment conflicts on unbooked trips
        foreach ($futureTrips as $trip) {
            if ($trip->bookings->count() === 0 && $trip->driver && $trip->bus) {
                if ($trip->driver->assigned_bus_id && $trip->driver->assigned_bus_id !== $trip->bus_id) {
                    $tripsToDelete[$trip->id] = 'assignment_conflict';
                    $assignmentConflictsCount++;
                }
            }
        }

        // Step 2: Detect exact duplicate slots on same route and departure time
        $groupedBySlot = $futureTrips->groupBy(fn($t) => $t->route_id . '_' . $t->departure_time->toDateTimeString());

        foreach ($groupedBySlot as $slotKey => $slotTrips) {
            if ($slotTrips->count() > 1) {
                // Determine best trip to keep:
                // 1. A trip with bookings (must keep)
                // 2. A trip with proper driver ↔ bus permanent pairing
                // 3. Lowest ID
                $bookedTrip = $slotTrips->first(fn($t) => $t->bookings->count() > 0);
                
                if ($bookedTrip) {
                    $keepTripId = $bookedTrip->id;
                } else {
                    $properPairingTrip = $slotTrips->first(fn($t) => 
                        $t->driver && $t->bus && $t->driver->assigned_bus_id === $t->bus_id
                    );
                    $keepTripId = $properPairingTrip ? $properPairingTrip->id : $slotTrips->first()->id;
                }

                foreach ($slotTrips as $st) {
                    if ($st->id !== $keepTripId) {
                        if ($st->bookings->count() === 0) {
                            if (!isset($tripsToDelete[$st->id])) {
                                $tripsToDelete[$st->id] = 'exact_duplicate';
                                $exactDuplicatesCount++;
                            }
                        } else {
                            $bookedPreservedCount++;
                        }
                    }
                }
            }
        }

        // Step 3: Progressively validate remaining trips against accepted schedule
        $keptTrips = [];
        $minTurnaround = $this->getMinimumTurnaroundMinutes();

        // Seed with all booked trips
        foreach ($futureTrips as $trip) {
            if ($trip->bookings->count() > 0) {
                $keptTrips[$trip->id] = $trip;
                $bookedPreservedCount++;
            }
        }

        // Evaluate unbooked trips in chronological order
        foreach ($futureTrips as $trip) {
            if (isset($tripsToDelete[$trip->id]) || isset($keptTrips[$trip->id])) {
                continue;
            }

            $dep = $trip->departure_time;
            $arr = $trip->arrival_time;
            $driverId = $trip->driver_id;
            $busId = $trip->bus_id;
            $originId = $trip->route?->origin_terminal_id;
            $destId = $trip->route?->destination_terminal_id;

            $hasConflict = false;

            foreach ($keptTrips as $kept) {
                $keptDep = $kept->departure_time;
                $keptArr = $kept->arrival_time;
                $keptDriverId = $kept->driver_id;
                $keptBusId = $kept->bus_id;
                $keptOriginId = $kept->route?->origin_terminal_id;
                $keptDestId = $kept->route?->destination_terminal_id;

                $driverMatches = ($driverId && $keptDriverId && $driverId === $keptDriverId);
                $busMatches = ($busId && $keptBusId && $busId === $keptBusId);

                if (!$driverMatches && !$busMatches) {
                    continue;
                }

                // Check 1: Time overlap
                if ($dep->lt($keptArr) && $arr->gt($keptDep)) {
                    $hasConflict = true;
                    $overlapConflictsCount++;
                    break;
                }

                // Check 2: Preceding location & turnaround continuity
                if ($keptArr->lte($dep)) {
                    if ($keptDestId && $originId && $keptDestId !== $originId) {
                        $hasConflict = true;
                        $locationConflictsCount++;
                        break;
                    }
                    $restMins = $keptArr->diffInMinutes($dep, false);
                    if ($restMins < 20 && $dep->isSameDay($keptArr)) {
                        $hasConflict = true;
                        $overlapConflictsCount++;
                        break;
                    }
                }

                // Check 3: Subsequent location continuity
                if ($dep->lte($keptDep)) {
                    if ($destId && $keptOriginId && $destId !== $keptOriginId) {
                        $hasConflict = true;
                        $locationConflictsCount++;
                        break;
                    }
                }
            }

            if ($hasConflict) {
                $tripsToDelete[$trip->id] = 'operational_conflict';
            } else {
                $keptTrips[$trip->id] = $trip;
            }
        }

        $deleteIds = array_keys($tripsToDelete);

        if (!$dryRun && !empty($deleteIds)) {
            DB::transaction(function () use ($deleteIds) {
                TripSeat::whereIn('trip_id', $deleteIds)->delete();
                Trip::whereIn('id', $deleteIds)->delete();
            });
        }

        return [
            'total_inspected'              => $futureTrips->count(),
            'unbooked_trips_pruned'        => count($deleteIds),
            'exact_duplicates_removed'     => $exactDuplicatesCount,
            'assignment_conflicts_removed' => $assignmentConflictsCount,
            'overlap_conflicts_removed'    => $overlapConflictsCount,
            'location_conflicts_removed'   => $locationConflictsCount,
            'booked_trips_preserved'       => $bookedPreservedCount,
        ];
    }

    /**
     * Audit existing upcoming trips and report any operational conflicts.
     */
    public function auditExistingTrips(): array
    {
        $futureTrips = Trip::with(['route.originTerminal', 'route.destinationTerminal', 'bus', 'driver.user'])
            ->where('departure_time', '>=', now()->subHours(2))
            ->where('status', '!=', 'cancelled')
            ->orderBy('departure_time', 'asc')
            ->get();

        $invalidTrips = [];
        $totalConflicts = 0;
        $overlapCount = 0;
        $locationMismatchCount = 0;
        $assignmentMismatchCount = 0;

        foreach ($futureTrips as $trip) {
            $conflicts = $this->validateTrip([
                'route_id'       => $trip->route_id,
                'departure_time' => $trip->departure_time->toDateTimeString(),
                'arrival_time'   => $trip->arrival_time->toDateTimeString(),
                'driver_id'      => $trip->driver_id,
                'bus_id'         => $trip->bus_id,
                'status'         => $trip->status,
            ], excludeTripId: $trip->id);

            if (!empty($conflicts)) {
                $totalConflicts += count($conflicts);
                foreach ($conflicts as $c) {
                    if (str_contains($c, 'Overlap')) $overlapCount++;
                    if (str_contains($c, 'Location Mismatch')) $locationMismatchCount++;
                    if (str_contains($c, 'Assignment Conflict')) $assignmentMismatchCount++;
                }

                $invalidTrips[] = [
                    'trip_id'        => $trip->id,
                    'departure_time' => $trip->departure_time->format('d M Y H:i'),
                    'route'          => ($trip->route?->originTerminal?->city ?? 'Origin') . ' → ' . ($trip->route?->destinationTerminal?->city ?? 'Dest'),
                    'bus'            => $trip->bus?->plate_number,
                    'driver'         => $trip->driver?->user?->name,
                    'bookings_count' => $trip->bookings()->count(),
                    'conflicts'      => $conflicts,
                ];
            }
        }

        return [
            'total_inspected'          => $futureTrips->count(),
            'invalid_trips_count'      => count($invalidTrips),
            'total_conflicts'          => $totalConflicts,
            'overlap_conflicts'        => $overlapCount,
            'location_conflicts'       => $locationMismatchCount,
            'assignment_conflicts'     => $assignmentMismatchCount,
            'invalid_trips'            => $invalidTrips,
        ];
    }
}
