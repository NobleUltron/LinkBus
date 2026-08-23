import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  ArrowRightIcon,
  BellRingIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  MailIcon,
  MapPinIcon,
  MenuIcon,
  MessageSquareIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react';
import { landingPathForRole, useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Logo } from '../ui/Brand';
import { ThemeToggle } from '../ui/ThemeToggle';
import { subscribeToFareAlerts } from '../../services/newsletter';

const links = [
  { label: 'Find a trip', to: '/search' },
  { label: 'Services', to: '/services' },
  { label: 'Terminals', to: '/terminals' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export function PublicLayout() {
  const { user, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [alertInput, setAlertInput] = useState('');
  const [alertSubscribed, setAlertSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = alertInput.trim();
    if (!contact) return;

    setSubscribing(true);
    setAlertError(null);
    try {
      await subscribeToFareAlerts(contact, 'route_alerts_bar');
      setAlertSubscribed(true);
      setAlertInput('');
    } catch (err: any) {
      setAlertError(err?.message || 'Unable to subscribe right now. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-app">
      <header className="glass-header">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Link Bus Services home">
            <Logo />
          </Link>

          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ease-smooth ${
                    isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated && user ? (
              <Link
                to={landingPathForRole(user.role)}
                className="inline-flex h-9 items-center rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700"
              >
                My portal
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden h-9 items-center rounded-xl border border-line px-3.5 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-2 sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-9 items-center rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700"
                >
                  Create account
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg lg:hidden"
            >
              {open ? <XIcon className="h-4 w-4" aria-hidden /> : <MenuIcon className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>

        {open && (
          <nav aria-label="Mobile" className="border-t border-line px-4 pb-3 pt-2 lg:hidden">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Option B: Adaptive Light & Dark Mode Footer ── */}
      <footer className="relative overflow-hidden border-t border-line bg-surface text-fg transition-colors duration-200">
        {/* Soft Ambient Radial Glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[700px] rounded-full bg-brand-500/10 blur-[100px]" />

        {/* ── Pre-Footer: Route Alerts & Festive Schedule Subscription ── */}
        <div className="border-b border-line bg-surface-2/60">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
            <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-900 via-slate-900 to-brand-950 p-6 text-white shadow-xl sm:p-8">
              {/* Subtle background glow */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-brand-700/15 blur-3xl" />

              <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300">
                    <BellRingIcon className="h-3.5 w-3.5" />
                    Route & Holiday Fare Alerts
                  </div>
                  <h3 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
                    Get weekend fare alerts & festive schedules
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                    Be the first to know when advance holiday bookings open for Gulu, Mbarara, Fort Portal & Kasese corridors.
                  </p>
                </div>

                <div className="w-full lg:max-w-md">
                  {alertSubscribed ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 p-4 text-xs font-semibold text-emerald-200">
                      <CheckCircle2Icon className="h-5 w-5 text-emerald-400 shrink-0" />
                      <span>You're on the alert list! We'll notify you when new holiday schedules & discounts drop.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          required
                          disabled={subscribing}
                          placeholder="Enter phone (0700...) or email..."
                          value={alertInput}
                          onChange={(e) => setAlertInput(e.target.value)}
                          className="h-11 flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-4 text-xs text-white placeholder-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={subscribing}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-bold text-white shadow transition-all duration-150 hover:bg-brand-500 active:scale-95 disabled:opacity-50 shrink-0"
                        >
                          {subscribing ? 'Subscribing...' : 'Get Alerts'}
                          <ArrowRightIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {alertError && (
                        <p className="text-xs text-red-400">{alertError}</p>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Footer Navigation Columns ── */}
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6 lg:pt-10 lg:pb-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-12">
            {/* ── Col 1: Brand & Status ── */}
            <div className="sm:col-span-2 lg:col-span-4">
              <Logo />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                Uganda's premier digital coach network. Reserved seating, tracked luggage, and scan-and-go QR boarding across all 8 major regional terminals.
              </p>

              {/* Status Indicator */}
              <div className="mt-3.5 inline-flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                All 8 Regional Terminals Active
              </div>

              {/* WhatsApp Quick Chat */}
              <div className="mt-4">
                <a
                  href="https://wa.me/256705083933?text=Hello%20LinkBus%20Customer%20Support,%20I%20need%20assistance%20with%20my%20travel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-600 px-3.5 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-brand-700 active:scale-95"
                >
                  <MessageSquareIcon className="h-4 w-4" aria-hidden />
                  Chat on WhatsApp Support
                </a>
              </div>
            </div>

            {/* ── Col 2: Popular Corridors with Route Badges ── */}
            <div className="lg:col-span-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-fg">Popular Corridors</h2>
              <ul className="mt-3 space-y-1 text-xs">
                <li>
                  <Link
                    to="/search?origin=1&destination=3"
                    className="group flex items-center justify-between gap-2 rounded-xl border border-transparent p-1.5 transition-all duration-150 hover:border-line hover:bg-surface-2"
                  >
                    <span className="font-medium text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      Kampala ➔ Mbarara
                    </span>
                    <span className="rounded-md border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 text-[0.625rem] font-bold text-brand-600 dark:text-brand-400">
                      ⚡ 4h Express
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/search?origin=1&destination=2"
                    className="group flex items-center justify-between gap-2 rounded-xl border border-transparent p-1.5 transition-all duration-150 hover:border-line hover:bg-surface-2"
                  >
                    <span className="font-medium text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      Kampala ➔ Gulu
                    </span>
                    <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[0.625rem] font-bold text-blue-600 dark:text-blue-400">
                      🌙 Northern Line
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/search?origin=1&destination=4"
                    className="group flex items-center justify-between gap-2 rounded-xl border border-transparent p-1.5 transition-all duration-150 hover:border-line hover:bg-surface-2"
                  >
                    <span className="font-medium text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      Kampala ➔ Fort Portal
                    </span>
                    <span className="rounded-md border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 text-[0.625rem] font-bold text-brand-600 dark:text-brand-400">
                      ⛰️ Scenic Direct
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/search?origin=5&destination=1"
                    className="group flex items-center justify-between gap-2 rounded-xl border border-transparent p-1.5 transition-all duration-150 hover:border-line hover:bg-surface-2"
                  >
                    <span className="font-medium text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      Jinja ➔ Kampala
                    </span>
                    <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[0.625rem] font-bold text-amber-600 dark:text-amber-400">
                      ⏱️ Hourly Shuttle
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/search?origin=1&destination=8"
                    className="group flex items-center justify-between gap-2 rounded-xl border border-transparent p-1.5 transition-all duration-150 hover:border-line hover:bg-surface-2"
                  >
                    <span className="font-medium text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      Kampala ➔ Kasese
                    </span>
                    <span className="rounded-md border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[0.625rem] font-bold text-teal-600 dark:text-teal-400">
                      🚌 Daily Direct
                    </span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* ── Col 3: Travel & Info ── */}
            <div className="lg:col-span-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-fg">Travel & Info</h2>
              <ul className="mt-3 space-y-2 text-xs text-muted">
                <li>
                  <Link to="/search" className="transition-colors duration-150 hover:text-brand-600 dark:hover:text-brand-400">
                    Find a trip & schedules
                  </Link>
                </li>
                <li>
                  <Link to="/terminals" className="transition-colors duration-150 hover:text-brand-600 dark:hover:text-brand-400">
                    Terminal locations (8 hubs)
                  </Link>
                </li>
                <li>
                  <Link to="/parcels/track" className="transition-colors duration-150 hover:text-brand-600 dark:hover:text-brand-400">
                    Track parcel & luggage
                  </Link>
                </li>
                <li>
                  <Link to="/my-tickets" className="transition-colors duration-150 hover:text-brand-600 dark:hover:text-brand-400">
                    My tickets & passes
                  </Link>
                </li>
                <li>
                  <Link to="/services" className="transition-colors duration-150 hover:text-brand-600 dark:hover:text-brand-400">
                    VIP fleet & cabins
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="transition-colors duration-150 hover:text-brand-600 dark:hover:text-brand-400">
                    About LinkBus Uganda
                  </Link>
                </li>
              </ul>
            </div>

            {/* ── Col 4: 24/7 Customer Care Card ── */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-fg">24/7 Customer Care</h2>
                  <span className="flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[0.625rem] font-bold text-brand-600 dark:text-brand-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    Live Desk
                  </span>
                </div>
                <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-muted">
                  <li>
                    <a
                      href={`tel:${settings.company_phone || '+256700123456'}`}
                      className="flex items-center gap-2.5 font-semibold text-fg transition-colors duration-150 hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-brand-600 dark:text-brand-400">
                        <PhoneIcon className="h-3 w-3" />
                      </span>
                      {settings.company_phone || '+256 700 123456'}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${settings.company_email || 'info@linkbus.co.ug'}`}
                      className="flex items-center gap-2.5 font-medium text-fg transition-colors duration-150 hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-brand-600 dark:text-brand-400">
                        <MailIcon className="h-3 w-3" />
                      </span>
                      {settings.company_email || 'info@linkbus.co.ug'}
                    </a>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-brand-600 dark:text-brand-400">
                      <MapPinIcon className="h-3 w-3" />
                    </span>
                    <span>{settings.company_address || 'Nakivubo Rd, Namayiba Terminal, Kampala'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── Payment Trust & Security Ribbon ── */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-fg">Accepted Payments:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  MTN MoMo
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-700 dark:text-red-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Airtel Money
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  <CreditCardIcon className="h-3 w-3" />
                  Visa
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-xs font-bold text-orange-700 dark:text-orange-300">
                  <CreditCardIcon className="h-3 w-3" />
                  Mastercard
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              <span>256-Bit SSL Encrypted & Instant QR Boarding</span>
            </div>
          </div>

          {/* ── Sub-Footer / Copyright & Legal ── */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted pb-2">
            <p>© {new Date().getFullYear()} {settings.company_name || 'LinkBus Uganda'}. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/about" className="transition-colors hover:text-fg">Terms of Travel & Carriage</Link>
              <Link to="/about" className="transition-colors hover:text-fg">Privacy Policy</Link>
              <Link to="/contact" className="transition-colors hover:text-fg">Passenger Support</Link>
              <Link to="/terminals" className="transition-colors hover:text-fg">Terminal Network</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}