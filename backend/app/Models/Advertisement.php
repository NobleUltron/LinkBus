<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Advertisement extends Model
{
    protected $fillable = [
        'title', 'description', 'image_url', 'link_url',
        'type', 'status', 'start_date', 'end_date', 'priority',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date'   => 'date',
            'priority'   => 'integer',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                     ->where('start_date', '<=', now())
                     ->where('end_date', '>=', now())
                     ->orderBy('priority');
    }
}
