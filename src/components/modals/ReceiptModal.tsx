import React from 'react';
import {
  BusIcon,
  CheckCircle2Icon,
  PrinterIcon,
  ReceiptIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import type { BookingDetail } from '../../types/api';
import { formatDate, formatDateTime, formatTime, money, titleCase } from '../../utils/format';
import { Barcode1D } from '../ui/Barcode1D';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { QrCode } from '../ui/QrCode';
import { StatusPill } from '../ui/StatusPill';

interface ReceiptModalProps {
  booking: BookingDetail | null;
  open: boolean;
  onClose: () => void;
  companyName?: string;
  cashierName?: string;
  amountTendered?: number;
  changeReturned?: number;
}

export function ReceiptModal({
  booking,
  open,
  onClose,
  companyName = 'Link Bus Services Ltd',
  cashierName,
  amountTendered,
  changeReturned,
}: ReceiptModalProps) {
  if (!booking) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `LinkBus-Receipt-${booking.booking_number}`;

    // Clone the .print-receipt into <body> as a direct child so the
    // print renderer sees it at the very top of the document flow,
    // completely decoupled from the modal portal / backdrop hierarchy.
    const printDoc = document.querySelector('.print-receipt') as HTMLElement | null;
    let clone: HTMLElement | null = null;

    if (printDoc) {
      clone = printDoc.cloneNode(true) as HTMLElement;
      clone.id = 'receipt-print-clone';
      document.body.appendChild(clone);
    }

    // Toggle a class on body so CSS can target "only show the clone"
    document.body.classList.add('is-printing-receipt');

    const cleanup = () => {
      document.body.classList.remove('is-printing-receipt');
      document.title = originalTitle;
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  };

  const tender = amountTendered && amountTendered >= booking.total_amount ? amountTendered : null;
  const change = changeReturned !== undefined ? changeReturned : tender ? tender - booking.total_amount : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Official Payment Receipt"
      subtitle={`Booking Ref #${booking.booking_number}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted">
            Official E-Receipt & Tax Invoice (200mm)
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button icon={<PrinterIcon className="h-4 w-4" />} onClick={handlePrint}>
              Print Receipt (PDF)
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex justify-center p-1">
        {/* Official Receipt Container */}
        <div className="print-doc print-receipt w-full max-w-[200mm] mx-auto rounded-2xl border-2 border-slate-300 bg-white text-slate-900 shadow-md p-6 space-y-4">
          
          {/* Top Brand Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white font-black shadow-sm">
                <BusIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  {companyName}
                </h2>
                <p className="text-[0.6875rem] text-slate-500 font-medium">
                  TIN: 1002938481 · Official Travel E-Receipt & Tax Invoice
                </p>
                <p className="text-[0.625rem] text-slate-500">
                  Head Office: Arua Park / Qualicel Terminal, Kampala, Uganda
                </p>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-black uppercase tracking-wider ${
                  booking.status === 'confirmed' || booking.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {booking.status === 'confirmed' ? '✓ Paid & Confirmed' : titleCase(booking.status)}
              </span>
              <p className="mt-1 text-[0.6875rem] font-mono font-bold text-slate-700">
                #{booking.booking_number}
              </p>
            </div>
          </div>

          {/* Transaction & Issuance Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                Issue Date
              </span>
              <p className="font-bold text-slate-900">{formatDate(booking.created_at)}</p>
              <p className="text-[0.625rem] text-slate-500">{formatTime(booking.created_at)}</p>
            </div>

            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                Payment Channel
              </span>
              <p className="font-extrabold text-slate-900">{titleCase(booking.payment_method)}</p>
              <p className="text-[0.625rem] text-emerald-700 font-bold">Counter Verified</p>
            </div>

            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                Issuing Terminal
              </span>
              <p className="font-bold text-slate-900 truncate">{booking.trip?.origin?.city ?? booking.trip?.origin?.name ?? 'Terminal'}</p>
              <p className="text-[0.625rem] text-slate-500 truncate">{booking.trip?.origin?.name ?? 'Terminal Desk'}</p>
            </div>

            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                Issued By
              </span>
              <p className="font-bold text-slate-900 truncate">{cashierName || 'Counter Agent'}</p>
              <p className="text-[0.625rem] text-slate-500 font-mono">POS Terminal</p>
            </div>
          </div>

          {/* Journey Corridor Summary */}
          <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 border border-emerald-200 p-3 text-xs">
            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-emerald-800">
                Departure Corridor
              </span>
              <p className="text-sm font-black text-slate-900">
                {booking.trip?.origin?.city ?? 'Origin'} ➔ {booking.trip?.destination?.city ?? 'Destination'}
              </p>
              <p className="text-[0.6875rem] text-slate-600">
                {booking.trip?.departure_time ? formatDate(booking.trip.departure_time) : '—'} at{' '}
                <strong className="text-emerald-900">{booking.trip?.departure_time ? formatTime(booking.trip.departure_time) : '—'}</strong>
              </p>
            </div>

            <div className="text-right">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-emerald-800">
                Coach Assignment
              </span>
              <p className="font-mono text-sm font-black text-slate-900">
                {booking.trip?.bus?.plate_number || 'Standard Coach'}
              </p>
              <p className="text-[0.6875rem] text-slate-600 font-medium">
                {booking.trip?.bus?.model || 'Coach Service'}
              </p>
            </div>
          </div>

          {/* Itemized Seats & Tickets Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[0.625rem] tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-3 py-2">Seat</th>
                  <th className="px-3 py-2">Passenger</th>
                  <th className="px-3 py-2">Ticket #</th>
                  <th className="px-3 py-2 text-right">Class / Fare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {(booking.tickets ?? []).map((t) => {
                  const seat = booking.seats?.find((s) => s.id === t.trip_seat_id);
                  const seatPrice = seat?.price || booking.trip?.fare || 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2">
                        <span className="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-md bg-emerald-700 px-1.5 font-mono text-xs font-black text-white">
                          {seat?.seat_number || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-bold text-slate-900">{t.passenger_name}</p>
                        {t.passenger_phone && (
                          <p className="text-[0.625rem] text-slate-500 font-mono">{t.passenger_phone}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[0.6875rem] font-bold text-slate-600">
                        {t.ticket_number}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-bold text-slate-900 tabular-nums">
                          {money(seatPrice)}
                        </span>
                        <span className="block text-[0.5625rem] text-slate-500">
                          {titleCase(seat?.seat_class || 'standard')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Calculation */}
          <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({booking.tickets.length} {booking.tickets.length === 1 ? 'Seat' : 'Seats'})</span>
              <span className="font-semibold tabular-nums text-slate-900">{money(booking.subtotal)}</span>
            </div>

            {booking.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discount / Promo Applied</span>
                <span className="tabular-nums">−{money(booking.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Taxes & Airport/Park Levy (VAT Incl.)</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {booking.tax_amount > 0 ? money(booking.tax_amount) : 'UGX 0 (Exempt)'}
              </span>
            </div>

            <div className="flex items-center justify-between border-t-2 border-slate-900 pt-2 text-sm font-black text-slate-900">
              <span>TOTAL AMOUNT PAID</span>
              <span className="text-base font-black tabular-nums text-emerald-800">
                {money(booking.total_amount)}
              </span>
            </div>

            {/* Cash Tendered & Change Return */}
            {tender !== null && (
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700 mt-2 font-mono">
                <div>
                  <span className="text-slate-500">Cash Tendered:</span>{' '}
                  <strong className="text-slate-900">{money(tender)}</strong>
                </div>
                {change !== null && change >= 0 && (
                  <div>
                    <span className="text-slate-500">Change Returned:</span>{' '}
                    <strong className="text-emerald-700">{money(change)}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barcode & Verification Stub Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <div className="space-y-1 text-[0.5625rem] text-slate-500 max-w-[340px]">
              <p>
                <strong>Passenger Notice:</strong> This is a valid proof of payment for Link Bus Services Ltd. Keep this receipt for official accounting and tax verification.
              </p>
              <p className="font-mono">
                24/7 Helpline: +256 700 000 000 · support@linkbus.co.ug
              </p>
            </div>

            <div className="flex flex-col items-center">
              <QrCode value={`RECEIPT:${booking.booking_number}:${booking.total_amount}`} size={56} />
              <span className="mt-0.5 font-mono text-[0.5625rem] font-bold text-slate-700">
                #{booking.booking_number}
              </span>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  );
}