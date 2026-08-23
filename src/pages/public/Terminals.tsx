import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  Building2Icon,
  BusIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  CoffeeIcon,
  CompassIcon,
  CrownIcon,
  ExternalLinkIcon,
  HelpCircleIcon,
  MapIcon,
  MapPinIcon,
  NavigationIcon,
  PackageCheckIcon,
  PhoneIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WifiIcon,
} from 'lucide-react';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { useAsync } from '../../hooks/useAsync';
import { getTerminals } from '../../services/trips';
import type { Terminal } from '../../types/models';
import { getMediaUrl } from '../../utils/format';

type RegionFilter = 'all' | 'central' | 'western' | 'northern' | 'eastern';

const terminalMetadata: Record<
  string,
  {
    region: 'central' | 'western' | 'northern' | 'eastern';
    phone: string;
    bays: number;
    hours: string;
    amenities: { label: string; icon: React.ReactNode }[];
  }
> = {
  Kampala: {
    region: 'central',
    phone: '+256 700 123 456',
    bays: 18,
    hours: '04:30 AM – 11:30 PM',
    amenities: [
      { label: 'VIP Lounge', icon: <CrownIcon className="h-3 w-3 text-amber-500" /> },
      { label: 'Parcel Desk', icon: <PackageCheckIcon className="h-3 w-3 text-emerald-500" /> },
      { label: 'Secure Parking', icon: <ShieldCheckIcon className="h-3 w-3 text-brand-600" /> },
      { label: 'Free Wi-Fi', icon: <WifiIcon className="h-3 w-3 text-blue-500" /> },
      { label: 'Cafeteria', icon: <CoffeeIcon className="h-3 w-3 text-orange-500" /> },
    ],
  },
  Mbarara: {
    region: 'western',
    phone: '+256 700 123 457',
    bays: 8,
    hours: '05:00 AM – 10:30 PM',
    amenities: [
      { label: 'VIP Lounge', icon: <CrownIcon className="h-3 w-3 text-amber-500" /> },
      { label: 'Parcel Desk', icon: <PackageCheckIcon className="h-3 w-3 text-emerald-500" /> },
      { label: 'Free Wi-Fi', icon: <WifiIcon className="h-3 w-3 text-blue-500" /> },
      { label: 'Cafeteria', icon: <CoffeeIcon className="h-3 w-3 text-orange-500" /> },
    ],
  },
  'Fort Portal': {
    region: 'western',
    phone: '+256 700 123 458',
    bays: 6,
    hours: '05:00 AM – 10:00 PM',
    amenities: [
      { label: 'VIP Lounge', icon: <CrownIcon className="h-3 w-3 text-amber-500" /> },
      { label: 'Parcel Desk', icon: <PackageCheckIcon className="h-3 w-3 text-emerald-500" /> },
      { label: 'Free Wi-Fi', icon: <WifiIcon className="h-3 w-3 text-blue-500" /> },
    ],
  },
  Gulu: {
    region: 'northern',
    phone: '+256 700 123 459',
    bays: 6,
    hours: '05:00 AM – 10:00 PM',
    amenities: [
      { label: 'Parcel Desk', icon: <PackageCheckIcon className="h-3 w-3 text-emerald-500" /> },
      { label: 'Secure Parking', icon: <ShieldCheckIcon className="h-3 w-3 text-brand-600" /> },
      { label: 'Free Wi-Fi', icon: <WifiIcon className="h-3 w-3 text-blue-500" /> },
    ],
  },
  Jinja: {
    region: 'eastern',
    phone: '+256 700 123 460',
    bays: 4,
    hours: '05:30 AM – 09:30 PM',
    amenities: [
      { label: 'Parcel Desk', icon: <PackageCheckIcon className="h-3 w-3 text-emerald-500" /> },
      { label: 'Free Wi-Fi', icon: <WifiIcon className="h-3 w-3 text-blue-500" /> },
      { label: 'MoMo Counter', icon: <SparklesIcon className="h-3 w-3 text-amber-500" /> },
    ],
  },
  Kasese: {
    region: 'western',
    phone: '+256 700 123 461',
    bays: 4,
    hours: '05:30 AM – 09:00 PM',
    amenities: [
      { label: 'Parcel Desk', icon: <PackageCheckIcon className="h-3 w-3 text-emerald-500" /> },
      { label: 'Free Wi-Fi', icon: <WifiIcon className="h-3 w-3 text-blue-500" /> },
    ],
  },
  Masaka: {
    region: 'western',
    phone: '+256 700 123 462',
    bays: 4,
    hours: '05:00 AM – 10:00 PM',
    amenities: [
      { label: 'Parcel Desk', icon: <PackageCheckIcon className="h-3 w-3 text-emerald-500" /> },
      { label: 'Free Wi-Fi', icon: <WifiIcon className="h-3 w-3 text-blue-500" /> },
    ],
  },
  Mubende: {
    region: 'western',
    phone: '+256 700 123 463',
    bays: 3,
    hours: '05:30 AM – 09:00 PM',
    amenities: [
      { label: 'Parcel Desk', icon: <PackageCheckIcon className="h-3 w-3 text-emerald-500" /> },
      { label: 'Free Wi-Fi', icon: <WifiIcon className="h-3 w-3 text-blue-500" /> },
    ],
  },
};

const terminalFaqs = [
  {
    q: 'How early should I arrive at the terminal before departure?',
    a: 'We strongly recommend arriving 20 to 30 minutes prior to your scheduled departure time. This gives you ample time to show your digital QR pass, have your 20kg luggage tagged, and settle comfortably into your reserved seat.',
  },
  {
    q: 'Can I drop off parcels at any terminal counter?',
    a: 'Yes! Every LinkBus regional terminal features a dedicated cargo & parcel window operating from 06:00 AM to 08:00 PM daily. Parcels are barcoded and loaded onto the next scheduled departure.',
  },
  {
    q: 'Is secure overnight parking available for travelers?',
    a: 'Yes, our primary regional hubs including Namayiba / Kampala, Mbarara, and Gulu offer 24/7 guarded parking with CCTV monitoring for passengers traveling on round trips.',
  },
  {
    q: 'Can I purchase or reschedule tickets in person at the counter?',
    a: 'Yes. All terminal counter staff use our live synchronized POS terminals. Any change made at the counter or on your mobile phone updates instantly across the entire platform.',
  },
];

export function Terminals() {
  const { data, loading, error, reload } = useAsync(() => getTerminals(), []);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filteredTerminals = useMemo(() => {
    if (!data) return [];
    return data
      .filter((t) => {
        const meta = terminalMetadata[t.city] || { region: 'western' };
        const matchesRegion = regionFilter === 'all' || meta.region === regionFilter;
        const matchesSearch =
          !searchTerm.trim() ||
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.address.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesRegion && matchesSearch;
      })
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return a.city.localeCompare(b.city);
      });
  }, [data, regionFilter, searchTerm]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-6 border-b border-line pb-10 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <CompassIcon className="h-3.5 w-3.5" />
            National Terminal Network
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Terminals & Regional Hubs
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Every departure starts and ends at a modern, fully-staffed terminal featuring live POS ticket counters, 20kg luggage check-in, VIP executive lounges, and tracked parcel desks.
          </p>
        </div>

        <Link
          to="/search"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow-md shadow-brand-950/10 transition-all hover:bg-brand-700 active:scale-95 shrink-0"
        >
          <BusIcon className="h-4 w-4" />
          Find a Departure
        </Link>
      </div>

      {/* ── Network Hub Statistics Ribbon ── */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:text-brand-400 font-bold">
            <Building2Icon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-2xl font-extrabold text-fg">8 Major Hubs</p>
          <p className="mt-0.5 text-xs text-muted">Covering all primary corridors across Uganda</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:text-brand-400 font-bold">
            <BusIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-2xl font-extrabold text-fg">620+ Departures</p>
          <p className="mt-0.5 text-xs text-muted">Weekly on-time express and shuttle trips</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheckIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-2xl font-extrabold text-fg">24/7 Monitored</p>
          <p className="mt-0.5 text-xs text-muted">CCTV secured bays & passenger lounges</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
            <PackageCheckIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-2xl font-extrabold text-fg">Same-Day Cargo</p>
          <p className="mt-0.5 text-xs text-muted">Parcel windows at every active terminal</p>
        </div>
      </div>

      {/* ── Search Bar & Regional Corridor Filter Tabs ── */}
      <div className="mt-10 flex flex-col justify-between gap-4 border-b border-line pb-4 md:flex-row md:items-center">
        {/* Regional Filter Buttons */}
        <div className="flex overflow-x-auto gap-2 scrollbar-none pb-2 md:pb-0">
          {[
            { key: 'all' as const, label: 'All Stations', count: data?.length ?? 8 },
            { key: 'central' as const, label: 'Central (Kampala)', count: 1 },
            { key: 'western' as const, label: 'Western Corridor', count: 5 },
            { key: 'northern' as const, label: 'Northern Line', count: 1 },
            { key: 'eastern' as const, label: 'Eastern Line', count: 1 },
          ].map((tab) => {
            const active = regionFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRegionFilter(tab.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 active:scale-95 ${
                  active
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-950/10'
                    : 'border border-line bg-surface text-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex h-4.5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-bold ${
                    active ? 'bg-white/25 text-white' : 'bg-surface-2 text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search terminal or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-xs text-fg placeholder-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* ── Terminals Grid ── */}
      <div className="mt-8">
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="skeleton h-80 rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="card-surface mt-6 p-6">
            <ErrorState message={error} onRetry={reload} />
          </div>
        )}

        {!loading && !error && filteredTerminals.length === 0 && (
          <div className="card-surface mt-6 p-8">
            <EmptyState
              icon={<MapPinIcon className="h-6 w-6 text-muted" />}
              title="No terminals found"
              body="No regional terminals match your current filter or search criteria. Try clearing the search."
            />
          </div>
        )}

        {!loading && !error && filteredTerminals.length > 0 && (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTerminals.map((terminal) => {
              const isInactive = terminal.status === 'inactive' || terminal.status === 'closed';
              const meta = terminalMetadata[terminal.city] || {
                phone: '+256 700 123 456',
                bays: 4,
                hours: '05:30 AM – 10:00 PM',
                amenities: [
                  { label: 'Parcel Desk', icon: <PackageCheckIcon className="h-3 w-3 text-emerald-500" /> },
                  { label: 'Free Wi-Fi', icon: <WifiIcon className="h-3 w-3 text-blue-500" /> },
                ],
              };

              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${terminal.latitude},${terminal.longitude}`;

              return (
                <li
                  key={terminal.id}
                  className={`card-surface hover-lift group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 ${
                    isInactive
                      ? 'border-dashed border-line bg-surface/75 opacity-90 hover:border-amber-500/40'
                      : 'border-line hover:border-brand-500/40 hover:shadow-lg'
                  }`}
                >
                  {/* Photo / Header Backdrop */}
                  <div className={`relative h-44 w-full overflow-hidden bg-surface-2 ${isInactive ? 'grayscale contrast-75' : ''}`}>
                    {terminal.photo ? (
                      <img
                        src={getMediaUrl(terminal.photo)}
                        alt={`${terminal.name} terminal`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-brand-900/40 to-slate-900/60 p-4 text-center">
                        <MapPinIcon className="h-8 w-8 text-brand-400 mb-1" />
                        <span className="text-sm font-bold text-white">{terminal.city} Hub</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                    {/* City & Status Badge overlay */}
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                      <span className="rounded-lg bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
                        {terminal.city} Station
                      </span>
                      {isInactive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1 text-[0.6875rem] font-extrabold text-slate-950 shadow-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                          Temporarily Closed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-[0.6875rem] font-bold text-white shadow-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          Active Hub
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Terminal Content Body */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-lg font-bold text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {terminal.name}
                        </h2>
                      </div>
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-muted">
                        <MapPinIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                        <span>{terminal.address}</span>
                      </p>

                      {isInactive ? (
                        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                            Station Operations Suspended
                          </div>
                          <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted">
                            Departures from this station are temporarily paused for maintenance or renovation. Contact station desk for parcel inquiries.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Live Operating Hours & Bays */}
                          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2.5 py-1 font-semibold text-fg">
                              <ClockIcon className="h-3 w-3 text-brand-600 dark:text-brand-400" />
                              {meta.hours}
                            </span>
                            <span className="rounded-md border border-line px-2 py-1 text-muted text-[0.6875rem]">
                              {meta.bays} Departure Bays
                            </span>
                          </div>

                          {/* Station Amenities Badges */}
                          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line/60 pt-3">
                            {meta.amenities.map((am) => (
                              <span
                                key={am.label}
                                className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-[0.625rem] font-medium text-muted"
                              >
                                {am.icon}
                                <span>{am.label}</span>
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="mt-6 space-y-2 border-t border-line/60 pt-4">
                      {/* Live Departures or Suspended Button */}
                      {isInactive ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-xs font-semibold text-muted opacity-80"
                        >
                          <span>Departures Temporarily Suspended</span>
                        </button>
                      ) : (
                        <Link
                          to={`/search?origin=${terminal.id}`}
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
                        >
                          View Live Departures
                          <ArrowRightIcon className="h-3.5 w-3.5" />
                        </Link>
                      )}

                      {/* Secondary Action Links: Google Maps & Phone */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface py-2 text-[0.6875rem] font-semibold text-fg transition-colors hover:bg-surface-2"
                        >
                          <NavigationIcon className="h-3 w-3 text-brand-600 dark:text-brand-400" />
                          Directions (Maps)
                          <ExternalLinkIcon className="h-2.5 w-2.5 opacity-60" />
                        </a>

                        <a
                          href={`tel:${meta.phone}`}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface py-2 text-[0.6875rem] font-semibold text-fg transition-colors hover:bg-surface-2"
                        >
                          <PhoneIcon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          Call Station
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Terminal Passenger FAQs ── */}
      <section className="mt-16 border-t border-line pt-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <HelpCircleIcon className="h-3.5 w-3.5" />
            Station Guidelines
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Terminal Check-in & Station FAQs
          </h2>
        </div>

        <div className="mt-8 max-w-3xl mx-auto space-y-3">
          {terminalFaqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-line bg-surface transition-all duration-150 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-fg hover:text-brand-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDownIcon
                    className={`h-4 w-4 text-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-brand-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm leading-relaxed text-muted border-t border-line/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}