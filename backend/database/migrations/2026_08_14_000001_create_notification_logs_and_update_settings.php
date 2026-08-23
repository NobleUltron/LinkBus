<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Notification logs table for auditing and tracking multi-channel delivery
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('channel', ['sms', 'email', 'in_app']);
            $table->string('recipient');
            $table->string('title')->nullable();
            $table->text('message');
            $table->enum('status', ['sent', 'delivered', 'failed', 'simulated'])->default('sent');
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['channel', 'status']);
            $table->index(['recipient']);
            $table->index(['created_at']);
        });

        // 2. Allow 'notifications' in settings group by converting enum/string column
        try {
            DB::statement("ALTER TABLE `settings` MODIFY COLUMN `group` VARCHAR(50) NOT NULL DEFAULT 'company'");
        } catch (\Throwable $e) {
            // Fallback or ignore if already compatible
        }

        // 3. Seed default notification configuration settings
        $notificationSettings = [
            ['key' => 'sms_enabled',         'value' => 'true',             'group' => 'notifications', 'description' => 'Enable or disable SMS dispatch across the system'],
            ['key' => 'sms_provider',        'value' => 'log',              'group' => 'notifications', 'description' => 'SMS Gateway provider: log (simulation), africastalking, twilio, custom'],
            ['key' => 'sms_sender_id',       'value' => 'LINKBUS',          'group' => 'notifications', 'description' => 'Approved SMS sender ID or shortcode header'],
            ['key' => 'sms_api_key',         'value' => '',                 'group' => 'notifications', 'description' => 'API Key for SMS provider gateway'],
            ['key' => 'sms_api_secret',      'value' => '',                 'group' => 'notifications', 'description' => 'API Secret or Account SID for SMS gateway'],
            ['key' => 'sms_api_username',    'value' => 'sandbox',          'group' => 'notifications', 'description' => 'Username for Africa\'s Talking or Gateway'],
            ['key' => 'email_enabled',       'value' => 'true',             'group' => 'notifications', 'description' => 'Enable or disable Email ticket receipts and updates'],
            ['key' => 'email_from_address',  'value' => 'noreply@linkbus.co.ug', 'group' => 'notifications', 'description' => 'From email address for outgoing system emails'],
            ['key' => 'email_from_name',     'value' => 'LinkBus Uganda',   'group' => 'notifications', 'description' => 'Sender name displayed on customer emails'],
            ['key' => 'notify_on_booking',   'value' => 'true',             'group' => 'notifications', 'description' => 'Send instant SMS & Email upon booking confirmation'],
            ['key' => 'notify_on_reschedule','value' => 'true',             'group' => 'notifications', 'description' => 'Send SMS alerts when a trip departure time is changed'],
            ['key' => 'notify_on_cancel',    'value' => 'true',             'group' => 'notifications', 'description' => 'Send SMS alerts when a trip or booking is cancelled'],
        ];

        foreach ($notificationSettings as $setting) {
            Setting::firstOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
