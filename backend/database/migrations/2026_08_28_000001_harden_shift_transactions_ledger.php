<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Harden shift_transactions table
        if (Schema::hasTable('shift_transactions')) {
            Schema::table('shift_transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('shift_transactions', 'direction')) {
                    $table->enum('direction', ['inflow', 'outflow'])->default('inflow')->after('amount');
                }
                if (!Schema::hasColumn('shift_transactions', 'payment_method')) {
                    $table->enum('payment_method', ['cash', 'mtn_mobile_money', 'airtel_money', 'card', 'bank_transfer'])->default('cash')->after('direction');
                }
                if (!Schema::hasColumn('shift_transactions', 'source_type')) {
                    $table->string('source_type')->nullable()->after('payment_method');
                }
                if (!Schema::hasColumn('shift_transactions', 'source_id')) {
                    $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
                }
                if (!Schema::hasColumn('shift_transactions', 'idempotency_key')) {
                    $table->string('idempotency_key', 120)->nullable()->unique()->after('source_id');
                }
            });

            // Modify type column to varchar(50) so all standard and bespoke transaction types are supported cleanly
            DB::statement("ALTER TABLE shift_transactions MODIFY COLUMN type VARCHAR(50) NOT NULL");

            Schema::table('shift_transactions', function (Blueprint $table) {
                $table->index(['shift_id', 'direction', 'payment_method'], 'shift_dir_method_idx');
                $table->index(['source_type', 'source_id'], 'shift_source_idx');
            });
        }

        // 2. Harden shifts table
        if (Schema::hasTable('shifts')) {
            Schema::table('shifts', function (Blueprint $table) {
                if (!Schema::hasColumn('shifts', 'closed_by_user_id')) {
                    $table->foreignId('closed_by_user_id')->nullable()->after('closed_at')->constrained('users')->nullOnDelete();
                }
            });

            // Expand status enum to include suspended if not already
            DB::statement("ALTER TABLE shifts MODIFY COLUMN status ENUM('open', 'closed', 'suspended') NOT NULL DEFAULT 'open'");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('shift_transactions')) {
            Schema::table('shift_transactions', function (Blueprint $table) {
                $table->dropIndex('shift_dir_method_idx');
                $table->dropIndex('shift_source_idx');
                if (Schema::hasColumn('shift_transactions', 'idempotency_key')) {
                    $table->dropUnique(['idempotency_key']);
                    $table->dropColumn('idempotency_key');
                }
                if (Schema::hasColumn('shift_transactions', 'source_id')) {
                    $table->dropColumn('source_id');
                }
                if (Schema::hasColumn('shift_transactions', 'source_type')) {
                    $table->dropColumn('source_type');
                }
                if (Schema::hasColumn('shift_transactions', 'payment_method')) {
                    $table->dropColumn('payment_method');
                }
                if (Schema::hasColumn('shift_transactions', 'direction')) {
                    $table->dropColumn('direction');
                }
            });
        }

        if (Schema::hasTable('shifts')) {
            Schema::table('shifts', function (Blueprint $table) {
                if (Schema::hasColumn('shifts', 'closed_by_user_id')) {
                    $table->dropForeign(['closed_by_user_id']);
                    $table->dropColumn('closed_by_user_id');
                }
            });
        }
    }
};
