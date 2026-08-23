import React from 'react';
import { titleCase } from '../../utils/format';
type Tone = 'green' | 'amber' | 'blue' | 'red' | 'slate' | 'violet';
const tones: Record<Tone, string> = {
  green: 'bg-brand-600/12 text-brand-700 dark:text-brand-300 ring-brand-600/25',
  amber: 'bg-gold-500/15 text-gold-700 dark:text-gold-300 ring-gold-600/25',
  blue: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-sky-500/25',
  red: 'bg-red-500/12 text-red-700 dark:text-red-300 ring-red-500/25',
  slate: 'bg-slate-500/12 text-muted ring-slate-500/20',
  violet: 'bg-violet-500/12 text-violet-700 dark:text-violet-300 ring-violet-500/25'
};
const toneByStatus: Record<string, Tone> = {
  // trips
  scheduled: 'blue',
  boarding: 'amber',
  in_transit: 'violet',
  completed: 'green',
  cancelled: 'red',
  // bookings / payments / tickets
  confirmed: 'green',
  pending: 'amber',
  pending_payment: 'amber',
  failed: 'red',
  refunded: 'slate',
  active: 'green',
  used: 'slate',
  inactive: 'slate',
  // fleet
  maintenance: 'amber',
  retired: 'slate',
  suspended: 'red',
  on_leave: 'amber',
  // luggage / parcels
  checked_in: 'blue',
  delivered: 'green',
  lost: 'red',
  received: 'blue',
  arrived: 'violet'
};
interface StatusPillProps {
  status: string;
  label?: string;
  tone?: Tone;
}
export function StatusPill({
  status,
  label,
  tone
}: StatusPillProps) {
  const resolved = tone ?? toneByStatus[status] ?? 'slate';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[resolved]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label ?? titleCase(status)}
    </span>;
}
export function Badge({
  children,
  tone = 'slate'



}: {children: React.ReactNode;tone?: Tone;}) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>;
}