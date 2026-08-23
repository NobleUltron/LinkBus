<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BusRoute extends Model
{
    use HasFactory;

    protected $table = 'bus_routes';

    protected $fillable = [
        'origin_terminal_id',
        'destination_terminal_id',
        'distance_km',
        'estimated_duration_minutes',
        'status',
    ];

    public function originTerminal(): BelongsTo
    {
        return $this->belongsTo(Terminal::class, 'origin_terminal_id');
    }

    public function destinationTerminal(): BelongsTo
    {
        return $this->belongsTo(Terminal::class, 'destination_terminal_id');
    }

    public function trips(): HasMany
    {
        return $this->hasMany(Trip::class, 'route_id');
    }
}
