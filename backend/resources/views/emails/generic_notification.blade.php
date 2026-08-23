<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subjectLine }}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #334155 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .content { padding: 32px 24px; }
        .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
        .body-text { font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-line; }
        .btn-container { text-align: center; margin-top: 28px; margin-bottom: 12px; }
        .action-btn { display: inline-block; padding: 12px 28px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>LinkBus Uganda</h1>
        </div>
        <div class="content">
            <p style="font-size: 14px; color: #64748b; margin-top: 0;">
                Hello {{ $userName ?? 'there' }},
            </p>
            <h2 class="title">{{ $title }}</h2>
            <div class="body-text">{{ $bodyContent }}</div>

            @if($actionUrl && $actionText)
            <div class="btn-container">
                <a href="{{ $actionUrl }}" class="action-btn">{{ $actionText }}</a>
            </div>
            @endif
        </div>
        <div class="footer">
            <p style="margin: 0;">LinkBus Services Ltd. • Customer Support: +256-700-123456</p>
        </div>
    </div>
</body>
</html>
