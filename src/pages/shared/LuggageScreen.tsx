import React, { useMemo, useState } from 'react';
import {
  AlertTriangleIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  LuggageIcon,
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
import { useSettings } from '../../contexts/SettingsContext';
import { errorMessage } from '../../hooks/useAsync';
import { usePaginated } from '../../hooks/usePaginated';
import {
  createLuggage,
  deleteLuggage,
  findLuggageByBooking,
  listLuggage,
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
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

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
                +{money(excess * (settings.excess_luggage_fee_per_kg || 1000))} Excess
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
    const checkedIn = rows.filter((l) => l.status === 'checked_in');
    const inTransit = rows.filter((l) => l.status === 'in_transit');
    const delivered = rows.filter((l) => l.status === 'delivered');

    return {
      totalCount,
      checkedInCount: checkedIn.length,
      inTransitCount: inTransit.length,
      deliveredCount: delivered.length,
    };
  }, [state.rows, state.meta.total]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Luggage &amp; Baggage Handling
          </h1>
          <p className="text-xs text-muted">
            Live scale tagging, excess allowance billing, coach bay tracking, and passenger baggage claim.
          </p>
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

      {/* ── Luggage KPI Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <LuggageIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Total Luggage</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.totalCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">All Tagged Baggage</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TagIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Checked In</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.checkedInCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">Tagged at Scale Counter</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BriefcaseIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">In Coach Bay</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.inTransitCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">Loaded on Active Buses</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Claimed &amp; Delivered</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.deliveredCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">Delivered to Passenger</p>
        </div>
      </div>

      {/* ── Fast Booking Lookup Counter Bar (Available to Staff & Admin) ── */}
      <Panel
        title="Luggage Scale & Barcode Tagging Desk"
        subtitle={`Lookup passenger booking to print adhesive barcode tags. Up to ${settings.free_luggage_kg || 20}kg free allowance per ticket; excess is billed at ${money(settings.excess_luggage_fee_per_kg || 1000)} per kg.`}
      >
        <form onSubmit={search} className="flex flex-wrap gap-3">
          <div className="relative min-w-[16rem] flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600"
              aria-hidden
            />
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value.toUpperCase())}
              placeholder="Scan QR or type Booking # e.g. LB-260813-0042"
              aria-label="Booking reference"
              className="field field-has-icon font-mono font-bold tracking-wider text-fg"
            />
          </div>
          <Button type="submit" loading={looking} disabled={!reference.trim()}>
            Lookup Booking
          </Button>
        </form>

        {lookupError && (
          <div className="mt-4">
            <InlineError message={lookupError} />
          </div>
        )}

        {lookup && (
          <div className="mt-5 rounded-2xl border border-brand-500/30 bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-brand-600">
                  Verified Passenger Booking
                </span>
                <p className="text-base font-extrabold text-fg">
                  {lookup.booking_number} · {lookup.passenger_name}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {lookup.route} · Departure {formatDateTime(lookup.departure_time)}
                </p>
              </div>
              <Button
                size="sm"
                icon={<PlusIcon className="h-4 w-4" />}
                onClick={() => setAddOpen(true)}
              >
                Weigh & Tag New Bag
              </Button>
            </div>

            {lookup.items.length === 0 ? (
              <p className="mt-4 text-xs text-muted">
                No bags tagged for this passenger yet. Click &quot;Weigh &amp; Tag New Bag&quot; to issue a baggage barcode.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {lookup.items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-fg bg-surface-2 px-2 py-0.5 rounded border border-line">
                        {item.tag_number}
                      </span>
                      <span className="ml-2 font-medium text-fg">{item.description}</span>
                      <span className="ml-2 font-bold text-brand-600">({item.weight_kg} kg)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={item.status} />
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<PrinterIcon className="h-3.5 w-3.5" />}
                        onClick={() => setTag(item)}
                      >
                        Print Bag Tag
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Panel>

      {/* ── Tagged Luggage Register Table ── */}
      <Panel
        title={mode === 'staff' ? 'All Tagged Baggage in Transit' : 'Luggage & Cargo Network Register'}
        subtitle="Live tracking of passenger bags, baggage bay weights, and excess fee settlements"
        bodyClassName=""
      >
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search tag number, booking reference, passenger or corridor…"
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
          caption="Luggage"
          empty={
            <EmptyState
              icon={<BriefcaseIcon className="h-6 w-6 text-brand-600" aria-hidden />}
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
        <Pagination meta={state.meta} onPageChange={state.setPage} label="luggage pieces" />
      </Panel>

      {/* ── Add Bag Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Weigh & Tag Passenger Luggage"
        subtitle={lookup ? `Booking #${lookup.booking_number} · ${lookup.passenger_name}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" form="luggage-form" loading={adding}>
              Generate Tag & Calculate Fee
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
                    { value: 'cash', label: 'Station Counter Cash (Default)' },
                    { value: 'mtn_mobile_money', label: 'MTN Mobile Money' },
                    { value: 'airtel_money', label: 'Airtel Money' },
                    { value: 'card', label: 'Visa / POS Terminal Card' },
                  ]}
                />
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
    </div>
  );
}