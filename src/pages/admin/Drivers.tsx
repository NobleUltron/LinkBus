import React, { useMemo, useState } from 'react';
import {
  AwardIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileSpreadsheetIcon,
  FileBadgeIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserCheckIcon,
  UserIcon,
  XCircleIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Panel } from '../../components/ui/Panel';
import { EmptyState } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { DriverModal } from '../../components/modals/DriverModal';
import { Modal } from '../../components/ui/Modal';
import { usePaginated } from '../../hooks/usePaginated';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { driversApi } from '../../services/crud';
import { getReferenceData } from '../../services/reference';
import type { Driver } from '../../types/models';
import { formatDate } from '../../utils/format';

const statusOptions = [
  { value: 'active', label: 'Active on Duty' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'suspended', label: 'Suspended' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const getExpiryInfo = (expiryStr: string) => {
  if (!expiryStr) return { days: 999, status: 'valid' as const, label: 'No date set' };
  const expiry = new Date(expiryStr).getTime();
  const now = Date.now();
  const days = Math.ceil((expiry - now) / 86400000);
  if (days < 0) return { days, status: 'expired' as const, label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 60) return { days, status: 'expiring' as const, label: `Expires in ${days}d` };
  return { days, status: 'valid' as const, label: `Valid · expires ${formatDate(expiryStr)}` };
};

const driverInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const experienceLabel = (years: number) => {
  if (years >= 10) return { label: '🏅 Highway Legend', color: 'text-amber-700 dark:text-amber-300' };
  if (years >= 8) return { label: '⭐ Senior Captain', color: 'text-brand-600 dark:text-brand-400' };
  if (years >= 4) return { label: 'Experienced Driver', color: 'text-emerald-700 dark:text-emerald-400' };
  return { label: 'Junior Captain', color: 'text-muted' };
};

// ── Component ─────────────────────────────────────────────────────────────────

export function Drivers() {
  // Reference data (users list for modal)
  const reference = useAsync(() => getReferenceData(), []);
  const users = reference.data?.users ?? [];

  // Paginated Driver list
  const state = usePaginated<Driver>(({ page, perPage, search, filters }) =>
    driversApi.list({ page, perPage, search, filters: { status: filters.status } })
  );

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [profileDriver, setProfileDriver] = useState<Driver | null>(null);

  // ── Scorecard metrics ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const rows = state.rows;
    const active = rows.filter((d) => d.status === 'active').length;
    const onLeave = rows.filter((d) => d.status === 'on_leave').length;
    const suspended = rows.filter((d) => d.status === 'suspended').length;
    const seniorDrivers = rows.filter((d) => (d.experience_years ?? 0) >= 8).length;
    const licenceAlerts = rows.filter((d) => {
      if (d.status === 'suspended') return true;
      if (!d.license_expiry) return false;
      const days = Math.ceil((new Date(d.license_expiry).getTime() - Date.now()) / 86400000);
      return days <= 60;
    }).length;

    return { active, onLeave, suspended, seniorDrivers, licenceAlerts, total: state.meta.total || rows.length };
  }, [state.rows, state.meta.total]);

  // ── Quick duty-status change ────────────────────────────────────────────────
  const handleQuickStatus = async (driver: Driver, nextStatus: Driver['status']) => {
    try {
      await driversApi.update(driver.id, { status: nextStatus });
      toast.success(`${driver.name ?? 'Driver'} — status changed to ${nextStatus.replace('_', ' ').toUpperCase()}`);
      state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deletingDriver) return;
    setDeletePending(true);
    try {
      await driversApi.remove(deletingDriver.id);
      const name = deletingDriver.name ?? 'Driver';
      toast.success(`${name} removed from the roster`);
      setDeletingDriver(null);
      state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeletePending(false);
    }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (!state.rows.length) { toast.error('No driver records to export'); return; }
    const headers = ['ID', 'Name', 'Phone', 'Email', 'Licence #', 'Licence Expiry', 'Experience (yrs)', 'Status', 'Notes'];
    const csvRows = state.rows.map((d) => [
      d.id,
      `"${d.name ?? ''}"`,
      `"${d.phone ?? ''}"`,
      `"${d.email ?? ''}"`,
      `"${d.license_number ?? ''}"`,
      `"${d.license_expiry ?? ''}"`,
      d.experience_years ?? 0,
      `"${d.status}"`,
      `"${(d.notes ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linkbus_driver_roster_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Driver roster exported to CSV');
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns: Column<Driver>[] = [
    {
      key: 'captain',
      header: 'Captain & Identity',
      render: (driver) => {
        const name = driver.name ?? driver.user?.name ?? '—';
        const phone = driver.phone ?? driver.user?.phone ?? '—';
        const email = driver.email ?? driver.user?.email ?? '';
        const initials = driverInitials(name);

        return (
          <div className="flex items-center gap-3 py-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-sm font-extrabold text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-sm">
              {initials || <UserIcon className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-bold text-fg text-sm">{name}</p>
              <div className="flex items-center gap-2 text-[0.6875rem] text-muted mt-0.5">
                <span className="flex items-center gap-1">
                  <PhoneIcon className="h-2.5 w-2.5" />
                  {phone}
                </span>
                {email && (
                  <span className="hidden items-center gap-1 sm:flex text-muted/70">
                    <MailIcon className="h-2.5 w-2.5" />
                    {email}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'permit',
      header: 'Permit & Licence',
      render: (driver) => {
        const { status: expStatus, label } = getExpiryInfo(driver.license_expiry ?? '');
        return (
          <div>
            <span className="font-mono text-xs font-bold text-fg block">
              {driver.license_number ?? 'UG-DL-XXXXXX'}
            </span>
            <div className="mt-1">
              {expStatus === 'expired' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 text-[0.625rem] font-bold text-red-600 dark:text-red-400">
                  <ShieldAlertIcon className="h-3 w-3" /> {label}
                </span>
              )}
              {expStatus === 'expiring' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[0.625rem] font-bold text-amber-600 dark:text-amber-400">
                  <ClockIcon className="h-3 w-3" /> {label}
                </span>
              )}
              {expStatus === 'valid' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[0.625rem] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheckIcon className="h-3 w-3" /> Valid
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
      hideBelow: 'sm',
      render: (driver) => {
        const years = driver.experience_years ?? 0;
        const { label, color } = experienceLabel(years);
        return (
          <div>
            <span className="font-bold tabular-nums text-fg text-sm">{years} yrs</span>
            <p className={`text-[0.6875rem] font-semibold ${color}`}>{label}</p>
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
      header: 'Specialization',
      hideBelow: 'xl',
      render: (driver) => (
        <span className="text-xs text-muted max-w-[160px] truncate block">{driver.notes || '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (driver) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<FileBadgeIcon className="h-3.5 w-3.5" />}
            onClick={() => setProfileDriver(driver)}
            title="View Driver Profile"
          >
            Profile
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PencilIcon className="h-3.5 w-3.5" />}
            onClick={() => setEditingDriver(driver)}
            title="Edit Driver"
          >
            Edit
          </Button>

          <select
            aria-label={`Duty status for ${driver.name}`}
            value={driver.status}
            onChange={(e) => handleQuickStatus(driver, e.target.value as Driver['status'])}
            className="field !h-8 w-auto text-xs font-semibold"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setDeletingDriver(driver)}
            aria-label={`Remove ${driver.name}`}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/15 hover:text-red-600"
          >
            <Trash2Icon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Driver Roster & Licensing
          </h1>
          <p className="mt-1 text-xs text-muted max-w-xl">
            Manage certified intercity coach captains, track driving permit expirations, verify years of commercial highway experience, and roster drivers onto scheduled departures.
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
            + Register Driver
          </Button>
        </div>
      </div>

      {/* ── Driver Crew Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Active on Duty */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <UserCheckIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Active on Duty
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-emerald-950 dark:text-emerald-100 tabular-nums">
            {metrics.active} Captains
          </p>
          <p className="text-[0.6875rem] text-emerald-800 dark:text-emerald-300">
            Available for trip assignment
          </p>
        </div>

        {/* On Leave / Rest */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ClockIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">On Leave / Rest</span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.onLeave} Drivers
          </p>
          <p className="text-[0.6875rem] text-muted">Scheduled rest period</p>
        </div>

        {/* Senior Captains */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <AwardIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Senior Captains</span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.seniorDrivers} Drivers
          </p>
          <p className="text-[0.6875rem] text-muted">8+ years highway experience</p>
        </div>

        {/* Licence Alerts */}
        <div className={`rounded-2xl border p-4 shadow-sm hover-lift transition-all ${
          metrics.licenceAlerts > 0
            ? 'border-red-500/30 bg-red-500/10'
            : 'border-line bg-surface'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              metrics.licenceAlerts > 0
                ? 'bg-red-600 text-white'
                : 'bg-slate-500/10 text-slate-500'
            }`}>
              <ShieldAlertIcon className="h-4 w-4" />
            </span>
            <span className={`text-xs font-bold ${
              metrics.licenceAlerts > 0
                ? 'text-red-900 dark:text-red-200 uppercase tracking-wider'
                : 'text-fg'
            }`}>
              Licence Alerts
            </span>
          </div>
          <p className={`mt-2 font-extrabold text-2xl tabular-nums ${
            metrics.licenceAlerts > 0 ? 'text-red-950 dark:text-red-100' : 'text-fg'
          }`}>
            {metrics.licenceAlerts} {metrics.licenceAlerts === 1 ? 'Alert' : 'Alerts'}
          </p>
          <p className={`text-[0.6875rem] ${
            metrics.licenceAlerts > 0 ? 'text-red-800 dark:text-red-300' : 'text-muted'
          }`}>
            {metrics.licenceAlerts > 0 ? 'Expiring ≤60d or Suspended' : 'All licences valid'}
          </p>
        </div>
      </div>

      {/* ── Driver Roster Data Table ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search name, licence number, phone, or notes…"
          filters={[
            {
              key: 'status',
              label: 'All duty statuses',
              options: statusOptions,
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />

        <DataTable<Driver>
          columns={columns}
          rows={state.rows}
          rowKey={(d) => d.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="Driver Roster"
          empty={
            <EmptyState
              icon={<UserCheckIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0
                  ? 'No drivers match those filters'
                  : 'No drivers registered yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or status filter.'
                  : 'Register a driver profile to make captains assignable to scheduled departures.'
              }
              action={
                state.activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={state.clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
                    Register First Driver
                  </Button>
                )
              }
            />
          }
        />
        <Pagination meta={state.meta} onPageChange={state.setPage} label="drivers" />
      </Panel>

      {/* ── Add Driver Modal (uses DriverModal) ── */}
      <DriverModal
        open={addOpen}
        driver={null}
        users={users}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          reference.reload();
          state.reload();
        }}
      />

      {/* ── Edit Driver Modal (uses DriverModal) ── */}
      <DriverModal
        open={Boolean(editingDriver)}
        driver={editingDriver}
        users={users}
        onClose={() => setEditingDriver(null)}
        onSaved={() => {
          reference.reload();
          state.reload();
          setEditingDriver(null);
        }}
      />

      {/* ── Driver Profile Preview Modal ── */}
      <Modal
        open={Boolean(profileDriver)}
        onClose={() => setProfileDriver(null)}
        title="Driver Certification Profile"
        subtitle={
          profileDriver
            ? `Fleet Captain · Roster ID #${profileDriver.id}`
            : undefined
        }
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              icon={<PencilIcon className="h-4 w-4" />}
              onClick={() => {
                setEditingDriver(profileDriver);
                setProfileDriver(null);
              }}
            >
              Edit Profile
            </Button>
            <Button variant="outline" onClick={() => setProfileDriver(null)}>
              Close
            </Button>
          </>
        }
      >
        {profileDriver && (() => {
          const name = profileDriver.name ?? profileDriver.user?.name ?? '—';
          const phone = profileDriver.phone ?? profileDriver.user?.phone ?? '—';
          const email = profileDriver.email ?? profileDriver.user?.email ?? '—';
          const { status: expStatus, label: expLabel } = getExpiryInfo(profileDriver.license_expiry ?? '');
          const years = profileDriver.experience_years ?? 0;
          const { label: expTitle, color: expColor } = experienceLabel(years);
          const initials = driverInitials(name);

          return (
            <div className="space-y-4">
              {/* Identity Card */}
              <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface-2/60 p-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-xl font-extrabold text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-sm">
                  {initials || <UserIcon className="h-7 w-7" />}
                </div>
                <div>
                  <p className="font-extrabold text-lg text-fg leading-tight">{name}</p>
                  <div className="mt-1 flex flex-col gap-0.5 text-[0.6875rem] text-muted">
                    <span className="flex items-center gap-1.5"><PhoneIcon className="h-3 w-3" />{phone}</span>
                    <span className="flex items-center gap-1.5"><MailIcon className="h-3 w-3" />{email}</span>
                  </div>
                </div>
                <div className="ml-auto">
                  <StatusPill status={profileDriver.status} />
                </div>
              </div>

              {/* Permit & Certification */}
              <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-line pb-2 text-xs font-black uppercase tracking-wider text-muted">
                  <FileBadgeIcon className="h-3.5 w-3.5 text-brand-600" />
                  Driving Permit & Certification
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted text-[0.625rem] uppercase tracking-wide font-bold mb-0.5">Licence Number</p>
                    <p className="font-mono font-extrabold text-fg text-sm">{profileDriver.license_number ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted text-[0.625rem] uppercase tracking-wide font-bold mb-0.5">Expiry Date</p>
                    <p className="font-bold text-fg">{profileDriver.license_expiry ? formatDate(profileDriver.license_expiry) : 'Not set'}</p>
                  </div>
                </div>

                {/* Expiry Status Banner */}
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                  expStatus === 'expired'
                    ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
                    : expStatus === 'expiring'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {expStatus === 'expired' && <XCircleIcon className="h-4 w-4 shrink-0" />}
                  {expStatus === 'expiring' && <ClockIcon className="h-4 w-4 shrink-0" />}
                  {expStatus === 'valid' && <ShieldCheckIcon className="h-4 w-4 shrink-0" />}
                  {expLabel}
                </div>
              </div>

              {/* Experience & Specialization */}
              <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-line pb-2 text-xs font-black uppercase tracking-wider text-muted">
                  <AwardIcon className="h-3.5 w-3.5 text-brand-600" />
                  Experience & Highway Specialization
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-2xl text-fg tabular-nums">{years} <span className="text-sm font-bold text-muted">years</span></p>
                    <p className={`text-xs font-bold mt-0.5 ${expColor}`}>{expTitle}</p>
                  </div>
                  {/* Experience bar */}
                  <div className="flex-1 ml-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2 border border-line">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${Math.min(100, Math.round((years / 15) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[0.625rem] text-muted text-right mt-0.5">Max 15 yrs</p>
                  </div>
                </div>
                {profileDriver.notes && (
                  <div className="rounded-xl border border-line bg-surface-2/60 p-3 text-xs text-muted leading-relaxed">
                    {profileDriver.notes}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        open={Boolean(deletingDriver)}
        title="Remove Driver from Roster?"
        body={
          deletingDriver
            ? `${deletingDriver.name ?? 'This driver'} will no longer be assignable to trips. Their user account will remain active.`
            : ''
        }
        confirmLabel="Remove Driver"
        variant="danger"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingDriver(null)}
      />
    </div>
  );
}