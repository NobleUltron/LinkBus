import React, { useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  CompassIcon,
  ExternalLinkIcon,
  FileSpreadsheetIcon,
  GaugeIcon,
  MapPinIcon,
  NavigationIcon,
  PencilIcon,
  PlusIcon,
  RouteIcon,
  SparklesIcon,
  Trash2Icon,
  TrendingUpIcon,
  XCircleIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SelectField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { EmptyState } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { usePaginated } from '../../hooks/usePaginated';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { routesApi } from '../../services/crud';
import { getReferenceData } from '../../services/reference';
import type { BusRoute, Terminal } from '../../types/models';
import { durationLabel, money } from '../../utils/format';

const statusOptions = [
  { value: 'active', label: 'Active in Service' },
  { value: 'inactive', label: 'Suspended / Inactive' },
];

const popularCorridorPresets = [
  { name: 'Kampala ➔ Fort Portal', originCity: 'Kampala', destCity: 'Fort Portal', distance: 295, duration: 300 },
  { name: 'Kampala ➔ Mbarara', originCity: 'Kampala', destCity: 'Mbarara', distance: 270, duration: 270 },
  { name: 'Kampala ➔ Gulu', originCity: 'Kampala', destCity: 'Gulu', distance: 335, duration: 360 },
  { name: 'Kampala ➔ Arua', originCity: 'Kampala', destCity: 'Arua', distance: 480, duration: 510 },
  { name: 'Kampala ➔ Kasese', originCity: 'Kampala', destCity: 'Kasese', distance: 350, duration: 390 },
  { name: 'Kampala ➔ Masaka', originCity: 'Kampala', destCity: 'Masaka', distance: 130, duration: 150 },
  { name: 'Kampala ➔ Hoima', originCity: 'Kampala', destCity: 'Hoima', distance: 200, duration: 210 },
  { name: 'Mbarara ➔ Fort Portal', originCity: 'Mbarara', destCity: 'Fort Portal', distance: 150, duration: 160 },
];

export function Routes() {
  // Reference data (terminals for selector)
  const reference = useAsync(() => getReferenceData(), []);
  const terminals: Terminal[] = reference.data?.terminals ?? [];

  const terminalOptions = terminals.map((terminal) => ({
    value: String(terminal.id),
    label: `${terminal.city} — ${terminal.name}`,
  }));

  const cityFor = (id?: number) => (id ? terminals.find((t) => t.id === id)?.city ?? '—' : '—');
  const terminalNameFor = (id?: number) => (id ? terminals.find((t) => t.id === id)?.name ?? '' : '');

  // Paginated routes state
  const state = usePaginated<BusRoute>(({ page, perPage, search, filters }) =>
    routesApi.list({
      page,
      perPage,
      search,
      filters: {
        status: filters.status,
      },
    })
  );

  // Add Corridor Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    origin_terminal_id: '',
    destination_terminal_id: '',
    distance_km: '',
    estimated_duration_minutes: '',
    status: 'active' as BusRoute['status'],
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // Edit Corridor Modal state
  const [editingRoute, setEditingRoute] = useState<BusRoute | null>(null);
  const [editForm, setEditForm] = useState({
    origin_terminal_id: '',
    destination_terminal_id: '',
    distance_km: '',
    estimated_duration_minutes: '',
    status: 'active' as BusRoute['status'],
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editPending, setEditPending] = useState(false);

  // Preview & Delete state
  const [previewRoute, setPreviewRoute] = useState<BusRoute | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<BusRoute | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Scorecards metrics
  const metrics = useMemo(() => {
    const rows = state.rows;
    const activeCount = rows.filter((r) => r.status === 'active').length;
    const longDistanceCount = rows.filter((r) => Number(r.distance_km) >= 250).length;
    const totalCoverageKm = rows.reduce((sum, r) => sum + (Number(r.distance_km) || 0), 0);

    return {
      total: state.meta.total || rows.length,
      activeCount,
      longDistanceCount,
      totalCoverageKm,
    };
  }, [state.rows, state.meta.total]);

  // Submit Add Route
  const submitAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!addForm.origin_terminal_id) errors.origin_terminal_id = 'Origin terminal is required.';
    if (!addForm.destination_terminal_id) errors.destination_terminal_id = 'Destination terminal is required.';
    if (addForm.origin_terminal_id && addForm.origin_terminal_id === addForm.destination_terminal_id) {
      errors.destination_terminal_id = 'Origin and destination terminals must be different.';
    }

    const dist = parseFloat(addForm.distance_km);
    const dur = parseInt(addForm.estimated_duration_minutes, 10);
    if (!addForm.distance_km || isNaN(dist) || dist <= 0) errors.distance_km = 'Enter valid distance in km.';
    if (!addForm.estimated_duration_minutes || isNaN(dur) || dur <= 0) errors.estimated_duration_minutes = 'Enter valid duration in minutes.';

    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAdding(true);
    try {
      await routesApi.create({
        origin_terminal_id: Number(addForm.origin_terminal_id),
        destination_terminal_id: Number(addForm.destination_terminal_id),
        distance_km: dist,
        estimated_duration_minutes: dur,
        status: addForm.status,
      });

      toast.success('Intercity corridor registered into LinkBus network.');
      setAddOpen(false);
      setAddForm({
        origin_terminal_id: '',
        destination_terminal_id: '',
        distance_km: '',
        estimated_duration_minutes: '',
        status: 'active',
      });
      state.reload();
    } catch (err) {
      setAddErrors({ origin_terminal_id: errorMessage(err) });
    } finally {
      setAdding(false);
    }
  };

  // Open Edit Route Modal
  const openEditModal = (route: BusRoute) => {
    setEditingRoute(route);
    setEditForm({
      origin_terminal_id: String(route.origin_terminal_id),
      destination_terminal_id: String(route.destination_terminal_id),
      distance_km: String(route.distance_km),
      estimated_duration_minutes: String(route.estimated_duration_minutes),
      status: route.status,
    });
    setEditErrors({});
  };

  // Submit Edit Route
  const submitEditRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;

    const errors: Record<string, string> = {};
    if (!editForm.origin_terminal_id) errors.origin_terminal_id = 'Origin terminal is required.';
    if (!editForm.destination_terminal_id) errors.destination_terminal_id = 'Destination terminal is required.';
    if (editForm.origin_terminal_id && editForm.origin_terminal_id === editForm.destination_terminal_id) {
      errors.destination_terminal_id = 'Origin and destination must be different.';
    }

    const dist = parseFloat(editForm.distance_km);
    const dur = parseInt(editForm.estimated_duration_minutes, 10);
    if (!editForm.distance_km || isNaN(dist) || dist <= 0) errors.distance_km = 'Valid distance required.';
    if (!editForm.estimated_duration_minutes || isNaN(dur) || dur <= 0) errors.estimated_duration_minutes = 'Valid duration required.';

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditPending(true);
    try {
      await routesApi.update(editingRoute.id, {
        origin_terminal_id: Number(editForm.origin_terminal_id),
        destination_terminal_id: Number(editForm.destination_terminal_id),
        distance_km: dist,
        estimated_duration_minutes: dur,
        status: editForm.status,
      });

      toast.success('Corridor distance and transit duration updated.');
      setEditingRoute(null);
      state.reload();
    } catch (err) {
      setEditErrors({ origin_terminal_id: errorMessage(err) });
    } finally {
      setEditPending(false);
    }
  };

  // Quick Status Switcher
  const handleQuickStatusChange = async (route: BusRoute, nextStatus: BusRoute['status']) => {
    try {
      await routesApi.update(route.id, {
        ...route,
        status: nextStatus,
      });
      toast.success(`Corridor status: ${nextStatus.toUpperCase()}`);
      state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // Confirm Delete
  const confirmDelete = async () => {
    if (!deletingRoute) return;
    setDeletePending(true);
    try {
      await routesApi.remove(deletingRoute.id);
      toast.success('Corridor removed from active network.');
      setDeletingRoute(null);
      state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeletePending(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!state.rows.length) {
      toast.error('No corridors to export');
      return;
    }

    const headers = [
      'Route ID',
      'Origin City',
      'Origin Terminal',
      'Destination City',
      'Destination Terminal',
      'Highway Distance (km)',
      'Scheduled Transit (mins)',
      'Average Speed (km/h)',
      'Estimated Fare Min (UGX)',
      'Estimated Fare Max (UGX)',
      'Corridor Status',
    ];

    const csvRows = state.rows.map((r) => {
      const originCity = r.origin?.city || cityFor(r.origin_terminal_id);
      const destCity = r.destination?.city || cityFor(r.destination_terminal_id);
      const originName = r.origin?.name || terminalNameFor(r.origin_terminal_id);
      const destName = r.destination?.name || terminalNameFor(r.destination_terminal_id);
      const pace = r.estimated_duration_minutes > 0
        ? Math.round((r.distance_km / r.estimated_duration_minutes) * 60)
        : 0;
      const estMin = Math.round((r.distance_km * 100) / 1000) * 1000 || 25000;
      const estMax = Math.round((r.distance_km * 140) / 1000) * 1000 || 35000;

      return [
        r.id,
        `"${originCity}"`,
        `"${originName}"`,
        `"${destCity}"`,
        `"${destName}"`,
        r.distance_km,
        r.estimated_duration_minutes,
        pace,
        estMin,
        estMax,
        r.status === 'active' ? 'Active' : 'Suspended',
      ];
    });

    const csv = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linkbus_network_corridors_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Route corridors exported to CSV');
  };

  // Apply Popular Corridor Preset
  const applyPreset = (preset: typeof popularCorridorPresets[0], isEdit = false) => {
    const originTerm = terminals.find((t) => t.city.toLowerCase() === preset.originCity.toLowerCase());
    const destTerm = terminals.find((t) => t.city.toLowerCase() === preset.destCity.toLowerCase());

    if (isEdit) {
      setEditForm((prev) => ({
        ...prev,
        origin_terminal_id: originTerm ? String(originTerm.id) : prev.origin_terminal_id,
        destination_terminal_id: destTerm ? String(destTerm.id) : prev.destination_terminal_id,
        distance_km: String(preset.distance),
        estimated_duration_minutes: String(preset.duration),
      }));
    } else {
      setAddForm((prev) => ({
        ...prev,
        origin_terminal_id: originTerm ? String(originTerm.id) : prev.origin_terminal_id,
        destination_terminal_id: destTerm ? String(destTerm.id) : prev.destination_terminal_id,
        distance_km: String(preset.distance),
        estimated_duration_minutes: String(preset.duration),
      }));
    }
    toast.info(`Applied corridor data for ${preset.name}.`);
  };

  // Auto-compute duration from distance at average ~55 km/h
  const handleDistanceChange = (val: string, isEdit = false) => {
    const d = parseFloat(val);
    const suggestedMins = !isNaN(d) && d > 0 ? Math.round((d / 55) * 60) : '';

    if (isEdit) {
      setEditForm((prev) => ({
        ...prev,
        distance_km: val,
        estimated_duration_minutes: prev.estimated_duration_minutes || (suggestedMins ? String(suggestedMins) : ''),
      }));
    } else {
      setAddForm((prev) => ({
        ...prev,
        distance_km: val,
        estimated_duration_minutes: prev.estimated_duration_minutes || (suggestedMins ? String(suggestedMins) : ''),
      }));
    }
  };

  // DataTable columns
  const columns: Column<BusRoute>[] = [
    {
      key: 'corridor',
      header: 'Intercity Corridor',
      render: (route) => {
        const originCity = route.origin?.city || cityFor(route.origin_terminal_id);
        const destCity = route.destination?.city || cityFor(route.destination_terminal_id);
        const originName = route.origin?.name || terminalNameFor(route.origin_terminal_id);
        const destName = route.destination?.name || terminalNameFor(route.destination_terminal_id);

        return (
          <div className="py-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-fg text-sm">
                {originCity}
              </span>
              <span className="text-brand-600 dark:text-brand-400 font-black">➔</span>
              <span className="font-extrabold text-fg text-sm">
                {destCity}
              </span>
            </div>
            {originName && destName && (
              <p className="text-[0.6875rem] text-muted truncate max-w-sm mt-0.5">
                {originName} ➔ {destName}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'distance',
      header: 'Highway Distance',
      align: 'left',
      render: (route) => {
        const isLongHaul = Number(route.distance_km) >= 250;
        return (
          <div>
            <span className="tabular-nums font-extrabold text-fg text-sm">
              {route.distance_km} km
            </span>
            <span className={`block text-[0.6875rem] font-bold ${isLongHaul ? 'text-brand-600 dark:text-brand-400' : 'text-muted'}`}>
              {isLongHaul ? '🧭 Long Haul Corridor' : 'Regional Express'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'duration',
      header: 'Scheduled Transit',
      align: 'left',
      hideBelow: 'sm',
      render: (route) => (
        <div>
          <span className="tabular-nums font-bold text-fg text-sm flex items-center gap-1">
            <ClockIcon className="h-3 w-3 text-brand-600" />
            {durationLabel(route.estimated_duration_minutes)}
          </span>
          <span className="block text-[0.6875rem] text-muted">
            {route.estimated_duration_minutes} mins estimated
          </span>
        </div>
      ),
    },
    {
      key: 'pace',
      header: 'Average Speed',
      align: 'left',
      hideBelow: 'lg',
      render: (route) => {
        const pace =
          route.estimated_duration_minutes > 0
            ? Math.round((route.distance_km / route.estimated_duration_minutes) * 60)
            : 0;
        const isSafePace = pace <= 80;

        return (
          <div>
            <span className="tabular-nums font-semibold text-fg text-xs flex items-center gap-1">
              <GaugeIcon className="h-3 w-3 text-muted" />
              {pace} km/h
            </span>
            <span
              className={`block text-[0.625rem] font-bold ${
                isSafePace
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {isSafePace ? '✓ Governed Pace' : '⚠️ Fast Express'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'estimated_fare',
      header: 'Est. Fare Guide',
      align: 'left',
      hideBelow: 'md',
      render: (route) => {
        const estMin = Math.round((route.distance_km * 100) / 1000) * 1000 || 25000;
        const estMax = Math.round((route.distance_km * 140) / 1000) * 1000 || 35000;
        return (
          <div>
            <span className="font-bold text-xs tabular-nums text-fg">
              {money(estMin)} – {money(estMax)}
            </span>
            <span className="block text-[0.625rem] text-muted">Recommended Base</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Operating Status',
      render: (route) => <StatusPill status={route.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (route) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<RouteIcon className="h-3.5 w-3.5" />}
            onClick={() => setPreviewRoute(route)}
            title="View Corridor Details"
          >
            Overview
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PencilIcon className="h-3.5 w-3.5" />}
            onClick={() => openEditModal(route)}
            title="Edit Corridor"
          >
            Edit
          </Button>

          <select
            aria-label="Route status"
            value={route.status}
            onChange={(e) =>
              handleQuickStatusChange(route, e.target.value as BusRoute['status'])
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
            onClick={() => setDeletingRoute(route)}
            aria-label="Remove route corridor"
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Network Corridors &amp; Routes
          </h1>
          <p className="mt-1 text-xs text-muted max-w-xl">
            Configure intercity highway corridors connecting regional terminals. Distance and travel duration automatically drive scheduled arrival times and fare calculations.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            icon={<FileSpreadsheetIcon className="h-4 w-4" />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setAddOpen(true)}
          >
            + Register Corridor
          </Button>
        </div>
      </div>

      {/* ── Corridor Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Corridors */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              <RouteIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Total Corridors
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.total.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">
            Configured highway routes
          </p>
        </div>

        {/* Active Corridors */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Active Corridors
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-emerald-950 dark:text-emerald-100 tabular-nums">
            {metrics.activeCount.toLocaleString()} Routes
          </p>
          <p className="text-[0.6875rem] text-emerald-800 dark:text-emerald-300">
            Open for departure scheduling &amp; booking
          </p>
        </div>

        {/* Long Haul Express */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CompassIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Long Haul Express
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.longDistanceCount.toLocaleString()} Corridors
          </p>
          <p className="text-[0.6875rem] text-muted">
            Highways &ge; 250 km span
          </p>
        </div>

        {/* Total Network Span */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <NavigationIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Network Span
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.totalCoverageKm.toLocaleString()} km
          </p>
          <p className="text-[0.6875rem] text-muted">
            Total active highway coverage
          </p>
        </div>
      </div>

      {/* ── Routes Table Panel ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search corridor by origin, destination, city or terminal..."
          filters={[
            {
              key: 'status',
              label: 'All corridor statuses',
              options: statusOptions,
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />

        <DataTable<BusRoute>
          columns={columns}
          rows={state.rows}
          rowKey={(r) => r.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="Transit Corridors"
          empty={
            <EmptyState
              icon={<RouteIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0
                  ? 'No routes match those filters'
                  : 'No corridors defined yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or status filter.'
                  : 'Register an intercity corridor between two terminals to schedule departures.'
              }
              action={
                state.activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={state.clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
                    Register First Corridor
                  </Button>
                )
              }
            />
          }
        />
        <Pagination meta={state.meta} onPageChange={state.setPage} onPerPageChange={state.setPerPage} label="corridors" />
      </Panel>

      {/* ── Register Corridor Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Register Intercity Highway Corridor"
        subtitle="Connect two terminals to enable scheduled coach departures"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" form="add-route-form" loading={adding}>
              Register Corridor
            </Button>
          </>
        }
      >
        <form id="add-route-form" onSubmit={submitAddRoute} noValidate className="space-y-4">
          {/* Quick Presets Bar */}
          <div className="rounded-xl border border-line bg-surface-2/60 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted mb-2">
              <SparklesIcon className="h-3.5 w-3.5 text-brand-600" />
              <span>Popular Highway Corridors (Auto-fill distance &amp; duration):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularCorridorPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset, false)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-bold text-fg hover:border-brand-500 hover:text-brand-600 transition-colors shadow-2xs"
                >
                  🛣️ {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="route-origin"
              label="Origin Station &amp; Terminal"
              required
              value={addForm.origin_terminal_id}
              options={terminalOptions}
              placeholder="Select departure station..."
              error={addErrors.origin_terminal_id}
              onChange={(e) => setAddForm({ ...addForm, origin_terminal_id: e.target.value })}
            />

            <SelectField
              id="route-dest"
              label="Destination Station &amp; Terminal"
              required
              value={addForm.destination_terminal_id}
              options={terminalOptions}
              placeholder="Select arrival destination..."
              error={addErrors.destination_terminal_id}
              onChange={(e) => setAddForm({ ...addForm, destination_terminal_id: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="route-distance"
              label="Highway Distance (km)"
              type="number"
              min={1}
              required
              placeholder="e.g. 295"
              value={addForm.distance_km}
              error={addErrors.distance_km}
              hint="Actual road distance in kilometers."
              onChange={(e) => handleDistanceChange(e.target.value, false)}
            />

            <TextField
              id="route-duration"
              label="Estimated Transit Duration (Minutes)"
              type="number"
              min={5}
              required
              placeholder="e.g. 300 (5 hours)"
              value={addForm.estimated_duration_minutes}
              error={addErrors.estimated_duration_minutes}
              hint="Departure arrival times are auto-calculated from this duration."
              onChange={(e) => setAddForm({ ...addForm, estimated_duration_minutes: e.target.value })}
            />
          </div>

          <SelectField
            id="route-status"
            label="Corridor Operating Status"
            value={addForm.status}
            options={statusOptions}
            onChange={(e) => setAddForm({ ...addForm, status: e.target.value as BusRoute['status'] })}
          />
        </form>
      </Modal>

      {/* ── Edit Corridor Modal ── */}
      <Modal
        open={Boolean(editingRoute)}
        onClose={() => setEditingRoute(null)}
        title="Edit Highway Corridor"
        subtitle={
          editingRoute
            ? `${cityFor(editingRoute.origin_terminal_id)} ➔ ${cityFor(editingRoute.destination_terminal_id)} (Route #${editingRoute.id})`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingRoute(null)} disabled={editPending}>
              Cancel
            </Button>
            <Button type="submit" form="edit-route-form" loading={editPending}>
              Save Changes
            </Button>
          </>
        }
      >
        <form id="edit-route-form" onSubmit={submitEditRoute} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="edit-route-origin"
              label="Origin Station"
              required
              value={editForm.origin_terminal_id}
              options={terminalOptions}
              error={editErrors.origin_terminal_id}
              onChange={(e) => setEditForm({ ...editForm, origin_terminal_id: e.target.value })}
            />

            <SelectField
              id="edit-route-dest"
              label="Destination Station"
              required
              value={editForm.destination_terminal_id}
              options={terminalOptions}
              error={editErrors.destination_terminal_id}
              onChange={(e) => setEditForm({ ...editForm, destination_terminal_id: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="edit-route-distance"
              label="Highway Distance (km)"
              type="number"
              min={1}
              required
              value={editForm.distance_km}
              error={editErrors.distance_km}
              onChange={(e) => handleDistanceChange(e.target.value, true)}
            />

            <TextField
              id="edit-route-duration"
              label="Estimated Duration (Minutes)"
              type="number"
              min={5}
              required
              value={editForm.estimated_duration_minutes}
              error={editErrors.estimated_duration_minutes}
              onChange={(e) => setEditForm({ ...editForm, estimated_duration_minutes: e.target.value })}
            />
          </div>

          <SelectField
            id="edit-route-status"
            label="Operating Status"
            value={editForm.status}
            options={statusOptions}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as BusRoute['status'] })}
          />
        </form>
      </Modal>

      {/* ── Corridor Overview & Fare Matrix Modal ── */}
      <Modal
        open={Boolean(previewRoute)}
        onClose={() => setPreviewRoute(null)}
        title="Corridor Profile &amp; Route Matrix"
        subtitle={
          previewRoute
            ? `${cityFor(previewRoute.origin_terminal_id)} ➔ ${cityFor(previewRoute.destination_terminal_id)} (Route #${previewRoute.id})`
            : undefined
        }
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              icon={<PencilIcon className="h-4 w-4" />}
              onClick={() => {
                const r = previewRoute;
                setPreviewRoute(null);
                if (r) openEditModal(r);
              }}
            >
              Edit Corridor
            </Button>
            <Button variant="outline" onClick={() => setPreviewRoute(null)}>
              Close
            </Button>
          </>
        }
      >
        {previewRoute && (() => {
          const originCity = previewRoute.origin?.city || cityFor(previewRoute.origin_terminal_id);
          const destCity = previewRoute.destination?.city || cityFor(previewRoute.destination_terminal_id);
          const originName = previewRoute.origin?.name || terminalNameFor(previewRoute.origin_terminal_id);
          const destName = previewRoute.destination?.name || terminalNameFor(previewRoute.destination_terminal_id);
          const pace = previewRoute.estimated_duration_minutes > 0
            ? Math.round((previewRoute.distance_km / previewRoute.estimated_duration_minutes) * 60)
            : 0;
          const estMin = Math.round((previewRoute.distance_km * 100) / 1000) * 1000 || 25000;
          const estMax = Math.round((previewRoute.distance_km * 140) / 1000) * 1000 || 35000;

          return (
            <div className="space-y-4">
              {/* Corridor Banner */}
              <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center">
                <div className="flex items-center justify-center gap-3 font-black text-xl text-brand-950 dark:text-brand-100">
                  <span>{originCity}</span>
                  <span className="text-brand-600 dark:text-brand-400 font-black">➔</span>
                  <span>{destCity}</span>
                </div>
                <p className="text-xs text-brand-700 dark:text-brand-300 mt-1">
                  {originName} to {destName}
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <StatusPill status={previewRoute.status} />
                </div>
              </div>

              {/* Highway Metrics Grid */}
              <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-line pb-2 text-xs font-black uppercase tracking-wider text-muted">
                  <NavigationIcon className="h-3.5 w-3.5 text-brand-600" />
                  Transit &amp; Road Parameters
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-surface-2 p-2.5 border border-line">
                    <span className="text-muted text-[0.625rem] font-bold block uppercase">Distance</span>
                    <span className="font-extrabold text-sm text-fg">{previewRoute.distance_km} km</span>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-2.5 border border-line">
                    <span className="text-muted text-[0.625rem] font-bold block uppercase">Est. Duration</span>
                    <span className="font-extrabold text-sm text-fg">{durationLabel(previewRoute.estimated_duration_minutes)}</span>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-2.5 border border-line">
                    <span className="text-muted text-[0.625rem] font-bold block uppercase">Cruising Speed</span>
                    <span className="font-extrabold text-sm text-fg">{pace} km/h</span>
                  </div>
                </div>
              </div>

              {/* Passenger Fare Estimation */}
              <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-line pb-2 text-xs">
                  <span className="font-black uppercase tracking-wider text-muted">Recommended Base Fare Guide</span>
                  <span className="font-mono font-bold text-brand-600">Standard Class</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted">Standard Passenger Seat:</span>
                  <strong className="font-extrabold text-fg text-sm">{money(estMin)} – {money(estMax)}</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">VIP Executive Recliner:</span>
                  <strong className="font-extrabold text-amber-600 text-sm">{money(Math.round(estMax * 1.25 / 1000) * 1000)}</strong>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={Boolean(deletingRoute)}
        title="Remove Highway Corridor?"
        body={
          deletingRoute
            ? `The ${cityFor(deletingRoute.origin_terminal_id)} ➔ ${cityFor(deletingRoute.destination_terminal_id)} corridor will be removed. Scheduled trips on this route will remain preserved in historical logs.`
            : ''
        }
        confirmLabel="Remove Route"
        variant="danger"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRoute(null)}
      />
    </div>
  );
}