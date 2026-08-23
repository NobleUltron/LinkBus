<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\NotificationLog;
use App\Models\Parcel;
use App\Models\Setting;
use App\Models\Trip;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    /**
     * Send an SMS to a recipient phone number using the configured SMS gateway.
     */
    public function send(string $phone, string $message, ?int $userId = null, ?array $metadata = null): array
    {
        $enabled = Setting::getValue('sms_enabled', 'true') === 'true';
        $normalizedPhone = $this->normalizePhoneNumber($phone);

        if (!$enabled) {
            Log::info("SMS disabled by setting. Skipped sending to {$normalizedPhone}: {$message}");
            return [
                'success' => false,
                'status'  => 'disabled',
                'message' => 'SMS gateway is currently disabled in system settings.',
            ];
        }

        if (empty($normalizedPhone)) {
            return [
                'success' => false,
                'status'  => 'invalid_phone',
                'message' => 'Invalid or empty phone number provided.',
            ];
        }

        $provider = Setting::getValue('sms_provider', 'log');
        $senderId = Setting::getValue('sms_sender_id', 'LINKBUS');

        $result = match ($provider) {
            'africastalking' => $this->sendViaAfricasTalking($normalizedPhone, $message, $senderId),
            'twilio'         => $this->sendViaTwilio($normalizedPhone, $message, $senderId),
            default          => $this->sendViaLog($normalizedPhone, $message, $senderId),
        };

        // Record to notification logs table
        try {
            NotificationLog::create([
                'user_id'       => $userId,
                'channel'       => 'sms',
                'recipient'     => $normalizedPhone,
                'title'         => $metadata['title'] ?? 'SMS Alert',
                'message'       => $message,
                'status'        => $result['success'] ? ($provider === 'log' ? 'simulated' : 'sent') : 'failed',
                'error_message' => $result['error'] ?? null,
                'metadata'      => array_merge($metadata ?? [], [
                    'provider'  => $provider,
                    'sender_id' => $senderId,
                    'raw_response' => $result['raw'] ?? null,
                ]),
            ]);
        } catch (\Throwable $e) {
            Log::error("Failed to write SMS notification log: " . $e->getMessage());
        }

        return $result;
    }

    /**
     * Simulated / Log Driver (default for development/testing).
     */
    protected function sendViaLog(string $phone, string $message, string $senderId): array
    {
        Log::channel('single')->info("📲 [SMS SIMULATION] To: {$phone} | From: {$senderId} | Msg: {$message}");
        return [
            'success' => true,
            'status'  => 'simulated',
            'phone'   => $phone,
            'message' => 'SMS simulated and logged successfully.',
        ];
    }

    /**
     * Africa's Talking REST API driver.
     */
    protected function sendViaAfricasTalking(string $phone, string $message, string $senderId): array
    {
        $apiKey   = Setting::getValue('sms_api_key', '');
        $username = Setting::getValue('sms_api_username', 'sandbox');

        if (empty($apiKey)) {
            return [
                'success' => false,
                'error'   => 'Africa\'s Talking API key is not configured in settings.',
            ];
        }

        $endpoint = ($username === 'sandbox')
            ? 'https://api.sandbox.africastalking.com/version1/messaging'
            : 'https://api.africastalking.com/version1/messaging';

        try {
            $response = Http::asForm()
                ->withHeaders([
                    'apiKey' => $apiKey,
                    'Accept' => 'application/json',
                ])
                ->post($endpoint, [
                    'username' => $username,
                    'to'       => $phone,
                    'message'  => $message,
                    'from'     => ($username === 'sandbox') ? null : $senderId,
                ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'status'  => 'sent',
                    'raw'     => $response->json(),
                ];
            }

            return [
                'success' => false,
                'error'   => $response->body(),
                'raw'     => $response->json(),
            ];
        } catch (\Throwable $e) {
            Log::error("AfricasTalking SMS Exception: " . $e->getMessage());
            return [
                'success' => false,
                'error'   => $e->getMessage(),
            ];
        }
    }

    /**
     * Twilio REST API driver.
     */
    protected function sendViaTwilio(string $phone, string $message, string $senderId): array
    {
        $accountSid = Setting::getValue('sms_api_secret', '');
        $authToken  = Setting::getValue('sms_api_key', '');

        if (empty($accountSid) || empty($authToken)) {
            return [
                'success' => false,
                'error'   => 'Twilio Account SID or Auth Token is not configured in settings.',
            ];
        }

        try {
            $response = Http::asForm()
                ->withBasicAuth($accountSid, $authToken)
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json", [
                    'From' => $senderId,
                    'To'   => $phone,
                    'Body' => $message,
                ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'status'  => 'sent',
                    'raw'     => $response->json(),
                ];
            }

            return [
                'success' => false,
                'error'   => $response->body(),
                'raw'     => $response->json(),
            ];
        } catch (\Throwable $e) {
            Log::error("Twilio SMS Exception: " . $e->getMessage());
            return [
                'success' => false,
                'error'   => $e->getMessage(),
            ];
        }
    }

    /**
     * Normalize East African / International phone numbers to E.164 standard.
     * Examples: 0700123456 -> +256700123456, 256772000000 -> +256772000000
     */
    public function normalizePhoneNumber(?string $phone): string
    {
        if (!$phone) return '';
        $clean = preg_replace('/[^\d+]/', '', trim($phone));

        if (str_starts_with($clean, '0') && strlen($clean) === 10) {
            return '+256' . substr($clean, 1);
        }

        if (str_starts_with($clean, '256') && strlen($clean) === 12) {
            return '+' . $clean;
        }

        if (!str_starts_with($clean, '+') && strlen($clean) >= 9) {
            return '+' . $clean;
        }

        return $clean;
    }

    // ── Pre-built High-Conversion SMS Messages ───────────────────────

    /**
     * Dispatch Booking Confirmation SMS.
     */
    public function sendBookingConfirmationSms(Booking $booking): array
    {
        $trip = $booking->trip;
        $origin = $trip?->route?->originTerminal?->name ?? 'Origin';
        $dest = $trip?->route?->destinationTerminal?->name ?? 'Destination';
        $depTime = $trip?->departure_time ? $trip->departure_time->format('D d M, h:i A') : 'Scheduled';
        $seats = $booking->tickets->pluck('seat.seat_number')->filter()->implode(', ');
        $ticketsCount = $booking->tickets->count();
        $firstPassenger = $booking->tickets->first();
        $passengerName = $firstPassenger?->passenger_name ?? $booking->user?->name ?? 'Customer';
        $phone = $firstPassenger?->passenger_phone ?? $booking->user?->phone ?? '';

        $message = "LinkBus Booking Confirmed! Ref: #{$booking->booking_number}. {$origin} -> {$dest} on {$depTime}. Seat(s): [{$seats}]. Total: UGX " . number_format($booking->total_amount) . ". Arrive 20m before departure. Info: +256700123456";

        return $this->send($phone, $message, $booking->user_id, [
            'title'      => 'Booking Confirmation SMS',
            'booking_id' => $booking->id,
            'trip_id'    => $booking->trip_id,
        ]);
    }

    /**
     * Dispatch Trip Cancellation / Reschedule Alert SMS.
     */
    public function sendTripUpdateSms(Trip $trip, string $phone, string $passengerName, string $title, string $message, ?int $userId = null): array
    {
        $origin = $trip->route?->originTerminal?->name ?? 'Origin';
        $dest = $trip->route?->destinationTerminal?->name ?? 'Destination';

        $smsText = "LinkBus Notice [{$origin}->{$dest}]: {$title} - {$message}. Questions? Call +256700123456";

        return $this->send($phone, $smsText, $userId, [
            'title'   => "Trip Alert: {$title}",
            'trip_id' => $trip->id,
        ]);
    }

    /**
     * Dispatch Parcel Status Alert SMS.
     */
    public function sendParcelStatusSms(Parcel $parcel, string $event): array
    {
        $origin = $parcel->originTerminal?->name ?? 'Origin';
        $dest = $parcel->destinationTerminal?->name ?? 'Destination';

        if ($event === 'received') {
            // SMS to sender
            $this->send(
                $parcel->sender_phone,
                "LinkBus Parcel #{$parcel->tracking_number} received at {$origin} Terminal destined for {$dest}. Track at linkbus.co.ug/track-parcel",
                null,
                ['title' => 'Parcel Received (Sender)', 'parcel_id' => $parcel->id]
            );

            // SMS to recipient
            return $this->send(
                $parcel->recipient_phone,
                "Hello {$parcel->recipient_name}, a parcel from {$parcel->sender_name} (#{$parcel->tracking_number}) has been dispatched via LinkBus to {$dest} Terminal.",
                null,
                ['title' => 'Parcel Dispatched (Recipient)', 'parcel_id' => $parcel->id]
            );
        }

        if ($event === 'arrived') {
            return $this->send(
                $parcel->recipient_phone,
                "Ready for Pickup! Your LinkBus parcel #{$parcel->tracking_number} has arrived at {$dest} Terminal. Please present this tracking code to collect.",
                null,
                ['title' => 'Parcel Arrived for Pickup', 'parcel_id' => $parcel->id]
            );
        }

        if ($event === 'delivered') {
            return $this->send(
                $parcel->sender_phone,
                "LinkBus Delivery: Parcel #{$parcel->tracking_number} has been safely collected by {$parcel->recipient_name}.",
                null,
                ['title' => 'Parcel Delivered (Sender)', 'parcel_id' => $parcel->id]
            );
        }

        return ['success' => true];
    }
}
