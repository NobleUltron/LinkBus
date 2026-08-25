<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promo_codes', function (Blueprint $table) {
            if (!Schema::hasColumn('promo_codes', 'max_uses_per_user')) {
                $table->unsignedInteger('max_uses_per_user')->default(1)->after('max_uses');
            }
            if (!Schema::hasColumn('promo_codes', 'first_booking_only')) {
                $table->boolean('first_booking_only')->default(false)->after('max_uses_per_user');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'promo_code')) {
                $table->string('promo_code')->nullable()->after('payment_method');
                $table->index(['user_id', 'promo_code']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('promo_codes', function (Blueprint $table) {
            if (Schema::hasColumn('promo_codes', 'first_booking_only')) {
                $table->dropColumn('first_booking_only');
            }
            if (Schema::hasColumn('promo_codes', 'max_uses_per_user')) {
                $table->dropColumn('max_uses_per_user');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'promo_code')) {
                $table->dropIndex(['user_id', 'promo_code']);
                $table->dropColumn('promo_code');
            }
        });
    }
};
