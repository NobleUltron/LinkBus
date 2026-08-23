import React from 'react';
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
interface StatCardProps {
  label: string;
  value: number;
  format?: (value: number) => string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  emphasis?: boolean;
}
export function StatCard({
  label,
  value,
  format,
  icon,
  trend,
  trendLabel,
  emphasis = false
}: StatCardProps) {
  const positive = (trend ?? 0) >= 0;
  return <article className={`stat-card hover-lift p-5 ${emphasis ? 'ring-1 ring-brand-600/30' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow pt-1.5">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${emphasis ? 'bg-brand-600 text-white' : 'bg-surface-2 text-brand-600 dark:text-brand-400'}`}>
          {icon}
        </span>
      </div>

      <p className={`mt-2.5 font-bold leading-none tracking-tight tabular-nums text-fg ${emphasis ? 'text-[1.75rem]' : 'text-2xl'}`}>
        <AnimatedCounter value={value} format={format} />
      </p>

      {trend !== undefined && <p className="mt-2.5 flex items-center gap-1.5 text-xs">
          <span className={`inline-flex items-center gap-1 font-semibold ${positive ? 'text-brand-700 dark:text-brand-300' : 'text-red-600 dark:text-red-300'}`}>
            {positive ? <TrendingUpIcon className="h-3.5 w-3.5" aria-hidden /> : <TrendingDownIcon className="h-3.5 w-3.5" aria-hidden />}
            {positive ? '+' : ''}
            {trend}%
          </span>
          <span className="text-muted">{trendLabel ?? 'vs previous period'}</span>
        </p>}
    </article>;
}