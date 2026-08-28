<?php
/**
 * LinkBus — Automated Trip Schedule Generator
 * Generates 21 days of realistic daily departures across all active route corridors.
 *
 * Usage:  php database/scripts/generate_trip_schedule.php [days=21]
 */

require __DIR__ . '/../../vendor/autoload.php';
$app = require_once __DIR__ . '/../../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\BusRoute;
use App\Models\Bus;
use App\Models\Driver;
use App\Models\Trip;
use App\Models\TripSeat;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

// ─── Configuration ────────────────────────────────────────────────────────────
$days      = (int)($argv[1] ?? 21);   // How many days ahead to schedule
$startDate = Carbon::today();
$endDate   = Carbon::today()->addDays($days);

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "  LinkBus Automated Trip Schedule Generator\n";
echo "  Scheduling {$days} days of trips ({$startDate->format('d M Y')} → {$endDate->format('d M Y')})\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// ─── Departure time slots per route type ──────────────────────────────────────
// Format: ['HH:MM', fare_ugx]
// Fares based on real Uganda intercity bus prices (2025)
$routeSchedules = [
    // Kampala ↔ Jinja   (~80 km,  90 min)
    1  => ['slots' => ['06:00','08:30','11:00','14:00','17:00','20:00'], 'fare' => 7000,  'class_fares' => ['standard'=>7000,  'vip'=>12000, 'sleeper'=>15000]],
    2  => ['slots' => ['06:00','08:30','11:00','14:00','17:00','20:00'], 'fare' => 7000,  'class_fares' => ['standard'=>7000,  'vip'=>12000, 'sleeper'=>15000]],
    // Kampala ↔ Mbarara  (~270 km, 240 min)
    3  => ['slots' => ['06:00','09:00','12:00','15:00','21:00'],         'fare' => 25000, 'class_fares' => ['standard'=>25000, 'vip'=>38000, 'sleeper'=>50000]],
    4  => ['slots' => ['06:00','09:00','12:00','15:00','21:00'],         'fare' => 25000, 'class_fares' => ['standard'=>25000, 'vip'=>38000, 'sleeper'=>50000]],
    // Kampala ↔ Gulu     (~333 km, 300 min)
    5  => ['slots' => ['06:30','10:00','14:00','21:30'],                 'fare' => 35000, 'class_fares' => ['standard'=>35000, 'vip'=>50000, 'sleeper'=>65000]],
    6  => ['slots' => ['06:30','10:00','14:00','21:30'],                 'fare' => 35000, 'class_fares' => ['standard'=>35000, 'vip'=>50000, 'sleeper'=>65000]],
    // Kampala ↔ Fort Portal (~300 km, 270 min)
    7  => ['slots' => ['07:00','11:00','15:00','22:00'],                 'fare' => 30000, 'class_fares' => ['standard'=>30000, 'vip'=>45000, 'sleeper'=>60000]],
    8  => ['slots' => ['07:00','11:00','15:00','22:00'],                 'fare' => 30000, 'class_fares' => ['standard'=>30000, 'vip'=>45000, 'sleeper'=>60000]],
    // Kampala ↔ Mbale    (~225 km, 240 min)
    9  => ['slots' => ['07:00','10:00','14:00','20:00'],                 'fare' => 25000, 'class_fares' => ['standard'=>25000, 'vip'=>38000, 'sleeper'=>50000]],
    10 => ['slots' => ['07:00','10:00','14:00','20:00'],                 'fare' => 25000, 'class_fares' => ['standard'=>25000, 'vip'=>38000, 'sleeper'=>50000]],
    // Kampala ↔ Mubende  (~150 km, 150 min)
    11 => ['slots' => ['07:30','10:30','13:30','16:30','19:30'],         'fare' => 15000, 'class_fares' => ['standard'=>15000, 'vip'=>22000, 'sleeper'=>30000]],
    12 => ['slots' => ['07:30','10:30','13:30','16:30','19:30'],         'fare' => 15000, 'class_fares' => ['standard'=>15000, 'vip'=>22000, 'sleeper'=>30000]],
    // Extra Kampala → Mbarara route (ID 13)
    13 => ['slots' => ['08:00','13:00','22:30'],                         'fare' => 25000, 'class_fares' => ['standard'=>25000, 'vip'=>38000, 'sleeper'=>50000]],
];

// ─── Load active routes, buses, and drivers ───────────────────────────────────
$routes  = BusRoute::with(['originTerminal', 'destinationTerminal'])
    ->where('status', 'active')
    ->get()
    ->keyBy('id');

$buses   = Bus::where('status', 'active')->get();
$drivers = Driver::with('user')->get();

if ($buses->isEmpty() || $drivers->isEmpty()) {
    echo "❌ No active buses or drivers found. Aborting.\n";
    exit(1);
}

echo "✅ Loaded: " . $routes->count() . " routes, " . $buses->count() . " buses, " . $drivers->count() . " drivers\n\n";

// ─── Round-robin bus/driver assignment pools ──────────────────────────────────
$busPool    = $buses->values();
$driverPool = $drivers->values();
$busIdx     = 0;
$driverIdx  = 0;

function nextBus(array &$idx, $pool)    { $b = $pool[$idx['b'] % $pool->count()]; $idx['b']++; return $b; }
function nextDriver(array &$idx, $pool) { $d = $pool[$idx['d'] % $pool->count()]; $idx['d']++; return $d; }

$poolIdx = ['b' => 0, 'd' => 0];

// ─── Generate seats for a trip (mirrors TripController logic) ─────────────────
function generateSeatsForTrip(Trip $trip, Bus $bus): void
{
    // Determine class split
    $capacity = $bus->capacity;
    $type     = $bus->bus_type;

    // DB enum('standard','vip') — sleeper buses use standard class seats
    $classMap = match ($type) {
        'vip'             => ['vip' => $capacity],
        'sleeper'         => ['standard' => $capacity],  // sleeper type → standard seats
        default           => ['standard' => $capacity],
    };

    $seatNumber = 1;
    $seats = [];
    foreach ($classMap as $class => $count) {
        for ($i = 0; $i < $count; $i++) {
            $seats[] = [
                'trip_id'     => $trip->id,
                'seat_number' => (string)$seatNumber,
                'seat_class'  => $class,
                'status'      => 'available',
                'created_at'  => now(),
                'updated_at'  => now(),
            ];
            $seatNumber++;
        }
    }

    // Insert in chunks to avoid huge queries
    foreach (array_chunk($seats, 50) as $chunk) {
        TripSeat::insert($chunk);
    }
}

// ─── Track stats ──────────────────────────────────────────────────────────────
$created   = 0;
$skipped   = 0;
$errors    = 0;

// ─── Iterate days and routes ──────────────────────────────────────────────────
$currentDate = $startDate->copy();

while ($currentDate->lte($endDate)) {
    $dateStr = $currentDate->format('Y-m-d');

    foreach ($routeSchedules as $routeId => $config) {
        $route = $routes->get($routeId);
        if (!$route) {
            continue; // Route not found or inactive
        }

        $durationMinutes = $route->estimated_duration_minutes ?: 240;
        $originCity      = $route->originTerminal?->city    ?? '?';
        $destCity        = $route->destinationTerminal?->city ?? '?';

        foreach ($config['slots'] as $slot) {
            $departure = Carbon::parse("{$dateStr} {$slot}");
            $arrival   = $departure->copy()->addMinutes($durationMinutes);

            // Skip slots that have already passed for today
            if ($departure->isPast()) {
                $skipped++;
                continue;
            }

            // Check for duplicate (same route + departure_time already exists)
            $exists = Trip::where('route_id', $routeId)
                ->where('departure_time', $departure->toDateTimeString())
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            // Pick bus and driver (round-robin)
            $bus    = nextBus($poolIdx, $busPool);
            $driver = nextDriver($poolIdx, $driverPool);

            // Determine fare based on bus class
            $busClass = $bus->bus_type;
            $fare     = $config['class_fares'][$busClass] ?? $config['fare'];

            try {
                DB::transaction(function () use (
                    $routeId, $bus, $driver, $departure, $arrival, $fare, &$created
                ) {
                    $newTrip = Trip::create([
                        'route_id'        => $routeId,
                        'bus_id'          => $bus->id,
                        'driver_id'       => $driver->id,
                        'departure_time'  => $departure,
                        'arrival_time'    => $arrival,
                        'fare'            => $fare,
                        'status'          => 'scheduled',
                        'available_seats' => $bus->capacity,
                    ]);

                    generateSeatsForTrip($newTrip, $bus);
                    $created++;
                });

                echo "  ✔ [{$departure->format('D d-M H:i')}] {$originCity} → {$destCity} | {$bus->bus_type} {$bus->plate_number} | UGX " . number_format($fare) . "\n";
            } catch (\Throwable $e) {
                echo "  ✘ Error: {$departure->format('D d-M H:i')} {$originCity}→{$destCity}: {$e->getMessage()}\n";
                $errors++;
            }
        }
    }

    $currentDate->addDay();
    echo "\n";
}

// ─── Summary ─────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "  Schedule Generation Complete!\n";
echo "  ✅ Created : {$created} trips\n";
echo "  ⏭  Skipped : {$skipped} (past departures or duplicates)\n";
echo "  ❌ Errors  : {$errors}\n";
echo "  Total trips now in DB: " . Trip::where('status', 'scheduled')->count() . " scheduled\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
