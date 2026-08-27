<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('bookings')) {
            Schema::table('bookings', function (Blueprint $table) {
                if (!Schema::hasColumn('bookings', 'shift_id')) {
                    $table->foreignId('shift_id')->nullable()->after('linked_booking_id')->constrained('shifts')->nullOnDelete();
                    $table->index('shift_id');
                }
            });
        }

        if (Schema::hasTable('luggage')) {
            Schema::table('luggage', function (Blueprint $table) {
                if (!Schema::hasColumn('luggage', 'shift_id')) {
                    $table->foreignId('shift_id')->nullable()->after('trip_seat_id')->constrained('shifts')->nullOnDelete();
                    $table->index('shift_id');
                }
                if (!Schema::hasColumn('luggage', 'payment_method')) {
                    $table->enum('payment_method', ['cash', 'mtn_mobile_money', 'airtel_money', 'card'])->default('cash')->after('weight_kg');
                }
                if (!Schema::hasColumn('luggage', 'price')) {
                    $table->unsignedBigInteger('price')->default(0)->after('payment_method');
                }
            });
        }

        if (Schema::hasTable('parcels')) {
            Schema::table('parcels', function (Blueprint $table) {
                if (!Schema::hasColumn('parcels', 'shift_id')) {
                    $table->foreignId('shift_id')->nullable()->after('destination_terminal_id')->constrained('shifts')->nullOnDelete();
                    $table->index('shift_id');
                }
                if (!Schema::hasColumn('parcels', 'payment_method')) {
                    $table->enum('payment_method', ['cash', 'mtn_mobile_money', 'airtel_money', 'card'])->default('cash')->after('status');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('bookings') && Schema::hasColumn('bookings', 'shift_id')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->dropForeign(['shift_id']);
                $table->dropColumn('shift_id');
            });
        }

        if (Schema::hasTable('luggage')) {
            Schema::table('luggage', function (Blueprint $table) {
                if (Schema::hasColumn('luggage', 'shift_id')) {
                    $table->dropForeign(['shift_id']);
                    $table->dropColumn('shift_id');
                }
                if (Schema::hasColumn('luggage', 'payment_method')) {
                    $table->dropColumn('payment_method');
                }
                if (Schema::hasColumn('luggage', 'price')) {
                    $table->dropColumn('price');
                }
            });
        }

        if (Schema::hasTable('parcels')) {
            Schema::table('parcels', function (Blueprint $table) {
                if (Schema::hasColumn('parcels', 'shift_id')) {
                    $table->dropForeign(['shift_id']);
                    $table->dropColumn('shift_id');
                }
                if (Schema::hasColumn('parcels', 'payment_method')) {
                    $table->dropColumn('payment_method');
                }
            });
        }
    }
};
