<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_number',
        'user_id',
        'trip_id',
        'status',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'payment_method',
        'promo_code',
        'linked_booking_id',
        'cancellation_fee',
        'cancelled_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'cancelled_at'      => 'datetime',
            'subtotal'          => 'integer',
            'discount_amount'   => 'integer',
            'tax_amount'        => 'integer',
            'total_amount'      => 'integer',
            'cancellation_fee'  => 'integer',
        ];
    }

    // ─── Relationships ───────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function luggage(): HasMany
    {
        return $this->hasMany(Luggage::class);
    }

    public function linkedBooking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'linked_booking_id');
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    public static function generateBookingNumber(): string
    {
        $d = now();
        $stamp = $d->format('ymd');
        // Use a high random suffix to avoid collisions
        $serial = strtoupper(substr(uniqid(), -6));
        return "LB-{$stamp}-{$serial}";
    }
}
