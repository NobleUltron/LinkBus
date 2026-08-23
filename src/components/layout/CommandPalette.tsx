import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BadgePercentIcon,
  BarChart3Icon,
  BellIcon,
  BriefcaseIcon,
  Building2Icon,
  BusIcon,
  CalendarClockIcon,
  CompassIcon,
  CreditCardIcon,
  CrownIcon,
  HelpCircleIcon,
  KeyIcon,
  LayersIcon,
  LockIcon,
  LuggageIcon,
  MapIcon,
  MapPinIcon,
  NavigationIcon,
  PackageCheckIcon,
  PackageIcon,
  QrCodeIcon,
  RadioIcon,
  ReceiptTextIcon,
  RouteIcon,
  SearchIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  TicketIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminPortal, driverPortal, passengerPortal, staffPortal } from './navConfig';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  to: string;
  portal: string;
  portalTone: 'admin' | 'staff' | 'driver' | 'passenger' | 'public';
  icon: React.ComponentType<{ className?: string }>;
  isQuickAction?: boolean;
}

const portalBadgeStyles: Record<string, string> = {
  admin: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30',
  staff: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
  driver: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30',
  passenger: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  public: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30',
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: BarChart3Icon,
  reports: TrendingUpIcon,
  pos: CreditCardIcon,
  bookings: CalendarClockIcon,
  tickets: TicketIcon,
  payments: WalletIcon,
  promo: BadgePercentIcon,
  trips: RouteIcon,
  routes: MapIcon,
  buses: BusIcon,
  terminals: Building2Icon,
  drivers: UserCheckIcon,
  luggage: LuggageIcon,
  parcels: PackageIcon,
  users: UsersIcon,
  roles: ShieldCheckIcon,
  ads: RadioIcon,
  settings: KeyIcon,
  checkin: QrCodeIcon,
  search: SearchIcon,
  profile: UsersIcon,
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { user, isAdmin, isStaff, isDriver, isPassenger } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter Quick Actions strictly based on RBAC role
  const filteredQuickActions = useMemo(() => {
    const actions: CommandItem[] = [];

    // Admin quick actions
    if (isAdmin) {
      actions.push(
        {
          id: 'qa-admin-settings',
          title: 'System Settings & Security',
          subtitle: 'Branding, SMTP Gmail, WhatsApp gateway & audit logs',
          to: '/admin/settings',
          portal: 'Admin Command',
          portalTone: 'admin',
          icon: ShieldCheckIcon,
          isQuickAction: true,
        },
        {
          id: 'qa-admin-payments',
          title: 'Financial Settlements Ledger',
          subtitle: 'Bank of Uganda compliance, MoMo & card audit trail',
          to: '/admin/payments',
          portal: 'Admin Command',
          portalTone: 'admin',
          icon: WalletIcon,
          isQuickAction: true,
        }
      );
    }

    // Staff / Admin quick actions
    if (isAdmin || isStaff) {
      actions.push(
        {
          id: 'qa-pos',
          title: 'Launch POS Counter Sales',
          subtitle: 'Issue walk-in passenger tickets with quick-change cash calculator',
          to: isAdmin ? '/admin/pos' : '/staff/pos',
          portal: 'Terminal POS',
          portalTone: 'staff',
          icon: CreditCardIcon,
          isQuickAction: true,
        },
        {
          id: 'qa-checkin',
          title: 'Open Gate QR Check-In Scanner',
          subtitle: 'Camera barcode reader for passenger gate boarding',
          to: isAdmin ? '/admin/checkin' : '/staff/checkin',
          portal: 'Gate Scanner',
          portalTone: 'staff',
          icon: QrCodeIcon,
          isQuickAction: true,
        },
        {
          id: 'qa-parcel',
          title: 'Cargo & Parcel Waybill Desk',
          subtitle: 'Dispatch same-day parcels with secure pickup PINs',
          to: isAdmin ? '/admin/parcels' : '/staff/parcels',
          portal: 'Cargo Desk',
          portalTone: 'staff',
          icon: PackageCheckIcon,
          isQuickAction: true,
        }
      );
    }

    // Driver quick actions
    if (isAdmin || isDriver) {
      actions.push({
        id: 'qa-driver-trips',
        title: 'Captain Assigned Departures',
        subtitle: 'Live trip manifests, phone dialer & GPS navigation',
        to: '/driver/trips',
        portal: 'Captain Cockpit',
        portalTone: 'driver',
        icon: BusIcon,
        isQuickAction: true,
      });
    }

    // Passenger / Public quick actions (Available to all authorized roles)
    actions.push(
      {
        id: 'qa-book',
        title: 'Book Intercity Trip',
        subtitle: '10-minute hold seat picker and MoMo checkout',
        to: '/passenger/book',
        portal: 'Passenger Suite',
        portalTone: 'passenger',
        icon: TicketIcon,
        isQuickAction: true,
      },
      {
        id: 'qa-my-tickets',
        title: 'My Digital Boarding Passes',
        subtitle: 'View active trip QR passes, receipt download & share',
        to: '/passenger/tickets',
        portal: 'Passenger Suite',
        portalTone: 'passenger',
        icon: QrCodeIcon,
        isQuickAction: true,
      }
    );

    return actions;
  }, [isAdmin, isStaff, isDriver]);

  // Build searchable items filtered strictly by active user's portal access scope
  const allPortalItems = useMemo(() => {
    const list: CommandItem[] = [];

    const portalsToInclude: {
      name: string;
      tone: 'admin' | 'staff' | 'driver' | 'passenger';
      config: typeof adminPortal;
    }[] = [];

    // RBAC Gate: Only include portals the user has explicit permission for
    if (isAdmin) {
      portalsToInclude.push({ name: 'Admin Command', tone: 'admin', config: adminPortal });
      portalsToInclude.push({ name: 'Terminal Staff', tone: 'staff', config: staffPortal });
      portalsToInclude.push({ name: 'Coach Captain', tone: 'driver', config: driverPortal });
      portalsToInclude.push({ name: 'Passenger Suite', tone: 'passenger', config: passengerPortal });
    } else if (isStaff) {
      portalsToInclude.push({ name: 'Terminal Staff', tone: 'staff', config: staffPortal });
      portalsToInclude.push({ name: 'Coach Captain', tone: 'driver', config: driverPortal });
      portalsToInclude.push({ name: 'Passenger Suite', tone: 'passenger', config: passengerPortal });
    } else if (isDriver) {
      portalsToInclude.push({ name: 'Coach Captain', tone: 'driver', config: driverPortal });
      portalsToInclude.push({ name: 'Passenger Suite', tone: 'passenger', config: passengerPortal });
    } else {
      // Passenger or guest user
      portalsToInclude.push({ name: 'Passenger Suite', tone: 'passenger', config: passengerPortal });
    }

    portalsToInclude.forEach((p) => {
      (p.config?.groups || []).forEach((g) => {
        (g.items || []).forEach((item) => {
          const IconComp = iconMap[item.icon] || CompassIcon;
          list.push({
            id: `${p.tone}-${item.to}`,
            title: item.label,
            subtitle: `${p.name} • ${g.label}`,
            to: item.to,
            portal: p.name,
            portalTone: p.tone,
            icon: IconComp,
          });
        });
      });
    });

    // Public website discovery items (Accessible to all)
    list.push(
      {
        id: 'pub-home',
        title: 'Public Home & Schedule Tracker',
        subtitle: 'Main intercity route search and fleet showcase',
        to: '/',
        portal: 'Public Website',
        portalTone: 'public',
        icon: CompassIcon,
      },
      {
        id: 'pub-terminals',
        title: 'Terminal Stations & GPS Directory',
        subtitle: 'Regional station maps and supervisor hotlines',
        to: '/terminals',
        portal: 'Public Website',
        portalTone: 'public',
        icon: Building2Icon,
      },
      {
        id: 'pub-about',
        title: 'Corporate Heritage & Safety',
        subtitle: 'Company history, ISO certifications & fleet standards',
        to: '/about',
        portal: 'Public Website',
        portalTone: 'public',
        icon: ShieldCheckIcon,
      },
      {
        id: 'pub-faq',
        title: 'Frequently Asked Questions & Help',
        subtitle: 'Baggage allowances, MoMo payments & refund policies',
        to: '/faq',
        portal: 'Public Website',
        portalTone: 'public',
        icon: HelpCircleIcon,
      }
    );

    return list;
  }, [isAdmin, isStaff, isDriver, isPassenger]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [...filteredQuickActions, ...allPortalItems.slice(0, 6)];
    }
    const q = query.toLowerCase().trim();
    return allPortalItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.portal.toLowerCase().includes(q) ||
        item.to.toLowerCase().includes(q)
    );
  }, [filteredQuickActions, allPortalItems, query]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((prev) => (prev + 1) % Math.max(1, results.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((prev) => (prev - 1 + Math.max(1, results.length)) % Math.max(1, results.length));
      } else if (e.key === 'Enter' && results[cursor]) {
        e.preventDefault();
        navigate(results[cursor].to);
        onClose();
        setQuery('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, results, cursor, navigate, onClose]);

  if (!mounted) return null;

  // Active Role Display
  const roleLabel = isAdmin
    ? 'Root Admin Access'
    : isStaff
    ? 'Terminal Staff RBAC'
    : isDriver
    ? 'Coach Captain RBAC'
    : 'Passenger Travel RBAC';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-[10vh] overflow-hidden">
          {/* Full-bleed Backdrop Overlay */}
          <motion.div
            className="fixed inset-0 h-screen w-screen bg-slate-950/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Command Palette Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="LinkBus Universal Command Palette"
            className="modal-modern relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search Input Bar with Role Security Indicator */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3.5 bg-surface">
              <SearchIcon className="h-5 w-5 text-brand-600 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Type a screen name, shortcut, or destination (e.g. POS, Bookings, Terminals)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-fg placeholder-muted focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-fg"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="hidden rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[0.625rem] font-bold text-muted sm:inline-block">
                ESC
              </kbd>
            </div>

            {/* Content List */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="py-12 text-center">
                  <AlertCircleIcon className="mx-auto h-8 w-8 text-muted opacity-50" />
                  <p className="mt-2 text-sm font-semibold text-fg">No destinations found</p>
                  <p className="text-xs text-muted">
                    No authorized screens or operations matched <span className="font-mono font-bold">"{query}"</span>.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {!query.trim() && (
                    <div className="flex items-center justify-between px-2 pt-1">
                      <span className="flex items-center gap-1 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                        <ZapIcon className="h-3 w-3 text-amber-500" />
                        Quick Operations &amp; Workflows
                      </span>
                      <span className="inline-flex items-center gap-1 text-[0.625rem] font-semibold text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-line">
                        <LockIcon className="h-2.5 w-2.5 text-brand-600" />
                        {roleLabel}
                      </span>
                    </div>
                  )}

                  <ul className="space-y-1">
                    {results.map((item, idx) => {
                      const IconComp = item.icon;
                      const isSelected = cursor === idx;

                      return (
                        <li key={`${item.id}-${idx}`}>
                          <button
                            type="button"
                            onClick={() => {
                              navigate(item.to);
                              onClose();
                              setQuery('');
                            }}
                            onMouseEnter={() => setCursor(idx)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
                              isSelected
                                ? 'bg-brand-500/15 text-fg font-semibold shadow-sm'
                                : 'text-fg hover:bg-surface-2'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                  isSelected
                                    ? 'bg-brand-600 text-white border-brand-600'
                                    : 'bg-surface-2 text-muted border-line'
                                }`}
                              >
                                <IconComp className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-fg">
                                  {item.title}
                                </p>
                                {item.subtitle && (
                                  <p className="truncate text-[0.6875rem] text-muted">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[0.625rem] font-bold ${
                                  portalBadgeStyles[item.portalTone] || portalBadgeStyles.public
                                }`}
                              >
                                {item.portal}
                              </span>
                              {isSelected && (
                                <ArrowRightIcon className="h-3.5 w-3.5 text-brand-600 animate-pulse" />
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between border-t border-line bg-surface-2/60 px-4 py-2.5 text-[0.6875rem] text-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-surface border border-line px-1.5 py-0.5 font-mono font-bold">↑</kbd>
                  <kbd className="rounded bg-surface border border-line px-1.5 py-0.5 font-mono font-bold">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-surface border border-line px-1.5 py-0.5 font-mono font-bold">↵</kbd>
                  to select
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-fg font-semibold">
                <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-600" />
                <span>{roleLabel}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}