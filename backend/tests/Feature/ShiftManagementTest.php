<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Bus;
use App\Models\Driver;
use App\Models\Luggage;
use App\Models\Parcel;
use App\Models\Payment;
use App\Models\Role;
use App\Models\BusRoute;
use App\Models\Shift;
use App\Models\ShiftTransaction;
use App\Models\Terminal;
use App\Models\Ticket;
use App\Models\Trip;
use App\Models\TripSeat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShiftManagementTest extends TestCase
{
    protected User $cashier;
    protected User $supervisor;
    protected Terminal $terminal;
    protected Terminal $destTerminal;
    protected Trip $trip;
    protected TripSeat $seat1;
    protected TripSeat $seat2;

    protected function setUp(): void
    {
        parent::setUp();

        // Create or find staff and admin roles
        $staffRole = Role::firstOrCreate(['slug' => 'staff'], ['name' => 'Booking Clerk', 'slug' => 'staff', 'description' => 'Staff Member']);
        $adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'Administrator', 'slug' => 'admin', 'description' => 'System Admin']);

        $this->terminal = Terminal::firstOrCreate(
            ['name' => 'Central Terminal Kampala'],
            ['code' => 'KLA', 'city' => 'Kampala', 'address' => 'Namayiba Bus Park', 'is_active' => true]
        );

        $this->destTerminal = Terminal::firstOrCreate(
            ['name' => 'Mbarara Main Station'],
            ['code' => 'MBR', 'city' => 'Mbarara', 'address' => 'High Street', 'is_active' => true]
        );

        $this->cashier = User::factory()->create([
            'role_id' => $staffRole->id,
        ]);

        $this->supervisor = User::factory()->create([
            'role_id' => $adminRole->id,
        ]);

        $route = BusRoute::firstOrCreate(
            ['origin_terminal_id' => $this->terminal->id, 'destination_terminal_id' => $this->destTerminal->id],
            ['distance_km' => 270, 'estimated_duration_minutes' => 240, 'status' => 'active']
        );

        $bus = Bus::firstOrCreate(
            ['plate_number' => 'UBF 123X'],
            ['model' => 'Scania Cruiser 01', 'capacity' => 45, 'bus_type' => 'standard', 'status' => 'active']
        );

        $driverUser = User::factory()->create(['role_id' => $staffRole->id]);
        $driver = Driver::create([
            'user_id'          => $driverUser->id,
            'license_number'   => 'DL-' . strtoupper(uniqid()),
            'license_expiry'   => now()->addYears(2),
            'status'           => 'active',
            'experience_years' => 5,
        ]);

        $this->trip = Trip::create([
            'route_id'          => $route->id,
            'bus_id'            => $bus->id,
            'driver_id'         => $driver->id,
            'departure_time'    => now()->addHours(3),
            'arrival_time'      => now()->addHours(7),
            'fare'              => 30000,
            'status'            => 'scheduled',
            'available_seats'   => 45,
        ]);

        $this->seat1 = TripSeat::create([
            'trip_id'     => $this->trip->id,
            'seat_number' => '1A',
            'seat_class'  => 'standard',
            'status'      => 'available',
        ]);

        $this->seat2 = TripSeat::create([
            'trip_id'     => $this->trip->id,
            'seat_number' => '1B',
            'seat_class'  => 'standard',
            'status'      => 'available',
        ]);
    }

    /**
     * 1. Test cashier can open a shift with starting cash float.
     */
    public function test_cashier_can_open_shift_with_starting_float(): void
    {
        $response = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', [
                'starting_cash'   => 100000,
                'terminal_id'     => $this->terminal->id,
                'supervisor_name' => 'Station Manager Robert',
                'notes'           => 'Morning shift opening float',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('shift.starting_cash', 100000)
            ->assertJsonPath('shift.system_expected_cash', 100000)
            ->assertJsonPath('shift.status', 'open');

        $this->assertDatabaseHas('shifts', [
            'user_id'       => $this->cashier->id,
            'starting_cash' => 100000,
            'status'        => 'open',
        ]);

        $this->assertDatabaseHas('shift_transactions', [
            'user_id'        => $this->cashier->id,
            'type'           => 'float_in',
            'amount'         => 100000,
            'direction'      => 'inflow',
            'payment_method' => 'cash',
        ]);
    }

    /**
     * 2. Test cashier cannot open a duplicate shift while one is active.
     */
    public function test_cashier_cannot_open_duplicate_shift(): void
    {
        // Open first shift
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', ['starting_cash' => 50000]);

        // Attempt opening second shift
        $response = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', ['starting_cash' => 20000]);

        $response->assertStatus(400)
            ->assertJsonStructure(['message', 'shift']);
    }

    /**
     * 3. Test counter cash sale is blocked when cashier has no open shift.
     */
    public function test_cash_sale_requires_open_shift(): void
    {
        $response = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/bookings', [
                'trip_id'         => $this->trip->id,
                'seats'           => [
                    ['seat_id' => $this->seat1->id, 'passenger_name' => 'John Doe', 'passenger_phone' => '0770000001']
                ],
                'payment_method'  => 'cash',
                'is_counter_sale' => true,
            ]);

        $response->assertStatus(403);
    }

    /**
     * 4. Test digital payment (MTN MoMo) proceeds even without an open physical drawer.
     */
    public function test_digital_sale_allowed_without_open_shift(): void
    {
        $response = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/bookings', [
                'trip_id'         => $this->trip->id,
                'seats'           => [
                    ['seat_id' => $this->seat1->id, 'passenger_name' => 'Jane Doe', 'passenger_phone' => '0770000002']
                ],
                'payment_method'  => 'mtn_mobile_money',
                'is_counter_sale' => false,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('booking.payment_method', 'mtn_mobile_money');
    }

    /**
     * 5. Test cash ticket sale atomically posts to shift transactions ledger.
     */
    public function test_cash_booking_atomically_posts_to_shift_ledger(): void
    {
        // Open shift with 50,000 float
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', ['starting_cash' => 50000]);

        $shift = Shift::where('user_id', $this->cashier->id)->where('status', 'open')->first();

        // Process counter ticket sale (30,000 UGX)
        $response = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/bookings', [
                'trip_id'         => $this->trip->id,
                'seats'           => [
                    ['seat_id' => $this->seat2->id, 'passenger_name' => 'Alice Kato', 'passenger_phone' => '0770000003']
                ],
                'payment_method'  => 'cash',
                'is_counter_sale' => true,
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('shift_transactions', [
            'shift_id'       => $shift->id,
            'type'           => 'cash_sale_ticket',
            'amount'         => 30000,
            'direction'      => 'inflow',
            'payment_method' => 'cash',
        ]);

        // Expected cash = 50,000 float + 30,000 ticket = 80,000 UGX
        $this->assertEquals(80000, $shift->calculateExpectedCash());
    }

    /**
     * 6. Test cash excess luggage fee posts to shift ledger.
     */
    public function test_excess_luggage_cash_posts_to_shift_ledger(): void
    {
        // Open shift
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', ['starting_cash' => 50000]);

        $shift = Shift::where('user_id', $this->cashier->id)->where('status', 'open')->first();

        // Create booking
        $booking = Booking::create([
            'booking_number' => 'LB-TEST-LUG-' . strtoupper(uniqid()),
            'user_id'        => $this->cashier->id,
            'trip_id'        => $this->trip->id,
            'shift_id'       => $shift->id,
            'status'         => 'confirmed',
            'subtotal'       => 30000,
            'total_amount'   => 30000,
            'payment_method' => 'cash',
        ]);

        // Check in 28kg bag (8kg excess @ 2,000/kg = 16,000 UGX)
        $response = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/luggage', [
                'booking_id'     => $booking->id,
                'weight_kg'      => 28,
                'description'    => 'Large travel box',
                'payment_method' => 'cash',
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('shift_transactions', [
            'shift_id'       => $shift->id,
            'type'           => 'cash_fee_luggage',
            'amount'         => 16000,
            'direction'      => 'inflow',
            'payment_method' => 'cash',
        ]);

        // Expected cash = 50k (float) + 30k (ticket) + 16k (luggage) = 96,000 UGX
        $this->assertEquals(96000, $shift->calculateExpectedCash());
    }

    /**
     * 7. Test parcel cash fee posts to shift ledger.
     */
    public function test_parcel_cash_posts_to_shift_ledger(): void
    {
        // Open shift
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', ['starting_cash' => 50000]);

        $shift = Shift::where('user_id', $this->cashier->id)->where('status', 'open')->first();

        // Create 25,000 UGX parcel waybill
        $response = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/parcels', [
                'sender_name'             => 'James Mugerwa',
                'sender_phone'            => '0771112233',
                'recipient_name'          => 'Sarah Namubiru',
                'recipient_phone'         => '0774445566',
                'origin_terminal_id'      => $this->terminal->id,
                'destination_terminal_id' => $this->destTerminal->id,
                'weight_kg'               => 10,
                'price'                   => 25000,
                'payment_method'          => 'cash',
                'description'             => 'Sealed electronics carton',
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('shift_transactions', [
            'shift_id'       => $shift->id,
            'type'           => 'cash_fee_parcel',
            'amount'         => 25000,
            'direction'      => 'inflow',
            'payment_method' => 'cash',
        ]);

        // Expected cash = 50k (float) + 25k (parcel) = 75,000 UGX
        $this->assertEquals(75000, $shift->calculateExpectedCash());
    }

    /**
     * 8. Test petty expense and safe drop reduce physical expected cash.
     */
    public function test_petty_expense_and_safe_drop_reduce_expected_cash(): void
    {
        // Open shift with 100,000 UGX
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', ['starting_cash' => 100000]);

        $shift = Shift::where('user_id', $this->cashier->id)->where('status', 'open')->first();

        // 1. Log petty expense (15,000 UGX for POS receipt paper)
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/transactions', [
                'type'     => 'petty_expense',
                'amount'   => 15000,
                'category' => 'Supplies',
                'reason'   => 'Purchased thermal receipt paper',
            ])->assertStatus(201);

        // Expected cash = 100,000 - 15,000 = 85,000 UGX
        $this->assertEquals(85000, $shift->calculateExpectedCash());

        // 2. Log safe drop (50,000 UGX transfer to terminal vault)
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/transactions', [
                'type'     => 'safe_drop',
                'amount'   => 50000,
                'category' => 'Safe Deposit',
                'reason'   => 'Mid-shift vault transfer',
            ])->assertStatus(201);

        // Expected cash = 85,000 - 50,000 = 35,000 UGX
        $this->assertEquals(35000, $shift->calculateExpectedCash());
    }

    /**
     * 9. Test overdraft guard prevents cash withdrawals exceeding drawer balance.
     */
    public function test_overdraft_guard_prevents_excessive_cash_withdrawals(): void
    {
        // Open shift with 20,000 UGX
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', ['starting_cash' => 20000]);

        // Attempt withdrawing 50,000 UGX
        $response = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/transactions', [
                'type'     => 'petty_expense',
                'amount'   => 50000,
                'category' => 'Fuel Advance',
                'reason'   => 'Driver fuel advance',
            ]);

        $response->assertStatus(422)
            ->assertJsonStructure(['message']);
    }

    /**
     * 10. Test digital payments are excluded from physical drawer balance.
     */
    public function test_digital_payments_excluded_from_physical_cash_balance(): void
    {
        // Open shift with 50,000 float
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', ['starting_cash' => 50000]);

        $shift = Shift::where('user_id', $this->cashier->id)->where('status', 'open')->first();

        // Create MoMo booking (60,000 UGX)
        Booking::create([
            'booking_number' => 'LB-TEST-MOMO-' . strtoupper(uniqid()),
            'user_id'        => $this->cashier->id,
            'trip_id'        => $this->trip->id,
            'shift_id'       => $shift->id,
            'status'         => 'confirmed',
            'subtotal'       => 60000,
            'total_amount'   => 60000,
            'payment_method' => 'mtn_mobile_money',
        ]);

        $metrics = $shift->getLiveMetrics();

        // MoMo total = 60,000
        $this->assertEquals(60000, $metrics['system_expected_momo']);
        // Physical till cash must remain strictly 50,000 (only opening float)
        $this->assertEquals(50000, $metrics['system_expected_cash']);
        // Gross revenue = 110,000 (50k physical + 60k digital)
        $this->assertEquals(110000, $metrics['system_expected_total']);
    }

    /**
     * 11. Test shift closeout calculates variance and mandates reason when mismatched.
     */
    public function test_shift_closeout_calculates_variance_and_requires_reason(): void
    {
        // Open shift with 50,000 float
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', ['starting_cash' => 50000]);

        // Attempt closing with 45,000 (deficit of 5,000) WITHOUT variance reason
        $failResponse = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/close', [
                'actual_cash'   => 45000,
                'denominations' => ['notes_20k' => 2, 'notes_5k' => 1],
            ]);

        $failResponse->assertStatus(422)
            ->assertJsonValidationErrors(['variance_reason']);

        // Close WITH variance reason
        $passResponse = $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/close', [
                'actual_cash'     => 45000,
                'variance_reason' => 'Passenger short-change discrepancy',
                'closing_notes'   => 'Closeout completed',
                'denominations'   => ['notes_20k' => 2, 'notes_5k' => 1],
            ]);

        $passResponse->assertStatus(200)
            ->assertJsonPath('shift.status', 'closed')
            ->assertJsonPath('shift.difference', -5000)
            ->assertJsonPath('shift.actual_counted_cash', 45000);
    }

    /**
     * 12. Test supervisor reopen action and audit record.
     */
    public function test_supervisor_can_reopen_closed_shift_with_audit_log(): void
    {
        // Open and close shift
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/open', ['starting_cash' => 50000]);

        $this->actingAs($this->cashier, 'sanctum')
            ->postJson('/api/shifts/close', [
                'actual_cash'   => 50000,
                'denominations' => ['notes_50k' => 1],
            ]);

        $shift = Shift::where('user_id', $this->cashier->id)->latest()->first();
        $this->assertEquals('closed', $shift->status);

        // Cashier cannot reopen own shift
        $this->actingAs($this->cashier, 'sanctum')
            ->postJson("/api/shifts/{$shift->id}/reopen", [
                'reason' => 'Authorized shift reopen',
            ])->assertStatus(403);

        // Supervisor can reopen with audit reason
        $response = $this->actingAs($this->supervisor, 'sanctum')
            ->postJson("/api/shifts/{$shift->id}/reopen", [
                'reason' => 'Late parcel cash collection required before final audit',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('shift.status', 'open');

        $this->assertDatabaseHas('shift_transactions', [
            'shift_id' => $shift->id,
            'type'     => 'adjustment',
            'category' => 'Shift Reopened',
        ]);
    }

    /**
     * 13. Test idempotency key prevents duplicate transaction postings.
     */
    public function test_idempotency_prevents_duplicate_ledger_postings(): void
    {
        $shift = Shift::create([
            'shift_code'    => 'SHF-IDEMP-' . strtoupper(uniqid()),
            'user_id'       => $this->cashier->id,
            'terminal_id'   => $this->terminal->id,
            'starting_cash' => 10000,
            'status'        => 'open',
            'opened_at'     => now(),
        ]);

        $data = [
            'user_id'         => $this->cashier->id,
            'type'            => 'cash_sale_ticket',
            'amount'          => 20000,
            'direction'       => 'inflow',
            'payment_method'  => 'cash',
            'category'        => 'Ticket Sale',
            'reason'          => 'Test ticket sale',
            'idempotency_key' => 'idemp-tx-12345',
        ];

        $tx1 = ShiftTransaction::recordEvent($shift, $data);
        $tx2 = ShiftTransaction::recordEvent($shift, $data);

        $this->assertEquals($tx1->id, $tx2->id);
        $this->assertEquals(1, ShiftTransaction::where('idempotency_key', 'idemp-tx-12345')->count());
    }
}
