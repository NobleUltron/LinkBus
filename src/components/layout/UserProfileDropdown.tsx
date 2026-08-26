import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, LayoutDashboardIcon, LogOutIcon, SettingsIcon } from 'lucide-react';
import { useAuth, landingPathForRole } from '../../contexts/AuthContext';
import { getAvatarUrl, initials, titleCase } from '../../utils/format';
const settingsPathByRole: Record<string, string> = {
  admin: '/admin/profile',
  staff: '/staff/profile',
  driver: '/driver/profile',
  passenger: '/settings'
};
export function UserProfileDropdown() {
  const {
    user,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  if (!user) return null;
  const portalPath = landingPathForRole(user.role);
  const settingsPath = settingsPathByRole[user.role] ?? '/settings';
  return <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1.5 transition-colors duration-150 ease-smooth hover:bg-surface-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-600 text-xs font-bold text-white shadow-sm relative">
          <span className="select-none text-[0.625rem]">{initials(user.name)}</span>
          {user.avatar ? (
            <img
              src={getAvatarUrl(user.avatar)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : null}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[9rem] truncate text-xs font-semibold leading-tight text-fg">{user.name}</span>
          <span className="block text-[0.6875rem] leading-tight text-muted">{titleCase(user.role)}</span>
        </span>
        <ChevronDownIcon className="h-4 w-4 text-faint" aria-hidden />
      </button>

      <AnimatePresence>
        {open && <motion.div role="menu" initial={{
        opacity: 0,
        y: -6,
        scale: 0.98
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -4,
        scale: 0.98
      }} transition={{
        duration: 0.15,
        ease: [0.23, 1, 0.32, 1]
      }} className="modal-modern absolute right-0 z-40 mt-2 w-60 overflow-hidden p-1.5">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <Link to={portalPath} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg transition-colors duration-150 hover:bg-surface-2">
              <LayoutDashboardIcon className="h-4 w-4 text-muted" aria-hidden />
              {titleCase(user.role)} portal
            </Link>
            <Link to={settingsPath} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg transition-colors duration-150 hover:bg-surface-2">
              <SettingsIcon className="h-4 w-4 text-muted" aria-hidden />
              Profile & settings
            </Link>
            <div className="my-1 h-px bg-line" />
            <button type="button" role="menuitem" onClick={() => {
          setOpen(false);
          logout();
          navigate('/login', { replace: true, state: null });
        }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-red-600 transition-colors duration-150 hover:bg-red-500/10 dark:text-red-300">
              <LogOutIcon className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </motion.div>}
      </AnimatePresence>
    </div>;
}