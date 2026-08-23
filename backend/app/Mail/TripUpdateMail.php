<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\Trip;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TripUpdateMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Trip $trip,
        public string $updateTitle,
        public string $updateMessage,
        public ?string $passengerName = null
    ) {}

    public function envelope(): Envelope
    {
        $companyName = Setting::getValue('company_name', 'LinkBus Uganda');
        $fromEmail   = Setting::getValue('email_from_address', config('mail.from.address'));
        $fromName    = Setting::getValue('email_from_name', $companyName);

        $origin = $this->trip->route?->originTerminal?->name ?? 'Origin';
        $dest   = $this->trip->route?->destinationTerminal?->name ?? 'Destination';

        return new Envelope(
            from: new Address($fromEmail, $fromName),
            subject: "Important Trip Update: {$origin} to {$dest} — {$this->updateTitle}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.trip_update',
        );
    }
}
