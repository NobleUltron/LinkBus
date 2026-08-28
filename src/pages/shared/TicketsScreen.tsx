import React, { useMemo, useState } from 'react';
import {
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  CompassIcon,
  DownloadIcon,
  EyeIcon,
  FileSpreadsheetIcon,
  MessageSquareIcon,
  PhoneIcon,
  PrinterIcon,
  QrCodeIcon,
  Share2Icon,
  SparklesIcon,
  TicketIcon,
  UserCheckIcon,
  UsersIcon,
  XCircleIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { BoardingPassModal } from '../../components/modals/BoardingPassModal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DateInput } from '../../components/ui/Inputs';
import { Panel } from '../../components/ui/Panel';
import { EmptyState } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { errorMessage } from '../../hooks/useAsync';
import { usePaginated } from '../../hooks/usePaginated';
import { listTickets, updateTicketStatus, type TicketDetail } from '../../services/tickets';
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
  { value: 'active', label: 'Active & Ready for Boarding' },
  { value: 'used', label: 'Boarded / Scanned' },
  { value: 'cancelled', label: 'Cancelled / Voided' },
];

export function TicketsScreen({ canVoid = false }: { canVoid?: boolean }) {
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [voiding, setVoiding] = useState<TicketDetail | null>(null);
  const [voidPending, setVoidPending] = useState(false);

  const [range, setRange] = useState({
    date_from: shiftDays(30),
    date_to: toDateInput(new Date()),
  });
  const [applied, setApplied] = useState(range);

  const state = usePaginated<TicketDetail>(({ page, perPage, search, filters }) =>
    listTickets({
      page,
      perPage,
      search,
      status: filters.status,
      date_from: applied.date_from,
      date_to: applied.date_to,
    })
  );

  React.useEffect(() => {
    state.reload();
  }, [applied.date_from, applied.date_to]);

  const confirmVoidTicket = async () => {
    if (!voiding) return;
    setVoidPending(true);
    try {
      await updateTicketStatus(voiding.id, 'cancelled');
      toast.success(`Ticket #${voiding.ticket_number} voided successfully.`);
      setVoiding(null);
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setVoidPending(false);
    }
  };

  const handleShareWhatsApp = (ticket: TicketDetail) => {
    const phone = (ticket.passenger_phone || '').replace(/[^\d]/g, '');
    const cleanPhone = phone.startsWith('0')
      ? '256' + phone.substring(1)
      : phone;

    const origin = ticket.trip?.origin?.city ?? 'Origin';
    const dest = ticket.trip?.destination?.city ?? 'Destination';
    const depTime = ticket.trip?.departure_time ? formatDateTime(ticket.trip.departure_time) : 'Scheduled Time';
    const seat = ticket.seat?.seat_number ?? 'TBD';

    const message = encodeURIComponent(
      `🚌 *LINKBUS UGANDA — DIGITAL BOARDING PASS*\n\n` +
      `Hello *${ticket.passenger_name}*, here is your travel pass:\n\n` +
      `🎟️ *Ticket #:* ${ticket.ticket_number}\n` +
      `📋 *Booking Ref:* #${ticket.booking?.booking_number ?? ''}\n` +
      `📍 *Route:* ${origin} ➔ ${dest}\n` +
      `🕒 *Departure:* ${depTime}\n` +
      `💺 *Seat Number:* ${seat} (${ticket.seat?.seat_class === 'vip' ? 'VIP Executive' : 'Standard'})\n` +
      `🚍 *Coach:* ${ticket.trip?.bus?.plate_number ?? 'Assigned at Bay'}\n\n` +
      `🔗 *View Pass:* http://localhost:5173/my-tickets\n\n` +
      `⚠️ _Please arrive at the station 20 minutes before departure for QR check-in._`
    );

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(url, '_blank');
    toast.success(`WhatsApp ticket shared for ${ticket.passenger_name}`);
  };

  const handleExportCSV = () => {
    const rows = state.rows || [];
    if (rows.length === 0) {
      toast.info('No ticket records to export.');
      return;
    }

    const headers = [
      'Ticket Number',
      'Booking Ref',
      'Passenger Name',
      'Phone Number',
      'Origin City',
      'Destination City',
      'Departure Time',
      'Assigned Seat',
      'Seat Class',
      'Fare (UGX)',
      'Ticket Status',
      'Boarded Timestamp',
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((t) =>
        [
          `"${t.ticket_number}"`,
          `"${t.booking?.booking_number ?? ''}"`,
          `"${t.passenger_name.replace(/"/g, '""')}"`,
          `"${t.passenger_phone ?? ''}"`,
          `"${t.trip?.origin?.city ?? ''}"`,
          `"${t.trip?.destination?.city ?? ''}"`,
          `"${t.trip?.departure_time ? formatDateTime(t.trip.departure_time) : ''}"`,
          `"${t.seat?.seat_number ?? ''}"`,
          `"${t.seat?.seat_class ?? 'standard'}"`,
          t.price || 0,
          `"${t.status}"`,
          `"${t.boarded_at ? formatDateTime(t.boarded_at) : ''}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LinkBus-Tickets-${toDateInput(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Tickets registry exported to CSV.');
  };

  const columns: Column<TicketDetail>[] = [
    {
      key: 'ticket',
      header: 'Ticket # & Ref',
      render: (ticket) => (
        <div className="py-1">
          <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-fg bg-surface-2 px-2 py-0.5 rounded-md border border-line shadow-2xs">
            <TicketIcon className="h-3 w-3 text-brand-600" />
            {ticket.ticket_number}
          </span>
          <p className="text-[0.6875rem] text-muted font-mono mt-0.5">
            Ref #{ticket.booking?.booking_number ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'passenger',
      header: 'Passenger Details',
      render: (ticket) => (
        <div>
          <p className="font-bold text-fg text-sm">{ticket.passenger_name}</p>
          {ticket.passenger_phone ? (
            <a
              href={`tel:${ticket.passenger_phone}`}
              className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-brand-600 mt-0.5"
            >
              <PhoneIcon className="h-2.5 w-2.5" />
              {ticket.passenger_phone}
            </a>
          ) : (
            <span className="text-xs text-muted">Walk-in Passenger</span>
          )}
        </div>
      ),
    },
    {
      key: 'trip',
      header: 'Route & Schedule',
      hideBelow: 'md',
      render: (ticket) => (
        <div>
          <p className="font-bold text-fg text-xs">
            {ticket.trip?.origin?.city ?? '—'} <span className="text-brand-600">➔</span> {ticket.trip?.destination?.city ?? '—'}
          </p>
          <p className="text-[0.6875rem] text-muted flex items-center gap-1 mt-0.5">
            <ClockIcon className="h-3 w-3 text-brand-600" />
            {ticket.trip?.departure_time ? formatDateTime(ticket.trip.departure_time) : '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'seat',
      header: 'Assigned Seat',
      hideBelow: 'sm',
      render: (ticket) => {
        const isVip = ticket.seat?.seat_class === 'vip';
        return (
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-black shadow-2xs border ${
              isVip
                ? 'bg-amber-500/20 text-amber-950 dark:text-amber-200 border-amber-500/40'
                : 'bg-brand-600 text-white border-brand-700'
            }`}>
              {ticket.seat?.seat_number ?? '—'}
            </span>
            <span className={`text-xs font-bold ${isVip ? 'text-amber-700 dark:text-amber-300' : 'text-muted'}`}>
              {isVip ? 'VIP Recliner' : 'Standard'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Boarding Status',
      render: (ticket) => {
        if (ticket.boarded_at) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <CheckCircle2Icon className="h-3.5 w-3.5" />
              Boarded {formatTime(ticket.boarded_at)}
            </span>
          );
        }
        return <StatusPill status={ticket.status} />;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (ticket) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold"
            onClick={() => {
              setAutoPrint(false);
              setSelected(ticket);
            }}
            icon={<EyeIcon className="h-3.5 w-3.5" />}
            title="View Digital Boarding Pass"
          >
            Pass
          </Button>

          <button
            type="button"
            onClick={() => handleShareWhatsApp(ticket)}
            aria-label={`Share on WhatsApp ${ticket.ticket_number}`}
            title="Share via WhatsApp"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-emerald-500/15 hover:text-emerald-600"
          >
            <MessageSquareIcon className="h-4 w-4" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => {
              setAutoPrint(true);
              setSelected(ticket);
            }}
            aria-label={`Print ${ticket.ticket_number}`}
            title="Print Physical Ticket"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <PrinterIcon className="h-4 w-4" aria-hidden />
          </button>

          {canVoid && ticket.status === 'active' && (
            <button
              type="button"
              onClick={() => setVoiding(ticket)}
              title="Void / Cancel Ticket"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/15 hover:text-red-600"
            >
              <BanIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Summary Metrics Insights
  const metrics = useMemo(() => {
    const rows = state.rows;
    const totalCount = state.meta.total || rows.length;
    const active = rows.filter((t) => t.status === 'active');
    const used = rows.filter((t) => t.status === 'used' || Boolean(t.boarded_at));
    const cancelled = rows.filter((t) => t.status === 'cancelled');

    return {
      totalCount,
      activeCount: active.length,
      usedCount: used.length,
      cancelledCount: cancelled.length,
    };
  }, [state.rows, state.meta.total]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Passenger Tickets &amp; Boarding Passes
          </h1>
          <p className="mt-1 text-xs text-muted max-w-xl">
            Search, print, share, and verify individual passenger boarding passes across LinkBus corridors. Track real-time gate check-ins and coach seat assignments.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            icon={<FileSpreadsheetIcon className="h-4 w-4" />}
            onClick={handleExportCSV}
          >
            Export Tickets CSV
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
                id="ticket-from"
                value={range.date_from}
                max={range.date_to}
                onChange={(e) => setRange({ ...range, date_from: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">To</span>
              <DateInput
                id="ticket-to"
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

      {/* ── KPI Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tickets */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              <TicketIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Total Tickets
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.totalCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">All issued passenger passes</p>
        </div>

        {/* Active & Ready */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Active &amp; Ready
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-emerald-950 dark:text-emerald-100 tabular-nums">
            {metrics.activeCount.toLocaleString()} Passes
          </p>
          <p className="text-[0.6875rem] text-emerald-800 dark:text-emerald-300">Valid for gate check-in</p>
        </div>

        {/* Boarded / Used */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserCheckIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Boarded / Used
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-blue-600 dark:text-blue-400 tabular-nums">
            {metrics.usedCount.toLocaleString()} Scanned
          </p>
          <p className="text-[0.6875rem] text-muted">Checked in onboard coach</p>
        </div>

        {/* Cancelled / Voided */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <BanIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Voided / Cancelled
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-red-600 dark:text-red-400 tabular-nums">
            {metrics.cancelledCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">Cancelled or released seats</p>
        </div>
      </div>

      {/* ── Tickets Table Panel ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search ticket #, passenger name, phone or booking ref…"
          filters={[
            {
              key: 'status',
              label: 'All ticket statuses',
              options: statusOptions,
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />
        <DataTable<TicketDetail>
          columns={columns}
          rows={state.rows}
          rowKey={(ticket) => ticket.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="Tickets"
          empty={
            <EmptyState
              icon={<TicketIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0 ? 'No tickets match those filters' : 'No tickets issued yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or status filter.'
                  : 'Tickets are generated automatically upon online booking confirmation or POS counter checkout.'
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
        <Pagination meta={state.meta} onPageChange={state.setPage} onPerPageChange={state.setPerPage} label="tickets" />
      </Panel>

      {/* ── Boarding Pass Modal ── */}
      <BoardingPassModal
        ticket={selected}
        open={Boolean(selected)}
        autoPrint={autoPrint}
        onClose={() => {
          setSelected(null);
          setAutoPrint(false);
        }}
      />

      {/* ── Void Ticket Confirmation Dialog ── */}
      <ConfirmDialog
        open={Boolean(voiding)}
        title="Void this boarding ticket?"
        body={
          voiding
            ? `Ticket #${voiding.ticket_number} for passenger “${voiding.passenger_name}” (Seat ${voiding.seat?.seat_number ?? 'TBD'}) will be cancelled and marked invalid at gate check-in.`
            : ''
        }
        confirmLabel="Void Ticket"
        variant="danger"
        loading={voidPending}
        onConfirm={confirmVoidTicket}
        onCancel={() => setVoiding(null)}
      />
    </div>
  );
}