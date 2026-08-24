<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\BusController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\LuggageController;
use App\Http\Controllers\Api\NewsletterSubscriberController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ParcelController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\RouteController;
use App\Http\Controllers\Api\TerminalController;
use App\Http\Controllers\Api\TripController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ── Public routes ─────────────────────────────────────────────────────

Route::post('/auth/register',        [AuthController::class, 'register']);
Route::post('/auth/login',           [AuthController::class, 'login']);
Route::get('/login',                 fn() => response()->json(['message' => 'Unauthenticated.'], 401))->name('login');
Route::post('/auth/2fa/verify',      [AuthController::class, 'verify2fa']);
Route::post('/auth/2fa/resend',      [AuthController::class, 'resend2fa']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password',  [AuthController::class, 'resetPassword']);
Route::post('/auth/social-login',    [AuthController::class, 'socialLogin']);
Route::post('/auth/google',          [GoogleAuthController::class, 'authenticate']);
Route::get('/parcels/track',         [\App\Http\Controllers\Api\ParcelController::class, 'track']);
Route::get('/track',                 [\App\Http\Controllers\Api\ParcelController::class, 'track']);

// System Health & Telemetry Check (public/admin)
Route::get('/health', function () {
    $start = microtime(true);
    $dbOk = false;
    $dbLatency = 0;
    try {
        \Illuminate\Support\Facades\DB::select('SELECT 1');
        $dbLatency = round((microtime(true) - $start) * 1000, 2);
        $dbOk = true;
    } catch (\Throwable $e) {
        $dbOk = false;
    }

    $storageLinked = is_dir(public_path('storage')) || file_exists(public_path('storage'));

    return response()->json([
        'status'          => $dbOk ? 'healthy' : 'degraded',
        'timestamp'       => now()->toIso8601String(),
        'environment'     => app()->environment(),
        'php_version'     => PHP_VERSION,
        'laravel_version' => app()->version(),
        'database'        => [
            'connected'  => $dbOk,
            'latency_ms' => $dbLatency,
            'driver'     => config('database.default'),
            'database'   => config('database.connections.mysql.database'),
        ],
        'storage'         => [
            'public_link' => $storageLinked,
            'writable'    => is_writable(storage_path('app/public')),
        ],
        'telemetry'       => [
            'terminals'    => \App\Models\Terminal::count(),
            'routes'       => \App\Models\BusRoute::count(),
            'active_buses' => \App\Models\Bus::where('status', 'active')->count(),
            'trips_today'  => \App\Models\Trip::whereDate('departure_time', now()->toDateString())->count(),
        ],
    ]);
});

// Newsletter & Fare Alerts Subscription (public)
Route::post('/newsletter/subscribe', [NewsletterSubscriberController::class, 'subscribe']);

// Parcel tracking (public)
Route::get('/parcels/track', [ParcelController::class, 'track']);

// Reference & Lookup routes (public read)
Route::get('/settings',           [AdminController::class, 'getPublicSettings']);
Route::get('/roles',              [RoleController::class, 'index']);
Route::get('/terminals',          [TerminalController::class, 'index']);
Route::get('/routes',             [RouteController::class, 'index']);
Route::get('/buses',              [BusController::class, 'index']);
Route::get('/drivers',            [DriverController::class, 'index']);
Route::get('/drivers/{driver}',   [DriverController::class, 'show']);

// Trips (public search & seat lookup)
Route::get('/trips',                  [TripController::class, 'index']);
Route::get('/trips/search',           [TripController::class, 'search']);
Route::get('/trips/check-conflicts',  [TripController::class, 'checkConflicts']);
Route::get('/trips/{trip}',           [TripController::class, 'show']);
Route::get('/trips/{trip}/seats',     [TripController::class, 'seats']);
Route::get('/trips/{trip}/manifest',  [TripController::class, 'manifest']);
Route::post('/trips/{trip}/board-passenger', [TripController::class, 'boardPassenger']);

// ── Authenticated routes ──────────────────────────────────────────────

Route::middleware('auth:sanctum')->group(function () {

    // ── Auth ─────────────────────────────────────────────────────────
    Route::get('/auth/me',              [AuthController::class, 'me']);
    Route::post('/auth/logout',         [AuthController::class, 'logout']);
    Route::get('/auth/user',            [AuthController::class, 'user']);
    Route::put('/auth/profile',         [AuthController::class, 'updateProfile']);
    Route::put('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::post('/auth/2fa/toggle',     [AuthController::class, 'toggle2fa']);

    // ── Roles (Read authenticated, mutation admin only) ──────────────
    Route::get('/roles/{role}',   [RoleController::class, 'show']);

    // ── Notifications (In-App) ───────────────────────────────────────
    Route::get('/notifications',           [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read',[NotificationController::class, 'markRead']);
    Route::delete('/notifications',        [NotificationController::class, 'clearAll']);
    Route::delete('/notifications/{id}',   [NotificationController::class, 'destroy']);

    // ── Passenger & Universal Booking Operations ─────────────────────
    Route::get('/bookings',                          [BookingController::class, 'index']);
    Route::post('/bookings',                         [BookingController::class, 'store']);
    Route::get('/bookings/{booking}',                [BookingController::class, 'show']);
    Route::get('/bookings/{booking}/whatsapp-share', [BookingController::class, 'getWhatsappShare']);
    Route::post('/bookings/{booking}/whatsapp-resend',[BookingController::class, 'resendWhatsapp']);
    Route::post('/bookings/{booking}/cancel',        [BookingController::class, 'cancel']);
    Route::post('/bookings/lock-seat',               [BookingController::class, 'lockSeat']);
    Route::post('/bookings/unlock-seat',             [BookingController::class, 'unlockSeat']);
    Route::post('/bookings/validate-promo',          [BookingController::class, 'validatePromo']);
    Route::post('/payments/verify-momo',             [BookingController::class, 'verifyMomo']);
    Route::get('/tickets/verify',                    [BookingController::class, 'verifyTicket']);

    // ── Read operations for Luggage & Parcels ────────────────────────
    Route::get('/luggage',                           [LuggageController::class, 'index']);
    Route::get('/luggage/lookup',                    [LuggageController::class, 'lookup']);
    Route::get('/parcels',                           [ParcelController::class, 'index']);

    // ── Operations: Driver / Staff / Admin ───────────────────────────
    Route::middleware('role:admin,staff,driver')->group(function () {
        Route::get('/trips/{trip}/manifest',         [TripController::class, 'manifest']);
        Route::post('/trips/{trip}/board-passenger', [TripController::class, 'boardPassenger']);
        Route::put('/trips/{trip}',                  [TripController::class, 'update']);
        Route::post('/bookings/board-passenger',     [BookingController::class, 'boardPassenger']);
    });

    // ── Counter Operations: Staff / Admin only ───────────────────────
    Route::middleware('role:admin,staff')->group(function () {
        // Cash payment collection desk
        Route::post('/bookings/{booking}/confirm-payment', [BookingController::class, 'confirmPayment']);

        // Luggage & Cargo desks
        Route::post('/luggage',            [LuggageController::class, 'store']);
        Route::put('/luggage/{luggage}',   [LuggageController::class, 'update']);
        Route::post('/parcels',           [ParcelController::class, 'store']);
        Route::put('/parcels/{parcel}',   [ParcelController::class, 'update']);

        // Fleet management
        Route::post('/buses',         [BusController::class, 'store']);
        Route::put('/buses/{bus}',    [BusController::class, 'update']);
        Route::delete('/buses/{bus}', [BusController::class, 'destroy']);

        // Drivers roster
        Route::post('/drivers',           [DriverController::class, 'store']);
        Route::put('/drivers/{driver}',   [DriverController::class, 'update']);

        // Route network
        Route::post('/routes',          [RouteController::class, 'store']);
        Route::put('/routes/{route}',   [RouteController::class, 'update']);
        Route::delete('/routes/{route}',[RouteController::class, 'destroy']);

        // Terminals
        Route::post('/terminals',               [TerminalController::class, 'store']);
        Route::put('/terminals/{terminal}',     [TerminalController::class, 'update']);
        Route::delete('/terminals/{terminal}',  [TerminalController::class, 'destroy']);

        // Trips scheduling
        Route::get('/trips/check-conflicts',    [TripController::class, 'checkConflicts']);
        Route::post('/trips',                   [TripController::class, 'store']);

        // Reports & analytics
        Route::get('/reports/dashboard',            [ReportController::class, 'dashboard']);
        Route::get('/reports/revenue',              [ReportController::class, 'revenue']);
        Route::get('/reports/revenue/export/excel', [ReportController::class, 'exportExcel']);
        Route::get('/reports/bookings',             [ReportController::class, 'bookings']);
        Route::get('/reports/trip-occupancy',       [ReportController::class, 'tripOccupancy']);

        // Financial Ledger Settlements & Reconciliations
        Route::get('/admin/payments',          [AdminController::class, 'payments']);
    });

    // ── Executive Super Admin only ────────────────────────────────────
    Route::middleware('role:admin')->group(function () {
        // RBAC Security Roles
        Route::post('/roles',                  [RoleController::class, 'store']);
        Route::put('/roles/{role}',            [RoleController::class, 'update']);
        Route::delete('/roles/{role}',         [RoleController::class, 'destroy']);

        // System Settings & Branding
        Route::get('/admin/settings',          [AdminController::class, 'getSettings']);
        Route::put('/admin/settings',          [AdminController::class, 'updateSettings']);

        // User Account Management
        Route::get('/admin/users',             [AdminController::class, 'users']);
        Route::post('/admin/users',            [AdminController::class, 'storeUser']);
        Route::put('/admin/users/{user}',      [AdminController::class, 'updateUser']);
        Route::delete('/admin/users/{user}',   [AdminController::class, 'deleteUser']);

        // Promo Vouchers & Marketing Campaigns
        Route::get('/admin/promo-codes',               [AdminController::class, 'promoCodes']);
        Route::post('/admin/promo-codes',              [AdminController::class, 'storePromoCode']);
        Route::put('/admin/promo-codes/{promoCode}',   [AdminController::class, 'updatePromoCode']);
        Route::get('/admin/advertisements',            [AdminController::class, 'advertisements']);
        Route::post('/admin/advertisements',           [AdminController::class, 'storeAdvertisement']);

        // Notifications Gateway Management & Dispatch Testing
        Route::get('/admin/notifications/logs',          [NotificationController::class, 'logs']);
        Route::post('/admin/notifications/broadcast',    [NotificationController::class, 'broadcast']);
        Route::post('/admin/notifications/test-sms',     [NotificationController::class, 'testSms']);
        Route::post('/admin/notifications/test-email',   [NotificationController::class, 'testEmail']);
        Route::post('/admin/notifications/test-whatsapp',[NotificationController::class, 'testWhatsapp']);

        // Route & Fare Alerts Newsletter Subscribers
        Route::get('/admin/newsletter-subscribers',           [NewsletterSubscriberController::class, 'index']);
        Route::post('/admin/newsletter-subscribers/broadcast',[NewsletterSubscriberController::class, 'broadcast']);
        Route::delete('/admin/newsletter-subscribers/{id}',   [NewsletterSubscriberController::class, 'destroy']);

        // Immutable Audit Trail Logs
        Route::get('/admin/audit-logs',                        [AdminController::class, 'auditLogs']);

        // Financial Ledger Settlements & Reconciliations
        Route::put('/admin/payments/{id}/status',              [AdminController::class, 'updatePaymentStatus']);
    });
});
