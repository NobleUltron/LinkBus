import React, { useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  BusIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LockIcon,
  PrinterIcon,
  SearchIcon,
  UnlockIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '../../components/data/DataTable';
import type { FieldConfig, FieldValue } from '../../components/data/ResourceModal';
import { ResourceScreen } from '../../components/data/ResourceScreen';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, ErrorState, SkeletonTable } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { adminReleaseSeatLock } from '../../services/bookings';
import { getReferenceData, routeName } from '../../services/reference';
import { getTripManifestWithHolds, type ManifestHeldSeat, type TicketDetail } from '../../services/tickets';
import { createTrip, deleteTrip, listTrips, updateTrip } from '../../services/trips';
import type { TripDetail } from '../../types/api';
import { countdownLabel, formatDateTime, formatTime, money, titleCase, toDateTimeInput } from '../../utils/format';
import { printTripManifest } from '../../utils/printManifest';

/** Highlights matching substrings in yellow */
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

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function Trips() {
  const reference = useAsync(() => getReferenceData(), []);
  const [manifestTrip, setManifestTrip] = useState<TripDetail | null>(null);
  const [manifest, setManifest] = useState<TicketDetail[] | null>(null);
  const [heldSeats, setHeldSeats] = useState<ManifestHeldSeat[]>([]);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestFilter, setManifestFilter] = useState<'all' | 'boarded' | 'pending' | 'holds'>('all');
  const [manifestSearch, setManifestSearch] = useState('');

  const openManifest = async (trip: TripDetail) => {
    setManifestTrip(trip);
    setManifest(null);
    setHeldSeats([]);
    setManifestLoading(true);
    setManifestFilter('all');
    setManifestSearch('');
    const res = await getTripManifestWithHolds(trip.id).catch(() => ({ tickets: [], held_seats: [] }));
    setManifest(res.tickets);
    setHeldSeats(res.held_seats || []);
    setManifestLoading(false);
  };

  const handleReleaseSeatHold = async (heldSeat: ManifestHeldSeat) => {
    try {
      await adminReleaseSeatLock(heldSeat.seat_id);
      toast.success(`Seat ${heldSeat.seat_number} hold released. It is now available.`);
      if (manifestTrip) {
        openManifest(manifestTrip);
      }
    } catch (err) {
      toast.error('Failed to release seat hold: ' + errorMessage(err));
    }
  };

  const handleExportManifestCsv = () => {
    if (!manifestTrip || !filteredManifest || filteredManifest.length === 0) return;
    const headers = ['Seat', 'Passenger Name', 'Phone', 'Ticket Number', 'Status', 'Boarded At'];
    const rows = filteredManifest.map((t) => [
      `"${t.seat?.seat_number || ''}"`,
      `"${t.passenger_name || ''}"`,
      `"${t.passenger_phone || ''}"`,
      `"${t.ticket_number || ''}"`,
      `"${t.status || ''}"`,
      `"${t.boarded_at ? formatDateTime(t.boarded_at) : 'Not Boarded'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `manifest_${manifestTrip.bus?.plate_number || 'trip'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredManifest.length} passenger(s) to CSV`);
  };

  const filteredManifest = useMemo(() => {
    if (!manifest) return [];
    let rows = [...manifest];
    if (manifestFilter === 'boarded') rows = rows.filter((t) => Boolean(t.boarded_at));
    else if (manifestFilter === 'pending') rows = rows.filter((t) => !t.boarded_at);
    if (manifestSearch.trim()) {
      const q = manifestSearch.toLowerCase().trim();
      rows = rows.filter((t) =>
        (t.passenger_name || '').toLowerCase().includes(q) ||
        (t.passenger_phone || '').includes(q) ||
        (t.ticket_number || '').toLowerCase().includes(q) ||
        (t.seat?.seat_number || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [manifest, manifestFilter, manifestSearch]);

  const boardedCount = manifest?.filter((t) => Boolean(t.boarded_at)).length ?? 0;
  const totalBookedCount = manifest?.length ?? 0;
  const boardedPct = totalBookedCount > 0 ? Math.round((boardedCount / totalBookedCount) * 100) : 0;

  if (reference.loading) {
    return (
      <Panel bodyClassName="">
        <SkeletonTable rows={8} columns={6} />
      </Panel>
    );
  }

  if (reference.error || !reference.data) {
    return (
      <Panel>
        <ErrorState
          message={reference.error ?? 'Reference data could not be loaded.'}
          onRetry={reference.reload}
        />
      </Panel>
    );
  }

  const { routes = [], terminals = [], buses = [], drivers = [] } = reference.data;

  const columns: Column<TripDetail>[] = [
    {
      key: 'departure',
      header: 'Departure',
      render: (trip) => (
        <div>
          <p className="font-bold tabular-nums text-fg">{formatDateTime(trip.departure_time)}</p>
          <p className="text-xs text-muted">
            {trip.arrival_time ? `Arrives ~${formatTime(trip.arrival_time)}` : 'In transit'}
          </p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Corridor',
      render: (trip) => (
        <div>
          <span className="font-bold text-fg">
            {trip.origin?.city ?? 'Origin'} → {trip.destination?.city ?? 'Destination'}
          </span>
          <p className="text-xs text-muted">{trip.origin?.name ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'bus',
      header: 'Bus',
      hideBelow: 'md',
      render: (trip) => (
        <div>
          <p className="text-fg font-semibold">{trip.bus?.plate_number ?? '—'}</p>
          <p className="text-xs text-muted">{titleCase(trip.bus?.bus_type ?? 'standard')}</p>
        </div>
      ),
    },
    {
      key: 'driver',
      header: 'Driver',
      hideBelow: 'lg',
      render: (trip) => (
        <span className="text-fg text-sm">
          {trip.driver_user?.name ?? (
            <span className="text-muted italic">Unassigned</span>
          )}
        </span>
      ),
    },
    {
      key: 'occupancy',
      header: 'Seat Load',
      render: (trip) => {
        const capacity = trip.bus?.capacity ?? 50;
        const available = trip.available_seats ?? 0;
        const booked = Math.max(0, capacity - available);
        const pct = Math.round((booked / capacity) * 100);
        const nearlyFull = available <= 6;
        return (
          <div className="w-32">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="tabular-nums text-fg">{booked}/{capacity}</span>
              <span className={`font-bold ${nearlyFull ? 'text-red-500' : pct >= 60 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-2 border border-line overflow-hidden">
              <div
                className={`h-full rounded-full ${nearlyFull ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
              />
            </div>
            <p className="text-[0.625rem] text-muted mt-0.5">{available} left</p>
          </div>
        );
      },
    },
    {
      key: 'fare',
      header: 'Fare',
      align: 'left',
      render: (trip) => <span className="font-semibold tabular-nums text-fg">{money(trip.fare)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (trip) => <StatusPill status={trip.status} />,
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'route_id',
      label: 'Route',
      type: 'select',
      required: true,
      options: routes.map((route) => ({
        value: String(route.id),
        label: `${routeName(routes, terminals, route.id)} · ${route.distance_km} km`,
      })),
    },
    {
      name: 'bus_id',
      label: 'Bus',
      type: 'select',
      required: true,
      options: buses.map((bus) => ({
        value: String(bus.id),
        label: `${bus.plate_number} · ${titleCase(bus.bus_type)} · ${bus.capacity} seats`,
      })),
    },
    {
      name: 'driver_id',
      label: 'Driver',
      type: 'select',
      required: true,
      options: drivers.map((driver) => ({
        value: String(driver.id),
        label: `${driver.name} · ${driver.license_number}`,
      })),
    },
    {
      name: 'departure_time',
      label: 'Departure time',
      type: 'datetime-local',
      required: true,
    },
    {
      name: 'fare',
      label: 'Seat fare (UGX)',
      type: 'number',
      min: 0,
      required: true,
      hint: 'The exact ticket price charged per passenger seat on this departure.',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: statusOptions,
      required: true,
    },
  ];

  const toPayload = (values: Record<string, FieldValue>) => ({
    route_id: Number(values.route_id),
    bus_id: Number(values.bus_id),
    driver_id: Number(values.driver_id),
    departure_time: String(values.departure_time),
    fare: Number(values.fare),
    status: String(values.status) as TripDetail['status'],
  });

  return (
    <>
      <ResourceScreen<TripDetail>
        title="Trips"
        subtitle="Scheduled departures with their bus, driver and fare. Arrival time is derived from the route duration."
        singular="Trip"
        plural="Trips"
        searchPlaceholder="Search city, plate number or driver…"
        emptyTitle="No trips scheduled"
        emptyBody="Add a departure to put a bus and driver on a route."
        columns={columns}
        fields={fields}
        filters={[
          {
            key: 'status',
            label: 'Any status',
            options: statusOptions,
          },
          {
            key: 'date',
            label: 'Departure date',
            options: [],
            type: 'date',
          },
        ]}
        load={({ page, perPage, search, filters }) =>
          listTrips({
            page,
            perPage,
            search,
            status: filters.status,
            date: filters.date,
            date_from: filters.date_from,
            date_to: filters.date_to,
          })
        }
        withDateRange={true}
        dateRangeDirection="future"
        renderCards={({ rows, meta }) => {
          const totalCount = meta.total || rows.length;
          const scheduled = rows.filter((t) => t.status === 'scheduled' || t.status === 'boarding');
          const active = rows.filter((t) => t.status === 'in_transit' || t.status === 'completed');
          const totalRemainingSeats = rows.reduce((acc, t) => acc + (t.available_seats || 0), 0);

          return (
            <>
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CalendarDaysIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-fg">Scheduled Trips</span>
                </div>
                <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                  {totalCount.toLocaleString()}
                </p>
                <p className="text-[0.6875rem] text-muted">All Departures in Range</p>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <ClockIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-fg">Ready &amp; Boarding</span>
                </div>
                <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                  {scheduled.length.toLocaleString()}
                </p>
                <p className="text-[0.6875rem] text-muted">Upcoming Station Departures</p>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <BusIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-fg">In Transit &amp; Done</span>
                </div>
                <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                  {active.length.toLocaleString()}
                </p>
                <p className="text-[0.6875rem] text-muted">En Route / Arrived</p>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <UsersIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-fg">Open Seat Inventory</span>
                </div>
                <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                  {totalRemainingSeats.toLocaleString()}
                </p>
                <p className="text-[0.6875rem] text-muted">Available Coach Seats</p>
              </div>
            </>
          );
        }}
        toFormValues={(trip) => ({
          route_id: String(trip?.route_id ?? routes[0]?.id ?? ''),
          bus_id: String(trip?.bus_id ?? buses[0]?.id ?? ''),
          driver_id: String(trip?.driver_id ?? drivers[0]?.id ?? ''),
          departure_time: trip
            ? toDateTimeInput(trip.departure_time)
            : toDateTimeInput(new Date().toISOString()),
          fare: trip?.fare ?? 3000,
          status: trip?.status ?? 'scheduled',
        })}
        onCreate={async (values) => {
          await createTrip(toPayload(values));
        }}
        onUpdate={async (trip, values) => {
          await updateTrip(trip.id, toPayload(values));
        }}
        onDelete={async (trip) => {
          await deleteTrip(trip.id);
        }}
        deleteConsequence={(trip) =>
          `The ${formatDateTime(trip.departure_time)} departure and its seat map will be removed. Departures with active bookings cannot be deleted — cancel them instead.`
        }
        extraActions={(trip) => (
          <button
            type="button"
            onClick={() => openManifest(trip)}
            aria-label="Open manifest"
            className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
          >
            <FileTextIcon className="h-4 w-4" aria-hidden />
          </button>
        )}
      />

      <Modal
        open={Boolean(manifestTrip)}
        onClose={() => setManifestTrip(null)}
        title="Trip manifest"
        subtitle={
          manifestTrip
            ? `${manifestTrip.origin?.city ?? ''} → ${manifestTrip.destination?.city ?? ''} · ${formatDateTime(manifestTrip.departure_time)} · ${manifestTrip.bus?.plate_number ?? ''}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <Button
              variant="outline"
              icon={<FileSpreadsheetIcon className="h-4 w-4" />}
              onClick={handleExportManifestCsv}
              disabled={!manifest || manifest.length === 0}
            >
              Export CSV
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setManifestTrip(null)}>
                Close
              </Button>
              <Button
                icon={<PrinterIcon className="h-4 w-4" />}
                onClick={() => {
                  if (manifestTrip && manifest) {
                    printTripManifest(manifestTrip, manifest);
                  }
                }}
                disabled={!manifest}
              >
                Print manifest
              </Button>
            </div>
          </div>
        }
      >
        <div className="print-doc space-y-4">
          {/* Summary row + Progress */}
          {manifestTrip && (
            <div className="rounded-xl border border-line bg-surface-2/50 p-3.5 text-xs space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <span className="text-muted block">Coach</span>
                  <span className="font-bold text-fg">
                    {manifestTrip.bus?.plate_number ?? '—'} ({manifestTrip.bus?.capacity ?? 50} seats)
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Captain</span>
                  <span className="font-bold text-fg">{manifestTrip.driver_user?.name ?? 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-muted block">Boarding</span>
                  <span className={`font-bold ${
                    boardedPct >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                    : boardedPct >= 50 ? 'text-brand-600 dark:text-brand-400'
                    : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {boardedCount} / {totalBookedCount} boarded ({boardedPct}%)
                  </span>
                </div>
              </div>
              {totalBookedCount > 0 && (
                <div className="h-1.5 w-full rounded-full bg-surface border border-line overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      boardedPct >= 80 ? 'bg-emerald-500' : boardedPct >= 50 ? 'bg-brand-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.max(boardedPct > 0 ? 2 : 0, boardedPct)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Live Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" aria-hidden />
            <input
              type="search"
              id="admin-manifest-search"
              placeholder="Search passenger, phone, seat or ticket…"
              value={manifestSearch}
              onChange={(e) => setManifestSearch(e.target.value)}
              className="w-full h-9 rounded-xl border border-line bg-surface-2/60 pl-9 pr-8 text-xs text-fg placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
            />
            {manifestSearch && (
              <button
                type="button"
                onClick={() => setManifestSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors"
                aria-label="Clear search"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-3">
            {(['all', 'boarded', 'pending'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setManifestFilter(f)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  manifestFilter === f
                    ? f === 'boarded' ? 'bg-emerald-600 text-white' : f === 'pending' ? 'bg-amber-600 text-white' : 'bg-brand-600 text-white'
                    : 'bg-surface-2 text-muted hover:text-fg'
                }`}
              >
                {f === 'boarded' && <CheckCircle2Icon className="h-3 w-3" />}
                {f === 'pending' && <ClockIcon className="h-3 w-3" />}
                {f === 'all' ? `All (${totalBookedCount})` : f === 'boarded' ? `Boarded (${boardedCount})` : `Pending (${totalBookedCount - boardedCount})`}
              </button>
            ))}
            {heldSeats.length > 0 && (
              <button
                type="button"
                onClick={() => setManifestFilter('holds')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  manifestFilter === 'holds'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25'
                }`}
              >
                <LockIcon className="h-3 w-3" />
                Checkout Holds ({heldSeats.length})
              </button>
            )}
            {manifestSearch && filteredManifest.length > 0 && (
              <span className="ml-auto text-[0.6875rem] text-muted">{filteredManifest.length} result{filteredManifest.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {manifestLoading && <SkeletonTable rows={6} columns={4} />}

          {!manifestLoading && manifestFilter === 'holds' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  These seats are temporarily held by passengers in checkout. Locks auto-expire in 10 minutes, or you can release them immediately to make them available again.
                </p>
              </div>

              {heldSeats.length === 0 ? (
                <EmptyState compact title="No active holds" body="There are no unpaid checkout locks on this departure right now." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th scope="col" className="px-2 py-2 font-semibold">Seat</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Held By</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Phone</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Hold Expires</th>
                      <th scope="col" className="px-2 py-2 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heldSeats.map((h) => (
                      <tr key={h.id} className="border-b border-line last:border-0 hover:bg-surface-2/40">
                        <td className="px-2 py-2.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300 font-mono">
                            <LockIcon className="h-3 w-3" />
                            {h.seat_number}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 font-semibold text-fg">
                          {h.user_name}
                        </td>
                        <td className="px-2 py-2.5 text-muted">
                          {h.user_phone}
                        </td>
                        <td className="px-2 py-2.5 text-xs text-muted">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                            <ClockIcon className="h-3 w-3" />
                            {h.remaining_seconds > 0 ? countdownLabel(h.remaining_seconds) : 'Expiring…'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReleaseSeatHold(h)}
                            className="text-xs border-line hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-600"
                          >
                            <UnlockIcon className="h-3 w-3 mr-1" />
                            Release Hold
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {!manifestLoading && manifestFilter !== 'holds' && manifest?.length === 0 && (
            <EmptyState compact title="No passengers booked" body="This departure has no confirmed tickets yet." />
          )}

          {!manifestLoading && manifestFilter !== 'holds' && filteredManifest.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th scope="col" className="px-2 py-2 font-semibold">Seat</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Passenger</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Phone</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Ticket</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Boarded</th>
                </tr>
              </thead>
              <tbody>
                {filteredManifest.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-line last:border-0 hover:bg-surface-2/40">
                    <td className="px-2 py-2.5">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono text-xs font-bold">
                        <Highlight text={ticket.seat?.seat_number ?? '—'} query={manifestSearch} />
                      </span>
                    </td>
                    <td className="px-2 py-2.5 font-semibold text-fg">
                      <Highlight text={ticket.passenger_name ?? ''} query={manifestSearch} />
                    </td>
                    <td className="px-2 py-2.5 text-muted">
                      <Highlight text={ticket.passenger_phone || '—'} query={manifestSearch} />
                    </td>
                    <td className="px-2 py-2.5 font-mono text-muted text-xs">
                      <Highlight text={ticket.ticket_number ?? ''} query={manifestSearch} />
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {ticket.boarded_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[0.625rem] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2Icon className="h-3 w-3" />
                          {formatTime(ticket.boarded_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[0.625rem] font-bold text-amber-600 dark:text-amber-400">
                          <ClockIcon className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </>
  );
}