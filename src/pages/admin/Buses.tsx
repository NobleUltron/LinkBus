import React, { useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  BusIcon,
  CheckCircle2Icon,
  CrownIcon,
  FileSpreadsheetIcon,
  FilterIcon,
  GridIcon,
  InfoIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Trash2Icon,
  TrendingUpIcon,
  UsersIcon,
  WrenchIcon,
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
import { busesApi } from '../../services/crud';
import type { Bus } from '../../types/models';

const typeOptions = [
  { value: 'standard', label: 'Standard Coach (2x2 Layout)' },
  { value: 'vip', label: 'VIP Executive (Leather Recliners)' },
  { value: 'sleeper', label: 'Overnight Sleeper (Berths)' },
];

const statusOptions = [
  { value: 'active', label: 'Active in Service' },
  { value: 'maintenance', label: 'In Workshop / Maintenance' },
  { value: 'retired', label: 'Retired / Decommissioned' },
];

export function Buses() {
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    plate_number: '',
    model: '',
    bus_type: 'standard' as Bus['bus_type'],
    capacity: '44',
    status: 'active' as Bus['status'],
    notes: '',
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // Edit Coach State
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [editForm, setEditForm] = useState({
    plate_number: '',
    model: '',
    bus_type: 'standard' as Bus['bus_type'],
    capacity: '44',
    status: 'active' as Bus['status'],
    notes: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editPending, setEditPending] = useState(false);

  // Delete & Preview State
  const [deleting, setDeleting] = useState<Bus | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [previewBus, setPreviewBus] = useState<Bus | null>(null);

  // Paginated List State
  const state = usePaginated<Bus>(({ page, perPage, search, filters }) =>
    busesApi.list({
      page,
      perPage,
      search,
      filters: {
        bus_type: filters.bus_type,
        status: filters.status,
      },
    })
  );

  // Fleet Statistics Scorecards
  const metrics = useMemo(() => {
    const rows = state.rows;
    const activeCount = rows.filter((b) => b.status === 'active').length;
    const workshopCount = rows.filter((b) => b.status === 'maintenance').length;
    const totalCapacity = rows
      .filter((b) => b.status === 'active')
      .reduce((acc, b) => acc + (b.capacity || 0), 0);
    const vipCount = rows.filter((b) => b.bus_type === 'vip' || b.bus_type === 'sleeper').length;

    return {
      activeCount,
      workshopCount,
      totalCapacity,
      vipCount,
      totalFleet: state.meta.total || rows.length,
    };
  }, [state.rows, state.meta.total]);

  const submitAddBus = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!addForm.plate_number.trim()) errors.plate_number = 'Plate number is required (e.g. UBG 480K).';
    if (!addForm.model.trim()) errors.model = 'Chassis / coach model is required.';
    const cap = parseInt(addForm.capacity, 10);
    if (!addForm.capacity || isNaN(cap) || cap < 8 || cap > 70) {
      errors.capacity = 'Enter valid seating capacity (8 - 70 seats).';
    }

    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAdding(true);
    try {
      const created = await busesApi.create({
        plate_number: addForm.plate_number.trim().toUpperCase(),
        model: addForm.model.trim(),
        bus_type: addForm.bus_type,
        capacity: cap,
        status: addForm.status,
        notes: addForm.notes.trim(),
      });
      toast.success(`Coach ${created.plate_number} registered into LinkBus fleet.`);
      setAddOpen(false);
      setAddForm({
        plate_number: '',
        model: '',
        bus_type: 'standard',
        capacity: '44',
        status: 'active',
        notes: '',
      });
      state.reload();
    } catch (error) {
      setAddErrors({ plate_number: errorMessage(error) });
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (bus: Bus) => {
    setEditingBus(bus);
    setEditForm({
      plate_number: bus.plate_number,
      model: bus.model,
      bus_type: bus.bus_type,
      capacity: String(bus.capacity),
      status: bus.status,
      notes: bus.notes || '',
    });
    setEditErrors({});
  };

  const submitEditBus = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingBus) return;
    const errors: Record<string, string> = {};
    if (!editForm.plate_number.trim()) errors.plate_number = 'Plate number is required.';
    if (!editForm.model.trim()) errors.model = 'Model is required.';
    const cap = parseInt(editForm.capacity, 10);
    if (!editForm.capacity || isNaN(cap) || cap < 8 || cap > 70) {
      errors.capacity = 'Valid capacity required (8 - 70).';
    }

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditPending(true);
    try {
      await busesApi.update(editingBus.id, {
        plate_number: editForm.plate_number.trim().toUpperCase(),
        model: editForm.model.trim(),
        bus_type: editForm.bus_type,
        capacity: cap,
        status: editForm.status,
        notes: editForm.notes.trim(),
      });
      toast.success(`Coach ${editForm.plate_number} details updated.`);
      setEditingBus(null);
      state.reload();
    } catch (error) {
      setEditErrors({ plate_number: errorMessage(error) });
    } finally {
      setEditPending(false);
    }
  };

  const handleQuickStatusChange = async (bus: Bus, nextStatus: Bus['status']) => {
    try {
      await busesApi.update(bus.id, {
        ...bus,
        status: nextStatus,
      });
      toast.success(`Coach ${bus.plate_number} status: ${nextStatus.toUpperCase()}`);
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await busesApi.delete(deleting.id);
      toast.success(`Coach ${deleting.plate_number} decommissioned from fleet.`);
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
      toast.error('No coach records to export');
      return;
    }
    const headers = [
      'Fleet ID',
      'Registration Plate',
      'Chassis & Model',
      'Cabin Configuration',
      'Seating Capacity',
      'Operational Status',
      'Workshop Notes',
    ];

    const csvRows = state.rows.map((b) => [
      b.id,
      `"${b.plate_number}"`,
      `"${b.model}"`,
      `"${b.bus_type}"`,
      b.capacity,
      `"${b.status}"`,
      `"${(b.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linkbus_fleet_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Fleet registry exported to CSV');
  };

  const columns: Column<Bus>[] = [
    {
      key: 'plate',
      header: 'Coach & Registration',
      render: (bus) => (
        <div className="py-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs font-black text-fg tracking-wide shadow-sm">
              {bus.plate_number}
            </span>
            <span className="font-bold text-fg text-sm">{bus.model}</span>
          </div>
          <p className="text-[0.6875rem] text-muted mt-0.5">
            Fleet Unit #{bus.id}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Cabin Class',
      render: (bus) => {
        const isVip = bus.bus_type === 'vip';
        const isSleeper = bus.bus_type === 'sleeper';

        return (
          <div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isVip
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                  : isSleeper
                  ? 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30'
                  : 'bg-surface-2 text-fg border border-line'
              }`}
            >
              {isVip ? <CrownIcon className="h-3 w-3 text-amber-600" /> : isSleeper ? <SparklesIcon className="h-3 w-3 text-indigo-600" /> : <BusIcon className="h-3 w-3 text-brand-600" />}
              {isVip ? 'VIP Executive' : isSleeper ? 'Sleeper Berths' : 'Standard 2x2'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'capacity',
      header: 'Seating Capacity',
      align: 'left',
      render: (bus) => (
        <div>
          <span className="tabular-nums font-extrabold text-fg text-sm">
            {bus.capacity} Seats
          </span>
          <span className="block text-[0.6875rem] text-muted">
            {Math.ceil(bus.capacity / 4)} Rows · 2x2 Layout
          </span>
        </div>
      ),
    },
    {
      key: 'layout',
      header: 'VIP Allocation',
      hideBelow: 'lg',
      render: (bus) => (
        <span className="text-xs text-muted font-medium">
          {bus.bus_type === 'vip'
            ? 'All Reclining Leather'
            : bus.bus_type === 'sleeper'
            ? 'Horizontal Berths'
            : '2 Front Rows (8 VIP)'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Fleet Status',
      render: (bus) => <StatusPill status={bus.status} />,
    },
    {
      key: 'notes',
      header: 'Workshop Notes',
      hideBelow: 'xl',
      render: (bus) => (
        <span className="text-xs text-muted max-w-[180px] truncate block">
          {bus.notes || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (bus) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<GridIcon className="h-3.5 w-3.5" />}
            onClick={() => setPreviewBus(bus)}
            title="View Seat Map"
          >
            Seat Map
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PencilIcon className="h-3.5 w-3.5" />}
            onClick={() => openEditModal(bus)}
            title="Edit Coach"
          >
            Edit
          </Button>

          <select
            aria-label={`Status for ${bus.plate_number}`}
            value={bus.status}
            onChange={(event) =>
              handleQuickStatusChange(bus, event.target.value as Bus['status'])
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
            onClick={() => setDeleting(bus)}
            aria-label={`Remove ${bus.plate_number}`}
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
            Coach Fleet &amp; Vehicle Inventory
          </h1>
          <p className="text-xs text-muted">
            Real-time management of intercity luxury coaches, workshop maintenance tracking, seating capacity, and dispatch inspection readiness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<FileSpreadsheetIcon className="h-4 w-4" />}
            onClick={handleExportCsv}
          >
            Export Fleet CSV
          </Button>
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setAddOpen(true)}
          >
            + Register New Coach
          </Button>
        </div>
      </div>

      {/* ── Fleet Health Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active in Service */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Active in Service
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-emerald-950 dark:text-emerald-100 tabular-nums">
            {metrics.activeCount} Coaches
          </p>
          <p className="text-[0.6875rem] text-emerald-800 dark:text-emerald-300">
            Ready for corridor departure dispatch
          </p>
        </div>

        {/* In Workshop / Maintenance */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <WrenchIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">In Maintenance</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.workshopCount} Vehicles
          </p>
          <p className="text-[0.6875rem] text-muted">
            Under mechanical or safety overhaul
          </p>
        </div>

        {/* Total Fleet Seating Capacity */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UsersIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Active Seat Capacity</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.totalCapacity.toLocaleString()} Seats
          </p>
          <p className="text-[0.6875rem] text-muted">
            Combined capacity across active fleet
          </p>
        </div>

        {/* Executive / VIP Units */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CrownIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Luxury Units</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.vipCount} Executive/Sleeper
          </p>
          <p className="text-[0.6875rem] text-muted">
            Premium long-haul comfort coaches
          </p>
        </div>
      </div>

      {/* ── Coaches Data Table ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search plate number, chassis model, workshop notes..."
          filters={[
            {
              key: 'bus_type',
              label: 'All cabin classes',
              options: typeOptions,
            },
            {
              key: 'status',
              label: 'All fleet statuses',
              options: statusOptions,
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />
        <DataTable<Bus>
          columns={columns}
          rows={state.rows}
          rowKey={(bus) => bus.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="Coach Fleet"
          empty={
            <EmptyState
              icon={<BusIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0
                  ? 'No coaches match those filters'
                  : 'No buses registered yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or class filter.'
                  : 'Register a bus to make it available for corridor departure scheduling.'
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
        <Pagination meta={state.meta} onPageChange={state.setPage} onPerPageChange={state.setPerPage} label="coaches" />
      </Panel>

      {/* ── Register New Coach Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Register New Coach into Fleet"
        subtitle="Add a passenger vehicle to the LinkBus operating inventory"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" form="add-bus-form" loading={adding}>
              Register Coach
            </Button>
          </>
        }
      >
        <form id="add-bus-form" onSubmit={submitAddBus} noValidate className="space-y-4">
          <TextField
            id="bus-plate"
            label="Vehicle Registration (Plate Number)"
            required
            placeholder="e.g. UBG 480K"
            value={addForm.plate_number}
            error={addErrors.plate_number}
            onChange={(e) => setAddForm({ ...addForm, plate_number: e.target.value })}
          />

          <TextField
            id="bus-model"
            label="Coach Chassis &amp; Model"
            required
            placeholder="e.g. Scania Irizar i6 or Yutong ZK6122"
            value={addForm.model}
            error={addErrors.model}
            onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="bus-type"
              label="Cabin Configuration"
              value={addForm.bus_type}
              options={typeOptions}
              onChange={(e) => setAddForm({ ...addForm, bus_type: e.target.value as Bus['bus_type'] })}
            />
            <TextField
              id="bus-capacity"
              label="Passenger Seat Capacity"
              type="number"
              min={8}
              max={70}
              required
              value={addForm.capacity}
              error={addErrors.capacity}
              hint="Standard configuration uses 44 - 60 seats."
              onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })}
            />
          </div>

          <SelectField
            id="bus-status"
            label="Initial Operational Status"
            value={addForm.status}
            options={statusOptions}
            onChange={(e) => setAddForm({ ...addForm, status: e.target.value as Bus['status'] })}
          />

          <TextAreaField
            id="bus-notes"
            label="Workshop History &amp; Vehicle Features (Optional)"
            placeholder="e.g. Equipped with high-speed 4G Wi-Fi, USB charging ports, AC overhaul done Aug 2026"
            value={addForm.notes}
            onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* ── Edit Coach Modal ── */}
      <Modal
        open={Boolean(editingBus)}
        onClose={() => setEditingBus(null)}
        title="Edit Coach Details"
        subtitle={editingBus ? `Registration: ${editingBus.plate_number} (Fleet Unit #${editingBus.id})` : undefined}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingBus(null)} disabled={editPending}>
              Cancel
            </Button>
            <Button type="submit" form="edit-bus-form" loading={editPending}>
              Save Changes
            </Button>
          </>
        }
      >
        <form id="edit-bus-form" onSubmit={submitEditBus} noValidate className="space-y-4">
          <TextField
            id="edit-bus-plate"
            label="Vehicle Registration Plate"
            required
            value={editForm.plate_number}
            error={editErrors.plate_number}
            onChange={(e) => setEditForm({ ...editForm, plate_number: e.target.value })}
          />

          <TextField
            id="edit-bus-model"
            label="Coach Chassis &amp; Model"
            required
            value={editForm.model}
            error={editErrors.model}
            onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="edit-bus-type"
              label="Cabin Configuration"
              value={editForm.bus_type}
              options={typeOptions}
              onChange={(e) => setEditForm({ ...editForm, bus_type: e.target.value as Bus['bus_type'] })}
            />
            <TextField
              id="edit-bus-capacity"
              label="Seat Capacity"
              type="number"
              min={8}
              max={70}
              required
              value={editForm.capacity}
              error={editErrors.capacity}
              onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
            />
          </div>

          <SelectField
            id="edit-bus-status"
            label="Operational Status"
            value={editForm.status}
            options={statusOptions}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Bus['status'] })}
          />

          <TextAreaField
            id="edit-bus-notes"
            label="Workshop History &amp; Vehicle Features"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* ── Seat Map & Inspection Preview Modal ── */}
      <Modal
        open={Boolean(previewBus)}
        onClose={() => setPreviewBus(null)}
        title="Coach Cabin &amp; Seat Layout Preview"
        subtitle={previewBus ? `${previewBus.plate_number} · ${previewBus.model} (${previewBus.capacity} Seats)` : undefined}
        size="md"
        footer={
          <Button variant="outline" onClick={() => setPreviewBus(null)}>
            Close Preview
          </Button>
        }
      >
        {previewBus && (
          <div className="space-y-4">
            {/* Bus Summary Banner */}
            <div className="rounded-xl border border-line bg-surface-2 p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-extrabold text-sm text-fg block">{previewBus.plate_number}</span>
                <span className="text-muted">{previewBus.model}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-fg block">{previewBus.capacity} Total Seats</span>
                <span className="text-muted">{Math.ceil(previewBus.capacity / 4)} Rows (2x2 Layout)</span>
              </div>
            </div>

            {/* Seat Map Visualization */}
            <div className="rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-4 text-center space-y-3">
              {/* Driver Cabin */}
              <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2 px-3 text-xs font-bold text-muted">
                <span>🚪 Passenger Entry Door</span>
                <span className="flex items-center gap-1 text-fg font-black">
                  🧑‍✈️ Driver Cockpit
                </span>
              </div>

              {/* Rows */}
              <div className="space-y-2 max-h-72 overflow-y-auto thin-scroll p-1">
                {Array.from({ length: Math.ceil(previewBus.capacity / 4) }).map((_, rowIndex) => {
                  const isVipRow = rowIndex < 2 || previewBus.bus_type === 'vip';
                  const rowNumber = rowIndex + 1;

                  return (
                    <div key={rowNumber} className="flex items-center justify-between gap-3 text-xs">
                      {/* Left Seats (A & B) */}
                      <div className="flex gap-1.5 flex-1 justify-end">
                        <span className={`w-9 h-8 rounded-lg flex items-center justify-center font-bold text-[0.6875rem] border shadow-xs ${
                          isVipRow
                            ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40'
                            : 'bg-surface text-fg border-line'
                        }`}>
                          {rowNumber}A
                        </span>
                        <span className={`w-9 h-8 rounded-lg flex items-center justify-center font-bold text-[0.6875rem] border shadow-xs ${
                          isVipRow
                            ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40'
                            : 'bg-surface text-fg border-line'
                        }`}>
                          {rowNumber}B
                        </span>
                      </div>

                      {/* Aisle */}
                      <span className="text-[0.625rem] font-mono text-muted w-6">
                        {rowNumber}
                      </span>

                      {/* Right Seats (C & D) */}
                      <div className="flex gap-1.5 flex-1 justify-start">
                        <span className={`w-9 h-8 rounded-lg flex items-center justify-center font-bold text-[0.6875rem] border shadow-xs ${
                          isVipRow
                            ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40'
                            : 'bg-surface text-fg border-line'
                        }`}>
                          {rowNumber}C
                        </span>
                        <span className={`w-9 h-8 rounded-lg flex items-center justify-center font-bold text-[0.6875rem] border shadow-xs ${
                          isVipRow
                            ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40'
                            : 'bg-surface text-fg border-line'
                        }`}>
                          {rowNumber}D
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-300 dark:border-slate-700 text-[0.6875rem]">
                <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold">
                  <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500" />
                  VIP Front Row
                </span>
                <span className="flex items-center gap-1.5 text-muted font-semibold">
                  <span className="w-3 h-3 rounded bg-surface border border-line" />
                  Standard Coach Seat
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Decommission / Delete Dialog ── */}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Decommission this coach from fleet?"
        consequence={
          deleting
            ? `Coach ${deleting.plate_number} (${deleting.model}) will be permanently removed from active operating inventory. Existing completed trips will preserve history.`
            : ''
        }
        confirmLabel="Decommission Vehicle"
        pending={deletePending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}