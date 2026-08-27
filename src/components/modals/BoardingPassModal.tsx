import React, { useEffect, useState } from 'react';
import {
  ArrowRightIcon,
  BusIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileTextIcon,
  MapPinIcon,
  PrinterIcon,
  QrCodeIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TicketIcon,
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

  const originCode = (currentTicket.trip.origin.city || 'KLA').slice(0, 3).toUpperCase();
  const destCode = (currentTicket.trip.destination.city || 'DES').slice(0, 3).toUpperCase();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Boarding Pass & Ticket Documents"
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
            <span className="text-[0.6875rem] text-muted hidden lg:inline">
              {format === 'coupon' && 'Landscape Card (204mm × 75mm)'}
              {format === 'thermal' && '80mm POS Roll Thermal Slip'}
              {format === 'a4' && 'A4 Portrait Official E-Ticket'}
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
                : 'Print / Save PDF'}
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
                    {t.seat.seat_number}
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
// FORMAT 1: TRANSIT COUPON (204mm Landscape Card with Perforated Conductor Stub)
// ══════════════════════════════════════════════════════════════════════════════
function CouponPassView({ ticket }: { ticket: TicketDetail }) {
  const originCode = (ticket.trip.origin.city || 'KLA').slice(0, 3).toUpperCase();
  const destCode = (ticket.trip.destination.city || 'DES').slice(0, 3).toUpperCase();

  return (
    <div className="print-doc print-boarding-pass w-[204mm] max-w-[204mm] mx-auto overflow-hidden rounded-2xl border-2 border-slate-300 bg-white text-slate-900 shadow-md flex flex-row">
      {/* ── LEFT SECTION: Passenger Main Boarding Coupon (~72%) ── */}
      <div className="flex-1 flex flex-col justify-between border-r-2 border-dashed border-slate-300 bg-white">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-emerald-700 px-5 py-3 text-white print-header">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-800 font-black shadow-sm">
              <BusIcon className="h-5 w-5 text-emerald-800" />
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
              <p className="text-[0.625rem] text-white/85 font-medium">
                TIN: 1002938481 · Regulated Intercity Carrier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-black uppercase tracking-wider ${
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
        <div className="p-4 space-y-3.5 flex-1 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-500">
                Origin Terminal
              </span>
              <p className="text-base font-black text-slate-900 leading-tight">
                {ticket.trip.origin.city}
              </p>
              <p className="text-[0.6875rem] text-slate-600 truncate max-w-[220px]">
                {ticket.trip.origin.name}
              </p>
            </div>

            <div className="flex flex-col items-center px-3">
              <span className="text-[0.5625rem] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mb-1 border border-emerald-200">
                Direct Intercity
              </span>
              <div className="flex items-center gap-1.5 text-emerald-700">
                <span className="h-0.5 w-10 bg-emerald-600/40 rounded" />
                <BusIcon className="h-4 w-4 text-emerald-700" />
                <span className="h-0.5 w-10 bg-emerald-600/40 rounded" />
              </div>
            </div>

            <div className="text-right">
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-500">
                Destination
              </span>
              <p className="text-base font-black text-slate-900 leading-tight">
                {ticket.trip.destination.city}
              </p>
              <p className="text-[0.6875rem] text-slate-600 truncate max-w-[220px]">
                {ticket.trip.destination.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                Passenger Name
              </span>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5 truncate">
                {ticket.passenger_name}
              </p>
              {ticket.passenger_phone && (
                <p className="text-[0.625rem] text-slate-600 font-mono">{ticket.passenger_phone}</p>
              )}
            </div>

            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                Assigned Seat
              </span>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-lg bg-emerald-700 px-2 font-mono text-sm font-black text-white shadow-sm">
                  {ticket.seat.seat_number}
                </span>
                <div>
                  <p className="font-bold text-slate-900 text-xs">{titleCase(ticket.seat.seat_class)}</p>
                  <p className="text-[0.5625rem] text-slate-500">Main Cabin</p>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                Departure Date
              </span>
              <p className="font-bold text-slate-900 text-xs mt-0.5">
                {formatDate(ticket.trip.departure_time)}
              </p>
              <p className="text-[0.625rem] text-slate-500 font-mono">
                Ref #{ticket.booking.booking_number}
              </p>
            </div>

            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                Scheduled Time
              </span>
              <p className="font-black text-emerald-800 text-sm mt-0.5 tabular-nums">
                {formatTime(ticket.trip.departure_time)}
              </p>
              <p className="text-[0.5625rem] text-amber-700 font-bold">
                Gate Closes 15m Prior
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-[0.6875rem]">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-500 font-semibold">Assigned Coach:</span>{' '}
                <strong className="text-slate-900 font-extrabold font-mono">
                  {ticket.trip.bus.plate_number}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Class:</span>{' '}
                <strong className="text-slate-900 font-bold">
                  {titleCase(ticket.seat.seat_class)} Cruiser
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <span className="text-slate-500 font-semibold">Fare Paid:</span>{' '}
                <strong className="text-slate-900 font-extrabold tabular-nums">
                  {money(ticket.booking.total_amount)}
                </strong>
              </div>
              <span className="rounded bg-white px-2 py-0.5 font-mono text-[0.5625rem] text-slate-700 border border-slate-200">
                {titleCase(ticket.booking.payment_method)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Policy Strip */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[0.5625rem] text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
            <span>
              <strong>Luggage:</strong> 20kg free allowance included · Excess billed at counter.
            </span>
          </div>
          <span className="font-mono text-slate-500">
            24/7 Helpline: +256 700 123 456 · info@linkbus.co.ug
          </span>
        </div>
      </div>

      {/* ── RIGHT SECTION: Perforated Conductor / Gate Audit Stub (~28%) ── */}
      <div className="w-[210px] shrink-0 bg-slate-50 flex flex-col justify-between p-3.5 relative border-l border-slate-200">
        {/* Semicircle Cutouts */}
        <span className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-white border border-slate-300" aria-hidden />
        <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-white border border-slate-300" aria-hidden />

        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-800">
              GATE AUDIT STUB
            </span>
            <span className="font-mono text-[0.5625rem] font-bold text-slate-500">
              {originCode}➔{destCode}
            </span>
          </div>

          <div className="mt-2 space-y-1">
            <p className="text-[0.6875rem] font-extrabold text-slate-900 truncate">
              {ticket.passenger_name}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[0.625rem] font-bold text-slate-500 uppercase">Seat</span>
                <span className="rounded bg-emerald-700 px-2 py-0.5 font-mono text-xs font-black text-white">
                  {ticket.seat.seat_number}
                </span>
              </div>
              <span className="font-mono text-[0.625rem] font-bold text-slate-900">
                {formatTime(ticket.trip.departure_time)}
              </span>
            </div>
          </div>
        </div>

        <div className="my-2 flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
          <QrCode value={ticket.qr_code} size={84} />
          <p className="mt-1 font-mono text-[0.5625rem] font-black text-slate-900 tracking-wider">
            {ticket.ticket_number}
          </p>
        </div>

        <div className="space-y-1.5 border-t border-slate-200 pt-2">
          <Barcode1D value={ticket.ticket_number} height={20} />
          <div className="flex items-center justify-between text-[0.5625rem] font-bold text-slate-600">
            <span>{ticket.trip.bus.plate_number}</span>
            <span className="flex items-center gap-1 text-slate-900">
              <span className="inline-block h-3 w-3 rounded-sm border border-slate-300 bg-white" />
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
          {ticket.trip.origin.city} ➔ {ticket.trip.destination.city}
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
          <span className="text-slate-600">Assigned Coach:</span>
          <span className="font-bold">{ticket.trip.bus.plate_number}</span>
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
        <p>3. Tickets once confirmed are non-transferable.</p>
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
// FORMAT 3: FULL A4 E-TICKET TRAVEL VOUCHER (For Desktop & Official Filing)
// ══════════════════════════════════════════════════════════════════════════════
function A4PassView({ ticket }: { ticket: TicketDetail }) {
  return (
    <div className="print-doc print-a4 w-full max-w-[210mm] mx-auto bg-white p-8 text-slate-900 rounded-2xl border-2 border-slate-300 shadow-md space-y-6">
      {/* ── Top Official Header ── */}
      <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-5">
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
          <span className="inline-block rounded-lg bg-emerald-700 px-3 py-1 text-xs font-black text-white uppercase tracking-wider shadow-sm">
            Official E-Ticket
          </span>
          <p className="text-xs font-mono font-bold text-slate-900 mt-2">
            Ticket No: {ticket.ticket_number}
          </p>
          <p className="text-[0.6875rem] text-slate-500 font-mono">
            Booking Ref: #{ticket.booking.booking_number}
          </p>
        </div>
      </div>

      {/* ── Route Journey Banner ── */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            DEPARTURE FROM
          </span>
          <h2 className="text-2xl font-black text-slate-900">{ticket.trip.origin.city}</h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {ticket.trip.origin.name}
          </p>
          <p className="text-xs font-bold text-emerald-800 mt-2">
            📅 {formatDate(ticket.trip.departure_time)} @ {formatTime(ticket.trip.departure_time)}
          </p>
        </div>

        <div className="flex flex-col items-center px-6">
          <span className="text-[0.6875rem] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-1 border border-emerald-200">
            Direct Intercity Coach
          </span>
          <div className="flex items-center gap-2 text-emerald-700">
            <span className="h-0.5 w-16 bg-emerald-600/40 rounded" />
            <BusIcon className="h-5 w-5" />
            <span className="h-0.5 w-16 bg-emerald-600/40 rounded" />
          </div>
          <span className="text-[0.625rem] text-slate-500 font-mono mt-1">
            Coach Plate: {ticket.trip.bus.plate_number} ({titleCase(ticket.seat.seat_class)})
          </span>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            ARRIVAL AT
          </span>
          <h2 className="text-2xl font-black text-slate-900">{ticket.trip.destination.city}</h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {ticket.trip.destination.name}
          </p>
          <p className="text-xs font-bold text-slate-600 mt-2">
            Estimated Arrival: ~{formatTime(ticket.trip.arrival_time)}
          </p>
        </div>
      </div>

      {/* ── Passenger & Seat Details Matrix ── */}
      <div className="grid grid-cols-3 gap-5 border border-slate-200 rounded-xl p-5 bg-white">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Passenger Details
          </span>
          <p className="text-base font-extrabold text-slate-900 mt-1">
            {ticket.passenger_name}
          </p>
          <p className="text-xs text-slate-600 font-mono mt-0.5">
            Phone: {ticket.passenger_phone || '—'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Status: <strong className="text-emerald-700">Confirmed & Active</strong>
          </p>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Assigned Cabin Seat
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex h-10 w-12 items-center justify-center rounded-xl bg-emerald-700 font-mono text-xl font-black text-white shadow-sm">
              {ticket.seat.seat_number}
            </span>
            <div>
              <p className="font-extrabold text-slate-900 text-sm">
                {titleCase(ticket.seat.seat_class)} Cabin
              </p>
              <p className="text-xs text-slate-500">Reserved Window/Aisle</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200">
          <QrCode value={ticket.qr_code} size={90} />
          <span className="mt-1 font-mono text-[0.625rem] font-bold text-slate-600">
            {ticket.ticket_number}
          </span>
        </div>
      </div>

      {/* ── Payment Summary Table ── */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3">Item Description</th>
              <th className="p-3 text-center">Class</th>
              <th className="p-3 text-center">Seat</th>
              <th className="p-3 text-right">Amount (UGX)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="p-3 font-semibold">
                Coach Fare ({ticket.trip.origin.city} ➔ {ticket.trip.destination.city})
              </td>
              <td className="p-3 text-center uppercase font-mono">{ticket.seat.seat_class}</td>
              <td className="p-3 text-center font-mono font-bold">{ticket.seat.seat_number}</td>
              <td className="p-3 text-right font-mono font-bold">{money(ticket.trip.fare)}</td>
            </tr>
            <tr className="bg-slate-50 font-bold text-sm">
              <td colSpan={3} className="p-3 text-right text-slate-700">
                Total Amount Paid ({titleCase(ticket.booking.payment_method)}):
              </td>
              <td className="p-3 text-right font-mono text-emerald-800 font-black">
                {money(ticket.booking.total_amount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Boarding Instructions & Legal Notice ── */}
      <div className="border-t border-slate-200 pt-4 space-y-2 text-[0.6875rem] text-slate-600">
        <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
          Passenger Notice & Boarding Conditions:
        </h3>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Please present this electronic boarding pass (printed or on your smartphone) at the departure terminal.</li>
          <li>Passengers must arrive at the terminal at least <strong>20 minutes</strong> prior to the scheduled departure time.</li>
          <li>Each passenger is entitled to <strong>20 kg</strong> of free personal luggage. Excess or commercial cargo is billed at counter rates.</li>
          <li>Lost or stolen luggage claims must be reported immediately upon bus arrival with the verified luggage tag stub.</li>
        </ol>
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-[0.625rem] text-slate-500 font-mono">
          <span>Printed: {formatDateTime(new Date())} · LinkBus Uganda System</span>
          <span>Customer Support: +256 700 123 456 · www.linkbus.co.ug</span>
        </div>
      </div>
    </div>
  );
}