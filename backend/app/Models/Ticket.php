<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'trip_seat_id',
        'passenger_name',
        'passenger_phone',
        'ticket_number',
        'qr_code',
        'status',
        'boarded_at',
    ];

    protected function casts(): array
    {
        return [
            'boarded_at' => 'datetime',
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

    public static function generateTicketNumber(): string
    {
        return 'TKT-' . strtoupper(substr(uniqid('', true), -8));
    }
}
