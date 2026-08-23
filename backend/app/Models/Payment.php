<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = ['booking_id', 'method', 'amount', 'status', 'transaction_id'];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public static function generateTransactionId(string $method): string
    {
        $prefix = match ($method) {
            'cash'             => 'CSH',
            'card'             => 'CRD',
            'airtel_money'     => 'ATL',
            default            => 'MTN',
        };
        return $prefix . '-' . strtoupper(substr(uniqid(), -8));
    }
}
