import React, { useMemo } from 'react';
import { CircleDotIcon, CrownIcon, LockIcon } from 'lucide-react';
import type { TripSeat } from '../../types/models';
import { money } from '../../utils/format';
import { seatFare } from '../../utils/fare';

interface BusCabinSeatMapProps {
  seats: TripSeat[];
  selectedIds: number[];
  onToggle: (seat: TripSeat) => void;
  maxSelectable: number;
  fare: number;
  heldIds?: number[];
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function BusCabinSeatMap({
  seats,
  selectedIds,
  onToggle,
  maxSelectable,
  fare,
  heldIds = []
}: BusCabinSeatMapProps) {
  const rows = useMemo(() => {
    if (!seats || seats.length === 0) return [];

    // Check if any seat number has an alphanumeric letter suffix (e.g. '1A', '2B', '14D')
    const hasLetterSuffix = seats.some((s) => /[A-Za-z]$/.test(s.seat_number.trim()));

    if (hasLetterSuffix) {
      // Mode A: Alphanumeric (e.g. 1A, 1B, 1C, 1D)
      const grouped = new Map<number, TripSeat[]>();
      seats.forEach((seat) => {
        const match = seat.seat_number.trim().match(/^(\d+)/);
        const rowNumber = match ? Number(match[1]) : 1;
        const list = grouped.get(rowNumber) ?? [];
        list.push(seat);
        grouped.set(rowNumber, list);
      });

      return [...grouped.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([rowNumber, rowSeats]) => ({
          rowNumber,
          seats: LETTERS.map((letter) =>
            rowSeats.find((seat) => seat.seat_number.trim().toUpperCase().endsWith(letter)) ?? null
          ),
        }));
    }

    // Mode B: Pure numeric seats (e.g. '1', '2', '3', ... '56')
    const sortedSeats = [...seats].sort((a, b) => {
      const numA = parseInt(a.seat_number, 10);
      const numB = parseInt(b.seat_number, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.seat_number.localeCompare(b.seat_number, undefined, { numeric: true });
    });

    const result: { rowNumber: number; seats: (TripSeat | null)[] }[] = [];
    const seatsPerRow = 4;

    for (let i = 0; i < sortedSeats.length; i += seatsPerRow) {
      const rowSeats = sortedSeats.slice(i, i + seatsPerRow);
      const rowNumber = Math.floor(i / seatsPerRow) + 1;

      result.push({
        rowNumber,
        seats: [
          rowSeats[0] ?? null,
          rowSeats[1] ?? null,
          rowSeats[2] ?? null,
          rowSeats[3] ?? null,
        ],
      });
    }

    return result;
  }, [seats]);

  const atLimit = selectedIds.length >= maxSelectable;

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-sm rounded-2xl sm:rounded-3xl border border-line bg-surface-2/60 p-3 sm:p-5 shadow-sm">
        <div className="mb-3 sm:mb-4 flex items-center justify-between border-b border-dashed border-line pb-2.5 sm:pb-3">
          <p className="eyebrow text-[0.625rem] sm:text-xs">Front of Coach</p>
          <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-[0.6875rem] font-semibold text-muted shadow-2xs">
            <CircleDotIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" aria-hidden />
            Driver Cockpit
          </span>
        </div>

        <div className="space-y-2 sm:space-y-2.5">
          {rows.map((row) => (
            <div key={row.rowNumber} className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-4 sm:w-5 shrink-0 text-center text-[0.6875rem] font-semibold text-faint">
                {row.rowNumber}
              </span>
              {row.seats.map((seat, index) => {
                if (!seat) return <span key={index} className="h-10 sm:h-11 flex-1" />;
                const selected = selectedIds.includes(seat.id) || (seat.locked_by_me && !selectedIds.length);
                const isMyHold = Boolean(seat.locked_by_me) || heldIds.includes(seat.id);
                const isOtherHold = seat.status === 'locked' && !isMyHold && !selected;
                const isBooked = seat.status === 'booked';
                const unavailable = isBooked || isOtherHold;
                const disabled = unavailable || (!selected && atLimit);
                const isVip = seat.seat_class === 'vip';

                let seatTitle = `${seat.seat_number} · ${money(seatFare(fare, seat.seat_class))}`;
                if (isBooked) seatTitle = `Seat ${seat.seat_number} · Confirmed Booked`;
                else if (isOtherHold) seatTitle = `Seat ${seat.seat_number} · Held in checkout (releasing soon if unpaid)`;
                else if (isMyHold) seatTitle = `Seat ${seat.seat_number} · Held by you`;

                return (
                  <React.Fragment key={seat.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(seat)}
                      disabled={disabled}
                      aria-pressed={selected}
                      aria-label={`Seat ${seat.seat_number}, ${isVip ? 'VIP' : 'standard'}, ${
                        unavailable ? 'unavailable' : money(seatFare(fare, seat.seat_class))
                      }`}
                      title={seatTitle}
                      className={[
                        'relative flex h-10 sm:h-11 flex-1 items-center justify-center rounded-lg sm:rounded-xl border text-xs font-bold',
                        'transition-all duration-150 active:scale-90 touch-manipulation',
                        selected
                          ? 'border-brand-600 bg-brand-600 text-white shadow-md ring-2 ring-brand-500/30'
                          : isMyHold
                          ? 'border-amber-500 bg-amber-500/20 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/40 animate-pulse'
                          : isOtherHold
                          ? 'cursor-not-allowed border-dashed border-amber-500/40 bg-amber-500/5 text-amber-700/60 dark:text-amber-300/60 opacity-60'
                          : isBooked
                          ? 'cursor-not-allowed border-line bg-surface-2 text-faint line-through opacity-60'
                          : isVip
                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:border-amber-500'
                          : 'border-line bg-surface text-fg hover:border-brand-600 shadow-2xs',
                        disabled && !unavailable ? 'cursor-not-allowed opacity-40' : '',
                        !disabled ? 'hover:-translate-y-0.5' : '',
                      ].join(' ')}
                    >
                      {seat.seat_number}
                      {isVip && !selected && !unavailable && (
                        <CrownIcon className="absolute right-1 top-1 h-2.5 w-2.5 text-amber-500" aria-hidden />
                      )}
                      {isOtherHold && (
                        <LockIcon className="absolute right-1 top-1 h-2.5 w-2.5 text-amber-500/70" aria-hidden />
                      )}
                    </button>
                    {index === 1 && <span className="w-3 sm:w-5 shrink-0" aria-hidden />}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-line bg-surface" aria-hidden /> Standard {money(fare)}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-amber-500/60 bg-amber-500/20" aria-hidden /> VIP{' '}
          {money(seatFare(fare, 'vip'))}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-brand-600" aria-hidden /> Selected
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-dashed border-amber-500/60 bg-amber-500/10" aria-hidden /> Held in Checkout
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-surface-2 ring-1 ring-line line-through" aria-hidden /> Booked
        </li>
      </ul>
    </div>
  );
}