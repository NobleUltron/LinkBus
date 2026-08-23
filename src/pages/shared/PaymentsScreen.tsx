import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeftIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  DollarSignIcon,
  FileSpreadsheetIcon,
  PrinterIcon,
  ReceiptTextIcon,
  SmartphoneIcon,
  TrendingUpIcon,
  Undo2Icon,
  WalletIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DateInput } from '../../components/ui/Inputs';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { EmptyState } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { errorMessage } from '../../hooks/useAsync';
import { usePaginated } from '../../hooks/usePaginated';
import { listPayments, updatePaymentStatus, type PaymentDetail } from '../../services/analytics';
import { formatDateTime, money, titleCase, toDateInput } from '../../utils/format';

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

const statusOptions = [
  { value: 'completed', label: 'Completed & Settled' },
  { value: 'pending', label: 'Pending Gateway Settlement' },
  { value: 'failed', label: 'Failed / Declined' },
  { value: 'refunded', label: 'Refunded / Reversed' },
];

const methodOptions = [
  { value: 'mtn_mobile_money', label: 'MTN Mobile Money' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'card', label: 'Debit / Credit Card (Visa)' },
  { value: 'cash', label: 'Station Counter Cash' },
];

export function PaymentsScreen({ canRefund = true }: { canRefund?: boolean }) {
  const [refunding, setRefunding] = useState<PaymentDetail | null>(null);
  const [receipt, setReceipt] = useState<PaymentDetail | null>(null);
  const [pending, setPending] = useState(false);

  const [range, setRange] = useState({
    date_from: shiftDays(30),
    date_to: toDateInput(new Date()),
  });
  const [applied, setApplied] = useState(range);

  const state = usePaginated<PaymentDetail>(({ page, perPage, search, filters }) =>
    listPayments({
      page,
      perPage,
      search,
      status: filters.status,
      method: filters.method,
      date_from: applied.date_from,
      date_to: applied.date_to,
    })
  );

  React.useEffect(() => {
    state.reload();
  }, [applied.date_from, applied.date_to]);

  const confirmRefund = async () => {
    if (!refunding) return;
    setPending(true);
    try {
      await updatePaymentStatus(refunding.id, 'refunded');
      toast.success(`Transaction #${refunding.transaction_id} marked as REFUNDED.`);
      setRefunding(null);
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const handleExportCsv = () => {
    if (!state.rows.length) {
      toast.error('No payment transactions to export');
      return;
    }
    const headers = ['Transaction ID', 'Booking Ref', 'Passenger', 'Route', 'Method', 'Amount (UGX)', 'Status', 'Date'];
    const csvRows = state.rows.map((p) => [
      `"${p.transaction_id}"`,
      `"${p.booking_number}"`,
      `"${p.passenger_name}"`,
      `"${p.route}"`,
      `"${p.method}"`,
      p.amount,
      `"${p.status}"`,
      `"${p.created_at}"`,
    ]);
    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linkbus_payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payments exported to CSV');
  };

  const renderPaymentBadge = (method: string) => {
    switch (method) {
      case 'mtn_mobile_money':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
            <SmartphoneIcon className="h-3 w-3" />
            MTN MoMo
          </span>
        );
      case 'airtel_money':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-300">
            <SmartphoneIcon className="h-3 w-3" />
            Airtel Money
          </span>
        );
      case 'card':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
            <CreditCardIcon className="h-3 w-3" />
            Visa / Card
          </span>
        );
      case 'cash':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <BanknoteIcon className="h-3 w-3" />
            Station Cash
          </span>
        );
    }
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const rows = state.rows;
    const completed = rows.filter((r) => r.status === 'completed');
    const totalVolume = completed.reduce((acc, r) => acc + (r.amount || 0), 0);
    const momoVolume = completed
      .filter((r) => r.method === 'mtn_mobile_money' || r.method === 'airtel_money')
      .reduce((acc, r) => acc + (r.amount || 0), 0);
    const cashVolume = completed
      .filter((r) => r.method === 'cash')
      .reduce((acc, r) => acc + (r.amount || 0), 0);
    const refundedVolume = rows
      .filter((r) => r.status === 'refunded')
      .reduce((acc, r) => acc + (r.amount || 0), 0);

    return { totalVolume, momoVolume, cashVolume, refundedVolume };
  }, [state.rows]);

  const columns: Column<PaymentDetail>[] = [
    {
      key: 'transaction',
      header: 'Transaction ID & Time',
      render: (payment) => (
        <div className="py-1">
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-fg bg-surface-2 px-2 py-0.5 rounded-md border border-line shadow-sm">
            <ReceiptTextIcon className="h-3 w-3 text-brand-600" />
            {payment.transaction_id}
          </span>
          <p className="text-[0.6875rem] text-muted font-mono mt-0.5">
            {formatDateTime(payment.created_at)}
          </p>
        </div>
      ),
    },
    {
      key: 'booking',
      header: 'Booking Ref & Passenger',
      render: (payment) => (
        <div>
          <p className="font-mono text-xs font-bold text-fg">
            Ref #{payment.booking_number}
          </p>
          <p className="text-xs text-muted truncate max-w-[160px]">{payment.passenger_name}</p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Corridor Route',
      hideBelow: 'md',
      render: (payment) => (
        <span className="font-bold text-fg text-xs">{payment.route}</span>
      ),
    },
    {
      key: 'method',
      header: 'Payment Channel',
      hideBelow: 'sm',
      render: (payment) => renderPaymentBadge(payment.method),
    },
    {
      key: 'status',
      header: 'Gateway Status',
      render: (payment) => <StatusPill status={payment.status} />,
    },
    {
      key: 'amount',
      header: 'Settled Amount',
      align: 'right',
      render: (payment) => (
        <span className="font-extrabold tabular-nums text-fg text-sm">
          {money(payment.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (payment) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setReceipt(payment)}
            title="View Transaction Voucher"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-brand-600"
          >
            <ReceiptTextIcon className="h-4 w-4" />
          </button>

          {canRefund && payment.status === 'completed' && (
            <button
              type="button"
              onClick={() => setRefunding(payment)}
              title="Refund Payment"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-amber-500/15 hover:text-amber-600"
            >
              <Undo2Icon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const handlePrintVoucher = (voucher: PaymentDetail) => {
    const originalTitle = document.title;
    document.title = `LinkBus-Voucher-${voucher.transaction_id}`;

    const existingClone = document.getElementById('receipt-print-clone');
    if (existingClone) existingClone.remove();

    const printDoc = document.querySelector('.print-voucher') as HTMLElement | null;
    let clone: HTMLElement | null = null;

    if (printDoc) {
      clone = printDoc.cloneNode(true) as HTMLElement;
      clone.id = 'receipt-print-clone';
      document.body.appendChild(clone);
    }

    document.body.classList.add('is-printing-receipt');

    const cleanup = () => {
      document.body.classList.remove('is-printing-receipt');
      document.title = originalTitle;
      const c = document.getElementById('receipt-print-clone');
      if (c) c.remove();
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 3000);
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Financial Transactions &amp; Settlements
          </h1>
          <p className="text-xs text-muted">
            Bank of Uganda compliant audit trail for Mobile Money, POS Card, and counter cash settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<FileSpreadsheetIcon className="h-4 w-4" />}
            onClick={handleExportCsv}
          >
            Export CSV Ledger
          </Button>
        </div>
      </div>

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
                id="payment-from"
                value={range.date_from}
                max={range.date_to}
                onChange={(e) => setRange({ ...range, date_from: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">To</span>
              <DateInput
                id="payment-to"
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

      {/* ── Financial KPI Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUpIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Settled Volume</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {money(metrics.totalVolume)}
          </p>
          <p className="text-[0.6875rem] text-muted">Active Page Completed Takings</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <SmartphoneIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Mobile Money Mix</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {money(metrics.momoVolume)}
          </p>
          <p className="text-[0.6875rem] text-muted">MTN &amp; Airtel Gateways</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BanknoteIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Counter Cash Desk</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {money(metrics.cashVolume)}
          </p>
          <p className="text-[0.6875rem] text-muted">Direct Terminal Shift Receipts</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <Undo2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Refunds / Reversals</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {money(metrics.refundedVolume)}
          </p>
          <p className="text-[0.6875rem] text-muted">Returned to Passenger Accounts</p>
        </div>
      </div>

      {/* ── Payments Data Table ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search transaction ID, booking #, passenger or corridor…"
          filters={[
            {
              key: 'status',
              label: 'Any status',
              options: statusOptions,
            },
            {
              key: 'method',
              label: 'Any payment method',
              options: methodOptions,
              icon: <CreditCardIcon className="h-4 w-4 text-brand-600" aria-hidden />,
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />
        <DataTable<PaymentDetail>
          columns={columns}
          rows={state.rows}
          rowKey={(payment) => payment.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="Payments"
          empty={
            <EmptyState
              icon={<CreditCardIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0
                  ? 'No transactions match those filters'
                  : 'No payments recorded yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or status filter.'
                  : 'Payments appear here automatically as passengers settle bookings online or at terminal POS counters.'
              }
              action={
                state.activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={state.clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        />
        <Pagination meta={state.meta} onPageChange={state.setPage} label="transactions" />
      </Panel>

      {/* ── Transaction Voucher Slip Modal ── */}
      <Modal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title="Transaction Settlement Voucher"
        subtitle={receipt ? `Ref #${receipt.transaction_id}` : undefined}
        size="md"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <Button variant="outline" onClick={() => setReceipt(null)}>
              Close
            </Button>
            <Button
              icon={<PrinterIcon className="h-4 w-4" />}
              onClick={() => receipt && handlePrintVoucher(receipt)}
            >
              Print Voucher (PDF)
            </Button>
          </div>
        }
      >
        {receipt && (
          <div className="print-doc print-voucher space-y-4 rounded-2xl border-2 border-slate-300 bg-white p-6 text-slate-900 shadow-sm">
            {/* Slip Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-200 pb-4">
              <div>
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-800">
                  LINK BUS SERVICES LTD · OFFICIAL VOUCHER
                </span>
                <p className="font-mono text-xl font-black text-slate-900 mt-0.5">
                  {receipt.transaction_id}
                </p>
                <p className="text-xs text-slate-500">{formatDateTime(receipt.created_at)}</p>
              </div>
              <StatusPill status={receipt.status} />
            </div>

            {/* Slip Details Matrix */}
            <dl className="space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <dt className="text-slate-500">Master Booking Reference</dt>
                <dd className="font-mono font-black text-slate-900">#{receipt.booking_number}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <dt className="text-slate-500">Passenger / Payee Name</dt>
                <dd className="font-bold text-slate-900">{receipt.passenger_name}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <dt className="text-slate-500">Travel Corridor Route</dt>
                <dd className="font-bold text-slate-900">{receipt.route}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <dt className="text-slate-500">Payment Gateway Channel</dt>
                <dd className="font-extrabold text-slate-900">{titleCase(receipt.method)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-sm">
                <dt className="font-black text-slate-900">Settled Amount (UGX)</dt>
                <dd className="font-black tabular-nums text-emerald-700 text-base">
                  {money(receipt.amount)}
                </dd>
              </div>
            </dl>

            {/* Footer Verification Barcode */}
            <div className="border-t-2 border-slate-200 pt-3 text-center space-y-1">
              <p className="text-[0.625rem] text-slate-500">
                TIN: 1002938481 · Bank of Uganda Electronic Payment Audit Log
              </p>
              <p className="text-[0.5625rem] font-mono text-slate-400">
                Authorized electronic settlement voucher generated by LinkBus Platform.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Mark Refund Dialog ── */}
      <ConfirmDialog
        open={Boolean(refunding)}
        title="Mark this payment as refunded?"
        consequence={
          refunding
            ? `Transaction #${refunding.transaction_id} for ${money(refunding.amount)} will be marked as REFUNDED to ${titleCase(refunding.method)}. This updates the financial ledger.`
            : ''
        }
        confirmLabel="Confirm Refund"
        pending={pending}
        onConfirm={confirmRefund}
        onClose={() => setRefunding(null)}
      />
    </div>
  );
}