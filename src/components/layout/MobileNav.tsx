import React from 'react';
import { NavLink } from 'react-router-dom';
import { NavGlyph } from './NavIcons';
import type { PortalConfig } from './navConfig';

/** Five key links promoted to a bottom bar on small screens. */
export function MobileNav({
  portal,
}: {
  portal: PortalConfig;
}) {
  const items = portal.groups
    .flatMap((group) => group.items)
    .filter((item) => portal.mobile.includes(item.to))
    .sort((a, b) => portal.mobile.indexOf(a.to) - portal.mobile.indexOf(b.to))
    .slice(0, 5);

  return (
    <nav
      aria-label="Primary Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-line bg-surface/92 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[0.625rem] font-semibold transition-all duration-150 active:scale-95 ${
              isActive
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-muted hover:text-fg'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute -top-2 h-1 w-6 rounded-full bg-brand-600 dark:bg-brand-400" />
              )}
              <NavGlyph
                icon={item.icon}
                className={`h-5 w-5 transition-transform duration-150 ${
                  isActive ? 'scale-110' : ''
                }`}
              />
              <span className="max-w-[4.5rem] truncate text-center leading-none">
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}