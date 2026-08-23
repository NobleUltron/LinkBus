<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkBus Booking Confirmation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
        .header p { margin: 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 32px 24px; }
        .status-badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; background: #ecfdf5; color: #047857; font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 20px; }
        .trip-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .route-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 16px; }
        .terminal-box h3 { margin: 0 0 4px 0; font-size: 16px; color: #0f172a; }
        .terminal-box p { margin: 0; font-size: 13px; color: #64748b; }
        .info-grid { display: table; width: 100%; margin-top: 12px; }
        .info-row { display: table-row; }
        .info-cell { display: table-cell; padding: 6px 0; font-size: 13px; }
        .info-label { color: #64748b; width: 40%; font-weight: 500; }
        .info-value { color: #0f172a; font-weight: 600; }
        .tickets-table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 24px; }
        .tickets-table th { text-align: left; padding: 10px 12px; background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 700; border-radius: 6px; }
        .tickets-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .fare-breakdown { background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 16px; }
        .fare-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #64748b; }
        .fare-row.total { border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 8px; font-size: 16px; font-weight: 800; color: #0f172a; }
        .notice-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-top: 24px; font-size: 13px; color: #1e40af; line-height: 1.5; }
        .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .footer a { color: #059669; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>LinkBus Uganda</h1>
            <p>Your Booking is Confirmed & Ready</p>
        </div>

        <!-- Body Content -->
        <div class="content">
            <div style="text-align: center;">
                <span class="status-badge">Confirmed Booking #{{ $booking->booking_number }}</span>
            </div>

            <p style="font-size: 15px; margin-top: 0;">
                Hello <strong>{{ $booking->user?->name ?? 'Valued Passenger' }}</strong>,
            </p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Thank you for choosing LinkBus! Your tickets have been reserved and payment successfully processed. Please review your trip schedule below:
            </p>

            <!-- Trip Details -->
            <div class="trip-card">
                <table style="width: 100%; margin-bottom: 12px;">
                    <tr>
                        <td style="width: 45%; vertical-align: top;">
                            <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase;">Origin</div>
                            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">{{ $booking->trip?->route?->originTerminal?->name ?? 'Origin' }}</div>
                            <div style="font-size: 12px; color: #64748b;">{{ $booking->trip?->departure_time ? $booking->trip->departure_time->format('D, d M Y · h:i A') : 'TBD' }}</div>
                        </td>
                        <td style="width: 10%; text-align: center; vertical-align: middle; color: #94a3b8; font-size: 20px;">
                            ➔
                        </td>
                        <td style="width: 45%; vertical-align: top; text-align: right;">
                            <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase;">Destination</div>
                            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">{{ $booking->trip?->route?->destinationTerminal?->name ?? 'Destination' }}</div>
                            <div style="font-size: 12px; color: #64748b;">{{ $booking->trip?->arrival_time ? $booking->trip->arrival_time->format('D, d M Y · h:i A') : 'TBD' }}</div>
                        </td>
                    </tr>
                </table>

                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-cell info-label">Bus Plate / Model:</div>
                        <div class="info-cell info-value">{{ $booking->trip?->bus?->plate_number ?? 'Assigned at terminal' }} ({{ ucfirst($booking->trip?->bus?->bus_type ?? 'Standard') }})</div>
                    </div>
                    <div class="info-row">
                        <div class="info-cell info-label">Payment Method:</div>
                        <div class="info-cell info-value">{{ strtoupper(str_replace('_', ' ', $booking->payment_method)) }}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-cell info-label">Payment Ref:</div>
                        <div class="info-cell info-value">{{ $booking->payment?->transaction_id ?? 'PAID' }}</div>
                    </div>
                </div>
            </div>

            <!-- Passenger Tickets -->
            <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 8px;">Passenger Tickets ({{ $booking->tickets->count() }})</h3>
            <table class="tickets-table">
                <thead>
                    <tr>
                        <th>Passenger</th>
                        <th>Seat</th>
                        <th>Ticket #</th>
                        <th>QR Code</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($booking->tickets as $ticket)
                    <tr>
                        <td><strong>{{ $ticket->passenger_name }}</strong><br><span style="font-size: 11px; color: #64748b;">{{ $ticket->passenger_phone ?? '—' }}</span></td>
                        <td><span style="display: inline-block; padding: 4px 8px; background: #e0f2fe; color: #0369a1; border-radius: 6px; font-weight: 700;">{{ $ticket->seat?->seat_number ?? 'TBD' }}</span></td>
                        <td style="font-family: monospace; font-size: 12px;">{{ $ticket->ticket_number }}</td>
                        <td style="font-family: monospace; font-size: 11px; color: #059669;">{{ $ticket->qr_code }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>

            <!-- Fare Breakdown -->
            <div class="fare-breakdown">
                <table style="width: 100%;">
                    <tr>
                        <td style="font-size: 13px; color: #64748b;">Subtotal ({{ $booking->tickets->count() }} seats)</td>
                        <td style="font-size: 13px; text-align: right; font-weight: 600;">UGX {{ number_format($booking->subtotal) }}</td>
                    </tr>
                    @if($booking->discount_amount > 0)
                    <tr>
                        <td style="font-size: 13px; color: #059669;">Promo Discount</td>
                        <td style="font-size: 13px; text-align: right; color: #059669; font-weight: 600;">- UGX {{ number_format($booking->discount_amount) }}</td>
                    </tr>
                    @endif
                    @if($booking->tax_amount > 0)
                    <tr>
                        <td style="font-size: 13px; color: #64748b;">Taxes & Fees</td>
                        <td style="font-size: 13px; text-align: right; font-weight: 600;">UGX {{ number_format($booking->tax_amount) }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="font-size: 16px; font-weight: 800; color: #0f172a; padding-top: 8px; border-top: 1px solid #e2e8f0;">Total Amount Paid</td>
                        <td style="font-size: 16px; font-weight: 800; color: #059669; text-align: right; padding-top: 8px; border-top: 1px solid #e2e8f0;">UGX {{ number_format($booking->total_amount) }}</td>
                    </tr>
                </table>
            </div>

            <!-- Notice -->
            <div class="notice-box">
                <strong>Important Travel Advice:</strong><br>
                Please arrive at the departure terminal at least <strong>20 minutes</strong> before scheduled departure. Present this email, SMS confirmation, or your ticket QR code at the boarding gate.
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p style="margin-bottom: 4px;">LinkBus Services Ltd. • Customer Support: +256-700-123456</p>
            <p style="margin: 0;"><a href="http://localhost:5173">Manage My Booking Online</a> • <a href="http://localhost:5173/track-parcel">Track Parcels</a></p>
        </div>
    </div>
</body>
</html>
