<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('luggage', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('trip_seat_id')->nullable()->constrained('trip_seats')->nullOnDelete();
            $table->string('tag_number')->unique();
            $table->string('description');
            $table->decimal('weight_kg', 5, 1)->default(0);
            $table->enum('status', ['checked_in', 'in_transit', 'delivered', 'lost'])->default('checked_in');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['booking_id']);
            $table->index('tag_number');
        });

        Schema::create('parcels', function (Blueprint $table) {
            $table->id();
            $table->string('sender_name');
            $table->string('sender_phone', 30);
            $table->string('recipient_name');
            $table->string('recipient_phone', 30);
            $table->foreignId('origin_terminal_id')->constrained('terminals')->restrictOnDelete();
            $table->foreignId('destination_terminal_id')->constrained('terminals')->restrictOnDelete();
            $table->decimal('weight_kg', 5, 1)->default(0);
            $table->string('description');
            $table->string('tracking_number')->unique();
            $table->enum('status', ['received', 'in_transit', 'arrived', 'delivered', 'lost'])->default('received');
            $table->unsignedInteger('price')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('tracking_number');
            $table->index(['origin_terminal_id', 'destination_terminal_id']);
        });

        Schema::create('advertisements', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('link_url')->nullable();
            $table->enum('type', ['banner', 'popup', 'sidebar'])->default('banner');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedTinyInteger('priority')->default(1);
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->enum('group', ['company', 'booking', 'payment', 'luggage'])->default('company');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('type');
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('model_type');
            $table->unsignedBigInteger('model_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['model_type', 'model_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('advertisements');
        Schema::dropIfExists('parcels');
        Schema::dropIfExists('luggage');
    }
};
