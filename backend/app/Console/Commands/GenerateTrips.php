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
    protected $description = 'Generate realistic scheduled departures across all active routes for the specified number of days.';

    public function handle(): int
    {
        $days = (int) $this->argument('days');
        $startDate = Carbon::today();
        $endDate = Carbon::today()->addDays($days);

        $this->info("Scheduling {$days} days of trips ({$startDate->format('d M Y')} → {$endDate->format('d M Y')})...");

        $routes = BusRoute::with(['originTerminal', 'destinationTerminal'])
            ->where('status', 'active')
            ->get();

        $buses = Bus::where('status', 'active')->get();
        $drivers = Driver::with('user')->get();

        if ($routes->isEmpty() || $buses->isEmpty() || $drivers->isEmpty()) {
            $this->error('No active routes, buses, or drivers found in the database.');
            return Command::FAILURE;
        }

        $routeSchedules = [
            1  => ['slots' => ['06:00','08:30','11:00','14:00','17:00','20:00'], 'fare' => 7000,  'class_fares' => ['standard'=>7000,  'vip'=>12000, 'sleeper'=>15000]],
            2  => ['slots' => ['06:00','08:30','11:00','14:00','17:00','20:00'], 'fare' => 7000,  'class_fares' => ['standard'=>7000,  'vip'=>12000, 'sleeper'=>15000]],
            3  => ['slots' => ['06:00','09:00','12:00','15:00','21:00'],         'fare' => 25000, 'class_fares' => ['standard'=>25000, 'vip'=>38000, 'sleeper'=>50000]],
            4  => ['slots' => ['06:00','09:00','12:00','15:00','21:00'],         'fare' => 25000, 'class_fares' => ['standard'=>25000, 'vip'=>38000, 'sleeper'=>50000]],
            5  => ['slots' => ['06:30','10:00','14:00','21:30'],                 'fare' => 35000, 'class_fares' => ['standard'=>35000, 'vip'=>50000, 'sleeper'=>65000]],
            6  => ['slots' => ['06:30','10:00','14:00','21:30'],                 'fare' => 35000, 'class_fares' => ['standard'=>35000, 'vip'=>50000, 'sleeper'=>65000]],
            7  => ['slots' => ['07:00','11:00','15:00','22:00'],                 'fare' => 30000, 'class_fares' => ['standard'=>30000, 'vip'=>45000, 'sleeper'=>60000]],
            8  => ['slots' => ['07:00','11:00','15:00','22:00'],                 'fare' => 30000, 'class_fares' => ['standard'=>30000, 'vip'=>45000, 'sleeper'=>60000]],
            9  => ['slots' => ['07:00','10:00','14:00','20:00'],                 'fare' => 25000, 'class_fares' => ['standard'=>25000, 'vip'=>38000, 'sleeper'=>50000]],
            10 => ['slots' => ['07:00','10:00','14:00','20:00'],                 'fare' => 25000, 'class_fares' => ['standard'=>25000, 'vip'=>38000, 'sleeper'=>50000]],
            11 => ['slots' => ['07:30','10:30','13:30','16:30','19:30'],         'fare' => 15000, 'class_fares' => ['standard'=>15000, 'vip'=>22000, 'sleeper'=>30000]],
            12 => ['slots' => ['07:30','10:30','13:30','16:30','19:30'],         'fare' => 15000, 'class_fares' => ['standard'=>15000, 'vip'=>22000, 'sleeper'=>30000]],
            13 => ['slots' => ['08:00','13:00','22:30'],                         'fare' => 25000, 'class_fares' => ['standard'=>25000, 'vip'=>38000, 'sleeper'=>50000]],
        ];

        $busPool = $buses->values();
        $driverPool = $drivers->values();
        $bIdx = 0;
        $dIdx = 0;
        $created = 0;
        $skipped = 0;

        $routesById = $routes->keyBy('id');
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            $dateStr = $currentDate->format('Y-m-d');

            foreach ($routeSchedules as $routeId => $config) {
                $route = $routesById->get($routeId);
                if (!$route) continue;

                $durationMinutes = $route->estimated_duration_minutes ?: 240;

                foreach ($config['slots'] as $slot) {
                    $departure = Carbon::parse("{$dateStr} {$slot}");
                    $arrival = $departure->copy()->addMinutes($durationMinutes);

                    if ($departure->isPast()) {
                        $skipped++;
                        continue;
                    }

                    $exists = Trip::where('route_id', $routeId)
                        ->where('departure_time', $departure->toDateTimeString())
                        ->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }

                    $bus = $busPool[$bIdx % $busPool->count()];
                    $bIdx++;
                    $driver = $driverPool[$dIdx % $driverPool->count()];
                    $dIdx++;

                    $busClass = $bus->bus_type;
                    $fare = $config['class_fares'][$busClass] ?? $config['fare'];

                    DB::transaction(function () use ($routeId, $bus, $driver, $departure, $arrival, $fare, &$created) {
                        $trip = Trip::create([
                            'route_id'        => $routeId,
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

        $this->info("✅ Successfully generated {$created} new trips ({$skipped} skipped/existing).");
        return Command::SUCCESS;
    }
}
