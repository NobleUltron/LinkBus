import React, { useMemo, useState } from 'react';
import {
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  KeyIcon,
  LockIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UnlockIcon,
  UserCheckIcon,
  UserCogIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  XCircleIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SelectField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { EmptyState } from '../../components/ui/States';
import { Badge } from '../../components/ui/StatusPill';
import { usePaginated } from '../../hooks/usePaginated';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { usersApi } from '../../services/crud';
import { getReferenceData } from '../../services/reference';
import type { RoleSlug, User } from '../../types/models';
import { formatDate, getAvatarUrl, initials, titleCase } from '../../utils/format';

const roleToneMap: Record<string, 'violet' | 'amber' | 'blue' | 'green' | 'slate'> = {
  admin: 'violet',
  staff: 'amber',
  driver: 'blue',
  passenger: 'green',
};

const roleIconMap: Record<string, React.ReactNode> = {
  admin: <ShieldCheckIcon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />,
  staff: <UserCogIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
  driver: <UserCheckIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />,
  passenger: <UserIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
};

const statusOptions = [
  { value: 'active', label: 'Active Accounts Only' },
  { value: 'inactive', label: 'Deactivated Accounts Only' },
];

export function Users() {
  // Reference data for roles
  const reference = useAsync(() => getReferenceData(), []);
  const roles = reference.data?.roles && reference.data.roles.length > 0
    ? reference.data.roles
    : [
        { id: 1, name: 'Administrator', slug: 'admin' },
        { id: 2, name: 'Staff / Dispatcher', slug: 'staff' },
        { id: 3, name: 'Coach Captain / Driver', slug: 'driver' },
        { id: 4, name: 'Passenger / Customer', slug: 'passenger' },
      ];

  const roleFilterOptions = roles.map((role) => ({
    value: role.slug,
    label: role.name,
  }));

  // Paginated user list
  const state = usePaginated<User>(({ page, perPage, search, filters }) =>
    usersApi.list({
      page,
      perPage,
      search,
      filters: {
        role: filters.role,
        is_active: filters.status === 'active' ? '1' : filters.status === 'inactive' ? '0' : '',
      },
    })
  );

  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role_id: '4',
    is_active: true,
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role_id: '4',
    is_active: true,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editPending, setEditPending] = useState(false);

  // Profile view & Delete state
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Scorecard metrics computation
  const metrics = useMemo(() => {
    const rows = state.rows;
    const staffCount = rows.filter((u) => u.role === 'admin' || u.role === 'staff').length;
    const driverCount = rows.filter((u) => u.role === 'driver' || u.is_driver).length;
    const passengerCount = rows.filter((u) => u.role === 'passenger' || (!u.role && !u.is_driver)).length;
    const deactivatedCount = rows.filter((u) => u.is_active === false).length;

    return {
      total: state.meta.total || rows.length,
      staffCount,
      driverCount,
      passengerCount,
      deactivatedCount,
    };
  }, [state.rows, state.meta.total]);

  // Submit Add User
  const submitAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!addForm.name.trim()) errors.name = 'Full name is required.';
    if (!addForm.email.trim() || !addForm.email.includes('@')) errors.email = 'Valid email address is required.';
    if (!addForm.password.trim() || addForm.password.length < 6) errors.password = 'Password must be at least 6 characters.';

    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAdding(true);
    try {
      const roleIdNum = Number(addForm.role_id);
      const roleObj = roles.find((r) => r.id === roleIdNum);
      const slug = (roleObj?.slug ?? 'passenger') as RoleSlug;

      await usersApi.create({
        name: addForm.name.trim(),
        email: addForm.email.trim().toLowerCase(),
        phone: addForm.phone.trim(),
        password: addForm.password.trim(),
        role_id: roleIdNum,
        role: slug,
        is_active: addForm.is_active,
        is_driver: slug === 'driver',
        avatar: null,
        created_at: new Date().toISOString(),
      });

      toast.success(`Account for "${addForm.name.trim()}" created successfully.`);
      setAddOpen(false);
      setAddForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role_id: '4',
        is_active: true,
      });
      state.reload();
    } catch (err) {
      setAddErrors({ email: errorMessage(err) });
    } finally {
      setAdding(false);
    }
  };

  // Open Edit User Modal
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      password: '',
      role_id: String(user.role_id ?? roles.find((r) => r.slug === user.role)?.id ?? 4),
      is_active: user.is_active !== false,
    });
    setEditErrors({});
  };

  // Submit Edit User
  const submitEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) errors.name = 'Full name is required.';
    if (!editForm.email.trim() || !editForm.email.includes('@')) errors.email = 'Valid email address is required.';
    if (editForm.password && editForm.password.length < 6) errors.password = 'Password must be at least 6 characters.';

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditPending(true);
    try {
      const roleIdNum = Number(editForm.role_id);
      const roleObj = roles.find((r) => r.id === roleIdNum);
      const slug = (roleObj?.slug ?? 'passenger') as RoleSlug;

      await usersApi.update(editingUser.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        phone: editForm.phone.trim(),
        ...(editForm.password.trim() ? { password: editForm.password.trim() } : {}),
        role_id: roleIdNum,
        role: slug,
        is_active: editForm.is_active,
        is_driver: slug === 'driver',
      });

      toast.success(`Account details for "${editForm.name.trim()}" updated.`);
      setEditingUser(null);
      state.reload();
    } catch (err) {
      setEditErrors({ email: errorMessage(err) });
    } finally {
      setEditPending(false);
    }
  };

  // Toggle Account Active / Locked status
  const handleToggleActive = async (user: User) => {
    const nextState = user.is_active === false;
    try {
      await usersApi.update(user.id, {
        ...user,
        is_active: nextState,
      });
      toast.success(
        nextState
          ? `Account "${user.name}" unlocked & activated.`
          : `Account "${user.name}" deactivated & locked.`
      );
      state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // Confirm Delete User
  const confirmDelete = async () => {
    if (!deletingUser) return;
    setDeletePending(true);
    try {
      await usersApi.remove(deletingUser.id);
      toast.success(`User "${deletingUser.name}" account deleted.`);
      setDeletingUser(null);
      state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeletePending(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (!state.rows.length) {
      toast.error('No user accounts to export');
      return;
    }

    const headers = [
      'Account ID',
      'Full Name',
      'Email Address',
      'Phone Number',
      'Security Role',
      'Account Status',
      'Driver Roster',
      'Registration Date',
    ];

    const csvRows = state.rows.map((u) => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${(u.phone ?? '').replace(/"/g, '""')}"`,
      `"${u.role ?? 'passenger'}"`,
      u.is_active !== false ? 'Active' : 'Deactivated',
      u.is_driver || u.role === 'driver' ? 'Yes' : 'No',
      `"${formatDate(u.created_at)}"`,
    ]);

    const csv = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linkbus_user_accounts_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('User directory exported to CSV');
  };

  // DataTable columns
  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'Account & Identity',
      render: (user) => (
        <div className="flex items-center gap-3 py-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600/10 text-xs font-bold text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-sm relative">
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
            <p className="font-bold text-fg text-sm flex items-center gap-1.5">
              {user.name}
              {user.role === 'admin' && (
                <span className="inline-flex items-center rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 px-1 py-0.2 text-[0.625rem] font-extrabold uppercase tracking-wider">
                  Admin
                </span>
              )}
            </p>
            <p className="text-xs text-muted flex items-center gap-1">
              <MailIcon className="h-2.5 w-2.5 opacity-70" />
              {user.email}
            </p>
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
          <span className="font-mono text-xs font-semibold text-fg flex items-center gap-1">
            <PhoneIcon className="h-3 w-3 text-muted" />
            {user.phone || '—'}
          </span>
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
          <div className="flex items-center gap-1.5">
            {roleIconMap[roleKey] ?? <ShieldCheckIcon className="h-3.5 w-3.5 text-muted" />}
            <Badge tone={roleToneMap[roleKey] ?? 'slate'}>
              {user.role ? titleCase(user.role) : 'Passenger'}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Access Status',
      render: (user) => (
        <Badge tone={user.is_active !== false ? 'green' : 'red'}>
          {user.is_active !== false ? '● Active' : '✕ Deactivated'}
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
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (user) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<UserCheckIcon className="h-3.5 w-3.5" />}
            onClick={() => setProfileUser(user)}
            title="View Security & Profile"
          >
            Profile
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PencilIcon className="h-3.5 w-3.5" />}
            onClick={() => openEditModal(user)}
            title="Edit User Details"
          >
            Edit
          </Button>

          <button
            type="button"
            onClick={() => handleToggleActive(user)}
            title={user.is_active !== false ? 'Deactivate / Lock Account' : 'Activate / Unlock Account'}
            className={`rounded-lg p-1.5 transition-colors ${
              user.is_active !== false
                ? 'text-muted hover:bg-amber-500/15 hover:text-amber-600'
                : 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
            }`}
          >
            {user.is_active !== false ? (
              <LockIcon className="h-4 w-4" aria-hidden />
            ) : (
              <UnlockIcon className="h-4 w-4" aria-hidden />
            )}
          </button>

          <button
            type="button"
            onClick={() => setDeletingUser(user)}
            aria-label={`Delete ${user.name}`}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/15 hover:text-red-600"
          >
            <Trash2Icon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            User Accounts &amp; Access Control
          </h1>
          <p className="mt-1 text-xs text-muted max-w-xl">
            Manage all platform users, assign security roles and permissions, configure station dispatcher logins, and enforce account lockouts across LinkBus.
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
            + Register User
          </Button>
        </div>
      </div>

      {/* ── Account KPI Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Accounts */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              <UsersIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Total Accounts
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.total.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">
            All registered system identities
          </p>
        </div>

        {/* Staff & Admin Ops */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheckIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Staff &amp; Admins
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.staffCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">
            Station POS, dispatchers &amp; ops
          </p>
        </div>

        {/* Coach Captains */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserCheckIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Coach Captains
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.driverCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">
            Active highway fleet crew
          </p>
        </div>

        {/* Passengers / Customers */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Passengers
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.passengerCount.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">
            Public booking &amp; mobile app riders
          </p>
        </div>
      </div>

      {/* ── User Directory Table Panel ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search user name, email, phone or security role..."
          filters={[
            {
              key: 'role',
              label: 'All security roles',
              options: roleFilterOptions,
              icon: <ShieldCheckIcon className="h-4 w-4 text-brand-600" aria-hidden />,
            },
            {
              key: 'status',
              label: 'All account statuses',
              options: statusOptions,
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />

        <DataTable<User>
          columns={columns}
          rows={state.rows}
          rowKey={(u) => u.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="User Directory"
          empty={
            <EmptyState
              icon={<UsersIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0
                  ? 'No user accounts match those filters'
                  : 'No user accounts found'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or security role filter.'
                  : 'Register a user profile to give staff or passengers access to the platform.'
              }
              action={
                state.activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={state.clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
                    Register First User
                  </Button>
                )
              }
            />
          }
        />
        <Pagination meta={state.meta} onPageChange={state.setPage} label="users" />
      </Panel>

      {/* ── Register User Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Register New User Account"
        subtitle="Create login credentials and assign security role permissions"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" form="add-user-form" loading={adding}>
              Create User Account
            </Button>
          </>
        }
      >
        <form id="add-user-form" onSubmit={submitAddUser} noValidate className="space-y-4">
          <TextField
            id="user-name"
            label="Full Legal Name"
            required
            placeholder="e.g. John Mukasa"
            value={addForm.name}
            error={addErrors.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="user-email"
              label="Email Address"
              type="email"
              required
              placeholder="e.g. j.mukasa@linkbus.co.ug"
              value={addForm.email}
              error={addErrors.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            />

            <TextField
              id="user-phone"
              label="Phone Number (WhatsApp / SMS)"
              type="tel"
              placeholder="+256 700 000000"
              value={addForm.phone}
              error={addErrors.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="user-role"
              label="Assigned Security Role"
              value={addForm.role_id}
              options={roles.map((r) => ({
                value: String(r.id),
                label: r.name,
              }))}
              onChange={(e) => setAddForm({ ...addForm, role_id: e.target.value })}
            />

            <TextField
              id="user-password"
              label="Portal Sign-In Password"
              type="password"
              required
              placeholder="Min 6 characters"
              value={addForm.password}
              error={addErrors.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
            />
          </div>

          <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-fg">Immediate Portal Access</p>
              <p className="text-[0.6875rem] text-muted">Allow user to sign in immediately upon creation.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={addForm.is_active}
                onChange={(e) => setAddForm({ ...addForm, is_active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </form>
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Edit User Profile"
        subtitle={editingUser ? `Account #${editingUser.id} · ${editingUser.email}` : undefined}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={editPending}>
              Cancel
            </Button>
            <Button type="submit" form="edit-user-form" loading={editPending}>
              Save Changes
            </Button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={submitEditUser} noValidate className="space-y-4">
          <TextField
            id="edit-user-name"
            label="Full Legal Name"
            required
            value={editForm.name}
            error={editErrors.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="edit-user-email"
              label="Email Address"
              type="email"
              required
              value={editForm.email}
              error={editErrors.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />

            <TextField
              id="edit-user-phone"
              label="Phone Number"
              type="tel"
              value={editForm.phone}
              error={editErrors.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="edit-user-role"
              label="Assigned Security Role"
              value={editForm.role_id}
              options={roles.map((r) => ({
                value: String(r.id),
                label: r.name,
              }))}
              onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
            />

            <TextField
              id="edit-user-password"
              label="Reset Password (Optional)"
              type="password"
              placeholder="Leave empty to keep current"
              value={editForm.password}
              error={editErrors.password}
              hint="Only enter if changing user password."
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            />
          </div>

          <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-fg">Account Activation Status</p>
              <p className="text-[0.6875rem] text-muted">
                {editForm.is_active
                  ? 'Account is active and permitted to sign in.'
                  : 'Account is locked. User cannot sign in to any portal.'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </form>
      </Modal>

      {/* ── User Security & Profile Inspection Modal ── */}
      <Modal
        open={Boolean(profileUser)}
        onClose={() => setProfileUser(null)}
        title="User Profile & Security Audit"
        subtitle={profileUser ? `Platform Identity #${profileUser.id}` : undefined}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              icon={<PencilIcon className="h-4 w-4" />}
              onClick={() => {
                const u = profileUser;
                setProfileUser(null);
                if (u) openEditModal(u);
              }}
            >
              Edit Account
            </Button>
            <Button variant="outline" onClick={() => setProfileUser(null)}>
              Close
            </Button>
          </>
        }
      >
        {profileUser && (
          <div className="space-y-4">
            {/* Identity Card */}
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface-2/60 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-xl font-extrabold text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-sm relative overflow-hidden">
                {profileUser.avatar ? (
                  <img
                    src={getAvatarUrl(profileUser.avatar)}
                    alt={profileUser.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(profileUser.name) || <UserIcon className="h-8 w-8" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-lg text-fg truncate">{profileUser.name}</p>
                <div className="mt-1 flex flex-col gap-0.5 text-[0.6875rem] text-muted">
                  <span className="flex items-center gap-1.5 truncate">
                    <MailIcon className="h-3 w-3 shrink-0" />
                    {profileUser.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <PhoneIcon className="h-3 w-3 shrink-0" />
                    {profileUser.phone || 'No phone recorded'}
                  </span>
                </div>
              </div>
              <div className="ml-auto flex flex-col items-end gap-1.5">
                <Badge tone={roleToneMap[profileUser.role || 'passenger'] ?? 'slate'}>
                  {profileUser.role ? titleCase(profileUser.role) : 'Passenger'}
                </Badge>
                <Badge tone={profileUser.is_active !== false ? 'green' : 'red'}>
                  {profileUser.is_active !== false ? 'Active' : 'Locked'}
                </Badge>
              </div>
            </div>

            {/* Role & Access Permissions */}
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-line pb-2 text-xs font-black uppercase tracking-wider text-muted">
                <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-600" />
                Role &amp; Portal Privileges
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted text-[0.625rem] uppercase tracking-wide font-bold mb-0.5">Assigned Role</p>
                  <p className="font-bold text-fg">{titleCase(profileUser.role || 'passenger')}</p>
                </div>
                <div>
                  <p className="text-muted text-[0.625rem] uppercase tracking-wide font-bold mb-0.5">Driver Certified</p>
                  <p className="font-bold text-fg">
                    {profileUser.is_driver || profileUser.role === 'driver' ? '✓ Coach Captain' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-[0.625rem] uppercase tracking-wide font-bold mb-0.5">Account Status</p>
                  <p className={`font-bold ${profileUser.is_active !== false ? 'text-emerald-600' : 'text-red-600'}`}>
                    {profileUser.is_active !== false ? 'Active & Permitted' : 'Deactivated / Blocked'}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-[0.625rem] uppercase tracking-wide font-bold mb-0.5">Registered Since</p>
                  <p className="font-bold text-fg">{formatDate(profileUser.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Quick Access Status Action */}
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/60 p-3 text-xs">
              <span className="text-muted">Need to revoke sign-in privileges?</span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  handleToggleActive(profileUser);
                  setProfileUser({
                    ...profileUser,
                    is_active: profileUser.is_active === false,
                  });
                }}
              >
                {profileUser.is_active !== false ? 'Lock Account' : 'Unlock Account'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={Boolean(deletingUser)}
        title="Delete User Account?"
        body={
          deletingUser
            ? `Are you sure you want to delete ${deletingUser.name}'s account? They will immediately lose sign-in access. Past bookings and audit trails remain preserved.`
            : ''
        }
        confirmLabel="Delete User"
        variant="danger"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
}