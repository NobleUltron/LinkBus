import React from 'react';
import { Building2Icon, CheckCircle2Icon, ExternalLinkIcon, GlobeIcon, MapPinIcon, NavigationIcon } from 'lucide-react';
import type { Column } from '../../components/data/DataTable';
import type { FieldConfig, FieldValue } from '../../components/data/ResourceModal';
import { ResourceScreen } from '../../components/data/ResourceScreen';
import { StatusPill } from '../../components/ui/StatusPill';
import { terminalsApi } from '../../services/crud';
import type { Terminal } from '../../types/models';
import { getMediaUrl } from '../../utils/format';

const statusOptions = [
  { value: 'active', label: 'Active Hub' },
  { value: 'inactive', label: 'Inactive / Closed' },
];

export function TerminalsAdmin() {
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
                alt=""
                className="h-10 w-14 shrink-0 rounded-xl object-cover border border-line shadow-sm"
              />
            ) : (
              <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                <MapPinIcon className="h-5 w-5" aria-hidden />
              </span>
            )}
            <div>
              <p className="font-bold text-fg text-sm">{terminal.name}</p>
              <span className="inline-flex items-center rounded-md bg-surface-2 px-1.5 py-0.5 text-[0.625rem] font-bold text-muted uppercase">
                {terminal.city} Station
              </span>
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
      header: 'GPS Coordinates & Map',
      hideBelow: 'lg',
      align: 'left',
      render: (terminal) => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${terminal.latitude},${terminal.longitude}`;
        return (
          <div>
            <span className="tabular-nums font-mono text-xs font-semibold text-fg block">
              {terminal.latitude.toFixed(4)}, {terminal.longitude.toFixed(4)}
            </span>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.6875rem] font-bold text-brand-600 dark:text-brand-400 hover:underline mt-0.5"
            >
              <NavigationIcon className="h-3 w-3" />
              Verify on Google Maps
              <ExternalLinkIcon className="h-2.5 w-2.5 opacity-60" />
            </a>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Operational Status',
      render: (terminal) => <StatusPill status={terminal.status} />,
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'name',
      label: 'Terminal Station Name',
      required: true,
      placeholder: 'e.g. Namayiba Central Bus Terminal',
    },
    {
      name: 'city',
      label: 'City / Municipality',
      required: true,
      placeholder: 'e.g. Kampala',
    },
    {
      name: 'address',
      label: 'Physical Street Address & Counter Info',
      required: true,
      placeholder: 'e.g. Nakivubo Rd, Counter 12 Arrivals Hall',
      span: 2,
    },
    {
      name: 'latitude',
      label: 'GPS Latitude',
      type: 'number',
      step: 'any',
      required: true,
      placeholder: '0.3136',
    },
    {
      name: 'longitude',
      label: 'GPS Longitude',
      type: 'number',
      step: 'any',
      required: true,
      placeholder: '32.5811',
    },
    {
      name: 'photo',
      label: 'Terminal Station Photography',
      type: 'image',
      span: 2,
      hint: 'Upload a station photo from your device. Automatically compressed and displayed on public directory and route departure cards.',
    },
    {
      name: 'status',
      label: 'Operational Status',
      type: 'select',
      options: statusOptions,
      required: true,
    },
  ];

  const toPayload = (values: Record<string, FieldValue>) => ({
    name: String(values.name),
    city: String(values.city),
    address: String(values.address),
    latitude: Number(values.latitude),
    longitude: Number(values.longitude),
    photo: String(values.photo ?? '').trim() || null,
    status: String(values.status) as Terminal['status'],
  });

  return (
    <ResourceScreen<Terminal>
      title="Terminals & Regional Hubs"
      subtitle="Configure physical station terminals, GPS coordinates for navigation, counter locations, and station photography."
      singular="Terminal"
      plural="Terminals"
      searchPlaceholder="Search terminal name, city or street address…"
      emptyTitle="No terminals registered"
      emptyBody="Add a regional terminal before configuring corridors and scheduling departures."
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
        terminalsApi.list({
          page,
          perPage,
          search,
          filters,
        })
      }
      renderCards={({ rows, meta }) => {
        const totalCount = meta.total || rows.length;
        const active = rows.filter((t) => t.status === 'active');
        const cities = new Set(rows.map((t) => t.city).filter(Boolean));
        const geocoded = rows.filter((t) => Number(t.latitude) !== 0 && Number(t.longitude) !== 0);

        return (
          <>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Building2Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Total Stations</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {totalCount.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Registered Bus Hubs</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Active Terminals</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {active.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Open for Dispatch &amp; Arrival</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <GlobeIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Cities Connected</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {cities.size.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Urban &amp; Regional Hubs</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <NavigationIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">GPS Geocoded</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {geocoded.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Satellite Map Coordinates</p>
            </div>
          </>
        );
      }}
      toFormValues={(terminal) => ({
        name: terminal?.name ?? '',
        city: terminal?.city ?? '',
        address: terminal?.address ?? '',
        latitude: terminal?.latitude ?? '',
        longitude: terminal?.longitude ?? '',
        photo: terminal?.photo ?? '',
        status: terminal?.status ?? 'active',
      })}
      onCreate={async (values) => {
        await terminalsApi.create(toPayload(values));
      }}
      onUpdate={async (terminal, values) => {
        await terminalsApi.update(terminal.id, toPayload(values));
      }}
      onDelete={async (terminal) => {
        await terminalsApi.remove(terminal.id);
      }}
      deleteConsequence={(terminal) =>
        `${terminal.name} will be removed. Scheduled routes referencing this terminal will require reassignment.`
      }
    />
  );
}