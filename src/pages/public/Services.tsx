import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArmchairIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  Building2Icon,
  BusIcon,
  CalculatorIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CreditCardIcon,
  CrownIcon,
  HelpCircleIcon,
  MapPinIcon,
  MessageSquareIcon,
  PackageCheckIcon,
  PackageIcon,
  PhoneIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StoreIcon,
  UsersIcon,
  WifiIcon,
  WindIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { money } from '../../utils/format';

interface CabinClass {
  id: string;
  name: string;
  badge: string;
  description: string;
  fareMultiplier: string;
  features: string[];
  specs: {
    legroom: string;
    recline: string;
    power: string;
    baggage: string;
    wifi: string;
    lounge: boolean;
  };
}

const cabinClasses: CabinClass[] = [
  {
    id: 'standard',
    name: 'Standard Coach',
    badge: 'Popular Choice',
    description: 'High-comfort transit with air-conditioning and full luggage allowance for daily commuters and travelers.',
    fareMultiplier: '1.0× Base Fare',
    features: [
      'High-back cushioned seats',
      'Air conditioning throughout cabin',
      'Standard USB charging ports',
      '20kg tracked luggage included',
      'Digital QR boarding pass',
    ],
    specs: {
      legroom: '32 inches',
      recline: '115 degrees',
      power: 'Shared USB-A',
      baggage: '20kg Free',
      wifi: 'Standard High-Speed',
      lounge: false,
    },
  },
  {
    id: 'vip',
    name: 'VIP Executive',
    badge: 'Luxury Tier',
    description: 'Front cabin exclusivity with extra wide reclining leather seats, dedicated fast charging, and terminal lounge access.',
    fareMultiplier: '1.5× Base Fare',
    features: [
      'Extra-wide ergonomic leather recliners',
      'Dedicated front-cabin seating zone',
      'Individual USB-C fast charging at seat',
      'Access to VIP departure lounge',
      'Priority boarding & dedicated overhead bin',
      'Complimentary bottled water',
    ],
    specs: {
      legroom: '38 inches (Extra Legroom)',
      recline: '140 degrees deep recline',
      power: 'Individual USB-C & USB-A',
      baggage: '25kg Free Allowance',
      wifi: 'Ultra-Fast Priority Wi-Fi',
      lounge: true,
    },
  },
  {
    id: 'sleeper',
    name: 'Executive Sleeper',
    badge: 'Night Lines',
    description: 'Full-recline horizontal berths with privacy curtains and individual reading lights for overnight intercity routes.',
    fareMultiplier: '1.8× Base Fare',
    features: [
      'Full horizontal recline sleeper berth',
      'Privacy curtain & individual reading light',
      'Overnight long-haul routes (Gulu & Western)',
      'Complimentary fresh blanket & pillow',
      'Dedicated luggage locker compartment',
    ],
    specs: {
      legroom: 'Full 6.2ft Lie-Flat Berth',
      recline: '180 degrees horizontal',
      power: 'Individual AC Plug & USB',
      baggage: '30kg Free Allowance',
      wifi: 'Ultra-Fast Priority Wi-Fi',
      lounge: true,
    },
  },
];

const serviceFaqs = [
  {
    q: 'What is included in my free luggage allowance?',
    a: 'Every standard ticket includes 20kg of tracked luggage placed in the coach hold, plus one small personal carry-on item (backpack or handbag) for the overhead bin. Each bag receives a digital barcode tag linked to your boarding pass.',
  },
  {
    q: 'How does excess luggage billing work?',
    a: 'Baggage exceeding the free allowance is weighed at terminal check-in and billed per extra kilogram (UGX 2,000/kg). You can pay via MTN MoMo, Airtel Money, or cash directly at the baggage counter and receive an itemized receipt.',
  },
  {
    q: 'How does same-day parcel delivery work?',
    a: 'Drop your parcel at any of our 8 regional terminal cargo counters. Parcels are dispatched on the next scheduled departure. The sender and recipient both receive instant WhatsApp/SMS notifications with tracking numbers and collection codes.',
  },
  {
    q: 'Can our institution charter a bus for private travel?',
    a: 'Yes! We offer full coach charters for corporate retreats, schools, sports teams, and weddings across Uganda. Charters include a dedicated senior captain, customized pickup schedule, and flexible route itineraries.',
  },
  {
    q: 'What happens if I need to cancel or reschedule?',
    a: 'You can reschedule your departure up to 2 hours before scheduled departure time with zero penalty. Cancellations are subject to a nominal 10% processing fee, with refunds processed to your original mobile money or card account.',
  },
];

export function Services() {
  const { settings } = useSettings();
  const [selectedCabin, setSelectedCabin] = useState<string>('vip');
  const [baggageWeight, setBaggageWeight] = useState<number>(25);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const freeAllowance = Number(settings.free_luggage_kg || 20);
  const feePerKg = Number(settings.excess_luggage_fee_per_kg || 2000);
  const excessKg = Math.max(0, baggageWeight - freeAllowance);
  const estimatedExcessFee = excessKg * feePerKg;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* ── Page Header & Hero ── */}
      <div className="flex flex-col justify-between gap-6 border-b border-line pb-10 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <SparklesIcon className="h-3.5 w-3.5" />
            Comprehensive Transport & Logistics
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Fleet Experience & Services
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            From scheduled intercity departures and luxury VIP executive cabins to tracked same-day parcel courier and tailored corporate charters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/search"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow-md shadow-brand-950/10 transition-all hover:bg-brand-700 active:scale-95"
          >
            Find a Trip
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <a
            href="https://wa.me/256705083933?text=Hello%20LinkBus,%20I%20would%20like%20to%20inquire%20about%20a%20private%20charter"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-fg transition-all hover:bg-surface-2 active:scale-95"
          >
            <MessageSquareIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Charter Inquiry
          </a>
        </div>
      </div>

      {/* ── 4 Core Service Pillars ── */}
      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
          Core Movement Capabilities
        </h2>
        <p className="mt-1 text-sm text-muted">
          Unified systems connecting passengers, luggage, and commercial parcels across Uganda.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Pillar 1 */}
          <article className="card-surface hover-lift group flex flex-col justify-between p-6 rounded-2xl border border-line transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 font-bold">
                <BusIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-fg group-hover:text-brand-600 dark:group-hover:text-brand-400">
                Scheduled Intercity Travel
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                620+ departures weekly covering Western, Northern, and Eastern corridors with guaranteed on-time dispatch.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-fg">
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                  Live 2D cabin seat selection
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                  Instant QR paperless boarding
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                  20kg tracked luggage included
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-line/60 pt-4">
              <Link
                to="/search"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 inline-flex items-center gap-1"
              >
                Browse schedules <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
          </article>

          {/* Pillar 2 */}
          <article className="card-surface hover-lift group flex flex-col justify-between p-6 rounded-2xl border border-line transition-all duration-200 hover:border-amber-500/40 hover:shadow-lg">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 font-bold">
                <CrownIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-fg group-hover:text-amber-600 dark:group-hover:text-amber-400">
                VIP Executive Cabins
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Premium front cabin seating with extra legroom, plush leather recliners, USB-C fast charging, and VIP lounge access.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-fg">
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  Extra wide reclining leather
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  VIP Terminal lounge entry
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  Priority bay boarding
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-line/60 pt-4">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                1.5× Base Fare
              </span>
            </div>
          </article>

          {/* Pillar 3 */}
          <article className="card-surface hover-lift group flex flex-col justify-between p-6 rounded-2xl border border-line transition-all duration-200 hover:border-emerald-500/40 hover:shadow-lg">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 font-bold">
                <PackageCheckIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-fg group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                Same-Day Parcel Delivery
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Fast terminal-to-terminal cargo logistics. Every package is barcoded, tracked, and dispatched on the next departing bus.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-fg">
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Barcode waypoint milestone tracking
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Instant SMS & WhatsApp collection PIN
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Secure terminal collection lockers
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-line/60 pt-4">
              <Link
                to="/parcels/track"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1"
              >
                Track a parcel <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
          </article>

          {/* Pillar 4 */}
          <article className="card-surface hover-lift group flex flex-col justify-between p-6 rounded-2xl border border-line transition-all duration-200 hover:border-indigo-500/40 hover:shadow-lg">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 font-bold">
                <UsersIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-fg group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                Corporate & Group Charter
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Private coach hire for institutions, sports teams, weddings, conferences, and tours with tailored itineraries.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-fg">
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  Full coach private bookings
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  Dedicated senior coach captain
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  Monthly invoicing for corporate accounts
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-line/60 pt-4">
              <a
                href="mailto:corporate@linkbus.co.ug"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1"
              >
                Inquire for charter <ArrowRightIcon className="h-3 w-3" />
              </a>
            </div>
          </article>
        </div>
      </section>

      {/* ── Cabin Class Comparison Matrix ── */}
      <section className="mt-16 border-t border-line pt-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <ArmchairIcon className="h-3.5 w-3.5" />
            Cabin Class Comparison
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Choose your preferred travel style
          </h2>
          <p className="mt-2 text-sm text-muted">
            All LinkBus coaches feature modern chassis, professional GPS speed governing, and air conditioning.
          </p>
        </div>

        {/* 3-Card Comparison Grid */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {cabinClasses.map((cabin) => {
            const isVipTier = cabin.id === 'vip';
            return (
              <div
                key={cabin.id}
                className={`card-surface hover-lift relative flex flex-col justify-between rounded-2xl p-6 sm:p-7 transition-all duration-200 ${
                  isVipTier
                    ? 'border-2 border-brand-500 shadow-lg shadow-brand-950/5'
                    : 'border border-line'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      {cabin.badge}
                    </span>
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-fg">
                      {cabin.fareMultiplier}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-bold text-fg">{cabin.name}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{cabin.description}</p>

                  {/* Key Specifications Matrix */}
                  <div className="mt-6 space-y-2.5 rounded-xl bg-surface-2/60 p-4 text-xs">
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <span className="text-muted">Legroom</span>
                      <span className="font-bold text-fg">{cabin.specs.legroom}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <span className="text-muted">Seat Recline</span>
                      <span className="font-bold text-fg">{cabin.specs.recline}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <span className="text-muted">Power & Charging</span>
                      <span className="font-bold text-fg">{cabin.specs.power}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <span className="text-muted">Luggage Allowance</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400">{cabin.specs.baggage}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">VIP Lounge Access</span>
                      <span className="font-bold text-fg">
                        {cabin.specs.lounge ? '✅ Included' : '❌ Not included'}
                      </span>
                    </div>
                  </div>

                  {/* Bullet Highlights */}
                  <ul className="mt-6 space-y-2 text-xs text-fg">
                    {cabin.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <CheckCircle2Icon className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-line">
                  <Link
                    to="/search"
                    className={`inline-flex h-10 w-full items-center justify-center rounded-xl text-xs font-bold transition-all ${
                      isVipTier
                        ? 'bg-brand-600 text-white hover:bg-brand-700 shadow'
                        : 'border border-line bg-surface text-fg hover:bg-surface-2'
                    }`}
                  >
                    Select {cabin.name}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Live Baggage & Parcel Excess Fee Calculator Widget ── */}
      <section className="mt-16 rounded-2xl border border-line bg-gradient-to-br from-surface to-surface-2 p-6 sm:p-10 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
              <CalculatorIcon className="h-3.5 w-3.5" />
              Real-Time Tariff Calculator
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Luggage & Excess Baggage Estimator
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Every passenger ticket automatically includes <strong className="text-fg">{freeAllowance}kg of free baggage</strong>. Drag the slider to estimate additional baggage costs before reaching the terminal.
            </p>

            {/* Slider Widget */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="baggage-slider" className="text-xs font-bold uppercase tracking-wider text-muted">
                  Total Bag Weight (KG)
                </label>
                <span className="text-xl font-extrabold text-brand-600 dark:text-brand-400">
                  {baggageWeight} KG
                </span>
              </div>
              <input
                id="baggage-slider"
                type="range"
                min="5"
                max="60"
                step="1"
                value={baggageWeight}
                onChange={(e) => setBaggageWeight(Number(e.target.value))}
                className="w-full h-2 bg-line rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-[0.6875rem] text-muted font-semibold">
                <span>5 kg (Light)</span>
                <span>20 kg (Included Free)</span>
                <span>40 kg</span>
                <span>60 kg (Heavy Cargo)</span>
              </div>
            </div>
          </div>

          {/* Calculator Output Card */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted border-b border-line pb-3">
                Calculation Breakdown
              </h3>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Ticket Free Allowance:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {freeAllowance} kg (Free)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Billable Excess Weight:</span>
                  <span className="font-bold text-fg">
                    {excessKg > 0 ? `+${excessKg} kg` : '0 kg (Within allowance)'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="text-muted">Excess Rate per KG:</span>
                  <span className="font-semibold text-fg">{money(feePerKg)} / kg</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-surface-2 p-3.5 border border-line mt-4">
                  <div>
                    <span className="block text-xs font-semibold text-muted">Estimated Excess Fee</span>
                    <span className="text-2xl font-extrabold text-brand-600 dark:text-brand-400">
                      {excessKg > 0 ? money(estimatedExcessFee) : 'UGX 0'}
                    </span>
                  </div>
                  <span className="text-[0.6875rem] text-right text-muted max-w-[140px]">
                    Payable via MTN MoMo, Airtel, or Counter Cash
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Corporate Charter Banner ── */}
      <section className="mt-16 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-slate-950 via-brand-950 to-slate-900 p-8 text-white shadow-xl sm:p-10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300">
              <Building2Icon className="h-3.5 w-3.5" />
              Institutional & Fleet Solutions
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Planning a group event or organizational charter?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Book private 35-seat and 65-seat luxury coaches with dedicated captains, bespoke route milestones, and monthly corporate invoicing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="https://wa.me/256705083933?text=Hello%20LinkBus%20Corporate%20Desk,%20I%20would%20like%20a%20quote%20for%20a%20charter"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-xs font-bold text-slate-950 shadow transition-all hover:bg-emerald-400 active:scale-95"
            >
              <MessageSquareIcon className="h-4 w-4" />
              Chat on WhatsApp Charter Desk
            </a>
            <a
              href="tel:+256700123456"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition-all hover:bg-white/20 active:scale-95"
            >
              <PhoneIcon className="h-3.5 w-3.5" />
              Call Corporate Desk
            </a>
          </div>
        </div>
      </section>

      {/* ── Interactive Service FAQs ── */}
      <section className="mt-16 border-t border-line pt-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <HelpCircleIcon className="h-3.5 w-3.5" />
            Frequently Asked Questions
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Everything you need to know about our services
          </h2>
        </div>

        <div className="mt-8 max-w-3xl mx-auto space-y-3">
          {serviceFaqs.map((faq, index) => {
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

      {/* ── Bottom Booking Action ── */}
      <div className="mt-16 text-center border-t border-line pt-10">
        <h3 className="text-xl font-bold text-fg">Ready to travel across Uganda?</h3>
        <p className="mt-1 text-sm text-muted">
          Select your destination and lock in your seat in under two minutes.
        </p>
        <div className="mt-5">
          <Link
            to="/search"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow transition-all hover:bg-brand-700 active:scale-95"
          >
            Find a Trip & Book Now
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}