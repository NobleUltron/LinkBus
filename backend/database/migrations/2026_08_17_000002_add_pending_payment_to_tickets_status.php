<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE tickets MODIFY COLUMN status ENUM('pending_payment', 'active', 'used', 'cancelled') NOT NULL DEFAULT 'active'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE tickets MODIFY COLUMN status ENUM('active', 'used', 'cancelled') NOT NULL DEFAULT 'active'");
    }
};
