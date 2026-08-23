import React from 'react';
import { AlertTriangleIcon, InboxIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from './Button';
export function SkeletonLoader({
  lines = 3,
  className = ''



}: {lines?: number;className?: string;}) {
  return <div className={`space-y-3 ${className}`} aria-hidden>
      {Array.from({
      length: lines
    }).map((_, index) => <div key={index} className="skeleton h-4" style={{
      width: `${100 - index * 12}%`
    }} />)}
    </div>;
}
export function SkeletonCards({
  count = 4,
  height = 'h-24'



}: {count?: number;height?: string;}) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
      {Array.from({
      length: count
    }).map((_, index) => <div key={index} className={`skeleton ${height} rounded-2xl`} />)}
    </div>;
}
export function SkeletonTable({
  rows = 6,
  columns = 5



}: {rows?: number;columns?: number;}) {
  return <div className="divide-y divide-line" aria-hidden>
      {Array.from({
      length: rows
    }).map((_, rowIndex) => <div key={rowIndex} className="flex items-center gap-4 px-5 py-3.5">
          {Array.from({
        length: columns
      }).map((__, colIndex) => <div key={colIndex} className="skeleton h-3.5" style={{
        width: colIndex === 0 ? '22%' : `${Math.max(9, 18 - colIndex * 2)}%`
      }} />)}
        </div>)}
    </div>;
}
interface EmptyStateProps {
  title: string;
  body: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}
export function EmptyState({
  title,
  body,
  icon,
  action,
  compact = false
}: EmptyStateProps) {
  return <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-6 py-10' : 'px-6 py-16'}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        {icon ?? <InboxIcon className="h-5 w-5" aria-hidden />}
      </div>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>;
}
export function ErrorState({
  message,
  onRetry



}: {message: string;onRetry?: () => void;}) {
  return <div role="alert" className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/12 text-red-600 dark:text-red-300">
        <AlertTriangleIcon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-fg">That didn’t load</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted">{message}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-5" icon={<RotateCcwIcon className="h-4 w-4" />} onClick={onRetry}>
          Try again
        </Button>}
    </div>;
}
export function InlineError({
  message


}: {message: string;}) {
  return <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
      <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>;
}