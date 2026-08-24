import React, { useEffect, useState } from 'react';
import {
  ArrowRightIcon,
  BusIcon,
  CheckSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PrinterIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  UserIcon,
} from 'lucide-react';
import type { TicketDetail } from '../../services/tickets';
import { formatDate, formatTime, money, titleCase } from '../../utils/format';
import { Barcode1D } from '../ui/Barcode1D';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { QrCode } from '../ui/QrCode';

interface BoardingPassModalProps {
  ticket?: TicketDetail | null;
  tickets?: TicketDetail[];
  initialIndex?: number;
  open: boolean;
  autoPrint?: boolean;
  onClose: () => void;
}

export function BoardingPassModal({
  ticket,
  tickets = [],
  initialIndex = 0,
  open,
  autoPrint = false,
  onClose,
}: BoardingPassModalProps) {
  // Normalize tickets list
  const ticketList = tickets.length > 0 ? tickets : ticket ? [ticket] : [];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex >= 0 && initialIndex < ticketList.length ? initialIndex : 0);
  }, [initialIndex, ticketList.length, open]);

  const currentTicket = ticketList[currentIndex] || ticketList[0];

  const handlePrintCurrent = () => {
    if (!currentTicket) return;
    const originalTitle = document.title;
    document.title = `LinkBus-BoardingPass-${currentTicket.ticket_number}`;

    // Remove any previous clone if exists
    const existingClone = document.getElementById('boarding-pass-print-clone');
    if (existingClone) existingClone.remove();

    // Clone the active boarding pass coupon into <body> as a direct child
    const printDoc = document.querySelector('.print-boarding-pass') as HTMLElement | null;
    let clone: HTMLElement | null = null;

    if (printDoc) {
      clone = printDoc.cloneNode(true) as HTMLElement;
      clone.id = 'boarding-pass-print-clone';
      document.body.appendChild(clone);
    }

    // Toggle class on body so print CSS isolates strictly this coupon
    document.body.classList.add('is-printing-boarding-pass');

    const cleanup = () => {
      document.body.classList.remove('is-printing-boarding-pass');
      document.title = originalTitle;
      const c = document.getElementById('boarding-pass-print-clone');
      if (c) c.remove();
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    // Safety fallback cleanup in case afterprint does not fire in some browsers
    setTimeout(cleanup, 3000);

    window.print();
  };

  useEffect(() => {
    if (open && autoPrint && currentTicket) {
      const timer = setTimeout(() => {
        handlePrintCurrent();
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
      title="Digital Boarding Pass"
      subtitle={
        ticketList.length > 1
          ? `Passenger ${currentIndex + 1} of ${ticketList.length} · Ticket #${currentTicket.ticket_number}`
          : `Ticket #${currentTicket.ticket_number}`
      }
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
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
            <p className="text-xs text-muted hidden md:block">
              Landscape Transit Coupon (204mm × 75mm)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button icon={<PrinterIcon className="h-4 w-4" />} onClick={handlePrintCurrent}>
              {ticketList.length > 1 ? `Print Pass (${currentTicket.seat.seat_number})` : 'Print Boarding Pass (PDF)'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* If multiple tickets, show quick passenger pill tabs */}
        {ticketList.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {ticketList.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  idx === currentIndex
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-surface-2 text-muted hover:text-fg border border-line'
                }`}
              >
                <span className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-[0.625rem]">
                  Seat {t.seat.seat_number}
                </span>
                <span>{t.passenger_name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[0.6875rem] text-muted sm:hidden px-1 mb-1">
          <span>💡 Swipe pass horizontally to preview full stub</span>
          <span>Pass {currentIndex + 1} of {ticketList.length}</span>
        </div>

        <div className="overflow-x-auto pb-2 scrollbar-none">
          {/* Horizontal Landscape Ticket Container (204mm x 75mm) */}
          <div className="print-doc print-boarding-pass w-[204mm] max-w-[204mm] mx-auto overflow-hidden rounded-2xl border-2 border-slate-300 bg-white text-slate-900 shadow-md flex flex-row">
            
            {/* ══════════════════════════════════════════════════════════════
                LEFT SECTION: PASSENGER MAIN BOARDING PASS (~72% WIDTH)
               ══════════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col justify-between border-r-2 border-dashed border-slate-300 bg-white">
              
              {/* Top Brand Header Bar */}
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
                      currentTicket.status === 'active'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : currentTicket.status === 'pending_payment'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {currentTicket.status === 'active' ? '✓ Active & Valid' : titleCase(currentTicket.status)}
                  </span>
                </div>
              </div>

              {/* Middle Content: Route & Key Trip Grid */}
              <div className="p-4 space-y-3.5 flex-1 bg-white">
                {/* Hero Route Row */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div>
                    <span className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-500">
                      Origin Terminal
                    </span>
                    <p className="text-base font-black text-slate-900 leading-tight">
                      {currentTicket.trip.origin.city}
                    </p>
                    <p className="text-[0.6875rem] text-slate-600 truncate max-w-[220px]">
                      {currentTicket.trip.origin.name}
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
                      {currentTicket.trip.destination.city}
                    </p>
                    <p className="text-[0.6875rem] text-slate-600 truncate max-w-[220px]">
                      {currentTicket.trip.destination.name}
                    </p>
                  </div>
                </div>

                {/* Passenger & Schedule Matrix (4 Columns) */}
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                      Passenger Name
                    </span>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5 truncate">
                      {currentTicket.passenger_name}
                    </p>
                    {currentTicket.passenger_phone && (
                      <p className="text-[0.625rem] text-slate-600 font-mono">{currentTicket.passenger_phone}</p>
                    )}
                  </div>

                  <div>
                    <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                      Assigned Seat
                    </span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-lg bg-emerald-700 px-2 font-mono text-sm font-black text-white shadow-sm">
                        {currentTicket.seat.seat_number}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{titleCase(currentTicket.seat.seat_class)}</p>
                        <p className="text-[0.5625rem] text-slate-500">Main Cabin</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                      Departure Date
                    </span>
                    <p className="font-bold text-slate-900 text-xs mt-0.5">
                      {formatDate(currentTicket.trip.departure_time)}
                    </p>
                    <p className="text-[0.625rem] text-slate-500 font-mono">
                      Ref #{currentTicket.booking.booking_number}
                    </p>
                  </div>

                  <div>
                    <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                      Scheduled Time
                    </span>
                    <p className="font-black text-emerald-800 text-sm mt-0.5 tabular-nums">
                      {formatTime(currentTicket.trip.departure_time)}
                    </p>
                    <p className="text-[0.5625rem] text-amber-700 font-bold">
                      Gate Closes 15m Prior
                    </p>
                  </div>
                </div>

                {/* Coach & Financial Summary Bar */}
                <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-[0.6875rem]">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-slate-500 font-semibold">Assigned Coach:</span>{' '}
                      <strong className="text-slate-900 font-extrabold font-mono">
                        {currentTicket.trip.bus.plate_number}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">Class:</span>{' '}
                      <strong className="text-slate-900 font-bold">
                        {titleCase(currentTicket.seat.seat_class)} Cruiser
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-slate-500 font-semibold">Fare Paid:</span>{' '}
                      <strong className="text-slate-900 font-extrabold tabular-nums">
                        {money(currentTicket.booking.total_amount)}
                      </strong>
                    </div>
                    <span className="rounded bg-white px-2 py-0.5 font-mono text-[0.5625rem] text-slate-700 border border-slate-200">
                      {titleCase(currentTicket.booking.payment_method)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Passenger Policy Strip */}
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[0.5625rem] text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Luggage:</strong> 20kg free allowance included · Excess billed at counter.
                  </span>
                </div>
                <span className="font-mono text-slate-500">
                  24/7 Helpline: +256 700 000 000 · support@linkbus.co.ug
                </span>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                RIGHT SECTION: PERFORATED CONDUCTOR / GATE AUDIT STUB (~28%)
               ══════════════════════════════════════════════════════════════ */}
            <div className="w-[210px] shrink-0 bg-slate-50 flex flex-col justify-between p-3.5 relative border-l border-slate-200">
              {/* Top & Bottom Semicircle Perforation Cutouts */}
              <span
                className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-white border border-slate-300"
                aria-hidden
              />
              <span
                className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-white border border-slate-300"
                aria-hidden
              />

              {/* Stub Header */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-800">
                    GATE AUDIT STUB
                  </span>
                  <span className="font-mono text-[0.5625rem] font-bold text-slate-500">
                    {originCode}➔{destCode}
                  </span>
                </div>

                {/* Passenger & Seat Quick Summary */}
                <div className="mt-2 space-y-1">
                  <p className="text-[0.6875rem] font-extrabold text-slate-900 truncate">
                    {currentTicket.passenger_name}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.625rem] font-bold text-slate-500 uppercase">Seat</span>
                      <span className="rounded bg-emerald-700 px-2 py-0.5 font-mono text-xs font-black text-white">
                        {currentTicket.seat.seat_number}
                      </span>
                    </div>
                    <span className="font-mono text-[0.625rem] font-bold text-slate-900">
                      {formatTime(currentTicket.trip.departure_time)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Barcode & QR Code */}
              <div className="my-2 flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                <QrCode value={currentTicket.qr_code} size={84} />
                <p className="mt-1 font-mono text-[0.5625rem] font-black text-slate-900 tracking-wider">
                  {currentTicket.ticket_number}
                </p>
              </div>

              {/* 1D Laser Barcode & Conductor Boarding Checkbox */}
              <div className="space-y-1.5 border-t border-slate-200 pt-2">
                <Barcode1D value={currentTicket.ticket_number} height={20} />
                
                <div className="flex items-center justify-between text-[0.5625rem] font-bold text-slate-600">
                  <span>{currentTicket.trip.bus.plate_number}</span>
                  <span className="flex items-center gap-1 text-slate-900">
                    <span className="inline-block h-3 w-3 rounded-sm border border-slate-300 bg-white" />
                    [ ] Boarded
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Modal>
  );
}