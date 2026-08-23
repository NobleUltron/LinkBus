<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'google_id',
        'phone',
        'avatar',
        'role_id',
        'is_active',
        'password',
        'two_factor_enabled',
        'two_factor_code',
        'two_factor_expires_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_code',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'   => 'datetime',
            'password'            => 'hashed',
            'is_active'           => 'boolean',
            'two_factor_enabled'  => 'boolean',
            'two_factor_expires_at' => 'datetime',
        ];
    }

    // ─── Relationships ───────────────────────────────────────────────

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function driver(): HasOne
    {
        return $this->hasOne(Driver::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(AppNotification::class);
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    public function getRoleSlugAttribute(): string
    {
        return $this->role?->slug ?? 'passenger';
    }

    public function isAdmin(): bool
    {
        return $this->role?->slug === 'admin';
    }

    public function isStaff(): bool
    {
        return in_array($this->role?->slug, ['admin', 'staff']);
    }

    public function isDriver(): bool
    {
        return $this->role?->slug === 'driver';
    }

    public function isPassenger(): bool
    {
        return $this->role?->slug === 'passenger';
    }
}
