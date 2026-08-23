<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Trip extends Model
{
    use HasFactory;

    protected $fillable = [
        'route_id',
        'bus_id',
        'driver_id',
        'departure_time',
        'arrival_time',
        'fare',
        'status',
        'available_seats',
    ];

    protected function casts(): array
    {
        return [
            'departure_time'  => 'datetime',
            'arrival_time'    => 'datetime',
            'fare'            => 'integer',
            'available_seats' => 'integer',
        ];
    }

    // ─── Relationships ───────────────────────────────────────────────

    public function route(): BelongsTo
    {
        return $this->belongsTo(BusRoute::class, 'route_id');
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function seats(): HasMany
    {
        return $this->hasMany(TripSeat::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    // ─── Scopes ──────────────────────────────────────────────────────

    public function scopeUpcoming($query)
    {
        return $query->where('departure_time', '>', now())
                     ->where('status', '!=', 'cancelled');
    }

    public function scopeForRoute($query, int $originId, int $destinationId)
    {
        return $query->whereHas('route', function ($q) use ($originId, $destinationId) {
            $q->where('origin_terminal_id', $originId)
              ->where('destination_terminal_id', $destinationId);
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    public function recomputeAvailableSeats(): void
    {
        $this->available_seats = $this->seats()->where('status', 'available')->count();
        $this->saveQuietly();
    }
}
