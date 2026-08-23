import React from 'react';
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  CompassIcon,
  GaugeIcon,
  MapPinIcon,
  NavigationIcon,
  RouteIcon,
} from 'lucide-react';
import type { Column } from '../../components/data/DataTable';
import type { FieldConfig, FieldValue } from '../../components/data/ResourceModal';
import { ResourceScreen } from '../../components/data/ResourceScreen';
import { Panel } from '../../components/ui/Panel';
import { ErrorState, SkeletonTable } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { useAsync } from '../../hooks/useAsync';
import { routesApi } from '../../services/crud';
import { getReferenceData } from '../../services/reference';
import type { BusRoute } from '../../types/models';
import { durationLabel, money } from '../../utils/format';

const statusOptions = [
  { value: 'active', label: 'Active Service' },
  { value: 'inactive', label: 'Suspended / Inactive' },
];

export function Routes() {
  const reference = useAsync(() => getReferenceData(), []);

  if (reference.loading) {
    return (
      <Panel bodyClassName="">
        <SkeletonTable rows={8} columns={5} />
      </Panel>
    );
  }

  if (reference.error || !reference.data) {
    return (
      <Panel>
        <ErrorState
          message={reference.error ?? 'Terminals could not be loaded.'}
          onRetry={reference.reload}
        />
      </Panel>
    );
  }

  const { terminals = [] } = reference.data;

  const terminalOptions = terminals.map((terminal) => ({
    value: String(terminal.id),
    label: `${terminal.city} — ${terminal.name}`,
  }));

  const cityFor = (id?: number) => (id ? terminals.find((t) => t.id === id)?.city ?? '—' : '—');
  const terminalNameFor = (id?: number) => (id ? terminals.find((t) => t.id === id)?.name ?? '' : '');

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
              <span className="font-bold text-fg text-sm">
                {originCity}
              </span>
              <span className="text-brand-600 dark:text-brand-400 font-bold">➔</span>
              <span className="font-bold text-fg text-sm">
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
      render: (route) => (
        <div>
          <span className="tabular-nums font-bold text-fg text-sm">
            {route.distance_km} km
          </span>
          <span className="block text-[0.6875rem] text-muted">
            Direct Highway
          </span>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Scheduled Transit',
      align: 'left',
      hideBelow: 'sm',
      render: (route) => (
        <div>
          <span className="tabular-nums font-bold text-fg text-sm">
            {durationLabel(route.estimated_duration_minutes)}
          </span>
          <span className="block text-[0.6875rem] text-muted">
            {route.estimated_duration_minutes} mins travel
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
            <span className="tabular-nums font-semibold text-fg">
              {pace} km/h
            </span>
            <span
              className={`block text-[0.625rem] font-bold ${
                isSafePace
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {isSafePace ? '✓ Speed Governed' : '⚠️ Fast Express'}
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
        // Approximate standard Ugandan coach fare formula (~UGX 100 - 130 per km)
        const estMin = Math.round((route.distance_km * 100) / 1000) * 1000;
        const estMax = Math.round((route.distance_km * 140) / 1000) * 1000;
        return (
          <div>
            <span className="font-semibold text-xs tabular-nums text-fg">
              {money(estMin || 25000)} – {money(estMax || 35000)}
            </span>
            <span className="block text-[0.625rem] text-muted">Recommended Base</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Corridor Status',
      render: (route) => <StatusPill status={route.status} />,
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'origin_terminal_id',
      label: 'Origin Station & Terminal',
      type: 'select',
      options: terminalOptions,
      required: true,
    },
    {
      name: 'destination_terminal_id',
      label: 'Destination Station & Terminal',
      type: 'select',
      options: terminalOptions,
      required: true,
    },
    {
      name: 'distance_km',
      label: 'Highway Distance (km)',
      type: 'number',
      min: 1,
      required: true,
      hint: 'Actual highway distance in kilometers.',
    },
    {
      name: 'estimated_duration_minutes',
      label: 'Estimated Transit Duration (Minutes)',
      type: 'number',
      min: 5,
      required: true,
      hint: 'Scheduled departure arrival times are automatically computed from this duration.',
    },
    {
      name: 'status',
      label: 'Corridor Operating Status',
      type: 'select',
      options: statusOptions,
      required: true,
    },
  ];

  const toPayload = (values: Record<string, FieldValue>) => ({
    origin_terminal_id: Number(values.origin_terminal_id),
    destination_terminal_id: Number(values.destination_terminal_id),
    distance_km: Number(values.distance_km),
    estimated_duration_minutes: Number(values.estimated_duration_minutes),
    status: String(values.status) as BusRoute['status'],
  });

  return (
    <ResourceScreen<BusRoute>
      title="Network Corridors & Routes"
      subtitle="Configure intercity highways and corridors between terminals. Distance and travel duration automatically drive fare pricing and scheduled arrival times."
      singular="Route"
      plural="Routes"
      searchPlaceholder="Search by corridor, city, or terminal..."
      emptyTitle="No routes defined"
      emptyBody="Add a corridor between two terminals to start scheduling coach departures on it."
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'status',
          label: 'Any status',
          options: statusOptions,
        },
      ]}
      load={({ page, perPage, search, filters }) =>
        routesApi.list({
          page,
          perPage,
          search,
          filters,
        })
      }
      renderCards={({ rows, meta }) => {
        const totalCount = meta.total || rows.length;
        const active = rows.filter((r) => r.status === 'active');
        const longDistance = rows.filter((r) => Number(r.distance_km) >= 250);
        const totalCoverageKm = rows.reduce((sum, r) => sum + (Number(r.distance_km) || 0), 0);

        return (
          <>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <RouteIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Total Corridors</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {totalCount.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Configured Transit Routes</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Active Corridors</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {active.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Open for Ticket Bookings</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CompassIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Long Haul Express</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {longDistance.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Intercity Highways &ge;250 km</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <NavigationIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Network Distance</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {totalCoverageKm.toLocaleString()} km
              </p>
              <p className="text-[0.6875rem] text-muted">Total Highway Network Span</p>
            </div>
          </>
        );
      }}
      toFormValues={(route) => ({
        origin_terminal_id: String(route?.origin_terminal_id ?? terminalOptions[0]?.value ?? ''),
        destination_terminal_id: String(
          route?.destination_terminal_id ??
            terminalOptions[1]?.value ??
            terminalOptions[0]?.value ??
            ''
        ),
        distance_km: route?.distance_km ?? '',
        estimated_duration_minutes: route?.estimated_duration_minutes ?? '',
        status: route?.status ?? 'active',
      })}
      onCreate={async (values) => {
        await routesApi.create(toPayload(values));
      }}
      onUpdate={async (route, values) => {
        await routesApi.update(route.id, toPayload(values));
      }}
      onDelete={async (route) => {
        await routesApi.remove(route.id);
      }}
      deleteConsequence={(route) => {
        const originCity = route.origin?.city || cityFor(route.origin_terminal_id);
        const destCity = route.destination?.city || cityFor(route.destination_terminal_id);
        return `The ${originCity} ➔ ${destCity} corridor will be removed. Trips already scheduled on it stay in the system but can no longer be edited against this route.`;
      }}
    />
  );
}