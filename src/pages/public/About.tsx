import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArmchairIcon,
  ArrowRightIcon,
  AwardIcon,
  Building2Icon,
  BusIcon,
  CheckCircle2Icon,
  ClockIcon,
  CompassIcon,
  CrownIcon,
  EyeIcon,
  GaugeIcon,
  HeartHandshakeIcon,
  HelpCircleIcon,
  LeafIcon,
  LockIcon,
  MapPinIcon,
  PackageCheckIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  WrenchIcon,
  ZapIcon,
} from 'lucide-react';
import { HERO_IMAGE, aboutMilestones, aboutStats } from '../../data/content';

const corePillars = [
  {
    icon: <ClockIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" />,
    title: 'Precision Punctuality',
    description:
      'We maintain a 96% on-time departure rate backed by live GPS fleet tracking and scheduled bay dispatches across all 8 regional hubs.',
    highlight: '96% On-Time Record',
  },
  {
    icon: <ArmchairIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
    title: 'Zero Overbooking Guarantee',
    description:
      'Every ticket corresponds to a real, selected seat on a live 2D cabin map. Seats are held for 10 minutes during checkout to ensure you get the exact seat you paid for.',
    highlight: '100% Guaranteed Reserved Seating',
  },
  {
    icon: <ShieldCheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
    title: 'Vetted Captains & Fleet Safety',
    description:
      'All coaches are speed-governed at 80 km/h, undergo daily mechanical pre-trip checks, and are operated by certified long-distance coach captains.',
    highlight: 'GPS Speed-Governed at 80km/h',
  },
  {
    icon: <HeartHandshakeIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
    title: '24/7 Monitored Dispatch',
    description:
      'Dedicated station managers and support teams at every terminal assist with ticketing, VIP lounge check-ins, luggage tagging, and instant WhatsApp support.',
    highlight: 'Staffed Stations & WhatsApp Desk',
  },
];

const fleetHighlights = [
  {
    icon: <GaugeIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />,
    title: 'Modern Scania & Isuzu Chassis',
    body: 'Heavy-duty suspension tailored for Ugandan highways, ensuring smooth and stable transit across all terrain.',
  },
  {
    icon: <LeafIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    title: 'Eco-Friendly Low Emissions',
    body: 'Euro-standard fuel-efficient diesel power units minimizing carbon emissions on long-haul corridors.',
  },
  {
    icon: <WrenchIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    title: 'Daily 24-Point Diagnostics',
    body: 'Brake linings, tire treads, steering fluid, and electrical diagnostics inspected before every single trip.',
  },
  {
    icon: <ZapIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    title: 'Passenger Comfort Tech',
    body: 'USB fast-charging ports at every row, climate-controlled cabins, and digital barcode baggage tags.',
  },
];

export function About() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* ── Page Header & Story Introduction ── */}
      <div className="flex flex-col justify-between gap-6 border-b border-line pb-10 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <SparklesIcon className="h-3.5 w-3.5" />
            Our Story & Mission
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl">
            We started with two coaches and a paper ledger.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Link Bus Services was founded with a singular purpose: to make intercity public transport in Uganda safe, predictable, dignified, and 100% digital.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/search"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow-md shadow-brand-950/10 transition-all hover:bg-brand-700 active:scale-95 shrink-0"
          >
            <BusIcon className="h-4 w-4" />
            Find a Trip
          </Link>
          <Link
            to="/terminals"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-fg transition-all hover:bg-surface-2 active:scale-95 shrink-0"
          >
            <MapPinIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            Our 8 Terminals
          </Link>
        </div>
      </div>

      {/* ── Wide Hero Image with Overlaid Network Badge ── */}
      <div className="relative mt-8 overflow-hidden rounded-2xl border border-line shadow-lg">
        <img
          src={HERO_IMAGE}
          alt="Link Bus coach traveling along green hills at sunset"
          className="h-72 w-full object-cover sm:h-96"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-between gap-4 text-white">
          <div className="max-w-md">
            <span className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
              National Network
            </span>
            <p className="mt-2 text-lg font-bold sm:text-xl">
              Connecting communities across Western, Northern & Eastern Uganda.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-black/50 px-4 py-2 backdrop-blur-md border border-white/10 text-xs font-medium text-white/90">
            <CheckCircle2Icon className="h-4 w-4 text-emerald-400" />
            <span>Ministry of Works & Transport Licensed Carrier</span>
          </div>
        </div>
      </div>

      {/* ── Key Operational Metrics Matrix ── */}
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {aboutStats.map((stat) => (
          <div
            key={stat.label}
            className="card-surface hover-lift p-6 rounded-2xl border border-line transition-all duration-200"
          >
            <dt className="text-xs font-bold uppercase tracking-wider text-muted">{stat.label}</dt>
            <dd className="mt-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl text-brand-600 dark:text-brand-400">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* ── 4 Core Pillars of Excellence & Safety ── */}
      <section className="mt-16 border-t border-line pt-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            Our Commitments
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            The 4 pillars of the LinkBus standard
          </h2>
          <p className="mt-2 text-sm text-muted">
            We hold ourselves to rigorous operational metrics so your travel is always smooth and stress-free.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {corePillars.map((pillar) => (
            <div
              key={pillar.title}
              className="card-surface hover-lift group relative flex flex-col justify-between p-7 rounded-2xl border border-line transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 shadow-sm">
                    {pillar.icon}
                  </span>
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-[0.6875rem] font-bold text-fg">
                    {pillar.highlight}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {pillar.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modern Fleet Standards & Engineering ── */}
      <section className="mt-16 rounded-2xl border border-line bg-gradient-to-br from-surface to-surface-2 p-8 sm:p-12 shadow-sm">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <BusIcon className="h-3.5 w-3.5" />
            Engineering & Safety
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Built for highway reliability & passenger peace of mind
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Our fleet features modern Scania Irizar i6 and Isuzu luxury coaches engineered with advanced safety telemetry.
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {fleetHighlights.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                {f.icon}
              </span>
              <h3 className="mt-3 text-sm font-bold text-fg">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Chronological Milestone Journey (2017 to 2026) ── */}
      <section className="mt-16 border-t border-line pt-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
              <CompassIcon className="h-3.5 w-3.5" />
              Company Milestones
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              How we transformed travel across Uganda
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Every milestone removed an inefficient paper process and replaced it with live digital transparency for passengers, counter supervisors, and coach drivers.
            </p>

            <div className="mt-6 rounded-2xl border border-line bg-surface p-5 text-xs text-muted space-y-2">
              <div className="flex items-center gap-2 font-semibold text-fg">
                <AwardIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span>Certified Digital Transport Provider</span>
              </div>
              <p>
                Fully compliant with National Transport Safety regulations and Bank of Uganda payment standards.
              </p>
            </div>
          </div>

          <ol className="relative space-y-8">
            {aboutMilestones.map((milestone, index) => (
              <li key={milestone.year} className="relative flex gap-6">
                {/* Connecting Line */}
                {index < aboutMilestones.length - 1 && (
                  <span
                    className="absolute left-[19px] top-10 h-full w-0.5 bg-line"
                    aria-hidden="true"
                  />
                )}

                {/* Circle Badge */}
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-600 font-bold text-xs text-white shadow-sm shadow-brand-950/20">
                  {milestone.year.slice(2)}'
                </span>

                {/* Milestone Card */}
                <div className="card-surface flex-1 p-5 rounded-2xl border border-line">
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                    {milestone.year}
                  </span>
                  <h3 className="mt-1 text-base font-bold text-fg">{milestone.title}</h3>
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted">
                    {milestone.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Bottom Booking Call to Action ── */}
      <section className="mt-16 rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 p-8 text-white shadow-xl shadow-brand-950/10 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Experience the LinkBus difference
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              Book your next journey online, pick your favorite seat, and board in seconds with your digital QR boarding pass.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/search"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-brand-800 shadow-md transition-all hover:bg-white/90 active:scale-95"
            >
              Find a Trip & Book
            </Link>
            <Link
              to="/terminals"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
            >
              <MapPinIcon className="h-4 w-4" />
              View Terminals
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}