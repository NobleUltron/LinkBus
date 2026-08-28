<?php

namespace App\Console\Commands;

use App\Services\TripSchedulingService;
use Illuminate\Console\Command;

class PruneTripDuplicates extends Command
{
    protected $signature = 'trips:prune {--dry-run : Simulate pruning without deleting records}';
    protected $description = 'Prune all unbooked duplicate departures and operational conflicts while preserving booked passenger reservations.';

    public function handle(TripSchedulingService $schedulingService): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $this->info("Scanning upcoming departures for duplicates and operational conflicts (Dry run: " . ($dryRun ? 'YES' : 'NO') . ")...");

        $summary = $schedulingService->pruneDuplicateAndConflictingTrips($dryRun);

        $this->newLine();
        $this->info("══════════════════════════════════════════════════════════");
        $this->info("             TRIP PRUNING & DEDUPLICATION SUMMARY          ");
        $this->info("══════════════════════════════════════════════════════════");
        $this->line("• Total Inspected:             {$summary['total_inspected']}");
        $this->line("• Unbooked Trips Pruned:       {$summary['unbooked_trips_pruned']}");
        $this->line("  - Exact Duplicate Slots:     {$summary['exact_duplicates_removed']}");
        $this->line("  - Driver/Coach Conflicts:    {$summary['assignment_conflicts_removed']}");
        $this->line("  - Time Overlap Conflicts:    {$summary['overlap_conflicts_removed']}");
        $this->line("  - Location Mismatches:       {$summary['location_conflicts_removed']}");
        $this->line("• Booked Passenger Trips Kept: {$summary['booked_trips_preserved']} (100% Protected)");
        $this->info("══════════════════════════════════════════════════════════");

        return Command::SUCCESS;
    }
}
