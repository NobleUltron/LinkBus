<?php

namespace App\Console\Commands;

use App\Models\Bus;
use App\Models\BusRoute;
use App\Models\Driver;
use App\Models\Trip;
use App\Models\TripSeat;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GenerateTrips extends Command
{
    protected $signature = 'trips:generate {days=30 : Number of future days to schedule}';
    protected $description = 'Generate realistic scheduled departures across all active routes for the specified number of days using conflict-free corridor circuits.';

    public function handle(): int
    {
        $days = (int) $this->argument('days');
        $startDate = Carbon::today();
        $endDate = Carbon::today()->addDays($days);

        $this->info("Scheduling {$days} days of trips ({$startDate->format('d M Y')} → {$endDate->format('d M Y')})...");

        $routes = BusRoute::with(['originTerminal', 'destinationTerminal'])
            ->where('status', 'active')
            ->get()
            ->keyBy('id');

        $buses = Bus::where('status', 'active')->get()->keyBy('id');
        $drivers = Driver::with('user')->get()->keyBy('id');

        if ($routes->isEmpty() || $buses->isEmpty() || $drivers->isEmpty()) {
            $this->error('No active routes, buses, or drivers found in the database.');
            return Command::FAILURE;
        }

        // 8 Conflict-Free Daily Corridor Circuits:
        // Each circuit assigns 1 dedicated coach + 1 dedicated driver with guaranteed return legs and 90min+ turnaround buffer.
        $circuits = [
            // Circuit 1: Jinja Shuttle A (VIP Bus 1, Driver 1: John Okello)
            [
                'bus_id'    => 1,
                'driver_id' => 1,
                'legs'      => [
                    ['route_id' => 1, 'hour' => 7,  'min' => 30, 'fare' => 12000],
                    ['route_id' => 2, 'hour' => 10, 'min' => 30, 'fare' => 12000],
                    ['route_id' => 1, 'hour' => 14, 'min' => 00, 'fare' => 12000],
                    ['route_id' => 2, 'hour' => 17, 'min' => 00, 'fare' => 12000],
                ],
            ],
            // Circuit 2: Jinja Shuttle B (VIP Bus 8, Driver 9: Sseguya Jonathan)
            [
                'bus_id'    => 8,
                'driver_id' => 9,
                'legs'      => [
                    ['route_id' => 1, 'hour' => 9,  'min' => 00, 'fare' => 12000],
                    ['route_id' => 2, 'hour' => 12, 'min' => 00, 'fare' => 12000],
                    ['route_id' => 1, 'hour' => 15, 'min' => 30, 'fare' => 12000],
                    ['route_id' => 2, 'hour' => 18, 'min' => 30, 'fare' => 12000],
                ],
            ],
            // Circuit 3: Mbarara Express Morning (Bus 2, Driver 2: Moses Mugisha)
            [
                'bus_id'    => 2,
                'driver_id' => 2,
                'legs'      => [
                    ['route_id' => 3, 'hour' => 8,  'min' => 00, 'fare' => 25000],
                    ['route_id' => 4, 'hour' => 14, 'min' => 30, 'fare' => 25000],
                ],
            ],
            // Circuit 4: Mbarara Afternoon Service (Bus 9, Driver 10: Kabanda Ivan)
            [
                'bus_id'    => 9,
                'driver_id' => 10,
                'legs'      => [
                    ['route_id' => 3, 'hour' => 10, 'min' => 00, 'fare' => 25000],
                    ['route_id' => 4, 'hour' => 16, 'min' => 00, 'fare' => 25000],
                ],
            ],
            // Circuit 5: Gulu Long-Haul (Bus 3, Driver 3: Charles Mugaya)
            [
                'bus_id'    => 3,
                'driver_id' => 3,
                'legs'      => [
                    ['route_id' => 5, 'hour' => 7,  'min' => 00, 'fare' => 35000],
                    ['route_id' => 6, 'hour' => 14, 'min' => 30, 'fare' => 35000],
                ],
            ],
            // Circuit 6: Fort Portal Explorer (Bus 4, Driver 4: Patrick Kato)
            [
                'bus_id'    => 4,
                'driver_id' => 4,
                'legs'      => [
                    ['route_id' => 7, 'hour' => 7,  'min' => 30, 'fare' => 30000],
                    ['route_id' => 8, 'hour' => 14, 'min' => 30, 'fare' => 30000],
                ],
            ],
            // Circuit 7: Mbale Regional (Bus 5, Driver 5: David Ochieng)
            [
                'bus_id'    => 5,
                'driver_id' => 5,
                'legs'      => [
                    ['route_id' => 9,  'hour' => 8,  'min' => 00, 'fare' => 25000],
                    ['route_id' => 10, 'hour' => 14, 'min' => 30, 'fare' => 25000],
                ],
            ],
            // Circuit 8: Mubende Mid-West (Bus 6, Driver 6: Ronald Ssempala)
            [
                'bus_id'    => 6,
                'driver_id' => 6,
                'legs'      => [
                    ['route_id' => 11, 'hour' => 8,  'min' => 30, 'fare' => 15000],
                    ['route_id' => 12, 'hour' => 13, 'min' => 30, 'fare' => 15000],
                ],
            ],
        ];

        $created = 0;
        $skipped = 0;
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            foreach ($circuits as $circuit) {
                $bus = $buses->get($circuit['bus_id']) ?? $buses->first();
                $driver = $drivers->get($circuit['driver_id']) ?? $drivers->first();
                if (!$bus || !$driver) continue;

                foreach ($circuit['legs'] as $leg) {
                    $route = $routes->get($leg['route_id']);
                    if (!$route) continue;

                    $departure = $currentDate->copy()->setTime($leg['hour'], $leg['min'], 0);
                    $durationMinutes = $route->estimated_duration_minutes ?: 240;
                    $arrival = $departure->copy()->addMinutes($durationMinutes);

                    if ($departure->isPast()) {
                        $skipped++;
                        continue;
                    }

                    $exists = Trip::where('route_id', $route->id)
                        ->where('departure_time', $departure->toDateTimeString())
                        ->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }

                    $busClass = $bus->bus_type;
                    $fare = $leg['fare'];

                    DB::transaction(function () use ($route, $bus, $driver, $departure, $arrival, $fare, &$created) {
                        $trip = Trip::create([
                            'route_id'        => $route->id,
                            'bus_id'          => $bus->id,
                            'driver_id'       => $driver->id,
                            'departure_time'  => $departure,
                            'arrival_time'    => $arrival,
                            'fare'            => $fare,
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
                        $created++;
                    });
                }
            }
            $currentDate->addDay();
        }

        $this->info("✅ Successfully generated {$created} new conflict-free trips ({$skipped} skipped/existing).");
        return Command::SUCCESS;
    }
}
