import React from 'react';
import type { TripDetail } from '../../types/api';
import { durationLabel, formatTime, minutesBetween } from '../../utils/format';

/** Origin → midpoint → destination timeline for a single departure. */
export function TripTimelineStepper({
  trip,
  compact = false



}: {trip: TripDetail;compact?: boolean;}) {
  const total = minutesBetween(trip.departure_time, trip.arrival_time);
  const midpoint = new Date(new Date(trip.departure_time).getTime() + total / 2 * 60000);
  const stops = [{
    time: formatTime(trip.departure_time),
    name: trip.origin.name,
    city: trip.origin.city,
    label: 'Departure'
  }, ...(compact ? [] : [{
    time: formatTime(midpoint.toISOString()),
    name: 'Rest stop',
    city: `${Math.round(trip.route.distance_km / 2)} km in`,
    label: 'En route'
  }]), {
    time: formatTime(trip.arrival_time),
    name: trip.destination.name,
    city: trip.destination.city,
    label: 'Arrival'
  }];
  return <ol className="relative">
      {stops.map((stop, index) => {
      const last = index === stops.length - 1;
      return <li key={stop.label} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className="absolute left-[7px] top-4 h-full w-0.5 bg-line" aria-hidden />}
            <span className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${index === 0 || last ? 'border-brand-600 bg-brand-600' : 'border-line bg-surface'}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="font-semibold tabular-nums text-fg">{stop.time}</p>
                <p className="truncate text-sm text-fg">{stop.name}</p>
              </div>
              <p className="text-xs text-muted">
                {stop.city} · {stop.label}
              </p>
            </div>
          </li>;
    })}
      <li className="pt-1 text-xs font-medium text-muted">
        Total journey {durationLabel(total)} · {trip.route.distance_km} km
      </li>
    </ol>;
}