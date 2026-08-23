import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircleIcon,
  CameraIcon,
  CheckCircle2Icon,
  ClockIcon,
  KeyboardIcon,
  PrinterIcon,
  QrCodeIcon,
  RefreshCwIcon,
  ScanLineIcon,
  ShieldAlertIcon,
  SparklesIcon,
  UserCheckIcon,
  UserIcon,
  ZapIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { BoardingPassModal } from '../../components/modals/BoardingPassModal';
import { CameraQrScanner } from '../../components/scanner/CameraQrScanner';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { QrCode } from '../../components/ui/QrCode';
import { EmptyState, InlineError } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { errorMessage } from '../../hooks/useAsync';
import { checkInTicket, verifyTicket, type TicketDetail } from '../../services/tickets';
import { soundEffects } from '../../utils/audioFeedback';
import { formatDateTime, formatTime, titleCase } from '../../utils/format';

export function CheckIn() {
  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [autoBoard, setAutoBoard] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [boarding, setBoarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [boarded, setBoarded] = useState<TicketDetail | null>(null);
  const [pass, setPass] = useState<TicketDetail | null>(null);
  const [recentScans, setRecentScans] = useState<TicketDetail[]>([]);

  // Background global key listener for USB/Bluetooth handheld barcode scanners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes when typing inside inputs/textareas
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 4) {
          const scanned = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = '';
          processVerification(scanned);
        }
        barcodeBufferRef.current = '';
      } else if (e.key.length === 1) {
        // Typical barcode scanners emit characters with < 50ms interval
        if (timeDiff > 120) {
          barcodeBufferRef.current = '';
        }
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoBoard]);

  const processVerification = async (ticketCode: string) => {
    const clean = ticketCode.trim();
    if (!clean) return;

    setVerifying(true);
    setError(null);
    setBoarded(null);
    setCode(clean);

    try {
      const found = await verifyTicket(clean);
      setTicket(found);

      if (found.status === 'used') {
        soundEffects.playWarningBuzz();
        toast.warning(`Notice: Ticket #${found.ticket_number} was already marked as boarded.`);
      } else if (found.status === 'cancelled') {
        soundEffects.playWarningBuzz();
        toast.error(`Warning: Ticket #${found.ticket_number} has been cancelled.`);
      } else if (found.status === 'pending_payment' || found.booking?.status === 'pending') {
        soundEffects.playWarningBuzz();
        toast.error(`Payment Pending: Please direct passenger to cash counter to complete payment.`);
      } else {
        soundEffects.playSuccessBeep();
        toast.success(`Verified: ${found.passenger_name} (Seat ${found.seat?.seat_number || '—'})`);

        // If Auto-Board mode is enabled, immediately board the passenger
        if (autoBoard && found.status === 'active') {
          executeBoarding(found);
        }
      }
    } catch (err) {
      soundEffects.playWarningBuzz();
      setTicket(null);
      setError(errorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  const executeBoarding = async (targetTicket: TicketDetail) => {
    setBoarding(true);
    setError(null);
    try {
      const updated = await checkInTicket(targetTicket.ticket_number);
      setBoarded(updated);
      setTicket(updated);
      setRecentScans((prev) => [updated, ...prev.filter((p) => p.ticket_number !== updated.ticket_number)].slice(0, 6));
      setCode('');
      soundEffects.playSuccessBeep();
      toast.success(`✅ Boarding Approved: ${updated.passenger_name} · Seat ${updated.seat?.seat_number || '—'}`);
      if (scanMode === 'manual') {
        inputRef.current?.focus();
      }
    } catch (err) {
      soundEffects.playWarningBuzz();
      setError(errorMessage(err));
    } finally {
      setBoarding(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processVerification(code);
  };

  const reset = () => {
    setTicket(null);
    setBoarded(null);
    setError(null);
    setCode('');
    if (scanMode === 'manual') {
      inputRef.current?.focus();
    }
  };

  const originCity = ticket?.trip?.origin?.city || ticket?.trip?.origin?.name || 'Origin';
  const destCity = ticket?.trip?.destination?.city || ticket?.trip?.destination?.name || 'Destination';
  const departureFormatted = ticket?.trip?.departure_time ? formatDateTime(ticket.trip.departure_time) : '—';
  const busPlate = ticket?.trip?.bus?.plate_number || 'Standard Coach';

  return (
    <div className="space-y-6">
      {/* Top Banner with Mode Switcher & Auto-Board Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm font-bold">
            <ScanLineIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-fg tracking-tight">
              Gate Boarding &amp; Ticket Scanner
            </h1>
            <p className="text-xs text-muted">
              Live camera QR decoding, 2D handheld USB barcode scanning, and manual ticket entry.
            </p>
          </div>
        </div>

        {/* Action Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scanner Mode Switch */}
          <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-line">
            <button
              type="button"
              onClick={() => {
                setScanMode('camera');
                reset();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                scanMode === 'camera'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <CameraIcon className="h-3.5 w-3.5" />
              Camera Scanner
            </button>
            <button
              type="button"
              onClick={() => {
                setScanMode('manual');
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                scanMode === 'manual'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <KeyboardIcon className="h-3.5 w-3.5" />
              Barcode / Keypad
            </button>
          </div>

          {/* Auto-Board Fast Mode Toggle */}
          <button
            type="button"
            onClick={() => setAutoBoard(!autoBoard)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              autoBoard
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'bg-surface-2 border-line text-muted hover:text-fg'
            }`}
            title="Automatically approve valid passenger tickets without clicking Confirm"
          >
            <ZapIcon className={`h-3.5 w-3.5 ${autoBoard ? 'text-emerald-600 fill-emerald-600' : 'text-muted'}`} />
            <span>⚡ Rapid Auto-Board {autoBoard ? '(ON)' : '(OFF)'}</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        {/* Left Column: Camera Scanner OR Manual Barcode Input */}
        <div className="space-y-4">
          {scanMode === 'camera' ? (
            <Panel
              title="Live Camera Viewfinder"
              subtitle="Align passenger QR code or Barcode inside the green target reticle"
              bodyClassName="p-3"
            >
              <CameraQrScanner
                onScan={processVerification}
                active={scanMode === 'camera'}
                autoBoard={autoBoard}
              />

              <div className="mt-4 rounded-xl border border-line bg-surface-2/60 p-3.5 text-xs space-y-1.5">
                <p className="font-bold text-fg flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-wider">
                  <ScanLineIcon className="h-3.5 w-3.5 text-brand-600" />
                  Dual Hardware Support Active
                </p>
                <p className="text-muted text-[0.6875rem]">
                  Handheld 1D/2D USB/Bluetooth barcode guns can also be triggered at any moment. Scanned tickets verify automatically.
                </p>
              </div>
            </Panel>
          ) : (
            <Panel
              title="Handheld Barcode & Keypad Entry"
              subtitle="Compatible with all USB & Bluetooth 2D/1D barcode scanners"
            >
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="checkin-code"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted"
                  >
                    Ticket Number or QR Code Payload
                  </label>
                  <div className="relative">
                    <ScanLineIcon
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600 dark:text-brand-400"
                      aria-hidden
                    />
                    <input
                      autoFocus
                      ref={inputRef}
                      id="checkin-code"
                      value={code}
                      onChange={(event) => setCode(event.target.value.toUpperCase())}
                      placeholder="Scan barcode gun or type e.g. TKT-100037-54"
                      className="field field-has-icon font-mono font-bold tracking-wider text-fg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    Auto-focuses for rapid barcode scanner triggers.
                  </p>
                </div>

                {error && <InlineError message={error} />}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    loading={verifying}
                    disabled={!code.trim()}
                    icon={<QrCodeIcon className="h-4 w-4" />}
                  >
                    Verify Ticket
                  </Button>
                  {(ticket || error) && (
                    <Button type="button" variant="ghost" onClick={reset}>
                      Clear
                    </Button>
                  )}
                </div>
              </form>

              {/* Boarding Protocol Rules Card */}
              <div className="mt-6 rounded-2xl border border-line bg-surface-2/60 p-4 text-xs space-y-2">
                <p className="font-bold text-fg uppercase tracking-wider text-[0.6875rem]">
                  Gate Boarding Protocols
                </p>
                <ul className="space-y-1.5 text-muted list-disc list-inside text-[0.6875rem]">
                  <li>Cancelled or unpaid tickets are rejected automatically.</li>
                  <li>Duplicate scans trigger an instant audio &amp; visual timestamp alert.</li>
                  <li>Boarding manifests update in real-time on captain and dispatcher portals.</li>
                </ul>
              </div>
            </Panel>
          )}
        </div>

        {/* Right Column: Verified Passenger Profile & Boarding Action */}
        <Panel
          title={boarded ? 'Passenger Boarded' : ticket ? 'Ticket Verified' : 'Boarding Pass Detail'}
          subtitle={
            ticket
              ? `Ticket #${ticket.ticket_number}`
              : 'Scan or verify a ticket to view passenger identity & seat reservation.'
          }
          action={
            ticket && (
              <Button
                variant="outline"
                size="sm"
                icon={<PrinterIcon className="h-3.5 w-3.5" />}
                onClick={() => setPass(ticket)}
              >
                Open Print Pass
              </Button>
            )
          }
        >
          {!ticket ? (
            <EmptyState
              compact
              icon={<UserCheckIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden />}
              title="Awaiting Ticket Scan"
              body="Point the camera scanner or scan with a barcode gun to view passenger identity, seat number, and departure details."
            />
          ) : (
            <div className="space-y-5">
              {/* Status Alert Banners */}
              {boarded && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2Icon className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span>
                    Passenger successfully checked in &amp; boarded at{' '}
                    {boarded.boarded_at ? formatTime(boarded.boarded_at) : formatTime(new Date().toISOString())}.
                  </span>
                </div>
              )}

              {ticket.status === 'used' && !boarded && (
                <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <AlertCircleIcon className="h-5 w-5 shrink-0 text-amber-600" />
                  <span>
                    Notice: This ticket was already checked in at{' '}
                    {ticket.boarded_at ? formatTime(ticket.boarded_at) : 'earlier today'}.
                  </span>
                </div>
              )}

              {ticket.status === 'cancelled' && (
                <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-800 dark:text-red-300 text-xs font-bold">
                  <ShieldAlertIcon className="h-5 w-5 shrink-0 text-red-600" />
                  <span>
                    Ticket Cancelled: This booking is void and cannot board. Please direct passenger to POS counter.
                  </span>
                </div>
              )}

              {/* Passenger & Ticket Card */}
              <div className="grid gap-5 sm:grid-cols-[1fr_auto] rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
                  <div className="col-span-2">
                    <dt className="font-bold uppercase tracking-wider text-muted text-[0.6875rem]">
                      Passenger Name
                    </dt>
                    <dd className="text-lg font-extrabold text-fg mt-0.5">
                      {ticket.passenger_name}
                    </dd>
                    <dd className="text-muted font-mono text-[0.6875rem]">
                      Phone: {ticket.passenger_phone || 'Walk-in'}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-bold uppercase tracking-wider text-muted text-[0.6875rem]">
                      Assigned Seat
                    </dt>
                    <dd className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white shadow-sm font-mono">
                        {ticket.seat?.seat_number || '—'}
                      </span>
                      <span className="font-bold text-fg">
                        {titleCase(ticket.seat?.seat_class || 'standard')}
                      </span>
                    </dd>
                  </div>

                  <div>
                    <dt className="font-bold uppercase tracking-wider text-muted text-[0.6875rem]">
                      Ticket Status
                    </dt>
                    <dd className="mt-1">
                      <StatusPill status={ticket.status} />
                    </dd>
                  </div>

                  <div className="col-span-2 border-t border-line/60 pt-3">
                    <dt className="font-bold uppercase tracking-wider text-muted text-[0.6875rem]">
                      Intercity Corridor
                    </dt>
                    <dd className="font-bold text-fg text-sm mt-0.5">
                      {originCity} ➔ {destCity}
                    </dd>
                    <dd className="text-muted text-[0.6875rem]">
                      Departs: {departureFormatted}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-bold uppercase tracking-wider text-muted text-[0.6875rem]">
                      Assigned Coach
                    </dt>
                    <dd className="font-bold font-mono text-fg text-xs mt-0.5">
                      {busPlate}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-bold uppercase tracking-wider text-muted text-[0.6875rem]">
                      Booking Reference
                    </dt>
                    <dd className="font-bold font-mono text-fg text-xs mt-0.5">
                      {ticket.booking?.booking_number || '—'}
                    </dd>
                  </div>
                </dl>

                {/* QR Barcode Preview */}
                <div className="flex flex-col items-center justify-center gap-2 border-t sm:border-t-0 sm:border-l border-line/60 sm:pl-5 pt-4 sm:pt-0">
                  <QrCode value={ticket.qr_code || ticket.ticket_number} size={110} />
                  <p className="font-mono text-[0.625rem] text-muted">{ticket.ticket_number}</p>
                </div>
              </div>

              {/* Boarding Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <Button
                  loading={boarding}
                  disabled={ticket.status !== 'active'}
                  icon={<UserCheckIcon className="h-4 w-4" />}
                  onClick={() => executeBoarding(ticket)}
                  className="flex-1 font-bold bg-brand-600 hover:bg-brand-700 text-white"
                >
                  {ticket.status === 'used' ? 'Passenger Already Boarded' : 'Confirm & Board Passenger'}
                </Button>
                <Button variant="outline" onClick={reset}>
                  Next Passenger (Esc)
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {recentScans.length > 0 && (
        <Panel
          title="Recent Boardings (This Gate Session)"
          subtitle="Audit log of passengers approved and boarded at this terminal gate during your shift"
        >
          <div className="divide-y divide-line/60">
            {recentScans.map((scanned) => (
              <div
                key={scanned.ticket_number}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-fg text-sm">{scanned.passenger_name}</span>
                      <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded-md">
                        Seat {scanned.seat?.seat_number || '—'}
                      </span>
                    </div>
                    <p className="text-[0.6875rem] text-muted">
                      Ticket #{scanned.ticket_number} · {(scanned.trip?.origin?.city || 'Origin')} ➔ {(scanned.trip?.destination?.city || 'Destination')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">
                    {scanned.boarded_at ? formatTime(scanned.boarded_at) : formatTime(new Date().toISOString())}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<PrinterIcon className="h-3.5 w-3.5" />}
                    onClick={() => setPass(scanned)}
                  >
                    Boarding Pass
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <BoardingPassModal ticket={pass} open={Boolean(pass)} onClose={() => setPass(null)} />
    </div>
  );
}