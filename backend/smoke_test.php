<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "========================================================\n";
echo "        LINKBUS SYSTEM DEPLOYMENT SMOKE TEST            \n";
echo "========================================================\n\n";

$passes = 0;
$fails = 0;

function check(string $name, callable $fn) {
    global $passes, $fails;
    try {
        $result = $fn();
        if ($result !== false) {
            echo "  [PASS] {$name}\n";
            $passes++;
        } else {
            echo "  [FAIL] {$name}\n";
            $fails++;
        }
    } catch (\Throwable $e) {
        echo "  [FAIL] {$name} - Exception: " . $e->getMessage() . "\n";
        $fails++;
    }
}

// 1. Database & Core Records
check("Database Connection & Counts", function() {
    $users = \App\Models\User::count();
    $trips = \App\Models\Trip::count();
    $bookings = \App\Models\Booking::count();
    $tickets = \App\Models\Ticket::count();
    $payments = \App\Models\Payment::count();
    $buses = \App\Models\Bus::count();
    $routes = \App\Models\BusRoute::count();
    $terminals = \App\Models\Terminal::count();
    $parcels = \App\Models\Parcel::count();
    $luggage = \App\Models\Luggage::count();

    echo "         • Users: {$users} | Trips: {$trips} | Bookings: {$bookings} | Tickets: {$tickets}\n";
    echo "         • Payments: {$payments} | Buses: {$buses} | Routes: {$routes} | Terminals: {$terminals}\n";
    echo "         • Parcels: {$parcels} | Luggage: {$luggage}\n";
    return $users > 0 && $trips > 0;
});

// 2. Roles & Permissions Check
check("RBAC Roles Verification", function() {
    $roles = \App\Models\Role::pluck('slug')->toArray();
    echo "         • Registered Roles: " . implode(', ', $roles) . "\n";
    return in_array('admin', $roles) && in_array('driver', $roles) && in_array('passenger', $roles);
});

// 3. Trips Search API
check("Public Trips Search API Endpoint", function() {
    $tripsCtrl = app(\App\Http\Controllers\Api\TripController::class);
    $req = \Illuminate\Http\Request::create('/api/trips/search', 'GET');
    $res = $tripsCtrl->search($req);
    return $res->status() === 200;
});

// 4. Ticket Direct Verification API
check("Ticket Verification (Direct Fast-Lookup)", function() {
    $ticket = \App\Models\Ticket::first();
    if (!$ticket) return false;
    $bookingsCtrl = app(\App\Http\Controllers\Api\BookingController::class);
    $req = \Illuminate\Http\Request::create('/api/tickets/verify?code=' . $ticket->ticket_number, 'GET');
    $res = $bookingsCtrl->verifyTicket($req);
    return $res->status() === 200;
});

// 5. Driver Manifest API
check("Driver Manifest & Cockpit Dispatch", function() {
    $trip = \App\Models\Trip::first();
    if (!$trip) return false;
    $tripsCtrl = app(\App\Http\Controllers\Api\TripController::class);
    $res = $tripsCtrl->manifest($trip);
    return $res->status() === 200;
});

// 6. Luggage & Cargo Subsystems
check("Luggage & Excess Calculation API", function() {
    $luggageCtrl = app(\App\Http\Controllers\Api\LuggageController::class);
    $req = \Illuminate\Http\Request::create('/api/luggage', 'GET');
    $res = $luggageCtrl->index($req);
    return $res->status() === 200;
});

check("Parcel & Freight Waybills API", function() {
    $parcelCtrl = app(\App\Http\Controllers\Api\ParcelController::class);
    $req = \Illuminate\Http\Request::create('/api/parcels', 'GET');
    $res = $parcelCtrl->index($req);
    return $res->status() === 200;
});

// 7. Reports & Analytics Subsystem
check("Executive Analytics & Financial Reports API", function() {
    $reportCtrl = app(\App\Http\Controllers\Api\ReportController::class);
    $req = \Illuminate\Http\Request::create('/api/reports/dashboard', 'GET');
    $res = $reportCtrl->dashboard($req);
    return $res->status() === 200;
});

// 8. Excel Revenue Export Integrity
check("Excel (.xlsx / XML) Revenue Export Integrity", function() {
    $reportCtrl = app(\App\Http\Controllers\Api\ReportController::class);
    $req = \Illuminate\Http\Request::create('/api/reports/revenue/export/excel', 'GET');
    $res = $reportCtrl->exportExcel($req);
    return $res->getStatusCode() === 200 && str_contains($res->headers->get('content-type', ''), 'spreadsheetml');
});

// 9. Multi-Channel Messaging & WhatsApp Service
check("WhatsApp & Notification Dispatch Service", function() {
    $waService = app(\App\Services\WhatsAppService::class);
    $booking = \App\Models\Booking::with(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'trip.bus', 'tickets.seat', 'user'])->first();
    if (!$booking) return false;
    $text = $waService->buildBookingConfirmationText($booking);
    return !empty($text) && str_contains($text, 'LINKBUS UGANDA');
});

echo "\n--------------------------------------------------------\n";
echo "  RESULTS: {$passes} Passed | {$fails} Failed\n";
echo "========================================================\n";
