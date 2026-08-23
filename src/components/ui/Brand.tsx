import React from 'react';
import { BusIcon } from 'lucide-react';
export function Logo({
  size = 'md',
  onDark = false,
  showWordmark = true




}: {size?: 'sm' | 'md' | 'lg';onDark?: boolean;showWordmark?: boolean;}) {
  const box = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const text = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  return <span className="flex items-center gap-2.5">
      <span className={`flex ${box} items-center justify-center rounded-xl bg-brand-600 text-white shadow-glow`}>
        <BusIcon className={icon} aria-hidden />
      </span>
      {showWordmark && <span className={`font-bold tracking-tight ${text} ${onDark ? 'text-white' : 'text-fg'}`}>
          Link<span className="text-brand-600 dark:text-brand-400">Bus</span>
        </span>}
    </span>;
}

/** Branded loading screen used by ProtectedRoute while the session is verified. */
export function BrandedLoader({
  message = 'Preparing your portal'


}: {message?: string;}) {
  return <div className="flex min-h-screen w-full flex-col items-center justify-center gap-5 bg-app px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow">
        <BusIcon className="h-7 w-7" aria-hidden />
      </span>
      <p className="text-sm font-medium text-muted">{message}</p>
      <span className="dot-bounce flex items-center gap-1.5" role="status" aria-label="Loading">
        <span className="h-2 w-2 rounded-full bg-brand-600" />
        <span className="h-2 w-2 rounded-full bg-brand-600" />
        <span className="h-2 w-2 rounded-full bg-brand-600" />
      </span>
    </div>;
}