import React, { useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  LuggageIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  ScaleIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { LuggageTagModal } from '../../components/modals/LuggageTagModal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DateInput } from '../../components/ui/Inputs';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, InlineError } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { ShiftOpenModal } from '../../components/modals/ShiftOpenModal';
import { useSettings } from '../../contexts/SettingsContext';
import { errorMessage } from '../../hooks/useAsync';
import { usePaginated } from '../../hooks/usePaginated';
import { hasActiveShift, recordLuggageToActiveShift } from '../../services/reconciliations';
import {
  createLuggage,
  deleteLuggage,
  findLuggageByBooking,
  listLuggage,
  updateLuggage,
  updateLuggageStatus,
  type LuggageDetail,
} from '../../services/operations';
import type { Luggage } from '../../types/models';
import { formatDateTime, money, toDateInput } from '../../utils/format';

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
  { value: 'checked_in', label: 'Checked In / Tagged' },
  { value: 'in_transit', label: 'In Coach Luggage Bay' },
  { value: 'delivered', label: 'Claimed & Delivered' },
  { value: 'lost', label: 'Lost / Unclaimed' },
];

interface BookingLookup {
  booking_number: string;
  booking_id: number;
  passenger_name: string;
  route: string;
  departure_time: string;
  items: LuggageDetail[];
}

export function LuggageScreen({
  mode = 'admin' as 'admin' | 'staff',
}: {
  mode?: 'admin' | 'staff';
}) {
  const { settings } = useSettings();
  const [tag, setTag] = useState<LuggageDetail | null>(null);
  const [deleting, setDeleting] = useState<LuggageDetail | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [reference, setReference] = useState('');
  const [lookup, setLookup] = useState<BookingLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    description: '',
    weight_kg: '',
    payment_method: 'cash',
    notes: '',
  });
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // Edit Luggage State
  const [editingItem, setEditingItem] = useState<LuggageDetail | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    weight_kg: '',
    status: 'checked_in' as Luggage['status'],
    notes: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editPending, setEditPending] = useState(false);

  const [range, setRange] = useState({
    date_from: shiftDays(30),
    date_to: toDateInput(new Date()),
  });
  const [applied, setApplied] = useState(range);

  const state = usePaginated<LuggageDetail>(({ page, perPage, search, filters }) =>
    listLuggage({
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

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    setLooking(true);
    setLookupError(null);
    try {
      const result = await findLuggageByBooking(reference);
      setLookup(result);
    } catch (error) {
      setLookup(null);
      setLookupError(errorMessage(error));
    } finally {
      setLooking(false);
    }
  };

  const refreshLookup = async () => {
    if (!lookup) return;
    const result = await findLuggageByBooking(lookup.booking_number).catch(() => null);
    if (result) setLookup(result);
  };

  const submitLuggage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lookup) return;
    const errors: Record<string, string> = {};
    if (!addForm.description.trim())
      errors.description = 'Describe the bag so it can be verified at arrival.';
    const weight = Number(addForm.weight_kg);
    if (!addForm.weight_kg || Number.isNaN(weight) || weight <= 0)
      errors.weight_kg = 'Enter verified scale weight in kilograms.';
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const freeAllowance = settings.free_luggage_kg || 20;
    const ratePerKg = settings.excess_luggage_fee_per_kg || 2000;
    const excessKg = Math.max(0, weight - freeAllowance);
    const excessFee = excessKg * ratePerKg;

    const isCash = addForm.payment_method === 'cash' || !addForm.payment_method;
    if (excessFee > 0 && isCash && !hasActiveShift()) {
      toast.error('Cash Drawer is Closed! Please open your shift float to accept cash, or choose MTN MoMo / Airtel / Card payment.');
      setOpenShiftModal(true);
      return;
    }

    setAdding(true);
    try {
      const created = await createLuggage({
        booking_id: lookup.booking_id,
        description: addForm.description,
        weight_kg: weight,
        payment_method: addForm.payment_method || 'cash',
        notes: addForm.notes,
      });
      if (excessFee > 0) {
        recordLuggageToActiveShift({
          amount: excessFee,
          payment_method: addForm.payment_method || 'cash',
        });
        toast.success(`Luggage Tag #${created.tag_number} issued. Excess fee of ${money(excessFee)} collected & added to Payments ledger.`);
      } else {
        toast.success(`Luggage Tag #${created.tag_number} issued (Within free allowance).`);
      }
      setAddOpen(false);
      setAddForm({ description: '', weight_kg: '', payment_method: 'cash', notes: '' });
      setTag(created);
      await refreshLookup();
      state.reload();
    } catch (error) {
      setAddErrors({ description: errorMessage(error) });
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (item: LuggageDetail) => {
    setEditingItem(item);
    setEditForm({
      description: item.description,
      weight_kg: String(item.weight_kg),
      status: item.status,
      notes: item.notes || '',
    });
    setEditErrors({});
  };

  const submitEditLuggage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingItem) return;
    const errors: Record<string, string> = {};
    if (!editForm.description.trim())
      errors.description = 'Piece description cannot be empty.';
    const weight = Number(editForm.weight_kg);
    if (!editForm.weight_kg || Number.isNaN(weight) || weight <= 0)
      errors.weight_kg = 'Enter verified scale weight in kilograms.';
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditPending(true);
    try {
      await updateLuggage(editingItem.id, {
        description: editForm.description.trim(),
        weight_kg: weight,
        status: editForm.status,
        notes: editForm.notes.trim(),
      });
      toast.success(`Luggage Tag #${editingItem.tag_number} updated successfully.`);
      setEditingItem(null);
      await refreshLookup();
      state.reload();
    } catch (error) {
      setEditErrors({ description: errorMessage(error) });
    } finally {
      setEditPending(false);
    }
  };

  const changeStatus = async (item: LuggageDetail, status: Luggage['status']) => {
    try {
      await updateLuggageStatus(item.id, status);
      toast.success(`${item.tag_number} status: ${status.replace('_', ' ').toUpperCase()}`);
      await refreshLookup();
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await deleteLuggage(deleting.id);
      toast.success('Luggage record deleted');
      setDeleting(null);
      await refreshLookup();
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeletePending(false);
    }
  };

  const excessOver = (weight: number) =>
    Math.max(0, weight - (settings.free_luggage_kg || 20));

  const columns: Column<LuggageDetail>[] = [
    {
      key: 'tag',
      header: 'Luggage Tag & Ref',
      render: (item) => (
        <div className="py-1">
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-fg bg-surface-2 px-2 py-0.5 rounded-md border border-line shadow-sm">
            <TagIcon className="h-3 w-3 text-brand-600" />
            {item.tag_number}
          </span>
          <p className="text-[0.6875rem] text-muted font-mono mt-0.5">
            Booking #{item.booking_number}
          </p>
        </div>
      ),
    },
    {
      key: 'passenger',
      header: 'Passenger & Seat',
      render: (item) => (
        <div>
          <p className="font-bold text-fg text-sm">{item.passenger_name}</p>
          <p className="text-xs text-muted">
            Seat <strong className="text-fg">{item.seat_number ?? '—'}</strong>
          </p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Corridor & Transit',
      hideBelow: 'md',
      render: (item) => (
        <div>
          <p className="font-bold text-fg text-xs">{item.route}</p>
          <p className="text-[0.6875rem] text-muted">{formatDateTime(item.departure_time)}</p>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Piece Description',
      hideBelow: 'lg',
      render: (item) => (
        <span className="text-xs text-fg font-medium">{item.description}</span>
      ),
    },
    {
      key: 'weight',
      header: 'Scale Weight',
      align: 'right',
      render: (item) => {
        const excess = excessOver(item.weight_kg);
        return (
          <div className="text-right">
            <p className="font-extrabold tabular-nums text-fg text-sm">
              {item.weight_kg} kg
            </p>
            {excess > 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 text-[0.625rem] font-bold text-amber-700 dark:text-amber-300">
                +{money(excess * (settings.excess_luggage_fee_per_kg || 2000))} Excess
              </span>
            ) : (
              <span className="text-[0.625rem] text-emerald-600 dark:text-emerald-400 font-semibold">
                ✓ Free Allowance
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Luggage Status',
      render: (item) => <StatusPill status={item.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PrinterIcon className="h-3.5 w-3.5" />}
            onClick={() => setTag(item)}
          >
            Tag Slip
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PencilIcon className="h-3.5 w-3.5" />}
            onClick={() => openEditModal(item)}
          >
            Edit
          </Button>

          <select
            aria-label={`Status for ${item.tag_number}`}
            value={item.status}
            onChange={(event) => changeStatus(item, event.target.value as Luggage['status'])}
            className="field !h-8 w-auto text-xs font-semibold"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {mode === 'staff' && (
            <button
              type="button"
              onClick={() => setDeleting(item)}
              aria-label={`Remove ${item.tag_number}`}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/15 hover:text-red-600"
            >
              <Trash2Icon className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      ),
    },
  ];

  const metrics = useMemo(() => {
    const rows = state.rows;
    const totalCount = state.meta.total || rows.length;
    const excessFeeTotal = rows.reduce((acc, r) => {
      const excessKg = excessOver(r.weight_kg);
      const calculated = excessKg * (settings.excess_luggage_fee_per_kg || 2000);
      const fee = r.excess_fee ?? r.price ?? (excessKg > 0 ? calculated : 0);
      return acc + (Number(fee) || 0);
    }, 0);
    const inTransitCount = rows.filter((r) => r.status === 'in_transit' || r.status === 'checked_in').length;
    const deliveredCount = rows.filter((r) => r.status === 'delivered').length;
    return {
      totalCount,
      excessFeeTotal,
      inTransitCount,
      deliveredCount,
    };
  }, [state.rows, state.meta.total, settings.excess_luggage_fee_per_kg, settings.free_luggage_kg]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          Luggage &amp; Cargo Network Register
        </h1>
        <p className="text-xs text-muted">
          Live tracking of passenger bags, baggage bay weights, and excess fee settlements.
        </p>
      </div>

      {/* ── Luggage Operational & Revenue KPI Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tagged Bags */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <LuggageIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Total Tagged Luggage</span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.totalCount} Bags
          </p>
          <p className="text-[0.6875rem] text-muted">
            All registered passenger baggage
          </p>
        </div>

        {/* Excess Luggage Surcharges */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white font-bold">
              <ScaleIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
              Excess Surcharges
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-amber-950 dark:text-amber-100 tabular-nums">
            {money(metrics.excessFeeTotal)}
          </p>
          <p className="text-[0.6875rem] text-amber-800 dark:text-amber-300">
            Overweight baggage fees collected
          </p>
        </div>

        {/* In Coach Luggage Bay */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BriefcaseIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">In Coach Cargo Bay</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.inTransitCount} Pieces
          </p>
          <p className="text-[0.6875rem] text-muted">
            Loaded on en-route coaches
          </p>
        </div>

        {/* Claimed & Retrieved */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Claimed by Passenger</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.deliveredCount} Delivered
          </p>
          <p className="text-[0.6875rem] text-muted">
            Handed over at destination terminal
          </p>
        </div>
      </div>

      {/* ── Baggage Check-in Panel ── */}
      <Panel
        title="Check-In Passenger Baggage"
        subtitle="Search passenger by booking reference or ticket number to issue luggage tags"
      >
        <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <TextField
              id="luggage-booking-ref"
              placeholder="e.g. LB-260826-64239F or TKT-0938C7"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            icon={<SearchIcon className="h-4 w-4" />}
            loading={looking}
          >
            Find Reservation
          </Button>
        </form>

        {lookupError && (
          <div className="mt-4">
            <InlineError message={lookupError} />
          </div>
        )}

        {lookup && (
          <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-4 space-y-4">
            <div className="flex flex-col justify-between gap-2 border-b border-line pb-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-extrabold text-base text-fg">{lookup.passenger_name}</p>
                <p className="text-xs text-muted">
                  Booking #{lookup.booking_number} · Route: <span className="font-semibold text-fg">{lookup.route}</span>
                </p>
              </div>
              <Button
                size="sm"
                icon={<PlusIcon className="h-4 w-4" />}
                onClick={() => setAddOpen(true)}
              >
                Add &amp; Tag New Bag
              </Button>
            </div>

            {lookup.items.length === 0 ? (
              <p className="text-xs text-muted py-2">
                No luggage tagged for this booking yet. Click <strong>"Add &amp; Tag New Bag"</strong> above.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Tagged Bags for this Reservation ({lookup.items.length}):
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {lookup.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-line bg-surface p-3 text-xs space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-fg bg-surface-2 px-1.5 py-0.5 rounded border border-line">
                          {item.tag_number}
                        </span>
                        <StatusPill status={item.status} />
                      </div>
                      <p className="font-semibold text-fg">{item.description}</p>
                      <div className="flex items-center justify-between text-muted border-t border-line pt-1.5">
                        <span>Weight: <strong className="text-fg">{item.weight_kg} kg</strong></span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="rounded p-1 text-brand-600 hover:bg-brand-500/10"
                            title="Edit Bag Details"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTag(item)}
                            className="rounded p-1 text-brand-600 hover:bg-brand-500/10"
                            title="Print Luggage Tag"
                          >
                            <PrinterIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* ── Unified Date Range Filter Toolbar ── */}
      <div className="rounded-2xl border border-line bg-surface p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">From</span>
              <DateInput
                id="luggage-from"
                value={range.date_from}
                max={range.date_to}
                onChange={(e) => setRange({ ...range, date_from: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">To</span>
              <DateInput
                id="luggage-to"
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

      {/* ── Luggage Network DataTable ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search tag number, booking reference, passenger..."
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
        <DataTable<LuggageDetail>
          columns={columns}
          rows={state.rows}
          rowKey={(item) => item.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="Luggage Pieces"
          empty={
            <EmptyState
              icon={<LuggageIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0 ? 'No bags match those filters' : 'No luggage tagged yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or status filter.'
                  : 'Bags appear here as soon as they are weighed and tagged at a terminal counter.'
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
        <Pagination meta={state.meta} onPageChange={state.setPage} onPerPageChange={state.setPerPage} label="luggage pieces" />
      </Panel>

      {/* ── Add Bag Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Weigh &amp; Tag Passenger Luggage"
        subtitle={lookup ? `Booking #${lookup.booking_number} · ${lookup.passenger_name}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" form="luggage-form" loading={adding}>
              Generate Tag &amp; Calculate Fee
            </Button>
          </>
        }
      >
        <form id="luggage-form" onSubmit={submitLuggage} noValidate className="space-y-4">
          <TextField
            id="luggage-description"
            label="Piece Description"
            required
            placeholder="e.g. Large Black Suitcase with Red Strap"
            value={addForm.description}
            error={addErrors.description}
            onChange={(event) =>
              setAddForm({ ...addForm, description: event.target.value })
            }
          />
          <TextField
            id="luggage-weight"
            label="Scale Weight (kg)"
            type="number"
            step="0.1"
            min={0}
            required
            placeholder="e.g. 24.5"
            value={addForm.weight_kg}
            error={addErrors.weight_kg}
            hint={`Free allowance: ${settings.free_luggage_kg || 20}kg. Excess weight is automatically charged at ${money(settings.excess_luggage_fee_per_kg || 2000)} per kg.`}
            onChange={(event) =>
              setAddForm({ ...addForm, weight_kg: event.target.value })
            }
          />

          {/* Live Excess Baggage Tariff Breakdown */}
          {(() => {
            const enteredWeight = Number(addForm.weight_kg);
            const freeAllowance = settings.free_luggage_kg || 20;
            const ratePerKg = settings.excess_luggage_fee_per_kg || 2000;
            const excessKg = !Number.isNaN(enteredWeight) && enteredWeight > freeAllowance ? enteredWeight - freeAllowance : 0;
            const excessFee = Math.round(excessKg * ratePerKg);

            if (excessFee <= 0) return null;

            const isCash = addForm.payment_method === 'cash' || !addForm.payment_method;
            const isShiftOpen = hasActiveShift();

            return (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-3">
                <div className="flex items-center justify-between text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Excess Baggage Detected:</span>
                  <span className="font-bold">+{excessKg.toFixed(1)} kg @ {money(ratePerKg)}/kg</span>
                </div>
                <div className="flex items-center justify-between border-t border-amber-500/20 pt-2 font-black text-sm text-fg">
                  <span>Excess Fee to Collect:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{money(excessFee)}</span>
                </div>
                <p className="text-[0.6875rem] text-muted">
                  ✓ This collection will automatically generate a completed transaction in <strong>Payments</strong> and increment total revenue.
                </p>
                <SelectField
                  id="luggage-payment-method"
                  label="Fee Payment Method"
                  value={addForm.payment_method}
                  onChange={(event) =>
                    setAddForm({ ...addForm, payment_method: event.target.value })
                  }
                  options={[
                    { value: 'cash', label: 'Station Counter Cash (Till)' },
                    { value: 'mtn_mobile_money', label: 'MTN Mobile Money (Direct Gateway)' },
                    { value: 'airtel_money', label: 'Airtel Money (Direct Gateway)' },
                    { value: 'card', label: 'Visa / POS Terminal Card (Electronic)' },
                  ]}
                />

                {isCash && !isShiftOpen ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold">🔒 Cash shift is closed:</span>
                      <span>Open float or select Mobile Money / Card above.</span>
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      className="text-xs bg-surface text-rose-700 dark:text-rose-300 border-rose-300 shrink-0 font-bold"
                      onClick={() => setOpenShiftModal(true)}
                    >
                      Open Float Now
                    </Button>
                  </div>
                ) : !isCash ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs">
                    <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>Digital Settlement:</strong> Passenger can pay electronically even if the physical till is closed.</span>
                  </div>
                ) : null}
              </div>
            );
          })()}

          <TextAreaField
            id="luggage-notes"
            label="Special Handling / Fragile Notes (Optional)"
            placeholder="e.g. Fragile glass items inside, load on top of cargo bay"
            value={addForm.notes}
            onChange={(event) =>
              setAddForm({ ...addForm, notes: event.target.value })
            }
          />
        </form>
      </Modal>

      {/* ── Edit Bag Modal ── */}
      <Modal
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Edit Baggage Record"
        subtitle={editingItem ? `Tag #${editingItem.tag_number} · Booking #${editingItem.booking_number} (${editingItem.passenger_name})` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingItem(null)} disabled={editPending}>
              Cancel
            </Button>
            <Button type="submit" form="edit-luggage-form" loading={editPending}>
              Save &amp; Update Record
            </Button>
          </>
        }
      >
        <form id="edit-luggage-form" onSubmit={submitEditLuggage} noValidate className="space-y-4">
          <TextField
            id="edit-luggage-description"
            label="Piece Description"
            required
            placeholder="e.g. Large Black Suitcase with Red Strap"
            value={editForm.description}
            error={editErrors.description}
            onChange={(event) =>
              setEditForm({ ...editForm, description: event.target.value })
            }
          />
          <TextField
            id="edit-luggage-weight"
            label="Scale Weight (kg)"
            type="number"
            step="0.1"
            min={0}
            required
            placeholder="e.g. 24.5"
            value={editForm.weight_kg}
            error={editErrors.weight_kg}
            hint={`Free allowance: ${settings.free_luggage_kg || 20}kg. Excess weight tariff: ${money(settings.excess_luggage_fee_per_kg || 2000)} per kg.`}
            onChange={(event) =>
              setEditForm({ ...editForm, weight_kg: event.target.value })
            }
          />

          {/* Live Excess Baggage Tariff Calculation */}
          {(() => {
            const enteredWeight = Number(editForm.weight_kg);
            const freeAllowance = settings.free_luggage_kg || 20;
            const ratePerKg = settings.excess_luggage_fee_per_kg || 2000;
            const excessKg = !Number.isNaN(enteredWeight) && enteredWeight > freeAllowance ? enteredWeight - freeAllowance : 0;
            const excessFee = Math.round(excessKg * ratePerKg);

            return (
              <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-fg">
                  <span>Calculated Excess Tariff:</span>
                  {excessFee > 0 ? (
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      +{excessKg.toFixed(1)} kg excess ({money(excessFee)})
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Within {freeAllowance}kg Free Allowance
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          <SelectField
            id="edit-luggage-status"
            label="Luggage Handling Status"
            value={editForm.status}
            onChange={(event) =>
              setEditForm({ ...editForm, status: event.target.value as Luggage['status'] })
            }
            options={statusOptions}
          />

          <TextAreaField
            id="edit-luggage-notes"
            label="Handling &amp; Baggage Bay Notes"
            placeholder="e.g. Loaded in Bay 2, fragile contents"
            value={editForm.notes}
            onChange={(event) =>
              setEditForm({ ...editForm, notes: event.target.value })
            }
          />
        </form>
      </Modal>

      <LuggageTagModal item={tag} open={Boolean(tag)} onClose={() => setTag(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this luggage tag?"
        consequence={
          deleting
            ? `Tag #${deleting.tag_number} will be permanently removed. If the bag is still travelling, print a replacement tag.`
            : ''
        }
        confirmLabel="Delete Record"
        pending={deletePending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      <ShiftOpenModal
        open={openShiftModal}
        onClose={() => setOpenShiftModal(false)}
        onSuccess={() => {
          setOpenShiftModal(false);
          toast.success('Duty shift float opened successfully.');
        }}
      />
    </div>
  );
}