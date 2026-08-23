<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TripSeat extends Model
{
    use HasFactory;

    protected $table = 'trip_seats';

    protected $fillable = ['trip_id', 'seat_number', 'seat_class', 'status'];

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function ticket(): HasOne
    {
        return $this->hasOne(Ticket::class, 'trip_seat_id');
    }

    public function seatLock(): HasOne
    {
        return $this->hasOne(SeatLock::class, 'seat_id');
    }

    public function luggage(): HasMany
    {
        return $this->hasMany(Luggage::class, 'trip_seat_id');
    }
}
