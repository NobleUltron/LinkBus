<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromoCode extends Model
{
    protected $table = 'promo_codes';

    protected $fillable = [
        'code', 'description', 'discount_type', 'discount_value',
        'min_booking_amount', 'max_uses', 'used_count', 'is_active', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active'          => 'boolean',
            'expires_at'         => 'date',
            'discount_value'     => 'integer',
            'min_booking_amount' => 'integer',
            'max_uses'           => 'integer',
            'used_count'         => 'integer',
        ];
    }

    public function isValid(): bool
    {
        if (!$this->is_active) return false;
        if ($this->expires_at && $this->expires_at->isPast()) return false;
        if ($this->used_count >= $this->max_uses) return false;
        return true;
    }

    public function calculateDiscount(int $subtotal): int
    {
        if ($subtotal < $this->min_booking_amount) return 0;
        if ($this->discount_type === 'percentage') {
            return (int) round($subtotal * $this->discount_value / 100);
        }
        return min($this->discount_value, $subtotal);
    }
}
