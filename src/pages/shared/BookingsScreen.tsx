import React, { useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  DownloadIcon,
  EyeIcon,
  FileSpreadsheetIcon,
  MessageSquareIcon,
  PhoneIcon,
  PrinterIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  SmartphoneIcon,
  SparklesIcon,
  TicketIcon,
  TrendingUpIcon,
  UserCheckIcon,
  XCircleIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { ReceiptModal } from '../../components/modals/ReceiptModal';
import { CashCollectionModal } from '../../components/modals/CashCollectionModal';
import { Button } from '../../components/ui/Button';
import { DateInput } from '../../components/ui/Inputs';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { EmptyState } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { errorMessage } from '../../hooks/useAsync';
import { usePaginated } from '../../hooks/usePaginated';
import {
  confirmCashPayment,
  listBookings,
  refundBooking,
  updateBookingStatus,
} from '../../services/bookings';
import type { BookingDetail } from '../../types/api';
import type { BookingStatus, PaymentMethod } from '../../types/models';
import { formatDateTime, formatTime, money, titleCase, toDateInput } from '../../utils/format';

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
  { value: 'pending', label: 'Pending Payment' },
  { value: 'confirmed', label: 'Confirmed & Paid' },
  { value: 'completed', label: 'Trip Completed' },
  { value: 'cancelled', label: 'Cancelled / Refunded' },
];

export function BookingsScreen({ canRefund = false }: { canRefund?: boolean }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [selected, setSelected] = useState<BookingDetail | null>(null);
  const [receipt, setReceipt] = useState<BookingDetail | null>(null);
  const [cashModalBooking, setCashModalBooking] = useState<BookingDetail | null>(null);
  const [tenderedAmount, setTenderedAmount] = useState<number | undefined>(undefined);
  const [changeReturnedAmount, setChangeReturnedAmount] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<BookingStatus>('confirmed');
  const [saving, setSaving] = useState(false);

  const [range, setRange] = useState({
    date_from: shiftDays(30),
    date_to: toDateInput(new Date()),
  });
  const [applied, setApplied] = useState(range);

  const state = usePaginated<BookingDetail>(({ page, perPage, search, filters }) =>
    listBookings({
      page,
      perPage,
      search,
      status: filters.status,
      date: filters.date,
      date_from: applied.date_from,
      date_to: applied.date_to,
    })
  );

  React.useEffect(() => {
    state.reload();
  }, [applied.date_from, applied.date_to]);

  const open = (booking: BookingDetail) => {
    setSelected(booking);
    setStatus(booking.status);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateBookingStatus(selected.id, status);
      toast.success(`Booking #${selected.booking_number} updated to ${status.toUpperCase()}`);
      setSelected(null);
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const refund = async () => {
    if (!selected) return;
    if (!window.confirm(`Are you sure you want to refund and cancel Booking #${selected.booking_number}? Seats will be released back to the inventory.`)) {
      return;
    }
    setSaving(true);
    try {
      await refundBooking(selected.id);
      toast.success(`Booking #${selected.booking_number} cancelled & refunded.`);
      setSelected(null);
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleShareWhatsApp = (booking: BookingDetail) => {
    const firstTicket = booking.tickets[0];
    const phone = (firstTicket?.passenger_phone || booking.passenger?.phone || '').replace(/[^\d]/g, '');
    const cleanPhone = phone.startsWith('0') ? '256' + phone.substring(1) : phone;

    const origin = booking.trip?.origin?.city ?? 'Origin';
    const dest = booking.trip?.destination?.city ?? 'Destination';
    const depTime = booking.trip?.departure_time ? formatDateTime(booking.trip.departure_time) : 'Scheduled Time';
    const seats = booking.seats.map((s) => s.seat_number).join(', ') || 'Assigned';

    const message = encodeURIComponent(
      `🚌 *LINKBUS UGANDA — RESERVATION SUMMARY*\n\n` +
      `Hello *${firstTicket?.passenger_name ?? booking.passenger?.name ?? 'Customer'}*, your booking is active:\n\n` +
      `📋 *Booking Ref:* #${booking.booking_number}\n` +
      `📍 *Route:* ${origin} ➔ ${dest}\n` +
      `🕒 *Departure:* ${depTime}\n` +
      `💺 *Seat(s):* [${seats}]\n` +
      `💳 *Amount:* ${money(booking.total_amount)} (${titleCase(booking.payment_method)})\n\n` +
      `🔗 *View e-Tickets:* ${window.location.origin}/my-tickets\n\n` +
      `Safe Travels with LinkBus Uganda!`
    );

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
    toast.success(`WhatsApp reservation link generated for #${booking.booking_number}`);
  };

  const handleExportCSV = () => {
    const rows = state.rows || [];
    if (rows.length === 0) {
      toast.info('No booking records to export.');
      return;
    }

    const headers = [
      'Booking Ref',
      'Created Date',
      'Primary Passenger',
      'Phone Number',
      'Route Origin',
      'Route Destination',
      'Departure Time',
      'Assigned Seats',
      'Payment Method',
      'Subtotal (UGX)',
      'Discount (UGX)',
      'Tax (UGX)',
      'Total Amount (UGX)',
      'Booking Status',
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((b) => {
        const firstTicket = b.tickets[0];
        const name = firstTicket?.passenger_name ?? b.passenger?.name ?? '';
        const phone = firstTicket?.passenger_phone ?? b.passenger?.phone ?? '';
        const seats = b.seats.map((s) => s.seat_number).join('; ');

        return [
          `"${b.booking_number}"`,
          `"${formatDateTime(b.created_at)}"`,
          `"${name.replace(/"/g, '""')}"`,
          `"${phone}"`,
          `"${b.trip?.origin?.city ?? ''}"`,
          `"${b.trip?.destination?.city ?? ''}"`,
          `"${b.trip?.departure_time ? formatDateTime(b.trip.departure_time) : ''}"`,
          `"${seats}"`,
          `"${b.payment_method}"`,
          b.subtotal || 0,
          b.discount_amount || 0,
          b.tax_amount || 0,
          b.total_amount || 0,
          `"${b.status}"`,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LinkBus-Bookings-${toDateInput(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Bookings ledger exported to CSV.');
  };

  const renderPaymentIcon = (method: PaymentMethod | string) => {
    switch (method) {
      case 'mtn_mobile_money':
        return <SmartphoneIcon className="h-3.5 w-3.5 text-amber-500" />;
      case 'airtel_money':
        return <SmartphoneIcon className="h-3.5 w-3.5 text-red-500" />;
      case 'card':
        return <CreditCardIcon className="h-3.5 w-3.5 text-blue-500" />;
      case 'cash':
      default:
        return <BanknoteIcon className="h-3.5 w-3.5 text-emerald-500" />;
    }
  };

  const columns: Column<BookingDetail>[] = [
    {
      key: 'booking',
      header: 'Booking Ref & Date',
      render: (booking) => (
        <div className="py-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-fg bg-surface-2 px-2 py-0.5 rounded-md border border-line shadow-2xs">
              <TicketIcon className="h-3 w-3 text-brand-600" />
              #{booking.booking_number}
            </span>
            {booking.linked_booking && (
              <span className="inline-flex items-center rounded bg-purple-500/15 border border-purple-500/30 px-1 py-0.2 text-[0.625rem] font-bold text-purple-700 dark:text-purple-300">
                Round Trip
              </span>
            )}
          </div>
          <p className="text-[0.6875rem] text-muted font-mono mt-0.5">
            {formatDateTime(booking.created_at)}
          </p>
        </div>
      ),
    },
    {
      key: 'passenger',
      header: 'Passenger / Customer',
      render: (booking) => {
        const firstTicket = booking.tickets[0];
        const name = firstTicket?.passenger_name ?? booking.passenger?.name ?? '—';
        const phone = firstTicket?.passenger_phone ?? booking.passenger?.phone ?? '';

        return (
          <div>
            <p className="font-bold text-fg text-sm">{name}</p>
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-brand-600 mt-0.5"
              >
                <PhoneIcon className="h-2.5 w-2.5" />
                {phone}
              </a>
            ) : (
              <span className="text-xs text-muted">Walk-in Customer</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'trip',
      header: 'Route & Departure',
      hideBelow: 'md',
      render: (booking) => (
        <div>
          <p className="font-bold text-fg text-xs">
            {booking.trip?.origin?.city ?? '—'} <span className="text-brand-600">➔</span> {booking.trip?.destination?.city ?? '—'}
          </p>
          <p className="text-[0.6875rem] text-muted flex items-center gap-1 mt-0.5">
            <CalendarClockIcon className="h-3 w-3 text-brand-600" />
            {booking.trip?.departure_time ? formatDateTime(booking.trip.departure_time) : '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'seats',
      header: 'Seats Allocated',
      hideBelow: 'lg',
      render: (booking) => {
        const seatsList = booking.seats.map((s) => s.seat_number);
        return (
          <div className="flex flex-wrap gap-1">
            {seatsList.length > 0 ? (
              seatsList.map((sn) => (
                <span
                  key={sn}
                  className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-brand-600 px-1.5 font-mono text-xs font-bold text-white shadow-2xs"
                >
                  {sn}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">—</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'payment',
      header: 'Payment Channel',
      hideBelow: 'sm',
      render: (booking) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
          {renderPaymentIcon(booking.payment_method)}
          <span>{titleCase(booking.payment_method)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Booking Status',
      render: (booking) => <StatusPill status={booking.status} />,
    },
    {
      key: 'total',
      header: 'Total Paid',
      align: 'right',
      render: (booking) => (
        <div>
          <span className="font-extrabold tabular-nums text-fg text-sm block">
            {money(booking.total_amount)}
          </span>
          {booking.discount_amount > 0 && (
            <span className="text-[0.625rem] font-bold text-emerald-600 block">
              −{money(booking.discount_amount)} voucher
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (booking) => (
        <div className="flex items-center justify-end gap-1.5">
          {booking.status === 'pending' && (
            <button
              type="button"
              onClick={() => setCashModalBooking(booking)}
              title="Collect cash payment & activate tickets"
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors shadow-2xs"
            >
              <BanknoteIcon className="h-3.5 w-3.5" />
              Collect Cash
            </button>
          )}

          <button
            type="button"
            onClick={() => handleShareWhatsApp(booking)}
            title="Share on WhatsApp"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-emerald-500/15 hover:text-emerald-600"
          >
            <MessageSquareIcon className="h-4 w-4" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setReceipt(booking)}
            title={`View receipt for #${booking.booking_number}`}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ReceiptTextIcon className="h-4 w-4" aria-hidden />
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => open(booking)}
            className="text-xs font-semibold"
            icon={<EyeIcon className="h-3.5 w-3.5" />}
            title={`View booking #${booking.booking_number}`}
          >
            Manage
          </Button>
        </div>
      ),
    },
  ];

  // Summary Metrics Insights
  const metrics = useMemo(() => {
    const rows = state.rows;
    const totalCount = state.meta.total || rows.length;
    const confirmed = rows.filter((b) => b.status === 'confirmed' || b.status === 'completed');
    const pending = rows.filter((b) => b.status === 'pending');
    const cancelled = rows.filter((b) => b.status === 'cancelled');

    const confirmedCount = confirmed.length;
    const pendingCount = pending.length;
    const cancelledCount = cancelled.length;
    const settledVolume = confirmed.reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0);

    return {
      totalCount,
      confirmedCount,
      pendingCount,
      cancelledCount,
      settledVolume,
    };
  }, [state.rows, state.meta.total]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Bookings &amp; Passenger Reservations
          </h1>
          <p className="mt-1 text-xs text-muted max-w-xl">
            Manage passenger reservations, collect POS counter cash, print official settlement receipts, manage seat allocations, and process cancellations &amp; refunds.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            icon={<FileSpreadsheetIcon className="h-4 w-4" />}
            onClick={handleExportCSV}
          >
            Export Bookings CSV
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
                id="booking-from"
                value={range.date_from}
                max={range.date_to}
                onChange={(e) => setRange({ ...range, date_from: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">To</span>
              <DateInput
                id="booking-to"
                value={range.date_to}
                min={range.date_from}
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

      {/* ── KPI Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Bookings */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              <ReceiptTextIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Total Bookings
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.totalCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">All registered reservations</p>
        </div>

        {/* Confirmed & Paid */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Confirmed &amp; Paid
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-emerald-950 dark:text-emerald-100 tabular-nums">
            {metrics.confirmedCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-emerald-800 dark:text-emerald-300">Active confirmed passenger seats</p>
        </div>

        {/* Pending Payment */}
        <div className={`rounded-2xl border p-4 shadow-sm hover-lift transition-all ${
          metrics.pendingCount > 0 ? 'border-amber-500/30 bg-amber-500/10' : 'border-line bg-surface'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              metrics.pendingCount > 0 ? 'bg-amber-600 text-white' : 'bg-slate-500/10 text-slate-500'
            }`}>
              <ClockIcon className="h-4 w-4" />
            </span>
            <span className={`text-xs font-bold ${
              metrics.pendingCount > 0 ? 'text-amber-950 dark:text-amber-200 uppercase tracking-wider' : 'text-fg uppercase tracking-wider'
            }`}>
              Pending Payment
            </span>
          </div>
          <p className={`mt-2 font-extrabold text-2xl tabular-nums ${
            metrics.pendingCount > 0 ? 'text-amber-950 dark:text-amber-100' : 'text-fg'
          }`}>
            {metrics.pendingCount.toLocaleString()}
          </p>
          <p className={`text-[0.6875rem] ${
            metrics.pendingCount > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-muted'
          }`}>
            Awaiting counter cash or MoMo push
          </p>
        </div>

        {/* Settled Revenue */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BanknoteIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Settled Volume
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {money(metrics.settledVolume)}
          </p>
          <p className="text-[0.6875rem] text-muted">Paid booking receipts</p>
        </div>
      </div>

      {/* ── Bookings Data Table ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search booking #, passenger name, ticket or corridor…"
          filters={[
            {
              key: 'status',
              label: 'All booking statuses',
              options: statusOptions,
            },
            {
              key: 'date',
              label: 'Departure date',
              options: [],
              type: 'date',
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />
        <DataTable<BookingDetail>
          columns={columns}
          rows={state.rows}
          rowKey={(booking) => booking.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          onRowClick={open}
          caption="Bookings"
          empty={
            <EmptyState
              icon={<CalendarClockIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0
                  ? 'No bookings match those filters'
                  : 'No bookings registered yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or status filter.'
                  : 'Bookings made online or at the station POS counter will populate here automatically.'
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
        <Pagination meta={state.meta} onPageChange={state.setPage} onPerPageChange={state.setPerPage} label="bookings" />
      </Panel>

      {/* ── Booking Inspection & Status Modal ── */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Booking #${selected.booking_number}` : ''}
        subtitle={selected ? `Placed on ${formatDateTime(selected.created_at)}` : undefined}
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div>
              {canRefund && selected && selected.status !== 'cancelled' && (
                <Button variant="danger" onClick={refund} disabled={saving}>
                  Refund &amp; Cancel
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSelected(null)} disabled={saving}>
                Close
              </Button>
              <Button onClick={save} loading={saving} disabled={selected?.status === status}>
                Save Status Changes
              </Button>
            </div>
          </div>
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* Pending Payment Collection Notice */}
            {selected.status === 'pending' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs">
                <div>
                  <p className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-sm">
                    <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
                    Awaiting Cash Payment at Station Counter
                  </p>
                  <p className="text-amber-700/90 dark:text-amber-400 mt-1">
                    Outstanding balance: <strong className="font-bold text-fg">{money(selected.total_amount)}</strong>. Collect cash from passenger to activate their tickets.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm font-bold"
                  icon={<BanknoteIcon className="h-4 w-4" />}
                  onClick={() => setCashModalBooking(selected)}
                >
                  Collect {money(selected.total_amount)} &amp; Issue Passes
                </Button>
              </div>
            )}

            {/* Passenger & Itinerary Summary */}
            <dl className="grid gap-x-4 gap-y-3.5 rounded-xl border border-line bg-surface-2/40 p-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted">Primary Passenger</dt>
                <dd className="font-bold text-fg text-sm">
                  {selected.tickets[0]?.passenger_name ?? selected.passenger?.name ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Payment Channel</dt>
                <dd className="font-bold text-fg text-sm flex items-center gap-1.5 mt-0.5">
                  {renderPaymentIcon(selected.payment_method)}
                  {titleCase(selected.payment_method)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Corridor Route</dt>
                <dd className="font-semibold text-fg">
                  {selected.trip?.origin?.city ?? '—'} ➔ {selected.trip?.destination?.city ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Scheduled Departure</dt>
                <dd className="font-semibold text-fg">
                  {selected.trip?.departure_time ? formatDateTime(selected.trip.departure_time) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Assigned Coach</dt>
                <dd className="font-mono font-bold text-fg">
                  {selected.trip?.bus?.plate_number ?? '—'} ({selected.trip?.bus?.model ?? ''})
                </dd>
              </div>
              <div>
                <dt className="text-muted">Journey Type</dt>
                <dd className="font-semibold text-fg">
                  {selected.linked_booking ? `Round Trip (Ref #${selected.linked_booking.booking_number})` : 'One-Way Departure'}
                </dd>
              </div>
            </dl>

            {/* Issued Passenger Tickets Table */}
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                Issued Passenger Boarding Passes ({selected.tickets.length})
              </h3>
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line bg-surface-2 text-left text-muted">
                      <th scope="col" className="px-3.5 py-2.5 font-bold">
                        Ticket Number
                      </th>
                      <th scope="col" className="px-3.5 py-2.5 font-bold">
                        Passenger Name
                      </th>
                      <th scope="col" className="px-3.5 py-2.5 font-bold">
                        Seat
                      </th>
                      <th scope="col" className="px-3.5 py-2.5 text-right font-bold">
                        Boarding Gate Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {selected.tickets.map((ticket) => {
                      const seat = selected.seats.find((item) => item.id === ticket.trip_seat_id);
                      return (
                        <tr key={ticket.id} className="hover:bg-surface-2/50 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-fg">
                            {ticket.ticket_number}
                          </td>
                          <td className="px-3.5 py-2.5 text-fg font-medium">{ticket.passenger_name}</td>
                          <td className="px-3.5 py-2.5 font-mono font-bold text-brand-600">
                            {seat?.seat_number ?? (ticket as any).seat?.seat_number ?? (ticket as any).seat_number ?? '—'}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <StatusPill status={ticket.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Itemized Financial Breakdown */}
            <dl className="space-y-2 rounded-xl bg-surface-2/60 p-4 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">Fares Subtotal ({selected.seats.length} seats)</dt>
                <dd className="font-semibold tabular-nums text-fg">{money(selected.subtotal)}</dd>
              </div>
              {selected.discount_amount > 0 && (
                <div className="flex justify-between text-brand-700 dark:text-brand-300">
                  <dt>Promo Voucher Discount</dt>
                  <dd className="font-bold tabular-nums">−{money(selected.discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">VAT Tax ({settings.tax_rate_percentage}%)</dt>
                <dd className="tabular-nums text-fg">{money(selected.tax_amount)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-sm">
                <dt className="font-extrabold text-fg">Grand Total Settled</dt>
                <dd className="font-extrabold tabular-nums text-fg">{money(selected.total_amount)}</dd>
              </div>
            </dl>

            {/* Status Modification */}
            <div>
              <label htmlFor="booking-status" className="mb-1.5 block text-xs font-bold text-fg">
                Adjust Booking Status
              </label>
              <select
                id="booking-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as BookingStatus)}
                className="field text-xs font-semibold"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {status === 'cancelled' && selected.status !== 'cancelled' && (
                <p className="mt-1.5 flex items-center gap-1 text-[0.6875rem] text-amber-600 dark:text-amber-400">
                  <AlertTriangleIcon className="h-3.5 w-3.5" />
                  Cancelling marks all tickets void and releases seats back into the available pool.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modern Station Counter Cash Collection Modal ── */}
      <CashCollectionModal
        booking={cashModalBooking}
        open={Boolean(cashModalBooking)}
        onClose={() => setCashModalBooking(null)}
        onSuccess={(updatedBooking, tender, change, autoPrint) => {
          setTenderedAmount(tender);
          setChangeReturnedAmount(change);
          state.reload();
          if (selected && selected.id === updatedBooking.id) {
            setSelected(updatedBooking);
          }
          if (autoPrint) {
            setReceipt(updatedBooking);
          }
        }}
      />

      {/* ── Official Printable Payment Receipt Modal ── */}
      <ReceiptModal
        booking={receipt}
        open={Boolean(receipt)}
        onClose={() => {
          setReceipt(null);
          setTenderedAmount(undefined);
          setChangeReturnedAmount(undefined);
        }}
        companyName={settings.company_name}
        cashierName={user?.name}
        amountTendered={tenderedAmount}
        changeReturned={changeReturnedAmount}
      />
    </div>
  );
}