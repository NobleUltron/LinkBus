<?php

namespace Database\Seeders;

use App\Models\Advertisement;
use App\Models\Bus;
use App\Models\BusRoute;
use App\Models\Driver;
use App\Models\PromoCode;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Terminal;
use App\Models\Trip;
use App\Models\TripSeat;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Roles ──────────────────────────────────────────────────
        $adminRole     = Role::create(['name' => 'Administrator', 'slug' => 'admin',     'description' => 'Full system access']);
        $staffRole     = Role::create(['name' => 'Staff',         'slug' => 'staff',     'description' => 'Ticketing & operations staff']);
        $driverRole    = Role::create(['name' => 'Driver',        'slug' => 'driver',    'description' => 'Bus driver']);
        $passengerRole = Role::create(['name' => 'Passenger',     'slug' => 'passenger', 'description' => 'Ticket-purchasing passenger']);

        // ── 2. Administrative & Staff Users ───────────────────────────
        $admin = User::create([
            'name'     => 'Admin User',
            'email'    => 'admin@linkbus.co.ug',
            'phone'    => '0700000000',
            'role_id'  => $adminRole->id,
            'password' => Hash::make('password'),
        ]);

        $staff = User::create([
            'name'     => 'Sarah Nakamya',
            'email'    => 'staff@linkbus.co.ug',
            'phone'    => '0701111111',
            'role_id'  => $staffRole->id,
            'password' => Hash::make('password'),
        ]);

        User::create([
            'name'     => 'Test Passenger',
            'email'    => 'passenger@linkbus.co.ug',
            'phone'    => '0704444444',
            'role_id'  => $passengerRole->id,
            'password' => Hash::make('password'),
        ]);

        // ── 3. Coach Captains (Drivers) ───────────────────────────────
        $driverSpecs = [
            ['name' => 'John Okello (Demo)', 'email' => 'driver1@linkbus.co.ug',         'phone' => '0702000000', 'license' => 'UG-DL-2019-000', 'exp' => 10],
            ['name' => 'John Okello',        'email' => 'john.okello@linkbus.co.ug',      'phone' => '0702000001', 'license' => 'UG-DL-2019-001', 'exp' => 8],
            ['name' => 'Moses Mugisha',      'email' => 'moses.mugisha@linkbus.co.ug',    'phone' => '0702000002', 'license' => 'UG-DL-2021-002', 'exp' => 6],
            ['name' => 'Charles Mugaya',     'email' => 'charles.mugaya@linkbus.co.ug',   'phone' => '0702000003', 'license' => 'UG-DL-2020-003', 'exp' => 9],
            ['name' => 'Patrick Kato',       'email' => 'patrick.kato@linkbus.co.ug',     'phone' => '0702000004', 'license' => 'UG-DL-2022-004', 'exp' => 5],
            ['name' => 'David Ochieng',      'email' => 'david.ochieng@linkbus.co.ug',    'phone' => '0702000005', 'license' => 'UG-DL-2018-005', 'exp' => 10],
            ['name' => 'Ronald Ssempala',    'email' => 'ronald.ssempala@linkbus.co.ug',  'phone' => '0702000006', 'license' => 'UG-DL-2023-006', 'exp' => 4],
        ];

        $drivers = [];
        foreach ($driverSpecs as $spec) {
            $user = User::create([
                'name'     => $spec['name'],
                'email'    => $spec['email'],
                'phone'    => $spec['phone'],
                'role_id'  => $driverRole->id,
                'password' => Hash::make('password'),
            ]);

            $drivers[] = Driver::create([
                'user_id'          => $user->id,
                'license_number'   => $spec['license'],
                'license_expiry'   => '2028-12-31',
                'status'           => 'active',
                'experience_years' => $spec['exp'],
            ]);
        }

        // ── 4. Fleet of Buses ─────────────────────────────────────────
        $bus1 = Bus::create(['plate_number' => 'UAA 123B', 'model' => 'Scania Irizar i6',  'bus_type' => 'vip',      'capacity' => 44, 'status' => 'active']);
        $bus2 = Bus::create(['plate_number' => 'UAB 456C', 'model' => 'Yutong ZK6122',     'bus_type' => 'standard', 'capacity' => 54, 'status' => 'active']);
        $bus3 = Bus::create(['plate_number' => 'UAC 789D', 'model' => 'Marcopolo Viaggio', 'bus_type' => 'standard', 'capacity' => 49, 'status' => 'active']);
        $bus4 = Bus::create(['plate_number' => 'UAD 012E', 'model' => 'King Long XMQ6127',  'bus_type' => 'sleeper',  'capacity' => 36, 'status' => 'active']);
        $bus5 = Bus::create(['plate_number' => 'UAE 345F', 'model' => 'Scania Touring',     'bus_type' => 'vip',      'capacity' => 44, 'status' => 'active']);
        $bus6 = Bus::create(['plate_number' => 'UAF 678G', 'model' => 'Isuzu MV123',        'bus_type' => 'standard', 'capacity' => 50, 'status' => 'active']);

        // ── 5. Terminals ──────────────────────────────────────────────
        $kampala = Terminal::create(['name' => 'Kampala Central Bus Terminal', 'city' => 'Kampala',     'address' => 'Nakivubo Road, Kampala',       'latitude' => 0.3163,  'longitude' => 32.5822, 'status' => 'active']);
        $jinja   = Terminal::create(['name' => 'Jinja Bus Terminal',           'city' => 'Jinja',       'address' => 'Main Street, Jinja',           'latitude' => 0.4244,  'longitude' => 33.2042, 'status' => 'active']);
        $mbale   = Terminal::create(['name' => 'Mbale Bus Terminal',           'city' => 'Mbale',       'address' => 'Republic Street, Mbale',       'latitude' => 1.0836,  'longitude' => 34.1754, 'status' => 'active']);
        $mbarara = Terminal::create(['name' => 'Mbarara Terminal',             'city' => 'Mbarara',     'address' => 'High Street, Mbarara',         'latitude' => -0.6065, 'longitude' => 30.6568, 'status' => 'active']);
        $fortpor = Terminal::create(['name' => 'Fort Portal Terminal',         'city' => 'Fort Portal', 'address' => 'Station Rd, Fort Portal',      'latitude' => 0.6712,  'longitude' => 30.2741, 'status' => 'active']);
        $gulu    = Terminal::create(['name' => 'Gulu Bus Park',                'city' => 'Gulu',        'address' => 'Layibi Road, Gulu',            'latitude' => 2.7746,  'longitude' => 32.3026, 'status' => 'active']);
        $mubende = Terminal::create(['name' => 'Mubende Terminal',             'city' => 'Mubende',     'address' => 'Mubende New Taxi Park',        'latitude' => 0.5575,  'longitude' => 31.3950, 'status' => 'active']);

        // ── 6. Route Corridors (Bilateral Pairs) ──────────────────────
        // Kampala <-> Jinja (80 km, 90 mins)
        $rKJ = BusRoute::create(['origin_terminal_id' => $kampala->id, 'destination_terminal_id' => $jinja->id,   'distance_km' => 80,  'estimated_duration_minutes' => 90,  'status' => 'active']);
        $rJK = BusRoute::create(['origin_terminal_id' => $jinja->id,   'destination_terminal_id' => $kampala->id, 'distance_km' => 80,  'estimated_duration_minutes' => 90,  'status' => 'active']);

        // Kampala <-> Mbarara (270 km, 240 mins)
        $rKM = BusRoute::create(['origin_terminal_id' => $kampala->id, 'destination_terminal_id' => $mbarara->id, 'distance_km' => 270, 'estimated_duration_minutes' => 240, 'status' => 'active']);
        $rMK = BusRoute::create(['origin_terminal_id' => $mbarara->id, 'destination_terminal_id' => $kampala->id, 'distance_km' => 270, 'estimated_duration_minutes' => 240, 'status' => 'active']);

        // Kampala <-> Gulu (333 km, 300 mins)
        $rKG = BusRoute::create(['origin_terminal_id' => $kampala->id, 'destination_terminal_id' => $gulu->id,    'distance_km' => 333, 'estimated_duration_minutes' => 300, 'status' => 'active']);
        $rGK = BusRoute::create(['origin_terminal_id' => $gulu->id,    'destination_terminal_id' => $kampala->id, 'distance_km' => 333, 'estimated_duration_minutes' => 300, 'status' => 'active']);

        // Kampala <-> Fort Portal (300 km, 270 mins)
        $rKF = BusRoute::create(['origin_terminal_id' => $kampala->id, 'destination_terminal_id' => $fortpor->id, 'distance_km' => 300, 'estimated_duration_minutes' => 270, 'status' => 'active']);
        $rFK = BusRoute::create(['origin_terminal_id' => $fortpor->id, 'destination_terminal_id' => $kampala->id, 'distance_km' => 300, 'estimated_duration_minutes' => 270, 'status' => 'active']);

        // Kampala <-> Mbale (225 km, 240 mins)
        $rKMB = BusRoute::create(['origin_terminal_id' => $kampala->id, 'destination_terminal_id' => $mbale->id,   'distance_km' => 225, 'estimated_duration_minutes' => 240, 'status' => 'active']);
        $rMBK = BusRoute::create(['origin_terminal_id' => $mbale->id,   'destination_terminal_id' => $kampala->id, 'distance_km' => 225, 'estimated_duration_minutes' => 240, 'status' => 'active']);

        // Kampala <-> Mubende (150 km, 150 mins)
        $rKMU = BusRoute::create(['origin_terminal_id' => $kampala->id, 'destination_terminal_id' => $mubende->id, 'distance_km' => 150, 'estimated_duration_minutes' => 150, 'status' => 'active']);
        $rMUK = BusRoute::create(['origin_terminal_id' => $mubende->id, 'destination_terminal_id' => $kampala->id, 'distance_km' => 150, 'estimated_duration_minutes' => 150, 'status' => 'active']);

        // ── 7. Conflict-Free Circuit Rotations (Across 4 Days) ────────
        // Circuit templates per driver + bus pair:
        $circuits = [
            // Circuit 1: Jinja Shuttle (Bus 1, Driver 0: John Okello)
            [
                'bus'    => $bus1,
                'driver' => $drivers[0],
                'legs'   => [
                    ['route' => $rKJ, 'hour' => 7,  'min' => 30, 'fare' => 15000], // 07:30 - 09:00 (KLA -> JJA)
                    ['route' => $rJK, 'hour' => 10, 'min' => 30, 'fare' => 15000], // 10:30 - 12:00 (JJA -> KLA)
                    ['route' => $rKJ, 'hour' => 14, 'min' => 00, 'fare' => 15000], // 14:00 - 15:30 (KLA -> JJA)
                    ['route' => $rJK, 'hour' => 17, 'min' => 00, 'fare' => 15000], // 17:00 - 18:30 (JJA -> KLA)
                ],
            ],
            // Circuit 2: Mbarara Express (Bus 2, Driver 1: Moses Mugisha)
            [
                'bus'    => $bus2,
                'driver' => $drivers[1],
                'legs'   => [
                    ['route' => $rKM, 'hour' => 8,  'min' => 00, 'fare' => 30000], // 08:00 - 12:00 (KLA -> MBR)
                    ['route' => $rMK, 'hour' => 14, 'min' => 00, 'fare' => 30000], // 14:00 - 18:00 (MBR -> KLA)
                ],
            ],
            // Circuit 3: Gulu Long-Haul (Bus 3, Driver 2: Charles Mugaya)
            [
                'bus'    => $bus3,
                'driver' => $drivers[2],
                'legs'   => [
                    ['route' => $rKG, 'hour' => 7,  'min' => 00, 'fare' => 35000], // 07:00 - 12:00 (KLA -> GUL)
                    ['route' => $rGK, 'hour' => 14, 'min' => 30, 'fare' => 35000], // 14:30 - 19:30 (GUL -> KLA)
                ],
            ],
            // Circuit 4: Fort Portal Explorer (Bus 4, Driver 3: Patrick Kato)
            [
                'bus'    => $bus4,
                'driver' => $drivers[3],
                'legs'   => [
                    ['route' => $rKF, 'hour' => 7,  'min' => 30, 'fare' => 35000], // 07:30 - 12:00 (KLA -> FPT)
                    ['route' => $rFK, 'hour' => 14, 'min' => 00, 'fare' => 35000], // 14:00 - 18:30 (FPT -> KLA)
                ],
            ],
            // Circuit 5: Mbale Regional (Bus 5, Driver 4: David Ochieng)
            [
                'bus'    => $bus5,
                'driver' => $drivers[4],
                'legs'   => [
                    ['route' => $rKMB, 'hour' => 8,  'min' => 00, 'fare' => 25000], // 08:00 - 12:00 (KLA -> MBL)
                    ['route' => $rMBK, 'hour' => 14, 'min' => 00, 'fare' => 25000], // 14:00 - 18:00 (MBL -> KLA)
                ],
            ],
            // Circuit 6: Mubende Mid-West (Bus 6, Driver 5: Ronald Ssempala)
            [
                'bus'    => $bus6,
                'driver' => $drivers[5],
                'legs'   => [
                    ['route' => $rKMU, 'hour' => 8,  'min' => 30, 'fare' => 20000], // 08:30 - 11:00 (KLA -> MUB)
                    ['route' => $rMUK, 'hour' => 13, 'min' => 00, 'fare' => 20000], // 13:00 - 15:30 (MUB -> KLA)
                ],
            ],
        ];

        // Seed 4 consecutive days: Today (0), Tomorrow (+1), +2, +3
        for ($dayOffset = 0; $dayOffset <= 3; $dayOffset++) {
            $date = Carbon::today()->addDays($dayOffset);

            foreach ($circuits as $circuit) {
                $bus = $circuit['bus'];
                $driver = $circuit['driver'];

                foreach ($circuit['legs'] as $leg) {
                    $route = $leg['route'];
                    $dep = $date->copy()->setTime($leg['hour'], $leg['min'], 0);
                    $arr = $dep->copy()->addMinutes($route->estimated_duration_minutes);

                    // Skip past departures for today if they occurred earlier than right now
                    $isPast = $dep->isPast();

                    $trip = Trip::create([
                        'route_id'        => $route->id,
                        'bus_id'          => $bus->id,
                        'driver_id'       => $driver->id,
                        'departure_time'  => $dep,
                        'arrival_time'    => $arr,
                        'fare'            => $leg['fare'],
                        'status'          => $isPast ? 'completed' : 'scheduled',
                        'available_seats' => $bus->capacity,
                    ]);

                    $this->generateSeats($trip, $bus);
                }
            }
        }

        // ── 8. Promo Codes ────────────────────────────────────────────
        PromoCode::create(['code' => 'WELCOME10', 'description' => '10% off your first ride', 'discount_type' => 'percentage', 'discount_value' => 10, 'min_booking_amount' => 20000, 'max_uses' => 500, 'is_active' => true, 'expires_at' => now()->addYear()]);
        PromoCode::create(['code' => 'SAVE5K',    'description' => 'UGX 5,000 flat discount',  'discount_type' => 'fixed',      'discount_value' => 5000, 'min_booking_amount' => 30000, 'max_uses' => 200, 'is_active' => true, 'expires_at' => now()->addMonths(3)]);
        PromoCode::create(['code' => 'VIP20',     'description' => '20% off VIP seats',        'discount_type' => 'percentage', 'discount_value' => 20, 'min_booking_amount' => 40000, 'max_uses' => 100, 'is_active' => true, 'expires_at' => now()->addMonths(6)]);

        // ── 9. System Settings ────────────────────────────────────────
        $settings = [
            ['key' => 'company_name',          'value' => 'LinkBus Uganda',        'group' => 'company',  'description' => 'Company name'],
            ['key' => 'company_phone',         'value' => '+256-700-123456',       'group' => 'company',  'description' => 'Main contact phone'],
            ['key' => 'company_email',         'value' => 'info@linkbus.co.ug',    'group' => 'company',  'description' => 'Company email'],
            ['key' => 'booking_advance_days',  'value' => '30',                    'group' => 'booking',  'description' => 'Days ahead passengers can book'],
            ['key' => 'seat_lock_minutes',     'value' => '10',                    'group' => 'booking',  'description' => 'Minutes a seat is held without payment'],
            ['key' => 'cancellation_fee_pct',  'value' => '10',                    'group' => 'booking',  'description' => 'Cancellation fee percentage'],
            ['key' => 'tax_rate',              'value' => '0',                     'group' => 'booking',  'description' => 'Tax rate percentage'],
            ['key' => 'max_luggage_kg',        'value' => '20',                    'group' => 'luggage',  'description' => 'Max free luggage weight in kg'],
            ['key' => 'excess_luggage_fee_kg', 'value' => '2000',                  'group' => 'luggage',  'description' => 'Fee per extra kg in UGX'],
        ];
        foreach ($settings as $s) {
            Setting::create($s);
        }

        // ── 10. Advertisements ────────────────────────────────────────
        Advertisement::create([
            'title'       => 'Book Early, Save More!',
            'description' => 'Book 3+ days ahead and get the best seats.',
            'type'        => 'banner',
            'status'      => 'active',
            'start_date'  => now(),
            'end_date'    => now()->addMonths(3),
            'priority'    => 1,
        ]);
    }

    private function generateSeats(Trip $trip, Bus $bus): void
    {
        $capacity = $bus->capacity;
        $seatsPerRow = 4;
        $rows = (int) ceil($capacity / $seatsPerRow);
        $seatClass = $bus->bus_type === 'vip' ? 'vip' : 'standard';

        $seats = [];
        for ($row = 1; $row <= $rows; $row++) {
            $letters = ['A', 'B', 'C', 'D'];
            foreach ($letters as $letter) {
                if (count($seats) >= $capacity) break;
                $seats[] = [
                    'trip_id'     => $trip->id,
                    'seat_number' => "{$row}{$letter}",
                    'seat_class'  => $seatClass,
                    'status'      => 'available',
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];
            }
        }
        TripSeat::insert($seats);
    }
}
