import React, { useEffect, useState } from 'react';
import {
  ArrowRightIcon,
  BusIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileTextIcon,
  LuggageIcon,
  MapPinIcon,
  PrinterIcon,
  QrCodeIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  StampIcon,
  TicketIcon,
  UserCheckIcon,
  UserIcon,
} from 'lucide-react';
import type { TicketDetail } from '../../services/tickets';
import { formatDate, formatDateTime, formatTime, money, titleCase } from '../../utils/format';
import { Barcode1D } from '../ui/Barcode1D';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { QrCode } from '../ui/QrCode';

export type PassFormat = 'coupon' | 'thermal' | 'a4';

interface BoardingPassModalProps {
  ticket?: TicketDetail | null;
  tickets?: TicketDetail[];
  initialIndex?: number;
  initialFormat?: PassFormat;
  open: boolean;
  autoPrint?: boolean;
  onClose: () => void;
}

export function BoardingPassModal({
  ticket,
  tickets = [],
  initialIndex = 0,
  initialFormat = 'coupon',
  open,
  autoPrint = false,
  onClose,
}: BoardingPassModalProps) {
  // Normalize tickets list
  const ticketList = tickets.length > 0 ? tickets : ticket ? [ticket] : [];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [format, setFormat] = useState<PassFormat>(initialFormat);

  useEffect(() => {
    setCurrentIndex(initialIndex >= 0 && initialIndex < ticketList.length ? initialIndex : 0);
  }, [initialIndex, ticketList.length, open]);

  useEffect(() => {
    setFormat(initialFormat);
  }, [initialFormat, open]);

  const currentTicket = ticketList[currentIndex] || ticketList[0];

  const handlePrint = (printAll: boolean = false) => {
    if (!currentTicket) return;
    const originalTitle = document.title;
    document.title = printAll
      ? `LinkBus-BoardingPasses-Ref-${currentTicket.booking.booking_number}`
      : `LinkBus-BoardingPass-${currentTicket.ticket_number}`;

    // Remove any previous clone if exists
    const existingClone = document.getElementById('boarding-pass-print-clone');
    if (existingClone) existingClone.remove();

    // Create print container
    const cloneContainer = document.createElement('div');
    cloneContainer.id = 'boarding-pass-print-clone';
    cloneContainer.className = `print-boarding-pass-wrapper format-${format}`;

    const ticketsToPrint = printAll ? ticketList : [currentTicket];

    ticketsToPrint.forEach((t, idx) => {
      const el = document.getElementById(`printable-pass-${format}-${t.id}`);
      if (el) {
        const itemClone = el.cloneNode(true) as HTMLElement;
        itemClone.classList.add('print-pass-item');
        if (idx > 0) {
          itemClone.style.pageBreakBefore = 'always';
          itemClone.style.breakBefore = 'page';
        }
        cloneContainer.appendChild(itemClone);
      }
    });

    document.body.appendChild(cloneContainer);

    // Apply format-specific print class to body
    document.body.classList.remove('is-printing-coupon', 'is-printing-thermal', 'is-printing-a4', 'is-printing-boarding-pass');
    document.body.classList.add('is-printing-boarding-pass', `is-printing-${format}`);

    const cleanup = () => {
      document.body.classList.remove('is-printing-boarding-pass', 'is-printing-coupon', 'is-printing-thermal', 'is-printing-a4');
      document.title = originalTitle;
      const c = document.getElementById('boarding-pass-print-clone');
      if (c) c.remove();
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 4000);

    window.print();
  };

  useEffect(() => {
    if (open && autoPrint && currentTicket) {
      const timer = setTimeout(() => {
        handlePrint(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [open, autoPrint, currentTicket?.id]);

  if (ticketList.length === 0 || !currentTicket) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Boarding Pass & Travel Documents"
      subtitle={
        ticketList.length > 1
          ? `Passenger ${currentIndex + 1} of ${ticketList.length} · Ref #${currentTicket.booking.booking_number}`
          : `Ticket #${currentTicket.ticket_number}`
      }
      size="2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          {/* Passenger switcher */}
          <div className="flex items-center gap-2">
            {ticketList.length > 1 && (
              <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-line">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="p-1 rounded-lg text-muted hover:text-fg disabled:opacity-40"
                  aria-label="Previous passenger pass"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-fg px-2 font-mono">
                  {currentIndex + 1} / {ticketList.length}
                </span>
                <button
                  type="button"
                  disabled={currentIndex === ticketList.length - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(ticketList.length - 1, prev + 1))}
                  className="p-1 rounded-lg text-muted hover:text-fg disabled:opacity-40"
                  aria-label="Next passenger pass"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
            <span className="text-[0.6875rem] text-muted hidden lg:inline font-medium">
              {format === 'coupon' && '📐 204mm × 75mm (1/3 A4 DL Landscape Coupon)'}
              {format === 'thermal' && '📐 80mm POS Thermal Continuous Roll Slip'}
              {format === 'a4' && '📐 210mm × 297mm (Standard Full A4 Travel Document)'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="text-xs">
              Close
            </Button>

            {ticketList.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                icon={<PrinterIcon className="h-3.5 w-3.5" />}
                onClick={() => handlePrint(true)}
                className="text-xs border-brand-500/40 text-brand-700 dark:text-brand-300 hover:bg-brand-500/10 font-bold"
              >
                Print All ({ticketList.length} Passes)
              </Button>
            )}

            <Button
              icon={<PrinterIcon className="h-4 w-4" />}
              onClick={() => handlePrint(false)}
              className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              {ticketList.length > 1
                ? `Print Pass (${currentTicket.seat.seat_number})`
                : 'Print / Download PDF'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ─── Top Control Bar: Format Selector & Multi-Passenger Tabs ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          {/* Format Switcher */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-line self-start">
            <button
              type="button"
              onClick={() => setFormat('coupon')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                format === 'coupon'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <TicketIcon className="h-3.5 w-3.5" />
              <span>Transit Coupon</span>
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

            <button
              type="button"
              onClick={() => setFormat('a4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                format === 'a4'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <FileTextIcon className="h-3.5 w-3.5" />
              <span>Full A4 Voucher</span>
            </button>
          </div>

          {/* Passenger Selector Pills */}
          {ticketList.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {ticketList.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all whitespace-nowrap ${
                    idx === currentIndex
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-surface-2 text-muted hover:text-fg border border-line'
                  }`}
                >
                  <span className="font-mono bg-black/20 px-1 py-0.5 rounded text-[0.625rem]">
                    Seat {t.seat.seat_number}
                  </span>
                  <span>{t.passenger_name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Hidden Printable Containers for ALL tickets (used during batch print) ─── */}
        <div className="hidden">
          {ticketList.map((t) => (
            <div key={`hidden-${t.id}`}>
              {/* Hidden Coupon */}
              <div id={`printable-pass-coupon-${t.id}`}>
                <CouponPassView ticket={t} />
              </div>
              {/* Hidden Thermal */}
              <div id={`printable-pass-thermal-${t.id}`}>
                <ThermalPassView ticket={t} />
              </div>
              {/* Hidden A4 */}
              <div id={`printable-pass-a4-${t.id}`}>
                <A4PassView ticket={t} />
              </div>
            </div>
          ))}
        </div>

        {/* ─── Active Preview Canvas ─── */}
        <div className="flex justify-center overflow-x-auto py-2">
          {format === 'coupon' && (
            <div className="w-[204mm] max-w-[204mm] shrink-0">
              <CouponPassView ticket={currentTicket} />
            </div>
          )}

          {format === 'thermal' && (
            <div className="w-[80mm] max-w-[80mm] shrink-0">
              <ThermalPassView ticket={currentTicket} />
            </div>
          )}

          {format === 'a4' && (
            <div className="w-full max-w-[210mm] shrink-0">
              <A4PassView ticket={currentTicket} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMAT 1: TRANSIT COUPON (204mm × 75mm Landscape Card with Perforated Stub)
// ══════════════════════════════════════════════════════════════════════════════
function CouponPassView({ ticket }: { ticket: TicketDetail }) {
  const originCity = ticket.trip.origin.city || 'Kampala';
  const destCity = ticket.trip.destination.city || 'Destination';
  const originCode = originCity.slice(0, 3).toUpperCase();
  const destCode = destCity.slice(0, 3).toUpperCase();

  return (
    <div className="print-doc print-boarding-pass w-[204mm] max-w-[204mm] mx-auto overflow-hidden rounded-2xl border-2 border-slate-300 bg-white text-slate-900 shadow-md flex flex-row">
      {/* ── LEFT SECTION: Passenger Main Boarding Coupon (~72%) ── */}
      <div className="flex-1 flex flex-col justify-between border-r-2 border-dashed border-slate-300 bg-white">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-emerald-700 px-5 py-2.5 text-white print-header">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-emerald-800 font-black shadow-sm">
              <BusIcon className="h-4 w-4 text-emerald-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-white uppercase">
                  LINK BUS SERVICES LTD
                </span>
                <span className="rounded bg-white/25 px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-wider text-white uppercase">
                  Official Travel Pass
                </span>
              </div>
              <p className="text-[0.5625rem] text-white/85 font-medium">
                TIN: 1002938481 · Regulated Intercity Carrier · www.linkbus.co.ug
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.625rem] font-black uppercase tracking-wider ${
                ticket.status === 'active'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : ticket.status === 'used'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : 'bg-slate-200 text-slate-800'
              }`}
            >
              {ticket.status === 'active' ? '✓ Active & Valid' : titleCase(ticket.status)}
            </span>
          </div>
        </div>

        {/* Route & Schedule Grid */}
        <div className="p-3.5 space-y-2.5 flex-1 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">
                Origin Terminal
              </span>
              <p className="text-base font-black text-slate-900 leading-tight">
                {originCity}
              </p>
              <p className="text-[0.625rem] text-slate-600 truncate max-w-[200px]">
                {ticket.trip.origin.name}
              </p>
            </div>

            <div className="flex flex-col items-center px-2">
              <span className="text-[0.5rem] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mb-0.5 border border-emerald-200">
                Direct Intercity
              </span>
              <div className="flex items-center gap-1 text-emerald-700">
                <span className="h-0.5 w-8 bg-emerald-600/40 rounded" />
                <BusIcon className="h-3.5 w-3.5 text-emerald-700" />
                <span className="h-0.5 w-8 bg-emerald-600/40 rounded" />
              </div>
            </div>

            <div className="text-right">
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">
                Destination
              </span>
              <p className="text-base font-black text-slate-900 leading-tight">
                {destCity}
              </p>
              <p className="text-[0.625rem] text-slate-600 truncate max-w-[200px]">
                {ticket.trip.destination.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5 text-xs">
            <div>
              <span className="text-[0.5rem] font-bold uppercase tracking-wider text-slate-500 block">
                Passenger Name
              </span>
              <p className="font-extrabold text-slate-900 text-xs mt-0.5 truncate">
                {ticket.passenger_name}
              </p>
              {ticket.passenger_phone && (
                <p className="text-[0.5625rem] text-slate-600 font-mono">{ticket.passenger_phone}</p>
              )}
            </div>

            <div>
              <span className="text-[0.5rem] font-bold uppercase tracking-wider text-slate-500 block">
                Assigned Seat
              </span>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-emerald-700 px-1.5 font-mono text-xs font-black text-white shadow-sm">
                  {ticket.seat.seat_number}
                </span>
                <div>
                  <p className="font-bold text-slate-900 text-[0.6875rem]">{titleCase(ticket.seat.seat_class)}</p>
                  <p className="text-[0.5rem] text-slate-500">Main Cabin</p>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[0.5rem] font-bold uppercase tracking-wider text-slate-500 block">
                Departure Date
              </span>
              <p className="font-bold text-slate-900 text-[0.6875rem] mt-0.5">
                {formatDate(ticket.trip.departure_time)}
              </p>
              <p className="text-[0.5625rem] text-slate-500 font-mono">
                Ref #{ticket.booking.booking_number}
              </p>
            </div>

            <div>
              <span className="text-[0.5rem] font-bold uppercase tracking-wider text-slate-500 block">
                Scheduled Time
              </span>
              <p className="font-black text-emerald-800 text-xs mt-0.5 tabular-nums">
                {formatTime(ticket.trip.departure_time)}
              </p>
              <p className="text-[0.5rem] text-amber-700 font-bold">
                Gate Closes 15m Prior
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-[0.625rem]">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-slate-500 font-medium">Coach:</span>{' '}
                <strong className="text-slate-900 font-extrabold font-mono">
                  {ticket.trip.bus.plate_number}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Luggage Tag:</span>{' '}
                <strong className="text-slate-900 font-mono">
                  TAG-{ticket.ticket_number.slice(-6)}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div>
                <span className="text-slate-500 font-medium">Fare:</span>{' '}
                <strong className="text-slate-900 font-black tabular-nums">
                  {money(ticket.booking.total_amount)}
                </strong>
              </div>
              <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.5rem] text-slate-700 border border-slate-200 uppercase">
                {ticket.booking.payment_method.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Policy Strip */}
        <div className="border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[0.5rem] text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <ShieldCheckIcon className="h-3 w-3 text-emerald-700 shrink-0" />
            <span>
              <strong>Luggage:</strong> 20kg free allowance · Report to departure terminal 20m prior.
            </span>
          </div>
          <span className="font-mono text-slate-500">
            Helpline: +256 700 123 456
          </span>
        </div>
      </div>

      {/* ── RIGHT SECTION: Perforated Conductor / Gate Audit Stub (~28%) ── */}
      <div className="w-[195px] shrink-0 bg-slate-50 flex flex-col justify-between p-3 relative border-l border-slate-200">
        {/* Semicircle Cutouts */}
        <span className="absolute -top-3 -left-3 h-5 w-5 rounded-full bg-white border border-slate-300" aria-hidden />
        <span className="absolute -bottom-3 -left-3 h-5 w-5 rounded-full bg-white border border-slate-300" aria-hidden />

        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <span className="text-[0.5rem] font-black uppercase tracking-widest text-emerald-800">
              GATE AUDIT STUB
            </span>
            <span className="font-mono text-[0.5rem] font-bold text-slate-500">
              {originCode}➔{destCode}
            </span>
          </div>

          <div className="mt-1.5 space-y-0.5">
            <p className="text-[0.625rem] font-extrabold text-slate-900 truncate">
              {ticket.passenger_name}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[0.5625rem] font-bold text-slate-500 uppercase">Seat</span>
                <span className="rounded bg-emerald-700 px-1.5 py-0.5 font-mono text-[0.625rem] font-black text-white">
                  {ticket.seat.seat_number}
                </span>
              </div>
              <span className="font-mono text-[0.5625rem] font-bold text-slate-900">
                {formatTime(ticket.trip.departure_time)}
              </span>
            </div>
          </div>
        </div>

        <div className="my-1 flex flex-col items-center justify-center p-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
          <QrCode value={ticket.qr_code} size={76} />
          <p className="mt-0.5 font-mono text-[0.5rem] font-black text-slate-900 tracking-wider">
            {ticket.ticket_number}
          </p>
        </div>

        <div className="space-y-1 border-t border-slate-200 pt-1.5">
          <Barcode1D value={ticket.ticket_number} height={16} />
          <div className="flex items-center justify-between text-[0.5rem] font-bold text-slate-600">
            <span>{ticket.trip.bus.plate_number}</span>
            <span className="flex items-center gap-1 text-slate-900">
              <span className="inline-block h-2.5 w-2.5 rounded-xs border border-slate-400 bg-white" />
              [ ] Boarded
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMAT 2: 80mm POS THERMAL RECEIPT SLIP (Continuous Roll Format for Counters)
// ══════════════════════════════════════════════════════════════════════════════
function ThermalPassView({ ticket }: { ticket: TicketDetail }) {
  const originCity = ticket.trip.origin.city || 'Kampala';
  const destCity = ticket.trip.destination.city || 'Destination';

  return (
    <div className="print-doc print-thermal w-[80mm] max-w-[80mm] mx-auto bg-white p-4 text-black font-mono text-xs rounded-xl border border-slate-300 shadow-sm leading-tight">
      {/* Centered Header */}
      <div className="text-center space-y-1">
        <div className="flex justify-center items-center gap-1 font-black text-sm tracking-wider">
          <span>★★★ LINK BUS ★★★</span>
        </div>
        <p className="text-[10px] font-bold uppercase">Link Bus Services Ltd</p>
        <p className="text-[9px]">P.O. Box 28381, Kampala - Uganda</p>
        <p className="text-[9px]">TIN: 1002938481 · Tel: +256 700 123 456</p>
        <div className="border-b border-dashed border-black my-2" />
        <p className="font-black text-xs uppercase tracking-wider">
          BOARDING PASS / TRAVEL RECEIPT
        </p>
      </div>

      {/* Corridor & Departure Box */}
      <div className="my-2 border border-black p-2 text-center rounded-sm bg-slate-50">
        <p className="text-[9px] uppercase font-bold text-slate-600">ROUTE / CORRIDOR</p>
        <p className="text-sm font-black uppercase tracking-wide">
          {originCity} ➔ {destCity}
        </p>
        <p className="text-[10px] font-bold mt-0.5">
          {formatDate(ticket.trip.departure_time)} @ {formatTime(ticket.trip.departure_time)}
        </p>
      </div>

      {/* Large Seat Callout */}
      <div className="my-3 text-center border-y-2 border-black py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider">ASSIGNED SEAT NUMBER</p>
        <div className="text-3xl font-black tracking-widest my-0.5">
          {ticket.seat.seat_number}
        </div>
        <p className="text-[10px] font-bold uppercase">
          {ticket.seat.seat_class} CLASS · MAIN CABIN
        </p>
      </div>

      {/* Key Ticket Details */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-600">Passenger:</span>
          <span className="font-bold truncate max-w-[140px] text-right">{ticket.passenger_name}</span>
        </div>
        {ticket.passenger_phone && (
          <div className="flex justify-between">
            <span className="text-slate-600">Phone:</span>
            <span className="font-bold">{ticket.passenger_phone}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-600">Ticket No:</span>
          <span className="font-bold">{ticket.ticket_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Booking Ref:</span>
          <span className="font-bold">#{ticket.booking.booking_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Coach Plate:</span>
          <span className="font-bold">{ticket.trip.bus.plate_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Luggage Tag:</span>
          <span className="font-bold">TAG-{ticket.ticket_number.slice(-6)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Departure Gate:</span>
          <span className="font-bold">{ticket.trip.origin.name}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-black my-2" />

      {/* Fare & Payment Breakdown */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Fare:</span>
          <span className="font-bold">{money(ticket.trip.fare)}</span>
        </div>
        <div className="flex justify-between font-black text-xs border-t border-dotted border-black pt-1">
          <span>TOTAL PAID:</span>
          <span>{money(ticket.booking.total_amount)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>Payment Mode:</span>
          <span className="font-bold uppercase">{ticket.booking.payment_method.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>Status:</span>
          <span className="font-bold uppercase">PAID & CONFIRMED</span>
        </div>
      </div>

      {/* QR Code */}
      <div className="my-3 flex flex-col items-center justify-center">
        <QrCode value={ticket.qr_code} size={110} />
        <p className="mt-1 font-mono text-[9px] font-bold tracking-widest text-center">
          SCAN AT GATE FOR BOARDING
        </p>
      </div>

      <div className="border-b border-dashed border-black my-2" />

      {/* Terms & Notice */}
      <div className="text-[8.5px] text-center space-y-1 text-slate-700">
        <p>1. Report to departure terminal 20 mins prior.</p>
        <p>2. Maximum free baggage allowance: 20kg.</p>
        <p>3. Keep baggage claim stub until final arrival.</p>
        <p className="font-bold mt-1 text-black">★★★ SAFE JOURNEY WITH LINKBUS ★★★</p>
        <p className="text-[7.5px] text-slate-500 font-mono mt-1">
          Printed: {formatDateTime(new Date())}
        </p>
      </div>

      {/* Tear Line */}
      <div className="text-center text-[8px] tracking-widest text-slate-400 mt-3">
        ✂ - - - - - - - - - - - - - - - - - - - -
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMAT 3: FULL A4 E-TICKET TRAVEL VOUCHER (210mm × 297mm Portrait Document)
// ══════════════════════════════════════════════════════════════════════════════
function A4PassView({ ticket }: { ticket: TicketDetail }) {
  const originCity = ticket.trip.origin.city || 'Kampala';
  const destCity = ticket.trip.destination.city || 'Mubende';
  const luggageTag = `TAG-${originCity.slice(0, 3).toUpperCase()}-${ticket.ticket_number.slice(-6)}`;

  return (
    <div className="print-doc print-a4 w-full max-w-[210mm] mx-auto bg-white p-7 text-slate-900 rounded-2xl border-2 border-slate-300 shadow-md flex flex-col justify-between space-y-5 min-h-[268mm]">
      {/* ── 1. Top Corporate Header ── */}
      <div>
        <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-white font-black shadow-sm">
              <BusIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                Link Bus Services Ltd
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Uganda's Premier Digital Coach & Transit Network · Regulated Intercity Carrier
              </p>
              <p className="text-[0.6875rem] text-slate-500 font-mono mt-0.5">
                Head Office: Namayiba Terminal, Kampala · TIN: 1002938481 · Tel: +256 700 123 456
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block rounded-lg bg-emerald-700 px-3.5 py-1 text-xs font-black text-white uppercase tracking-wider shadow-sm">
              Official E-Ticket
            </span>
            <p className="text-xs font-mono font-black text-slate-900 mt-2">
              Ticket No: {ticket.ticket_number}
            </p>
            <p className="text-[0.6875rem] text-slate-500 font-mono">
              Booking Ref: #{ticket.booking.booking_number}
            </p>
          </div>
        </div>

        {/* ── 2. Route Journey & Schedule Banner ── */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mt-4 flex items-center justify-between">
          <div>
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500">
              DEPARTURE FROM
            </span>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">{originCity}</h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {ticket.trip.origin.name}
            </p>
            <div className="inline-flex items-center gap-1.5 mt-2 rounded-md bg-emerald-100/80 px-2.5 py-1 text-xs font-extrabold text-emerald-900 border border-emerald-200">
              <span>📅 {formatDate(ticket.trip.departure_time)}</span>
              <span>@</span>
              <span className="text-emerald-950 font-black">{formatTime(ticket.trip.departure_time)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center px-6">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-700 bg-white px-3 py-1 rounded-full mb-1 border border-emerald-300 shadow-2xs">
              Direct Intercity Coach
            </span>
            <div className="flex items-center gap-2 text-emerald-700 my-1">
              <span className="h-0.5 w-14 bg-emerald-600/40 rounded" />
              <BusIcon className="h-5 w-5" />
              <span className="h-0.5 w-14 bg-emerald-600/40 rounded" />
            </div>
            <span className="text-[0.6875rem] text-slate-600 font-mono font-bold">
              Coach: {ticket.trip.bus.plate_number} ({titleCase(ticket.seat.seat_class)})
            </span>
          </div>

          <div className="text-right">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500">
              ARRIVAL AT
            </span>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">{destCity}</h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {ticket.trip.destination.name}
            </p>
            <p className="text-xs font-bold text-slate-600 mt-2">
              Est. Arrival: ~{formatTime(ticket.trip.arrival_time)}
            </p>
          </div>
        </div>

        {/* ── 3. Passenger, Seat & Luggage Matrix (4 Columns) ── */}
        <div className="grid grid-cols-4 gap-3 border border-slate-200 rounded-xl p-4 bg-white mt-4">
          <div>
            <span className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider">
              Passenger Details
            </span>
            <p className="text-sm font-extrabold text-slate-900 mt-1 truncate">
              {ticket.passenger_name}
            </p>
            <p className="text-xs text-slate-600 font-mono mt-0.5">
              {ticket.passenger_phone || 'Walk-in'}
            </p>
            <span className="inline-block mt-1 text-[0.625rem] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ✓ Confirmed
            </span>
          </div>

          <div>
            <span className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider">
              Assigned Seat
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex h-9 w-11 items-center justify-center rounded-lg bg-emerald-700 font-mono text-lg font-black text-white shadow-sm">
                {ticket.seat.seat_number}
              </span>
              <div>
                <p className="font-extrabold text-slate-900 text-xs">
                  {titleCase(ticket.seat.seat_class)} Cabin
                </p>
                <p className="text-[0.625rem] text-slate-500">Reserved Window/Aisle</p>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider">
              Baggage Claim Tag
            </span>
            <div className="mt-1 space-y-0.5">
              <p className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200 inline-block">
                {luggageTag}
              </p>
              <p className="text-[0.625rem] text-slate-500">Allowance: 20kg Included</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-xl border border-slate-200">
            <QrCode value={ticket.qr_code} size={78} />
            <span className="mt-0.5 font-mono text-[0.5625rem] font-bold text-slate-600">
              {ticket.ticket_number}
            </span>
          </div>
        </div>

        {/* ── 4. Itemized Payment Summary Table ── */}
        <div className="rounded-xl border border-slate-200 overflow-hidden mt-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[0.625rem] tracking-wider">
              <tr>
                <th className="p-2.5">Item Description</th>
                <th className="p-2.5 text-center">Class</th>
                <th className="p-2.5 text-center">Seat</th>
                <th className="p-2.5 text-right">Amount (UGX)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-2.5 font-semibold">
                  Coach Fare ({originCity} ➔ {destCity})
                </td>
                <td className="p-2.5 text-center uppercase font-mono">{ticket.seat.seat_class}</td>
                <td className="p-2.5 text-center font-mono font-bold">{ticket.seat.seat_number}</td>
                <td className="p-2.5 text-right font-mono font-bold">{money(ticket.trip.fare)}</td>
              </tr>
              <tr className="bg-slate-50 font-bold text-xs">
                <td colSpan={3} className="p-2.5 text-right text-slate-700">
                  Total Amount Paid ({titleCase(ticket.booking.payment_method)}):
                </td>
                <td className="p-2.5 text-right font-mono text-emerald-800 font-black text-sm">
                  {money(ticket.booking.total_amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Official Verification Stamp & Conductor Sign-off Section ── */}
      <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-200 pt-4">
        {/* Boarding Terms */}
        <div className="space-y-1 text-[0.625rem] text-slate-600">
          <h3 className="font-black text-slate-900 uppercase tracking-wider text-[0.6875rem]">
            Passenger Notice & Boarding Conditions:
          </h3>
          <ol className="list-decimal pl-3.5 space-y-0.5 leading-relaxed">
            <li>Present this electronic ticket (printed or on smartphone) at departure gate.</li>
            <li>Arrive at the terminal at least <strong>20 minutes</strong> prior to scheduled departure.</li>
            <li>Free personal luggage allowance is <strong>20 kg</strong>. Excess is billed at counter rates.</li>
            <li>Keep baggage claim tag stub ({luggageTag}) for collection upon arrival.</li>
          </ol>
        </div>

        {/* Official Terminal Stamp Box */}
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/70 flex flex-col justify-between text-center min-h-[90px]">
          <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-500">
            LINK BUS SERVICES · TERMINAL CLEARANCE & STAMP
          </span>
          <div className="py-2 text-[0.625rem] text-slate-400 font-mono">
            [ OFFICIAL DISPATCH STAMP HERE ]
          </div>
          <div className="flex justify-between text-[0.5625rem] text-slate-600 border-t border-slate-200 pt-1 font-mono">
            <span>Date: ____/____/2026</span>
            <span>Agent Signature: __________________</span>
          </div>
        </div>
      </div>

      {/* ── 6. Bottom System Audit Strip ── */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-[0.5625rem] text-slate-500 font-mono">
        <span>Printed: {formatDateTime(new Date())} · LinkBus Uganda Digital System</span>
        <span>24/7 Helpline: +256 700 123 456 · info@linkbus.co.ug · www.linkbus.co.ug</span>
      </div>
    </div>
  );
}