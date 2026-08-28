import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  BellRingIcon,
  BriefcaseIcon,
  Building2Icon,
  BusIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  FileSpreadsheetIcon,
  PackageCheckIcon,
  PlusIcon,
  RadioIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
  RouteIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StoreIcon,
  TagIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
  ZapIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DataTable, type Column } from '../../components/data/DataTable';
import { LiveStatusModal } from '../../components/modals/LiveStatusModal';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { useDashboardChannel } from '../../hooks/useRealtime';
import { getDashboardStats, type Timeframe } from '../../services/analytics';
import type { BookingDetail } from '../../types/api';
import { formatDateTime, formatTime, money, moneyShort } from '../../utils/format';

const timeframes: {
  value: Timeframe;
  label: string;
}[] = [
  { value: '7days', label: '7 days' },
  { value: '30days', label: '30 days' },
  { value: '90days', label: '90 days' },
];

const DOUGHNUT_COLORS = ['#16a34a', '#22c55e', '#eab308', '#0ea5e9', '#8b5cf6'];

const axisStyle = {
  fontSize: 11,
  fill: 'var(--text-faint)',
};

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-md">
      <p className="font-semibold text-fg text-[0.8125rem]">{label ?? payload[0]?.name}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey ?? entry.name} className="mt-1 flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shadow-sm"
            style={{ background: entry.color || entry.stroke || '#16a34a' }}
          />
          <span className="font-extrabold font-mono text-fg">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: 'drop-shadow(0px 3px 8px rgba(0,0,0,0.35))',
          transition: 'all 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      />
    </g>
  );
};

export function AdminDashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('30days');
  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const { nonce, lastUpdate } = useDashboardChannel();

  const { data, loading, error, reload } = useAsync(
    () => getDashboardStats(timeframe),
    [timeframe, nonce]
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Executive';

  const columns: Column<BookingDetail>[] = [
    {
      key: 'booking',
      header: 'Booking #',
      render: (booking) => (
        <div>
          <span className="font-mono font-bold text-fg bg-surface-2 px-1.5 py-0.5 rounded text-xs border border-line">
            #{booking.booking_number}
          </span>
          <p className="text-[0.6875rem] text-muted mt-0.5">{formatDateTime(booking.created_at)}</p>
        </div>
      ),
    },
    {
      key: 'passenger',
      header: 'Passenger',
      render: (booking) => (
        <div>
          <span className="font-bold text-fg text-xs block">{booking.passenger?.name ?? 'Walk-in Customer'}</span>
          <p className="text-[0.6875rem] text-muted">{booking.passenger?.phone ?? 'POS Counter'}</p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Corridor',
      hideBelow: 'sm',
      render: (booking) => {
        const origin = (booking.trip as any)?.origin?.city ?? (booking.trip as any)?.route?.originTerminal?.city ?? (booking.trip as any)?.route?.origin ?? '';
        const destination = (booking.trip as any)?.destination?.city ?? (booking.trip as any)?.route?.destinationTerminal?.city ?? (booking.trip as any)?.route?.destination ?? '';
        const routeName = (booking.trip as any)?.route?.name ?? (origin && destination ? `${origin} → ${destination}` : 'Transit Corridor');
        return (
          <span className="text-xs font-semibold text-fg">
            {routeName}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (booking) => <StatusPill status={booking.status} />,
    },
    {
      key: 'total',
      header: 'Amount',
      align: 'right',
      render: (booking) => (
        <span className="font-extrabold font-mono tabular-nums text-fg text-xs">{money(booking.total_amount)}</span>
      ),
    },
  ];

  const renderMobileBookingCard = (booking: BookingDetail) => {
    const origin = (booking.trip as any)?.origin?.city ?? (booking.trip as any)?.route?.originTerminal?.city ?? (booking.trip as any)?.route?.origin ?? '';
    const destination = (booking.trip as any)?.destination?.city ?? (booking.trip as any)?.route?.destinationTerminal?.city ?? (booking.trip as any)?.route?.destination ?? '';
    const routeName = (booking.trip as any)?.route?.name ?? (origin && destination ? `${origin} → ${destination}` : 'Transit Corridor');

    return (
      <div className="p-3.5 bg-surface hover:bg-surface-2/60 transition-colors space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-fg bg-surface-2 px-1.5 py-0.5 rounded text-[0.6875rem] border border-line">
              #{booking.booking_number}
            </span>
            <span className="text-[0.625rem] text-muted">{formatDateTime(booking.created_at)}</span>
          </div>
          <StatusPill status={booking.status} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-bold text-fg block">{booking.passenger?.name ?? 'Walk-in Customer'}</span>
            <span className="text-muted text-[0.6875rem]">{routeName}</span>
          </div>
          <span className="font-extrabold font-mono tabular-nums text-fg text-sm">{money(booking.total_amount)}</span>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <Panel>
        <ErrorState message={error} onRetry={reload} />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Executive Unified Command Header ── */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Executive Command Center</h1>
            <button
              type="button"
              onClick={() => setStatusModalOpen(true)}
              title="Click to view live system telemetry and diagnostics"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40 active:scale-95 cursor-pointer shadow-sm hover-lift"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Live Operations</span>
              <span className="text-[0.625rem] opacity-75 underline decoration-dotted">Details →</span>
            </button>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted mt-1" aria-live="polite">
            <span>
              {greeting}, <strong className="text-fg">{firstName}</strong>
            </span>
            <span className="text-faint">·</span>
            <span>All transit corridors operational across Uganda</span>
            <span className="text-faint">·</span>
            <button
              type="button"
              onClick={() => setStatusModalOpen(true)}
              title="Click to view full subsystem matrix"
              className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-muted hover:text-fg transition-colors"
            >
              <RadioIcon className="h-3 w-3 text-brand-600 dark:text-brand-400" />
              {lastUpdate ? `Synced ${formatTime(lastUpdate.toISOString())}` : 'Real-time telemetry'}
            </button>
          </p>
        </div>

        {/* Executive Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Timeframe Filter Buttons */}
          <div role="group" aria-label="Timeframe" className="inline-flex items-center rounded-xl border border-line bg-surface p-1 shadow-sm">
            {timeframes.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTimeframe(option.value)}
                aria-pressed={timeframe === option.value}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  timeframe === option.value
                    ? 'bg-brand-600 text-white shadow-sm font-bold'
                    : 'text-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Quick Manual Refresh Button */}
          <button
            type="button"
            onClick={async () => {
              await reload();
              toast.success('Live dashboard data synchronized');
            }}
            disabled={loading}
            title="Refresh dashboard metrics"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted shadow-sm transition-all hover:bg-surface-2 hover:text-fg hover-lift disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          {/* Quick Reports Link */}
          <Link
            to="/admin/reports"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-fg shadow-sm transition-all hover:bg-surface-2 hover-lift"
          >
            <FileSpreadsheetIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Reports</span>
          </Link>
        </div>
      </div>

      {/* ── 1-Click Operations Quick Actions Ribbon ── */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-none rounded-2xl border border-line bg-surface p-3 sm:p-3.5 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-muted mr-1 hidden md:inline shrink-0">
          Quick Actions:
        </span>
        <Link
          to="/admin/trips"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover-lift active:scale-95"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Schedule Trip
        </Link>
        <Link
          to="/admin/buses"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg transition-all hover:bg-surface-2 hover-lift active:scale-95"
        >
          <BusIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          Coach Fleet
        </Link>
        <Link
          to="/staff/pos"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg transition-all hover:bg-surface-2 hover-lift active:scale-95"
        >
          <StoreIcon className="h-3.5 w-3.5 text-blue-500" />
          POS Counter
        </Link>
        <Link
          to="/admin/reconciliation"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg transition-all hover:bg-surface-2 hover-lift active:scale-95"
        >
          <BanknoteIcon className="h-3.5 w-3.5 text-emerald-500" />
          Reconcile Drawer
        </Link>
        <Link
          to="/admin/promos"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg transition-all hover:bg-surface-2 hover-lift active:scale-95"
        >
          <TagIcon className="h-3.5 w-3.5 text-amber-500" />
          Promo Codes
        </Link>
        <Link
          to="/admin/reports"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg transition-all hover:bg-surface-2 hover-lift active:scale-95"
        >
          <FileSpreadsheetIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          Analytics
        </Link>
      </div>

      {/* ── Core KPI Statistics Grid ── */}
      {loading && !data ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Gross Platform Revenue"
            value={data?.revenue ?? 0}
            format={money}
            trend={data?.trends.revenue}
            icon={<WalletIcon className="h-5 w-5" aria-hidden />}
            emphasis
          />
          <StatCard
            label="Registered Passengers"
            value={data?.total_users ?? 0}
            trend={data?.trends.users}
            trendLabel="new this period"
            icon={<UsersIcon className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            label="Active Buses in Fleet"
            value={data?.total_buses ?? 0}
            trend={data?.trends.buses}
            trendLabel="operational coaches"
            icon={<BusIcon className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            label="Active Scheduled Routes"
            value={data?.total_routes ?? 0}
            trend={data?.trends.routes}
            trendLabel="network corridors"
            icon={<RouteIcon className="h-5 w-5" aria-hidden />}
          />
        </div>
      )}

      {/* ── Revenue Performance & Top Corridors Charts ── */}
      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        {/* Revenue Performance Area Chart */}
        <Panel
          title="Revenue Trajectory"
          subtitle={`Completed ticket & parcel payments over the last ${timeframe.replace('days', ' days')}`}
        >
          {loading && !data ? (
            <div className="skeleton h-64 rounded-xl" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data?.revenue_chart ?? []}
                  margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.4} />
                      <stop offset="60%" stopColor="#16a34a" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border-color)" vertical={false} strokeDasharray="3 3" opacity={0.6} />
                  <XAxis dataKey="label" tick={axisStyle} stroke="var(--border-color)" tickMargin={8} />
                  <YAxis
                    tick={axisStyle}
                    stroke="var(--border-color)"
                    tickFormatter={(value) => moneyShort(Number(value))}
                    width={70}
                  />
                  <Tooltip
                    cursor={{
                      stroke: '#16a34a',
                      strokeWidth: 1.5,
                      strokeDasharray: '4 4',
                      strokeOpacity: 0.5,
                    }}
                    content={<ChartTooltip formatter={(value: number) => money(value)} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGlow)"
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                    activeDot={{
                      r: 5.5,
                      stroke: '#16a34a',
                      strokeWidth: 3,
                      fill: '#ffffff',
                      style: { filter: 'drop-shadow(0 0 6px rgba(22, 163, 74, 0.7))' },
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Top Corridors Donut Breakdown */}
        <Panel title="Top Revenue Corridors" subtitle="Highest earning routes this period">
          {loading && !data ? (
            <div className="skeleton h-64 rounded-xl" />
          ) : (data?.top_routes.length ?? 0) === 0 ? (
            <EmptyState
              compact
              title="No route revenue yet"
              body="Revenue by corridor will appear here once departures are booked."
            />
          ) : (
            <>
              {/* Donut with Interactive Hover Center Badge */}
              <div className="relative h-44 w-44 mx-auto shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.top_routes ?? []}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="86%"
                      paddingAngle={3}
                      stroke="none"
                      activeIndex={activeRouteIndex ?? undefined}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, index) => setActiveRouteIndex(index)}
                      onMouseLeave={() => setActiveRouteIndex(null)}
                    >
                      {(data?.top_routes ?? []).map((entry, index) => (
                        <Cell
                          key={entry.label}
                          fill={DOUGHNUT_COLORS[index % DOUGHNUT_COLORS.length]}
                          className="cursor-pointer transition-opacity duration-150"
                          opacity={
                            activeRouteIndex === null || activeRouteIndex === index ? 1 : 0.35
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Dynamic Center Metric Badge */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                  <AnimatePresence mode="wait">
                    {activeRouteIndex !== null && data?.top_routes[activeRouteIndex] ? (
                      <motion.div
                        key={`route-${data.top_routes[activeRouteIndex].label}`}
                        initial={{ opacity: 0, scale: 0.9, y: 2 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -2 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="flex flex-col items-center justify-center max-w-[115px]"
                      >
                        <span
                          className="truncate text-[0.625rem] font-bold tracking-tight text-brand-600 dark:text-brand-400"
                          title={data.top_routes[activeRouteIndex].label}
                        >
                          {data.top_routes[activeRouteIndex].label}
                        </span>
                        <span className="text-sm font-extrabold tabular-nums tracking-tight text-fg">
                          {moneyShort(data.top_routes[activeRouteIndex].value)}
                        </span>
                        <span className="inline-flex items-center text-[0.5625rem] font-bold text-emerald-600 dark:text-emerald-400">
                          {(() => {
                            const total = (data?.top_routes ?? []).reduce(
                              (acc, curr) => acc + (curr.value || 0),
                              0
                            );
                            return total > 0
                              ? `${Math.round((data.top_routes[activeRouteIndex].value / total) * 100)}% share`
                              : '0% share';
                          })()}
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="total"
                        initial={{ opacity: 0, scale: 0.9, y: 2 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -2 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="flex flex-col items-center justify-center"
                      >
                        <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted">
                          Total
                        </span>
                        <span className="text-sm font-extrabold tabular-nums tracking-tight text-fg">
                          {moneyShort(
                            (data?.top_routes ?? []).reduce((acc, curr) => acc + (curr.value || 0), 0)
                          )}
                        </span>
                        <span className="text-[0.625rem] font-semibold text-emerald-600 dark:text-emerald-400">
                          {data?.top_routes.length ?? 0} routes
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-line/60 pt-3">
                {(data?.top_routes ?? []).map((route, index) => (
                  <li
                    key={route.label}
                    onMouseEnter={() => setActiveRouteIndex(index)}
                    onMouseLeave={() => setActiveRouteIndex(null)}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-all duration-150 cursor-pointer ${
                      activeRouteIndex === index
                        ? 'bg-surface-2 ring-1 ring-brand-500/30 shadow-sm'
                        : 'hover:bg-surface-2/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-150"
                        style={{
                          background: DOUGHNUT_COLORS[index % DOUGHNUT_COLORS.length],
                          transform: activeRouteIndex === index ? 'scale(1.3)' : 'scale(1)',
                        }}
                        aria-hidden
                      />
                      <span
                        className={`truncate font-medium transition-colors ${
                          activeRouteIndex === index
                            ? 'text-brand-600 dark:text-brand-400 font-semibold'
                            : 'text-fg'
                        }`}
                      >
                        {route.label}
                      </span>
                    </div>
                    <span className="font-bold tabular-nums text-fg">{moneyShort(route.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      {/* ── Booking Volume Chart & Recent Bookings Live Feed ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        {/* Bookings Volume Bar Chart */}
        <Panel title="Bookings Volume" subtitle="Confirmed passenger tickets per interval">
          {loading && !data ? (
            <div className="skeleton h-56 rounded-xl" />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.bookings_chart ?? []}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#eab308" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ca8a04" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border-color)" vertical={false} strokeDasharray="3 3" opacity={0.6} />
                  <XAxis dataKey="label" tick={axisStyle} stroke="var(--border-color)" tickMargin={8} />
                  <YAxis tick={axisStyle} stroke="var(--border-color)" width={32} />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2, rgba(255,255,255,0.06))', radius: 6 }}
                    content={<ChartTooltip formatter={(value: number) => `${value} tickets booked`} />}
                  />
                  <Bar
                    dataKey="bookings"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Live Recent Bookings Table */}
        <Panel
          title="Live Bookings Feed"
          subtitle="Newest passenger reservations across online and terminal counters"
          action={
            <Link
              to="/admin/bookings"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
            >
              Full Manifest <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <DataTable<BookingDetail>
            columns={columns}
            rows={data?.recent_bookings ?? []}
            rowKey={(booking) => booking.id}
            loading={loading && !data}
            caption="Recent bookings"
            mobileCardRender={renderMobileBookingCard}
            empty={
              <EmptyState
                compact
                title="No bookings yet"
                body="New passenger bookings will appear here in real-time."
              />
            }
          />
        </Panel>
      </div>

      {/* Live System Diagnostics & Telemetry Modal */}
      <LiveStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
      />
    </div>
  );
}