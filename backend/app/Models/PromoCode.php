<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromoCode extends Model
{
    protected $table = 'promo_codes';

    protected $fillable = [
        'code', 'description', 'discount_type', 'discount_value',
        'min_booking_amount', 'max_uses', 'used_count',
        'max_uses_per_user', 'first_booking_only',
        'is_active', 'expires_at',
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
            'max_uses_per_user'  => 'integer',
            'first_booking_only' => 'boolean',
        ];
    }

    public function isValid(): bool
    {
        if (!$this->is_active) return false;
        if ($this->expires_at && $this->expires_at->isPast()) return false;
        if ($this->used_count >= $this->max_uses) return false;
        return true;
    }

    /**
     * Validate coupon eligibility for a specific user and booking amount.
     * Returns null if eligible, or an error message string if ineligible.
     */
    public function getValidationError(?User $user, int $subtotal): ?string
    {
        if (!$this->is_active) {
            return 'This promotional campaign is currently inactive.';
        }
        if ($this->expires_at && $this->expires_at->isPast()) {
            return 'This promo code expired on ' . $this->expires_at->format('d M Y') . '.';
        }
        if ($this->used_count >= $this->max_uses) {
            return 'This promotional campaign has reached its maximum total redemptions.';
        }
        if ($subtotal > 0 && $subtotal < $this->min_booking_amount) {
            return 'A minimum booking spend of UGX ' . number_format($this->min_booking_amount) . ' is required to use this code.';
        }

        if ($user) {
            // Check First Booking Only rule
            if ($this->first_booking_only) {
                $hasPriorBookings = Booking::where('user_id', $user->id)
                    ->where('status', '!=', 'cancelled')
                    ->exists();

                if ($hasPriorBookings) {
                    return "Promo code '{$this->code}' is reserved for first-time riders only.";
                }
            }

            // Check Max Uses Per Passenger rule
            $maxPerUser = $this->max_uses_per_user ?? 1;
            if ($maxPerUser > 0) {
                $userRedemptions = Booking::where('user_id', $user->id)
                    ->where('promo_code', $this->code)
                    ->where('status', '!=', 'cancelled')
                    ->count();

                if ($userRedemptions >= $maxPerUser) {
                    return $maxPerUser === 1
                        ? "You have already used promo code '{$this->code}' on a previous booking (limit 1 per passenger)."
                        : "You have reached the maximum limit of {$maxPerUser} uses for promo code '{$this->code}'.";
                }
            }
        }

        return null;
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
