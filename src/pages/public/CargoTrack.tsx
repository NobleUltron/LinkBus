import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BoxIcon,
  Building2Icon,
  BusIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  HelpCircleIcon,
  LuggageIcon,
  MapPinIcon,
  NavigationIcon,
  PackageCheckIcon,
  PackageIcon,
  PhoneIcon,
  QrCodeIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TruckIcon,
  UserIcon,
} from 'lucide-react';
import { api } from '../../services/api-client';
import { formatDate, formatTime } from '../../utils/format';
import { InlineError } from '../../components/ui/States';

interface TrackingData {
  id: number;
  tracking_number: string;
  booking_number?: string;
  passenger_name?: string;
  sender_name?: string;
  sender_phone?: string;
  recipient_name?: string;
  recipient_phone?: string;
  origin: string;
  destination: string;
  weight_kg: number;
  description: string;
  status: 'received' | 'in_transit' | 'arrived' | 'delivered' | 'lost';
  raw_status?: string;
  departure_time?: string;
  created_at: string;
}

const statusSteps = [
  {
    key: 'received',
    label: 'Received at Terminal',
    sub: 'Checked in & tagged at origin bay',
    icon: <PackageIcon className="h-4 w-4" />,
  },
  {
    key: 'in_transit',
    label: 'In Transit on Highway',
    sub: 'Loaded in coach bay en route',
    icon: <BusIcon className="h-4 w-4" />,
  },
  {
    key: 'arrived',
    label: 'Arrived at Destination Hub',
    sub: 'Ready for recipient collection',
    icon: <Building2Icon className="h-4 w-4" />,
  },
  {
    key: 'delivered',
    label: 'Collected / Claimed',
    sub: 'Signed off & handed over',
    icon: <PackageCheckIcon className="h-4 w-4" />,
  },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'received':
      return 0;
    case 'in_transit':
      return 1;
    case 'arrived':
      return 2;
    case 'delivered':
      return 3;
    default:
      return 0;
  }
}

export function CargoTrack() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || searchParams.get('tracking') || '';
  
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'parcel' | 'luggage'; data: TrackingData } | null>(null);

  const fetchTracking = async (trackingCode: string) => {
    if (!trackingCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ type?: 'parcel' | 'luggage'; parcel?: TrackingData; data?: TrackingData }>(
        `/parcels/track?code=${encodeURIComponent(trackingCode.trim())}`
      );
      const data = res.data || res.parcel;
      if (data) {
        setResult({
          type: res.type || (data.tracking_number?.startsWith('LUG') ? 'luggage' : 'parcel'),
          data,
        });
      } else {
        throw new Error('No shipment found matching tracking code.');
      }
    } catch (err: any) {
      setError(err?.message || `No active shipment or baggage tag found for '${trackingCode}'. Please verify your code.`);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchTracking(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSearchParams({ code: code.trim() });
    fetchTracking(code.trim());
  };

  const currentStep = result ? getStepIndex(result.data.status) : 0;

  return (
    <div className="space-y-10 pb-16">
      {/* ── Hero Header & Search Bar ── */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface-2 to-surface p-8 sm:p-12 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">
            <PackageIcon className="h-3.5 w-3.5" />
            <span>Live Cargo & Baggage Telemetry</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Track Cargo & Luggage
          </h1>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Enter your <strong>Waybill Tracking Number</strong> (e.g. <code>PCL-XXXX</code>) or <strong>Luggage Tag Code</strong> (e.g. <code>LUG-XXXX</code>) to view live terminal check-in, highway transit status, and destination collection alerts.
          </p>

          {/* Quick Input Form */}
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <PackageIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. PCL-260824-A1B2 or LUG-98214"
                className="h-12 w-full rounded-2xl border border-line bg-surface pl-10 pr-4 text-sm font-bold text-fg placeholder:text-muted/60 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <SearchIcon className="h-4 w-4" />
              )}
              <span>Track Live</span>
            </button>
          </form>
        </div>
      </section>

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-3">
          <AlertCircleIcon className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Shipment Not Found</p>
            <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        </div>
      )}

      {/* ── Tracking Result View ── */}
      {result && (
        <div className="space-y-6">
          {/* Main Status Header Card */}
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/70 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-brand-500/10 px-2.5 py-0.5 text-xs font-bold uppercase text-brand-600 dark:text-brand-400">
                    {result.type === 'luggage' ? 'Passenger Checked Luggage' : 'Regional Freight Parcel'}
                  </span>
                  <span className="font-mono text-xs font-bold text-muted">
                    #{result.data.tracking_number}
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-fg">
                  {result.data.origin} ➔ {result.data.destination}
                </h2>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Status: {result.data.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* ── Visual Stepper Progress ── */}
            <div className="py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
                {statusSteps.map((step, idx) => {
                  const isDone = idx <= currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div
                      key={step.key}
                      className={`relative flex flex-col p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-brand-600 bg-brand-500/5 dark:bg-brand-500/10 shadow-sm'
                          : isDone
                          ? 'border-line/80 bg-surface-2/40'
                          : 'border-line/40 opacity-50 bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs ${
                            isDone
                              ? 'bg-brand-600 text-white shadow-xs'
                              : 'bg-surface-2 text-muted border border-line'
                          }`}
                        >
                          {isDone ? <CheckCircle2Icon className="h-4 w-4" /> : idx + 1}
                        </div>
                        <span className="text-[0.6875rem] font-bold text-muted uppercase tracking-wider">
                          Step {idx + 1}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-fg mt-1">{step.label}</h4>
                      <p className="text-[0.6875rem] text-muted mt-0.5 leading-snug">{step.sub}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Shipment Details Grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-line/70 pt-6">
              <div className="space-y-1">
                <span className="block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                  Shipment Weight
                </span>
                <span className="font-bold text-fg text-sm">{result.data.weight_kg} KG</span>
              </div>

              <div className="space-y-1">
                <span className="block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                  Package Content
                </span>
                <span className="font-bold text-fg text-sm truncate block">
                  {result.data.description || 'General Goods'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                  Origin Station
                </span>
                <span className="font-bold text-fg text-sm">{result.data.origin} Terminal</span>
              </div>

              <div className="space-y-1">
                <span className="block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                  Destination Station
                </span>
                <span className="font-bold text-fg text-sm">{result.data.destination} Terminal</span>
              </div>
            </div>

            {/* ── Recipient Pickup Guidance ── */}
            <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 text-xs text-muted flex items-start gap-3">
              <ShieldCheckIcon className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-fg">Pickup & Collection Requirements:</p>
                <p>
                  To collect this shipment at <strong>{result.data.destination} Terminal</strong>, the recipient must present their original National ID / Passport and the SMS pickup code sent to their phone.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── How It Works Explainer Grid ── */}
      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 border border-brand-500/20 shadow-xs">
            <QrCodeIcon className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-fg">1. Tagging & Barcodes</h3>
          <p className="text-xs text-muted leading-relaxed">
            Parcels and passenger bags are weighed and assigned a unique barcode tag with automated recipient SMS confirmation.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs">
            <NavigationIcon className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-fg">2. Highway Coach Transit</h3>
          <p className="text-xs text-muted leading-relaxed">
            Cargo is loaded directly into the scheduled coach cargo bay and tracked live via the LinkBus GPS corridor network.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shadow-xs">
            <PackageCheckIcon className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-fg">3. Instant Hub Collection</h3>
          <p className="text-xs text-muted leading-relaxed">
            Recipients receive an instant SMS notification upon arrival at the destination terminal for secure handover.
          </p>
        </div>
      </section>
    </div>
  );
}
