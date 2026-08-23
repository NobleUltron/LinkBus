import React, { useMemo } from 'react';
import { CircleDotIcon, CrownIcon } from 'lucide-react';
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
    const grouped = new Map<number, TripSeat[]>();
    seats.forEach((seat) => {
      const rowNumber = Number(seat.seat_number.replace(/[A-D]/g, ''));
      const list = grouped.get(rowNumber) ?? [];
      list.push(seat);
      grouped.set(rowNumber, list);
    });
    return [...grouped.entries()].sort((a, b) => a[0] - b[0]).map(([rowNumber, rowSeats]) => ({
      rowNumber,
      seats: LETTERS.map((letter) => rowSeats.find((seat) => seat.seat_number.endsWith(letter)) ?? null)
    }));
  }, [seats]);
  const atLimit = selectedIds.length >= maxSelectable;
  return <div>
      <div className="mx-auto max-w-sm rounded-3xl border border-line bg-surface-2/60 p-4">
        <div className="mb-4 flex items-center justify-between border-b border-dashed border-line pb-3">
          <p className="eyebrow">Front</p>
          <span className="flex items-center gap-1.5 rounded-lg bg-surface px-2 py-1 text-[0.6875rem] font-semibold text-muted">
            <CircleDotIcon className="h-3.5 w-3.5" aria-hidden />
            Driver
          </span>
        </div>

        <div className="space-y-2">
          {rows.map((row) => <div key={row.rowNumber} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-[0.6875rem] font-semibold text-faint">{row.rowNumber}</span>
              {row.seats.map((seat, index) => {
            if (!seat) return <span key={index} className="h-10 flex-1" />;
            const selected = selectedIds.includes(seat.id);
            const held = heldIds.includes(seat.id);
            const taken = seat.status === 'booked' || seat.status === 'locked' && !held && !selected;
            const disabled = taken || !selected && atLimit;
            const isVip = seat.seat_class === 'vip';
            return <React.Fragment key={seat.id}>
                    <button type="button" onClick={() => onToggle(seat)} disabled={disabled} aria-pressed={selected} aria-label={`Seat ${seat.seat_number}, ${isVip ? 'VIP' : 'standard'}, ${taken ? 'unavailable' : money(seatFare(fare, seat.seat_class))}`} title={taken ? 'Already taken' : `${seat.seat_number} · ${money(seatFare(fare, seat.seat_class))}`} className={['relative flex h-10 flex-1 items-center justify-center rounded-lg border text-xs font-semibold', 'transition-[background-color,border-color,transform,color] duration-150 ease-smooth', selected ? 'border-brand-600 bg-brand-600 text-white' : taken ? 'cursor-not-allowed border-line bg-surface-2 text-faint line-through' : isVip ? 'border-gold-500/60 bg-gold-500/12 text-gold-700 hover:border-gold-500 dark:text-gold-300' : 'border-line bg-surface text-fg hover:border-brand-600', disabled && !taken ? 'cursor-not-allowed opacity-50' : '', !disabled ? 'hover:-translate-y-0.5' : ''].join(' ')}>
                      {seat.seat_number}
                      {isVip && !selected && !taken && <CrownIcon className="absolute right-0.5 top-0.5 h-2.5 w-2.5" aria-hidden />}
                    </button>
                    {index === 1 && <span className="w-4 shrink-0" aria-hidden />}
                  </React.Fragment>;
          })}
            </div>)}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-line bg-surface" aria-hidden /> Standard {money(fare)}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded border border-gold-500/60 bg-gold-500/20" aria-hidden /> VIP{' '}
          {money(seatFare(fare, 'vip'))}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-brand-600" aria-hidden /> Selected
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-surface-2 ring-1 ring-line" aria-hidden /> Taken
        </li>
      </ul>
    </div>;
}