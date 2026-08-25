import React from 'react';
import { PercentIcon, SparklesIcon, TagIcon } from 'lucide-react';
import type { Column } from '../../components/data/DataTable';
import type { FieldConfig, FieldValue } from '../../components/data/ResourceModal';
import { ResourceScreen } from '../../components/data/ResourceScreen';
import { StatusPill } from '../../components/ui/StatusPill';
import { promoCodesApi } from '../../services/crud';
import type { PromoCode } from '../../types/models';
import { formatDate, money } from '../../utils/format';

const typeOptions = [
  { value: 'percentage', label: 'Percentage Off (%)' },
  { value: 'fixed', label: 'Fixed Amount Off (UGX)' },
];

export function PromoCodes() {
  const isExpired = (promo: PromoCode) => {
    if (!promo.expires_at) return false;
    return new Date(promo.expires_at).getTime() < Date.now();
  };

  const isExhausted = (promo: PromoCode) => promo.used_count >= promo.max_uses;

  const getExpiryLabel = (expiresAt: string) => {
    if (!expiresAt) return 'No Expiry';
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    if (days < 0) return `Expired ${Math.abs(days)}d ago`;
    if (days === 0) return 'Expires Today';
    if (days <= 7) return `Expires in ${days} days`;
    return `Valid until ${formatDate(expiresAt)}`;
  };

  const columns: Column<PromoCode>[] = [
    {
      key: 'code',
      header: 'Coupon Code & Campaign',
      render: (promo) => (
        <div className="py-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-700 dark:text-brand-300 tracking-wider shadow-sm">
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
      header: 'Discount Value',
      render: (promo) => {
        const isPercent = promo.discount_type === 'percentage';
        return (
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isPercent
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
              }`}
            >
              {isPercent ? `${promo.discount_value}% OFF` : `${money(promo.discount_value)} OFF`}
            </span>
            <p className="text-[0.6875rem] text-muted mt-0.5">
              {isPercent ? 'Off Base Fare' : 'Flat Discount'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'minimum',
      header: 'Min. Booking Spend',
      align: 'left',
      hideBelow: 'md',
      render: (promo) => (
        <div>
          <span className="tabular-nums font-bold text-fg text-xs">
            {promo.min_booking_amount > 0 ? money(promo.min_booking_amount) : 'No Minimum'}
          </span>
          <p className="text-[0.6875rem] text-muted">Pre-tax subtotal</p>
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
                {used} / {max} used
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
              {formatDate(promo.expires_at)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Campaign Status',
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
                ? 'Limit Reached'
                : 'Active Code'
            }
            tone={
              !promo.is_active ? 'slate' : expired || exhausted ? 'red' : 'green'
            }
          />
        );
      },
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'code',
      label: 'Promo Code (Uppercase)',
      required: true,
      placeholder: 'e.g. LINK10 or EASTER2026',
      hint: 'Passengers type this at online checkout or counter cashiers apply at the POS.',
    },
    {
      name: 'description',
      label: 'Campaign Title / Description',
      required: true,
      placeholder: 'e.g. 10% off intercity departures across all corridors',
    },
    {
      name: 'discount_type',
      label: 'Discount Structure',
      type: 'select',
      options: typeOptions,
      required: true,
    },
    {
      name: 'discount_value',
      label: 'Discount Amount (Percentage % or Flat UGX)',
      type: 'number',
      min: 1,
      required: true,
      placeholder: 'e.g. 10 for 10% or 5000 for UGX 5,000',
    },
    {
      name: 'min_booking_amount',
      label: 'Minimum Subtotal Spend (UGX)',
      type: 'number',
      min: 0,
      required: true,
      hint: 'Minimum cart subtotal required to activate this promo discount.',
    },
    {
      name: 'max_uses',
      label: 'Total Campaign Redemption Cap',
      type: 'number',
      min: 1,
      required: true,
      hint: 'Total redemptions across all passengers combined before the code exhausts.',
    },
    {
      name: 'max_uses_per_user',
      label: 'Max Redemptions Per Passenger (0 = Unlimited)',
      type: 'number',
      min: 0,
      required: false,
      placeholder: '1',
      hint: 'Limits how many times a single customer can redeem this code (e.g. 1 for single-use).',
    },
    {
      name: 'first_booking_only',
      label: 'First-Time Passenger Only (New Riders)',
      type: 'toggle',
      hint: 'Restricts this promo to passengers booking their very first trip on LinkBus.',
    },
    {
      name: 'expires_at',
      label: 'Campaign Expiration Date',
      type: 'date',
      required: true,
    },
    {
      name: 'is_active',
      label: 'Campaign Active & Redeemable',
      type: 'toggle',
      hint: 'Deactivated codes are immediately rejected at checkout.',
    },
  ];

  const toPayload = (values: Record<string, FieldValue>) => ({
    code: String(values.code).toUpperCase().trim(),
    description: String(values.description),
    discount_type: String(values.discount_type) as PromoCode['discount_type'],
    discount_value: Number(values.discount_value),
    min_booking_amount: Number(values.min_booking_amount),
    max_uses: Number(values.max_uses),
    max_uses_per_user: values.max_uses_per_user !== undefined && values.max_uses_per_user !== '' ? Number(values.max_uses_per_user) : 1,
    first_booking_only: Boolean(values.first_booking_only),
    is_active: Boolean(values.is_active),
    expires_at: String(values.expires_at),
  });

  return (
    <ResourceScreen<PromoCode>
      title="Promo Codes & Discount Campaigns"
      subtitle="Manage promotional coupon codes, set percentage or flat UGX discounts, enforce usage redemption caps, and schedule campaign expiration dates."
      singular="Promo code"
      plural="Promo codes"
      searchPlaceholder="Search code or campaign description…"
      emptyTitle="No promo codes created"
      emptyBody="Create a promotional coupon code to run discount campaigns on passenger bookings and terminal POS."
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'discount_type',
          label: 'Any discount type',
          options: typeOptions,
          icon: <PercentIcon className="h-4 w-4" aria-hidden />,
        },
      ]}
      load={({ page, perPage, search, filters }) =>
        promoCodesApi.list({
          page,
          perPage,
          search,
          filters,
        })
      }
      toFormValues={(promo) => ({
        code: promo?.code ?? '',
        description: promo?.description ?? '',
        discount_type: promo?.discount_type ?? 'percentage',
        discount_value: promo?.discount_value ?? 10,
        min_booking_amount: promo?.min_booking_amount ?? 0,
        max_uses: promo?.max_uses ?? 100,
        expires_at: promo?.expires_at ?? '',
        is_active: promo?.is_active ?? true,
      })}
      onCreate={async (values) => {
        await promoCodesApi.create({
          ...toPayload(values),
          used_count: 0,
        });
      }}
      onUpdate={async (promo, values) => {
        await promoCodesApi.update(promo.id, toPayload(values));
      }}
      onDelete={async (promo) => {
        await promoCodesApi.remove(promo.id);
      }}
      deleteConsequence={(promo) =>
        `The coupon code ${promo.code} will stop working immediately. Past bookings that already applied it will keep their discounted fare.`
      }
    />
  );
}