import React, { useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  BusIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FilterIcon,
  LockIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  TrendingUpIcon,
  UnlockIcon,
  UserCheckIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DateInput } from '../../components/ui/Inputs';
import { SelectField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, ErrorState, SkeletonTable } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { usePaginated } from '../../hooks/usePaginated';
import { adminReleaseSeatLock } from '../../services/bookings';
import { getReferenceData, routeName } from '../../services/reference';
import { getTripManifestWithHolds, type ManifestHeldSeat, type TicketDetail } from '../../services/tickets';
import { createTrip, deleteTrip, listTrips, updateTrip } from '../../services/trips';
import type { TripDetail } from '../../types/api';
import {
  countdownLabel,
  formatDateTime,
  formatTime,
  money,
  titleCase,
  toDateInput,
  toDateTimeInput,
} from '../../utils/format';
import { printTripManifest } from '../../utils/printManifest';

const presets = [
  { label: 'Today', daysAhead: 0 },
  { label: 'Next 7 Days', daysAhead: 7 },
  { label: 'Next 30 Days', daysAhead: 30 },
  { label: 'Next 90 Days', daysAhead: 90 },
];

function today(): string {
  return toDateInput(new Date());
}

function daysAhead(n: number): string {
  return toDateInput(new Date(Date.now() + n * 86400000));
}

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'boarding', label: 'Boarding Active' },
  { value: 'in_transit', label: 'In Transit / En Route' },
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

  // Add Trip Modal State
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    route_id: '',
    bus_id: '',
    driver_id: '',
    departure_time: '',
    fare: '30000',
    status: 'scheduled' as TripDetail['status'],
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // Edit Trip Modal State
  const [editingTrip, setEditingTrip] = useState<TripDetail | null>(null);
  const [editForm, setEditForm] = useState({
    route_id: '',
    bus_id: '',
    driver_id: '',
    departure_time: '',
    fare: '30000',
    status: 'scheduled' as TripDetail['status'],
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editPending, setEditPending] = useState(false);

  // Delete Trip State
  const [deleting, setDeleting] = useState<TripDetail | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Date Range State — default to today → next 30 days (upcoming trips)
  const [range, setRange] = useState({
    date_from: today(),
    date_to: daysAhead(30),
  });
  const [applied, setApplied] = useState({ date_from: today(), date_to: daysAhead(30) });

  // Paginated Trips State
  const state = usePaginated<TripDetail>(({ page, perPage, search, filters }) =>
    listTrips({
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

  // Operational Scorecard Metrics
  const metrics = useMemo(() => {
    const rows = state.rows;
    const activeTrips = rows.filter((t) => t.status === 'scheduled' || t.status === 'boarding');
    const inTransitTrips = rows.filter((t) => t.status === 'in_transit');
    const totalBooked = rows.reduce((acc, t) => {
      const cap = t.bus?.capacity ?? 50;
      const avail = t.available_seats ?? cap;
      return acc + Math.max(0, cap - avail);
    }, 0);
    const totalCap = rows.reduce((acc, t) => acc + (t.bus?.capacity ?? 50), 0);
    const avgOccupancy = totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0;

    return {
      activeCount: activeTrips.length,
      inTransitCount: inTransitTrips.length,
      totalBooked,
      avgOccupancy,
      totalTrips: state.meta.total || rows.length,
    };
  }, [state.rows, state.meta.total]);

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

  const submitAddTrip = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!addForm.route_id) errors.route_id = 'Select a route corridor.';
    if (!addForm.bus_id) errors.bus_id = 'Assign an operational coach.';
    if (!addForm.driver_id) errors.driver_id = 'Assign a licensed driver.';
    if (!addForm.departure_time) errors.departure_time = 'Select departure date and time.';
    const fareNum = parseFloat(addForm.fare);
    if (!addForm.fare || isNaN(fareNum) || fareNum <= 0) errors.fare = 'Enter valid ticket fare (UGX).';

    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAdding(true);
    try {
      await createTrip({
        route_id: Number(addForm.route_id),
        bus_id: Number(addForm.bus_id),
        driver_id: Number(addForm.driver_id),
        departure_time: addForm.departure_time,
        fare: fareNum,
        status: addForm.status,
      });
      toast.success('New departure scheduled successfully.');
      setAddOpen(false);
      setAddForm({
        route_id: '',
        bus_id: '',
        driver_id: '',
        departure_time: '',
        fare: '30000',
        status: 'scheduled',
      });
      state.reload();
    } catch (error) {
      setAddErrors({ route_id: errorMessage(error) });
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (trip: TripDetail) => {
    setEditingTrip(trip);
    setEditForm({
      route_id: String(trip.route_id),
      bus_id: String(trip.bus_id),
      driver_id: String(trip.driver_id || ''),
      departure_time: toDateTimeInput(new Date(trip.departure_time)),
      fare: String(trip.fare),
      status: trip.status,
    });
    setEditErrors({});
  };

  const submitEditTrip = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTrip) return;
    const errors: Record<string, string> = {};
    if (!editForm.route_id) errors.route_id = 'Select route.';
    if (!editForm.bus_id) errors.bus_id = 'Select bus.';
    if (!editForm.departure_time) errors.departure_time = 'Departure time required.';
    const fareNum = parseFloat(editForm.fare);
    if (!editForm.fare || isNaN(fareNum) || fareNum <= 0) errors.fare = 'Valid fare required.';

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditPending(true);
    try {
      await updateTrip(editingTrip.id, {
        route_id: Number(editForm.route_id),
        bus_id: Number(editForm.bus_id),
        driver_id: Number(editForm.driver_id) || undefined,
        departure_time: editForm.departure_time,
        fare: fareNum,
        status: editForm.status,
      });
      toast.success('Departure schedule updated.');
      setEditingTrip(null);
      state.reload();
    } catch (error) {
      setEditErrors({ route_id: errorMessage(error) });
    } finally {
      setEditPending(false);
    }
  };

  const handleQuickStatusChange = async (trip: TripDetail, nextStatus: TripDetail['status']) => {
    try {
      await updateTrip(trip.id, {
        route_id: trip.route_id,
        bus_id: trip.bus_id,
        driver_id: trip.driver_id,
        departure_time: trip.departure_time,
        fare: trip.fare,
        status: nextStatus,
      });
      toast.success(`Departure status updated to ${nextStatus.toUpperCase()}`);
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await deleteTrip(deleting.id);
      toast.success('Departure schedule cancelled & removed.');
      setDeleting(null);
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeletePending(false);
    }
  };

  const handleExportCsv = () => {
    if (!state.rows.length) {
      toast.error('No scheduled trips to export');
      return;
    }
    const headers = [
      'Trip ID',
      'Corridor Route',
      'Departure Time',
      'Estimated Arrival',
      'Assigned Bus',
      'Cabin Type',
      'Assigned Driver',
      'Total Capacity',
      'Available Seats',
      'Seat Fare (UGX)',
      'Status',
    ];

    const csvRows = state.rows.map((t) => [
      t.id,
      `"${(t.origin?.city ?? '')} -> ${(t.destination?.city ?? '')}"`,
      `"${t.departure_time}"`,
      `"${t.arrival_time ?? ''}"`,
      `"${t.bus?.plate_number ?? ''}"`,
      `"${t.bus?.bus_type ?? 'standard'}"`,
      `"${t.driver_user?.name ?? 'Unassigned'}"`,
      t.bus?.capacity ?? 50,
      t.available_seats ?? 0,
      t.fare,
      `"${t.status}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linkbus_departures_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Departure schedule exported to CSV');
  };

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
      header: 'Departure & Time',
      render: (trip) => (
        <div className="py-1">
          <p className="font-extrabold tabular-nums text-fg text-sm">
            {formatDateTime(trip.departure_time)}
          </p>
          <p className="text-xs text-muted">
            {trip.arrival_time ? `Est. Arrival: ${formatTime(trip.arrival_time)}` : 'In transit'}
          </p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Corridor & Stations',
      render: (trip) => (
        <div>
          <span className="font-bold text-fg text-xs">
            {trip.origin?.city ?? 'Origin'} ➔ {trip.destination?.city ?? 'Destination'}
          </span>
          <p className="text-[0.6875rem] text-muted">{trip.origin?.name ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'bus',
      header: 'Assigned Coach',
      hideBelow: 'md',
      render: (trip) => (
        <div>
          <span className="inline-flex items-center rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-black text-fg shadow-xs">
            {trip.bus?.plate_number ?? '—'}
          </span>
          <p className="text-[0.6875rem] text-muted mt-0.5">
            {titleCase(trip.bus?.bus_type ?? 'standard')}
          </p>
        </div>
      ),
    },
    {
      key: 'driver',
      header: 'Assigned Driver',
      hideBelow: 'lg',
      render: (trip) => (
        <div>
          <p className="font-bold text-fg text-xs">
            {trip.driver_user?.name ?? <span className="text-muted italic">Unassigned</span>}
          </p>
          <p className="text-[0.6875rem] text-muted">
            {trip.driver_user?.phone ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'occupancy',
      header: 'Seat Load Occupancy',
      render: (trip) => {
        const capacity = trip.bus?.capacity ?? 50;
        const available = trip.available_seats ?? 0;
        const booked = Math.max(0, capacity - available);
        const pct = Math.round((booked / capacity) * 100);
        const nearlyFull = available <= 6;

        return (
          <div className="w-32">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="tabular-nums font-bold text-fg">{booked}/{capacity}</span>
              <span className={`font-black ${nearlyFull ? 'text-red-500' : pct >= 60 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-2 border border-line overflow-hidden">
              <div
                className={`h-full rounded-full ${nearlyFull ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
              />
            </div>
            <p className="text-[0.625rem] text-muted mt-0.5 font-medium">{available} seats left</p>
          </div>
        );
      },
    },
    {
      key: 'fare',
      header: 'Seat Fare',
      align: 'right',
      render: (trip) => (
        <span className="font-extrabold tabular-nums text-fg text-sm">
          {money(trip.fare)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trip Status',
      render: (trip) => <StatusPill status={trip.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (trip) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<FileTextIcon className="h-3.5 w-3.5" />}
            onClick={() => openManifest(trip)}
            title="Passenger Manifest"
          >
            Manifest
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PencilIcon className="h-3.5 w-3.5" />}
            onClick={() => openEditModal(trip)}
            title="Edit Schedule"
          >
            Edit
          </Button>

          <select
            aria-label={`Status for departure ${trip.id}`}
            value={trip.status}
            onChange={(event) =>
              handleQuickStatusChange(trip, event.target.value as TripDetail['status'])
            }
            className="field !h-8 w-auto text-xs font-semibold"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setDeleting(trip)}
            aria-label={`Remove departure ${trip.id}`}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/15 hover:text-red-600"
          >
            <Trash2Icon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Trips &amp; Departure Schedules
          </h1>
          <p className="text-xs text-muted">
            Live corridor departure boards, coach assignment, driver rosters, real-time seat load meters, and passenger manifest management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<FileSpreadsheetIcon className="h-4 w-4" />}
            onClick={handleExportCsv}
          >
            Export Schedules CSV
          </Button>
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setAddOpen(true)}
          >
            + Schedule New Departure
          </Button>
        </div>
      </div>

      {/* ── Operational & Capacity KPI Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Scheduled Departures */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              <CalendarDaysIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Active Departures
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-emerald-950 dark:text-emerald-100 tabular-nums">
            {metrics.activeCount} Trips
          </p>
          <p className="text-[0.6875rem] text-emerald-800 dark:text-emerald-300">
            Currently scheduled &amp; open for booking
          </p>
        </div>

        {/* Coaches En Route */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BusIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">In Transit En Route</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.inTransitCount} Coaches
          </p>
          <p className="text-[0.6875rem] text-muted">
            Currently travelling between terminals
          </p>
        </div>

        {/* Total Passengers Booked */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <UsersIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Passengers Booked</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.totalBooked.toLocaleString()} Seats
          </p>
          <p className="text-[0.6875rem] text-muted">
            Confirmed ticket reservations
          </p>
        </div>

        {/* Fleet Load Factor */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TrendingUpIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Average Load Factor</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.avgOccupancy}%
          </p>
          <p className="text-[0.6875rem] text-muted">
            Overall seat occupancy rate
          </p>
        </div>
      </div>

      {/* ── Unified Date Range Filter Toolbar ── */}
      <div className="rounded-2xl border border-line bg-surface p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted hidden sm:inline-block">
              View:
            </span>
            {presets.map((preset) => {
              const fromVal = today();
              const toVal   = daysAhead(preset.daysAhead || 0);
              const active  =
                applied.date_from === fromVal &&
                applied.date_to   === toVal;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const next = { date_from: fromVal, date_to: toVal };
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
            {/* Past trips toggle */}
            <button
              type="button"
              onClick={() => {
                const next = {
                  date_from: toDateInput(new Date(Date.now() - 90 * 86400000)),
                  date_to:   toDateInput(new Date(Date.now() - 86400000)),
                };
                setRange(next);
                setApplied(next);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                applied.date_to < today()
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'border border-line bg-surface text-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              Past 90 Days
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">From</span>
              <DateInput
                id="trip-from"
                value={range.date_from}
                max={range.date_to}
                onChange={(e) => setRange({ ...range, date_from: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">To</span>
              <DateInput
                id="trip-to"
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

      {/* ── Trips Data Table ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search corridor city, coach plate, driver name..."
          filters={[
            {
              key: 'status',
              label: 'Any status',
              options: statusOptions,
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />
        <DataTable<TripDetail>
          columns={columns}
          rows={state.rows}
          rowKey={(trip) => trip.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="Scheduled Departures"
          empty={
            <EmptyState
              icon={<CalendarDaysIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0
                  ? 'No departures match those filters'
                  : 'No trips scheduled yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or status filter.'
                  : 'Schedule a new departure to assign a coach and driver to an active corridor route.'
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
        <Pagination meta={state.meta} onPageChange={state.setPage} label="departures" />
      </Panel>

      {/* ── Schedule New Departure Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Schedule New Departure"
        subtitle="Assign an active coach and licensed driver to an intercity corridor"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" form="add-trip-form" loading={adding}>
              Publish Departure
            </Button>
          </>
        }
      >
        <form id="add-trip-form" onSubmit={submitAddTrip} noValidate className="space-y-4">
          <SelectField
            id="trip-route"
            label="Route Corridor"
            required
            value={addForm.route_id}
            error={addErrors.route_id}
            options={routes.map((r) => ({
              value: String(r.id),
              label: `${routeName(routes, terminals, r.id)} (${r.distance_km} km)`,
            }))}
            onChange={(e) => setAddForm({ ...addForm, route_id: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="trip-bus"
              label="Assigned Coach"
              required
              value={addForm.bus_id}
              error={addErrors.bus_id}
              options={buses.map((b) => ({
                value: String(b.id),
                label: `${b.plate_number} · ${titleCase(b.bus_type)} (${b.capacity} seats)`,
              }))}
              onChange={(e) => setAddForm({ ...addForm, bus_id: e.target.value })}
            />

            <SelectField
              id="trip-driver"
              label="Assigned Driver"
              required
              value={addForm.driver_id}
              error={addErrors.driver_id}
              options={drivers.map((d) => ({
                value: String(d.id),
                label: `${d.name} · ${d.license_number}`,
              }))}
              onChange={(e) => setAddForm({ ...addForm, driver_id: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="trip-departure-time"
              label="Departure Date & Time"
              type="datetime-local"
              required
              value={addForm.departure_time}
              error={addErrors.departure_time}
              onChange={(e) => setAddForm({ ...addForm, departure_time: e.target.value })}
            />

            <TextField
              id="trip-fare"
              label="Seat Fare (UGX)"
              type="number"
              min={0}
              required
              value={addForm.fare}
              error={addErrors.fare}
              onChange={(e) => setAddForm({ ...addForm, fare: e.target.value })}
            />
          </div>

          <SelectField
            id="trip-status"
            label="Initial Departure Status"
            value={addForm.status}
            options={statusOptions}
            onChange={(e) => setAddForm({ ...addForm, status: e.target.value as TripDetail['status'] })}
          />
        </form>
      </Modal>

      {/* ── Edit Departure Modal ── */}
      <Modal
        open={Boolean(editingTrip)}
        onClose={() => setEditingTrip(null)}
        title="Edit Departure Schedule"
        subtitle={editingTrip ? `Departure #${editingTrip.id} · ${editingTrip.origin?.city} ➔ ${editingTrip.destination?.city}` : undefined}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingTrip(null)} disabled={editPending}>
              Cancel
            </Button>
            <Button type="submit" form="edit-trip-form" loading={editPending}>
              Save Schedule
            </Button>
          </>
        }
      >
        <form id="edit-trip-form" onSubmit={submitEditTrip} noValidate className="space-y-4">
          <SelectField
            id="edit-trip-route"
            label="Route Corridor"
            value={editForm.route_id}
            options={routes.map((r) => ({
              value: String(r.id),
              label: `${routeName(routes, terminals, r.id)} (${r.distance_km} km)`,
            }))}
            onChange={(e) => setEditForm({ ...editForm, route_id: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="edit-trip-bus"
              label="Assigned Coach"
              value={editForm.bus_id}
              options={buses.map((b) => ({
                value: String(b.id),
                label: `${b.plate_number} · ${titleCase(b.bus_type)} (${b.capacity} seats)`,
              }))}
              onChange={(e) => setEditForm({ ...editForm, bus_id: e.target.value })}
            />

            <SelectField
              id="edit-trip-driver"
              label="Assigned Driver"
              value={editForm.driver_id}
              options={drivers.map((d) => ({
                value: String(d.id),
                label: `${d.name} · ${d.license_number}`,
              }))}
              onChange={(e) => setEditForm({ ...editForm, driver_id: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="edit-trip-departure-time"
              label="Departure Time"
              type="datetime-local"
              required
              value={editForm.departure_time}
              error={editErrors.departure_time}
              onChange={(e) => setEditForm({ ...editForm, departure_time: e.target.value })}
            />

            <TextField
              id="edit-trip-fare"
              label="Seat Fare (UGX)"
              type="number"
              min={0}
              required
              value={editForm.fare}
              error={editErrors.fare}
              onChange={(e) => setEditForm({ ...editForm, fare: e.target.value })}
            />
          </div>

          <SelectField
            id="edit-trip-status"
            label="Departure Status"
            value={editForm.status}
            options={statusOptions}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TripDetail['status'] })}
          />
        </form>
      </Modal>

      {/* ── Passenger Manifest & Boarding Dialog ── */}
      <Modal
        open={Boolean(manifestTrip)}
        onClose={() => setManifestTrip(null)}
        title={
          manifestTrip
            ? `Passenger Manifest · ${manifestTrip.origin?.city ?? 'Origin'} → ${manifestTrip.destination?.city ?? 'Dest'}`
            : 'Passenger Manifest'
        }
        subtitle={
          manifestTrip
            ? `${formatDateTime(manifestTrip.departure_time)} · Coach ${manifestTrip.bus?.plate_number ?? '—'} (${titleCase(manifestTrip.bus?.bus_type ?? 'standard')}) · Driver: ${manifestTrip.driver_user?.name ?? 'Unassigned'}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => setManifestTrip(null)}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                icon={<FileSpreadsheetIcon className="h-4 w-4" />}
                onClick={handleExportManifestCsv}
                disabled={!filteredManifest.length}
              >
                Export CSV
              </Button>
              <Button
                icon={<PrinterIcon className="h-4 w-4" />}
                onClick={() => manifestTrip && printTripManifest(manifestTrip, manifest || [])}
                disabled={!manifest || manifest.length === 0}
              >
                Print Manifest
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {manifestLoading ? (
            <div className="py-12 text-center text-muted">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent mb-2" />
              <p className="text-sm">Loading passenger manifest...</p>
            </div>
          ) : (
            <>
              {/* Boarding Progress Bar */}
              <div className="rounded-xl border border-line bg-surface-2 p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-fg">
                    Boarding Progress: <strong>{boardedCount}</strong> of <strong>{totalBookedCount}</strong> passengers checked in
                  </span>
                  <span className={`font-black ${boardedPct === 100 ? 'text-emerald-600' : 'text-brand-600'}`}>
                    {boardedPct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface border border-line overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${boardedPct === 100 ? 'bg-emerald-500' : 'bg-brand-600'}`}
                    style={{ width: `${boardedPct}%` }}
                  />
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-2 border border-line text-xs">
                  {(['all', 'boarded', 'pending', 'holds'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setManifestFilter(f)}
                      className={`px-3 py-1 font-bold rounded-lg transition-all capitalize ${
                        manifestFilter === f
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'text-muted hover:text-fg'
                      }`}
                    >
                      {f === 'all'
                        ? `All (${totalBookedCount})`
                        : f === 'boarded'
                        ? `Boarded (${boardedCount})`
                        : f === 'pending'
                        ? `Pending (${totalBookedCount - boardedCount})`
                        : `Holds (${heldSeats.length})`}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-60">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search passenger, seat, ticket..."
                    value={manifestSearch}
                    onChange={(e) => setManifestSearch(e.target.value)}
                    className="field !h-8 !pl-8 text-xs w-full"
                  />
                </div>
              </div>

              {/* Manifest Table */}
              <div className="max-h-80 overflow-y-auto thin-scroll border border-line rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-surface-2 text-muted font-bold sticky top-0 border-b border-line">
                    <tr>
                      <th className="p-2.5">Seat</th>
                      <th className="p-2.5">Passenger Name</th>
                      <th className="p-2.5">Phone Number</th>
                      <th className="p-2.5">Ticket Number</th>
                      <th className="p-2.5 text-right">Boarding Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredManifest.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted">
                          No passenger records found matching this view.
                        </td>
                      </tr>
                    ) : (
                      filteredManifest.map((ticket) => {
                        const isBoarded = Boolean(ticket.boarded_at);
                        return (
                          <tr key={ticket.id} className="hover:bg-surface-2/60 transition-colors">
                            <td className="p-2.5 font-mono font-black text-fg">
                              <span className="px-1.5 py-0.5 rounded bg-surface border border-line">
                                {ticket.seat?.seat_number ?? '—'}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold text-fg">
                              {ticket.passenger_name}
                            </td>
                            <td className="p-2.5 font-mono text-muted">
                              {ticket.passenger_phone || '—'}
                            </td>
                            <td className="p-2.5 font-mono text-xs text-muted">
                              #{ticket.ticket_number}
                            </td>
                            <td className="p-2.5 text-right">
                              {isBoarded ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md text-[0.6875rem]">
                                  <CheckCircle2Icon className="h-3 w-3" />
                                  Boarded
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md text-[0.6875rem]">
                                  <ClockIcon className="h-3 w-3" />
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Cancel / Delete Dialog ── */}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Cancel & delete this departure schedule?"
        consequence={
          deleting
            ? `Departure #${deleting.id} (${deleting.origin?.city} ➔ ${deleting.destination?.city} at ${formatDateTime(deleting.departure_time)}) will be permanently removed.`
            : ''
        }
        confirmLabel="Cancel Departure"
        pending={deletePending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}