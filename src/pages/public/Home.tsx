import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArmchairIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  Building2Icon,
  BusFrontIcon,
  BusIcon,
  CheckCircle2Icon,
  ClockIcon,
  CompassIcon,
  CreditCardIcon,
  FlameIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  MapIcon,
  MapPinIcon,
  MessageSquareIcon,
  NavigationIcon,
  PackageCheckIcon,
  PackageIcon,
  PhoneIcon,
  QrCodeIcon,
  QuoteIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TicketIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
  WifiIcon,
  WindIcon,
  ZapIcon,
} from 'lucide-react';
import { TripSearchForm } from '../../components/booking/TripSearchForm';
import { landingPathForRole, useAuth } from '../../contexts/AuthContext';
import { HERO_IMAGE, homeFeatures, popularCorridors, testimonials } from '../../data/content';
import { durationLabel, money } from '../../utils/format';

interface TerminalHub {
  id: string;
  name: string;
  city: string;
  tagline: string;
  address: string;
  phone: string;
  originId: number;
  routes: {
    destCity: string;
    destId: number;
    duration: string;
    frequency: string;
    fare: number;
    tag: string;
  }[];
}

const terminalHubs: TerminalHub[] = [
  {
    id: 'kla',
    name: 'Namayiba / Central Terminal',
    city: 'Kampala',
    tagline: 'Uganda’s main intercity transport hub with 18 departure bays.',
    address: 'Nakivubo Rd, Namayiba Terminal, Kampala',
    phone: '+256 700 123 456',
    originId: 1,
    routes: [
      { destCity: 'Mbarara', destId: 3, duration: '4h 15m', frequency: 'Every 30 mins', fare: 30000, tag: '⚡ Express' },
      { destCity: 'Fort Portal', destId: 4, duration: '4h 30m', frequency: '10 daily', fare: 35000, tag: '⛰️ Scenic' },
      { destCity: 'Gulu', destId: 2, duration: '5h 45m', frequency: '8 daily', fare: 32000, tag: '🌙 Northern' },
      { destCity: 'Kasese', destId: 8, duration: '6h 00m', frequency: '6 daily', fare: 40000, tag: '🚌 Direct' },
    ],
  },
  {
    id: 'mbr',
    name: 'Mbarara Main Terminal',
    city: 'Mbarara',
    tagline: 'Western regional gateway connecting Ankole & Kigezi.',
    address: 'High Street, Mbarara Central',
    phone: '+256 700 123 457',
    originId: 3,
    routes: [
      { destCity: 'Kampala', destId: 1, duration: '4h 15m', frequency: 'Hourly departures', fare: 30000, tag: '⚡ Express' },
      { destCity: 'Kasese', destId: 8, duration: '2h 30m', frequency: '5 daily', fare: 20000, tag: '🚌 Direct' },
      { destCity: 'Masaka', destId: 6, duration: '2h 15m', frequency: '8 daily', fare: 15000, tag: '⏱️ Transit' },
    ],
  },
  {
    id: 'ftp',
    name: 'Fort Portal Tourism Hub',
    city: 'Fort Portal',
    tagline: 'Scenic Rwenzori corridor and Queen Elizabeth National Park link.',
    address: 'Lugard Rd, Fort Portal Town',
    phone: '+256 700 123 458',
    originId: 4,
    routes: [
      { destCity: 'Kampala', destId: 1, duration: '4h 30m', frequency: '10 daily', fare: 35000, tag: '⛰️ Scenic' },
      { destCity: 'Kasese', destId: 8, duration: '1h 30m', frequency: '6 daily', fare: 12000, tag: '⚡ Shuttle' },
      { destCity: 'Mubende', destId: 7, duration: '2h 00m', frequency: '7 daily', fare: 18000, tag: '⏱️ Transit' },
    ],
  },
  {
    id: 'glu',
    name: 'Gulu Northern Line Terminal',
    city: 'Gulu',
    tagline: 'Primary northern corridor hub serving Acholi & Lango sub-regions.',
    address: 'Gulu Main Bus Park, Gulu City',
    phone: '+256 700 123 459',
    originId: 2,
    routes: [
      { destCity: 'Kampala', destId: 1, duration: '5h 45m', frequency: '8 daily', fare: 32000, tag: '🌙 Northern' },
      { destCity: 'Karuma', destId: 1, duration: '1h 45m', frequency: '6 daily', fare: 15000, tag: '⏱️ Transit' },
    ],
  },
  {
    id: 'jnj',
    name: 'Jinja Eastern Shuttle Bay',
    city: 'Jinja',
    tagline: 'Rapid hourly coach connections across the Source of the Nile corridor.',
    address: 'Main St, Jinja City',
    phone: '+256 700 123 460',
    originId: 5,
    routes: [
      { destCity: 'Kampala', destId: 1, duration: '1h 30m', frequency: 'Every 30 mins', fare: 15000, tag: '⏱️ Shuttle' },
    ],
  },
];

export function Home() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activePerspective, setActivePerspective] = useState<'all' | 'passenger' | 'staff' | 'driver'>('all');
  const [selectedHub, setSelectedHub] = useState<string>('kla');
  const [trackingCode, setTrackingCode] = useState('');

  const currentHub = terminalHubs.find((h) => h.id === selectedHub) || terminalHubs[0];

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = trackingCode.trim();
    if (code) {
      navigate(`/parcels/track?code=${encodeURIComponent(code)}`);
    } else {
      navigate('/parcels/track');
    }
  };

  return (
    <>
      {/* ── Hero Section with 1-Tap Route Chips & Live Passenger Pulse ── */}
      <section className="relative isolate overflow-hidden">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/70" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="max-w-3xl">
            {/* Live Activity Pulse Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3.5 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>4,200+ passenger seats booked this week</span>
              <span className="text-emerald-400/50">•</span>
              <span className="text-emerald-200/90 font-normal">96% on-time departures</span>
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Pick your exact seat. <br className="hidden sm:inline" />
              <span className="text-emerald-400">Board with a scan.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-lg">
              Uganda's premier digital coach network. Reserved seating on a live 2D cabin map, guaranteed 10-minute hold, with tracked luggage and parcels on the same bus.
            </p>
          </div>

          {/* Primary Search Form */}
          <div className="mt-8 lg:mt-10">
            <TripSearchForm variant="hero" />
          </div>

          {/* 1-Tap Quick Route Chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-white/70">Popular 1-Tap Routes:</span>
            {[
              { label: '⚡ Kampala ➔ Mbarara', origin: 1, dest: 3 },
              { label: '⛰️ Kampala ➔ Fort Portal', origin: 1, dest: 4 },
              { label: '🌙 Kampala ➔ Gulu', origin: 1, dest: 2 },
              { label: '⏱️ Jinja ➔ Kampala', origin: 5, dest: 1 },
              { label: '🚌 Kampala ➔ Kasese', origin: 1, dest: 8 },
            ].map((route) => (
              <Link
                key={route.label}
                to={`/search?origin=${route.origin}&destination=${route.dest}`}
                className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 font-medium text-white backdrop-blur-sm transition-colors hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-95"
              >
                {route.label}
              </Link>
            ))}
          </div>

          {/* Network Live Stats */}
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-6">
            {[
              { value: '620+', label: 'departures every week' },
              { value: '8', label: 'modern regional terminals' },
              { value: '100%', label: 'reserved seat guarantee' },
              { value: '25kg', label: 'free tracked luggage' },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-xl sm:text-2xl font-bold text-white">{stat.value}</dt>
                <dd className="text-xs text-white/70">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 3-Step Visual Journey ("How LinkBus Digital Travel Works") ── */}
      <section className="border-b border-line bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
              <ZapIcon className="h-3.5 w-3.5" />
              Simple 3-Step Journey
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              How digital booking works
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Skip the long counter lines and get straight to your departure bay in three easy steps.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="card-surface hover-lift relative flex flex-col justify-between p-6 sm:p-7 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 font-bold">
                    <ArmchairIcon className="h-6 w-6" />
                  </span>
                  <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                    Step 1
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-fg">1. Pick Your Exact Seat</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Choose your seat on a live 2D cabin layout — VIP front rows, window seats with charging, or adjacent rows for family groups.
                </p>
              </div>
              <div className="mt-6 border-t border-line/60 pt-4 text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <CheckCircle2Icon className="h-4 w-4" /> Live 2D cabin map with VIP options
              </div>
            </div>

            {/* Step 2 */}
            <div className="card-surface hover-lift relative flex flex-col justify-between p-6 sm:p-7 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 font-bold">
                    <CreditCardIcon className="h-6 w-6" />
                  </span>
                  <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white">
                    Step 2
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-fg">2. Instant MoMo & Card Pay</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Your seat is locked for 10 minutes while you checkout securely via MTN Mobile Money, Airtel Money, or Visa/Mastercard.
                </p>
              </div>
              <div className="mt-6 border-t border-line/60 pt-4 text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" /> 10-Minute guaranteed seat lock
              </div>
            </div>

            {/* Step 3 */}
            <div className="card-surface hover-lift relative flex flex-col justify-between p-6 sm:p-7 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 font-bold">
                    <QrCodeIcon className="h-6 w-6" />
                  </span>
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                    Step 3
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-fg">3. Scan & Go QR Boarding</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Receive your digital boarding pass instantly via WhatsApp and Email. Show your QR code at the departure bay for a 3-second scan.
                </p>
              </div>
              <div className="mt-6 border-t border-line/60 pt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheckIcon className="h-4 w-4" /> 100% paperless WhatsApp boarding
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Popular Corridors / Quick-Book Corridors ── */}
      <section className="border-b border-line bg-surface/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                <CompassIcon className="h-3.5 w-3.5" aria-hidden />
                Popular travel corridors
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                Frequent departures across Uganda
              </h2>
              <p className="mt-2 text-sm text-muted sm:text-base">
                Direct express buses, luxury VIP coaches, and hourly shuttles between major hubs.
              </p>
            </div>
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors duration-150 hover:text-brand-700 dark:text-brand-400"
            >
              All departures
              <ArrowRightIcon className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularCorridors.map((corridor) => (
              <div
                key={corridor.id}
                className="card-surface hover-lift group flex flex-col justify-between p-5 transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    {corridor.tag && (
                      <span className="inline-flex items-center rounded-lg bg-surface-2 px-2.5 py-1 text-[0.6875rem] font-semibold text-fg">
                        {corridor.tag}
                      </span>
                    )}
                    <span className="text-xs font-medium text-muted">
                      {corridor.dailyDepartures} daily trips
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-lg font-bold text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      <span>{corridor.originCity}</span>
                      <span className="text-brand-600 dark:text-brand-400">→</span>
                      <span>{corridor.destCity}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted">
                      {corridor.originName} → {corridor.destName}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-3 border-t border-line/60 pt-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                      ~{durationLabel(corridor.durationMinutes)}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <NavigationIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                      {corridor.distanceKm} km
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4">
                  <div>
                    <span className="block text-[0.6875rem] font-medium uppercase tracking-wider text-muted">
                      Fares from
                    </span>
                    <span className="text-base font-bold text-fg">
                      {money(corridor.fareFrom)}
                    </span>
                  </div>
                  <Link
                    to={`/search?origin=${corridor.originId}&destination=${corridor.destId}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-xs font-bold text-white transition-all duration-150 hover:bg-brand-700 active:scale-95"
                  >
                    View trips
                    <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Terminal Hub & Network Explorer ── */}
      <section className="border-b border-line bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                <MapIcon className="h-3.5 w-3.5" />
                Terminal Network
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                Explore our 8 regional terminals
              </h2>
              <p className="mt-2 text-sm text-muted sm:text-base">
                Click any regional hub to view direct outgoing connections, schedules, and counter locations.
              </p>
            </div>
            <Link
              to="/terminals"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
            >
              All terminal locations
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {/* Hub Tab Selector */}
          <div className="mt-8 flex overflow-x-auto gap-2 border-b border-line pb-4 scrollbar-none">
            {terminalHubs.map((hub) => {
              const isActive = hub.id === selectedHub;
              return (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => setSelectedHub(hub.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-950/20'
                      : 'border border-line bg-surface-2/60 text-muted hover:text-fg hover:bg-surface-2'
                  }`}
                >
                  <MapPinIcon className="h-3.5 w-3.5" />
                  <span>{hub.city} Hub</span>
                </button>
              );
            })}
          </div>

          {/* Active Terminal Hub Details & Outgoing Departures */}
          <div className="mt-6 rounded-2xl border border-line bg-surface-2/40 p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-line/60 pb-6 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-fg sm:text-2xl">{currentHub.name}</h3>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Active Station
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{currentHub.tagline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <MapPinIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                    {currentHub.address}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <PhoneIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                    {currentHub.phone}
                  </span>
                </div>
              </div>

              <Link
                to={`/search?origin=${currentHub.originId}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-bold text-white shadow transition-all hover:bg-brand-700 active:scale-95 shrink-0"
              >
                View all departures from {currentHub.city}
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Outgoing Corridor Rows */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Direct Scheduled Routes from {currentHub.city}
              </h4>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {currentHub.routes.map((route) => (
                  <div
                    key={route.destCity}
                    className="card-surface group flex flex-col justify-between p-4 rounded-xl border border-line hover:border-brand-500/40 transition-all hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {currentHub.city} ➔ {route.destCity}
                        </span>
                        <span className="text-[0.625rem] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">
                          {route.tag}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted">
                        <span>⏱️ {route.duration}</span>
                        <span>{route.frequency}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                      <span className="text-xs font-bold text-fg">{money(route.fare)}</span>
                      <Link
                        to={`/search?origin=${currentHub.originId}&destination=${route.destId}`}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
                      >
                        Book <ArrowRightIcon className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Luggage & Parcel Quick-Track Widget ── */}
      <section className="border-b border-line bg-surface/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-8 text-white shadow-xl sm:p-10">
            {/* Background ambient glow */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300">
                  <PackageIcon className="h-3.5 w-3.5" />
                  Cargo & Luggage Tracking
                </div>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Track parcels & passenger luggage in real-time
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Enter your airway bill code or luggage tag number to see live terminal check-in, in-transit bus position, and collection status.
                </p>

                <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2Icon className="h-4 w-4 text-emerald-400" />
                    Instant Barcode Bag Tags
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2Icon className="h-4 w-4 text-emerald-400" />
                    20kg Free Passenger Allowance
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2Icon className="h-4 w-4 text-emerald-400" />
                    Same-Day Delivery across Uganda
                  </span>
                </div>
              </div>

              {/* 1-Input Quick Search Form */}
              <div className="lg:col-span-5">
                <form onSubmit={handleTrackSubmit} className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 sm:p-6 backdrop-blur-md">
                  <label htmlFor="home-tracking-input" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                    Parcel or Luggage Code
                  </label>
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <input
                      id="home-tracking-input"
                      type="text"
                      placeholder="e.g. LB-2026-X8..."
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      className="h-11 flex-1 rounded-xl border border-white/20 bg-slate-950/80 px-4 text-xs text-white placeholder-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-xs font-bold text-slate-950 shadow transition-all hover:bg-emerald-400 active:scale-95 shrink-0"
                    >
                      <SearchIcon className="h-3.5 w-3.5" />
                      Track Live
                    </button>
                  </div>
                  <p className="mt-2 text-[0.6875rem] text-slate-400">
                    Find your code on your printed receipt or WhatsApp confirmation message.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — Large Card with Mini-Seat Map Illustration + 3 Cards */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
              <ZapIcon className="h-3.5 w-3.5" aria-hidden />
              Next-Gen Ticketing Platform
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Everything that used to happen at the counter
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Booking, live seat maps, luggage, boarding, and parcels all run on one unified system.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          {/* Featured Large Card (Left 7 Columns) with Interactive Mini-Seat Map */}
          <article className="card-surface hover-lift group relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:col-span-7">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-950/10 transition-transform duration-200 group-hover:scale-105">
                  <TicketIcon className="h-6 w-6" aria-hidden />
                </span>
                <span className="inline-flex items-center rounded-lg bg-surface-2 px-3 py-1 text-xs font-semibold text-fg">
                  Live Cabin Map
                </span>
              </div>

              <h3 className="mt-5 text-xl font-bold tracking-tight text-fg sm:text-2xl">
                Seat you actually chose
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
                Pick your exact seat on a live 2D cabin map — VIP front rows, window views with extra legroom, or full rows for traveling groups.
              </p>

              {/* Mini Seat Map Mockup Graphic */}
              <div className="mt-6 rounded-2xl border border-line bg-surface-2/70 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-line pb-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5 font-semibold text-fg">
                    <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                    Coach Cabin (Scania Irizar i6)
                  </span>
                  <span className="rounded bg-brand-500/10 px-2 py-0.5 font-bold text-brand-600 dark:text-brand-400">
                    Front / Driver
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-brand-500 bg-brand-600/15 p-2.5 text-center shadow-sm">
                    <span className="text-[0.625rem] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">VIP</span>
                    <span className="text-sm font-bold text-fg">1A</span>
                    <span className="mt-1 inline-flex items-center rounded-md bg-brand-600 px-1.5 py-0.5 text-[0.5625rem] font-bold text-white">
                      Selected
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-2.5 text-center opacity-60">
                    <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted">VIP</span>
                    <span className="text-sm font-bold text-muted">1B</span>
                    <span className="mt-1 rounded bg-surface-2 px-1.5 py-0.5 text-[0.5625rem] font-semibold text-muted">
                      Booked
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface p-2.5 text-center hover:border-brand-500 hover:bg-brand-500/5 transition-colors">
                    <span className="text-[0.625rem] font-medium text-muted">Standard</span>
                    <span className="text-sm font-bold text-fg">2A</span>
                    <span className="mt-1 rounded border border-line px-1.5 py-0.5 text-[0.5625rem] font-medium text-fg">
                      Available
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface p-2.5 text-center hover:border-brand-500 hover:bg-brand-500/5 transition-colors">
                    <span className="text-[0.625rem] font-medium text-muted">Standard</span>
                    <span className="text-sm font-bold text-fg">2B</span>
                    <span className="mt-1 rounded border border-line px-1.5 py-0.5 text-[0.5625rem] font-medium text-fg">
                      Available
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-fg">
                    <CheckCircle2Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    Seat 1A held for checkout
                  </span>
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                    ⏱️ 09:48 remaining
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 transition-colors duration-150 hover:text-brand-700 dark:text-brand-400"
              >
                Browse departures & select your seat
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </article>

          {/* Right Column: 3 Stacked Equal-Height Cards (5 Columns) */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            <article className="card-surface hover-lift group flex flex-1 flex-col justify-between p-5 sm:p-6 transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 transition-colors duration-150 group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/15 dark:text-brand-400">
                    <ClockIcon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-surface-2 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-fg">
                    Zero Overbooking
                  </span>
                </div>
                <h3 className="mt-3 text-base font-bold text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  Held for ten minutes
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted sm:text-sm">
                  Your seat is locked the moment you select it, so nobody takes it while you enter details and complete payment.
                </p>
              </div>
            </article>

            <article className="card-surface hover-lift group flex flex-1 flex-col justify-between p-5 sm:p-6 transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 transition-colors duration-150 group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/15 dark:text-brand-400">
                    <ShieldCheckIcon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-surface-2 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-fg">
                    Paperless
                  </span>
                </div>
                <h3 className="mt-3 text-base font-bold text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  Scan-and-go QR boarding
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted sm:text-sm">
                  Every ticket generates an instant QR code. Counter staff and drivers scan you in in just a couple of seconds.
                </p>
              </div>
            </article>

            <article className="card-surface hover-lift group flex flex-1 flex-col justify-between p-5 sm:p-6 transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 transition-colors duration-150 group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/15 dark:text-brand-400">
                    <PackageIcon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-surface-2 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-fg">
                    Live Milestones
                  </span>
                </div>
                <h3 className="mt-3 text-base font-bold text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  Luggage & parcels tracked
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted sm:text-sm">
                  Tagged bags and parcels get a unique tracking code you can follow from terminal drop-off to recipient collection.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Testimonials — Perspective Tabs */}
      <section className="border-y border-line bg-surface/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                <SparklesIcon className="h-3.5 w-3.5" aria-hidden />
                Real Platform Stories
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                From the people travelling & operating daily
              </h2>
              <p className="mt-2 text-sm text-muted sm:text-base">
                Explore real perspectives from daily passengers, terminal ticketing supervisors, and coach captains.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                ))}
              </div>
              <span className="text-xs font-bold text-fg">4.9 / 5.0</span>
              <span className="text-xs text-muted">(12K+ reviews)</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-line pb-4">
            {[
              { key: 'all' as const, label: 'All Stories', icon: <SparklesIcon className="h-3.5 w-3.5" />, count: testimonials.length },
              { key: 'passenger' as const, label: 'Passengers', icon: <UsersIcon className="h-3.5 w-3.5" />, count: testimonials.filter((t) => t.category === 'passenger').length },
              { key: 'staff' as const, label: 'Counter Staff', icon: <Building2Icon className="h-3.5 w-3.5" />, count: testimonials.filter((t) => t.category === 'staff').length },
              { key: 'driver' as const, label: 'Drivers', icon: <BusFrontIcon className="h-3.5 w-3.5" />, count: testimonials.filter((t) => t.category === 'driver').length },
            ].map((tab) => {
              const active = activePerspective === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActivePerspective(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 active:scale-95 ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-950/10'
                      : 'border border-line bg-surface text-muted hover:bg-surface-2 hover:text-fg'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={`inline-flex h-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-surface-2 text-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials
              .filter((t) => activePerspective === 'all' || t.category === activePerspective)
              .map((testimonial) => (
                <blockquote
                  key={testimonial.id}
                  className="card-surface hover-lift group relative flex flex-col justify-between p-6 sm:p-7 transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <StarIcon key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[0.6875rem] font-semibold text-fg">
                        <UserCheckIcon className="h-3 w-3 text-brand-600 dark:text-brand-400" aria-hidden />
                        {testimonial.badge}
                      </span>
                    </div>

                    {testimonial.statHighlight && (
                      <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-brand-500/20 bg-brand-500/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-brand-600 dark:text-brand-400">
                        <ZapIcon className="h-3 w-3" aria-hidden />
                        {testimonial.statHighlight}
                      </div>
                    )}

                    <p className="mt-4 text-sm leading-relaxed text-fg sm:text-[0.9375rem]">
                      “{testimonial.quote}”
                    </p>
                  </div>

                  <footer className="mt-6 flex items-center gap-3.5 border-t border-line/60 pt-5">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm ${testimonial.avatarColor}`}
                    >
                      {testimonial.avatarInitials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-fg">
                        <span className="truncate">{testimonial.name}</span>
                      </div>
                      <p className="truncate text-xs text-muted">
                        {testimonial.role} • <span className="text-brand-600 dark:text-brand-400">{testimonial.locationOrRoute}</span>
                      </p>
                    </div>
                  </footer>
                </blockquote>
              ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 p-8 text-white shadow-xl shadow-brand-950/10 sm:p-10">
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-black/10 blur-2xl" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {isAuthenticated && user ? `Ready for your next journey, ${user.name.split(' ')[0]}?` : 'Travelling this week?'}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
                {isAuthenticated && user
                  ? `Search departures across the network, reserve your seats, or access your active bookings and boarding passes.`
                  : 'Create an account once and your details fill themselves in on every future booking, with all your boarding passes in one place.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/search"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-brand-800 shadow-md transition-all duration-150 hover:bg-white/90 hover:shadow-lg active:scale-95"
              >
                Find a trip
              </Link>
              {isAuthenticated && user ? (
                <Link
                  to={landingPathForRole(user.role)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-150 hover:bg-white/20 active:scale-95"
                >
                  <LayoutDashboardIcon className="h-4 w-4" aria-hidden />
                  My portal
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-150 hover:bg-white/20 active:scale-95"
                >
                  <UserPlusIcon className="h-4 w-4" aria-hidden />
                  Create account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}