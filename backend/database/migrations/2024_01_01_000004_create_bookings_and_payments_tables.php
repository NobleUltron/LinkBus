<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('description')->nullable();
            $table->enum('discount_type', ['percentage', 'fixed'])->default('percentage');
            $table->unsignedInteger('discount_value')->default(10);
            $table->unsignedInteger('min_booking_amount')->default(0);
            $table->unsignedInteger('max_uses')->default(100);
            $table->unsignedInteger('used_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->date('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_number')->unique();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('trip_id')->constrained('trips')->restrictOnDelete();
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'completed'])->default('confirmed');
            $table->unsignedInteger('subtotal');
            $table->unsignedInteger('discount_amount')->default(0);
            $table->unsignedInteger('tax_amount')->default(0);
            $table->unsignedInteger('total_amount');
            $table->enum('payment_method', ['cash', 'mtn_mobile_money', 'airtel_money', 'card'])->default('cash');
            $table->foreignId('linked_booking_id')->nullable()->constrained('bookings')->nullOnDelete();
            $table->unsignedInteger('cancellation_fee')->default(0);
            $table->timestamp('cancelled_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['trip_id', 'status']);
            $table->index('created_at');
        });

        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('trip_seat_id')->constrained('trip_seats')->restrictOnDelete();
            $table->string('passenger_name');
            $table->string('passenger_phone', 30)->nullable();
            $table->string('ticket_number')->unique();
            $table->string('qr_code')->unique();
            $table->enum('status', ['pending_payment', 'active', 'used', 'cancelled'])->default('active');
            $table->timestamp('boarded_at')->nullable();
            $table->timestamps();

            $table->index(['booking_id']);
            $table->index(['trip_seat_id']);
            $table->index('ticket_number');
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->enum('method', ['cash', 'mtn_mobile_money', 'airtel_money', 'card'])->default('cash');
            $table->unsignedInteger('amount');
            $table->enum('status', ['pending', 'completed', 'failed', 'refunded'])->default('completed');
            $table->string('transaction_id')->unique()->nullable();
            $table->timestamps();

            $table->index(['booking_id']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('promo_codes');
    }
};
