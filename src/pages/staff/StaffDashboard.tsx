import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BusIcon,
  CheckCircle2Icon,
  ClockIcon,
  PackageCheckIcon,
  QrCodeIcon,
  StoreIcon,
  TicketIcon,
  UserCheckIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Panel } from '../../components/ui/Panel';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState, SkeletonCards } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { useAsync } from '../../hooks/useAsync';
import { useDashboardChannel } from '../../hooks/useRealtime';
import { getStaffDashboard, type StaffDashboard as StaffDashboardData } from '../../services/analytics';
import { formatTime, money } from '../../utils/format';

type ScheduleRow = StaffDashboardData['schedule'][number];

export function StaffDashboard() {
  const { nonce, lastUpdate } = useDashboardChannel();

  const { data, loading, error, reload } = useAsync(
    () => getStaffDashboard(),
    [nonce]
  );

  const columns: Column<ScheduleRow>[] = [
    {
      key: 'time',
      header: 'Departure',
      render: (row) => (
        <div>
          <span className="font-bold tabular-nums text-fg text-sm">
            {formatTime(row.departure_time)}
          </span>
          <span className="block text-[0.625rem] text-muted">Today</span>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Corridor',
      render: (row) => (
        <span className="font-semibold text-fg text-xs">{row.route}</span>
      ),
    },
    {
      key: 'bus',
      header: 'Coach',
      hideBelow: 'sm',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-fg bg-surface-2 px-2 py-0.5 rounded-md border border-line">
          {row.bus}
        </span>
      ),
    },
    {
      key: 'load',
      header: 'Seat Occupancy',
      render: (row) => {
        const capacity = row.capacity || 50;
        const booked = row.booked || 0;
        const pct = capacity === 0 ? 0 : Math.round((booked / capacity) * 100);
        const isNearlyFull = capacity - booked <= 6;

        return (
          <div className="min-w-28">
            <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
              <span className="font-bold tabular-nums text-fg">
                {booked}/{capacity}
              </span>
              <span
                className={`text-[0.6875rem] font-extrabold ${
                  isNearlyFull
                    ? 'text-red-600 dark:text-red-400'
                    : pct >= 60
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2 border border-line">
              <div
                className={`h-full rounded-full transition-all ${
                  isNearlyFull
                    ? 'bg-red-500'
                    : pct >= 60
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Dispatch',
      render: (row) => <StatusPill status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Shift KPI Cards ── */}
      {loading && !data ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today’s Shift Takings"
            value={data?.revenue_today ?? 0}
            format={money}
            icon={<WalletIcon className="h-5 w-5" aria-hidden />}
            emphasis
          />
          <StatCard
            label="Terminal Departures"
            value={data?.trips_today ?? 0}
            trendLabel="scheduled today"
            icon={<BusIcon className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            label="Tickets Issued Today"
            value={data?.bookings_today ?? 0}
            trendLabel="counter & online"
            icon={<TicketIcon className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            label="Passengers Boarded"
            value={data?.check_ins_today ?? 0}
            trendLabel="scanned at gate"
            icon={<UserCheckIcon className="h-5 w-5" aria-hidden />}
          />
        </div>
      )}

      {/* ── Main Operations Grid: Schedule & Rapid Counter Actions ── */}
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr] xl:items-start">
        {/* Today's Schedule */}
        <Panel
          title="Today’s Departure Timetable"
          subtitle={
            lastUpdate
              ? `Live sync · Last updated ${formatTime(lastUpdate.toISOString())}`
              : 'Every departure leaving this terminal today'
          }
          bodyClassName=""
          action={
            <Link
              to="/staff/pos"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Book Walk-in Passenger <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <DataTable<ScheduleRow>
            columns={columns}
            rows={data?.schedule ?? []}
            rowKey={(row) => row.trip_id}
            loading={loading && !data}
            error={error}
            onRetry={reload}
            caption="Today’s schedule"
            empty={
              <EmptyState
                icon={<BusIcon className="h-5 w-5" aria-hidden />}
                title="Nothing scheduled today"
                body="Departures for today will appear here as soon as they are assigned to the timetable."
              />
            }
          />
        </Panel>

        {/* Rapid Counter Actions Panel */}
        <div className="space-y-5">
          <Panel
            title="Station Counter Actions"
            subtitle="Rapid operational tools for ticket cashiers & gate dispatchers"
          >
            <div className="space-y-3">
              {/* POS Ticket Sale */}
              <Link
                to="/staff/pos"
                className="flex items-center gap-3.5 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 transition-all hover:bg-brand-500/10 hover:border-brand-500 hover:shadow-md group"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-950/20 group-hover:scale-105 transition-transform">
                  <StoreIcon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      POS Ticket Desk
                    </span>
                    <span className="text-[0.625rem] font-bold rounded-md bg-brand-500/15 text-brand-700 dark:text-brand-300 px-1.5 py-0.5">
                      Fast Sale
                    </span>
                  </div>
                  <span className="block text-xs text-muted mt-0.5">
                    Issue walk-in tickets with Cash, MoMo, or Card.
                  </span>
                </div>
              </Link>

              {/* QR Boarding Check-in */}
              <Link
                to="/staff/check-in"
                className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-brand-500/40 hover:bg-surface-2 hover:shadow-md group"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform">
                  <QrCodeIcon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      Passenger QR Gate Check-In
                    </span>
                    <span className="text-[0.625rem] font-bold rounded-md bg-surface-2 text-muted px-1.5 py-0.5">
                      Gate Scan
                    </span>
                  </div>
                  <span className="block text-xs text-muted mt-0.5">
                    Scan or type ticket number to board passengers.
                  </span>
                </div>
              </Link>

              {/* Baggage Tagging */}
              <Link
                to="/staff/luggage"
                className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-brand-500/40 hover:bg-surface-2 hover:shadow-md group"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <TicketIcon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      Luggage Weigh & Tag Desk
                    </span>
                    <span className="text-[0.625rem] font-bold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5">
                      20kg Free
                    </span>
                  </div>
                  <span className="block text-xs text-muted mt-0.5">
                    Compute excess weight fees & print luggage barcode tags.
                  </span>
                </div>
              </Link>

              {/* Same Day Parcels */}
              <Link
                to="/staff/parcels"
                className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-brand-500/40 hover:bg-surface-2 hover:shadow-md group"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <PackageCheckIcon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      Cargo & Parcel Acceptance
                    </span>
                    <span className="text-[0.625rem] font-bold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5">
                      Same-Day
                    </span>
                  </div>
                  <span className="block text-xs text-muted mt-0.5">
                    Receive parcels, generate pickup PINs & assign cargo bays.
                  </span>
                </div>
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}