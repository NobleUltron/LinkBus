import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  DatabaseIcon,
  EyeOffIcon,
  FileCheckIcon,
  HelpCircleIcon,
  KeyRoundIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  ServerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserCheckIcon,
} from 'lucide-react';

const privacySections = [
  {
    id: 'info-collected',
    title: '1. Information We Collect',
    icon: <DatabaseIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          We collect personal data required to issue digital coach tickets, verify passenger manifests, and ensure smooth transit across our route network:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Passenger Identity:</strong> Full legal name, gender, and age category (adult/child).</li>
          <li><strong>Contact Details:</strong> Phone number (for SMS ticket dispatch, departure alerts, and driver communications) and email address.</li>
          <li><strong>Manifest & Travel Records:</strong> Origin and destination stations, departure times, assigned seat numbers, baggage tags, and ticket QR tokens.</li>
          <li><strong>Account Credentials:</strong> Hashed passwords, encrypted session tokens, and OAuth identifiers when signing in with Google.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'payment-security',
    title: '2. Payment Data & Mobile Money Security',
    icon: <LockIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          2.1. <strong>Zero Storage of Sensitive Financial Credentials:</strong> LinkBus does not store your Mobile Money PIN, banking passwords, or Credit/Debit Card CVV security codes.
        </p>
        <p>
          2.2. When you initiate an MTN MoMo, Airtel Money, or Card payment, transactions are processed directly via secure, PCI-DSS-compliant telecom payment gateways using end-to-end encrypted API tunnels.
        </p>
        <p>
          2.3. We only record the transaction reference number, amount paid, and timestamp to generate your verified digital receipt.
        </p>
      </div>
    ),
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Your Information',
    icon: <FileCheckIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>Your data is processed strictly for legitimate operational purposes:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Issuing real-time electronic boarding passes and verifying seating charts at boarding gates.</li>
          <li>Sending automated SMS flight-style departure reminders, gate assignments, and schedule adjustments.</li>
          <li>Processing authorized booking cancellations, refunds, or trip transfers.</li>
          <li>Complying with statutory passenger manifest regulations mandated by Uganda’s Ministry of Works and Transport and Uganda Police Traffic Directorate.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'data-sharing',
    title: '4. Third-Party Sharing & Disclosure',
    icon: <EyeOffIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          4.1. <strong>No Commercial Sale of Data:</strong> LinkBus never sells, rents, or monetizes passenger personal information to third-party advertisers.
        </p>
        <p>
          4.2. <strong>Service Providers:</strong> We share necessary data exclusively with trusted technical partners (e.g. licensed telecom SMS gateways for alert delivery and Google Cloud/AWS hosting infrastructure).
        </p>
        <p>
          4.3. <strong>Legal & Regulatory Compliance:</strong> In compliance with national safety laws, official passenger manifests may be submitted to statutory transportation authorities and emergency responders in the event of highway incidents.
        </p>
      </div>
    ),
  },
  {
    id: 'safeguards',
    title: '5. Security Safeguards & Encryption',
    icon: <ServerIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          5.1. <strong>256-Bit SSL/TLS Encryption:</strong> All communications between your browser, mobile device, and LinkBus cloud servers are secured using industry-standard TLS cryptographic encryption.
        </p>
        <p>
          5.2. <strong>Role-Based Access Control (RBAC):</strong> Access to passenger manifests and customer records is strictly compartmentalized. Station conductors and drivers can only view passenger names and assigned seat numbers for their specific trips.
        </p>
      </div>
    ),
  },
  {
    id: 'passenger-rights',
    title: '6. Your Rights & Data Control',
    icon: <UserCheckIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          Under the <strong>Data Protection and Privacy Act, 2019 (Uganda)</strong>, you are entitled to:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Access & Review:</strong> View all your active and past journey bookings directly inside your Passenger Dashboard.</li>
          <li><strong>Correction & Updates:</strong> Modify your contact telephone number, name, and profile preferences at any time.</li>
          <li><strong>Account Deletion:</strong> Request the deletion of your account and personal profile by emailing our Data Protection Officer.</li>
        </ul>
      </div>
    ),
  },
];

export function Privacy() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 space-y-12 pb-16">
      {/* ── Hero Header ── */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface-2 to-surface p-8 sm:p-12 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            <span>Passenger Privacy & Security</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Privacy Policy & Data Protection
          </h1>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            LinkBus Uganda is committed to safeguarding your personal data and privacy. This policy explains what information we collect, how we protect your payment details, and how your data is used to deliver reliable intercity transit.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-faint">
            <span className="flex items-center gap-1.5 font-medium">
              <ClockIcon className="h-3.5 w-3.5 text-brand-600" />
              Last Revised: August 2026
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
              Compliant with Uganda Data Protection & Privacy Act (2019)
            </span>
          </div>
        </div>
      </section>

      {/* ── Quick Anchor Navigation ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4 text-xs font-semibold">
        <span className="text-muted mr-1">Jump to topic:</span>
        {privacySections.map((sec) => (
          <a
            key={sec.id}
            href={`#${sec.id}`}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-muted transition-colors hover:border-emerald-500/50 hover:bg-surface-2 hover:text-fg"
          >
            {sec.title.split('. ')[1]}
          </a>
        ))}
      </div>

      {/* ── Privacy Sections Grid ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Content List */}
        <div className="space-y-6">
          {privacySections.map((section) => (
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

        {/* Right Sticky DPO & Contact Card */}
        <div className="space-y-6">
          <div className="sticky top-24 rounded-2xl border border-line bg-surface-2/60 p-6 backdrop-blur-xl shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <KeyRoundIcon className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-fg text-sm">Data Protection Officer</h3>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              For inquiries regarding data privacy, personal information access requests, or manifest records, contact our designated Data Protection Officer:
            </p>

            <div className="space-y-2.5 border-t border-line/70 pt-4 text-xs">
              <div className="flex items-center gap-2.5 text-muted">
                <MailIcon className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-fg">privacy@linkbus.co.ug</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted">
                <PhoneIcon className="h-4 w-4 text-emerald-600" />
                <span>+256 700 123 456</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                <span>Kampala Central Terminal HQ</span>
              </div>
            </div>

            <div className="pt-2 border-t border-line/70 space-y-2">
              <Link
                to="/terms"
                className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs font-bold text-fg transition-all hover:bg-surface-2 hover:border-line-hover"
              >
                <span>Terms of Service</span>
                <ArrowRightIcon className="h-3.5 w-3.5 text-muted" />
              </Link>
              <Link
                to="/contact"
                className="flex items-center justify-between rounded-xl bg-emerald-600 p-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700"
              >
                <span>Contact Support</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
