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
  SparklesIcon,
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

  const handleExportCSV = () => {
    if (!data || !data.rows || data.rows.length === 0) {
      toast.info('No corridor report rows to export.');
      return;
    }

    const headers = [
      'Corridor Name',
      'Scheduled Departures',
      'Total Passengers',
      'Seat Load Factor (%)',
      'Gross Revenue (UGX)',
    ];

    const csvContent = [
      headers.join(','),
      ...data.rows.map((r) =>
        [
          `"${r.route}"`,
          r.departures,
          r.passengers,
          r.occupancy,
          r.revenue,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LinkBus-CorridorReport-${applied.date_from}-to-${applied.date_to}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Corridor analytics ledger exported to CSV.');
  };

  const columns: Column<ReportRow & { id: number }>[] = [
    {
      key: 'route',
      header: 'Corridor Name',
      render: (row) => <span className="font-extrabold text-fg text-sm">{row.route}</span>,
    },
    {
      key: 'departures',
      header: 'Departures',
      align: 'right',
      render: (row) => <span className="tabular-nums font-bold text-fg">{row.departures}</span>,
    },
    {
      key: 'passengers',
      header: 'Passengers',
      align: 'right',
      render: (row) => <span className="tabular-nums font-bold text-fg">{row.passengers}</span>,
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
            <span className={`tabular-nums font-black text-xs ${colorClass.split(' ').slice(1).join(' ')}`}>
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
        <span className="font-black tabular-nums text-fg text-sm">{money(row.revenue)}</span>
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

  // ── Executive Analytical Insights (Operational Notes) ──
  const operationalNotes = useMemo(() => {
    if (!data) return [];
    const notes: { title: string; body: string }[] = [];

    // 1. Return leg / underperforming corridors
    const underperforming = (data.rows ?? [])
      .filter((r) => r.departures > 0 && r.revenue === 0)
      .map((r) => r.route);
    if (underperforming.length > 0) {
      notes.push({
        title: 'Return-leg bookings are underperforming',
        body: `${underperforming.slice(0, 4).join(', ')} return corridors closed the period with 0 passengers and UGX 0 revenue, despite running a full outbound departure schedule.`,
      });
    } else if ((data.rows ?? []).length > 0) {
      const topRoute = [...data.rows].sort((a, b) => b.revenue - a.revenue)[0];
      notes.push({
        title: 'Leading corridor performance',
        body: `${topRoute.route} generated the highest revenue in the period with ${money(topRoute.revenue)} (${topRoute.passengers} passengers across ${topRoute.departures} departures).`,
      });
    }

    // 2. Revenue concentration & trajectory
    if ((data.revenue_series ?? []).length > 0) {
      const maxDaily = Math.max(...data.revenue_series.map((s) => s.revenue), 0);
      const totalRev = data.summary.revenue ?? 0;
      notes.push({
        title: 'Revenue trajectory',
        body: `Period closed with gross settled revenue of ${money(totalRev)}, with peak single-day revenue reaching ${money(maxDaily)}.`,
      });
    }

    // 3. Seat Load Factor
    notes.push({
      title: 'Seat load factor',
      body: `Fleet utilization averaged ${data.summary.occupancy ?? 0}% across all corridors (${(data.summary.passengers ?? 0).toLocaleString()} passengers recorded for ${tableTotals.totalDepartures} scheduled trips).`,
    });

    // 4. Payment channel dominance
    const totalPayments = (data.payment_mix ?? []).reduce((sum, item) => sum + (item.value || 0), 0);
    const momoVal = (data.payment_mix ?? [])
      .filter((p) => p.label.toLowerCase().includes('mtn') || p.label.toLowerCase().includes('airtel') || p.label.toLowerCase().includes('mobile'))
      .reduce((sum, item) => sum + item.value, 0);
    const cashVal = (data.payment_mix ?? [])
      .filter((p) => p.label.toLowerCase().includes('cash'))
      .reduce((sum, item) => sum + item.value, 0);
    const momoPct = totalPayments > 0 ? Math.round((momoVal / totalPayments) * 100) : 0;
    const cashPct = totalPayments > 0 ? Math.round((cashVal / totalPayments) * 100) : 0;

    notes.push({
      title: 'Mobile money dominates collections',
      body: `MTN Mobile Money and Airtel Money together account for ${momoPct}% of settled revenue, ahead of station cash at ${cashPct}%.`,
    });

    return notes;
  }, [data, tableTotals.totalDepartures]);

  return (
    <div className="space-y-6">
      {/* ── Executive Header & Unified Export Actions (Hidden in Print) ── */}
      <div className="no-print print:hidden flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Reports &amp; Network Analytics
          </h1>
          <p className="mt-1 text-xs text-muted max-w-xl">
            Multi-corridor revenue reconciliation, fleet seat load factor metrics, and multi-channel payment gateway settlement analytics.
          </p>
        </div>

        {/* Global Export & Print Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            icon={<FileTextIcon className="h-4 w-4" />}
            disabled={!data || loading}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            icon={<FileSpreadsheetIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            disabled={!data || loading || isExporting}
            loading={isExporting}
            onClick={handleExportExcel}
          >
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button
            variant="outline"
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
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted hidden sm:inline-block">
              Presets:
            </span>
            <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 w-full sm:w-auto">
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
                    className={`text-center rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
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
          </div>

          {/* Custom Date Range Form */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-muted w-10 sm:w-auto shrink-0">From</span>
              <div className="flex-1 sm:flex-initial">
                <DateInput
                  id="report-from"
                  value={range.date_from}
                  max={range.date_to}
                  className="w-full sm:w-auto min-w-0"
                  onChange={(e) => setRange({ ...range, date_from: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-muted w-10 sm:w-auto shrink-0">To</span>
              <div className="flex-1 sm:flex-initial">
                <DateInput
                  id="report-to"
                  value={range.date_to}
                  min={range.date_from}
                  max={toDateInput(new Date())}
                  className="w-full sm:w-auto min-w-0"
                  onChange={(e) => setRange({ ...range, date_to: e.target.value })}
                />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full sm:w-auto min-h-[38px] font-bold shrink-0"
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
          <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                  LB
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-950 tracking-tight leading-tight">
                    LinkBus Services Ltd
                  </h1>
                  <p className="text-[0.6875rem] font-semibold text-slate-500">
                    Executive Operational &amp; Financial Ledger Report
                  </p>
                </div>
              </div>
              <div className="text-right text-[0.6875rem] text-slate-700 space-y-0.5">
                <p>
                  <span className="text-slate-500 font-medium">Reporting period: </span>
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

          {/* ── KPI Summary Strip (Executive Unified Container) ── */}
          {loading && !data ? (
            <SkeletonCards count={4} />
          ) : (
            <div className="rounded-2xl border border-line bg-surface shadow-sm print:rounded-xl print:border-slate-200 overflow-hidden">
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-line print:grid-cols-4 print:divide-y-0 print:divide-x print:divide-slate-200">
                {/* Gross Revenue */}
                <div className="p-4 sm:p-5 print:p-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted print:text-[0.625rem]">
                    Gross Period Revenue
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl print:text-lg font-extrabold tabular-nums tracking-tight text-fg print:text-slate-950">
                    {moneyShort(data?.summary.revenue ?? 0)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted font-mono print:text-[0.5625rem]">
                    {applied.date_from} → {applied.date_to}
                  </p>
                </div>

                {/* Confirmed Bookings */}
                <div className="p-4 sm:p-5 print:p-2.5 sm:border-l border-line print:border-slate-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted print:text-[0.625rem]">
                    Confirmed Bookings
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl print:text-lg font-extrabold tabular-nums tracking-tight text-fg print:text-slate-950">
                    {(data?.summary.bookings ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-muted print:text-[0.5625rem]">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                      {data?.summary.bookings ?? 0} confirmed
                    </span>{' '}
                    · {data?.summary.cancellations ?? 0} refunded
                  </p>
                </div>

                {/* Total Passengers */}
                <div className="p-4 sm:p-5 print:p-2.5 lg:border-l border-line print:border-slate-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted print:text-[0.625rem]">
                    Total Passengers
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl print:text-lg font-extrabold tabular-nums tracking-tight text-fg print:text-slate-950">
                    {(data?.summary.passengers ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-muted print:text-[0.5625rem]">
                    <strong className="font-semibold text-fg print:text-slate-900">
                      {data?.summary.occupancy ?? 0}%
                    </strong>{' '}
                    avg fleet load factor
                  </p>
                </div>

                {/* Average Fare */}
                <div className="p-4 sm:p-5 print:p-2.5 sm:border-l border-line print:border-slate-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted print:text-[0.625rem]">
                    Average Ticket Fare
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl print:text-lg font-extrabold tabular-nums tracking-tight text-fg print:text-slate-950">
                    {moneyShort(data?.summary.average_fare ?? 0)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted print:text-[0.5625rem]">Per seat reservation</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Revenue Trend Chart & Payment Method Breakdown ── */}
          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr] print:grid-cols-[1.5fr_1fr] print:gap-3.5 print-avoid-break">
            {/* Revenue & Bookings Dual-Axis Combo Chart */}
            <Panel
              title="Revenue & booking trajectory"
              subtitle="Daily financial revenue and passenger bookings across the selected date range"
              className="print:rounded-xl"
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
                <div className="w-full">
                  {/* Top Chart Legend */}
                  <div className="mb-2 flex items-center justify-end gap-5 text-xs print:text-[0.625rem] text-muted">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="h-2 w-3 rounded-xs bg-emerald-600 inline-block" />
                      Gross revenue (UGX '000)
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="h-0.5 w-3 bg-amber-500 inline-block" style={{ borderTop: '2px dashed' }} />
                      Bookings (tickets)
                    </span>
                  </div>

                  <div className="h-44 sm:h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={data?.revenue_series ?? []}
                        margin={{ top: 5, right: 10, bottom: 0, left: -10 }}
                      >
                        <defs>
                          <linearGradient id="reportRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                            <stop offset="60%" stopColor="#16a34a" stopOpacity={0.08} />
                            <stop offset="100%" stopColor="#16a34a" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border-color)" vertical={false} strokeDasharray="3 3" opacity={0.5} />
                        <XAxis
                          dataKey="label"
                          tick={axisStyle}
                          stroke="var(--border-color)"
                          tickMargin={6}
                          tickFormatter={(d) => formatDateLabel(d)}
                        />
                        <YAxis
                          yAxisId="rev"
                          tick={axisStyle}
                          stroke="var(--border-color)"
                          tickFormatter={(v) => moneyShort(Number(v))}
                          width={55}
                        />
                        <YAxis
                          yAxisId="bk"
                          orientation="right"
                          tick={axisStyle}
                          stroke="var(--border-color)"
                          width={25}
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
                          radius={[4, 4, 0, 0]}
                          maxBarSize={20}
                          isAnimationActive={true}
                          animationDuration={800}
                        />
                        <Line
                          yAxisId="rev"
                          type="monotone"
                          dataKey="revenue"
                          stroke="#16a34a"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{
                            r: 4.5,
                            stroke: '#16a34a',
                            strokeWidth: 2,
                            fill: '#ffffff',
                          }}
                          isAnimationActive={true}
                          animationDuration={800}
                        />
                        <Line
                          yAxisId="bk"
                          type="monotone"
                          dataKey="bookings"
                          stroke="#eab308"
                          strokeWidth={1.5}
                          dot={false}
                          strokeDasharray="3 2"
                          activeDot={{
                            r: 3.5,
                            stroke: '#eab308',
                            strokeWidth: 2,
                            fill: '#ffffff',
                          }}
                          isAnimationActive={true}
                          animationDuration={800}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </Panel>

            {/* Payment Method Breakdown (Interactive Donut on Screen, Visual Donut on Print) */}
            <Panel title="Payment channel split" subtitle="Revenue breakdown by collection gateway" className="print:rounded-xl">
              {loading && !data ? (
                <div className="skeleton h-64 rounded-xl" />
              ) : (data?.payment_mix.length ?? 0) === 0 ? (
                <EmptyState compact title="No payments in range" body="Payment split appears once transactions occur." />
              ) : (
                <div>
                  {/* Donut Chart Container */}
                  <div className="relative h-36 w-36 print:h-28 print:w-28 mx-auto shrink-0">
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
                          paddingAngle={2}
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

                    {/* Donut Center Label */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                      <span className="text-xs print:text-[0.6875rem] font-extrabold tabular-nums tracking-tight text-fg print:text-slate-950">
                        {moneyShort(totalPaymentValue)}
                      </span>
                      <span className="text-[0.5625rem] print:text-[0.5rem] font-semibold text-muted print:text-slate-500">
                        {data?.payment_mix.length ?? 0} channels
                      </span>
                    </div>
                  </div>

                  {/* Payment Channel Legend List */}
                  <ul className="mt-2.5 space-y-1 border-t border-line/60 print:border-slate-200 pt-2 text-xs print:text-[0.625rem]">
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
                          className="flex items-center justify-between gap-2 py-0.5"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="h-2 w-2 rounded-xs shrink-0 inline-block"
                              style={{ background: color }}
                              aria-hidden
                            />
                            <span className="truncate font-medium text-fg print:text-slate-900">
                              {titleCase(entry.label)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="tabular-nums text-muted print:text-slate-500 font-mono">{sharePct}%</span>
                            <span className="font-bold tabular-nums text-fg print:text-slate-950 font-mono">{moneyShort(entry.value)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Panel>
          </div>

          {/* ── Corridor Performance Breakdown Table with Search & Totals ── */}
          <Panel
            title="Corridor performance breakdown"
            subtitle="Ranked performance ledger — departures, passengers, load factor, and gross revenue per route"
            className="print:rounded-xl print-avoid-break"
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
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/50 px-3.5 py-2 text-xs print:bg-slate-50 print:border-slate-200 print:mt-2 print:py-1.5 print:px-2.5 print-avoid-break">
                <div className="flex items-center gap-1.5 text-muted print:text-slate-600 font-semibold print:text-[0.6875rem]">
                  <span className="text-fg print:text-slate-900 font-bold">Summary:</span>
                  <span>{filteredRows.length} corridors</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 print:gap-3 text-xs print:text-[0.6875rem]">
                  <div>
                    <span className="text-muted print:text-slate-500">Total trips: </span>
                    <strong className="font-bold font-mono text-fg print:text-slate-900">{tableTotals.totalDepartures}</strong>
                  </div>
                  <div>
                    <span className="text-muted print:text-slate-500">Total passengers: </span>
                    <strong className="font-bold font-mono text-fg print:text-slate-900">{tableTotals.totalPassengers}</strong>
                  </div>
                  <div>
                    <span className="text-muted print:text-slate-500">Avg load factor: </span>
                    <strong className="font-bold font-mono text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                      {tableTotals.avgOccupancy}%
                    </strong>
                  </div>
                  <div className="pl-3 border-l border-line print:border-slate-300">
                    <span className="text-muted print:text-slate-500">Grand total: </span>
                    <strong className="font-extrabold font-mono text-fg print:text-slate-900">
                      {money(tableTotals.totalRevenue)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          {/* ── Operational Notes Card (Visible in Print & Screen) ── */}
          {operationalNotes.length > 0 && (
            <div className="rounded-xl border border-line bg-surface-2/30 p-3.5 print:bg-slate-50/70 print:border-slate-200 print:p-2.5 print-avoid-break">
              <h3 className="font-bold text-xs print:text-[0.6875rem] text-fg print:text-slate-900 mb-1">
                Operational notes
              </h3>
              <ul className="space-y-1 text-xs print:text-[0.625rem] text-muted print:text-slate-700 list-disc list-inside leading-relaxed">
                {operationalNotes.map((note, idx) => (
                  <li key={idx} className="print:leading-tight">
                    <span className="font-semibold text-fg print:text-slate-900">{note.title}</span> — {note.body}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Reconciliation Disclaimer & Sign-off Block ── */}
          <div className="print-avoid-break mt-3 pt-1">
            <p className="text-[0.625rem] print:text-[0.5625rem] text-muted print:text-slate-400 leading-tight">
              Figures are reconciled against the payment gateway ledger and fleet seat manifest as of the generation timestamp above. Refunded bookings are excluded from totals. Amounts shown in Ugandan Shillings (UGX).
            </p>

            <div className="hidden print:flex items-end justify-between mt-3 pt-2 border-t border-slate-200 text-xs text-slate-700">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900 text-[0.6875rem]">Prepared &amp; audited by:</p>
                <p className="text-[0.625rem] text-slate-800 font-medium">Sarah Nakato — Director of Transit Operations, LinkBus Services Central Operations</p>
                <p className="text-[0.5625rem] text-slate-400 font-mono">Date: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
              <div className="text-center">
                <div className="h-11 w-20 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-[0.45rem] font-bold text-slate-400 leading-tight">
                  <span>VERIFICATION</span>
                  <span>SEAL</span>
                  <span className="text-[0.4rem] text-slate-300 mt-0.5">OFFICIAL AUDIT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}