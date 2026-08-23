<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Parcel extends Model
{
    protected $fillable = [
        'sender_name', 'sender_phone', 'recipient_name', 'recipient_phone',
        'origin_terminal_id', 'destination_terminal_id',
        'weight_kg', 'description', 'tracking_number', 'status', 'price', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'weight_kg' => 'float',
            'price'     => 'integer',
        ];
    }

    public function originTerminal(): BelongsTo
    {
        return $this->belongsTo(Terminal::class, 'origin_terminal_id');
    }

    public function destinationTerminal(): BelongsTo
    {
        return $this->belongsTo(Terminal::class, 'destination_terminal_id');
    }

    public static function generateTrackingNumber(): string
    {
        return 'PCL-' . strtoupper(substr(uniqid(), -9));
    }
}
