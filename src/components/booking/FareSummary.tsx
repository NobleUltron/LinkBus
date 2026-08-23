import React from 'react';
import type { FareBreakdown } from '../../utils/fare';
import { money } from '../../utils/format';
interface FareSummaryProps {
  fare: FareBreakdown;
  taxRate: number;
  seatCount: number;
  promoCode?: string | null;
  extraRows?: {
    label: string;
    value: string;
  }[];
}
export function FareSummary({
  fare,
  taxRate,
  seatCount,
  promoCode,
  extraRows
}: FareSummaryProps) {
  return <dl className="space-y-2 text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-muted">
          Subtotal · {seatCount} {seatCount === 1 ? 'seat' : 'seats'}
        </dt>
        <dd className="font-semibold tabular-nums text-fg">{money(fare.subtotal)}</dd>
      </div>

      {fare.discount > 0 && <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Discount {promoCode ? `(${promoCode})` : ''}</dt>
          <dd className="font-semibold tabular-nums text-brand-700 dark:text-brand-300">−{money(fare.discount)}</dd>
        </div>}

      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-muted">VAT {taxRate}%</dt>
        <dd className="font-semibold tabular-nums text-fg">{money(fare.taxAmount)}</dd>
      </div>

      {extraRows?.map((row) => <div key={row.label} className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">{row.label}</dt>
          <dd className="font-semibold tabular-nums text-fg">{row.value}</dd>
        </div>)}

      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2.5">
        <dt className="font-semibold text-fg">Total due</dt>
        <dd className="text-xl font-bold tabular-nums text-fg">{money(fare.total)}</dd>
      </div>
    </dl>;
}