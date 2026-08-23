<?php

namespace App\Mail;

use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TwoFactorCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public string $userName
    ) {}

    public function envelope(): Envelope
    {
        $companyName = Setting::getValue('company_name', 'LinkBus Uganda');
        $fromEmail   = Setting::getValue('email_from_address', config('mail.from.address'));
        $fromName    = Setting::getValue('email_from_name', $companyName);

        return new Envelope(
            from: new Address($fromEmail, $fromName),
            subject: "{$companyName} Security Code: {$this->code}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.two_factor_code',
        );
    }
}
