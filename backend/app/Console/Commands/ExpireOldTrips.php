<?php

namespace App\Console\Commands;

use App\Models\Trip;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ExpireOldTrips extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'trips:expire
                            {--dry-run : Preview what would be updated without making changes}
                            {--hours=2 : Mark trips as completed if arrival is this many hours in the past}';

    /**
     * The console command description.
     */
    protected $description = 'Auto-expire scheduled/boarding trips whose departure time has passed, marking them as completed or in_transit.';

    public function handle(): int
    {
        $dryRun       = $this->option('dry-run');
        $gracePeriod  = (int) $this->option('hours');
        $cutoff       = Carbon::now()->subHours($gracePeriod);

        $this->info("Running trip expiry (cutoff: arrival before {$cutoff->toDateTimeString()})...");
        if ($dryRun) {
            $this->warn('DRY RUN — no changes will be made.');
        }

        // ── 1. Mark as "completed" trips whose arrival time has passed ──────────
        $completedQuery = Trip::whereIn('status', ['scheduled', 'boarding', 'in_transit'])
            ->where('arrival_time', '<', $cutoff);

        $completedCount = $completedQuery->count();

        if (!$dryRun && $completedCount > 0) {
            $completedQuery->update(['status' => 'completed']);
        }

        $this->line("  ✔ Marked <fg=green>{$completedCount}</> trips as <fg=green>completed</> (arrival before {$cutoff->toDateTimeString()})");

        // ── 2. Mark as "in_transit" trips that have departed but not yet arrived ─
        $inTransitQuery = Trip::where('status', 'boarding')
            ->where('departure_time', '<', now())
            ->where('arrival_time', '>=', now());

        $inTransitCount = $inTransitQuery->count();

        if (!$dryRun && $inTransitCount > 0) {
            $inTransitQuery->update(['status' => 'in_transit']);
        }

        $this->line("  ✔ Marked <fg=yellow>{$inTransitCount}</> trips as <fg=yellow>in_transit</> (departed, not yet arrived)");

        // ── 3. Summary ──────────────────────────────────────────────────────────
        $remaining = Trip::whereIn('status', ['scheduled', 'boarding'])->count();
        $this->newLine();
        $this->info("Done! Active scheduled/boarding trips remaining: {$remaining}");

        return Command::SUCCESS;
    }
}
