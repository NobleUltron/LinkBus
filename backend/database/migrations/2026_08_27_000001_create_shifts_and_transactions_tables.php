<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->string('shift_code', 30)->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('terminal_id')->nullable()->constrained('terminals')->nullOnDelete();
            $table->foreignId('bus_id')->nullable()->constrained('buses')->nullOnDelete();
            
            // Financial Ledger Balances in UGX
            $table->unsignedBigInteger('starting_cash')->default(0);
            $table->unsignedBigInteger('expected_cash')->nullable();
            $table->unsignedBigInteger('actual_cash')->nullable();
            $table->bigInteger('difference')->nullable();
            $table->json('denominations')->nullable();
            
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->string('supervisor_name')->nullable();
            $table->string('variance_reason')->nullable();
            $table->text('closing_notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['terminal_id', 'status', 'created_at']);
        });

        Schema::create('shift_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained('shifts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['cash_in', 'petty_expense', 'safe_drop', 'refund']);
            $table->unsignedBigInteger('amount');
            $table->string('category', 100);
            $table->string('reason');
            $table->string('authorized_by')->nullable();
            $table->timestamps();

            $table->index(['shift_id', 'type']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_transactions');
        Schema::dropIfExists('shifts');
    }
};
