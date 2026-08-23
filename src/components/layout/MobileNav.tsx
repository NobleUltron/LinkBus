import React from 'react';
import { NavLink } from 'react-router-dom';
import { NavGlyph } from './NavIcons';
import type { PortalConfig } from './navConfig';

/** Five key links promoted to a bottom bar on small screens. */
export function MobileNav({
  portal


}: {portal: PortalConfig;}) {
  const items = portal.groups.flatMap((group) => group.items).filter((item) => portal.mobile.includes(item.to)).sort((a, b) => portal.mobile.indexOf(a.to) - portal.mobile.indexOf(b.to)).slice(0, 5);
  return <nav aria-label="Primary" className="glass-header fixed bottom-0 left-0 right-0 z-30 flex border-t border-line px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 lg:hidden" style={{
    top: 'auto'
  }}>
      {items.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({
      isActive
    }) => `flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[0.625rem] font-semibold transition-colors duration-150 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-muted'}`}>
          <NavGlyph icon={item.icon} className="h-5 w-5" />
          <span className="truncate">{item.label}</span>
        </NavLink>)}
    </nav>;
}