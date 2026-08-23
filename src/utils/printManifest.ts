import type { TripDetail } from '../types/api';
import type { TicketDetail } from '../services/tickets';
import { formatDateTime, formatTime } from './format';

/**
 * Natural sort helper for seat numbers (e.g. 1A, 2A, 10A, 10B).
 */
function compareSeatNumbers(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Prints an official A4 Passenger Manifest sheet cleanly without rendering background page elements.
 */
export function printTripManifest(trip: TripDetail, tickets: TicketDetail[]): void {
  const originalTitle = document.title;
  const departureFormatted = formatDateTime(trip.departure_time);
  const originCity = trip.origin?.city || trip.origin?.name || 'Origin';
  const destCity = trip.destination?.city || trip.destination?.name || 'Destination';
  const coachPlate = trip.bus?.plate_number || 'Unassigned';
  const coachCapacity = trip.bus?.capacity || 50;
  const driverName = trip.driver_user?.name || trip.driver?.name || 'Unassigned';

  document.title = `LinkBus-Manifest-${originCity}-to-${destCity}-${trip.departure_time.slice(0, 10)}`;

  // Remove any previous manifest clone
  const existingClone = document.getElementById('manifest-print-clone');
  if (existingClone) existingClone.remove();

  // Sort tickets by seat number
  const sortedTickets = [...tickets].sort((a, b) =>
    compareSeatNumbers(a.seat?.seat_number, b.seat?.seat_number)
  );

  const totalBooked = sortedTickets.length;
  const boardedCount = sortedTickets.filter((t) => t.status === 'used' || Boolean(t.boarded_at)).length;
  const pendingCount = totalBooked - boardedCount;

  // Build the print container
  const printContainer = document.createElement('div');
  printContainer.id = 'manifest-print-clone';
  printContainer.className = 'print-manifest-sheet';

  // Build table rows
  const rowsHtml =
    sortedTickets.length > 0
      ? sortedTickets
          .map((ticket, index) => {
            const seatNum = ticket.seat?.seat_number || '—';
            const isBoarded = ticket.status === 'used' || Boolean(ticket.boarded_at);
            const statusLabel = isBoarded
              ? `Boarded ${ticket.boarded_at ? formatTime(ticket.boarded_at) : '✓'}`
              : 'Pending';
            const statusClass = isBoarded ? 'status-boarded' : 'status-pending';

            return `
              <tr>
                <td style="text-align: center; font-weight: bold; width: 40px;">${index + 1}</td>
                <td style="font-weight: bold; font-family: monospace; font-size: 13px; text-align: center; width: 60px;">
                  <span class="seat-badge">${seatNum}</span>
                </td>
                <td style="font-weight: 600;">${ticket.passenger_name || '—'}</td>
                <td style="font-family: monospace; font-size: 11px;">${ticket.passenger_phone || '—'}</td>
                <td style="font-family: monospace; font-size: 11px; color: #475569;">${ticket.ticket_number || '—'}</td>
                <td style="text-align: center; width: 100px;">
                  <span class="${statusClass}">${statusLabel}</span>
                </td>
                <td style="width: 90px; border-bottom: 1px dashed #cbd5e1;"></td>
              </tr>
            `;
          })
          .join('')
      : `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">
            No passengers booked on this departure.
          </td>
        </tr>
      `;

  printContainer.innerHTML = `
    <div class="manifest-content">
      <!-- Header -->
      <div class="manifest-header">
        <div class="manifest-brand">
          <div class="manifest-logo">LINKBUS</div>
          <div>
            <h1 class="manifest-title">PASSENGER BOARDING MANIFEST</h1>
            <p class="manifest-subtitle">Official Dispatch & En-Route Passenger Roster</p>
          </div>
        </div>
        <div class="manifest-ref">
          <div class="ref-label">Manifest No.</div>
          <div class="ref-value">MNF-${trip.id.toString().padStart(6, '0')}</div>
          <div class="ref-date">Printed: ${new Date().toLocaleString('en-GB')}</div>
        </div>
      </div>

      <!-- Trip Metadata Grid -->
      <div class="manifest-meta-grid">
        <div class="meta-item">
          <span class="meta-label">CORRIDOR / ROUTE</span>
          <span class="meta-value" style="font-size: 14px; color: #047857;">${originCity} ➔ ${destCity}</span>
          <span class="meta-sub">${trip.origin?.name || originCity} to ${trip.destination?.name || destCity}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">DEPARTURE TIME</span>
          <span class="meta-value">${departureFormatted}</span>
          <span class="meta-sub">Trip ID: #${trip.id}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">COACH / VEHICLE</span>
          <span class="meta-value">${coachPlate}</span>
          <span class="meta-sub">Capacity: ${coachCapacity} Seats</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">CAPTAIN / DRIVER</span>
          <span class="meta-value">${driverName}</span>
          <span class="meta-sub">Status: ${trip.status.toUpperCase()}</span>
        </div>
      </div>

      <!-- Manifest Summary Counts -->
      <div class="manifest-summary-bar">
        <div class="summary-chip">
          <strong>Total Booked:</strong> ${totalBooked} / ${coachCapacity}
        </div>
        <div class="summary-chip" style="color: #047857; background: #ecfdf5; border-color: #a7f3d0;">
          <strong>Boarded:</strong> ${boardedCount}
        </div>
        <div class="summary-chip" style="color: #b45309; background: #fffbeb; border-color: #fde68a;">
          <strong>Pending:</strong> ${pendingCount}
        </div>
        <div class="summary-chip" style="margin-left: auto; color: #64748b;">
          <strong>Load Factor:</strong> ${coachCapacity > 0 ? Math.round((totalBooked / coachCapacity) * 100) : 0}%
        </div>
      </div>

      <!-- Passenger Table -->
      <table class="manifest-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th style="width: 60px; text-align: center;">Seat</th>
            <th>Passenger Name</th>
            <th style="width: 120px;">Phone Number</th>
            <th style="width: 140px;">Ticket No.</th>
            <th style="width: 110px; text-align: center;">Status</th>
            <th style="width: 100px; text-align: center;">Signature</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div class="manifest-signoff-grid">
        <div class="signoff-box">
          <div class="signoff-role">Dispatch Officer / Station Supervisor</div>
          <div class="signoff-line">Name & Signature: ___________________________</div>
          <div class="signoff-date">Date & Time: _________________________________</div>
        </div>
        <div class="signoff-box">
          <div class="signoff-role">Assigned Coach Captain / Driver</div>
          <div class="signoff-line">Name & Signature: ___________________________</div>
          <div class="signoff-date">Departure Odometer / Remarks: _________________</div>
        </div>
      </div>

      <div class="manifest-footer-note">
        LinkBus Services Ltd · Registered Office: Kampala, Uganda · Customer Service: +256 (0) 700 000 000 · Safety Hotline: 112
      </div>
    </div>
  `;

  document.body.appendChild(printContainer);
  document.body.classList.add('is-printing-manifest');

  const cleanup = () => {
    document.body.classList.remove('is-printing-manifest');
    document.title = originalTitle;
    const c = document.getElementById('manifest-print-clone');
    if (c) c.remove();
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(cleanup, 3000);

  window.print();
}
