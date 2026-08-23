import React from 'react';
import { CommandIcon, MenuIcon } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { UserProfileDropdown } from './UserProfileDropdown';
interface TopBarProps {
  title: string;
  subtitle: string;
  onOpenMenu: () => void;
  onOpenCommandPalette: () => void;
}
export function TopBar({
  title,
  subtitle,
  onOpenMenu,
  onOpenCommandPalette
}: TopBarProps) {
  return <header className="portal-top-bar flex h-16 items-center gap-2.5 px-4 sm:px-6">
      <button type="button" onClick={onOpenMenu} aria-label="Open navigation" className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg lg:hidden">
        <MenuIcon className="h-4 w-4" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[0.9375rem] font-semibold leading-6 text-fg sm:text-[1.0625rem]">{title}</h1>
        {subtitle && <p className="hidden truncate text-xs leading-4 text-muted sm:block">{subtitle}</p>}
      </div>

      <button type="button" onClick={onOpenCommandPalette} className="hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-muted transition-colors duration-150 ease-smooth hover:bg-surface-2 hover:text-fg md:flex">
        <CommandIcon className="h-3.5 w-3.5" aria-hidden />
        Jump to…
        <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-sans text-[0.625rem] font-semibold text-faint">Ctrl K</kbd>
      </button>

      <ThemeToggle />
      <NotificationBell />
      <UserProfileDropdown />
    </header>;
}