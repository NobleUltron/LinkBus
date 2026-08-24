import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircleIcon,
  ArmchairIcon,
  ArrowRightIcon,
  BusIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  FileTextIcon,
  HeartHandshakeIcon,
  HelpCircleIcon,
  LuggageIcon,
  PhoneIcon,
  RefreshCwIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TicketIcon,
} from 'lucide-react';

const sections = [
  {
    id: 'bookings-tickets',
    title: '1. Booking & Digital Ticketing',
    icon: <TicketIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          1.1. When you reserve a ticket through LinkBus (online portal, mobile app, or official station counter), you enter into a binding contract of carriage governed by the laws of the Republic of Uganda and the guidelines of the Ministry of Works and Transport.
        </p>
        <p>
          1.2. <strong>Guaranteed Seat Allocation:</strong> Every confirmed booking guarantees the specific seat number selected on the interactive 2D cabin map. LinkBus does not practice overbooking or standing passengers on intercity scheduled coaches.
        </p>
        <p>
          1.3. <strong>E-Ticket Validity:</strong> Your digital boarding pass containing a cryptographic QR code is sent via SMS and available in your portal account. This QR code must be presented in digital or printed format at the boarding gate.
        </p>
      </div>
    ),
  },
  {
    id: 'fares-payments',
    title: '2. Fares, Taxes & Payment Methods',
    icon: <CreditCardIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          2.1. Fares quoted on the platform are in <strong>Uganda Shillings (UGX)</strong> and are inclusive of all applicable statutory transit taxes and passenger manifest levies.
        </p>
        <p>
          2.2. We accept payments through official telecom Mobile Money APIs (<strong>MTN Mobile Money</strong>, <strong>Airtel Money</strong>), major payment cards (<strong>Visa</strong>, <strong>Mastercard</strong>), and authorized cash collections at LinkBus station terminal counters.
        </p>
        <p>
          2.3. Seat holds during checkout are active for <strong>10 minutes</strong>. If payment authorization is not completed within this window, the seat is automatically returned to the public booking pool to prevent hoarding.
        </p>
      </div>
    ),
  },
  {
    id: 'checkin-boarding',
    title: '3. Check-In & Boarding Protocol',
    icon: <ClockIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          3.1. <strong>Reporting Time:</strong> Passengers must arrive at the departure terminal at least <strong>30 minutes prior</strong> to scheduled departure time (or 45 minutes prior for peak holiday travel) to facilitate luggage tagging and manifest verification.
        </p>
        <p>
          3.2. <strong>Identification:</strong> Passengers must present valid government-issued identification (National ID, Passport, Driver’s License, or Student ID) matching the name on the passenger manifest upon conductor request.
        </p>
        <p>
          3.3. <strong>Missed Departures:</strong> Coaches depart promptly on schedule. LinkBus is not liable for passengers who fail to report at the designated departure bay before departure time.
        </p>
      </div>
    ),
  },
  {
    id: 'luggage-cargo',
    title: '4. Baggage, Cargo & Prohibited Items',
    icon: <LuggageIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          4.1. <strong>Free Luggage Allowance:</strong> Each ticket includes free carriage of up to <strong>20 kg</strong> of standard personal baggage securely placed in the undercarriage cargo bay, plus one compact carry-on item for overhead racks.
        </p>
        <p>
          4.2. <strong>Excess Luggage & Parcels:</strong> Luggage exceeding 20 kg or commercial cargo/sacks will be billed per kilogram according to published terminal excess rates and issued an official LinkBus Parcel tag.
        </p>
        <p>
          4.3. <strong>Prohibited Articles:</strong> Hazardous materials, flammable liquids, unregistered firearms, illicit drugs, livestock, and unpreserved perishable goods with strong odors are strictly prohibited aboard coaches.
        </p>
      </div>
    ),
  },
  {
    id: 'cancellations-refunds',
    title: '5. Cancellations, Rescheduling & Refunds',
    icon: <RefreshCwIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          5.1. <strong>Passenger Self-Service Cancellation:</strong> Bookings can be cancelled directly through the Passenger Dashboard up to 1 hour before scheduled departure. A standard <strong>10% cancellation fee</strong> is deducted, and the remaining <strong>90% balance</strong> is refunded to the original payment channel.
        </p>
        <p>
          5.2. <strong>Carrier Service Cancellations:</strong> In the rare event that a coach departure is cancelled or delayed significantly by LinkBus due to mechanical inspection or road safety, passengers are entitled to a <strong>100% full refund</strong> (0% fee) or an instant free transfer to the next available departure.
        </p>
        <p>
          5.3. <strong>Rescheduling:</strong> Tickets may be rescheduled to an alternate departure time or date at least 2 hours before the original trip without penalty, subject to seat availability.
        </p>
      </div>
    ),
  },
  {
    id: 'safety-conduct',
    title: '6. Passenger Safety & Onboard Conduct',
    icon: <ShieldCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          6.1. <strong>Speed Governance & GPS Monitoring:</strong> All LinkBus coaches are governed to a maximum speed of 80 km/h and continuously tracked in real time from the Central Operations Command Center in Kampala.
        </p>
        <p>
          6.2. <strong>Seatbelts:</strong> In accordance with national traffic regulations, passengers are required to fasten seatbelts whenever the vehicle is in motion.
        </p>
        <p>
          6.3. <strong>Onboard Etiquette:</strong> Smoking, vaping, intoxication, and disruptive behavior are strictly prohibited. The coach captain reserves the right to refuse carriage or deboard any individual endangering passenger safety.
        </p>
      </div>
    ),
  },
  {
    id: 'liability-law',
    title: '7. Limitation of Liability & Governing Law',
    icon: <ScaleIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          7.1. LinkBus is committed to safe, comfortable transit. However, LinkBus is not liable for indirect or consequential losses caused by delays resulting from force majeure, extreme weather, highway construction, or police roadblocks.
        </p>
        <p>
          7.2. All passengers and registered cargo aboard LinkBus coaches are covered by comprehensive statutory third-party and passenger liability insurance.
        </p>
        <p>
          7.3. These Terms are governed by and construed in accordance with the Laws of Uganda. Any legal disputes shall be subject to the exclusive jurisdiction of the Courts of Uganda.
        </p>
      </div>
    ),
  },
];

export function Terms() {
  return (
    <div className="space-y-12 pb-16">
      {/* ── Hero Header ── */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface-2 to-surface p-8 sm:p-12 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">
            <ScaleIcon className="h-3.5 w-3.5" />
            <span>Legal & Carriage Agreement</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Terms of Service & Conditions of Carriage
          </h1>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Welcome to Link Bus Services Uganda. These Conditions of Carriage outline the rules, rights, and obligations governing passenger transport, digital ticketing, luggage handling, and refunds across our national intercity network.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-faint">
            <span className="flex items-center gap-1.5 font-medium">
              <ClockIcon className="h-3.5 w-3.5 text-brand-600" />
              Effective: August 2026
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
              Regulated by Ministry of Works & Transport
            </span>
          </div>
        </div>
      </section>

      {/* ── Quick Anchor Navigation ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4 text-xs font-semibold">
        <span className="text-muted mr-1">Jump to section:</span>
        {sections.map((sec) => (
          <a
            key={sec.id}
            href={`#${sec.id}`}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-muted transition-colors hover:border-brand-500/50 hover:bg-surface-2 hover:text-fg"
          >
            {sec.title.split('. ')[1]}
          </a>
        ))}
      </div>

      {/* ── Terms Sections Content ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Terms List */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all hover:border-line-hover sm:p-8"
            >
              <div className="flex items-center gap-3 border-b border-line/60 pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 border border-line shadow-xs">
                  {section.icon}
                </div>
                <h2 className="text-lg font-bold tracking-tight text-fg">
                  {section.title}
                </h2>
              </div>

              <div className="mt-4">{section.content}</div>
            </div>
          ))}
        </div>

        {/* Right Sticky Help & Inquiries Card */}
        <div className="space-y-6">
          <div className="sticky top-24 rounded-2xl border border-line bg-surface-2/60 p-6 backdrop-blur-xl shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <HelpCircleIcon className="h-5 w-5 text-brand-600" />
              <h3 className="font-bold text-fg text-sm">Need Legal or Booking Help?</h3>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              If you have any questions regarding your ticket, special luggage arrangements, or corporate group travel policies, our customer care desk is active 24/7.
            </p>

            <div className="space-y-2.5 border-t border-line/70 pt-4 text-xs">
              <div className="flex items-center gap-2.5 text-muted">
                <PhoneIcon className="h-4 w-4 text-brand-600" />
                <span className="font-bold text-fg">+256 700 123 456</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted">
                <FileTextIcon className="h-4 w-4 text-brand-600" />
                <span>legal@linkbus.co.ug</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted">
                <BusIcon className="h-4 w-4 text-brand-600" />
                <span>Kampala Central Terminal, Arua Park</span>
              </div>
            </div>

            <div className="pt-2 border-t border-line/70 space-y-2">
              <Link
                to="/privacy"
                className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs font-bold text-fg transition-all hover:bg-surface-2 hover:border-line-hover"
              >
                <span>Read Privacy Policy</span>
                <ArrowRightIcon className="h-3.5 w-3.5 text-muted" />
              </Link>
              <Link
                to="/contact"
                className="flex items-center justify-between rounded-xl bg-brand-600 p-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700"
              >
                <span>Contact Customer Care</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
