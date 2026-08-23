<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Terminal extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'city', 'address', 'latitude', 'longitude', 'status', 'photo'];

    protected function casts(): array
    {
        return [
            'latitude'  => 'float',
            'longitude' => 'float',
        ];
    }

    public function originRoutes(): HasMany
    {
        return $this->hasMany(BusRoute::class, 'origin_terminal_id');
    }

    public function destinationRoutes(): HasMany
    {
        return $this->hasMany(BusRoute::class, 'destination_terminal_id');
    }
}
