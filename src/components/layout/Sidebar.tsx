import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDownIcon, LogOutIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl, initials, titleCase } from '../../utils/format';
import { Logo } from '../ui/Brand';
import { NavGlyph } from './NavIcons';
import type { PortalConfig } from './navConfig';
interface SidebarProps {
  portal: PortalConfig;
  onNavigate?: () => void;
}
export function Sidebar({
  portal,
  onNavigate
}: SidebarProps) {
  const {
    user,
    logout
  } = useAuth();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (label: string) => setCollapsed((current) => ({
    ...current,
    [label]: !current[label]
  }));
  return <div className="sidebar-shell flex h-full w-[280px] flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Link to="/" onClick={onNavigate} aria-label="Link Bus Services home">
          <Logo onDark />
        </Link>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-white/70">
          {portal.name}
        </span>
      </div>

      <nav aria-label={`${portal.name} navigation`} className="thin-scroll flex-1 overflow-y-auto px-3 pb-4">
        {portal.groups.map((group) => {
        const isCollapsed = collapsed[group.label] ?? false;
        return <div key={group.label} className="mb-1.5">
              <button type="button" onClick={() => toggle(group.label)} aria-expanded={!isCollapsed} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--sidebar-muted)] transition-colors duration-150 hover:text-white/70">
                {group.label}
                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-150 ease-smooth ${isCollapsed ? '-rotate-90' : ''}`} aria-hidden />
              </button>

              {!isCollapsed && <ul className="space-y-0.5">
                  {group.items.map((item) => <li key={item.to}>
                      <NavLink to={item.to} end={item.end} onClick={onNavigate} className={({
                isActive
              }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
                        <NavGlyph icon={item.icon} />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    </li>)}
                </ul>}
            </div>;
      })}
      </nav>

      {user && <div className="border-t border-[var(--sidebar-border)] p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-600 text-xs font-bold text-white shadow-sm relative">
              <span className="select-none text-xs">{initials(user.name)}</span>
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
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
              <span className="block truncate text-xs text-[var(--sidebar-muted)]">{titleCase(user.role)}</span>
            </span>
            <button type="button" onClick={logout} aria-label="Sign out" className="rounded-lg p-1.5 text-[var(--sidebar-muted)] transition-colors duration-150 hover:bg-white/10 hover:text-white">
              <LogOutIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>}
    </div>;
}