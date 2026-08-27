<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'shift_id',
        'user_id',
        'type',
        'amount',
        'category',
        'reason',
        'authorized_by',
    ];

    protected $casts = [
        'amount' => 'integer',
    ];

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
