import React, { useEffect, useState } from 'react';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  CoinsIcon,
  PrinterIcon,
  UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BookingDetail } from '../../types/api';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { confirmCashPayment } from '../../services/bookings';
import { errorMessage } from '../../hooks/useAsync';
import { formatDateTime, money } from '../../utils/format';

interface CashCollectionModalProps {
  booking: BookingDetail | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updatedBooking: BookingDetail, tenderAmount: number, changeAmount: number, autoPrintReceipt: boolean) => void;
}

export function CashCollectionModal({
  booking,
  open,
  onClose,
  onSuccess,
}: CashCollectionModalProps) {
  const [tenderInput, setTenderInput] = useState<string>('');
  const [autoPrint, setAutoPrint] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize or reset tender input when booking opens
  useEffect(() => {
    if (booking) {
      setTenderInput(String(booking.total_amount || 0));
      setAutoPrint(true);
      setLoading(false);
    }
  }, [booking, open]);

  if (!booking) return null;

  const totalAmount = booking.total_amount || 0;
  const tenderNumber = Number(tenderInput.replace(/[^0-9]/g, '')) || 0;
  const change = Math.max(0, tenderNumber - totalAmount);
  const isShort = tenderNumber < totalAmount;
  const shortAmount = totalAmount - tenderNumber;

  // Generate sensible quick-cash presets
  const presets = Array.from(
    new Set([
      totalAmount,
      Math.ceil(totalAmount / 10000) * 10000,
      Math.ceil(totalAmount / 50000) * 50000,
      100000,
    ])
  ).filter((val) => val >= totalAmount);

  const handleConfirm = async () => {
    if (isShort) {
      toast.error(`Cash tendered is short by ${money(shortAmount)}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await confirmCashPayment(booking.id);
      toast.success(res.message || `Cash collection confirmed for Booking #${booking.booking_number}!`);
      onSuccess(res.booking, tenderNumber, change, autoPrint);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const primaryPassenger =
    booking.tickets?.[0]?.passenger_name || booking.passenger?.name || 'Walk-in Passenger';
  const primaryPhone =
    booking.tickets?.[0]?.passenger_phone || booking.passenger?.phone || 'No phone recorded';

  const originCity =
    booking.trip?.origin?.city || booking.trip?.origin?.name || 'Origin';
  const destCity =
    booking.trip?.destination?.city || booking.trip?.destination?.name || 'Destination';
  const departureFormatted = booking.trip?.departure_time
    ? formatDateTime(booking.trip.departure_time)
    : '—';
  const busPlate = booking.trip?.bus?.plate_number || 'Standard Coach';
  const seatsList =
    (booking.seats ?? []).map((s) => s.seat_number).join(', ') ||
    `${booking.seats?.length ?? 0} seats`;
  const ticketCount = booking.tickets?.length ?? 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Station Counter Cash Collection"
      subtitle={`Booking Reference #${booking.booking_number || '—'}`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-print-receipt"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <label
              htmlFor="auto-print-receipt"
              className="text-xs font-semibold text-fg cursor-pointer select-none flex items-center gap-1.5"
            >
              <PrinterIcon className="h-3.5 w-3.5 text-muted" />
              Open printable official receipt on confirm
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-950/20"
              icon={<CheckCircle2Icon className="h-4 w-4" />}
              loading={loading}
              onClick={handleConfirm}
            >
              Confirm Cash &amp; Issue Passes
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Booking Summary Card */}
        <div className="rounded-2xl border border-line bg-surface-2/50 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[0.6875rem] uppercase font-bold text-muted tracking-wider">
                Passenger / Customer
              </span>
              <p className="font-extrabold text-sm text-fg flex items-center gap-1.5 mt-0.5">
                <UserIcon className="h-4 w-4 text-brand-600" />
                {primaryPassenger}
              </p>
              <p className="text-muted mt-0.5">{primaryPhone}</p>
            </div>

            <div className="text-right">
              <span className="text-[0.6875rem] uppercase font-bold text-muted tracking-wider">
                Corridor &amp; Departure
              </span>
              <p className="font-bold text-fg flex items-center gap-1 mt-0.5 justify-end">
                {originCity} ➔ {destCity}
              </p>
              <p className="text-muted mt-0.5">{departureFormatted}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-line pt-3">
            <div>
              <span className="text-muted block text-[0.6875rem]">Assigned Coach</span>
              <span className="font-mono font-bold text-fg">{busPlate}</span>
            </div>
            <div>
              <span className="text-muted block text-[0.6875rem]">Seats Reserved</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">
                {seatsList}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[0.6875rem]">Tickets Count</span>
              <span className="font-bold text-fg">
                {ticketCount} boarding pass{ticketCount === 1 ? '' : 'es'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Balance Due Callout */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Total Cash Balance Due
          </span>
          <div className="mt-1 font-mono text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
            {money(totalAmount)}
          </div>
          <p className="text-[0.6875rem] text-emerald-800/80 dark:text-emerald-300/80 mt-1">
            Includes all passenger fares, seat reservations, taxes &amp; active discounts
          </p>
        </div>

        {/* Cash Tendered & Change Calculator */}
        <div className="rounded-2xl border border-line bg-surface p-4 space-y-3.5">
          <div>
            <label
              htmlFor="cash-tendered-input"
              className="block text-xs font-bold uppercase tracking-wider text-fg mb-1.5"
            >
              Amount Handed by Customer (UGX)
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-muted pointer-events-none font-bold text-xs">
                <BanknoteIcon className="h-4 w-4 text-emerald-600" />
                UGX
              </div>
              <input
                id="cash-tendered-input"
                type="number"
                min={0}
                step={1000}
                value={tenderInput}
                onChange={(e) => setTenderInput(e.target.value)}
                placeholder={String(totalAmount)}
                className="w-full h-11 rounded-xl border border-line bg-surface-2/60 pl-16 pr-4 font-mono text-base font-bold text-fg focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[0.6875rem] font-bold uppercase text-muted tracking-wider">
              Quick Tender Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTenderInput(String(preset))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border ${
                    tenderNumber === preset
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-surface-2 text-fg border-line hover:border-brand-500 hover:bg-surface-2/80'
                  }`}
                >
                  {preset === totalAmount ? `Exact (${money(preset)})` : money(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Change Display Box */}
          <div className="border-t border-line pt-3">
            {isShort ? (
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <AlertTriangleIcon className="h-4 w-4 text-amber-600 shrink-0" />
                  Amount is short
                </span>
                <span className="font-mono font-extrabold text-sm tabular-nums">
                  Need +{money(shortAmount)}
                </span>
              </div>
            ) : change > 0 ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <CoinsIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                  Change to Return to Customer
                </span>
                <span className="font-mono font-black text-base text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {money(change)}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-surface-2 border border-line p-3 text-muted">
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                  Exact Cash Tendered
                </span>
                <span className="font-mono font-bold text-xs text-fg">No Change Due</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-[0.6875rem] text-muted text-center italic">
          Confirming cash collection will immediately activate all passenger tickets and update the trip manifest for gate boarding.
        </p>
      </div>
    </Modal>
  );
}
