import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArmchairIcon,
  ArrowRightIcon,
  BusIcon,
  CheckCircle2Icon,
  ClockIcon,
  CompassIcon,
  GaugeIcon,
  MapPinIcon,
  NavigationIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { getDriverTrips } from '../../services/trips';
import type { TripStatus } from '../../types/models';
import {
  durationLabel,
  formatDate,
  formatDayLabel,
  formatTime,
  minutesBetween,
  titleCase,
} from '../../utils/format';

export function DriverDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const isTripsTab = location.pathname.endsWith('/trips');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isAdmin = user?.role === 'admin';
  const { data, loading, error, reload } = useAsync(
    () => getDriverTrips(isAdmin ? undefined : user?.id),
    [user?.id, isAdmin]
  );

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="skeleton h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Panel>
        <ErrorState message={error} onRetry={reload} />
      </Panel>
    );
  }

  const rawTrips = data ?? [];
  const next = rawTrips.find((t) => t.status === 'scheduled' || t.status === 'boarding') || rawTrips[0];

  const filteredTrips = rawTrips.filter((t) => {
    if (statusFilter === 'scheduled' && t.status !== 'scheduled') return false;
    if (statusFilter === 'boarding' && t.status !== 'boarding') return false;
    if (statusFilter === 'in_transit' && t.status !== 'in_transit') return false;
    if (statusFilter === 'completed' && t.status !== 'completed') return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchOrigin = (t.origin?.city || t.origin?.name || '').toLowerCase().includes(q);
      const matchDest = (t.destination?.city || t.destination?.name || '').toLowerCase().includes(q);
      const matchPlate = (t.bus?.plate_number || '').toLowerCase().includes(q);
      const matchDriver = (t.driver_user?.name || '').toLowerCase().includes(q);
      if (!matchOrigin && !matchDest && !matchPlate && !matchDriver) return false;
    }
    return true;
  });

  const scheduledCount = rawTrips.filter((t) => t.status === 'scheduled').length;
  const boardingCount = rawTrips.filter((t) => t.status === 'boarding').length;
  const inTransitCount = rawTrips.filter((t) => t.status === 'in_transit').length;
  const completedCount = rawTrips.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* ── Admin Oversight Notice ── */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <ShieldAlertIcon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              <strong>Admin Mode:</strong> You are logged in as Administrator. Showing all fleet departures across all drivers for cockpit oversight.
            </span>
          </div>
          <Link
            to="/admin/trips"
            className="shrink-0 font-bold underline hover:opacity-80"
          >
            Manage Fleet in Admin ➔
          </Link>
        </div>
      )}

      {/* ── Captain Welcome & Roster Bar ── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              {isTripsTab ? 'Assigned Intercity Departures' : `Captain Cockpit: ${user?.name || 'Coach Captain'}`}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              Certified Captain
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            View your assigned intercity departures, manage passenger boarding manifests, and update live highway transit logs.
          </p>
        </div>

        {next && (
          <Link
            to={`/driver/trips/${next.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95 self-start md:self-auto"
          >
            <UserCheckIcon className="h-4 w-4" />
            Open Next Manifest
          </Link>
        )}
      </div>

      {/* ── Hero Next Departure Cockpit Card (Shown on main dashboard) ── */}
      {!isTripsTab && next && (
        <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-br from-surface to-surface-2 p-6 shadow-sm ring-1 ring-brand-600/20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-xs shadow-sm">
                #1
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Next Immediate Departure
              </span>
            </div>
            <StatusPill status={next.status} />
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-extrabold text-fg sm:text-3xl">
                  {next.origin?.city ?? next.origin?.name ?? 'Departure Station'}
                </span>
                <span className="text-brand-600 dark:text-brand-400 font-bold text-xl">➔</span>
                <span className="text-2xl font-extrabold text-fg sm:text-3xl">
                  {next.destination?.city ?? next.destination?.name ?? 'Arrival Station'}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {formatDayLabel(next.departure_time)} at{' '}
                <strong className="text-fg font-bold">{formatTime(next.departure_time)}</strong> ·
                Arrives ~{formatTime(next.arrival_time)} (
                {durationLabel(minutesBetween(next.departure_time, next.arrival_time))} Highway Transit)
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 font-semibold text-fg border border-line">
                  <MapPinIcon className="h-3.5 w-3.5 text-brand-600" />
                  Departs: {next.origin?.name ?? 'Terminal'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 font-mono font-bold text-fg border border-line">
                  <BusIcon className="h-3.5 w-3.5 text-brand-600" />
                  Coach: {next.bus?.plate_number ?? 'Assigned Coach'} ({titleCase(next.bus?.bus_type ?? 'standard')})
                </span>
              </div>
            </div>

            {/* Occupancy & Manifest Action */}
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-surface p-4 text-xs shadow-sm">
              <div>
                <div className="flex justify-between font-bold text-fg mb-1">
                  <span>Passenger Load</span>
                  <span>
                    {Math.max(0, (next.bus?.capacity ?? 50) - (next.available_seats ?? 0))} / {next.bus?.capacity ?? 50} Booked
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2 border border-line">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{
                      width: `${Math.min(100, Math.round(
                        (Math.max(0, (next.bus?.capacity ?? 50) - (next.available_seats ?? 0)) / (next.bus?.capacity || 1)) * 100
                      ))}%`,
                    }}
                  />
                </div>
              </div>

              <Link
                to={`/driver/trips/${next.id}`}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
              >
                Open Manifest & Board Passengers
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Driver Cockpit KPI Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <BusIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Total Rostered</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {rawTrips.length.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">All Assigned Departures</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ClockIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Gate Boarding</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {boardingCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">Active Check-In Active</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <NavigationIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">En Route Highway</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {inTransitCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">Underway On Corridor</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Completed Trips</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {completedCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">Safely Arrived &amp; Parked</p>
        </div>
      </div>

      {/* ── Search & Filter Controls Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-2 p-1 rounded-xl border border-line text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'all' ? 'bg-brand-600 text-white shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            All Departures ({rawTrips.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('scheduled')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'scheduled' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            Scheduled ({scheduledCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('boarding')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'boarding' ? 'bg-amber-600 text-white shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            Boarding ({boardingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_transit')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'in_transit' ? 'bg-purple-600 text-white shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            In Transit ({inTransitCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative min-w-[220px] flex-1 sm:flex-initial">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden />
          <input
            type="search"
            placeholder="Filter by city, terminal, coach plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-xl border border-line bg-surface pl-9 pr-3 text-xs text-fg placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* ── All Assigned Departures Grid ── */}
      {filteredTrips.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<BusIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden />}
            title={search || statusFilter !== 'all' ? 'No matching departures' : 'No departures rostered'}
            body={
              search || statusFilter !== 'all'
                ? 'Try clearing your search query or selecting a different status filter.'
                : 'When station dispatch rosters you onto an intercity departure, it will appear here with the live passenger manifest.'
            }
          />
        </Panel>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              {isTripsTab ? 'Assigned Departures' : 'All Rostered Departures'} ({filteredTrips.length})
            </h2>
            <span className="text-xs text-muted">Highway Speed Governed · 80 km/h Max</span>
          </div>

          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTrips.map((trip) => {
              const capacity = trip.bus?.capacity || 50;
              const booked = Math.max(0, capacity - (trip.available_seats ?? 0));
              const pct = Math.min(100, Math.round((booked / capacity) * 100));

              return (
                <li
                  key={trip.id}
                  className="card-surface hover-lift flex flex-col justify-between overflow-hidden rounded-2xl border border-line p-5 transition-all duration-200 hover:border-brand-500/40 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 border-b border-line/60 pb-3">
                      <div>
                        <p className="text-xs font-bold text-brand-600 dark:text-brand-400">
                          {formatDayLabel(trip.departure_time)}
                        </p>
                        <p className="mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight text-fg">
                          {formatTime(trip.departure_time)}
                        </p>
                      </div>
                      <StatusPill status={trip.status} />
                    </div>

                    <p className="mt-3 font-extrabold text-fg text-base">
                      {trip.origin?.city ?? trip.origin?.name ?? 'Origin'} ➔ {trip.destination?.city ?? trip.destination?.name ?? 'Destination'}
                    </p>

                    <ul className="mt-3 space-y-2 text-xs text-muted">
                      <li className="flex items-center gap-1.5 truncate">
                        <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                        <span>Terminal: {trip.origin?.name ?? 'Terminal'}</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <BusIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                        <span className="font-mono font-bold text-fg">{trip.bus?.plate_number ?? 'Coach'}</span>
                        <span>· {trip.bus?.model ?? 'Standard'}</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <ArmchairIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                        <span>
                          <strong className="text-fg font-bold">{booked}/{capacity}</strong> ({pct}%) seats booked
                        </span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <ClockIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                        <span>{durationLabel(minutesBetween(trip.departure_time, trip.arrival_time))} Transit</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-5 border-t border-line/60 pt-4">
                    <Link
                      to={`/driver/trips/${trip.id}`}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-fg transition-all hover:border-brand-500 hover:bg-surface-2 hover:text-brand-600"
                    >
                      View Passenger Manifest
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}