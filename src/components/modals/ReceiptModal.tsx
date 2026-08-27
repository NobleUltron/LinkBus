import React, { useState } from 'react';
import {
  BusIcon,
  CheckCircle2Icon,
  FileTextIcon,
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

export type ReceiptFormat = 'standard' | 'thermal';

interface ReceiptModalProps {
  booking: BookingDetail | null;
  open: boolean;
  onClose: () => void;
  companyName?: string;
  cashierName?: string;
  amountTendered?: number;
  changeReturned?: number;
  initialFormat?: ReceiptFormat;
}

export function ReceiptModal({
  booking,
  open,
  onClose,
  companyName = 'Link Bus Services Ltd',
  cashierName,
  amountTendered,
  changeReturned,
  initialFormat = 'standard',
}: ReceiptModalProps) {
  const [format, setFormat] = useState<ReceiptFormat>(initialFormat);

  if (!booking) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `LinkBus-Receipt-${booking.booking_number}`;

    const existingClone = document.getElementById('receipt-print-clone');
    if (existingClone) existingClone.remove();

    const printDoc = document.getElementById(`printable-receipt-${format}`);
    let clone: HTMLElement | null = null;

    if (printDoc) {
      clone = printDoc.cloneNode(true) as HTMLElement;
      clone.id = 'receipt-print-clone';
      document.body.appendChild(clone);
    }

    document.body.classList.remove('is-printing-receipt', 'is-printing-thermal', 'is-printing-a4');
    document.body.classList.add('is-printing-receipt', `is-printing-${format === 'thermal' ? 'thermal' : 'a4'}`);

    const cleanup = () => {
      document.body.classList.remove('is-printing-receipt', 'is-printing-thermal', 'is-printing-a4');
      document.title = originalTitle;
      const c = document.getElementById('receipt-print-clone');
      if (c) c.remove();
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 4000);
    window.print();
  };

  const tender = amountTendered && amountTendered >= booking.total_amount ? amountTendered : null;
  const change = changeReturned !== undefined ? changeReturned : tender ? tender - booking.total_amount : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Payment Receipt & Tax Invoice"
      subtitle={`Booking Ref #${booking.booking_number}`}
      size="xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <span className="text-xs text-muted">
            {format === 'standard' ? 'Official Tax Invoice (200mm / A4)' : '80mm POS Thermal Cashier Slip'}
          </span>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="text-xs">
              Close
            </Button>
            <Button
              icon={<PrinterIcon className="h-4 w-4" />}
              onClick={handlePrint}
              className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              Print {format === 'thermal' ? 'Thermal Slip' : 'Receipt (PDF)'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Format Switcher Tabs */}
        <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-line self-start">
          <button
            type="button"
            onClick={() => setFormat('standard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              format === 'standard'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-muted hover:text-fg'
            }`}
          >
            <FileTextIcon className="h-3.5 w-3.5" />
            <span>Standard Tax Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => setFormat('thermal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              format === 'thermal'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-muted hover:text-fg'
            }`}
          >
            <ReceiptIcon className="h-3.5 w-3.5" />
            <span>80mm POS Thermal</span>
          </button>
        </div>

        {/* Hidden Container for Clone */}
        <div className="hidden">
          <div id="printable-receipt-standard">
            <StandardReceiptView
              booking={booking}
              companyName={companyName}
              cashierName={cashierName}
              tender={tender}
              change={change}
            />
          </div>
          <div id="printable-receipt-thermal">
            <ThermalReceiptView
              booking={booking}
              companyName={companyName}
              cashierName={cashierName}
              tender={tender}
              change={change}
            />
          </div>
        </div>

        {/* Active Preview */}
        <div className="flex justify-center overflow-x-auto py-2">
          {format === 'standard' ? (
            <div className="w-full max-w-[200mm]">
              <StandardReceiptView
                booking={booking}
                companyName={companyName}
                cashierName={cashierName}
                tender={tender}
                change={change}
              />
            </div>
          ) : (
            <div className="w-[80mm] max-w-[80mm]">
              <ThermalReceiptView
                booking={booking}
                companyName={companyName}
                cashierName={cashierName}
                tender={tender}
                change={change}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMAT 1: STANDARD 200mm / A4 TAX INVOICE RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
function StandardReceiptView({
  booking,
  companyName,
  cashierName,
  tender,
  change,
}: {
  booking: BookingDetail;
  companyName: string;
  cashierName?: string;
  tender: number | null;
  change: number | null;
}) {
  return (
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
              Head Office: Namayiba Terminal, Kampala, Uganda · Tel: +256 700 123 456
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
          <p className="font-bold text-slate-900 truncate">{cashierName || 'Counter Cashier'}</p>
          <p className="text-[0.625rem] text-slate-500 font-mono">POS Terminal Desk</p>
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
            24/7 Helpline: +256 700 123 456 · info@linkbus.co.ug
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
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMAT 2: 80mm POS THERMAL CASHIER RECEIPT SLIP
// ══════════════════════════════════════════════════════════════════════════════
function ThermalReceiptView({
  booking,
  companyName,
  cashierName,
  tender,
  change,
}: {
  booking: BookingDetail;
  companyName: string;
  cashierName?: string;
  tender: number | null;
  change: number | null;
}) {
  return (
    <div className="print-doc print-thermal w-[80mm] max-w-[80mm] mx-auto bg-white p-4 text-black font-mono text-xs rounded-xl border border-slate-300 shadow-sm leading-tight">
      <div className="text-center space-y-1">
        <div className="font-black text-sm tracking-wider">★★★ LINK BUS ★★★</div>
        <p className="text-[10px] font-bold uppercase">{companyName}</p>
        <p className="text-[9px]">TIN: 1002938481 · Tel: +256 700 123 456</p>
        <p className="text-[9px]">Namayiba Terminal, Kampala, Uganda</p>
        <div className="border-b border-dashed border-black my-2" />
        <p className="font-black text-xs uppercase tracking-wider">
          OFFICIAL POS PAYMENT RECEIPT
        </p>
      </div>

      <div className="space-y-1 text-[11px] my-2">
        <div className="flex justify-between">
          <span className="text-slate-600">Booking Ref:</span>
          <span className="font-bold">#{booking.booking_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Date/Time:</span>
          <span>{formatDateTime(booking.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Cashier:</span>
          <span className="font-bold">{cashierName || 'Counter Agent'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Corridor:</span>
          <span className="font-bold truncate max-w-[140px] text-right">
            {booking.trip?.origin?.city ?? 'Origin'} ➔ {booking.trip?.destination?.city ?? 'Dest'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Departure:</span>
          <span className="font-bold">
            {booking.trip?.departure_time ? formatTime(booking.trip.departure_time) : '—'}
          </span>
        </div>
      </div>

      <div className="border-b border-dashed border-black my-2" />

      {/* Itemized Seats */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between font-bold text-[10px] uppercase text-slate-700">
          <span>Seat & Passenger</span>
          <span>Amount</span>
        </div>
        {(booking.tickets ?? []).map((t) => {
          const seat = booking.seats?.find((s) => s.id === t.trip_seat_id);
          const price = seat?.price || booking.trip?.fare || 0;
          return (
            <div key={t.id} className="flex justify-between items-start py-0.5">
              <div>
                <span className="font-black">[{seat?.seat_number || '—'}]</span>{' '}
                <span className="text-[10px]">{t.passenger_name.split(' ')[0]}</span>
              </div>
              <span className="font-bold">{money(price)}</span>
            </div>
          );
        })}
      </div>

      <div className="border-b border-dashed border-black my-2" />

      {/* Totals */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{money(booking.subtotal)}</span>
        </div>
        {booking.discount_amount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Discount:</span>
            <span>−{money(booking.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-sm border-t border-black pt-1">
          <span>TOTAL PAID:</span>
          <span>{money(booking.total_amount)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Payment:</span>
          <span className="font-bold uppercase">{booking.payment_method.replace('_', ' ')}</span>
        </div>

        {tender !== null && (
          <>
            <div className="flex justify-between text-[10px] border-t border-dotted border-black pt-1">
              <span>Cash Tendered:</span>
              <span>{money(tender)}</span>
            </div>
            {change !== null && (
              <div className="flex justify-between text-[10px] font-bold">
                <span>Change Returned:</span>
                <span>{money(change)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="my-3 flex flex-col items-center justify-center">
        <QrCode value={`RECEIPT:${booking.booking_number}:${booking.total_amount}`} size={90} />
        <p className="mt-1 font-mono text-[8.5px] font-bold tracking-widest">
          #{booking.booking_number}
        </p>
      </div>

      <div className="border-b border-dashed border-black my-2" />

      <div className="text-[8.5px] text-center space-y-1 text-slate-700">
        <p>Official Proof of Payment · VAT Inclusive</p>
        <p className="font-bold text-black">Thank you for traveling with LinkBus!</p>
      </div>

      <div className="text-center text-[8px] tracking-widest text-slate-400 mt-3">
        ✂ - - - - - - - - - - - - - - - - - - - -
      </div>
    </div>
  );
}