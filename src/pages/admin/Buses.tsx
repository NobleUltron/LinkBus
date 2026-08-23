import React from 'react';
import { BusIcon, CheckCircle2Icon, UsersIcon, WrenchIcon } from 'lucide-react';
import type { Column } from '../../components/data/DataTable';
import type { FieldConfig, FieldValue } from '../../components/data/ResourceModal';
import { ResourceScreen } from '../../components/data/ResourceScreen';
import { StatusPill } from '../../components/ui/StatusPill';
import { busesApi } from '../../services/crud';
import type { Bus } from '../../types/models';
import { titleCase } from '../../utils/format';

const typeOptions = [
  { value: 'standard', label: 'Standard Coach' },
  { value: 'vip', label: 'VIP Executive' },
  { value: 'sleeper', label: 'Overnight Sleeper' },
];

const statusOptions = [
  { value: 'active', label: 'Active in Service' },
  { value: 'maintenance', label: 'In Maintenance / Workshop' },
  { value: 'retired', label: 'Retired / Decommissioned' },
];

export function Buses() {
  const columns: Column<Bus>[] = [
    {
      key: 'plate',
      header: 'Coach & Registration',
      render: (bus) => (
        <div className="py-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs font-bold text-fg tracking-wide shadow-sm">
              {bus.plate_number}
            </span>
            <span className="font-bold text-fg text-sm">{bus.model}</span>
          </div>
          <p className="text-[0.6875rem] text-muted mt-0.5">
            LinkBus Fleet Unit #{bus.id}
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
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isVip
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : isSleeper
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                  : 'bg-surface-2 text-fg border border-line'
              }`}
            >
              {isVip ? '👑 VIP Executive' : isSleeper ? '🛌 Sleeper Berths' : '🚌 Standard Coach'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'capacity',
      header: 'Passenger Capacity',
      align: 'left',
      render: (bus) => (
        <div>
          <span className="tabular-nums font-bold text-fg text-sm">
            {bus.capacity} Seats
          </span>
          <span className="block text-[0.6875rem] text-muted">
            {Math.ceil(bus.capacity / 4)} Rows (2x2 Layout)
          </span>
        </div>
      ),
    },
    {
      key: 'layout',
      header: 'VIP Front Allocation',
      hideBelow: 'lg',
      render: (bus) => (
        <span className="text-xs text-muted font-medium">
          {bus.bus_type === 'vip'
            ? 'All VIP Reclining Leather'
            : bus.bus_type === 'sleeper'
            ? 'Full Horizontal Berths'
            : '2 Front Rows (8 VIP seats)'}
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
      header: 'Workshop / Specs Notes',
      hideBelow: 'xl',
      render: (bus) => (
        <span className="text-xs text-muted max-w-[200px] truncate block">
          {bus.notes || '—'}
        </span>
      ),
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'plate_number',
      label: 'Vehicle Registration (Plate Number)',
      required: true,
      placeholder: 'e.g. UBG 480K',
      hint: 'Ugandan national vehicle registration number.',
    },
    {
      name: 'model',
      label: 'Coach Chassis & Model',
      required: true,
      placeholder: 'e.g. Scania Irizar i6 or Yutong ZK6122',
    },
    {
      name: 'bus_type',
      label: 'Cabin Configuration',
      type: 'select',
      options: typeOptions,
      required: true,
    },
    {
      name: 'capacity',
      label: 'Total Passenger Seat Capacity',
      type: 'number',
      min: 8,
      max: 70,
      required: true,
      hint: 'Seat maps are dynamically rendered using a 4-seat row configuration with front VIP rows.',
    },
    {
      name: 'status',
      label: 'Fleet Operational Status',
      type: 'select',
      options: statusOptions,
      required: true,
      hint: 'Coaches marked as "In Maintenance" or "Retired" cannot be assigned to scheduled departures.',
    },
    {
      name: 'notes',
      label: 'Maintenance History & Vehicle Features',
      type: 'textarea',
      span: 2,
    },
  ];

  const toPayload = (values: Record<string, FieldValue>) => ({
    plate_number: String(values.plate_number),
    model: String(values.model),
    bus_type: String(values.bus_type) as Bus['bus_type'],
    capacity: Number(values.capacity),
    status: String(values.status) as Bus['status'],
    notes: String(values.notes ?? ''),
  });

  return (
    <ResourceScreen<Bus>
      title="Coach Fleet & Vehicles"
      subtitle="Manage registered intercity coaches, monitor workshop maintenance status, configure passenger cabin configurations, and verify seating capacities."
      singular="Bus"
      plural="Buses"
      searchPlaceholder="Search plate number, model or notes…"
      emptyTitle="No buses registered"
      emptyBody="Add a bus to make it available for scheduling on departures."
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'bus_type',
          label: 'Any cabin class',
          options: typeOptions,
          icon: <BusIcon className="h-4 w-4" aria-hidden />,
        },
        {
          key: 'status',
          label: 'Any fleet status',
          options: statusOptions,
        },
      ]}
      load={({ page, perPage, search, filters }) =>
        busesApi.list({
          page,
          perPage,
          search,
          filters,
        })
      }
      renderCards={({ rows, meta }) => {
        const totalCount = meta.total || rows.length;
        const active = rows.filter((b) => b.status === 'active');
        const maintenance = rows.filter((b) => b.status === 'maintenance');
        const totalSeats = rows.reduce((sum, b) => sum + (Number(b.capacity) || 0), 0);

        return (
          <>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BusIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Total Fleet</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {totalCount.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Registered Coach Units</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Active on Road</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {active.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Ready for Trip Scheduling</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <WrenchIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">In Workshop</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {maintenance.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Under Maintenance / Service</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <UsersIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Fleet Seat Capacity</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {totalSeats.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Total Passenger Seats Available</p>
            </div>
          </>
        );
      }}
      toFormValues={(bus) => ({
        plate_number: bus?.plate_number ?? '',
        model: bus?.model ?? '',
        bus_type: bus?.bus_type ?? 'standard',
        capacity: bus?.capacity ?? 44,
        status: bus?.status ?? 'active',
        notes: bus?.notes ?? '',
      })}
      onCreate={async (values) => {
        await busesApi.create(toPayload(values));
      }}
      onUpdate={async (bus, values) => {
        await busesApi.update(bus.id, toPayload(values));
      }}
      onDelete={async (bus) => {
        await busesApi.remove(bus.id);
      }}
      deleteConsequence={(bus) =>
        `${bus.plate_number} will be removed from the fleet. Departures already scheduled with this coach will preserve their ticket records, but the coach will no longer be assignable.`
      }
    />
  );
}