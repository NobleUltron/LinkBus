import React, { useMemo } from 'react';
import {
  AlertCircleIcon,
  AwardIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  PhoneIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserIcon,
} from 'lucide-react';
import type { Column } from '../../components/data/DataTable';
import type { FieldConfig, FieldValue } from '../../components/data/ResourceModal';
import { ResourceScreen } from '../../components/data/ResourceScreen';
import { Panel } from '../../components/ui/Panel';
import { ErrorState, SkeletonTable } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { DriverModal } from '../../components/modals/DriverModal';
import { useAsync } from '../../hooks/useAsync';
import { driversApi } from '../../services/crud';
import { getReferenceData } from '../../services/reference';
import type { Driver } from '../../types/models';
import { formatDate } from '../../utils/format';

const statusOptions = [
  { value: 'active', label: 'Active on Duty' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'suspended', label: 'Suspended' },
];

export function Drivers() {
  const reference = useAsync(() => getReferenceData(), []);

  if (reference.loading) {
    return (
      <Panel bodyClassName="">
        <SkeletonTable rows={6} columns={5} />
      </Panel>
    );
  }

  if (reference.error || !reference.data) {
    return (
      <Panel>
        <ErrorState
          message={reference.error ?? 'Staff accounts could not be loaded.'}
          onRetry={reference.reload}
        />
      </Panel>
    );
  }

  const { users = [], drivers = [] } = reference.data;
  const driverUsers = users.filter((user) => user.is_driver || user.role === 'driver');

  const userFor = (userId: number) => users.find((user) => user.id === userId);
  const nameFor = (driver: Driver) => driver.name || driver.user?.name || userFor(driver.user_id)?.name || 'Unassigned';
  const phoneFor = (driver: Driver) => driver.phone || driver.user?.phone || userFor(driver.user_id)?.phone || '—';
  const emailFor = (driver: Driver) => driver.email || driver.user?.email || userFor(driver.user_id)?.email || '';

  const getExpiryInfo = (expiryStr: string) => {
    if (!expiryStr) return { days: 999, status: 'valid', label: 'No date' };
    const expiry = new Date(expiryStr).getTime();
    const now = Date.now();
    const days = Math.ceil((expiry - now) / 86400000);

    if (days < 0) {
      return { days, status: 'expired', label: `Expired ${Math.abs(days)}d ago` };
    }
    if (days <= 60) {
      return { days, status: 'expiring', label: `Expires in ${days} days` };
    }
    return { days, status: 'valid', label: `Valid (${days} days)` };
  };

  const columns: Column<Driver>[] = [
    {
      key: 'driver',
      header: 'Captain / Driver',
      render: (driver) => {
        const name = nameFor(driver);
        const phone = phoneFor(driver);
        const email = emailFor(driver);
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-xs font-extrabold text-brand-600 dark:text-brand-400 border border-brand-500/20">
              {initials || <UserIcon className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-bold text-fg">{name}</p>
              <div className="flex items-center gap-2 text-[0.6875rem] text-muted">
                <span>{phone}</span>
                {email && <span className="text-muted/60">• {email}</span>}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'licence',
      header: 'Permit / Licence',
      render: (driver) => {
        const { status, label } = getExpiryInfo(driver.license_expiry);

        return (
          <div>
            <span className="font-mono text-xs font-bold text-fg">
              {driver.license_number || 'UG-DL-XXXXXX'}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              {status === 'expired' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 text-[0.625rem] font-bold text-red-600 dark:text-red-400">
                  <ShieldAlertIcon className="h-3 w-3" />
                  {label}
                </span>
              )}
              {status === 'expiring' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[0.625rem] font-bold text-amber-600 dark:text-amber-400">
                  <ClockIcon className="h-3 w-3" />
                  {label}
                </span>
              )}
              {status === 'valid' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[0.625rem] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheckIcon className="h-3 w-3" />
                  Expires {formatDate(driver.license_expiry)}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'experience',
      header: 'Experience',
      align: 'left',
      hideBelow: 'sm',
      render: (driver) => {
        const years = driver.experience_years ?? 0;
        const isSenior = years >= 8;

        return (
          <div>
            <span className="font-bold tabular-nums text-fg">{years} Years</span>
            <p className="text-[0.6875rem] text-muted">
              {isSenior ? '⭐ Senior Highway Captain' : years >= 4 ? 'Experienced Driver' : 'Junior Captain'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Duty Status',
      render: (driver) => <StatusPill status={driver.status} />,
    },
    {
      key: 'notes',
      header: 'Specialization / Notes',
      hideBelow: 'lg',
      render: (driver) => (
        <span className="text-xs text-muted max-w-[200px] truncate block">
          {driver.notes || '—'}
        </span>
      ),
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'user_id',
      label: 'Staff Account',
      type: 'select',
      required: true,
      options: driverUsers.map((user) => ({
        value: String(user.id),
        label: `${user.name} · ${user.email}`,
      })),
      hint: 'Only staff accounts with driver permissions appear in this list.',
    },
    {
      name: 'license_number',
      label: 'Driving Permit / Licence #',
      required: true,
      placeholder: 'e.g. UG-DL-084920',
    },
    {
      name: 'license_expiry',
      label: 'Permit Expiry Date',
      type: 'date',
      required: true,
    },
    {
      name: 'experience_years',
      label: 'Years of Commercial Coach Experience',
      type: 'number',
      min: 0,
      required: true,
    },
    {
      name: 'status',
      label: 'Availability & Duty Status',
      type: 'select',
      options: statusOptions,
      required: true,
    },
    {
      name: 'notes',
      label: 'Route Specializations & Medical Notes',
      type: 'textarea',
      span: 2,
    },
  ];

  const toPayload = (values: Record<string, FieldValue>) => ({
    user_id: Number(values.user_id),
    license_number: String(values.license_number),
    license_expiry: String(values.license_expiry),
    experience_years: Number(values.experience_years),
    status: String(values.status) as Driver['status'],
    notes: String(values.notes ?? ''),
  });

  return (
    <ResourceScreen<Driver>
      title="Drivers & Fleet Crew"
      subtitle="Manage certified intercity coach captains, track driving permit expirations, verify years of commercial experience, and roster staff onto departures."
      singular="Driver"
      plural="Drivers"
      searchPlaceholder="Search licence number, name or notes…"
      emptyTitle="No drivers on file"
      emptyBody="Add a driver record against a staff account to make them assignable to scheduled departures."
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'status',
          label: 'Any availability',
          options: statusOptions,
        },
      ]}
      load={({ page, perPage, search, filters }) =>
        driversApi.list({
          page,
          perPage,
          search,
          filters,
        })
      }
      withDateRange={true}
      renderCards={({ rows, meta }) => {
        const totalCount = meta.total || rows.length;
        const active = rows.filter((d) => d.status === 'active');
        const onLeave = rows.filter((d) => d.status === 'on_leave');
        const alerts = rows.filter((d) => {
          if (d.status === 'suspended') return true;
          if (!d.license_expiry) return false;
          const days = Math.ceil((new Date(d.license_expiry).getTime() - Date.now()) / 86400000);
          return days <= 60;
        });

        return (
          <>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserCheckIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Total Drivers</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {totalCount.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Licensed Driver Roster</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Active on Duty</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {active.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Available for Trip Assignment</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ClockIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">On Leave / Rest</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {onLeave.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Scheduled Rest Period</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <ShieldAlertIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Licence Alerts</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {alerts.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Expiring &lt;60d or Suspended</p>
            </div>
          </>
        );
      }}
      toFormValues={(driver) => ({
        user_id: String(driver?.user_id ?? driverUsers[0]?.id ?? ''),
        license_number: driver?.license_number ?? '',
        license_expiry: driver?.license_expiry ?? '',
        experience_years: driver?.experience_years ?? 0,
        status: driver?.status ?? 'active',
        notes: driver?.notes ?? '',
      })}
      renderModal={({ open, row, onClose, onSaved }) => (
        <DriverModal
          open={open}
          driver={row}
          users={users}
          onClose={onClose}
          onSaved={() => {
            reference.reload();
            onSaved();
          }}
        />
      )}
      onCreate={async (values) => {
        await driversApi.create(toPayload(values));
      }}
      onUpdate={async (driver, values) => {
        await driversApi.update(driver.id, toPayload(values));
      }}
      onDelete={async (driver) => {
        await driversApi.remove(driver.id);
        reference.reload();
      }}
      deleteConsequence={(driver) =>
        `${nameFor(driver)} will no longer be assignable to trips. Their user account will remain active.`
      }
    />
  );
}