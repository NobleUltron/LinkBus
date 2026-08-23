<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_id')->constrained('bus_routes')->restrictOnDelete();
            $table->foreignId('bus_id')->constrained('buses')->restrictOnDelete();
            $table->foreignId('driver_id')->constrained('drivers')->restrictOnDelete();
            $table->dateTime('departure_time');
            $table->dateTime('arrival_time');
            $table->unsignedInteger('fare'); // in UGX
            $table->enum('status', ['scheduled', 'boarding', 'in_transit', 'completed', 'cancelled'])->default('scheduled');
            $table->unsignedSmallInteger('available_seats')->default(0);
            $table->timestamps();

            $table->index(['status', 'departure_time']);
            $table->index('departure_time');
        });

        Schema::create('trip_seats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->string('seat_number', 5);
            $table->enum('seat_class', ['standard', 'vip'])->default('standard');
            $table->enum('status', ['available', 'locked', 'booked'])->default('available');
            $table->timestamps();

            $table->unique(['trip_id', 'seat_number']);
            $table->index(['trip_id', 'status']);
        });

        Schema::create('seat_locks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignId('seat_id')->constrained('trip_seats')->cascadeOnDelete();
            $table->dateTime('expires_at');
            $table->timestamps();

            $table->index(['seat_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seat_locks');
        Schema::dropIfExists('trip_seats');
        Schema::dropIfExists('trips');
    }
};
