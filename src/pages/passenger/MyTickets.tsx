import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  MapPinIcon,
  MessageSquareIcon,
  PrinterIcon,
  QrCodeIcon,
  TicketIcon,
  UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { BoardingPassModal } from '../../components/modals/BoardingPassModal';
import { Pagination } from '../../components/data/Pagination';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { QrCode } from '../../components/ui/QrCode';
import { useAuth } from '../../contexts/AuthContext';
import { usePaginated } from '../../hooks/usePaginated';
import { listTickets, type TicketDetail } from '../../services/tickets';
import { formatDate, formatTime, titleCase } from '../../utils/format';

const statusFilters = [
  { value: '', label: 'All Passes' },
  { value: 'active', label: 'Active & Ready' },
  { value: 'used', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function MyTickets() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);

  const state = usePaginated<TicketDetail>(
    ({ page, perPage, search, filters }) =>
      listTickets({
        page,
        perPage,
        search,
        status: filters.status,
        userId: user?.id,
      }),
    { perPage: 6 }
  );

  const shareToWhatsapp = (ticket: TicketDetail) => {
    const text =
      `🚌 *LINKBUS UGANDA — DIGITAL BOARDING PASS*\n\n` +
      `👤 *Passenger:* ${ticket.passenger_name}\n` +
      `🎫 *Ticket No:* \`${ticket.ticket_number}\`\n` +
      `📍 *Corridor:* ${ticket.trip.origin.city} ➔ ${ticket.trip.destination.city}\n` +
      `🕒 *Departure:* ${formatDate(ticket.trip.departure_time)} @ ${formatTime(ticket.trip.departure_time)}\n` +
      `💺 *Seat:* ${ticket.seat.seat_number} (${titleCase(ticket.seat.seat_class)})\n` +
      `🚍 *Coach Plate:* ${ticket.trip.bus.plate_number}\n\n` +
      `🔗 *View Ticket Online:* ${window.location.origin}/my-tickets\n\n` +
      `_Please arrive at the terminal 20 minutes before departure. Have a safe trip!_`;

    const cleanPhone = ticket.passenger_phone.replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '256' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
    toast.success('Opening WhatsApp with digital pass...');
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header & Filter Tabs ── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            My Digital Boarding Passes
          </h1>
          <p className="mt-1 text-xs text-muted">
            Present your QR boarding pass at the terminal departure gate for instant check-in.
          </p>
        </div>

        <Link
          to="/search"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95 self-start md:self-auto"
        >
          <TicketIcon className="h-3.5 w-3.5" />
          Book Another Trip
        </Link>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => {
            const active = (state.filters.status ?? '') === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => state.setFilter('status', filter.value)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  active
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'border border-line bg-surface text-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted font-semibold">
          {state.meta.total} Total Boarding Passes
        </p>
      </div>

      {/* Loading Skeletons */}
      {state.loading && (
        <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton h-60 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error State */}
      {!state.loading && state.error && (
        <Panel>
          <ErrorState message={state.error} onRetry={state.reload} />
        </Panel>
      )}

      {/* Empty State */}
      {!state.loading && !state.error && state.rows.length === 0 && (
        <Panel>
          <EmptyState
            icon={<TicketIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden />}
            title={state.filters.status ? 'No passes matching this filter' : 'No tickets booked yet'}
            body={
              state.filters.status
                ? 'Try another status filter to see the rest of your boarding passes.'
                : 'Once you book an intercity departure, your QR boarding pass will appear here ready for gate check-in.'
            }
            action={
              state.filters.status ? (
                <Button variant="outline" onClick={state.clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Link
                  to="/search"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700"
                >
                  Find a Departure
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              )
            }
          />
        </Panel>
      )}

      {/* Boarding Passes Grid (Airline-Style Cut-Out Ticket Cards) */}
      {!state.loading && !state.error && state.rows.length > 0 && (
        <>
          <ul className="grid gap-6 lg:grid-cols-2">
            {state.rows.map((ticket) => (
              <li
                key={ticket.id}
                className="card-surface hover-lift group relative overflow-hidden rounded-2xl border border-line transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg"
              >
                {/* Ticket Top Header Bar */}
                <div className="flex items-center justify-between border-b border-line bg-surface-2/40 px-5 py-3.5">
                  <div>
                    <span className="text-[0.625rem] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                      LinkBus Official Boarding Pass
                    </span>
                    <h2 className="mt-0.5 text-base font-extrabold text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {ticket.trip.origin.city} ➔ {ticket.trip.destination.city}
                    </h2>
                  </div>
                  <StatusPill status={ticket.status} />
                </div>

                {/* Ticket Body Content */}
                <div className="grid grid-cols-[1fr_auto] gap-4 p-5">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                        Passenger
                      </dt>
                      <dd className="font-bold text-fg text-sm mt-0.5 truncate">
                        {ticket.passenger_name}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                        Assigned Seat
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-1.5">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white font-mono text-xs font-bold">
                          {ticket.seat.seat_number}
                        </span>
                        <span className="font-bold text-fg">
                          {titleCase(ticket.seat.seat_class)}
                        </span>
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                        Departure Date
                      </dt>
                      <dd className="font-semibold text-fg mt-0.5">
                        {formatDate(ticket.trip.departure_time)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                        Departure Time
                      </dt>
                      <dd className="font-bold tabular-nums text-fg text-sm mt-0.5">
                        {formatTime(ticket.trip.departure_time)}
                      </dd>
                    </div>
                  </dl>

                  {/* QR Barcode Preview */}
                  <div className="flex flex-col items-center justify-center border-l border-line/60 pl-4">
                    <QrCode value={ticket.qr_code} size={88} />
                    <span className="text-[0.5625rem] font-mono text-muted mt-1">Scan at Gate</span>
                  </div>
                </div>

                {/* Dashed Stub Divider with Realistic Cut-Out Notches */}
                <div className="relative border-t border-dashed border-line bg-surface px-5 py-3">
                  <span
                    className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-app border border-line/60"
                    aria-hidden
                  />
                  <span
                    className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-app border border-line/60"
                    aria-hidden
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[0.6875rem] font-mono text-muted">
                      {ticket.ticket_number} · {ticket.trip.bus.plate_number}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 text-xs"
                        icon={<MessageSquareIcon className="h-3.5 w-3.5" />}
                        onClick={() => shareToWhatsapp(ticket)}
                      >
                        WhatsApp
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        icon={<EyeIcon className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setAutoPrint(false);
                          setSelected(ticket);
                        }}
                      >
                        Preview Pass
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        icon={<PrinterIcon className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setAutoPrint(true);
                          setSelected(ticket);
                        }}
                      >
                        Print PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Panel bodyClassName="">
            <Pagination meta={state.meta} onPageChange={state.setPage} label="boarding passes" />
          </Panel>
        </>
      )}

      <BoardingPassModal
        ticket={selected}
        open={Boolean(selected)}
        autoPrint={autoPrint}
        onClose={() => {
          setSelected(null);
          setAutoPrint(false);
        }}
      />
    </div>
  );
}