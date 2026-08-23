<?php

namespace App\Mail;

use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class GenericNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $subjectLine,
        public string $title,
        public string $bodyContent,
        public ?string $userName = null,
        public ?string $actionUrl = null,
        public ?string $actionText = null
    ) {}

    public function envelope(): Envelope
    {
        $companyName = Setting::getValue('company_name', 'LinkBus Uganda');
        $fromEmail   = Setting::getValue('email_from_address', config('mail.from.address'));
        $fromName    = Setting::getValue('email_from_name', $companyName);

        return new Envelope(
            from: new Address($fromEmail, $fromName),
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.generic_notification',
        );
    }
}
