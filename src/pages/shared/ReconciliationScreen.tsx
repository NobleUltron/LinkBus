import React, { useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  BriefcaseIcon,
  Building2Icon,
  CalculatorIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  CoinsIcon,
  DownloadIcon,
  EyeIcon,
  FileSpreadsheetIcon,
  HistoryIcon,
  LockIcon,
  PackageIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  StoreIcon,
  TicketIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
  XCircleIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { ShiftOpenModal } from '../../components/modals/ShiftOpenModal';
import { DrawerExpenseModal } from '../../components/modals/DrawerExpenseModal';
import { ShiftCloseoutModal } from '../../components/modals/ShiftCloseoutModal';
import { ReconciliationPrintModal } from '../../components/modals/ReconciliationPrintModal';
import { Button } from '../../components/ui/Button';
import { DateInput } from '../../components/ui/Inputs';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, SkeletonTable } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { usePaginated } from '../../hooks/usePaginated';
import {
  getActiveShiftMetrics,
  listReconciliations,
  type ActiveShiftMetrics,
  type ShiftReconciliation,
} from '../../services/reconciliations';
import { getActiveTerminals } from '../../services/trips';
import { formatDateTime, money, toDateInput } from '../../utils/format';

interface ReconciliationScreenProps {
  mode?: 'staff' | 'admin';
}

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

export function ReconciliationScreen({ mode = 'staff' }: ReconciliationScreenProps) {
  const { user } = useAuth();
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseModalType, setExpenseModalType] = useState<'petty_expense' | 'safe_drop' | 'cash_in'>('petty_expense');
  const [closeoutOpen, setCloseoutOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ShiftReconciliation | null>(null);
  const [previewAuditRecord, setPreviewAuditRecord] = useState<ShiftReconciliation | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const [range, setRange] = useState({
    date_from: shiftDays(30),
    date_to: toDateInput(new Date()),
  });
  const [applied, setApplied] = useState(range);

  const terminals = useAsync(() => getActiveTerminals(), []);
  const activeMetrics = useAsync(() => getActiveShiftMetrics(1), []);

  const state = usePaginated<ShiftReconciliation>(({ page, perPage, search, filters }) =>
    listReconciliations({
      page,
      perPage,
      search,
      terminal_id: filters.terminal,
      status: filters.status,
      date_from: applied.date_from,
      date_to: applied.date_to,
    })
  );

  React.useEffect(() => {
    state.reload();
  }, [applied.date_from, applied.date_to]);

  // Scorecards computation for audited ledger
  const ledgerMetrics = useMemo(() => {
    const rows = state.rows || [];
    const totalCount = state.total || rows.length;
    const balancedCount = rows.filter((r) => r.variance_cash === 0).length;
    const flaggedCount = rows.filter((r) => r.variance_cash !== 0 || r.status === 'flagged').length;
    const totalVolume = rows.reduce((sum, r) => sum + (Number(r.system_expected_total) || 0), 0);

    return {
      totalCount,
      balancedCount,
      flaggedCount,
      totalVolume,
    };
  }, [state.rows, state.total]);

  const handleShiftReconciled = (reconciliation: ShiftReconciliation) => {
    setCloseoutOpen(false);
    state.reload();
    activeMetrics.reload();
    setSelectedRecord(reconciliation);
    setPrintOpen(true);
  };

  const handleExportCSV = () => {
    const rows = state.rows || [];
    if (rows.length === 0) {
      toast.info('No shift reconciliation records to export.');
      return;
    }

    const headers = [
      'Shift Code',
      'Duty Date',
      'Terminal',
      'Cashier Name',
      'Supervisor',
      'Status',
      'Opening Float (UGX)',
      'Ticket Sales Total (UGX)',
      'Luggage Fees Total (UGX)',
      'Parcel Freight Total (UGX)',
      'Cash In Total (UGX)',
      'Petty Expenses Total (UGX)',
      'Safe Drops Total (UGX)',
      'System Expected Cash (UGX)',
      'Actual Counted Cash (UGX)',
      'Variance Amount (UGX)',
      'Variance Explanation',
      'Closed Timestamp',
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((r) =>
        [
          `"${r.shift_code}"`,
          `"${r.shift_date}"`,
          `"${r.terminal_name} - ${r.terminal_city}"`,
          `"${r.cashier_name}"`,
          `"${r.supervisor_name || ''}"`,
          `"${r.status}"`,
          r.opening_float || 0,
          r.ticket_sales_total,
          r.luggage_fees_total,
          r.parcel_fees_total,
          r.cash_in_total || 0,
          r.cash_out_expenses || 0,
          r.safe_drops_total || 0,
          r.system_expected_cash,
          r.actual_counted_cash,
          r.variance_cash,
          `"${(r.variance_reason || '').replace(/"/g, '""')}"`,
          `"${formatDateTime(r.closed_at)}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LinkBus-ShiftReconciliations-${toDateInput(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Shift reconciliation ledger exported to CSV.');
  };

  const terminalFilterOptions = useMemo(() => {
    return (terminals.data || []).map((t) => ({
      value: String(t.id),
      label: `${t.city} — ${t.name}`,
    }));
  }, [terminals.data]);

  const columns: Column<ShiftReconciliation>[] = [
    {
      key: 'shift',
      header: 'Shift Code & Date',
      render: (item) => (
        <div className="py-1">
          <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-fg bg-surface-2 px-2 py-0.5 rounded-md border border-line shadow-2xs">
            <ReceiptTextIcon className="h-3 w-3 text-brand-600" />
            {item.shift_code}
          </span>
          <p className="text-[0.6875rem] text-muted mt-0.5">
            {formatDateTime(item.closed_at)}
          </p>
        </div>
      ),
    },
    {
      key: 'terminal',
      header: 'Terminal & Cashier',
      render: (item) => (
        <div>
          <span className="font-extrabold text-fg text-xs block">
            {item.terminal_name}
          </span>
          <span className="text-[0.6875rem] text-muted">
            Cashier: <strong className="text-fg">{item.cashier_name}</strong>
          </span>
        </div>
      ),
    },
    {
      key: 'movements',
      header: 'Drawer Inflows & Outflows',
      render: (item) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 text-[0.6875rem]">
            <span className="text-muted">Float:</span>
            <strong className="font-mono text-fg">{money(item.opening_float || 0)}</strong>
          </div>
          <div className="flex items-center gap-1 text-[0.6875rem]">
            <TicketIcon className="h-3 w-3 text-brand-600" />
            <span>Tickets:</span>
            <strong className="font-mono text-fg">{money(item.ticket_sales_total)}</strong>
          </div>
          {(item.cash_out_expenses > 0 || item.safe_drops_total > 0) && (
            <div className="flex items-center gap-1 text-[0.6875rem] text-rose-600 dark:text-rose-400">
              <span>Expenses &amp; Drops:</span>
              <strong className="font-mono">-{money((item.cash_out_expenses || 0) + (item.safe_drops_total || 0))}</strong>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'reconciliation',
      header: 'Cash Drawer Balance',
      render: (item) => (
        <div className="text-xs font-mono">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted text-[0.6875rem]">Expected:</span>
            <strong className="text-fg">{money(item.system_expected_cash)}</strong>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted text-[0.6875rem]">Counted:</span>
            <strong className="text-emerald-700 dark:text-emerald-400">{money(item.actual_counted_cash)}</strong>
          </div>
          <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-line/60">
            <span className="text-[0.6875rem] font-bold">Variance:</span>
            <span
              className={`font-black ${
                item.variance_cash === 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : item.variance_cash > 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {item.variance_cash === 0
                ? 'Balanced (0 UGX)'
                : item.variance_cash > 0
                ? `+${money(item.variance_cash)} Over`
                : `${money(item.variance_cash)} Short`}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Audit Status',
      render: (item) => <StatusPill status={item.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            icon={<EyeIcon className="h-3.5 w-3.5" />}
            onClick={() => setPreviewAuditRecord(item)}
            className="text-xs font-semibold"
            title="View Full Shift Audit Breakdown"
          >
            Audit Breakdown
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<PrinterIcon className="h-3.5 w-3.5" />}
            onClick={() => {
              setSelectedRecord(item);
              setPrintOpen(true);
            }}
            className="text-xs font-semibold"
            title="Print Official Slip"
          >
            Print Slip
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Top Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Cash Drawer &amp; Shift Reconciliations
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <StoreIcon className="h-3 w-3" /> Till Management
            </span>
          </div>
          <p className="mt-1 text-xs text-muted max-w-xl">
            Audit cashier shift closeouts, verify physical drawer cash counts against starting float + system collections across tickets, excess luggage, and parcel waybills, and print certified settlement slips.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setOpenShiftModal(true)}
          >
            Open New Shift (Float)
          </Button>
          <Button
            variant="outline"
            icon={<FileSpreadsheetIcon className="h-4 w-4" />}
            onClick={handleExportCSV}
          >
            Export Ledger CSV
          </Button>
          <Button
            icon={<ShieldCheckIcon className="h-4 w-4" />}
            onClick={() => setCloseoutOpen(true)}
            disabled={activeMetrics.loading || !activeMetrics.data}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
          >
            Reconcile &amp; Close Shift
          </Button>
        </div>
      </div>

      {/* ── Top Active Shift Live Cash Drawer Card ── */}
      <Panel
        title="Active Terminal Shift &amp; Live Cash Drawer Status"
        subtitle="Real-time physical till balance, starting float, and inflows vs outflows for current duty shift"
      >
        {activeMetrics.loading ? (
          <div className="p-4">
            <SkeletonTable rows={2} columns={4} />
          </div>
        ) : activeMetrics.data ? (
          <div className="space-y-4">
            {/* Quick Action Ribbon for Cashier */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-fg bg-surface-2 px-2.5 py-1 rounded-lg border border-line">
                  Shift #{activeMetrics.data.shift_code}
                </span>
                <span className="text-xs text-muted">
                  Float: <strong className="text-fg">{money(activeMetrics.data.opening_float || 0)}</strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={<CoinsIcon className="h-3.5 w-3.5 text-emerald-600" />}
                  onClick={() => {
                    setExpenseModalType('cash_in');
                    setExpenseModalOpen(true);
                  }}
                >
                  + Float Top-Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<ArrowDownRightIcon className="h-3.5 w-3.5 text-amber-600" />}
                  onClick={() => {
                    setExpenseModalType('petty_expense');
                    setExpenseModalOpen(true);
                  }}
                >
                  - Log Petty Expense
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<ArrowDownRightIcon className="h-3.5 w-3.5 text-blue-600" />}
                  onClick={() => {
                    setExpenseModalType('safe_drop');
                    setExpenseModalOpen(true);
                  }}
                >
                  - Mid-Shift Safe Drop
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Expected Physical Cash in Drawer */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.6875rem] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Expected Cash in Drawer
                  </span>
                  <BanknoteIcon className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-950 dark:text-emerald-100">
                  {money(activeMetrics.data.system_expected_cash)}
                </div>
                <span className="text-[0.625rem] text-emerald-700 dark:text-emerald-300 font-medium">
                  Float ({money(activeMetrics.data.opening_float)}) + Sales - Expenses
                </span>
              </div>

              {/* Passenger Tickets Collection */}
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.6875rem] font-bold text-muted uppercase tracking-wider">
                    Ticket Sales ({activeMetrics.data.ticket_count})
                  </span>
                  <TicketIcon className="h-4 w-4 text-brand-600" />
                </div>
                <div className="text-xl font-black font-mono text-fg">
                  {money(activeMetrics.data.ticket_sales_total)}
                </div>
                <span className="text-[0.625rem] text-muted">
                  Cash: {money(activeMetrics.data.ticket_sales_cash)} · Digital: {money(activeMetrics.data.ticket_sales_momo + activeMetrics.data.ticket_sales_airtel)}
                </span>
              </div>

              {/* Excess Luggage Collection */}
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.6875rem] font-bold text-muted uppercase tracking-wider">
                    Luggage Excess ({activeMetrics.data.luggage_count})
                  </span>
                  <BriefcaseIcon className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-xl font-black font-mono text-fg">
                  {money(activeMetrics.data.luggage_fees_total)}
                </div>
                <span className="text-[0.625rem] text-muted">
                  Cash: {money(activeMetrics.data.luggage_fees_cash)} · MoMo: {money(activeMetrics.data.luggage_fees_momo)}
                </span>
              </div>

              {/* Parcel Freight Collection */}
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.6875rem] font-bold text-muted uppercase tracking-wider">
                    Parcel Freight ({activeMetrics.data.parcel_count})
                  </span>
                  <PackageIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-xl font-black font-mono text-fg">
                  {money(activeMetrics.data.parcel_fees_total)}
                </div>
                <span className="text-[0.625rem] text-muted">
                  Cash: {money(activeMetrics.data.parcel_fees_cash)} · MoMo: {money(activeMetrics.data.parcel_fees_momo)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </Panel>

      {/* ── Unified Date Range Filter Toolbar ── */}
      <div className="rounded-2xl border border-line bg-surface p-3.5 sm:p-4 shadow-sm">
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
                id="reconcile-from"
                value={range.date_from}
                max={range.date_to}
                onChange={(e) => setRange({ ...range, date_from: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">To</span>
              <DateInput
                id="reconcile-to"
                value={range.date_to}
                min={range.date_from}
                max={toDateInput(new Date())}
                onChange={(e) => setRange({ ...range, date_to: e.target.value })}
              />
            </div>
            <Button
              size="sm"
              onClick={() => setApplied(range)}
              loading={state.loading}
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </div>

      {/* ── Historical Ledger Summary Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              <ReceiptTextIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Audited Shifts
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {ledgerMetrics.totalCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">Historical closed station shifts</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Balanced Shifts
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-emerald-950 dark:text-emerald-100 tabular-nums">
            {ledgerMetrics.balancedCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-emerald-800 dark:text-emerald-300">0 UGX variance balance</p>
        </div>

        <div className={`rounded-2xl border p-4 shadow-sm hover-lift transition-all ${
          ledgerMetrics.flaggedCount > 0 ? 'border-amber-500/30 bg-amber-500/10' : 'border-line bg-surface'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              ledgerMetrics.flaggedCount > 0 ? 'bg-amber-600 text-white' : 'bg-slate-500/10 text-slate-500'
            }`}>
              <AlertTriangleIcon className="h-4 w-4" />
            </span>
            <span className={`text-xs font-bold ${
              ledgerMetrics.flaggedCount > 0 ? 'text-amber-950 dark:text-amber-200 uppercase tracking-wider' : 'text-fg uppercase tracking-wider'
            }`}>
              Discrepancies
            </span>
          </div>
          <p className={`mt-2 font-extrabold text-2xl tabular-nums ${
            ledgerMetrics.flaggedCount > 0 ? 'text-amber-950 dark:text-amber-100' : 'text-fg'
          }`}>
            {ledgerMetrics.flaggedCount.toLocaleString()}
          </p>
          <p className={`text-[0.6875rem] ${
            ledgerMetrics.flaggedCount > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-muted'
          }`}>
            Over / short discrepancies noted
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
              <CoinsIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Settled Collections
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {money(ledgerMetrics.totalVolume)}
          </p>
          <p className="text-[0.6875rem] text-muted">Audited cash &amp; digital revenue</p>
        </div>
      </div>

      {/* ── Historical Shift Reconciliations Ledger ── */}
      <Panel
        title="Station Shift Reconciliation Ledger"
        subtitle="Audited cashier shift closeouts and historical drawer reconciliation records"
      >
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search shift code, cashier name, terminal..."
          searching={state.loading}
          filters={[
            {
              key: 'terminal',
              label: 'All Terminals',
              options: terminalFilterOptions,
              icon: <Building2Icon className="h-4 w-4" />,
            },
            {
              key: 'status',
              label: 'All Statuses',
              options: [
                { value: 'reconciled', label: 'Balanced / Reconciled' },
                { value: 'flagged', label: 'Flagged Discrepancy' },
                { value: 'audited', label: 'Audited & Signed' },
              ],
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />

        <DataTable<ShiftReconciliation>
          columns={columns}
          rows={state.rows}
          loading={state.loading}
          rowKey={(item) => item.id}
          caption="Station shift reconciliations"
          empty={
            <EmptyState
              icon={<HistoryIcon className="h-6 w-6 text-brand-600" />}
              title="No shift reconciliations found"
              body="Completed cashier shift closeouts will appear here for supervisor auditing and export."
            />
          }
        />

        <Pagination
          page={state.page}
          perPage={state.perPage}
          total={state.total}
          onPageChange={state.setPage}
          onPerPageChange={state.setPerPage}
        />
      </Panel>

      {/* ── Shift Full Audit Breakdown Modal ── */}
      <Modal
        open={Boolean(previewAuditRecord)}
        onClose={() => setPreviewAuditRecord(null)}
        title="Shift Reconciliation Audit Breakdown"
        subtitle={previewAuditRecord ? `Shift #${previewAuditRecord.shift_code} · ${previewAuditRecord.terminal_name}` : undefined}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              icon={<PrinterIcon className="h-4 w-4" />}
              onClick={() => {
                const rec = previewAuditRecord;
                setPreviewAuditRecord(null);
                if (rec) {
                  setSelectedRecord(rec);
                  setPrintOpen(true);
                }
              }}
            >
              Print Certified Slip
            </Button>
            <Button variant="outline" onClick={() => setPreviewAuditRecord(null)}>
              Close
            </Button>
          </>
        }
      >
        {previewAuditRecord && (
          <div className="space-y-4">
            {/* Shift Header Banner */}
            <div className="rounded-2xl border border-line bg-surface-2/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[0.6875rem] font-bold text-muted uppercase">Shift Reference Code</span>
                <p className="font-mono font-black text-xl text-fg">{previewAuditRecord.shift_code}</p>
                <p className="text-xs text-muted mt-0.5">
                  Station: <strong className="text-fg">{previewAuditRecord.terminal_name}</strong> ({previewAuditRecord.terminal_city})
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <StatusPill status={previewAuditRecord.status} />
                <span className="text-xs text-muted">
                  Cashier: <strong className="text-fg">{previewAuditRecord.cashier_name}</strong>
                </span>
                {previewAuditRecord.supervisor_name && (
                  <span className="text-[0.6875rem] text-muted">
                    Supervisor: <strong className="text-fg">{previewAuditRecord.supervisor_name}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Float & Movement Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-surface-2 p-2.5 rounded-xl border border-line">
                <span className="text-[0.625rem] font-bold text-muted uppercase block">Opening Float</span>
                <span className="font-mono font-black text-sm text-fg">{money(previewAuditRecord.opening_float || 0)}</span>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                <span className="text-[0.625rem] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">+ Float Top-Up</span>
                <span className="font-mono font-black text-sm text-emerald-950 dark:text-emerald-100">{money(previewAuditRecord.cash_in_total || 0)}</span>
              </div>
              <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <span className="text-[0.625rem] font-bold text-amber-800 dark:text-amber-300 uppercase block">- Petty Expenses</span>
                <span className="font-mono font-black text-sm text-amber-950 dark:text-amber-100">{money(previewAuditRecord.cash_out_expenses || 0)}</span>
              </div>
              <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                <span className="text-[0.625rem] font-bold text-blue-800 dark:text-blue-300 uppercase block">- Safe Drops</span>
                <span className="font-mono font-black text-sm text-blue-950 dark:text-blue-100">{money(previewAuditRecord.safe_drops_total || 0)}</span>
              </div>
            </div>

            {/* Revenue Breakdown by Stream */}
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-line pb-2 text-xs font-black uppercase tracking-wider text-muted">
                <CoinsIcon className="h-3.5 w-3.5 text-brand-600" />
                Revenue Collections by Stream &amp; Payment Method
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tickets */}
                <div className="rounded-xl border border-line bg-surface-2 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fg flex items-center gap-1">
                      <TicketIcon className="h-3.5 w-3.5 text-brand-600" />
                      Tickets ({previewAuditRecord.ticket_count || 0})
                    </span>
                    <strong className="text-xs font-mono">{money(previewAuditRecord.ticket_sales_total)}</strong>
                  </div>
                  <div className="text-[0.6875rem] text-muted space-y-0.5 border-t border-line/60 pt-1">
                    <div className="flex justify-between"><span>Cash:</span><span>{money(previewAuditRecord.ticket_sales_cash)}</span></div>
                    <div className="flex justify-between"><span>MTN MoMo:</span><span>{money(previewAuditRecord.ticket_sales_momo)}</span></div>
                    <div className="flex justify-between"><span>Airtel Money:</span><span>{money(previewAuditRecord.ticket_sales_airtel)}</span></div>
                  </div>
                </div>

                {/* Luggage */}
                <div className="rounded-xl border border-line bg-surface-2 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fg flex items-center gap-1">
                      <BriefcaseIcon className="h-3.5 w-3.5 text-amber-600" />
                      Luggage ({previewAuditRecord.luggage_count || 0})
                    </span>
                    <strong className="text-xs font-mono">{money(previewAuditRecord.luggage_fees_total)}</strong>
                  </div>
                  <div className="text-[0.6875rem] text-muted space-y-0.5 border-t border-line/60 pt-1">
                    <div className="flex justify-between"><span>Cash:</span><span>{money(previewAuditRecord.luggage_fees_cash)}</span></div>
                    <div className="flex justify-between"><span>MoMo / Digital:</span><span>{money(previewAuditRecord.luggage_fees_momo + (previewAuditRecord.luggage_fees_airtel || 0))}</span></div>
                  </div>
                </div>

                {/* Parcels */}
                <div className="rounded-xl border border-line bg-surface-2 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-fg flex items-center gap-1">
                      <PackageIcon className="h-3.5 w-3.5 text-blue-600" />
                      Parcels ({previewAuditRecord.parcel_count || 0})
                    </span>
                    <strong className="text-xs font-mono">{money(previewAuditRecord.parcel_fees_total)}</strong>
                  </div>
                  <div className="text-[0.6875rem] text-muted space-y-0.5 border-t border-line/60 pt-1">
                    <div className="flex justify-between"><span>Cash:</span><span>{money(previewAuditRecord.parcel_fees_cash)}</span></div>
                    <div className="flex justify-between"><span>MoMo / Digital:</span><span>{money(previewAuditRecord.parcel_fees_momo + (previewAuditRecord.parcel_fees_airtel || 0))}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Drawer Count Audit */}
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-line pb-2 text-xs font-black uppercase tracking-wider text-muted">
                <BanknoteIcon className="h-3.5 w-3.5 text-emerald-600" />
                Physical Drawer Cash Reconciliation &amp; Discrepancy
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-surface-2 p-3 border border-line">
                  <span className="text-muted text-[0.625rem] font-bold block uppercase">System Expected Cash</span>
                  <span className="font-mono font-extrabold text-sm text-fg">{money(previewAuditRecord.system_expected_cash)}</span>
                </div>
                <div className="rounded-xl bg-surface-2 p-3 border border-line">
                  <span className="text-muted text-[0.625rem] font-bold block uppercase">Actual Counted Cash</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">{money(previewAuditRecord.actual_counted_cash)}</span>
                </div>
                <div className="rounded-xl bg-surface-2 p-3 border border-line">
                  <span className="text-muted text-[0.625rem] font-bold block uppercase">Variance / Discrepancy</span>
                  <span className={`font-mono font-black text-sm ${
                    previewAuditRecord.variance_cash === 0
                      ? 'text-emerald-600'
                      : previewAuditRecord.variance_cash > 0
                      ? 'text-blue-600'
                      : 'text-rose-600'
                  }`}>
                    {previewAuditRecord.variance_cash === 0
                      ? '0 UGX (Balanced)'
                      : previewAuditRecord.variance_cash > 0
                      ? `+${money(previewAuditRecord.variance_cash)} Over`
                      : `${money(previewAuditRecord.variance_cash)} Short`}
                  </span>
                </div>
              </div>

              {/* Physical Notes Denominations Breakdown */}
              {previewAuditRecord.denominations && (
                <div className="rounded-xl border border-line bg-surface-2/60 p-3 space-y-1.5">
                  <span className="text-[0.6875rem] font-black uppercase tracking-wider text-muted block">
                    Cashier Counted Denominations:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-surface p-1.5 rounded border border-line/60">50k Notes: <strong>{previewAuditRecord.denominations.notes_50k || 0}</strong></div>
                    <div className="bg-surface p-1.5 rounded border border-line/60">20k Notes: <strong>{previewAuditRecord.denominations.notes_20k || 0}</strong></div>
                    <div className="bg-surface p-1.5 rounded border border-line/60">10k Notes: <strong>{previewAuditRecord.denominations.notes_10k || 0}</strong></div>
                    <div className="bg-surface p-1.5 rounded border border-line/60">5k Notes: <strong>{previewAuditRecord.denominations.notes_5k || 0}</strong></div>
                    <div className="bg-surface p-1.5 rounded border border-line/60">2k Notes: <strong>{previewAuditRecord.denominations.notes_2k || 0}</strong></div>
                    <div className="bg-surface p-1.5 rounded border border-line/60">1k Notes: <strong>{previewAuditRecord.denominations.notes_1k || 0}</strong></div>
                    <div className="bg-surface p-1.5 rounded border border-line/60 col-span-2">Coins Total: <strong>{money(previewAuditRecord.denominations.coins || 0)}</strong></div>
                  </div>
                </div>
              )}

              {/* Cashier Closing Notes / Variance Explanation */}
              {(previewAuditRecord.closing_notes || previewAuditRecord.variance_reason) && (
                <div className="rounded-xl border border-line bg-surface-2/60 p-3 text-xs text-muted space-y-1">
                  {previewAuditRecord.closing_notes && (
                    <p><strong>Cashier Shift Notes:</strong> {previewAuditRecord.closing_notes}</p>
                  )}
                  {previewAuditRecord.variance_reason && (
                    <p className="text-amber-700 dark:text-amber-300">
                      <strong>Variance Explanation:</strong> {previewAuditRecord.variance_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Shift Open Modal */}
      <ShiftOpenModal
        open={openShiftModal}
        onClose={() => setOpenShiftModal(false)}
        onSuccess={() => {
          activeMetrics.reload();
          state.reload();
        }}
      />

      {/* Drawer Expense / Movement Modal */}
      <DrawerExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        metrics={activeMetrics.data}
        defaultType={expenseModalType}
        onSuccess={() => activeMetrics.reload()}
      />

      {/* Shift Closeout Modal */}
      <ShiftCloseoutModal
        open={closeoutOpen}
        onClose={() => setCloseoutOpen(false)}
        metrics={activeMetrics.data}
        onSuccess={handleShiftReconciled}
      />

      {/* Print Slip Modal */}
      <ReconciliationPrintModal
        reconciliation={selectedRecord}
        open={printOpen}
        onClose={() => setPrintOpen(false)}
      />
    </div>
  );
}
