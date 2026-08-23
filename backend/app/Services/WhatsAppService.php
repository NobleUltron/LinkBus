<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\NotificationLog;
use App\Models\Parcel;
use App\Models\Setting;
use App\Models\Trip;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    /**
     * Send a WhatsApp message to a recipient phone number.
     */
    public function send(string $phone, string $message, ?int $userId = null, ?array $metadata = null): array
    {
        $enabled = Setting::getValue('whatsapp_enabled', 'true') === 'true';
        $normalizedPhone = $this->normalizePhoneNumber($phone);

        if (!$enabled) {
            Log::info("WhatsApp disabled by setting. Skipped sending to {$normalizedPhone}");
            return [
                'success' => false,
                'status'  => 'disabled',
                'message' => 'WhatsApp gateway is currently disabled in system settings.',
            ];
        }

        if (empty($normalizedPhone)) {
            return [
                'success' => false,
                'status'  => 'invalid_phone',
                'message' => 'Invalid or empty phone number provided for WhatsApp.',
            ];
        }

        $provider = Setting::getValue('whatsapp_provider', 'log');

        $result = match ($provider) {
            'meta_cloud_api'  => $this->sendViaMetaCloudApi($normalizedPhone, $message),
            'twilio_whatsapp' => $this->sendViaTwilioWhatsApp($normalizedPhone, $message),
            default           => $this->sendViaLog($normalizedPhone, $message),
        };

        // Write to notification logs table
        try {
            NotificationLog::create([
                'user_id'       => $userId,
                'channel'       => 'whatsapp',
                'recipient'     => $normalizedPhone,
                'title'         => $metadata['title'] ?? 'WhatsApp Alert',
                'message'       => $message,
                'status'        => $result['success'] ? ($provider === 'log' ? 'simulated' : 'sent') : 'failed',
                'error_message' => $result['error'] ?? null,
                'metadata'      => array_merge($metadata ?? [], [
                    'provider'      => $provider,
                    'raw_response'  => $result['raw'] ?? null,
                ]),
            ]);
        } catch (\Throwable $e) {
            Log::error("Failed to write WhatsApp notification log: " . $e->getMessage());
        }

        return $result;
    }

    /**
     * Simulated / Log Driver.
     */
    protected function sendViaLog(string $phone, string $message): array
    {
        Log::channel('single')->info("💬 [WHATSAPP SIMULATION] To: {$phone}\nMessage:\n{$message}");
        return [
            'success' => true,
            'status'  => 'simulated',
            'phone'   => $phone,
            'message' => 'WhatsApp message simulated and logged successfully.',
        ];
    }

    /**
     * Official Meta WhatsApp Cloud API driver.
     */
    protected function sendViaMetaCloudApi(string $phone, string $message): array
    {
        $phoneNumberId = Setting::getValue('whatsapp_phone_number_id', '');
        $accessToken   = Setting::getValue('whatsapp_access_token', '');

        if (empty($phoneNumberId) || empty($accessToken)) {
            return [
                'success' => false,
                'error'   => 'Meta WhatsApp Cloud API credentials (Phone Number ID or Access Token) are missing.',
            ];
        }

        // WhatsApp Cloud API expects numbers without leading '+' (e.g. 256700123456)
        $cleanRecipient = ltrim($phone, '+');

        try {
            $response = Http::withToken($accessToken)
                ->post("https://graph.facebook.com/v18.0/{$phoneNumberId}/messages", [
                    'messaging_product' => 'whatsapp',
                    'recipient_type'    => 'individual',
                    'to'                => $cleanRecipient,
                    'type'              => 'text',
                    'text'              => [
                        'preview_url' => true,
                        'body'        => $message,
                    ],
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
            Log::error("Meta WhatsApp Cloud API Exception: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Twilio WhatsApp API driver.
     */
    protected function sendViaTwilioWhatsApp(string $phone, string $message): array
    {
        $accountSid = Setting::getValue('sms_api_secret', '');
        $authToken  = Setting::getValue('sms_api_key', '');
        $fromNumber = Setting::getValue('whatsapp_from_number', '+14155238886');

        if (empty($accountSid) || empty($authToken)) {
            return [
                'success' => false,
                'error'   => 'Twilio WhatsApp credentials (Account SID / Auth Token) are missing in settings.',
            ];
        }

        try {
            $response = Http::asForm()
                ->withBasicAuth($accountSid, $authToken)
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json", [
                    'From' => 'whatsapp:' . $fromNumber,
                    'To'   => 'whatsapp:' . $phone,
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
            Log::error("Twilio WhatsApp Exception: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Normalize East African / International phone numbers for WhatsApp (+256...).
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

    /**
     * Build rich, formatted WhatsApp Booking Confirmation message.
     */
    public function buildBookingConfirmationText(Booking $booking): string
    {
        $trip = $booking->trip;
        $origin = $trip?->route?->originTerminal?->name ?? 'Origin';
        $dest = $trip?->route?->destinationTerminal?->name ?? 'Destination';
        $depTime = $trip?->departure_time ? $trip->departure_time->format('D, d M Y @ h:i A') : 'Scheduled Time';
        $busPlate = $trip?->bus?->plate_number ?? 'Assigned at terminal';
        $seats = $booking->tickets->pluck('seat.seat_number')->filter()->implode(', ');
        $firstPassenger = $booking->tickets->first();
        $passengerName = $firstPassenger?->passenger_name ?? $booking->user?->name ?? 'Customer';
        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        $ticketsList = '';
        foreach ($booking->tickets as $idx => $t) {
            $ticketsList .= "\n   • *" . ($t->passenger_name) . "* | Seat: *" . ($t->seat?->seat_number ?? 'TBD') . "* | Ticket: `{$t->ticket_number}`";
        }

        return "🚌 *LINKBUS UGANDA — BOOKING CONFIRMATION*\n\n"
             . "Hello *{$passengerName}*, your trip has been confirmed! 🎉\n\n"
             . "📋 *Booking Ref:* #{$booking->booking_number}\n"
             . "📍 *Route:* {$origin} ➔ {$dest}\n"
             . "🕒 *Departure:* {$depTime}\n"
             . "🚍 *Bus Plate:* {$busPlate}\n"
             . "💺 *Seat(s):* [{$seats}]\n"
             . "💳 *Total Paid:* UGX " . number_format($booking->total_amount) . "\n\n"
             . "🎟️ *Passenger Tickets:*" . $ticketsList . "\n\n"
             . "🔗 *View & Download e-Ticket:* {$frontendUrl}/my-tickets\n\n"
             . "⚠️ _Please arrive at {$origin} Terminal 20 minutes before departure._\n"
             . "📞 *Customer Care:* +256-700-123456 | Safe Travels!";
    }

    /**
     * Dispatch Booking Confirmation via WhatsApp.
     */
    public function sendBookingConfirmationWhatsApp(Booking $booking): array
    {
        $firstPassenger = $booking->tickets->first();
        $phone = $firstPassenger?->passenger_phone ?? $booking->user?->phone ?? '';
        $message = $this->buildBookingConfirmationText($booking);

        return $this->send($phone, $message, $booking->user_id, [
            'title'      => 'Booking Confirmation WhatsApp',
            'booking_id' => $booking->id,
            'trip_id'    => $booking->trip_id,
        ]);
    }

    /**
     * Generate Click-to-Chat `https://wa.me/...` URL for client-side instant sharing.
     */
    public function getWhatsAppShareLink(string $phone, string $text): string
    {
        $cleanPhone = preg_replace('/[^\d]/', '', $this->normalizePhoneNumber($phone));
        return "https://wa.me/{$cleanPhone}?text=" . rawurlencode($text);
    }
}
