import React from 'react';
import { CheckCircle2Icon, ShieldCheckIcon, UserCheckIcon, UserIcon, UsersIcon } from 'lucide-react';
import type { Column } from '../../components/data/DataTable';
import type { FieldConfig, FieldValue } from '../../components/data/ResourceModal';
import { ResourceScreen } from '../../components/data/ResourceScreen';
import { Badge } from '../../components/ui/StatusPill';
import { Panel } from '../../components/ui/Panel';
import { ErrorState, SkeletonTable } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { usersApi } from '../../services/crud';
import { getReferenceData } from '../../services/reference';
import type { RoleSlug, User } from '../../types/models';
import { formatDate, getAvatarUrl, initials, titleCase } from '../../utils/format';

const roleTone: Record<string, 'green' | 'amber' | 'blue' | 'violet' | 'slate'> = {
  admin: 'violet',
  staff: 'amber',
  driver: 'blue',
  passenger: 'green',
};

export function Users() {
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
          message={reference.error ?? 'Staff & role data could not be loaded.'}
          onRetry={reference.reload}
        />
      </Panel>
    );
  }

  const { roles = [], terminals = [] } = reference.data;

  const activeRoles =
    roles && roles.length > 0
      ? roles
      : [
          { id: 1, name: 'Administrator', slug: 'admin' },
          { id: 2, name: 'Staff', slug: 'staff' },
          { id: 3, name: 'Driver', slug: 'driver' },
          { id: 4, name: 'Passenger', slug: 'passenger' },
        ];

  const roleOptions = activeRoles.map((role) => ({
    value: String(role.id),
    label: role.name,
  }));

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'Account & Identity',
      render: (user) => (
        <div className="flex items-center gap-3 py-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600/10 text-xs font-bold text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-sm relative">
            {user.avatar ? (
              <img
                src={getAvatarUrl(user.avatar)}
                alt={user.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            {!user.avatar && (initials(user.name) || <UserIcon className="h-4 w-4" />)}
          </span>
          <div>
            <p className="font-bold text-fg text-sm">{user.name}</p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      hideBelow: 'md',
      render: (user) => (
        <div>
          <span className="font-mono text-xs text-fg">{user.phone || '—'}</span>
          <p className="text-[0.6875rem] text-muted">WhatsApp / SMS</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Security Role',
      render: (user) => {
        const roleKey = user.role || 'passenger';
        return (
          <Badge tone={roleTone[roleKey] ?? 'slate'}>
            {user.role ? titleCase(user.role) : 'Passenger'}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (user) => (
        <Badge tone={user.is_active !== false ? 'green' : 'red'}>
          {user.is_active !== false ? 'Active' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      key: 'driver',
      header: 'Driver Roster',
      hideBelow: 'lg',
      render: (user) => (
        <div>
          {user.is_driver || user.role === 'driver' ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[0.6875rem] font-bold text-blue-600 dark:text-blue-400">
              ✓ Coach Captain
            </span>
          ) : (
            <span className="text-muted text-xs">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'joined',
      header: 'Registered Date',
      align: 'left',
      hideBelow: 'sm',
      render: (user) => (
        <span className="text-muted tabular-nums text-xs">
          {formatDate(user.created_at)}
        </span>
      ),
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'name',
      label: 'Full Name',
      required: true,
      placeholder: 'e.g. John Mukasa',
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'john@linkbus.co.ug',
    },
    {
      name: 'phone',
      label: 'Phone Number (WhatsApp)',
      type: 'tel',
      required: true,
      placeholder: '+256 700 000000',
    },
    {
      name: 'password',
      label: 'Portal Password',
      type: 'password',
      placeholder: 'Min 6 characters (leave empty to keep current)',
      hint: 'Password for sign in. When editing existing users, leave blank to keep unchanged.',
    },
    {
      name: 'role_id',
      label: 'Assigned Role',
      type: 'select',
      options: roleOptions,
      required: true,
      span: 2,
    },
    {
      name: 'is_active',
      label: 'Account Access (Active / Deactivated)',
      type: 'toggle',
      span: 2,
      hint: 'When enabled, the user can sign in and access their portal. When disabled, the account is deactivated and blocked from logging in.',
    },
  ];

  const toPayload = (values: Record<string, FieldValue>) => {
    const roleId = Number(values.role_id);
    const slug = (activeRoles.find((role) => role.id === roleId)?.slug ?? 'passenger') as RoleSlug;
    const passwordStr = String(values.password ?? '').trim();
    return {
      name: String(values.name).trim(),
      email: String(values.email).trim().toLowerCase(),
      phone: String(values.phone).trim(),
      ...(passwordStr ? { password: passwordStr } : {}),
      role_id: roleId,
      role: slug,
      is_active: Boolean(values.is_active ?? true),
      is_driver: slug === 'driver',
    };
  };

  return (
    <ResourceScreen<User>
      title="Staff & User Accounts"
      subtitle="Manage all portal users, staff accounts, terminal dispatchers, and assign role permissions that govern access to the system."
      singular="User"
      plural="Users"
      searchPlaceholder="Search name, email, phone or role…"
      emptyTitle="No users found"
      emptyBody="Accounts created here can sign in to the portal matching their assigned security role."
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'role',
          label: 'Any security role',
          icon: <ShieldCheckIcon className="h-4 w-4" aria-hidden />,
          options: activeRoles.map((role) => ({
            value: role.slug,
            label: role.name,
          })),
        },
      ]}
      load={({ page, perPage, search, filters }) =>
        usersApi.list({
          page,
          perPage,
          search,
          filters,
        })
      }
      withDateRange={true}
      renderCards={({ rows, meta }) => {
        const totalCount = meta.total || rows.length;
        const staff = rows.filter((u) => u.role === 'admin' || u.role === 'staff');
        const drivers = rows.filter((u) => u.role === 'driver' || u.is_driver);
        const passengers = rows.filter((u) => u.role === 'passenger' || (!u.role && !u.is_driver));

        return (
          <>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UsersIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Total Users</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {totalCount.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">All Registered Accounts</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShieldCheckIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Staff &amp; Admins</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {staff.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Station Desk &amp; System Ops</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <UserCheckIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Driver Accounts</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {drivers.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Fleet Crew Onboard</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserIcon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-fg">Passengers</span>
              </div>
              <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                {passengers.length.toLocaleString()}
              </p>
              <p className="text-[0.6875rem] text-muted">Active Customer Profiles</p>
            </div>
          </>
        );
      }}
      toFormValues={(user) => ({
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        password: '',
        role_id: String(user?.role_id ?? activeRoles[0]?.id ?? '4'),
        is_active: user ? (user.is_active !== false) : true,
      })}
      onCreate={async (values) => {
        await usersApi.create({
          ...toPayload(values),
          avatar: null,
          created_at: new Date().toISOString(),
        });
      }}
      onUpdate={async (user, values) => {
        await usersApi.update(user.id, toPayload(values));
      }}
      onDelete={async (user) => {
        await usersApi.remove(user.id);
      }}
      deleteConsequence={(user) =>
        `${user.name} will immediately lose sign-in access. Past booking manifests and ticket audit trails will remain preserved.`
      }
    />
  );
}