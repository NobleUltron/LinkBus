<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkBus Trip Update</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 32px 24px; }
        .alert-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .alert-title { font-size: 16px; font-weight: 700; color: #1e40af; margin-top: 0; margin-bottom: 8px; }
        .alert-message { font-size: 14px; color: #1e3a8a; line-height: 1.6; margin: 0; }
        .trip-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .footer a { color: #2563eb; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>LinkBus Trip Notification</h1>
            <p>Schedule & Status Update</p>
        </div>

        <!-- Body Content -->
        <div class="content">
            <p style="font-size: 15px; margin-top: 0;">
                Hello <strong>{{ $passengerName ?? 'Valued Passenger' }}</strong>,
            </p>

            <!-- Alert Card -->
            <div class="alert-card">
                <h3 class="alert-title">{{ $updateTitle }}</h3>
                <p class="alert-message">{{ $updateMessage }}</p>
            </div>

            <!-- Trip Summary -->
            <div class="trip-card">
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 45%; vertical-align: top;">
                            <div style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase;">Origin</div>
                            <div style="font-size: 15px; font-weight: 800; color: #0f172a;">{{ $trip->route?->originTerminal?->name ?? 'Origin' }}</div>
                            <div style="font-size: 12px; color: #64748b;">Departure: {{ $trip->departure_time ? $trip->departure_time->format('D, d M Y · h:i A') : 'TBD' }}</div>
                        </td>
                        <td style="width: 10%; text-align: center; vertical-align: middle; color: #94a3b8; font-size: 20px;">➔</td>
                        <td style="width: 45%; vertical-align: top; text-align: right;">
                            <div style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase;">Destination</div>
                            <div style="font-size: 15px; font-weight: 800; color: #0f172a;">{{ $trip->route?->destinationTerminal?->name ?? 'Destination' }}</div>
                            <div style="font-size: 12px; color: #64748b;">Status: <strong style="text-transform: capitalize;">{{ $trip->status }}</strong></div>
                        </td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
                If you have questions or require rebooking/assistance, our customer service team is available 24/7 at <strong>+256-700-123456</strong> or at your departure terminal customer counter.
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p style="margin-bottom: 4px;">LinkBus Services Ltd. • Reliable & Safe Travel</p>
            <p style="margin: 0;"><a href="http://localhost:5173">Visit LinkBus Online</a></p>
        </div>
    </div>
</body>
</html>
