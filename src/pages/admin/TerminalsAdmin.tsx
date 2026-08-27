import React, { useMemo, useState } from 'react';
import {
  Building2Icon,
  CheckCircle2Icon,
  CompassIcon,
  ExternalLinkIcon,
  FileSpreadsheetIcon,
  GlobeIcon,
  ImageIcon,
  MapPinIcon,
  NavigationIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  XCircleIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { EmptyState } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { usePaginated } from '../../hooks/usePaginated';
import { errorMessage } from '../../hooks/useAsync';
import { terminalsApi } from '../../services/crud';
import type { Terminal } from '../../types/models';
import { getMediaUrl } from '../../utils/format';

const statusOptions = [
  { value: 'active', label: 'Active Hub in Operation' },
  { value: 'inactive', label: 'Inactive / Closed Station' },
];

const ugandaPresetCities = [
  { city: 'Kampala', name: 'Namayiba Central Terminal', address: 'Nakivubo Rd, Counter 12 Arrivals Hall', lat: 0.3182, lng: 32.5746 },
  { city: 'Fort Portal', name: 'Fort Portal Main Hub', address: 'Lugard Rd, City Bus Park', lat: 0.6558, lng: 30.2748 },
  { city: 'Mbarara', name: 'Mbarara Western Express Terminal', address: 'High St / Masaka Rd Junction', lat: -0.6072, lng: 30.6545 },
  { city: 'Gulu', name: 'Gulu Northern Hub', address: 'Acholi Rd, Main Bus Park', lat: 2.7747, lng: 32.2990 },
  { city: 'Arua', name: 'Arua West Nile Station', address: 'Avenue Rd, Transport Terminal', lat: 3.0303, lng: 30.9107 },
  { city: 'Kasese', name: 'Kasese Rwenzori Terminal', address: 'Rwenzori Rd, Bus Park', lat: 0.1833, lng: 30.0833 },
  { city: 'Masaka', name: 'Masaka Transit Hub', address: 'Nyendo Highway Stage', lat: -0.3411, lng: 31.7361 },
  { city: 'Hoima', name: 'Hoima Oil City Terminal', address: 'Main St, Bus Park', lat: 1.4331, lng: 31.3524 },
];

export function TerminalsAdmin() {
  // Paginated terminals state
  const state = usePaginated<Terminal>(({ page, perPage, search, filters }) =>
    terminalsApi.list({
      page,
      perPage,
      search,
      filters: {
        status: filters.status,
      },
    })
  );

  // Add terminal state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    city: '',
    address: '',
    latitude: '',
    longitude: '',
    photo: '',
    status: 'active' as Terminal['status'],
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // Edit terminal state
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    address: '',
    latitude: '',
    longitude: '',
    photo: '',
    status: 'active' as Terminal['status'],
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editPending, setEditPending] = useState(false);

  // View overview & Delete state
  const [previewTerminal, setPreviewTerminal] = useState<Terminal | null>(null);
  const [deletingTerminal, setDeletingTerminal] = useState<Terminal | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Scorecards computation
  const metrics = useMemo(() => {
    const rows = state.rows;
    const activeCount = rows.filter((t) => t.status === 'active').length;
    const inactiveCount = rows.filter((t) => t.status === 'inactive').length;
    const citiesSet = new Set(rows.map((t) => t.city).filter(Boolean));
    const geocodedCount = rows.filter((t) => Number(t.latitude) !== 0 && Number(t.longitude) !== 0).length;

    return {
      total: state.meta.total || rows.length,
      activeCount,
      inactiveCount,
      citiesCount: citiesSet.size,
      geocodedCount,
    };
  }, [state.rows, state.meta.total]);

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Station photo must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (isEdit) {
        setEditForm((prev) => ({ ...prev, photo: dataUrl }));
      } else {
        setAddForm((prev) => ({ ...prev, photo: dataUrl }));
      }
      toast.success('Station photo attached.');
    };
    reader.readAsDataURL(file);
  };

  // Submit Add Terminal
  const submitAddTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!addForm.name.trim()) errors.name = 'Terminal station name is required.';
    if (!addForm.city.trim()) errors.city = 'City or municipality is required.';
    if (!addForm.address.trim()) errors.address = 'Physical street address is required.';

    const lat = parseFloat(addForm.latitude);
    const lng = parseFloat(addForm.longitude);
    if (!addForm.latitude || isNaN(lat)) errors.latitude = 'Valid GPS latitude required (e.g. 0.3182).';
    if (!addForm.longitude || isNaN(lng)) errors.longitude = 'Valid GPS longitude required (e.g. 32.5746).';

    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAdding(true);
    try {
      await terminalsApi.create({
        name: addForm.name.trim(),
        city: addForm.city.trim(),
        address: addForm.address.trim(),
        latitude: lat,
        longitude: lng,
        photo: addForm.photo.trim() || null,
        status: addForm.status,
      });

      toast.success(`Station Hub "${addForm.name.trim()}" registered.`);
      setAddOpen(false);
      setAddForm({
        name: '',
        city: '',
        address: '',
        latitude: '',
        longitude: '',
        photo: '',
        status: 'active',
      });
      state.reload();
    } catch (err) {
      setAddErrors({ name: errorMessage(err) });
    } finally {
      setAdding(false);
    }
  };

  // Open Edit Terminal Modal
  const openEditModal = (terminal: Terminal) => {
    setEditingTerminal(terminal);
    setEditForm({
      name: terminal.name ?? '',
      city: terminal.city ?? '',
      address: terminal.address ?? '',
      latitude: String(terminal.latitude ?? ''),
      longitude: String(terminal.longitude ?? ''),
      photo: terminal.photo ?? '',
      status: terminal.status ?? 'active',
    });
    setEditErrors({});
  };

  // Submit Edit Terminal
  const submitEditTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerminal) return;

    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) errors.name = 'Terminal station name is required.';
    if (!editForm.city.trim()) errors.city = 'City or municipality is required.';
    if (!editForm.address.trim()) errors.address = 'Physical street address is required.';

    const lat = parseFloat(editForm.latitude);
    const lng = parseFloat(editForm.longitude);
    if (!editForm.latitude || isNaN(lat)) errors.latitude = 'Valid GPS latitude required.';
    if (!editForm.longitude || isNaN(lng)) errors.longitude = 'Valid GPS longitude required.';

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditPending(true);
    try {
      await terminalsApi.update(editingTerminal.id, {
        name: editForm.name.trim(),
        city: editForm.city.trim(),
        address: editForm.address.trim(),
        latitude: lat,
        longitude: lng,
        photo: editForm.photo.trim() || null,
        status: editForm.status,
      });

      toast.success(`Terminal "${editForm.name.trim()}" updated.`);
      setEditingTerminal(null);
      state.reload();
    } catch (err) {
      setEditErrors({ name: errorMessage(err) });
    } finally {
      setEditPending(false);
    }
  };

  // Quick Status Switcher
  const handleQuickStatusChange = async (terminal: Terminal, nextStatus: Terminal['status']) => {
    try {
      await terminalsApi.update(terminal.id, {
        ...terminal,
        status: nextStatus,
      });
      toast.success(`Station "${terminal.name}" status: ${nextStatus.toUpperCase()}`);
      state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // Delete Terminal
  const confirmDelete = async () => {
    if (!deletingTerminal) return;
    setDeletePending(true);
    try {
      await terminalsApi.remove(deletingTerminal.id);
      toast.success(`Terminal "${deletingTerminal.name}" removed.`);
      setDeletingTerminal(null);
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
      toast.error('No terminals to export');
      return;
    }

    const headers = [
      'Terminal ID',
      'Station Name',
      'City / Municipality',
      'Street Address & Counter',
      'GPS Latitude',
      'GPS Longitude',
      'Operating Status',
      'Photo URL',
    ];

    const csvRows = state.rows.map((t) => [
      t.id,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.city.replace(/"/g, '""')}"`,
      `"${t.address.replace(/"/g, '""')}"`,
      t.latitude,
      t.longitude,
      t.status === 'active' ? 'Active Hub' : 'Inactive',
      `"${t.photo || ''}"`,
    ]);

    const csv = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linkbus_terminals_registry_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Terminals registry exported to CSV');
  };

  // Apply City Preset
  const applyCityPreset = (preset: typeof ugandaPresetCities[0], isEdit = false) => {
    if (isEdit) {
      setEditForm((prev) => ({
        ...prev,
        city: preset.city,
        name: preset.name,
        address: preset.address,
        latitude: String(preset.lat),
        longitude: String(preset.lng),
      }));
    } else {
      setAddForm((prev) => ({
        ...prev,
        city: preset.city,
        name: preset.name,
        address: preset.address,
        latitude: String(preset.lat),
        longitude: String(preset.lng),
      }));
    }
    toast.info(`Filled coordinates and info for ${preset.city}.`);
  };

  // DataTable columns
  const columns: Column<Terminal>[] = [
    {
      key: 'terminal',
      header: 'Terminal & Station',
      render: (terminal) => {
        const photoUrl = getMediaUrl(terminal.photo);
        return (
          <div className="flex items-center gap-3 py-1">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={terminal.name}
                className="h-10 w-14 shrink-0 rounded-xl object-cover border border-line shadow-sm"
              />
            ) : (
              <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                <MapPinIcon className="h-5 w-5" aria-hidden />
              </span>
            )}
            <div>
              <p className="font-bold text-fg text-sm flex items-center gap-1.5">
                {terminal.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center rounded-md bg-surface-2 px-1.5 py-0.5 text-[0.625rem] font-extrabold text-muted uppercase">
                  {terminal.city} Hub
                </span>
                <span className="text-[0.6875rem] text-muted">
                  ID #{terminal.id}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'address',
      header: 'Physical Street Address',
      hideBelow: 'md',
      render: (terminal) => (
        <div className="max-w-xs">
          <span className="text-xs text-fg leading-relaxed block">{terminal.address}</span>
        </div>
      ),
    },
    {
      key: 'coords',
      header: 'GPS Navigation & Map',
      hideBelow: 'lg',
      align: 'left',
      render: (terminal) => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${terminal.latitude},${terminal.longitude}`;
        return (
          <div>
            <span className="tabular-nums font-mono text-xs font-semibold text-fg flex items-center gap-1">
              <CompassIcon className="h-3 w-3 text-brand-600 shrink-0" />
              {Number(terminal.latitude).toFixed(4)}, {Number(terminal.longitude).toFixed(4)}
            </span>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.6875rem] font-bold text-brand-600 dark:text-brand-400 hover:underline mt-0.5"
            >
              <NavigationIcon className="h-3 w-3" />
              Google Maps
              <ExternalLinkIcon className="h-2.5 w-2.5 opacity-60" />
            </a>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Hub Status',
      render: (terminal) => (
        <StatusPill
          status={terminal.status}
          label={terminal.status === 'active' ? 'Active Hub' : 'Closed / Inactive'}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (terminal) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<MapPinIcon className="h-3.5 w-3.5" />}
            onClick={() => setPreviewTerminal(terminal)}
            title="View Station Map & Overview"
          >
            Overview
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PencilIcon className="h-3.5 w-3.5" />}
            onClick={() => openEditModal(terminal)}
            title="Edit Terminal"
          >
            Edit
          </Button>

          <select
            aria-label={`Status for ${terminal.name}`}
            value={terminal.status}
            onChange={(e) =>
              handleQuickStatusChange(terminal, e.target.value as Terminal['status'])
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
            onClick={() => setDeletingTerminal(terminal)}
            aria-label={`Remove ${terminal.name}`}
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
            Terminals &amp; Regional Station Hubs
          </h1>
          <p className="mt-1 text-xs text-muted max-w-xl">
            Manage intercity terminal stations, street counters, GPS coordinates for live passenger turn-by-turn navigation, and station photography.
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
            + Register Terminal
          </Button>
        </div>
      </div>

      {/* ── Station Hub Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Stations */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              <Building2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Total Stations
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.total.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">
            Registered transit facilities
          </p>
        </div>

        {/* Active Hubs */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Active Hubs
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-emerald-950 dark:text-emerald-100 tabular-nums">
            {metrics.activeCount.toLocaleString()} Stations
          </p>
          <p className="text-[0.6875rem] text-emerald-800 dark:text-emerald-300">
            Open for coach dispatch &amp; arrival
          </p>
        </div>

        {/* Cities Connected */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <GlobeIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Cities Connected
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.citiesCount.toLocaleString()} Municipalities
          </p>
          <p className="text-[0.6875rem] text-muted">
            Urban &amp; regional transit centers
          </p>
        </div>

        {/* GPS Geocoded */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <NavigationIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              GPS Geocoded
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.geocodedCount.toLocaleString()} Mapped
          </p>
          <p className="text-[0.6875rem] text-muted">
            Satellite navigation coordinates
          </p>
        </div>
      </div>

      {/* ── Terminals Table Panel ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search terminal name, city or street address..."
          filters={[
            {
              key: 'status',
              label: 'All station statuses',
              options: statusOptions,
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />

        <DataTable<Terminal>
          columns={columns}
          rows={state.rows}
          rowKey={(t) => t.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="Terminal Stations"
          empty={
            <EmptyState
              icon={<Building2Icon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0
                  ? 'No terminals match those filters'
                  : 'No terminals registered yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or status filter.'
                  : 'Register a regional terminal to configure transit corridors and schedule departures.'
              }
              action={
                state.activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={state.clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
                    Register First Terminal
                  </Button>
                )
              }
            />
          }
        />
        <Pagination meta={state.meta} onPageChange={state.setPage} label="terminals" />
      </Panel>

      {/* ── Register Terminal Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Register New Terminal Station"
        subtitle="Add an intercity bus hub to the LinkBus route network"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" form="add-terminal-form" loading={adding}>
              Register Terminal Hub
            </Button>
          </>
        }
      >
        <form id="add-terminal-form" onSubmit={submitAddTerminal} noValidate className="space-y-4">
          {/* Quick Presets Bar */}
          <div className="rounded-xl border border-line bg-surface-2/60 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted mb-2">
              <SparklesIcon className="h-3.5 w-3.5 text-brand-600" />
              <span>Quick Regional Presets (Auto-fill GPS &amp; details):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ugandaPresetCities.map((preset) => (
                <button
                  key={preset.city}
                  type="button"
                  onClick={() => applyCityPreset(preset, false)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-bold text-fg hover:border-brand-500 hover:text-brand-600 transition-colors shadow-2xs"
                >
                  📍 {preset.city}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="terminal-name"
              label="Terminal Station Name"
              required
              placeholder="e.g. Namayiba Central Bus Terminal"
              value={addForm.name}
              error={addErrors.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            />

            <TextField
              id="terminal-city"
              label="City / Municipality"
              required
              placeholder="e.g. Kampala"
              value={addForm.city}
              error={addErrors.city}
              onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
            />
          </div>

          <TextAreaField
            id="terminal-address"
            label="Physical Street Address &amp; Counter Location"
            required
            placeholder="e.g. Nakivubo Rd, Counter 12 Arrivals Hall, Opposite Old Taxi Park"
            value={addForm.address}
            error={addErrors.address}
            onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="terminal-lat"
              label="GPS Latitude"
              required
              placeholder="e.g. 0.3182"
              value={addForm.latitude}
              error={addErrors.latitude}
              onChange={(e) => setAddForm({ ...addForm, latitude: e.target.value })}
            />

            <TextField
              id="terminal-lng"
              label="GPS Longitude"
              required
              placeholder="e.g. 32.5746"
              value={addForm.longitude}
              error={addErrors.longitude}
              onChange={(e) => setAddForm({ ...addForm, longitude: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="terminal-status"
              label="Initial Operational Status"
              value={addForm.status}
              options={statusOptions}
              onChange={(e) => setAddForm({ ...addForm, status: e.target.value as Terminal['status'] })}
            />

            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                Station Photo (Upload or Paste URL)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://..."
                  value={addForm.photo}
                  onChange={(e) => setAddForm({ ...addForm, photo: e.target.value })}
                  className="field text-xs flex-1"
                />
                <label className="flex items-center gap-1 px-3 py-2 bg-surface-2 border border-line rounded-xl text-xs font-bold cursor-pointer hover:bg-surface-3 transition-colors shrink-0">
                  <UploadIcon className="h-3.5 w-3.5 text-brand-600" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, false)}
                  />
                </label>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Edit Terminal Modal ── */}
      <Modal
        open={Boolean(editingTerminal)}
        onClose={() => setEditingTerminal(null)}
        title="Edit Terminal Station"
        subtitle={editingTerminal ? `Station #${editingTerminal.id} · ${editingTerminal.name}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingTerminal(null)} disabled={editPending}>
              Cancel
            </Button>
            <Button type="submit" form="edit-terminal-form" loading={editPending}>
              Save Changes
            </Button>
          </>
        }
      >
        <form id="edit-terminal-form" onSubmit={submitEditTerminal} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="edit-terminal-name"
              label="Terminal Station Name"
              required
              value={editForm.name}
              error={editErrors.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />

            <TextField
              id="edit-terminal-city"
              label="City / Municipality"
              required
              value={editForm.city}
              error={editErrors.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
            />
          </div>

          <TextAreaField
            id="edit-terminal-address"
            label="Physical Street Address &amp; Counter Location"
            required
            value={editForm.address}
            error={editErrors.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="edit-terminal-lat"
              label="GPS Latitude"
              required
              value={editForm.latitude}
              error={editErrors.latitude}
              onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
            />

            <TextField
              id="edit-terminal-lng"
              label="GPS Longitude"
              required
              value={editForm.longitude}
              error={editErrors.longitude}
              onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="edit-terminal-status"
              label="Operational Status"
              value={editForm.status}
              options={statusOptions}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Terminal['status'] })}
            />

            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                Station Photo (Upload or Paste URL)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://..."
                  value={editForm.photo}
                  onChange={(e) => setEditForm({ ...editForm, photo: e.target.value })}
                  className="field text-xs flex-1"
                />
                <label className="flex items-center gap-1 px-3 py-2 bg-surface-2 border border-line rounded-xl text-xs font-bold cursor-pointer hover:bg-surface-3 transition-colors shrink-0">
                  <UploadIcon className="h-3.5 w-3.5 text-brand-600" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, true)}
                  />
                </label>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Terminal Overview & GPS Map Modal ── */}
      <Modal
        open={Boolean(previewTerminal)}
        onClose={() => setPreviewTerminal(null)}
        title="Terminal Station Overview"
        subtitle={previewTerminal ? `Regional Hub #${previewTerminal.id} · ${previewTerminal.city}` : undefined}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              icon={<PencilIcon className="h-4 w-4" />}
              onClick={() => {
                const t = previewTerminal;
                setPreviewTerminal(null);
                if (t) openEditModal(t);
              }}
            >
              Edit Terminal
            </Button>
            <Button variant="outline" onClick={() => setPreviewTerminal(null)}>
              Close
            </Button>
          </>
        }
      >
        {previewTerminal && (() => {
          const photoUrl = getMediaUrl(previewTerminal.photo);
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${previewTerminal.latitude},${previewTerminal.longitude}`;

          return (
            <div className="space-y-4">
              {/* Photo Banner */}
              <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-line bg-surface-2">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={previewTerminal.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-muted">
                    <Building2Icon className="h-10 w-10 opacity-40 mb-1" />
                    <span className="text-xs font-bold">No Station Photo Attached</span>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <StatusPill status={previewTerminal.status} />
                </div>
                <div className="absolute bottom-3 left-3 rounded-xl bg-black/70 backdrop-blur-md px-3 py-1.5 text-white">
                  <p className="font-extrabold text-sm">{previewTerminal.name}</p>
                  <p className="text-[0.6875rem] text-slate-300">{previewTerminal.city} Central Hub</p>
                </div>
              </div>

              {/* Station Details Card */}
              <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-line pb-2 text-xs font-black uppercase tracking-wider text-muted">
                  <MapPinIcon className="h-3.5 w-3.5 text-brand-600" />
                  Address &amp; Location Details
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted text-[0.625rem] uppercase font-bold block">Counter &amp; Street Address</span>
                    <p className="font-bold text-fg leading-relaxed">{previewTerminal.address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-line/60">
                    <div>
                      <span className="text-muted text-[0.625rem] uppercase font-bold block">GPS Coordinates</span>
                      <p className="font-mono font-bold text-fg">
                        {Number(previewTerminal.latitude).toFixed(4)}, {Number(previewTerminal.longitude).toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted text-[0.625rem] uppercase font-bold block">City Hub</span>
                      <p className="font-bold text-fg">{previewTerminal.city}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Navigation Launch */}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-brand-500/30 bg-brand-500/10 p-3.5 text-xs font-bold text-brand-700 dark:text-brand-300 hover:bg-brand-500/20 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <NavigationIcon className="h-4 w-4" />
                  <span>Launch Google Maps Live Navigation</span>
                </div>
                <ExternalLinkIcon className="h-3.5 w-3.5 opacity-80" />
              </a>
            </div>
          );
        })()}
      </Modal>

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={Boolean(deletingTerminal)}
        title="Remove Terminal Station?"
        body={
          deletingTerminal
            ? `Are you sure you want to remove "${deletingTerminal.name}"? Intercity routes referencing this terminal will require reassignment.`
            : ''
        }
        confirmLabel="Remove Terminal"
        variant="danger"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingTerminal(null)}
      />
    </div>
  );
}