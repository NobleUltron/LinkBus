<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Luggage extends Model
{
    protected $table = 'luggage';

    protected $fillable = [
        'booking_id',
        'trip_seat_id',
        'tag_number',
        'description',
        'weight_kg',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'weight_kg' => 'float',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function seat(): BelongsTo
    {
        return $this->belongsTo(TripSeat::class, 'trip_seat_id');
    }

    public static function generateTagNumber(): string
    {
        return 'LUG-' . strtoupper(substr(uniqid(), -8));
    }
}
