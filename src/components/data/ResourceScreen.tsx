import React, { useState } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { usePaginated } from '../../hooks/usePaginated';
import type { Paginated } from '../../types/api';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DateInput } from '../ui/Inputs';
import { Panel } from '../ui/Panel';
import { EmptyState } from '../ui/States';
import { DataTable, type Column } from './DataTable';
import { Pagination } from './Pagination';
import { ResourceModal, type FieldConfig, type FieldValue } from './ResourceModal';
import { Toolbar, type FilterConfig } from './Toolbar';
import { toDateInput } from '../../utils/format';

const pastPresets = [
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

const futurePresets = [
  { label: 'Today', days: 1 },
  { label: 'Next 7 days', days: 7 },
  { label: 'Next 30 days', days: 30 },
  { label: 'Next 90 days', days: 90 },
];

function shiftPastDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return toDateInput(date);
}

function shiftFutureDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + (days - 1));
  return toDateInput(date);
}

export interface ResourceScreenProps<T extends { id: number }> {
  title: string;
  subtitle: string;
  singular: string;
  plural: string;
  columns: Column<T>[];
  fields: FieldConfig[];
  filters?: FilterConfig[];
  searchPlaceholder: string;
  emptyTitle: string;
  emptyBody: string;
  load: (args: { page: number; perPage: number; search: string; filters: Record<string, string> }) => Promise<Paginated<T>>;
  toFormValues: (row: T | null) => Record<string, FieldValue>;
  onCreate?: (values: Record<string, FieldValue>) => Promise<void>;
  onUpdate?: (row: T, values: Record<string, FieldValue>) => Promise<void>;
  onDelete?: (row: T) => Promise<void>;
  deleteConsequence?: (row: T) => string;
  extraActions?: (row: T) => React.ReactNode;
  headerActions?: React.ReactNode;
  perPage?: number;
  withDateRange?: boolean;
  dateRangeDirection?: 'past' | 'future';
  renderCards?: (metrics: { rows: T[]; meta: { total: number; current_page: number; last_page: number } }) => React.ReactNode;
  mobileCardRender?: (row: T) => React.ReactNode;
  renderModal?: (props: {
    open: boolean;
    mode: 'create' | 'edit';
    row: T | null;
    onClose: () => void;
    onSaved: () => void;
  }) => React.ReactNode;
}

export function ResourceScreen<T extends { id: number }>({
  title: _title,
  subtitle,
  singular,
  plural,
  columns,
  fields,
  filters,
  searchPlaceholder,
  emptyTitle,
  emptyBody,
  load,
  toFormValues,
  onCreate,
  onUpdate,
  onDelete,
  deleteConsequence,
  extraActions,
  headerActions,
  perPage = 10,
  withDateRange = false,
  dateRangeDirection = 'past',
  renderCards,
  mobileCardRender,
  renderModal,
}: ResourceScreenProps<T>) {
  const isFuture = dateRangeDirection === 'future';
  const presets = isFuture ? futurePresets : pastPresets;

  const [range, setRange] = useState(() => ({
    date_from: isFuture ? toDateInput(new Date()) : shiftPastDays(30),
    date_to: isFuture ? shiftFutureDays(30) : toDateInput(new Date()),
  }));
  const [applied, setApplied] = useState(range);

  const state = usePaginated<T>(
    (args) =>
      load({
        ...args,
        filters: {
          ...args.filters,
          ...(withDateRange
            ? { date_from: applied.date_from, date_to: applied.date_to }
            : {}),
        },
      }),
    { perPage }
  );

  React.useEffect(() => {
    if (withDateRange) {
      state.reload();
    }
  }, [applied.date_from, applied.date_to]);
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const allColumns: Column<T>[] = [
    ...columns,
    ...(onUpdate || onDelete || extraActions
      ? [
          {
            key: '__actions',
            header: '',
            width: '4.5rem',
            align: 'right' as const,
            render: (row: T) => (
              <div className="flex items-center justify-end gap-1">
                {extraActions?.(row)}
                {onUpdate && (
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    aria-label={`Edit ${singular}`}
                    className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
                  >
                    <PencilIcon className="h-4 w-4" aria-hidden />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleting(row)}
                    aria-label={`Delete ${singular}`}
                    className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-red-500/12 hover:text-red-600"
                  >
                    <Trash2Icon className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const confirmDelete = async () => {
    if (!deleting || !onDelete) return;
    setDeletePending(true);
    try {
      await onDelete(deleting);
      toast.success(`${singular} deleted`);
      setDeleting(null);
      state.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'That could not be deleted.');
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p className="max-w-2xl text-[0.8125rem] leading-5 text-muted">{subtitle}</p>
        <div className="flex items-center gap-2">
          {headerActions}
          {onCreate && (
            <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreating(true)}>
              New {singular.toLowerCase()}
            </Button>
          )}
        </div>
      </div>

      {withDateRange && (
        <div className="rounded-2xl border border-line bg-surface p-3.5 sm:p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Preset Segment Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted hidden sm:inline-block">
                Presets:
              </span>
              {presets.map((preset) => {
                const targetFrom = isFuture
                  ? toDateInput(new Date())
                  : shiftPastDays(preset.days);
                const targetTo = isFuture
                  ? preset.days === 1
                    ? toDateInput(new Date())
                    : shiftFutureDays(preset.days)
                  : toDateInput(new Date());

                const active =
                  applied.date_from === targetFrom && applied.date_to === targetTo;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const next = {
                        date_from: targetFrom,
                        date_to: targetTo,
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
                  id="resource-from"
                  value={range.date_from}
                  max={range.date_to}
                  onChange={(e) => setRange({ ...range, date_from: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted">To</span>
                <DateInput
                  id="resource-to"
                  value={range.date_to}
                  min={range.date_from}
                  max={isFuture ? undefined : toDateInput(new Date())}
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
      )}

      {renderCards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {renderCards({ rows: state.rows, meta: state.meta })}
        </div>
      )}

      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder={searchPlaceholder}
          searching={state.searching}
          filters={filters}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />
        <DataTable<T>
          columns={allColumns}
          rows={state.rows}
          rowKey={(row) => row.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption={plural}
          mobileCardRender={mobileCardRender}
          empty={
            <EmptyState
              title={state.activeFilterCount > 0 ? `No ${plural.toLowerCase()} match those filters` : emptyTitle}
              body={
                state.activeFilterCount > 0
                  ? 'Try a different search term or clear the filters to see everything.'
                  : emptyBody
              }
              action={
                state.activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={state.clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  onCreate && (
                    <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setCreating(true)}>
                      New {singular.toLowerCase()}
                    </Button>
                  )
                )
              }
            />
          }
        />
        <Pagination meta={state.meta} onPageChange={state.setPage} label={plural.toLowerCase()} />
      </Panel>

      {renderModal ? (
        renderModal({
          open: creating || Boolean(editing),
          mode: editing ? 'edit' : 'create',
          row: editing,
          onClose: () => {
            setCreating(false);
            setEditing(null);
          },
          onSaved: () => {
            setCreating(false);
            setEditing(null);
            state.reload();
          },
        })
      ) : (
        <>
          {onCreate && (
            <ResourceModal
              open={creating}
              title={`New ${singular.toLowerCase()}`}
              fields={fields}
              values={toFormValues(null)}
              submitLabel={`Create ${singular.toLowerCase()}`}
              onClose={() => setCreating(false)}
              onSubmit={async (values) => {
                await onCreate(values);
                toast.success(`${singular} created`);
                state.reload();
              }}
            />
          )}

          {onUpdate && (
            <ResourceModal
              open={Boolean(editing)}
              title={`Edit ${singular.toLowerCase()}`}
              fields={fields}
              values={toFormValues(editing)}
              submitLabel="Save changes"
              onClose={() => setEditing(null)}
              onSubmit={async (values) => {
                if (!editing) return;
                await onUpdate(editing, values);
                toast.success(`${singular} updated`);
                state.reload();
              }}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete this ${singular.toLowerCase()}?`}
        consequence={
          deleting && deleteConsequence
            ? deleteConsequence(deleting)
            : `This removes the ${singular.toLowerCase()} permanently. Records already linked to it stay in place.`
        }
        confirmLabel="Delete"
        pending={deletePending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}