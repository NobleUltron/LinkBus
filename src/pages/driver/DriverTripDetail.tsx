import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowUpDownIcon,
  BusIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  NavigationIcon,
  PhoneIcon,
  PrinterIcon,
  SearchIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { TripTimelineStepper } from '../../components/booking/TripTimelineStepper';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, ErrorState, SkeletonTable } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { checkInFromManifest, getTripManifest, type TicketDetail } from '../../services/tickets';
import { getTrip, updateTripStatus } from '../../services/trips';
import type { TripStatus } from '../../types/models';
import { formatDateTime, formatTime, titleCase } from '../../utils/format';
import { printTripManifest } from '../../utils/printManifest';

const statusFlow: {
  value: TripStatus;
  label: string;
  desc: string;
}[] = [
  { value: 'scheduled', label: 'Scheduled', desc: 'Awaiting departure time' },
  { value: 'boarding', label: 'Gate Boarding', desc: 'Passenger check-in active' },
  { value: 'in_transit', label: 'In Transit', desc: 'Coach underway on highway' },
  { value: 'completed', label: 'Trip Completed', desc: 'Arrived & passengers disembarked' },
  { value: 'cancelled', label: 'Cancelled', desc: 'Departure voided' },
];

type SortMode = 'seat_asc' | 'seat_desc' | 'name_asc' | 'name_desc';

const SORT_CYCLE: SortMode[] = ['seat_asc', 'seat_desc', 'name_asc', 'name_desc'];
const SORT_LABELS: Record<SortMode, string> = {
  seat_asc: 'Seat ↑',
  seat_desc: 'Seat ↓',
  name_asc: 'Name A→Z',
  name_desc: 'Name Z→A',
};

/** Wraps matching substrings in a yellow highlight mark */
function Highlight({ text, query }: { text: string; query: string }): React.ReactElement {
  if (!query.trim() || !text) return <>{text}</>;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-300 dark:bg-yellow-500/40 text-yellow-900 dark:text-yellow-100 rounded px-0.5 not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function DriverTripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const [savingStatus, setSavingStatus] = useState(false);
  const [boardingId, setBoardingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'boarded' | 'pending' | 'cancelled'>('all');
  const [seatClass, setSeatClass] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('seat_asc');

  const trip = useAsync(() => getTrip(Number(tripId)), [tripId]);
  const manifest = useAsync(() => getTripManifest(Number(tripId)), [tripId]);

  const setStatus = async (status: TripStatus) => {
    setSavingStatus(true);
    try {
      await updateTripStatus(Number(tripId), status);
      toast.success(`Highway trip status updated to: ${status.replace('_', ' ').toUpperCase()}`);
      trip.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingStatus(false);
    }
  };

  const board = async (ticket: TicketDetail) => {
    setBoardingId(ticket.id);
    try {
      await checkInFromManifest(ticket.id, Number(tripId));
      toast.success(`✅ Passenger ${ticket.passenger_name} checked in (Seat ${ticket.seat?.seat_number || '—'})`);
      manifest.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBoardingId(null);
    }
  };

  const cycleSortMode = () => {
    const idx = SORT_CYCLE.indexOf(sortMode);
    setSortMode(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]);
  };

  const rawTickets = manifest.data ?? [];
  const boarded = rawTickets.filter((t) => t.status === 'used' || Boolean(t.boarded_at)).length;
  const cancelled = rawTickets.filter((t) => t.status === 'cancelled').length;
  const total = rawTickets.length;
  const pending = total - boarded - cancelled;
  const boardedPct = total > 0 ? Math.round((boarded / total) * 100) : 0;

  // Derived unique seat classes for the sub-filter chips
  const seatClasses = useMemo(() => {
    const classes = Array.from(new Set(rawTickets.map((t) => t.seat?.seat_class).filter(Boolean)));
    return classes.sort() as string[];
  }, [rawTickets]);

  const filteredTickets = useMemo(() => {
    let rows = [...rawTickets];

    // Status filter
    if (filter === 'boarded') rows = rows.filter((t) => t.status === 'used' || Boolean(t.boarded_at));
    else if (filter === 'pending') rows = rows.filter((t) => !t.boarded_at && t.status === 'active');
    else if (filter === 'cancelled') rows = rows.filter((t) => t.status === 'cancelled');

    // Seat class sub-filter
    if (seatClass !== 'all') rows = rows.filter((t) => t.seat?.seat_class === seatClass);

    // Live search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      rows = rows.filter((t) => {
        const matchName = (t.passenger_name || '').toLowerCase().includes(q);
        const matchPhone = (t.passenger_phone || '').includes(q);
        const matchTicket = (t.ticket_number || '').toLowerCase().includes(q);
        const matchSeat = (t.seat?.seat_number || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchTicket || matchSeat;
      });
    }

    // Sort
    rows.sort((a, b) => {
      switch (sortMode) {
        case 'seat_asc':
          return (a.seat?.seat_number ?? '').localeCompare(b.seat?.seat_number ?? '', undefined, { numeric: true });
        case 'seat_desc':
          return (b.seat?.seat_number ?? '').localeCompare(a.seat?.seat_number ?? '', undefined, { numeric: true });
        case 'name_asc':
          return (a.passenger_name ?? '').localeCompare(b.passenger_name ?? '');
        case 'name_desc':
          return (b.passenger_name ?? '').localeCompare(a.passenger_name ?? '');
        default:
          return 0;
      }
    });

    return rows;
  }, [rawTickets, filter, seatClass, search, sortMode]);

  const columns: Column<TicketDetail>[] = [
    {
      key: 'seat',
      header: 'Seat',
      render: (ticket) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 font-mono text-xs font-bold text-white shadow-sm">
            <Highlight text={ticket.seat?.seat_number ?? '—'} query={search} />
          </span>
          <span className="text-xs font-semibold text-muted">
            {titleCase(ticket.seat?.seat_class ?? '')}
          </span>
        </div>
      ),
    },
    {
      key: 'passenger',
      header: 'Passenger Name & Contact',
      render: (ticket) => (
        <div>
          <p className="font-bold text-fg text-sm">
            <Highlight text={ticket.passenger_name ?? ''} query={search} />
          </p>
          {ticket.passenger_phone ? (
            <a
              href={`tel:${ticket.passenger_phone}`}
              className="inline-flex items-center gap-1 font-mono text-xs text-brand-600 dark:text-brand-400 hover:underline mt-0.5"
            >
              <PhoneIcon className="h-3 w-3" />
              <Highlight text={ticket.passenger_phone} query={search} />
            </a>
          ) : (
            <span className="text-xs text-muted">Walk-in</span>
          )}
        </div>
      ),
    },
    {
      key: 'ticket',
      header: 'Ticket #',
      hideBelow: 'md',
      render: (ticket) => (
        <span className="font-mono text-xs font-semibold text-fg">
          <Highlight text={ticket.ticket_number ?? ''} query={search} />
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Boarding Status',
      render: (ticket) =>
        ticket.boarded_at ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="h-3.5 w-3.5" />
            Boarded {formatTime(ticket.boarded_at)}
          </span>
        ) : (
          <StatusPill status={ticket.status} />
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (ticket) => (
        <Button
          variant={ticket.status === 'used' ? 'ghost' : ticket.status === 'active' ? 'primary' : 'outline'}
          size="sm"
          disabled={ticket.status !== 'active'}
          loading={boardingId === ticket.id}
          icon={ticket.status === 'active' ? <UserCheckIcon className="h-3.5 w-3.5" /> : undefined}
          onClick={() => board(ticket)}
          className={
            ticket.status === 'active'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-h-[36px] px-3.5 active:scale-95 shadow-sm'
              : 'min-h-[36px]'
          }
        >
          {ticket.status === 'used' ? 'Boarded' : ticket.status === 'cancelled' ? 'Voided' : 'Check In'}
        </Button>
      ),
    },
  ];

  const mapsUrl =
    trip.data &&
    trip.data.origin?.city &&
    trip.data.destination?.city &&
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      trip.data.origin.city
    )}&destination=${encodeURIComponent(trip.data.destination.city)}`;

  const progressColor =
    boardedPct >= 80
      ? 'bg-emerald-500'
      : boardedPct >= 50
      ? 'bg-brand-500'
      : 'bg-amber-500';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to="/driver"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition-colors hover:text-fg"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
        Back to Assigned Departures
      </Link>

      {trip.loading && <div className="skeleton h-36 rounded-2xl" />}

      {trip.error && (
        <Panel>
          <ErrorState message={trip.error} onRetry={trip.reload} />
        </Panel>
      )}

      {trip.data && (
        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr] xl:items-start">
          {/* Left Column: Passenger Manifest Table */}
          <Panel
            title={`Passenger Manifest (${boarded}/${total} Boarded)`}
            subtitle={`${trip.data.origin?.city ?? trip.data.origin?.name ?? 'Origin'} ➔ ${trip.data.destination?.city ?? trip.data.destination?.name ?? 'Destination'} · Departure ${formatDateTime(
              trip.data.departure_time
            )}`}
            bodyClassName="p-0"
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<PrinterIcon className="h-4 w-4" />}
                  onClick={() => {
                    if (trip.data) {
                      printTripManifest(trip.data, rawTickets);
                    }
                  }}
                  disabled={manifest.loading || rawTickets.length === 0}
                >
                  Print Manifest (A4)
                </Button>
              </div>
            }
          >
            {/* Boarding Progress Bar */}
            {!manifest.loading && total > 0 && (
              <div className="border-b border-line bg-surface px-4 pt-3 pb-2">
                <div className="flex items-center justify-between text-[0.6875rem] font-semibold mb-1.5">
                  <span className="text-muted">
                    Boarding progress — {boarded} of {total} passengers
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      boardedPct >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : boardedPct >= 50
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {boardedPct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-2 border border-line overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
                    style={{ width: `${Math.max(boardedPct > 0 ? 2 : 0, boardedPct)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Quick Search & Status Filter Tabs */}
            <div className="border-b border-line bg-surface p-3 space-y-2.5">
              {/* Row 1: Search + Sort */}
              <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" aria-hidden />
                  <input
                    type="search"
                    id="manifest-search"
                    placeholder="Search passenger, phone, seat or ticket…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-9 rounded-xl border border-line bg-surface-2/60 pl-9 pr-8 text-xs text-fg placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors"
                      aria-label="Clear search"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {/* Sort Toggle */}
                <button
                  type="button"
                  onClick={cycleSortMode}
                  title={`Sort: ${SORT_LABELS[sortMode]}`}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface-2/60 px-2.5 text-xs font-semibold text-muted hover:text-fg hover:border-brand-500 transition-colors whitespace-nowrap"
                >
                  <ArrowUpDownIcon className="h-3.5 w-3.5" />
                  {SORT_LABELS[sortMode]}
                </button>
              </div>

              {/* Row 2: Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-line">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      filter === 'all' ? 'bg-brand-600 text-white shadow-sm' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <UsersIcon className="h-3 w-3" />
                    All ({total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('boarded')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      filter === 'boarded' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <CheckCircle2Icon className="h-3 w-3" />
                    Boarded ({boarded})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('pending')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      filter === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <ClockIcon className="h-3 w-3" />
                    Pending ({pending})
                  </button>
                  {cancelled > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilter('cancelled')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        filter === 'cancelled' ? 'bg-rose-600 text-white shadow-sm' : 'text-muted hover:text-fg'
                      }`}
                    >
                      <XCircleIcon className="h-3 w-3" />
                      Voided ({cancelled})
                    </button>
                  )}
                </div>

                {/* Seat Class Chips — only shown when multiple classes exist */}
                {seatClasses.length > 1 && (
                  <div className="flex items-center gap-1">
                    {['all', ...seatClasses].map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setSeatClass(cls)}
                        className={`px-2 py-0.5 rounded-lg border text-[0.6875rem] font-bold transition-colors ${
                          seatClass === cls
                            ? 'bg-surface border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'bg-surface-2/60 border-line text-muted hover:text-fg'
                        }`}
                      >
                        {cls === 'all' ? 'All Classes' : titleCase(cls)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {manifest.loading ? (
              <div className="p-4">
                <SkeletonTable rows={8} columns={5} />
              </div>
            ) : (
              <DataTable<TicketDetail>
                columns={columns}
                rows={filteredTickets}
                rowKey={(ticket) => ticket.id}
                error={manifest.error}
                onRetry={manifest.reload}
                caption="Passenger manifest"
                empty={
                  <EmptyState
                    icon={<UsersIcon className="h-6 w-6 text-brand-600" aria-hidden />}
                    title={
                      search
                        ? `No match for "${search}"`
                        : filter !== 'all' || seatClass !== 'all'
                        ? 'No matching passengers'
                        : 'No passengers booked yet'
                    }
                    body={
                      search || filter !== 'all' || seatClass !== 'all'
                        ? 'Try clearing the search or changing the filter.'
                        : 'As seats are booked online or issued at the terminal POS, passenger names will populate this manifest.'
                    }
                    action={
                      (search || filter !== 'all' || seatClass !== 'all') ? (
                        <button
                          type="button"
                          onClick={() => { setSearch(''); setFilter('all'); setSeatClass('all'); }}
                          className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                        >
                          Clear all filters
                        </button>
                      ) : undefined
                    }
                  />
                }
              />
            )}
          </Panel>

          {/* Right Column: Status Log & Coach Vehicle Cards */}
          <div className="space-y-6">
            {/* Real-time Highway Dispatch Stepper */}
            <Panel
              title="Highway Transit Dispatch"
              subtitle="Update status in real-time as your departure progresses"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase">Current Status:</span>
                <StatusPill status={trip.data.status} />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {statusFlow.map((option) => (
                  <Button
                    key={option.value}
                    variant={trip.data!.status === option.value ? 'primary' : 'outline'}
                    size="sm"
                    disabled={savingStatus || trip.data!.status === option.value}
                    onClick={() => setStatus(option.value)}
                    className="flex flex-col items-start py-2 text-left h-auto"
                  >
                    <span className="font-bold text-xs">{option.label}</span>
                    <span className="text-[0.625rem] opacity-75 font-normal">{option.desc}</span>
                  </Button>
                ))}
              </div>

              {mapsUrl && (
                <div className="mt-4 border-t border-line pt-4">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all active:scale-95"
                  >
                    <NavigationIcon className="h-4 w-4" />
                    Launch Google Maps GPS Navigation
                    <ExternalLinkIcon className="h-3 w-3 opacity-70" />
                  </a>
                </div>
              )}
            </Panel>

            {/* Route Timeline */}
            <Panel title="Corridor Itinerary">
              <TripTimelineStepper trip={trip.data} />
            </Panel>

            {/* Assigned Coach Specifications */}
            <Panel title="Coach Vehicle & Duty Specs">
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Coach Plate</dt>
                  <dd className="font-mono font-bold text-fg text-sm">
                    {trip.data.bus?.plate_number ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Chassis & Model</dt>
                  <dd className="font-semibold text-fg">{trip.data.bus?.model ?? 'Standard Chassis'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Cabin Class</dt>
                  <dd className="font-semibold text-fg">{titleCase(trip.data.bus?.bus_type ?? 'standard')}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Total Seat Capacity</dt>
                  <dd className="font-semibold text-fg">{trip.data.bus?.capacity ?? 50} Seats</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Captain Assigned</dt>
                  <dd className="font-bold text-fg">
                    {trip.data.driver_user?.name ?? 'Assigned to You'}
                  </dd>
                </div>
                {trip.data.bus?.notes && (
                  <div className="border-t border-line pt-3 text-muted text-[0.6875rem]">
                    {trip.data.bus.notes}
                  </div>
                )}
              </dl>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}