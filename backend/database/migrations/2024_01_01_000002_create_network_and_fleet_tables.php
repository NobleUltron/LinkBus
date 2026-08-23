<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terminals', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city');
            $table->string('address');
            $table->decimal('latitude', 10, 7)->default(0);
            $table->decimal('longitude', 10, 7)->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->string('photo')->nullable();
            $table->timestamps();
        });

        Schema::create('bus_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('origin_terminal_id')->constrained('terminals')->restrictOnDelete();
            $table->foreignId('destination_terminal_id')->constrained('terminals')->restrictOnDelete();
            $table->unsignedSmallInteger('distance_km')->default(0);
            $table->unsignedSmallInteger('estimated_duration_minutes')->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();

            $table->unique(['origin_terminal_id', 'destination_terminal_id']);
        });

        Schema::create('buses', function (Blueprint $table) {
            $table->id();
            $table->string('plate_number')->unique();
            $table->string('model');
            $table->enum('bus_type', ['standard', 'vip', 'sleeper'])->default('standard');
            $table->unsignedSmallInteger('capacity')->default(44);
            $table->enum('status', ['active', 'maintenance', 'retired'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('drivers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('license_number')->unique();
            $table->date('license_expiry');
            $table->enum('status', ['active', 'suspended', 'on_leave'])->default('active');
            $table->unsignedTinyInteger('experience_years')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drivers');
        Schema::dropIfExists('buses');
        Schema::dropIfExists('bus_routes');
        Schema::dropIfExists('terminals');
    }
};
