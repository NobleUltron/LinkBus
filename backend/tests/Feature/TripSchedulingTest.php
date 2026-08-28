<?php

namespace Tests\Feature;

use App\Models\Bus;
use App\Models\BusRoute;
use App\Models\Driver;
use App\Models\Role;
use App\Models\Terminal;
use App\Models\Trip;
use App\Models\User;
use App\Services\TripSchedulingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TripSchedulingTest extends TestCase
{
    use RefreshDatabase;

    protected Terminal $kampala;
    protected Terminal $jinja;
    protected Terminal $mbarara;
    protected BusRoute $routeKJ;
    protected BusRoute $routeJK;
    protected BusRoute $routeKM;
    protected Bus $busA;
    protected Bus $busB;
    protected Driver $driverA;
    protected Driver $driverB;
    protected User $adminUser;
    protected TripSchedulingService $schedulingService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->schedulingService = app(TripSchedulingService::class);

        $adminRole = Role::create(['name' => 'Admin', 'slug' => 'admin']);
        $driverRole = Role::create(['name' => 'Driver', 'slug' => 'driver']);

        $this->adminUser = User::create([
            'name'     => 'System Admin',
            'email'    => 'admin@linkbus.co.ug',
            'password' => bcrypt('password'),
            'role_id'  => $adminRole->id,
        ]);

        $userDriverA = User::create([
            'name'     => 'John Okello',
            'email'    => 'john@linkbus.co.ug',
            'password' => bcrypt('password'),
            'role_id'  => $driverRole->id,
        ]);

        $userDriverB = User::create([
            'name'     => 'Moses Mugisha',
            'email'    => 'moses@linkbus.co.ug',
            'password' => bcrypt('password'),
            'role_id'  => $driverRole->id,
        ]);

        $this->busA = Bus::create([
            'plate_number' => 'UAA 123B',
            'model'        => 'Scania VIP',
            'bus_type'     => 'vip',
            'capacity'     => 44,
            'status'       => 'active',
        ]);

        $this->busB = Bus::create([
            'plate_number' => 'UAB 456C',
            'model'        => 'Yutong Standard',
            'bus_type'     => 'standard',
            'capacity'     => 54,
            'status'       => 'active',
        ]);

        $this->driverA = Driver::create([
            'user_id'          => $userDriverA->id,
            'assigned_bus_id'  => $this->busA->id,
            'license_number'   => 'UG-DL-001',
            'license_expiry'   => Carbon::today()->addYears(2),
            'status'           => 'active',
            'experience_years' => 8,
        ]);

        $this->driverB = Driver::create([
            'user_id'          => $userDriverB->id,
            'assigned_bus_id'  => $this->busB->id,
            'license_number'   => 'UG-DL-002',
            'license_expiry'   => Carbon::today()->addYears(2),
            'status'           => 'active',
            'experience_years' => 5,
        ]);

        $this->kampala = Terminal::create([
            'name'      => 'Kampala Central Terminal',
            'city'      => 'Kampala',
            'address'   => 'Nakivubo Rd',
            'latitude'  => 0.3163,
            'longitude' => 32.5822,
            'status'    => 'active',
        ]);

        $this->jinja = Terminal::create([
            'name'      => 'Jinja Bus Terminal',
            'city'      => 'Jinja',
            'address'   => 'Main St',
            'latitude'  => 0.4244,
            'longitude' => 33.2042,
            'status'    => 'active',
        ]);

        $this->mbarara = Terminal::create([
            'name'      => 'Mbarara Terminal',
            'city'      => 'Mbarara',
            'address'   => 'High St',
            'latitude'  => -0.6072,
            'longitude' => 30.6545,
            'status'    => 'active',
        ]);

        $this->routeKJ = BusRoute::create([
            'origin_terminal_id'         => $this->kampala->id,
            'destination_terminal_id'    => $this->jinja->id,
            'distance_km'                => 80,
            'estimated_duration_minutes' => 90,
            'status'                     => 'active',
        ]);

        $this->routeJK = BusRoute::create([
            'origin_terminal_id'         => $this->jinja->id,
            'destination_terminal_id'    => $this->kampala->id,
            'distance_km'                => 80,
            'estimated_duration_minutes' => 90,
            'status'                     => 'active',
        ]);

        $this->routeKM = BusRoute::create([
            'origin_terminal_id'         => $this->kampala->id,
            'destination_terminal_id'    => $this->mbarara->id,
            'distance_km'                => 270,
            'estimated_duration_minutes' => 240,
            'status'                     => 'active',
        ]);
    }

    public function test_driver_can_be_permanently_assigned_to_one_coach(): void
    {
        $this->assertEquals($this->busA->id, $this->driverA->assigned_bus_id);
        $this->assertEquals($this->driverA->id, $this->busA->assignedDriver->id);
    }

    public function test_two_active_drivers_cannot_be_assigned_to_same_coach(): void
    {
        $response = $this->actingAs($this->adminUser)->putJson("/api/drivers/{$this->driverB->id}", [
            'assigned_bus_id' => $this->busA->id, // busA is already assigned to driverA
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['assigned_bus_id']);
    }

    public function test_trip_with_driver_and_their_assigned_coach_is_valid(): void
    {
        $tomorrow = Carbon::tomorrow()->setTime(8, 0, 0);

        $conflicts = $this->schedulingService->validateTrip([
            'route_id'       => $this->routeKJ->id,
            'departure_time' => $tomorrow->toDateTimeString(),
            'arrival_time'   => $tomorrow->copy()->addMinutes(90)->toDateTimeString(),
            'driver_id'      => $this->driverA->id,
            'bus_id'         => $this->busA->id,
            'status'         => 'scheduled',
        ]);

        $this->assertEmpty($conflicts);
    }

    public function test_driver_cannot_operate_unassigned_coach(): void
    {
        $tomorrow = Carbon::tomorrow()->setTime(8, 0, 0);

        // Driver A is assigned to Bus A, trying to drive Bus B
        $conflicts = $this->schedulingService->validateTrip([
            'route_id'       => $this->routeKJ->id,
            'departure_time' => $tomorrow->toDateTimeString(),
            'arrival_time'   => $tomorrow->copy()->addMinutes(90)->toDateTimeString(),
            'driver_id'      => $this->driverA->id,
            'bus_id'         => $this->busB->id,
            'status'         => 'scheduled',
        ]);

        $this->assertNotEmpty($conflicts);
        $this->assertTrue(collect($conflicts)->contains(fn($c) => str_contains($c, 'Driver Assignment Conflict')));
    }

    public function test_driver_cannot_operate_overlapping_trips(): void
    {
        $tomorrow = Carbon::tomorrow();

        // Existing trip: 08:00 - 09:30
        Trip::create([
            'route_id'        => $this->routeKJ->id,
            'bus_id'          => $this->busA->id,
            'driver_id'       => $this->driverA->id,
            'departure_time'  => $tomorrow->copy()->setTime(8, 0),
            'arrival_time'    => $tomorrow->copy()->setTime(9, 30),
            'fare'            => 12000,
            'status'          => 'scheduled',
            'available_seats' => 44,
        ]);

        // Attempt overlapping trip: 08:30 - 10:00
        $conflicts = $this->schedulingService->validateTrip([
            'route_id'       => $this->routeKJ->id,
            'departure_time' => $tomorrow->copy()->setTime(8, 30)->toDateTimeString(),
            'arrival_time'   => $tomorrow->copy()->setTime(10, 0)->toDateTimeString(),
            'driver_id'      => $this->driverA->id,
            'bus_id'         => $this->busA->id,
            'status'         => 'scheduled',
        ]);

        $this->assertNotEmpty($conflicts);
        $this->assertTrue(collect($conflicts)->contains(fn($c) => str_contains($c, 'Driver Time Overlap')));
    }

    public function test_coach_location_conflict_is_rejected(): void
    {
        $tomorrow = Carbon::tomorrow();

        // Trip 1: Kampala -> Jinja (arrives Jinja at 09:30)
        Trip::create([
            'route_id'        => $this->routeKJ->id,
            'bus_id'          => $this->busA->id,
            'driver_id'       => $this->driverA->id,
            'departure_time'  => $tomorrow->copy()->setTime(8, 0),
            'arrival_time'    => $tomorrow->copy()->setTime(9, 30),
            'fare'            => 12000,
            'status'          => 'scheduled',
            'available_seats' => 44,
        ]);

        // Attempt Trip 2 from Kampala (impossible because coach is in Jinja)
        $conflicts = $this->schedulingService->validateTrip([
            'route_id'       => $this->routeKM->id, // Kampala -> Mbarara
            'departure_time' => $tomorrow->copy()->setTime(11, 0)->toDateTimeString(),
            'arrival_time'   => $tomorrow->copy()->setTime(15, 0)->toDateTimeString(),
            'driver_id'      => $this->driverA->id,
            'bus_id'         => $this->busA->id,
            'status'         => 'scheduled',
        ]);

        $this->assertNotEmpty($conflicts);
        $this->assertTrue(collect($conflicts)->contains(fn($c) => str_contains($c, 'Location Mismatch')));
    }

    public function test_minimum_turnaround_time_is_enforced(): void
    {
        $tomorrow = Carbon::tomorrow();

        // Trip 1: Kampala -> Jinja arrives Jinja at 09:30
        Trip::create([
            'route_id'        => $this->routeKJ->id,
            'bus_id'          => $this->busA->id,
            'driver_id'       => $this->driverA->id,
            'departure_time'  => $tomorrow->copy()->setTime(8, 0),
            'arrival_time'    => $tomorrow->copy()->setTime(9, 30),
            'fare'            => 12000,
            'status'          => 'scheduled',
            'available_seats' => 44,
        ]);

        // Return Trip 2 departing from Jinja at 09:40 (only 10 min rest, min 30 required)
        $conflicts = $this->schedulingService->validateTrip([
            'route_id'       => $this->routeJK->id, // Jinja -> Kampala
            'departure_time' => $tomorrow->copy()->setTime(9, 40)->toDateTimeString(),
            'arrival_time'   => $tomorrow->copy()->setTime(11, 10)->toDateTimeString(),
            'driver_id'      => $this->driverA->id,
            'bus_id'         => $this->busA->id,
            'status'         => 'scheduled',
        ]);

        $this->assertNotEmpty($conflicts);
        $this->assertTrue(collect($conflicts)->contains(fn($c) => str_contains($c, 'Turnaround Violation')));
    }

    public function test_exact_duplicate_trip_is_rejected(): void
    {
        $tomorrow = Carbon::tomorrow()->setTime(8, 0);

        Trip::create([
            'route_id'        => $this->routeKJ->id,
            'bus_id'          => $this->busA->id,
            'driver_id'       => $this->driverA->id,
            'departure_time'  => $tomorrow,
            'arrival_time'    => $tomorrow->copy()->addMinutes(90),
            'fare'            => 12000,
            'status'          => 'scheduled',
            'available_seats' => 44,
        ]);

        $conflicts = $this->schedulingService->validateTrip([
            'route_id'       => $this->routeKJ->id,
            'departure_time' => $tomorrow->toDateTimeString(),
            'arrival_time'   => $tomorrow->copy()->addMinutes(90)->toDateTimeString(),
            'driver_id'      => $this->driverA->id,
            'bus_id'         => $this->busA->id,
            'status'         => 'scheduled',
        ]);

        $this->assertNotEmpty($conflicts);
        $this->assertTrue(collect($conflicts)->contains(fn($c) => str_contains($c, 'Exact Duplicate Trip')));
    }

    public function test_cancelled_trip_releases_resources(): void
    {
        $tomorrow = Carbon::tomorrow()->setTime(8, 0);

        $trip = Trip::create([
            'route_id'        => $this->routeKJ->id,
            'bus_id'          => $this->busA->id,
            'driver_id'       => $this->driverA->id,
            'departure_time'  => $tomorrow,
            'arrival_time'    => $tomorrow->copy()->addMinutes(90),
            'fare'            => 12000,
            'status'          => 'cancelled', // CANCELLED
            'available_seats' => 44,
        ]);

        // Same slot should now be valid because the previous trip was cancelled
        $conflicts = $this->schedulingService->validateTrip([
            'route_id'       => $this->routeKJ->id,
            'departure_time' => $tomorrow->toDateTimeString(),
            'arrival_time'   => $tomorrow->copy()->addMinutes(90)->toDateTimeString(),
            'driver_id'      => $this->driverA->id,
            'bus_id'         => $this->busA->id,
            'status'         => 'scheduled',
        ]);

        $this->assertEmpty($conflicts);
    }

    public function test_auto_generator_is_idempotent_and_respects_fleet_capacity(): void
    {
        $startDate = Carbon::tomorrow();

        // First run
        $summary1 = $this->schedulingService->generateRealisticTimetable($startDate, 3, purgeUnbooked: false);
        
        $this->assertGreaterThan(0, $summary1['trips_generated'], 'Expected trips generated. Conflicts: ' . $summary1['conflicts_prevented'] . ' Duplicates: ' . $summary1['duplicates_prevented']);

        $totalAfterFirst = Trip::count();

        // Second run (Idempotency test)
        $summary2 = $this->schedulingService->generateRealisticTimetable($startDate, 3, purgeUnbooked: false);
        $this->assertEquals(0, $summary2['trips_generated']);
        $this->assertGreaterThan(0, $summary2['duplicates_prevented']);
        $this->assertEquals($totalAfterFirst, Trip::count());
    }

    public function test_prune_duplicates_removes_unbooked_conflicts_and_preserves_booked_trips(): void
    {
        $tomorrow = Carbon::tomorrow()->setTime(8, 0);

        // Valid trip with driverA on assigned busA
        $validTrip = Trip::create([
            'route_id'        => $this->routeKJ->id,
            'bus_id'          => $this->busA->id,
            'driver_id'       => $this->driverA->id,
            'departure_time'  => $tomorrow,
            'arrival_time'    => $tomorrow->copy()->addMinutes(90),
            'fare'            => 12000,
            'status'          => 'scheduled',
            'available_seats' => 44,
        ]);

        // Duplicate trip on same slot with wrong driver (driverB is assigned to busB, not busA)
        $duplicateTrip = Trip::create([
            'route_id'        => $this->routeKJ->id,
            'bus_id'          => $this->busA->id,
            'driver_id'       => $this->driverB->id,
            'departure_time'  => $tomorrow,
            'arrival_time'    => $tomorrow->copy()->addMinutes(90),
            'fare'            => 12000,
            'status'          => 'scheduled',
            'available_seats' => 44,
        ]);

        // Conflicting trip on busA overlapping duration
        $overlappingTrip = Trip::create([
            'route_id'        => $this->routeKM->id,
            'bus_id'          => $this->busA->id,
            'driver_id'       => $this->driverA->id,
            'departure_time'  => $tomorrow->copy()->addMinutes(30),
            'arrival_time'    => $tomorrow->copy()->addMinutes(270),
            'fare'            => 30000,
            'status'          => 'scheduled',
            'available_seats' => 44,
        ]);

        $summary = $this->schedulingService->pruneDuplicateAndConflictingTrips();

        $this->assertGreaterThanOrEqual(2, $summary['unbooked_trips_pruned']);
        $this->assertTrue(Trip::where('id', $validTrip->id)->exists());
        $this->assertFalse(Trip::where('id', $duplicateTrip->id)->exists());
        $this->assertFalse(Trip::where('id', $overlappingTrip->id)->exists());
    }

    public function test_prune_duplicates_api_endpoint(): void
    {
        $tomorrow = Carbon::tomorrow()->setTime(9, 0);

        // Invalid trip: driverA assigned to busB
        Trip::create([
            'route_id'        => $this->routeKJ->id,
            'bus_id'          => $this->busB->id,
            'driver_id'       => $this->driverA->id,
            'departure_time'  => $tomorrow,
            'arrival_time'    => $tomorrow->copy()->addMinutes(90),
            'fare'            => 12000,
            'status'          => 'scheduled',
            'available_seats' => 44,
        ]);

        $response = $this->actingAs($this->adminUser)->postJson('/api/trips/prune-duplicates', [
            'dry_run' => false,
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'message',
            'summary' => [
                'total_inspected',
                'unbooked_trips_pruned',
                'exact_duplicates_removed',
                'assignment_conflicts_removed',
                'overlap_conflicts_removed',
                'location_conflicts_removed',
                'booked_trips_preserved',
            ],
        ]);
        $this->assertGreaterThanOrEqual(1, $response->json('summary.unbooked_trips_pruned'));
    }
}
