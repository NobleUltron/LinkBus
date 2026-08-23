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
        // 1. Convert channel to string/varchar so it supports 'whatsapp', 'sms', 'email', 'in_app'
        try {
            DB::statement("ALTER TABLE `notification_logs` MODIFY COLUMN `channel` VARCHAR(30) NOT NULL DEFAULT 'sms'");
        } catch (\Throwable $e) {}

        // 2. Add WhatsApp settings
        $whatsappSettings = [
            ['key' => 'whatsapp_enabled',         'value' => 'true',             'group' => 'notifications', 'description' => 'Enable or disable WhatsApp message delivery across the system'],
            ['key' => 'whatsapp_provider',        'value' => 'log',              'group' => 'notifications', 'description' => 'WhatsApp Provider: log (simulation), meta_cloud_api, twilio_whatsapp'],
            ['key' => 'whatsapp_phone_number_id', 'value' => '',                 'group' => 'notifications', 'description' => 'Meta WhatsApp Cloud API Phone Number ID'],
            ['key' => 'whatsapp_access_token',    'value' => '',                 'group' => 'notifications', 'description' => 'Meta WhatsApp Cloud API Permanent/System User Token'],
            ['key' => 'whatsapp_from_number',     'value' => '+14155238886',     'group' => 'notifications', 'description' => 'Twilio WhatsApp Sender Number or Sandbox Number'],
        ];

        foreach ($whatsappSettings as $setting) {
            Setting::firstOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }

    public function down(): void
    {
        //
    }
};
