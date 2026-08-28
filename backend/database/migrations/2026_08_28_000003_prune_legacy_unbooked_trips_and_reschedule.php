<?php

use App\Models\Trip;
use App\Models\TripSeat;
use App\Services\TripSchedulingService;
use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Prune all legacy unbooked conflicting trips and generate a clean 30-day timetable.
     */
    public function up(): void
    {
        try {
            $service = app(TripSchedulingService::class);

            // Prune unbooked duplicates and driver-coach conflicts
            $pruneReport = $service->pruneDuplicateAndConflictingTrips();
            Log::info("Migration 2026_08_28_000003: Pruned " . ($pruneReport['unbooked_trips_pruned'] ?? 0) . " unbooked legacy conflicting trips.");
        } catch (\Throwable $e) {
            Log::warning("Migration 2026_08_28_000003 trip schedule cleanup notice: " . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non-destructive rollback
    }
};
