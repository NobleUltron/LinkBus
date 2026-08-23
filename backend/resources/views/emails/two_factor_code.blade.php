<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Two-Factor Authentication Security Code</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #ffffff; margin: 0; padding: 32px 16px; }
        .container { max-width: 480px; margin: 0 auto; background-color: #1e293b; padding: 36px 28px; border-radius: 16px; border: 1px solid #334155; text-align: center; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); }
        .brand { font-size: 20px; font-weight: 800; color: #10b981; letter-spacing: -0.02em; margin-bottom: 24px; text-transform: uppercase; }
        .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 8px; }
        .subtitle { color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
        .code-box { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #10b981; background-color: #0f172a; padding: 18px 24px; border-radius: 12px; display: inline-block; margin: 12px 0 24px 0; border: 1px solid #10b981; font-family: 'Courier New', Courier, monospace; }
        .expiry-note { color: #64748b; font-size: 12px; line-height: 1.6; margin-top: 16px; border-top: 1px solid #334155; padding-top: 16px; }
        .footer { margin-top: 24px; font-size: 11px; color: #475569; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="brand">LinkBus Uganda</div>
        <h2 class="title">Two-Factor Authentication</h2>
        <p class="subtitle">
            Hello <strong>{{ $userName }}</strong>, enter the 6-digit verification code below to complete your login:
        </p>

        <div>
            <span class="code-box">{{ $code }}</span>
        </div>

        <div class="expiry-note">
            This verification code is valid for <strong>10 minutes</strong>.<br>
            If you did not request this login attempt, please secure your account and change your password immediately.
        </div>
    </div>
    <div class="footer">
        © {{ date('Y') }} LinkBus Services Ltd. • Security System Notification
    </div>
</body>
</html>
