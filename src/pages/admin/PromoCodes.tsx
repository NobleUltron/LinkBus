import React, { useMemo, useState } from 'react';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  CoinsIcon,
  ExternalLinkIcon,
  FileSpreadsheetIcon,
  LockIcon,
  PencilIcon,
  PercentIcon,
  PlusIcon,
  SparklesIcon,
  TagIcon,
  Trash2Icon,
  TrendingUpIcon,
  UnlockIcon,
  XCircleIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { EmptyState } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { usePaginated } from '../../hooks/usePaginated';
import { errorMessage } from '../../hooks/useAsync';
import { promoCodesApi } from '../../services/crud';
import type { PromoCode } from '../../types/models';
import { formatDate, money } from '../../utils/format';

const typeOptions = [
  { value: 'percentage', label: 'Percentage Off (%)' },
  { value: 'fixed', label: 'Fixed Amount Off (UGX)' },
];

const statusFilterOptions = [
  { value: 'active', label: 'Active & Redeemable' },
  { value: 'inactive', label: 'Disabled / Inactive' },
];

const quickCampaignPresets = [
  {
    code: 'LINK10',
    description: '10% off intercity departures across all corridors',
    discount_type: 'percentage' as const,
    discount_value: 10,
    min_booking_amount: 30000,
    max_uses: 200,
    max_uses_per_user: 1,
    first_booking_only: false,
    daysValid: 30,
  },
  {
    code: 'FIRST5K',
    description: 'UGX 5,000 off for first-time passenger bookings',
    discount_type: 'fixed' as const,
    discount_value: 5000,
    min_booking_amount: 25000,
    max_uses: 500,
    max_uses_per_user: 1,
    first_booking_only: true,
    daysValid: 60,
  },
  {
    code: 'EASTER15',
    description: '15% Easter festive season special discount',
    discount_type: 'percentage' as const,
    discount_value: 15,
    min_booking_amount: 40000,
    max_uses: 300,
    max_uses_per_user: 2,
    first_booking_only: false,
    daysValid: 14,
  },
  {
    code: 'VIPPASS',
    description: 'UGX 8,000 flat voucher on VIP Executive Recliner coaches',
    discount_type: 'fixed' as const,
    discount_value: 8000,
    min_booking_amount: 45000,
    max_uses: 150,
    max_uses_per_user: 1,
    first_booking_only: false,
    daysValid: 45,
  },
];

export function PromoCodes() {
  const isExpired = (promo: PromoCode) => {
    if (!promo.expires_at) return false;
    return new Date(promo.expires_at).getTime() < Date.now();
  };

  const isExhausted = (promo: PromoCode) => (promo.used_count || 0) >= (promo.max_uses || 1);

  const getExpiryLabel = (expiresAt: string) => {
    if (!expiresAt) return 'No Expiry';
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    if (days < 0) return `Expired ${Math.abs(days)}d ago`;
    if (days === 0) return 'Expires Today';
    if (days <= 7) return `Expires in ${days} days`;
    return `Valid until ${formatDate(expiresAt)}`;
  };

  // Paginated promo codes state
  const state = usePaginated<PromoCode>(({ page, perPage, search, filters }) =>
    promoCodesApi.list({
      page,
      perPage,
      search,
      filters: {
        discount_type: filters.discount_type,
        is_active: filters.status === 'active' ? '1' : filters.status === 'inactive' ? '0' : '',
      },
    })
  );

  // Add promo state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as PromoCode['discount_type'],
    discount_value: '10',
    min_booking_amount: '0',
    max_uses: '100',
    max_uses_per_user: '1',
    first_booking_only: false,
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    is_active: true,
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // Edit promo state
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [editForm, setEditForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as PromoCode['discount_type'],
    discount_value: '10',
    min_booking_amount: '0',
    max_uses: '100',
    max_uses_per_user: '1',
    first_booking_only: false,
    expires_at: '',
    is_active: true,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editPending, setEditPending] = useState(false);

  // Preview & Delete state
  const [previewPromo, setPreviewPromo] = useState<PromoCode | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<PromoCode | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Metrics computation
  const metrics = useMemo(() => {
    const rows = state.rows;
    const activeCodes = rows.filter((p) => p.is_active && !isExpired(p) && !isExhausted(p));
    const exhausted = rows.filter((p) => isExhausted(p) || isExpired(p));
    const totalRedemptions = rows.reduce((sum, p) => sum + (p.used_count || 0), 0);

    return {
      total: state.meta.total || rows.length,
      activeCount: activeCodes.length,
      exhaustedCount: exhausted.length,
      totalRedemptions,
    };
  }, [state.rows, state.meta.total]);

  // Apply Preset
  const applyPreset = (preset: typeof quickCampaignPresets[0], isEdit = false) => {
    const expiry = new Date(Date.now() + preset.daysValid * 86400000).toISOString().slice(0, 10);
    const formVals = {
      code: preset.code,
      description: preset.description,
      discount_type: preset.discount_type,
      discount_value: String(preset.discount_value),
      min_booking_amount: String(preset.min_booking_amount),
      max_uses: String(preset.max_uses),
      max_uses_per_user: String(preset.max_uses_per_user),
      first_booking_only: preset.first_booking_only,
      expires_at: expiry,
      is_active: true,
    };

    if (isEdit) {
      setEditForm(formVals);
    } else {
      setAddForm(formVals);
    }
    toast.info(`Preset applied: ${preset.code} (${preset.description})`);
  };

  // Submit Add Promo
  const submitAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!addForm.code.trim()) errors.code = 'Promo code is required (e.g. LINK10).';
    if (!addForm.description.trim()) errors.description = 'Campaign description is required.';

    const discVal = parseFloat(addForm.discount_value);
    if (!addForm.discount_value || isNaN(discVal) || discVal <= 0) {
      errors.discount_value = 'Enter valid discount amount.';
    } else if (addForm.discount_type === 'percentage' && discVal > 100) {
      errors.discount_value = 'Percentage cannot exceed 100%.';
    }

    const maxU = parseInt(addForm.max_uses, 10);
    if (!addForm.max_uses || isNaN(maxU) || maxU < 1) errors.max_uses = 'Enter valid max usage cap (at least 1).';

    if (!addForm.expires_at) errors.expires_at = 'Campaign expiration date is required.';

    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAdding(true);
    try {
      await promoCodesApi.create({
        code: addForm.code.trim().toUpperCase(),
        description: addForm.description.trim(),
        discount_type: addForm.discount_type,
        discount_value: discVal,
        min_booking_amount: parseFloat(addForm.min_booking_amount) || 0,
        max_uses: maxU,
        max_uses_per_user: parseInt(addForm.max_uses_per_user, 10) || 1,
        first_booking_only: addForm.first_booking_only,
        expires_at: addForm.expires_at,
        is_active: addForm.is_active,
        used_count: 0,
      });

      toast.success(`Promo code "${addForm.code.trim().toUpperCase()}" created.`);
      setAddOpen(false);
      setAddForm({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '10',
        min_booking_amount: '0',
        max_uses: '100',
        max_uses_per_user: '1',
        first_booking_only: false,
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        is_active: true,
      });
      state.reload();
    } catch (err) {
      setAddErrors({ code: errorMessage(err) });
    } finally {
      setAdding(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (promo: PromoCode) => {
    setEditingPromo(promo);
    setEditForm({
      code: promo.code ?? '',
      description: promo.description ?? '',
      discount_type: promo.discount_type ?? 'percentage',
      discount_value: String(promo.discount_value ?? 10),
      min_booking_amount: String(promo.min_booking_amount ?? 0),
      max_uses: String(promo.max_uses ?? 100),
      max_uses_per_user: String(promo.max_uses_per_user ?? 1),
      first_booking_only: Boolean(promo.first_booking_only),
      expires_at: promo.expires_at ? promo.expires_at.slice(0, 10) : '',
      is_active: Boolean(promo.is_active),
    });
    setEditErrors({});
  };

  // Submit Edit Promo
  const submitEditPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;

    const errors: Record<string, string> = {};
    if (!editForm.code.trim()) errors.code = 'Promo code is required.';
    if (!editForm.description.trim()) errors.description = 'Campaign description is required.';

    const discVal = parseFloat(editForm.discount_value);
    if (!editForm.discount_value || isNaN(discVal) || discVal <= 0) {
      errors.discount_value = 'Valid discount amount required.';
    } else if (editForm.discount_type === 'percentage' && discVal > 100) {
      errors.discount_value = 'Percentage cannot exceed 100%.';
    }

    const maxU = parseInt(editForm.max_uses, 10);
    if (!editForm.max_uses || isNaN(maxU) || maxU < 1) errors.max_uses = 'Valid max usage cap required.';

    if (!editForm.expires_at) errors.expires_at = 'Expiration date is required.';

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditPending(true);
    try {
      await promoCodesApi.update(editingPromo.id, {
        code: editForm.code.trim().toUpperCase(),
        description: editForm.description.trim(),
        discount_type: editForm.discount_type,
        discount_value: discVal,
        min_booking_amount: parseFloat(editForm.min_booking_amount) || 0,
        max_uses: maxU,
        max_uses_per_user: parseInt(editForm.max_uses_per_user, 10) || 1,
        first_booking_only: editForm.first_booking_only,
        expires_at: editForm.expires_at,
        is_active: editForm.is_active,
      });

      toast.success(`Promo code "${editForm.code.trim().toUpperCase()}" updated.`);
      setEditingPromo(null);
      state.reload();
    } catch (err) {
      setEditErrors({ code: errorMessage(err) });
    } finally {
      setEditPending(false);
    }
  };

  // Toggle Active State
  const handleToggleActive = async (promo: PromoCode) => {
    const nextActive = !promo.is_active;
    try {
      await promoCodesApi.update(promo.id, {
        ...promo,
        is_active: nextActive,
      });
      toast.success(
        nextActive
          ? `Promo "${promo.code}" enabled & active.`
          : `Promo "${promo.code}" deactivated & disabled.`
      );
      state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // Confirm Delete
  const confirmDelete = async () => {
    if (!deletingPromo) return;
    setDeletePending(true);
    try {
      await promoCodesApi.remove(deletingPromo.id);
      toast.success(`Promo code "${deletingPromo.code}" removed.`);
      setDeletingPromo(null);
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
      toast.error('No promo codes to export');
      return;
    }

    const headers = [
      'Campaign ID',
      'Promo Code',
      'Description',
      'Discount Type',
      'Discount Value',
      'Min Spend (UGX)',
      'Total Redemptions',
      'Max Uses Cap',
      'Max Uses / User',
      'First Ride Only',
      'Expiry Date',
      'Active Status',
    ];

    const csvRows = state.rows.map((p) => [
      p.id,
      `"${p.code}"`,
      `"${p.description.replace(/"/g, '""')}"`,
      p.discount_type,
      p.discount_value,
      p.min_booking_amount,
      p.used_count || 0,
      p.max_uses,
      p.max_uses_per_user ?? 1,
      p.first_booking_only ? 'Yes' : 'No',
      `"${p.expires_at ? formatDate(p.expires_at) : 'No Expiry'}"`,
      p.is_active ? 'Active' : 'Disabled',
    ]);

    const csv = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linkbus_promotions_registry_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Promo codes exported to CSV');
  };

  // DataTable columns
  const columns: Column<PromoCode>[] = [
    {
      key: 'code',
      header: 'Coupon Code & Campaign',
      render: (promo) => (
        <div className="py-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 font-mono text-xs font-black text-brand-700 dark:text-brand-300 tracking-wider shadow-2xs">
              <TagIcon className="h-3 w-3" />
              {promo.code}
            </span>
            {promo.first_booking_only && (
              <span className="inline-flex items-center rounded bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[0.625rem] font-bold text-blue-700 dark:text-blue-300">
                1st Ride Only
              </span>
            )}
            <span className="inline-flex items-center rounded bg-surface-2 border border-line px-1.5 py-0.5 text-[0.625rem] font-semibold text-muted">
              {promo.max_uses_per_user === 0 ? 'Unlimited/user' : `Max ${promo.max_uses_per_user ?? 1}/user`}
            </span>
          </div>
          <p className="text-xs text-fg font-medium mt-1">{promo.description}</p>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount Structure',
      render: (promo) => {
        const isPercent = promo.discount_type === 'percentage';
        return (
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                isPercent
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
              }`}
            >
              {isPercent ? `${promo.discount_value}% OFF` : `${money(promo.discount_value)} OFF`}
            </span>
            <p className="text-[0.6875rem] text-muted mt-0.5">
              {isPercent ? 'Base Fare Percentage' : 'Flat Cash Voucher'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'minimum',
      header: 'Min. Spend',
      align: 'left',
      hideBelow: 'md',
      render: (promo) => (
        <div>
          <span className="tabular-nums font-bold text-fg text-xs">
            {promo.min_booking_amount > 0 ? money(promo.min_booking_amount) : 'No Minimum'}
          </span>
          <p className="text-[0.6875rem] text-muted">Subtotal required</p>
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'Usage & Redemptions',
      render: (promo) => {
        const max = promo.max_uses || 1;
        const used = promo.used_count || 0;
        const pct = Math.min(100, Math.round((used / max) * 100));
        const exhausted = isExhausted(promo);
        const nearCap = pct >= 80;

        return (
          <div className="min-w-32">
            <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
              <span className="font-bold tabular-nums text-fg">
                {used} / {max}
              </span>
              <span
                className={`text-[0.6875rem] font-bold ${
                  exhausted
                    ? 'text-red-600 dark:text-red-400'
                    : nearCap
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2 border border-line">
              <div
                className={`h-full rounded-full transition-all ${
                  exhausted ? 'bg-red-500' : nearCap ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
              />
            </div>
            <span className="text-[0.625rem] text-muted">
              {Math.max(0, max - used)} redemptions left
            </span>
          </div>
        );
      },
    },
    {
      key: 'expires',
      header: 'Campaign Expiry',
      hideBelow: 'lg',
      render: (promo) => {
        const expired = isExpired(promo);
        const label = getExpiryLabel(promo.expires_at);

        return (
          <div>
            <span
              className={`text-xs font-semibold block ${
                expired ? 'text-red-600 dark:text-red-400 font-bold' : 'text-fg'
              }`}
            >
              {label}
            </span>
            <span className="text-[0.6875rem] text-muted font-mono">
              {promo.expires_at ? formatDate(promo.expires_at) : '—'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (promo) => {
        const expired = isExpired(promo);
        const exhausted = isExhausted(promo);

        return (
          <StatusPill
            status={promo.is_active ? 'active' : 'inactive'}
            label={
              !promo.is_active
                ? 'Disabled'
                : expired
                ? 'Expired'
                : exhausted
                ? 'Cap Reached'
                : 'Active Code'
            }
            tone={
              !promo.is_active ? 'slate' : expired || exhausted ? 'red' : 'green'
            }
          />
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (promo) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<TagIcon className="h-3.5 w-3.5" />}
            onClick={() => setPreviewPromo(promo)}
            title="View Voucher Details"
          >
            Overview
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PencilIcon className="h-3.5 w-3.5" />}
            onClick={() => openEditModal(promo)}
            title="Edit Campaign"
          >
            Edit
          </Button>

          <button
            type="button"
            onClick={() => handleToggleActive(promo)}
            title={promo.is_active ? 'Disable Promo Code' : 'Enable Promo Code'}
            className={`rounded-lg p-1.5 transition-colors ${
              promo.is_active
                ? 'text-muted hover:bg-amber-500/15 hover:text-amber-600'
                : 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
            }`}
          >
            {promo.is_active ? (
              <LockIcon className="h-4 w-4" aria-hidden />
            ) : (
              <UnlockIcon className="h-4 w-4" aria-hidden />
            )}
          </button>

          <button
            type="button"
            onClick={() => setDeletingPromo(promo)}
            aria-label={`Remove ${promo.code}`}
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
            Promo Codes &amp; Discount Campaigns
          </h1>
          <p className="mt-1 text-xs text-muted max-w-xl">
            Create promotional coupon codes, enforce minimum booking spends, configure redemption usage caps, and schedule automated campaign expiration dates.
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
            + Create Promo Code
          </Button>
        </div>
      </div>

      {/* ── KPI Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Campaigns */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold">
              <TagIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Total Campaigns
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.total.toLocaleString()}
          </p>
          <p className="text-[0.6875rem] text-muted">
            Promo codes on file
          </p>
        </div>

        {/* Active Campaigns */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Active Campaigns
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-emerald-950 dark:text-emerald-100 tabular-nums">
            {metrics.activeCount.toLocaleString()} Codes
          </p>
          <p className="text-[0.6875rem] text-emerald-800 dark:text-emerald-300">
            Live &amp; redeemable at POS / online
          </p>
        </div>

        {/* Expired / Exhausted */}
        <div className={`rounded-2xl border p-4 shadow-sm hover-lift transition-all ${
          metrics.exhaustedCount > 0 ? 'border-red-500/30 bg-red-500/10' : 'border-line bg-surface'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              metrics.exhaustedCount > 0 ? 'bg-red-600 text-white' : 'bg-slate-500/10 text-slate-500'
            }`}>
              <AlertCircleIcon className="h-4 w-4" />
            </span>
            <span className={`text-xs font-bold ${
              metrics.exhaustedCount > 0 ? 'text-red-950 dark:text-red-200 uppercase tracking-wider' : 'text-fg uppercase tracking-wider'
            }`}>
              Cap Reached / Expired
            </span>
          </div>
          <p className={`mt-2 font-extrabold text-2xl tabular-nums ${
            metrics.exhaustedCount > 0 ? 'text-red-950 dark:text-red-100' : 'text-fg'
          }`}>
            {metrics.exhaustedCount.toLocaleString()} Codes
          </p>
          <p className={`text-[0.6875rem] ${
            metrics.exhaustedCount > 0 ? 'text-red-800 dark:text-red-300' : 'text-muted'
          }`}>
            Limit reached or past expiration
          </p>
        </div>

        {/* Total Redemptions */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUpIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg uppercase tracking-wider">
              Total Redemptions
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-fg tabular-nums">
            {metrics.totalRedemptions.toLocaleString()} Rides
          </p>
          <p className="text-[0.6875rem] text-muted">
            Passenger bookings discounted
          </p>
        </div>
      </div>

      {/* ── Promo Codes Table Panel ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search coupon code or campaign description..."
          filters={[
            {
              key: 'discount_type',
              label: 'All discount structures',
              options: typeOptions,
              icon: <PercentIcon className="h-4 w-4 text-brand-600" aria-hidden />,
            },
            {
              key: 'status',
              label: 'All active statuses',
              options: statusFilterOptions,
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />

        <DataTable<PromoCode>
          columns={columns}
          rows={state.rows}
          rowKey={(p) => p.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="Promotion Campaigns"
          empty={
            <EmptyState
              icon={<TagIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0
                  ? 'No promo codes match those filters'
                  : 'No promo campaigns created yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or discount type filter.'
                  : 'Create a promotional discount code to incentivize passenger bookings and POS ticket sales.'
              }
              action={
                state.activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={state.clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
                    Create First Promo Code
                  </Button>
                )
              }
            />
          }
        />
        <Pagination meta={state.meta} onPageChange={state.setPage} onPerPageChange={state.setPerPage} label="campaigns" />
      </Panel>

      {/* ── Create Promo Code Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create Promotional Coupon Campaign"
        subtitle="Configure discount structure, usage caps, and expiration rules"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" form="add-promo-form" loading={adding}>
              Create Promo Code
            </Button>
          </>
        }
      >
        <form id="add-promo-form" onSubmit={submitAddPromo} noValidate className="space-y-4">
          {/* Quick Presets */}
          <div className="rounded-xl border border-line bg-surface-2/60 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted mb-2">
              <SparklesIcon className="h-3.5 w-3.5 text-brand-600" />
              <span>Quick Campaign Presets:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickCampaignPresets.map((preset) => (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => applyPreset(preset, false)}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-bold text-fg hover:border-brand-500 hover:text-brand-600 transition-colors shadow-2xs"
                >
                  🏷️ {preset.code} ({preset.discount_type === 'percentage' ? `${preset.discount_value}%` : money(preset.discount_value)})
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="promo-code"
              label="Promo Code (Auto-Uppercase)"
              required
              placeholder="e.g. LINK10"
              value={addForm.code}
              error={addErrors.code}
              onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
              hint="Passengers enter this code at checkout."
            />

            <SelectField
              id="promo-type"
              label="Discount Structure"
              value={addForm.discount_type}
              options={typeOptions}
              onChange={(e) => setAddForm({ ...addForm, discount_type: e.target.value as PromoCode['discount_type'] })}
            />
          </div>

          <TextAreaField
            id="promo-desc"
            label="Campaign Headline &amp; Terms Description"
            required
            placeholder="e.g. 10% off intercity departures across all corridors"
            value={addForm.description}
            error={addErrors.description}
            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id="promo-value"
              label={addForm.discount_type === 'percentage' ? 'Discount Percentage (%)' : 'Discount Flat Cash (UGX)'}
              type="number"
              min={1}
              required
              placeholder={addForm.discount_type === 'percentage' ? '10' : '5000'}
              value={addForm.discount_value}
              error={addErrors.discount_value}
              onChange={(e) => setAddForm({ ...addForm, discount_value: e.target.value })}
            />

            <TextField
              id="promo-min"
              label="Min Subtotal Spend (UGX)"
              type="number"
              min={0}
              placeholder="0 (No Minimum)"
              value={addForm.min_booking_amount}
              onChange={(e) => setAddForm({ ...addForm, min_booking_amount: e.target.value })}
            />

            <TextField
              id="promo-max-uses"
              label="Total Redemption Cap"
              type="number"
              min={1}
              required
              placeholder="100"
              value={addForm.max_uses}
              error={addErrors.max_uses}
              onChange={(e) => setAddForm({ ...addForm, max_uses: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="promo-per-user"
              label="Max Uses Per Passenger (0 = Unlimited)"
              type="number"
              min={0}
              placeholder="1"
              value={addForm.max_uses_per_user}
              onChange={(e) => setAddForm({ ...addForm, max_uses_per_user: e.target.value })}
            />

            <TextField
              id="promo-expiry"
              label="Campaign Expiration Date"
              type="date"
              required
              value={addForm.expires_at}
              error={addErrors.expires_at}
              onChange={(e) => setAddForm({ ...addForm, expires_at: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <div className="rounded-xl border border-line bg-surface-2/60 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-fg">First-Time Riders Only</p>
                <p className="text-[0.6875rem] text-muted">Restrict discount to new users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.first_booking_only}
                  onChange={(e) => setAddForm({ ...addForm, first_booking_only: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            <div className="rounded-xl border border-line bg-surface-2/60 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-fg">Immediate Activation</p>
                <p className="text-[0.6875rem] text-muted">Active immediately upon creation</p>
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
          </div>
        </form>
      </Modal>

      {/* ── Edit Promo Code Modal ── */}
      <Modal
        open={Boolean(editingPromo)}
        onClose={() => setEditingPromo(null)}
        title="Edit Promotional Campaign"
        subtitle={editingPromo ? `Campaign Code: ${editingPromo.code}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingPromo(null)} disabled={editPending}>
              Cancel
            </Button>
            <Button type="submit" form="edit-promo-form" loading={editPending}>
              Save Changes
            </Button>
          </>
        }
      >
        <form id="edit-promo-form" onSubmit={submitEditPromo} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="edit-promo-code"
              label="Promo Code"
              required
              value={editForm.code}
              error={editErrors.code}
              onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
            />

            <SelectField
              id="edit-promo-type"
              label="Discount Structure"
              value={editForm.discount_type}
              options={typeOptions}
              onChange={(e) => setEditForm({ ...editForm, discount_type: e.target.value as PromoCode['discount_type'] })}
            />
          </div>

          <TextAreaField
            id="edit-promo-desc"
            label="Campaign Headline &amp; Terms Description"
            required
            value={editForm.description}
            error={editErrors.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id="edit-promo-value"
              label={editForm.discount_type === 'percentage' ? 'Discount Percentage (%)' : 'Discount Flat Cash (UGX)'}
              type="number"
              min={1}
              required
              value={editForm.discount_value}
              error={editErrors.discount_value}
              onChange={(e) => setEditForm({ ...editForm, discount_value: e.target.value })}
            />

            <TextField
              id="edit-promo-min"
              label="Min Subtotal (UGX)"
              type="number"
              min={0}
              value={editForm.min_booking_amount}
              onChange={(e) => setEditForm({ ...editForm, min_booking_amount: e.target.value })}
            />

            <TextField
              id="edit-promo-max-uses"
              label="Total Redemption Cap"
              type="number"
              min={1}
              required
              value={editForm.max_uses}
              error={editErrors.max_uses}
              onChange={(e) => setEditForm({ ...editForm, max_uses: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="edit-promo-per-user"
              label="Max Uses Per Passenger"
              type="number"
              min={0}
              value={editForm.max_uses_per_user}
              onChange={(e) => setEditForm({ ...editForm, max_uses_per_user: e.target.value })}
            />

            <TextField
              id="edit-promo-expiry"
              label="Expiration Date"
              type="date"
              required
              value={editForm.expires_at}
              error={editErrors.expires_at}
              onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <div className="rounded-xl border border-line bg-surface-2/60 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-fg">First-Time Riders Only</p>
                <p className="text-[0.6875rem] text-muted">Restrict discount to new users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.first_booking_only}
                  onChange={(e) => setEditForm({ ...editForm, first_booking_only: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            <div className="rounded-xl border border-line bg-surface-2/60 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-fg">Active &amp; Redeemable</p>
                <p className="text-[0.6875rem] text-muted">Allow code to be applied at checkout</p>
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
          </div>
        </form>
      </Modal>

      {/* ── Promo Overview / Voucher Details Modal ── */}
      <Modal
        open={Boolean(previewPromo)}
        onClose={() => setPreviewPromo(null)}
        title="Promotional Voucher Overview"
        subtitle={previewPromo ? `Campaign Code: ${previewPromo.code}` : undefined}
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              icon={<PencilIcon className="h-4 w-4" />}
              onClick={() => {
                const p = previewPromo;
                setPreviewPromo(null);
                if (p) openEditModal(p);
              }}
            >
              Edit Campaign
            </Button>
            <Button variant="outline" onClick={() => setPreviewPromo(null)}>
              Close
            </Button>
          </>
        }
      >
        {previewPromo && (() => {
          const isPercent = previewPromo.discount_type === 'percentage';
          const max = previewPromo.max_uses || 1;
          const used = previewPromo.used_count || 0;
          const pct = Math.min(100, Math.round((used / max) * 100));
          const expired = isExpired(previewPromo);
          const exhausted = isExhausted(previewPromo);

          return (
            <div className="space-y-4">
              {/* Voucher Visual Ticket */}
              <div className="rounded-2xl border-2 border-dashed border-brand-500/40 bg-brand-500/10 p-5 text-center relative overflow-hidden">
                <span className="text-[0.6875rem] font-black uppercase tracking-widest text-brand-700 dark:text-brand-300 block mb-1">
                  LinkBus Official Voucher
                </span>
                <span className="font-mono font-black text-3xl text-brand-950 dark:text-brand-100 tracking-wider">
                  {previewPromo.code}
                </span>
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-brand-600 text-white font-extrabold text-xs px-3 py-1 shadow-xs">
                    {isPercent ? `${previewPromo.discount_value}% OFF TOTAL FARE` : `${money(previewPromo.discount_value)} FLAT DISCOUNT`}
                  </span>
                </div>
                <p className="text-xs text-brand-800 dark:text-brand-300 mt-2 font-medium">
                  {previewPromo.description}
                </p>
              </div>

              {/* Campaign Parameters */}
              <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-line pb-2 text-xs font-black uppercase tracking-wider text-muted">
                  <CoinsIcon className="h-3.5 w-3.5 text-brand-600" />
                  Redemption Rules &amp; Caps
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted text-[0.625rem] font-bold uppercase block">Min Booking Subtotal</span>
                    <p className="font-bold text-fg">
                      {previewPromo.min_booking_amount > 0 ? money(previewPromo.min_booking_amount) : 'No Minimum'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted text-[0.625rem] font-bold uppercase block">Per-Passenger Limit</span>
                    <p className="font-bold text-fg">
                      {previewPromo.max_uses_per_user === 0 ? 'Unlimited' : `Max ${previewPromo.max_uses_per_user ?? 1} ride`}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted text-[0.625rem] font-bold uppercase block">Target Audience</span>
                    <p className="font-bold text-fg">
                      {previewPromo.first_booking_only ? 'First-Time Riders Only' : 'All Passengers & POS'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted text-[0.625rem] font-bold uppercase block">Validity Expiration</span>
                    <p className={`font-bold ${expired ? 'text-red-600' : 'text-fg'}`}>
                      {previewPromo.expires_at ? formatDate(previewPromo.expires_at) : 'No Expiry'}
                    </p>
                  </div>
                </div>

                {/* Usage Progress Bar */}
                <div className="pt-2 border-t border-line/60 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted">Total Redemptions Cap</span>
                    <span className="text-fg">{used} of {max} used ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2 border border-line">
                    <div
                      className={`h-full rounded-full transition-all ${
                        exhausted ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                    />
                  </div>
                  <span className="text-[0.6875rem] text-muted block text-right">
                    {Math.max(0, max - used)} redemptions remaining before cap
                  </span>
                </div>
              </div>

              {/* Quick Enable/Disable Button */}
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/60 p-3 text-xs">
                <span className="text-muted">Campaign is currently {previewPromo.is_active ? 'Active' : 'Disabled'}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    handleToggleActive(previewPromo);
                    setPreviewPromo({
                      ...previewPromo,
                      is_active: !previewPromo.is_active,
                    });
                  }}
                >
                  {previewPromo.is_active ? 'Disable Voucher' : 'Activate Voucher'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={Boolean(deletingPromo)}
        title="Delete Promo Code?"
        body={
          deletingPromo
            ? `The coupon code "${deletingPromo.code}" will be permanently removed. Passengers will no longer be able to redeem it.`
            : ''
        }
        confirmLabel="Delete Code"
        variant="danger"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingPromo(null)}
      />
    </div>
  );
}