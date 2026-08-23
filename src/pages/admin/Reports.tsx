import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FilterIcon,
  PrinterIcon,
  RefreshCwIcon,
  SearchIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
  XCircleIcon,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Button } from '../../components/ui/Button';
import { DateInput, SearchInput } from '../../components/ui/Inputs';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { exportReportExcel, getReport, type ReportRow } from '../../services/analytics';
import { formatDateTime, formatTime, money, moneyShort, titleCase, toDateInput } from '../../utils/format';

const PAYMENT_COLORS: Record<string, string> = {
  mtn_mobile_money: '#eab308',
  airtel_money: '#ef4444',
  cash: '#10b981',
  credit_card: '#6366f1',
  bank_transfer: '#0ea5e9',
};

const DEFAULT_COLOR_PALETTE = ['#eab308', '#ef4444', '#10b981', '#6366f1', '#0ea5e9', '#8b5cf6'];

const axisStyle = { fontSize: 11, fill: 'var(--text-faint)' };

const presets = [
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

function shiftDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return toDateInput(date);
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-md">
      <p className="font-bold text-fg text-[0.8125rem]">{formatDateLabel(label) || label || payload[0]?.name}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey ?? entry.name} className="mt-1 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shadow-sm"
              style={{ background: entry.color || entry.stroke || entry.fill || '#16a34a' }}
            />
            <span className="text-muted font-medium">
              {entry.dataKey === 'revenue' ? 'Revenue' : entry.dataKey === 'bookings' ? 'Bookings' : titleCase(entry.name || '')}
            </span>
          </div>
          <span className="font-extrabold font-mono text-fg">
            {entry.dataKey === 'revenue' || typeof entry.value === 'number' && entry.name
              ? entry.dataKey === 'bookings' ? `${entry.value} bookings` : money(Number(entry.value))
              : entry.value}
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

export function Reports() {
  const [range, setRange] = useState({
    date_from: shiftDays(30),
    date_to: toDateInput(new Date()),
  });
  const [applied, setApplied] = useState(range);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePaymentIndex, setActivePaymentIndex] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => getReport(applied),
    [applied.date_from, applied.date_to]
  );

  const handleExportExcel = async () => {
    if (isExporting || !data || loading) return;
    setIsExporting(true);
    const toastId = toast.loading('Generating Excel workbook...');
    try {
      const filename = await exportReportExcel(applied);
      toast.success(`Downloaded ${filename}`, { id: toastId });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to export Excel report', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Column<ReportRow & { id: number }>[] = [
    {
      key: 'route',
      header: 'Corridor Name',
      render: (row) => <span className="font-bold text-fg">{row.route}</span>,
    },
    {
      key: 'departures',
      header: 'Departures',
      align: 'right',
      render: (row) => <span className="tabular-nums text-fg">{row.departures}</span>,
    },
    {
      key: 'passengers',
      header: 'Passengers',
      align: 'right',
      render: (row) => <span className="tabular-nums text-fg">{row.passengers}</span>,
    },
    {
      key: 'occupancy',
      header: 'Seat Load Factor',
      align: 'right',
      hideBelow: 'sm',
      render: (row) => {
        const pct = row.occupancy;
        const colorClass =
          pct >= 75
            ? 'bg-emerald-500 text-emerald-600 dark:text-emerald-400'
            : pct >= 40
            ? 'bg-amber-500 text-amber-600 dark:text-amber-400'
            : 'bg-slate-400 text-muted';

        return (
          <div className="flex items-center justify-end gap-2.5">
            <div className="w-16 sm:w-20 h-2 rounded-full bg-surface-2 overflow-hidden border border-line">
              <div
                className={`h-full rounded-full transition-all duration-300 ${colorClass.split(' ')[0]}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className={`tabular-nums font-bold text-xs ${colorClass.split(' ').slice(1).join(' ')}`}>
              {pct}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'revenue',
      header: 'Gross Revenue',
      align: 'right',
      render: (row) => (
        <span className="font-extrabold tabular-nums text-fg">{money(row.revenue)}</span>
      ),
    },
  ];

  const allRows = useMemo(() => {
    return (data?.rows ?? []).map((row, index) => ({ ...row, id: index }));
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return allRows;
    const query = searchQuery.toLowerCase();
    return allRows.filter((r) => r.route.toLowerCase().includes(query));
  }, [allRows, searchQuery]);

  const tableTotals = useMemo(() => {
    const totalDepartures = filteredRows.reduce((acc, r) => acc + (r.departures || 0), 0);
    const totalPassengers = filteredRows.reduce((acc, r) => acc + (r.passengers || 0), 0);
    const totalRevenue = filteredRows.reduce((acc, r) => acc + (r.revenue || 0), 0);
    const avgOccupancy =
      filteredRows.length > 0
        ? Math.round(
            filteredRows.reduce((acc, r) => acc + (r.occupancy || 0), 0) / filteredRows.length
          )
        : 0;

    return { totalDepartures, totalPassengers, totalRevenue, avgOccupancy };
  }, [filteredRows]);

  const totalPaymentValue = useMemo(() => {
    return (data?.payment_mix ?? []).reduce((sum, item) => sum + (item.value || 0), 0);
  }, [data]);

  const activePaymentItem =
    activePaymentIndex !== null && data?.payment_mix[activePaymentIndex]
      ? data.payment_mix[activePaymentIndex]
      : null;

  const activePaymentShare =
    activePaymentItem && totalPaymentValue > 0
      ? Math.round((activePaymentItem.value / totalPaymentValue) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* ── Executive Header & Unified Date Filter Bar (Hidden in Print) ── */}
      <div className="no-print print:hidden flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Reports & Network Analytics
          </h1>
          <p className="text-xs text-muted mt-1">
            Revenue reconciliation, corridor load factors, and multi-channel payment settlements
          </p>
        </div>

        {/* Global Export & Print Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<FileSpreadsheetIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            disabled={!data || loading || isExporting}
            loading={isExporting}
            onClick={handleExportExcel}
          >
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<PrinterIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
            disabled={!data || loading}
            onClick={() => window.print()}
          >
            Print PDF
          </Button>
          <button
            type="button"
            onClick={async () => {
              await reload();
              toast.success('Report metrics updated');
            }}
            disabled={loading}
            title="Refresh report data"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted shadow-sm transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Unified Date Range Filter Toolbar (Hidden in Print) ── */}
      <div className="no-print print:hidden rounded-2xl border border-line bg-surface p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Preset Segment Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted hidden sm:inline-block">
              Presets:
            </span>
            {presets.map((preset) => {
              const active =
                applied.date_from === shiftDays(preset.days) &&
                applied.date_to === toDateInput(new Date());
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const next = {
                      date_from: shiftDays(preset.days),
                      date_to: toDateInput(new Date()),
                    };
                    setRange(next);
                    setApplied(next);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'border border-line bg-surface text-muted hover:bg-surface-2 hover:text-fg'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Form */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">From</span>
              <DateInput
                id="report-from"
                value={range.date_from}
                max={range.date_to}
                onChange={(e) => setRange({ ...range, date_from: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">To</span>
              <DateInput
                id="report-to"
                value={range.date_to}
                min={range.date_from}
                max={toDateInput(new Date())}
                onChange={(e) => setRange({ ...range, date_to: e.target.value })}
              />
            </div>
            <Button
              size="sm"
              onClick={() => setApplied(range)}
              loading={loading}
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Panel>
          <ErrorState message={error} onRetry={reload} />
        </Panel>
      )}

      {!error && (
        <div className="print-doc space-y-5">
          {/* Printable Document Header (Visible ONLY when printing) */}
          <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-extrabold text-xl shadow-sm">
                  LB
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                    LinkBus Services Ltd
                  </h1>
                  <p className="text-xs font-semibold text-slate-600">
                    Executive Operational & Financial Ledger Report
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-700 space-y-1">
                <p>
                  <span className="text-slate-500 font-medium">Reporting Period: </span>
                  <strong className="font-bold text-slate-950 font-mono">
                    {applied.date_from} to {applied.date_to}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500 font-medium">Generated: </span>
                  <strong className="font-semibold text-slate-900">
                    {formatDateTime(new Date().toISOString())}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500 font-medium">Station: </span>
                  <strong className="font-semibold text-slate-900">Kampala Central HQ</strong>
                </p>
              </div>
            </div>
          </div>

          {/* ── KPI Summary Cards ── */}
          {loading && !data ? (
            <SkeletonCards count={4} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Gross Revenue */}
              <div className="card-surface relative overflow-hidden rounded-2xl border border-line p-4 sm:p-5 shadow-sm ring-1 ring-brand-600/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Gross Period Revenue
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-fg">
                      {moneyShort(data?.summary.revenue ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-muted font-mono">
                      {applied.date_from} → {applied.date_to}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600 dark:text-brand-400 border border-brand-600/20 shadow-inner">
                    <WalletIcon className="h-5 w-5" />
                  </span>
                </div>
              </div>

              {/* Bookings */}
              <div className="card-surface rounded-2xl border border-line p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Confirmed Bookings
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-fg">
                      {(data?.summary.bookings ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {data?.summary.bookings ?? 0} confirmed
                      </span>{' '}
                      · {data?.summary.cancellations ?? 0} refunded
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-inner">
                    <FileTextIcon className="h-5 w-5" />
                  </span>
                </div>
              </div>

              {/* Passengers */}
              <div className="card-surface rounded-2xl border border-line p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Total Passengers
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-fg">
                      {(data?.summary.passengers ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      <strong className="font-semibold text-fg">
                        {data?.summary.occupancy ?? 0}%
                      </strong>{' '}
                      avg fleet load factor
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-inner">
                    <UsersIcon className="h-5 w-5" />
                  </span>
                </div>
              </div>

              {/* Average Fare */}
              <div className="card-surface rounded-2xl border border-line p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Average Ticket Fare
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-fg">
                      {moneyShort(data?.summary.average_fare ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-muted">Per seat reservation</p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-inner">
                    <TrendingUpIcon className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Revenue Trend Chart & Payment Method Breakdown ── */}
          <div className="grid gap-5 xl:grid-cols-[1.8fr_1fr] print:grid-cols-[1.6fr_1fr]">
            {/* Revenue & Bookings Dual-Axis Combo Chart */}
            <Panel
              title="Revenue & Booking Trajectory"
              subtitle="Daily financial revenue and passenger bookings across the selected date range"
            >
              {loading && !data ? (
                <div className="skeleton h-64 rounded-xl" />
              ) : (data?.revenue_series.length ?? 0) === 0 ? (
                <EmptyState
                  compact
                  icon={<FileTextIcon className="h-5 w-5" aria-hidden />}
                  title="No financial records in range"
                  body="No bookings were recorded between those dates. Try selecting a wider timeframe."
                />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={data?.revenue_series ?? []}
                      margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="reportRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                          <stop offset="60%" stopColor="#16a34a" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="#16a34a" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border-color)" vertical={false} strokeDasharray="3 3" opacity={0.6} />
                      <XAxis
                        dataKey="label"
                        tick={axisStyle}
                        stroke="var(--border-color)"
                        tickMargin={8}
                        tickFormatter={(d) => formatDateLabel(d)}
                      />
                      <YAxis
                        yAxisId="rev"
                        tick={axisStyle}
                        stroke="var(--border-color)"
                        tickFormatter={(v) => moneyShort(Number(v))}
                        width={72}
                      />
                      <YAxis
                        yAxisId="bk"
                        orientation="right"
                        tick={axisStyle}
                        stroke="var(--border-color)"
                        width={36}
                      />
                      <Tooltip
                        cursor={{
                          stroke: '#16a34a',
                          strokeWidth: 1.5,
                          strokeDasharray: '4 4',
                          strokeOpacity: 0.5,
                        }}
                        content={<ChartTooltip />}
                      />
                      <Bar
                        yAxisId="rev"
                        dataKey="revenue"
                        fill="url(#reportRevGrad)"
                        stroke="#16a34a"
                        strokeOpacity={0.4}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={26}
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                      <Line
                        yAxisId="rev"
                        type="monotone"
                        dataKey="revenue"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{
                          r: 5.5,
                          stroke: '#16a34a',
                          strokeWidth: 3,
                          fill: '#ffffff',
                          style: { filter: 'drop-shadow(0 0 6px rgba(22, 163, 74, 0.7))' },
                        }}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                      <Line
                        yAxisId="bk"
                        type="monotone"
                        dataKey="bookings"
                        stroke="#eab308"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="4 2"
                        activeDot={{
                          r: 4.5,
                          stroke: '#eab308',
                          strokeWidth: 2,
                          fill: '#ffffff',
                        }}
                        isAnimationActive={true}
                        animationDuration={800}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Chart Legend */}
                  <div className="mt-2 flex items-center justify-center gap-6 text-xs text-muted">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block shadow-sm" />
                      Gross Revenue (UGX)
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="h-0.5 w-4 rounded-full bg-amber-500 inline-block" style={{ borderTop: '2px dashed' }} />
                      Bookings (Tickets)
                    </span>
                  </div>
                </div>
              )}
            </Panel>

            {/* Payment Method Breakdown: Interactive Donut on Screen, Table Ledger on Print */}
            <Panel title="Payment Channel Split" subtitle="Revenue breakdown by collection gateway">
              {loading && !data ? (
                <div className="skeleton h-64 rounded-xl" />
              ) : (data?.payment_mix.length ?? 0) === 0 ? (
                <EmptyState compact title="No payments in range" body="Payment split appears once transactions occur." />
              ) : (
                <>
                  {/* ── Screen Only View: Interactive Donut Chart & Hover Legend ── */}
                  <div className="no-print print:hidden">
                    <div className="relative h-44 w-44 mx-auto shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data?.payment_mix ?? []}
                            dataKey="value"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius="58%"
                            outerRadius="86%"
                            paddingAngle={3}
                            stroke="none"
                            activeIndex={activePaymentIndex ?? undefined}
                            activeShape={renderActiveShape}
                            onMouseEnter={(_, index) => setActivePaymentIndex(index)}
                            onMouseLeave={() => setActivePaymentIndex(null)}
                          >
                            {(data?.payment_mix ?? []).map((entry, index) => {
                              const color =
                                PAYMENT_COLORS[entry.label.toLowerCase().replace(/\s+/g, '_')] ??
                                DEFAULT_COLOR_PALETTE[index % DEFAULT_COLOR_PALETTE.length];
                              return (
                                <Cell
                                  key={entry.label}
                                  fill={color}
                                  className="cursor-pointer transition-opacity duration-150"
                                  opacity={
                                    activePaymentIndex === null || activePaymentIndex === index ? 1 : 0.35
                                  }
                                />
                              );
                            })}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Donut Center Morphing Badge */}
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                        <AnimatePresence mode="wait">
                          {activePaymentItem ? (
                            <motion.div
                              key={`pay-${activePaymentItem.label}`}
                              initial={{ opacity: 0, scale: 0.9, y: 2 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -2 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="flex flex-col items-center justify-center max-w-[115px]"
                            >
                              <span
                                className="truncate text-[0.625rem] font-bold tracking-tight text-brand-600 dark:text-brand-400"
                                title={titleCase(activePaymentItem.label)}
                              >
                                {titleCase(activePaymentItem.label)}
                              </span>
                              <span className="text-sm font-extrabold tabular-nums tracking-tight text-fg">
                                {moneyShort(activePaymentItem.value)}
                              </span>
                              <span className="inline-flex items-center text-[0.5625rem] font-bold text-emerald-600 dark:text-emerald-400">
                                {activePaymentShare}% share
                              </span>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="total-pay"
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
                                {moneyShort(totalPaymentValue)}
                              </span>
                              <span className="text-[0.625rem] font-semibold text-emerald-600 dark:text-emerald-400">
                                {data?.payment_mix.length ?? 0} channels
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Payment Channel Legend List */}
                    <ul className="mt-3 space-y-1.5 border-t border-line/60 pt-3">
                      {(data?.payment_mix ?? []).map((entry, index) => {
                        const sharePct = totalPaymentValue > 0 ? Math.round((entry.value / totalPaymentValue) * 100) : 0;
                        const color =
                          PAYMENT_COLORS[entry.label.toLowerCase().replace(/\s+/g, '_')] ??
                          DEFAULT_COLOR_PALETTE[index % DEFAULT_COLOR_PALETTE.length];

                        return (
                          <li
                            key={entry.label}
                            onMouseEnter={() => setActivePaymentIndex(index)}
                            onMouseLeave={() => setActivePaymentIndex(null)}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition-all duration-150 cursor-pointer ${
                              activePaymentIndex === index
                                ? 'bg-surface-2 ring-1 ring-brand-500/30 shadow-sm'
                                : 'hover:bg-surface-2/60'
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-150"
                              style={{
                                background: color,
                                transform: activePaymentIndex === index ? 'scale(1.3)' : 'scale(1)',
                              }}
                              aria-hidden
                            />
                            <span
                              className={`flex-1 truncate font-medium transition-colors ${
                                activePaymentIndex === index
                                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                                  : 'text-fg'
                              }`}
                            >
                              {titleCase(entry.label)}
                            </span>
                            <span className="tabular-nums text-muted font-medium">{sharePct}%</span>
                            <span className="font-bold tabular-nums text-fg">{moneyShort(entry.value)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* ── Print Only View: Executive Financial Settlement Table ── */}
                  <div className="hidden print:block">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-300 text-slate-600 font-bold uppercase text-[0.625rem]">
                          <th className="py-2 pl-1">Payment Gateway / Channel</th>
                          <th className="py-2 text-center">Share %</th>
                          <th className="py-2 text-right pr-1">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(data?.payment_mix ?? []).map((entry, index) => {
                          const sharePct = totalPaymentValue > 0 ? Math.round((entry.value / totalPaymentValue) * 100) : 0;
                          const color =
                            PAYMENT_COLORS[entry.label.toLowerCase().replace(/\s+/g, '_')] ??
                            DEFAULT_COLOR_PALETTE[index % DEFAULT_COLOR_PALETTE.length];

                          return (
                            <tr key={entry.label} className={index % 2 === 1 ? 'bg-slate-50/60' : ''}>
                              <td className="py-2 pl-1 flex items-center gap-2 font-medium text-slate-900">
                                <span
                                  className="h-2 w-2 rounded-full inline-block shrink-0"
                                  style={{ background: color }}
                                  aria-hidden
                                />
                                {titleCase(entry.label)}
                              </td>
                              <td className="py-2 text-center text-slate-600 font-mono font-medium">
                                {sharePct}%
                              </td>
                              <td className="py-2 text-right pr-1 font-bold font-mono text-slate-950">
                                {money(entry.value)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 font-bold text-slate-950 bg-slate-50/80">
                          <td className="py-2 pl-1">
                            Total Settlement ({data?.payment_mix.length ?? 0} Channels)
                          </td>
                          <td className="py-2 text-center font-mono">100%</td>
                          <td className="py-2 text-right pr-1 font-mono font-extrabold text-sm">
                            {money(totalPaymentValue)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </Panel>
          </div>

          {/* ── Corridor Performance Breakdown Table with Search & Totals ── */}
          <Panel
            title="Corridor Performance Breakdown"
            subtitle="Ranked performance ledger — departures, passengers, load factor, and gross revenue per route"
            action={
              <div className="no-print print:hidden w-64 max-w-full">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Filter corridors..."
                />
              </div>
            }
          >
            <DataTable
              columns={columns}
              rows={filteredRows}
              rowKey={(row) => row.id}
              loading={loading && !data}
              caption="Performance by corridor"
              empty={
                <EmptyState
                  compact
                  title={searchQuery ? 'No matching corridors' : 'No route data in range'}
                  body={searchQuery ? 'Try searching for another city or destination.' : 'Route performance appears once bookings exist in this range.'}
                />
              }
            />

            {/* Table Summary Totals Footer */}
            {filteredRows.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface-2/50 px-4 py-3 text-xs print:bg-white print:border-slate-300">
                <div className="flex items-center gap-2 text-muted">
                  <span className="font-semibold text-fg">Summary:</span>
                  <span>{filteredRows.length} Corridors</span>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="text-right">
                    <span className="text-muted">Total Trips: </span>
                    <strong className="font-bold font-mono text-fg">{tableTotals.totalDepartures}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-muted">Total Passengers: </span>
                    <strong className="font-bold font-mono text-fg">{tableTotals.totalPassengers}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-muted">Avg Load Factor: </span>
                    <strong className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {tableTotals.avgOccupancy}%
                    </strong>
                  </div>
                  <div className="text-right pl-4 border-l border-line print:border-slate-300">
                    <span className="text-muted">Grand Total: </span>
                    <strong className="text-sm font-extrabold font-mono text-fg">
                      {money(tableTotals.totalRevenue)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          {/* Printable Signature & Audit Block (Visible ONLY in print) */}
          <div className="hidden print:flex items-end justify-between mt-10 pt-6 border-t-2 border-slate-300 text-xs text-slate-700">
            <div className="space-y-1">
              <p className="font-bold text-slate-900">Prepared & Audited By:</p>
              <p>Sarah Nakato — Director of Transit Operations</p>
              <p className="text-[0.6875rem] text-slate-500">LinkBus Services Central Operations</p>
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold text-slate-900">Verification Seal:</p>
              <div className="h-10 w-24 border border-dashed border-slate-400 rounded flex items-center justify-center text-[0.625rem] text-slate-400">
                OFFICIAL STAMP
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="w-48 border-b-2 border-slate-900 mb-1.5" />
              <p className="font-bold text-slate-900">Executive Authorization Signature</p>
              <p className="text-[0.6875rem] text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}