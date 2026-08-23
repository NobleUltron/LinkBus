<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeatLock extends Model
{
    protected $table = 'seat_locks';

    protected $fillable = ['user_id', 'trip_id', 'seat_id', 'expires_at'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function seat(): BelongsTo
    {
        return $this->belongsTo(TripSeat::class, 'seat_id');
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
