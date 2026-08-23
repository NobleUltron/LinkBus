import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  Building2Icon,
  BusIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  CreditCardIcon,
  HelpCircleIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareIcon,
  PackageCheckIcon,
  PhoneCallIcon,
  PhoneIcon,
  QrCodeIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TicketIcon,
  UserCheckIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { useSettings } from '../../contexts/SettingsContext';
import { faqs } from '../../data/content';

interface FormState {
  name: string;
  email: string;
  phone: string;
  topic: string;
  bookingRef: string;
  message: string;
}

const topicOptions = [
  { id: 'booking', label: '🎟️ Booking & QR Pass', desc: 'Seat change, QR code recovery, departure times' },
  { id: 'luggage', label: '🧳 Baggage & Parcel', desc: 'Tracking, allowance, lost item inquiry' },
  { id: 'refund', label: '💳 Payment & Refund', desc: 'Mobile Money charge, cancelled trip refund' },
  { id: 'group', label: '🏢 Corporate Charter', desc: 'School, institution, or wedding bus hire' },
  { id: 'feedback', label: '⭐ Service Feedback', desc: 'Commend a driver or report an incident' },
];

const terminalHotlines = [
  { city: 'Kampala', name: 'Namayiba Main Terminal', phone: '+256 700 123 456', counter: 'Counter 12 (Arrivals Hall)' },
  { city: 'Mbarara', name: 'Mbarara Central Terminal', phone: '+256 700 123 457', counter: 'Counter 4 (Main Bay)' },
  { city: 'Fort Portal', name: 'Fort Portal Tourism Hub', phone: '+256 700 123 458', counter: 'Counter 2 (Lugard Rd)' },
  { city: 'Gulu', name: 'Gulu Northern Line Bay', phone: '+256 700 123 459', counter: 'Counter 1 (Main Bus Park)' },
  { city: 'Jinja', name: 'Jinja Eastern Shuttle', phone: '+256 700 123 460', counter: 'Counter 3 (Main Street)' },
  { city: 'Kasese', name: 'Kasese Terminal', phone: '+256 700 123 461', counter: 'Counter 2 (Express Gate)' },
  { city: 'Masaka', name: 'Masaka Southern Desk', phone: '+256 700 123 462', counter: 'Counter 1 (Highway Bay)' },
  { city: 'Mubende', name: 'Mubende Station', phone: '+256 700 123 463', counter: 'Counter 1 (Transit Gate)' },
];

export function Contact() {
  const { settings } = useSettings();
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    topic: 'booking',
    bookingRef: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pending, setPending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const validate = (field: keyof FormState, value: string): string | undefined => {
    if (field === 'name' && !value.trim()) return 'Please enter your full name.';
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
    if (field === 'message' && value.trim().length < 15) return 'Please tell us a little more (at least 15 characters).';
    return undefined;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Partial<Record<keyof FormState, string>> = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
      const message = validate(key, form[key]);
      if (message) next[key] = message;
    });
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    setPending(false);
    setForm({
      name: '',
      email: '',
      phone: '',
      topic: 'booking',
      bookingRef: '',
      message: '',
    });
    toast.success('Message received! Our customer care team will reply shortly via WhatsApp or Email.');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-6 border-b border-line pb-10 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <SparklesIcon className="h-3.5 w-3.5" />
            24/7 Dedicated Passenger Care
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Customer Care & Station Desks
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Whether you need instant QR pass recovery, baggage tracking, refund assistance, or corporate bus charter, our team is on ground at all 8 terminals and online 24/7.
          </p>
        </div>

        <a
          href="https://wa.me/256705083933?text=Hello%20LinkBus%20Customer%20Support,%20I%20need%20assistance%20with%20my%20travel"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-md shadow-brand-950/10 transition-all hover:bg-emerald-500 active:scale-95 shrink-0"
        >
          <MessageSquareIcon className="h-4 w-4" />
          Chat on WhatsApp Support
        </a>
      </div>

      {/* ── Urgent Departure / Lost Luggage Ribbon ── */}
      <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 text-amber-900 dark:text-amber-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <AlertCircleIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Departing in the next 2 hours or urgent baggage inquiry?
              </p>
              <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/90">
                Call our direct dispatch desk at <strong className="font-bold">{settings.company_phone || '+256 700 123 456'}</strong> for instant on-ground resolution.
              </p>
            </div>
          </div>

          <a
            href={`tel:${settings.company_phone || '+256700123456'}`}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-700 active:scale-95 shrink-0"
          >
            <PhoneCallIcon className="h-3.5 w-3.5" />
            Call Emergency Dispatch
          </a>
        </div>
      </div>

      {/* ── 3 Instant Support Channel Cards ── */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {/* WhatsApp */}
        <div className="card-surface hover-lift flex flex-col justify-between p-6 rounded-2xl border border-emerald-500/30 transition-all duration-200 hover:shadow-lg">
          <div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              <MessageSquareIcon className="h-6 w-6" />
            </span>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[0.6875rem] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Instant 1-Click WhatsApp
            </span>
            <h2 className="mt-2 text-lg font-bold text-fg">WhatsApp Live Desk</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Get immediate assistance with booking confirmations, QR pass re-issuance, and bus arrival updates.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-line">
            <a
              href="https://wa.me/256705083933?text=Hello%20LinkBus%20Support,%20I%20need%20assistance"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-all hover:bg-emerald-500 active:scale-95"
            >
              <MessageSquareIcon className="h-3.5 w-3.5" />
              Open WhatsApp Chat
            </a>
          </div>
        </div>

        {/* Telephone */}
        <div className="card-surface hover-lift flex flex-col justify-between p-6 rounded-2xl border border-brand-500/30 transition-all duration-200 hover:shadow-lg">
          <div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600 dark:text-brand-400 font-bold">
              <PhoneIcon className="h-6 w-6" />
            </span>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-[0.6875rem] font-bold text-brand-700 dark:text-brand-300">
              05:00 AM – 11:30 PM Daily
            </span>
            <h2 className="mt-2 text-lg font-bold text-fg">Voice Hotline Desk</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Speak directly with our central station operators for seat availability, bay directions, and telephone reservations.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-line">
            <a
              href={`tel:${settings.company_phone || '+256700123456'}`}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-bold text-white transition-all hover:bg-brand-700 active:scale-95"
            >
              <PhoneIcon className="h-3.5 w-3.5" />
              {settings.company_phone || '+256 700 123 456'}
            </a>
          </div>
        </div>

        {/* Email */}
        <div className="card-surface hover-lift flex flex-col justify-between p-6 rounded-2xl border border-line transition-all duration-200 hover:shadow-lg">
          <div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-fg font-bold">
              <MailIcon className="h-6 w-6" />
            </span>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-[0.6875rem] font-bold text-muted">
              Fast Business Inquiries
            </span>
            <h2 className="mt-2 text-lg font-bold text-fg">Corporate & Inquiries</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              For corporate bus charters, institutional billing, official receipts, and formal partner inquiries.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-line">
            <a
              href={`mailto:${settings.company_email || 'info@linkbus.co.ug'}`}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-fg transition-all hover:bg-surface-2 active:scale-95"
            >
              <MailIcon className="h-3.5 w-3.5" />
              {settings.company_email || 'info@linkbus.co.ug'}
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Contact Form & Station Matrix ── */}
      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        {/* Left 7 Cols: Smart Categorized Message Form */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-sm">
            <div className="border-b border-line pb-4">
              <h2 className="text-xl font-bold tracking-tight text-fg">Send a Message</h2>
              <p className="mt-1 text-xs text-muted">
                Select your topic below so our system routes your inquiry to the right station supervisor automatically.
              </p>
            </div>

            <form onSubmit={submit} noValidate className="mt-6 space-y-5">
              {/* Topic Selector Chips */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  What is this regarding?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topicOptions.map((opt) => {
                    const isSelected = form.topic === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setForm({ ...form, topic: opt.id })}
                        className={`flex flex-col text-left p-3 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'border-brand-500 bg-brand-500/10 text-fg shadow-sm'
                            : 'border-line bg-surface-2/40 text-muted hover:border-brand-500/40 hover:bg-surface-2'
                        }`}
                      >
                        <span className="font-bold text-fg">{opt.label}</span>
                        <span className="text-[0.6875rem] text-muted mt-0.5">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="contact-name"
                  label="Your Full Name"
                  required
                  placeholder="e.g. Sarah Namubiru"
                  value={form.name}
                  error={errors.name}
                  onBlur={() =>
                    setErrors((cur) => ({
                      ...cur,
                      name: validate('name', form.name),
                    }))
                  }
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />

                <TextField
                  id="contact-email"
                  label="Email Address"
                  type="email"
                  required
                  placeholder="e.g. sarah@example.com"
                  value={form.email}
                  error={errors.email}
                  onBlur={() =>
                    setErrors((cur) => ({
                      ...cur,
                      email: validate('email', form.email),
                    }))
                  }
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              {/* Optional Phone & Booking Reference */}
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="contact-phone"
                  label="Phone / WhatsApp (Optional)"
                  placeholder="e.g. 0772 123456"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />

                <TextField
                  id="contact-ref"
                  label="Booking Ref / Tag Code (Optional)"
                  placeholder="e.g. #LB-2026-X8"
                  value={form.bookingRef}
                  onChange={(e) => setForm({ ...form, bookingRef: e.target.value })}
                />
              </div>

              {/* Message */}
              <TextAreaField
                id="contact-message"
                label="Message / Query Details"
                required
                rows={4}
                placeholder="Please describe how we can assist you..."
                value={form.message}
                error={errors.message}
                onBlur={() =>
                  setErrors((cur) => ({
                    ...cur,
                    message: validate('message', form.message),
                  }))
                }
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />

              <Button
                type="submit"
                loading={pending}
                icon={<SendIcon className="h-4 w-4" />}
                className="w-full sm:w-auto"
              >
                Send Message to Support
              </Button>
            </form>
          </div>
        </div>

        {/* Right 5 Cols: 8 Regional Terminal Helpdesk Hotlines */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-fg">Station Helpdesks</h3>
                <p className="text-xs text-muted">Direct phone numbers at our 8 major regional hubs</p>
              </div>
              <span className="rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                8 Terminals
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {terminalHotlines.map((t) => (
                <div
                  key={t.city}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-line/60 bg-surface-2/40 hover:bg-surface-2 transition-colors text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-fg">
                      <MapPinIcon className="h-3 w-3 text-brand-600 dark:text-brand-400" />
                      <span>{t.city} Hub</span>
                    </div>
                    <p className="text-[0.6875rem] text-muted pl-4">{t.counter}</p>
                  </div>
                  <a
                    href={`tel:${t.phone}`}
                    className="font-mono font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {t.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Headquarters Physical Address Card */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm text-xs">
            <h4 className="font-bold text-fg text-sm">Head Office & Main Arrivals Hub</h4>
            <p className="mt-2 text-muted leading-relaxed">
              Nakivubo Road, Namayiba Central Bus Terminal, Counter 12 Arrivals Hall, Kampala, Uganda.
            </p>
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
              <span className="font-semibold text-fg">Operating Hours:</span>
              <span className="text-muted">05:00 AM – 11:30 PM (Daily)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive FAQs Accordion ── */}
      <section className="mt-16 border-t border-line pt-12">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <HelpCircleIcon className="h-3.5 w-3.5" />
            Quick Answers
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Frequently Asked Passenger Questions
          </h2>
        </div>

        <div className="mt-8 max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => {
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