<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Production Scheduler: Auto-release expired 10-min seat locks every minute
\Illuminate\Support\Facades\Schedule::call(function () {
    \App\Models\SeatLock::where('expires_at', '<', now())->delete();
})->everyMinute()->name('cleanup-expired-seat-locks');
