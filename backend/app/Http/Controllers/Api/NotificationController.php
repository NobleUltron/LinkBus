<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\NotificationLog;
use App\Models\Setting;
use App\Services\NotificationService;
use App\Services\SmsService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService,
        protected SmsService $smsService,
        protected WhatsAppService $whatsAppService
    ) {}

    /**
     * Get in-app notifications for authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = AppNotification::forUser($user->id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        $unreadCount = AppNotification::forUser($user->id)
            ->unread()
            ->count();

        return response()->json([
            'notifications' => $notifications->map(fn($n) => [
                'id'         => $n->id,
                'user_id'    => $n->user_id,
                'type'       => $n->type,
                'title'      => $n->title,
                'message'    => $n->message,
                'data'       => $n->data,
                'read_at'    => $n->read_at?->toISOString(),
                'created_at' => $n->created_at?->toISOString(),
            ]),
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markRead(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $notification = AppNotification::where('id', $id)
            ->where(fn($q) => $q->where('user_id', $user->id)->orWhereNull('user_id'))
            ->first();

        if ($notification) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['message' => 'Notification marked as read.']);
    }

    /**
     * Mark all notifications for the user as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();

        AppNotification::forUser($user->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    /**
     * Delete a single notification.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        AppNotification::where('id', $id)
            ->where(fn($q) => $q->where('user_id', $user->id)->orWhereNull('user_id'))
            ->delete();

        return response()->json(['message' => 'Notification deleted.']);
    }

    /**
     * Clear all in-app notifications for the user.
     */
    public function clearAll(Request $request): JsonResponse
    {
        $user = $request->user();

        AppNotification::forUser($user->id)->delete();

        return response()->json(['message' => 'All notifications cleared.']);
    }

    /**
     * List all system notification dispatch logs (Admin only).
     */
    public function logs(Request $request): JsonResponse
    {
        $query = NotificationLog::with('user:id,name,email')
            ->orderBy('created_at', 'desc');

        if ($request->filled('channel')) {
            $query->where('channel', $request->channel);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('recipient', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%");
            });
        }

        $logs = $query->paginate(25);

        return response()->json([
            'logs' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'total'        => $logs->total(),
            ],
        ]);
    }

    /**
     * Send Broadcast Announcement (Admin only).
     */
    public function broadcast(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'      => 'required|string|max:200',
            'message'    => 'required|string|max:1000',
            'target'     => 'required|in:all,passengers,staff,trip',
            'trip_id'    => 'nullable|required_if:target,trip|exists:trips,id',
            'send_sms'   => 'boolean',
            'send_email' => 'boolean',
        ]);

        $res = $this->notificationService->sendBroadcast(
            title: $data['title'],
            message: $data['message'],
            target: $data['target'],
            tripId: $data['trip_id'] ?? null,
            sendSms: $data['send_sms'] ?? false,
            sendEmail: $data['send_email'] ?? false
        );

        return response()->json([
            'message' => "Broadcast successfully dispatched to {$res['total_users']} recipient(s).",
            'stats'   => $res,
        ]);
    }

    /**
     * Test SMS sending from Admin settings.
     */
    public function testSms(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'   => 'required|string',
            'message' => 'nullable|string',
        ]);

        $message = $data['message'] ?? "This is a test notification from LinkBus Uganda system. SMS Gateway is functioning properly!";

        $result = $this->smsService->send(
            phone: $data['phone'],
            message: $message,
            userId: $request->user()->id,
            metadata: ['title' => 'Admin Test SMS']
        );

        return response()->json([
            'success' => $result['success'] ?? false,
            'result'  => $result,
            'message' => $result['success']
                ? "Test SMS dispatched successfully to {$data['phone']}."
                : ("SMS sending failed: " . ($result['error'] ?? 'Unknown error')),
        ]);
    }

    /**
     * Test Email sending from Admin settings.
     */
    public function testEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
        ]);

        $company = Setting::getValue('company_name', 'LinkBus Uganda');

        try {
            Mail::to($data['email'])->send(
                new \App\Mail\GenericNotificationMail(
                    subjectLine: "Test Email from {$company}",
                    title: "Email Notifications are Configured!",
                    bodyContent: "Congratulations! Your LinkBus email notification settings are working correctly. All ticket confirmations and passenger updates will be delivered smoothly.",
                    userName: $request->user()->name,
                    actionUrl: "http://localhost:5173",
                    actionText: "Visit LinkBus Portal"
                )
            );

            NotificationLog::create([
                'user_id'   => $request->user()->id,
                'channel'   => 'email',
                'recipient' => $data['email'],
                'title'     => 'Admin Test Email',
                'message'   => "Test email dispatched successfully",
                'status'    => config('mail.default') === 'log' ? 'simulated' : 'sent',
            ]);

            return response()->json([
                'success' => true,
                'message' => "Test email dispatched to {$data['email']}.",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => "Failed to send test email: " . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Test WhatsApp message sending from Admin settings.
     */
    public function testWhatsapp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'   => 'required|string',
            'message' => 'nullable|string',
        ]);

        $message = $data['message'] ?? "🚌 *LinkBus Uganda* — WhatsApp Notification Gateway is working successfully! 🎉\n\nYou will receive instant booking confirmations, trip updates, and e-tickets here.\n\n🔗 Visit Portal: http://localhost:5173";

        $result = $this->whatsAppService->send(
            phone: $data['phone'],
            message: $message,
            userId: $request->user()->id,
            metadata: ['title' => 'Admin Test WhatsApp']
        );

        $whatsappLink = $this->whatsAppService->getWhatsAppShareLink($data['phone'], $message);

        return response()->json([
            'success'       => $result['success'] ?? true,
            'result'        => $result,
            'whatsapp_link' => $whatsappLink,
            'message'       => "Test WhatsApp message prepared for {$data['phone']}.",
        ]);
    }
}
