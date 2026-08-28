<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->foreignId('assigned_bus_id')
                ->nullable()
                ->after('user_id')
                ->constrained('buses')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropForeign(['assigned_bus_id']);
            $table->dropColumn('assigned_bus_id');
        });
    }
};
