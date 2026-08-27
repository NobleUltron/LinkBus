import React, { useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  BriefcaseIcon,
  Building2Icon,
  CalculatorIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  HistoryIcon,
  PackageIcon,
  PrinterIcon,
  ReceiptTextIcon,
  SearchIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  StoreIcon,
  TicketIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { ShiftCloseoutModal } from '../../components/modals/ShiftCloseoutModal';
import { ReconciliationPrintModal } from '../../components/modals/ReconciliationPrintModal';
import { Button } from '../../components/ui/Button';
import { DateInput } from '../../components/ui/Inputs';
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

export function ReconciliationScreen({ mode = 'staff' }: ReconciliationScreenProps) {
  const { user } = useAuth();
  const [closeoutOpen, setCloseoutOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ShiftReconciliation | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const [dateRange, setDateRange] = useState({
    date_from: '',
    date_to: '',
  });

  const terminals = useAsync(() => getActiveTerminals(), []);
  const activeMetrics = useAsync(() => getActiveShiftMetrics(1), []);

  const state = usePaginated<ShiftReconciliation>(({ page, perPage, search, filters }) =>
    listReconciliations({
      page,
      perPage,
      search,
      terminal_id: filters.terminal,
      status: filters.status,
      date_from: dateRange.date_from || undefined,
      date_to: dateRange.date_to || undefined,
    })
  );

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
      'Date',
      'Terminal',
      'Cashier',
      'Supervisor',
      'Status',
      'Ticket Sales (UGX)',
      'Luggage Fees (UGX)',
      'Parcel Freight (UGX)',
      'Total Expected Revenue (UGX)',
      'Expected Cash (UGX)',
      'Actual Counted Cash (UGX)',
      'Variance (UGX)',
      'Variance Reason',
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
          r.ticket_sales_total,
          r.luggage_fees_total,
          r.parcel_fees_total,
          r.system_expected_total,
          r.system_expected_cash,
          r.actual_counted_cash,
          r.variance_cash,
          `"${(r.variance_reason || '').replace(/"/g, '""')}"`,
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
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-fg bg-surface-2 px-2 py-0.5 rounded-md border border-line shadow-sm">
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
          <span className="font-bold text-fg text-xs block">
            {item.terminal_name}
          </span>
          <span className="text-[0.6875rem] text-muted">
            Cashier: <strong className="text-fg">{item.cashier_name}</strong>
          </span>
        </div>
      ),
    },
    {
      key: 'revenue',
      header: 'Revenue Streams',
      render: (item) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 text-[0.6875rem]">
            <TicketIcon className="h-3 w-3 text-brand-600" />
            <span>Tickets:</span>
            <strong className="font-mono text-fg">{money(item.ticket_sales_total)}</strong>
          </div>
          <div className="flex items-center gap-1 text-[0.6875rem]">
            <BriefcaseIcon className="h-3 w-3 text-amber-600" />
            <span>Luggage:</span>
            <strong className="font-mono text-fg">{money(item.luggage_fees_total)}</strong>
          </div>
          <div className="flex items-center gap-1 text-[0.6875rem]">
            <PackageIcon className="h-3 w-3 text-blue-600" />
            <span>Parcels:</span>
            <strong className="font-mono text-fg">{money(item.parcel_fees_total)}</strong>
          </div>
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
              className={`font-bold ${
                item.variance_cash === 0
                  ? 'text-emerald-600'
                  : item.variance_cash > 0
                  ? 'text-blue-600'
                  : 'text-rose-600'
              }`}
            >
              {item.variance_cash === 0
                ? '0 UGX'
                : item.variance_cash > 0
                ? `+${money(item.variance_cash)}`
                : money(item.variance_cash)}
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
        <Button
          variant="outline"
          size="sm"
          icon={<PrinterIcon className="h-3.5 w-3.5" />}
          onClick={() => {
            setSelectedRecord(item);
            setPrintOpen(true);
          }}
          className="text-xs font-semibold"
        >
          View / Print Slip
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Top Active Shift Live Cash Drawer Card ─── */}
      <Panel
        title="Active Terminal Shift & Cash Drawer Status"
        subtitle="Real-time collection tallies for current duty shift across tickets, luggage, and parcels"
        action={
          <Button
            icon={<ShieldCheckIcon className="h-4 w-4" />}
            onClick={() => setCloseoutOpen(true)}
            disabled={activeMetrics.loading || !activeMetrics.data}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
          >
            Reconcile Drawer &amp; Close Shift
          </Button>
        }
      >
        {activeMetrics.loading ? (
          <div className="p-4">
            <SkeletonTable rows={2} columns={4} />
          </div>
        ) : activeMetrics.data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Expected Physical Cash */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.6875rem] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Expected Cash in Drawer
                  </span>
                  <BanknoteIcon className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-xl font-black font-mono text-emerald-950 dark:text-emerald-100">
                  {money(activeMetrics.data.system_expected_cash)}
                </div>
                <span className="text-[0.625rem] text-emerald-700 dark:text-emerald-300 font-medium">
                  Ready for physical count verification
                </span>
              </div>

              {/* Passenger Tickets Collection */}
              <div className="rounded-xl border border-line bg-surface p-4">
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
              <div className="rounded-xl border border-line bg-surface p-4">
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
              <div className="rounded-xl border border-line bg-surface p-4">
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

      {/* ─── Historical Shift Reconciliations Ledger ─── */}
      <Panel
        title="Station Shift Reconciliation Ledger"
        subtitle="Audited cashier shift closeouts and cash drawer reconciliation history"
        action={
          <Button
            variant="outline"
            size="sm"
            icon={<DownloadIcon className="h-4 w-4" />}
            onClick={handleExportCSV}
            className="text-xs font-semibold"
          >
            Export Ledger (CSV)
          </Button>
        }
      >
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search shift code, cashier, terminal…"
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
