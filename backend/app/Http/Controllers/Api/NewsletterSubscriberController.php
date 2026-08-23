<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NewsletterSubscriber;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NewsletterSubscriberController extends Controller
{
    protected WhatsAppService $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Public endpoint to subscribe to Route & Holiday Fare Alerts.
     */
    public function subscribe(Request $request)
    {
        $validated = $request->validate([
            'contact' => 'required|string|max:255',
            'source' => 'nullable|string|max:100',
        ]);

        $rawContact = trim($validated['contact']);
        $channel = 'phone';

        if (filter_var($rawContact, FILTER_VALIDATE_EMAIL)) {
            $channel = 'email';
        } else {
            // Clean phone format
            $cleaned = preg_replace('/[^0-9+]/', '', $rawContact);
            if (str_starts_with($cleaned, '07') || str_starts_with($cleaned, '03') || str_starts_with($cleaned, '+256') || str_starts_with($cleaned, '256')) {
                $channel = 'whatsapp';
            }
        }

        $subscriber = NewsletterSubscriber::updateOrCreate(
            ['contact' => $rawContact],
            [
                'channel' => $channel,
                'source' => $validated['source'] ?? 'route_alerts_bar',
                'status' => 'active',
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Successfully subscribed to route and holiday fare alerts!',
            'data' => $subscriber,
        ], 200);
    }

    /**
     * Admin endpoint: List all newsletter subscribers.
     */
    public function index(Request $request)
    {
        $query = NewsletterSubscriber::query()->latest();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('contact', 'like', "%{$search}%")
                  ->orWhere('source', 'like', "%{$search}%")
                  ->orWhere('channel', 'like', "%{$search}%");
        }

        if ($request->filled('channel')) {
            $query->where('channel', $request->input('channel'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $subscribers = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $subscribers,
        ]);
    }

    /**
     * Admin endpoint: Broadcast fare alert / promo message to subscribers.
     */
    public function broadcast(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'channel' => 'required|in:all,whatsapp,email,phone',
            'promo_code' => 'nullable|string|max:50',
        ]);

        $query = NewsletterSubscriber::query()->where('status', 'active');

        if ($validated['channel'] !== 'all') {
            $query->where('channel', $validated['channel']);
        }

        $subscribers = $query->get();
        $dispatchedCount = 0;
        $title = $validated['title'];
        $messageBody = $validated['message'];
        $promoCode = $validated['promo_code'] ?? null;

        $fullText = "🚌 *LinkBus Uganda* — *{$title}*\n\n{$messageBody}";
        if ($promoCode) {
            $fullText .= "\n\n🏷️ *Promo Code:* {$promoCode}";
        }
        $fullText .= "\n\n🔗 *Book Departures:* " . url('/');

        $emailText = "🚌 LinkBus Uganda — {$title}\n\n{$messageBody}";
        if ($promoCode) {
            $emailText .= "\n\nPromo Code: {$promoCode}";
        }
        $emailText .= "\n\nBook Departures: " . url('/');

        foreach ($subscribers as $sub) {
            try {
                if ($sub->channel === 'email') {
                    // Send Email via configured SMTP
                    Mail::raw($emailText, function ($mail) use ($sub, $title) {
                        $mail->to($sub->contact)
                             ->subject("LinkBus Alert: {$title}");
                    });
                    $dispatchedCount++;
                } else {
                    // Send via WhatsApp Service
                    $this->whatsAppService->send(
                        phone: $sub->contact,
                        message: $fullText,
                        metadata: [
                            'title' => "Fare Alert: {$title}",
                            'source' => 'newsletter_broadcast',
                            'promo_code' => $promoCode,
                        ]
                    );
                    $dispatchedCount++;
                }
            } catch (\Throwable $e) {
                Log::warning("Failed to dispatch alert to {$sub->contact}: " . $e->getMessage());
            }
        }

        // Generate instant WhatsApp Web share / broadcast link for Admins
        $encodedMessage = urlencode($fullText);
        $whatsappBroadcastUrl = "https://api.whatsapp.com/send?text={$encodedMessage}";

        return response()->json([
            'success' => true,
            'message' => "Fare alert broadcasted to {$dispatchedCount} subscribers.",
            'dispatched_count' => $dispatchedCount,
            'total_targeted' => $subscribers->count(),
            'whatsapp_broadcast_url' => $whatsappBroadcastUrl,
            'message_preview' => $fullText,
        ]);
    }

    /**
     * Admin endpoint: Delete / unsubscribe.
     */
    public function destroy($id)
    {
        $subscriber = NewsletterSubscriber::findOrFail($id);
        $subscriber->delete();

        return response()->json([
            'success' => true,
            'message' => 'Subscriber removed successfully.',
        ]);
    }
}
