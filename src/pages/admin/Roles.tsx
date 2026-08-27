import React from 'react';
import {
  KeyIcon,
  LayersIcon,
  LockIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UsersIcon,
  UserIcon,
} from 'lucide-react';
import type { Column } from '../../components/data/DataTable';
import type { FieldConfig, FieldValue } from '../../components/data/ResourceModal';
import { ResourceScreen } from '../../components/data/ResourceScreen';
import { Badge } from '../../components/ui/StatusPill';
import { rolesApi } from '../../services/crud';
import type { Role, RoleSlug } from '../../types/models';

const roleToneMap: Record<string, 'violet' | 'amber' | 'blue' | 'green' | 'slate'> = {
  admin: 'violet',
  staff: 'amber',
  driver: 'blue',
  passenger: 'green',
};

const capabilitiesMap: Record<string, { label: string; icon?: string }[]> = {
  admin: [
    { label: 'Full Root Access' },
    { label: 'Fleet & Fares Management' },
    { label: 'Financial & Revenue Reports' },
    { label: 'System Settings & Audit Logs' },
    { label: 'Promo Campaigns & Broadcasts' },
  ],
  staff: [
    { label: 'POS Terminal Ticket Issuing' },
    { label: 'Luggage Tagging & Excess Fees' },
    { label: 'Gate QR Check-In & Boarding' },
    { label: 'Parcel Acceptance & Delivery' },
  ],
  driver: [
    { label: 'Assigned Departure Roster' },
    { label: 'Passenger Manifest Manifest' },
    { label: 'Highway Transit Status Logs' },
    { label: 'GPS Turn-by-Turn Route Navigation' },
  ],
  passenger: [
    { label: 'Intercity Departure Search' },
    { label: '2D Interactive Seat Picker' },
    { label: 'Mobile Money & Card Checkout' },
    { label: 'Digital QR Boarding Passes' },
  ],
};

const reachMap: Record<string, { portal: string; color: string }> = {
  admin: { portal: 'Executive Admin Command Suite (/admin/*)', color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30' },
  staff: { portal: 'Terminal POS & Luggage Counter (/staff/*)', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
  driver: { portal: 'Coach Captain Cockpit (/driver/*)', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' },
  passenger: { portal: 'Public & Passenger Travel Suite (/passenger/*)', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
};

export function Roles() {
  const columns: Column<Role>[] = [
    {
      key: 'role',
      header: 'Security Role & Slug',
      render: (role) => (
        <div className="py-1">
          <div className="flex items-center gap-2">
            <Badge tone={roleToneMap[role.slug] ?? 'slate'}>
              {role.name}
            </Badge>
          </div>
          <span className="font-mono text-[0.6875rem] text-muted block mt-1">
            slug: <strong className="text-fg">{role.slug}</strong>
          </span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Assigned Capabilities & Permissions',
      render: (role) => {
        const caps = capabilitiesMap[role.slug] ?? [
          { label: 'Custom Route Guard Access' },
          { label: 'Scoped Resource Permissions' },
        ];

        return (
          <div className="space-y-1.5">
            <p className="text-fg text-xs font-medium">{role.description}</p>
            <div className="flex flex-wrap gap-1">
              {caps.map((cap) => (
                <span
                  key={cap.label}
                  className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-[0.625rem] font-semibold text-fg border border-line"
                >
                  <span className="text-brand-600 font-bold">✓</span>
                  {cap.label}
                </span>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      key: 'reach',
      header: 'Authorized Portal Reach',
      hideBelow: 'md',
      render: (role) => {
        const reachInfo = reachMap[role.slug] ?? {
          portal: 'Custom Scoped Access',
          color: 'text-fg bg-surface-2 border-line',
        };

        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${reachInfo.color}`}
          >
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            {reachInfo.portal}
          </span>
        );
      },
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'name',
      label: 'Role Display Name',
      required: true,
      placeholder: 'e.g. Station Manager or Logistics Auditor',
    },
    {
      name: 'slug',
      label: 'Permission Slug (Unique System Identifier)',
      type: 'text',
      required: true,
      placeholder: 'e.g. manager',
      hint: 'Lowercase system identifier used in RBAC security route guards.',
    },
    {
      name: 'description',
      label: 'Operational Scope & Responsibilities',
      type: 'textarea',
      required: true,
      placeholder: 'Describe the duties, terminal operations, and permissions associated with this role...',
      span: 2,
    },
  ];

  const toPayload = (values: Record<string, FieldValue>) => ({
    name: String(values.name).trim(),
    slug: String(values.slug).toLowerCase().trim().replace(/\s+/g, '_') as RoleSlug,
    description: String(values.description).trim(),
  });

  return (
    <ResourceScreen<Role>
      title="Security Roles & RBAC Permissions"
      subtitle="Role-based access control definitions that protect administrative command, staff POS counters, captain cockpits, and passenger portals."
      singular="Security Role"
      plural="Security Roles"
      searchPlaceholder="Search role name, slug or description…"
      emptyTitle="No roles defined"
      emptyBody="Add a security role before assigning it to platform user accounts."
      columns={columns}
      fields={fields}
      load={({ page, perPage, search, filters }) =>
        rolesApi.list({
          page,
          perPage,
          search,
          filters,
        })
      }
      renderCards={({ rows, meta }) => {
        const totalCount = meta.total || rows.length;
        const adminRoles = rows.filter((r) => r.slug === 'admin' || r.slug === 'manager');
        const staffRoles = rows.filter((r) => r.slug === 'staff' || r.slug === 'driver');
        const passengerRoles = rows.filter((r) => r.slug === 'passenger');

        return (
          <>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <LayersIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Total Roles</span>
              </div>
              <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
                {totalCount.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">RBAC Permission Tiers</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShieldCheckIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Admin Roles</span>
              </div>
              <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
                {adminRoles.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Full Command Suite Access</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <UserCogIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Staff & Crew Roles</span>
              </div>
              <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
                {staffRoles.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">POS Counter & Fleet Crew</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Passenger Access</span>
              </div>
              <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
                {passengerRoles.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Public Travel Portal Roles</p>
            </div>
          </>
        );
      }}
      toFormValues={(role) => ({
        name: role?.name ?? '',
        slug: role?.slug ?? 'passenger',
        description: role?.description ?? '',
      })}
      onCreate={async (values) => {
        await rolesApi.create(toPayload(values));
      }}
      onUpdate={async (role, values) => {
        await rolesApi.update(role.id, toPayload(values));
      }}
      onDelete={async (role) => {
        await rolesApi.remove(role.id);
      }}
      deleteConsequence={(role) =>
        `The ${role.name} role will be removed. Users currently assigned to it will retain their active session until reassigned.`
      }
      headerActions={
        <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
          <LockIcon className="h-4 w-4 text-brand-600" aria-hidden />
          Enforced by Strict Route Guards
        </span>
      }
    />
  );
}