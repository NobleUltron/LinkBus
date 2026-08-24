import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArmchairIcon,
  ArrowRightIcon,
  BusIcon,
  CheckCircle2Icon,
  ClockIcon,
  FlameIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TvIcon,
  WifiIcon,
  WindIcon,
  ZapIcon,
} from 'lucide-react';
import type { TripDetail } from '../../types/api';
import { durationLabel, formatDayLabel, formatTime, minutesBetween, money, titleCase } from '../../utils/format';
import { StatusPill } from '../ui/StatusPill';

interface TripResultCardProps {
  trip: TripDetail;
  action?: React.ReactNode;
}

export function TripResultCard({ trip, action }: TripResultCardProps) {
  const duration = minutesBetween(trip.departure_time, trip.arrival_time);
  const seatsLeft = trip.available_seats;
  const isVip = trip.bus.bus_type === 'vip';
  const isSleeper = trip.bus.bus_type === 'sleeper';

  return (
    <article className="card-surface hover-lift group relative overflow-hidden rounded-2xl border border-line p-5 transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg sm:p-6">
      {/* Top Banner & Tags */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={trip.status} />

          {/* Cabin Class Pill */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isVip
                ? 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : isSleeper
                ? 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                : 'border border-brand-500/20 bg-brand-500/10 text-brand-700 dark:text-brand-300'
            }`}
          >
            {isVip && <SparklesIcon className="h-3 w-3" />}
            {titleCase(trip.bus.bus_type)} Coach
          </span>

          {/* Date Label */}
          <span className="text-xs font-semibold text-muted">
            {formatDayLabel(trip.departure_time)}
          </span>
        </div>

        {/* Real-Time Seat Scarcity Pill */}
        <div>
          {seatsLeft <= 4 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:text-red-400 animate-pulse">
              <FlameIcon className="h-3 w-3" />
              Only {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left!
            </span>
          ) : seatsLeft <= 8 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
              <ZapIcon className="h-3 w-3" />
              Filling Fast ({seatsLeft} seats left)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
              <ArmchairIcon className="h-3 w-3 text-brand-600 dark:text-brand-400" />
              {seatsLeft} seats available
            </span>
          )}
        </div>
      </div>

      {/* Center Route Departure & Arrival Timeline */}
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            {/* Origin Departure */}
            <div>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-fg">
                {formatTime(trip.departure_time)}
              </p>
              <p className="text-sm font-bold text-fg">{trip.origin.city}</p>
              <p className="text-xs text-muted truncate max-w-[160px]">{trip.origin.name}</p>
            </div>

            {/* Travel Duration & Route Line */}
            <div className="flex min-w-[140px] flex-col items-center px-3 text-center">
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.6875rem] font-bold text-fg">
                ⏱️ {durationLabel(duration)}
              </span>
              <div className="relative my-2 h-0.5 w-full rounded bg-line">
                <div className="absolute -top-[3px] right-0 h-2 w-2 rounded-full bg-brand-600" />
                <div className="absolute -top-[3px] left-0 h-2 w-2 rounded-full bg-brand-600/40" />
              </div>
              <span className="text-[0.6875rem] font-semibold text-muted">
                {trip.route.distance_km} km • Direct Express
              </span>
            </div>

            {/* Destination Arrival */}
            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold tabular-nums tracking-tight text-fg">
                {formatTime(trip.arrival_time)}
              </p>
              <p className="text-sm font-bold text-fg">{trip.destination.city}</p>
              <p className="text-xs text-muted truncate max-w-[160px]">{trip.destination.name}</p>
            </div>
          </div>

          {/* Coach Fleet & Amenity Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-fg">
              <BusIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              {trip.bus.model} <span className="text-muted font-normal">({trip.bus.plate_number})</span>
            </span>

            <span className="text-line">•</span>

            {/* Amenity Badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-[0.6875rem]">
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 font-medium text-muted">
                <WindIcon className="h-3 w-3 text-sky-500" /> Air Conditioned
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 font-medium text-muted">
                <ZapIcon className="h-3 w-3 text-amber-500" /> USB Charging
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 font-medium text-muted">
                <WifiIcon className="h-3 w-3 text-emerald-500" /> Free Wi-Fi
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 font-medium text-muted">
                <ShieldCheckIcon className="h-3 w-3 text-brand-600" /> 25kg Bag Free
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & Seat Selection CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-line pt-4 lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex items-baseline justify-between sm:block text-left lg:text-right">
            <div>
              <p className="text-xs font-medium text-muted">Base fare per seat</p>
              <p className="text-xl sm:text-2xl font-black tracking-tight text-fg">{money(trip.fare)}</p>
            </div>
            {isVip && (
              <p className="text-[0.6875rem] font-semibold text-amber-700 dark:text-amber-400 sm:mt-0.5">
                VIP cabin included
              </p>
            )}
          </div>

          {action ?? (
            <Link
              to={`/book/${trip.id}`}
              className="inline-flex h-11 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow-sm transition-all duration-150 ease-smooth hover:bg-brand-700 hover:shadow-md active:scale-95 touch-manipulation"
            >
              Select Seats
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}