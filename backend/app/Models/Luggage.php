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
        'shift_id',
        'tag_number',
        'description',
        'weight_kg',
        'payment_method',
        'price',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'weight_kg' => 'float',
            'price'     => 'integer',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
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
