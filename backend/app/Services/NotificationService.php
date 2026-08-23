<?php

namespace App\Services;

use App\Mail\BookingConfirmationMail;
use App\Mail\GenericNotificationMail;
use App\Mail\TripUpdateMail;
use App\Models\AppNotification;
use App\Models\Booking;
use App\Models\NotificationLog;
use App\Models\Parcel;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    public function __construct(
        protected SmsService $smsService,
        protected WhatsAppService $whatsAppService
    ) {}

    /**
     * Trigger all channels when a booking is confirmed.
     */
    public function notifyBookingConfirmed(Booking $booking): void
    {
        $booking->loadMissing(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'trip.bus', 'tickets.seat', 'user', 'payment']);

        $user = $booking->user;
        $trip = $booking->trip;
        $origin = $trip?->route?->originTerminal?->name ?? 'Origin';
        $dest   = $trip?->route?->destinationTerminal?->name ?? 'Destination';
        $depTime = $trip?->departure_time ? $trip->departure_time->format('D, d M Y · h:i A') : 'Scheduled';
        $seatNumbers = $booking->tickets->pluck('seat.seat_number')->filter()->implode(', ');

        // 1. In-App Notification
        if ($booking->user_id) {
            $this->createInAppNotification(
                userId: $booking->user_id,
                type: 'booking_confirmed',
                title: "Booking Confirmed #{$booking->booking_number}",
                message: "Trip to {$dest} on {$depTime}. Seat(s): {$seatNumbers}.",
                data: [
                    'booking_id'     => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'trip_id'        => $booking->trip_id,
                    'route'          => "{$origin} to {$dest}",
                    'seats'          => $seatNumbers,
                    'total_amount'   => $booking->total_amount,
                ]
            );
        }

        // 2. WhatsApp Notification (Primary modern messaging)
        $whatsappEnabled = Setting::getValue('whatsapp_enabled', 'true') === 'true';
        if ($whatsappEnabled) {
            try {
                $this->whatsAppService->sendBookingConfirmationWhatsApp($booking);
            } catch (\Throwable $e) {
                Log::error("WhatsApp booking notification error: " . $e->getMessage());
            }
        }

        // 3. SMS Notification (Fallback / parallel)
        $notifyOnBooking = Setting::getValue('notify_on_booking', 'true') === 'true';
        if ($notifyOnBooking) {
            $this->smsService->sendBookingConfirmationSms($booking);
        }

        // 4. Email Notification
        $emailEnabled = Setting::getValue('email_enabled', 'true') === 'true';
        $emailRecipient = $user?->email;

        if ($emailEnabled && $emailRecipient) {
            $this->sendEmail(
                recipient: $emailRecipient,
                mailable: new BookingConfirmationMail($booking),
                userId: $booking->user_id,
                title: "Ticket Confirmation #{$booking->booking_number}"
            );
        }
    }

    /**
     * Trigger all channels when a booking is cancelled.
     */
    public function notifyBookingCancelled(Booking $booking): void
    {
        $booking->loadMissing(['trip.route.originTerminal', 'trip.route.destinationTerminal', 'user']);

        $trip = $booking->trip;
        $origin = $trip?->route?->originTerminal?->name ?? 'Origin';
        $dest   = $trip?->route?->destinationTerminal?->name ?? 'Destination';
        $fee    = number_format($booking->cancellation_fee);

        // 1. In-App Notification
        if ($booking->user_id) {
            $this->createInAppNotification(
                userId: $booking->user_id,
                type: 'booking_cancelled',
                title: "Booking Cancelled #{$booking->booking_number}",
                message: "Your booking for {$origin} to {$dest} has been cancelled. Cancellation fee: UGX {$fee}.",
                data: [
                    'booking_id'       => $booking->id,
                    'booking_number'   => $booking->booking_number,
                    'cancellation_fee' => $booking->cancellation_fee,
                ]
            );
        }

        // 2. SMS Notification
        $phone = $booking->tickets->first()?->passenger_phone ?? $booking->user?->phone;
        if ($phone && Setting::getValue('notify_on_cancel', 'true') === 'true') {
            $this->smsService->send(
                $phone,
                "LinkBus: Booking #{$booking->booking_number} ({$origin}->{$dest}) has been cancelled. Cancellation fee: UGX {$fee}. For inquiries call +256700123456.",
                $booking->user_id,
                ['title' => 'Booking Cancellation Alert', 'booking_id' => $booking->id]
            );
        }
    }

    /**
     * Trigger In-App notification when passenger is boarded.
     */
    public function notifyPassengerBoarded(Ticket $ticket): void
    {
        $booking = $ticket->booking;
        if ($booking && $booking->user_id) {
            $this->createInAppNotification(
                userId: $booking->user_id,
                type: 'passenger_boarded',
                title: "Boarded Successfully!",
                message: "Passenger {$ticket->passenger_name} checked in on seat {$ticket->seat?->seat_number}. Have a safe journey!",
                data: [
                    'ticket_number'  => $ticket->ticket_number,
                    'seat_number'    => $ticket->seat?->seat_number,
                    'passenger_name' => $ticket->passenger_name,
                ]
            );
        }
    }

    /**
     * Notify all booked passengers when a trip status or schedule changes.
     */
    public function notifyTripUpdate(Trip $trip, string $changeType, array $context = []): void
    {
        $trip->loadMissing(['route.originTerminal', 'route.destinationTerminal', 'bus']);

        // Find all active bookings on this trip
        $bookings = Booking::with(['user', 'tickets.seat'])
            ->where('trip_id', $trip->id)
            ->whereIn('status', ['confirmed', 'pending'])
            ->get();

        if ($bookings->isEmpty()) return;

        $origin = $trip->route?->originTerminal?->name ?? 'Origin';
        $dest   = $trip->route?->destinationTerminal?->name ?? 'Destination';
        $depTime = $trip->departure_time ? $trip->departure_time->format('D d M, h:i A') : 'Scheduled Time';

        [$title, $message, $smsShort] = match ($changeType) {
            'rescheduled' => [
                "Trip Rescheduled ({$origin} to {$dest})",
                "Your departure time has been updated to {$depTime}. Please arrive at {$origin} Terminal 20 minutes before departure.",
                "Departure rescheduled to {$depTime}. Arrive 20m early.",
            ],
            'boarding' => [
                "Boarding Now ({$origin} to {$dest})",
                "Your bus {$trip->bus?->plate_number} is now boarding at {$origin} Terminal. Please proceed to the departure bay with your ticket.",
                "Bus is boarding now at {$origin} Terminal! Please proceed to gate.",
            ],
            'in_transit' => [
                "Trip Departed ({$origin} to {$dest})",
                "Your bus {$trip->bus?->plate_number} has departed from {$origin} Terminal en route to {$dest}.",
                "Bus departed en route to {$dest}.",
            ],
            'cancelled' => [
                "Trip Cancelled ({$origin} to {$dest})",
                "We regret to inform you that your trip scheduled for {$depTime} has been cancelled. Please visit the counter or call +256700123456 for a free transfer or full refund.",
                "Trip CANCELLED. Contact customer care (+256700123456) for instant refund or transfer.",
            ],
            default => [
                "Trip Update: {$origin} to {$dest}",
                $context['custom_message'] ?? "Status updated to " . ucfirst($trip->status),
                $context['custom_message'] ?? "Status is now " . ucfirst($trip->status),
            ],
        };

        $notifyOnReschedule = Setting::getValue('notify_on_reschedule', 'true') === 'true';
        $notifyOnCancel     = Setting::getValue('notify_on_cancel', 'true') === 'true';
        $emailEnabled       = Setting::getValue('email_enabled', 'true') === 'true';

        $shouldSendSms = match ($changeType) {
            'rescheduled' => $notifyOnReschedule,
            'cancelled'   => $notifyOnCancel,
            default       => true,
        };

        foreach ($bookings as $booking) {
            // 1. In-App Notification
            if ($booking->user_id) {
                $this->createInAppNotification(
                    userId: $booking->user_id,
                    type: "trip_{$changeType}",
                    title: $title,
                    message: $message,
                    data: [
                        'trip_id'        => $trip->id,
                        'booking_number' => $booking->booking_number,
                        'status'         => $trip->status,
                        'departure_time' => $trip->departure_time?->toISOString(),
                    ]
                );
            }

            // 2. SMS Alert
            if ($shouldSendSms) {
                $passengerPhones = $booking->tickets->pluck('passenger_phone')->filter()->unique();
                if ($passengerPhones->isEmpty() && $booking->user?->phone) {
                    $passengerPhones = collect([$booking->user->phone]);
                }

                foreach ($passengerPhones as $phone) {
                    $this->smsService->sendTripUpdateSms(
                        trip: $trip,
                        phone: $phone,
                        passengerName: $booking->user?->name ?? 'Passenger',
                        title: $title,
                        message: $smsShort,
                        userId: $booking->user_id
                    );
                }
            }

            // 3. Email Alert
            if ($emailEnabled && $booking->user?->email) {
                $this->sendEmail(
                    recipient: $booking->user->email,
                    mailable: new TripUpdateMail($trip, $title, $message, $booking->user->name),
                    userId: $booking->user_id,
                    title: $title
                );
            }
        }
    }

    /**
     * Dispatch parcel notifications.
     */
    public function notifyParcelStatus(Parcel $parcel, string $event): void
    {
        $parcel->loadMissing(['originTerminal', 'destinationTerminal']);
        $this->smsService->sendParcelStatusSms($parcel, $event);
    }

    /**
     * Send Broadcast Announcement.
     */
    public function sendBroadcast(
        string $title,
        string $message,
        string $target = 'all',
        ?int $tripId = null,
        bool $sendSms = false,
        bool $sendEmail = false
    ): array {
        $usersQuery = User::query();

        if ($target === 'passengers') {
            $usersQuery->whereHas('role', fn($q) => $q->where('slug', 'passenger'));
        } elseif ($target === 'staff') {
            $usersQuery->whereHas('role', fn($q) => $q->whereIn('slug', ['staff', 'admin']));
        } elseif ($target === 'trip' && $tripId) {
            $userIds = Booking::where('trip_id', $tripId)->pluck('user_id')->filter()->unique();
            $usersQuery->whereIn('id', $userIds);
        }

        $users = $usersQuery->get();
        $inAppCount = 0;
        $smsCount   = 0;
        $emailCount = 0;

        foreach ($users as $user) {
            // In-app
            $this->createInAppNotification(
                userId: $user->id,
                type: 'announcement',
                title: $title,
                message: $message,
                data: ['target' => $target]
            );
            $inAppCount++;

            // SMS
            if ($sendSms && !empty($user->phone)) {
                $this->smsService->send(
                    $user->phone,
                    "LinkBus Announcement: {$title} - {$message}",
                    $user->id,
                    ['title' => "Broadcast SMS: {$title}"]
                );
                $smsCount++;
            }

            // Email
            if ($sendEmail && !empty($user->email)) {
                $this->sendEmail(
                    recipient: $user->email,
                    mailable: new GenericNotificationMail(
                        subjectLine: $title,
                        title: $title,
                        bodyContent: $message,
                        userName: $user->name
                    ),
                    userId: $user->id,
                    title: "Broadcast Email: {$title}"
                );
                $emailCount++;
            }
        }

        return [
            'total_users'  => $users->count(),
            'in_app_sent'  => $inAppCount,
            'sms_sent'     => $smsCount,
            'email_sent'   => $emailCount,
        ];
    }

    /**
     * In-App notification helper.
     */
    protected function createInAppNotification(int $userId, string $type, string $title, string $message, ?array $data = null): AppNotification
    {
        return AppNotification::create([
            'user_id' => $userId,
            'type'    => $type,
            'title'   => $title,
            'message' => $message,
            'data'    => $data,
        ]);
    }

    /**
     * Send email and write to notification logs.
     */
    protected function sendEmail(string $recipient, \Illuminate\Mail\Mailable $mailable, ?int $userId = null, ?string $title = null): bool
    {
        try {
            Mail::to($recipient)->send($mailable);

            NotificationLog::create([
                'user_id'   => $userId,
                'channel'   => 'email',
                'recipient' => $recipient,
                'title'     => $title ?? 'Email Notification',
                'message'   => "Email dispatched via " . config('mail.default'),
                'status'    => config('mail.default') === 'log' ? 'simulated' : 'sent',
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error("Failed to send email to {$recipient}: " . $e->getMessage());

            NotificationLog::create([
                'user_id'       => $userId,
                'channel'       => 'email',
                'recipient'     => $recipient,
                'title'         => $title ?? 'Email Notification',
                'message'       => "Email dispatch failed",
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
