<?php

namespace App\Console\Commands;

use App\Services\TripSchedulingService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateTrips extends Command
{
    protected $signature = 'trips:generate {days=30 : Number of future days to schedule} {--purge-unbooked : Purge unbooked legacy/duplicate trips in date range before generating} {--dry-run : Simulate generation without persisting to DB}';
    protected $description = 'Generate realistic scheduled departures across all active routes for the specified number of days using conflict-free corridor circuits.';

    public function handle(TripSchedulingService $schedulingService): int
    {
        $days = (int) $this->argument('days');
        $purgeUnbooked = (bool) $this->option('purge-unbooked');
        $dryRun = (bool) $this->option('dry-run');
        $startDate = Carbon::today();

        $this->info("Scheduling {$days} days of trips starting {$startDate->format('d M Y')} (Purge unbooked: " . ($purgeUnbooked ? 'YES' : 'NO') . ", Dry run: " . ($dryRun ? 'YES' : 'NO') . ")...");

        $summary = $schedulingService->generateRealisticTimetable($startDate, $days, $purgeUnbooked, $dryRun);

        $this->newLine();
        $this->info("══════════════════════════════════════════════════════════");
        $this->info("          LINKBUS REALISTIC FLEET TIMETABLE SUMMARY       ");
        $this->info("══════════════════════════════════════════════════════════");
        $this->line("• Date Range:          {$summary['start_date']} → {$summary['end_date']} ({$summary['days']} days)");
        $this->line("• Unbooked Purged:     {$summary['unbooked_purged']}");
        $this->line("• Trips Generated:     {$summary['trips_generated']}");
        $this->line("• Coaches Used:        {$summary['coaches_used_count']} (" . implode(', ', $summary['coaches_used']) . ")");
        $this->line("• Drivers Assigned:    {$summary['drivers_used_count']} (" . implode(', ', $summary['drivers_used']) . ")");
        $this->line("• Duplicates Blocked:  {$summary['duplicates_prevented']}");
        $this->line("• Conflicts Blocked:   {$summary['conflicts_prevented']}");
        $this->newLine();
        $this->info("Corridor Service Breakdown:");
        foreach ($summary['corridors_served'] as $corridor => $count) {
            $this->line("  - " . str_pad($corridor, 40) . ": {$count} departures");
        }
        $this->info("══════════════════════════════════════════════════════════");

        return Command::SUCCESS;
    }
}
