import React, { useEffect, useMemo, useState } from 'react';
import {
  BanknoteIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  MapPinIcon,
  MessageSquareIcon,
  PhoneIcon,
  PrinterIcon,
  QrCodeIcon,
  ReceiptTextIcon,
  SearchIcon,
  SmartphoneIcon,
  SparklesIcon,
  UserCheckIcon,
  UserPlusIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { BusCabinSeatMap } from '../../components/booking/BusCabinSeatMap';
import { FareSummary } from '../../components/booking/FareSummary';
import { PromoCodeInput } from '../../components/booking/PromoCodeInput';
import { WizardSteps } from '../../components/booking/WizardSteps';
import { BoardingPassModal } from '../../components/modals/BoardingPassModal';
import { ReceiptModal } from '../../components/modals/ReceiptModal';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { DateInput, IconSelect } from '../../components/ui/Inputs';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, ErrorState, InlineError } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { posBook } from '../../services/bookings';
import type { TicketDetail } from '../../services/tickets';
import { getActiveTerminals, getTrip, searchTrips } from '../../services/trips';
import type { BookingDetail, PromoValidation, TripDetail } from '../../types/api';
import type { PaymentMethod, TripSeat } from '../../types/models';
import { calculateFare, changeDue } from '../../utils/fare';
import { formatDate, formatTime, money, titleCase, toDateInput } from '../../utils/format';

const STEPS = ['Find Departure', 'Select Seats', 'Passenger & Payment', 'Issued & Receipt'];

const methods: {
  value: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'cash', label: 'Cash Tender', icon: <BanknoteIcon className="h-4 w-4" /> },
  { value: 'mtn_mobile_money', label: 'MTN MoMo', icon: <SmartphoneIcon className="h-4 w-4 text-amber-500" /> },
  { value: 'airtel_money', label: 'Airtel Money', icon: <SmartphoneIcon className="h-4 w-4 text-red-500" /> },
  { value: 'card', label: 'POS Card / Visa', icon: <CreditCardIcon className="h-4 w-4 text-blue-500" /> },
];

interface PassengerRow {
  seatId: number;
  name: string;
  phone: string;
}

export function PosTerminal() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const maxSeats = settings.max_seats_per_booking;

  const [step, setStep] = useState(0);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(toDateInput(new Date()));
  const [results, setResults] = useState<TripDetail[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [seats, setSeats] = useState<TripSeat[]>([]);
  const [passengers, setPassengers] = useState<PassengerRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [promo, setPromo] = useState<PromoValidation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [boardingPassOpen, setBoardingPassOpen] = useState(false);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);

  const terminals = useAsync(() => getActiveTerminals(), []);

  const issuedTickets = useMemo<TicketDetail[]>(() => {
    if (!booking || !booking.tickets || !booking.trip) return [];
    return booking.tickets.map((t) => {
      const seat = booking.seats?.find((s) => s.id === t.trip_seat_id) || {
        id: t.trip_seat_id,
        seat_number: '—',
        seat_class: 'standard',
        price: booking.trip?.fare || 0,
        is_available: false,
      };
      return {
        id: t.id,
        ticket_number: t.ticket_number,
        booking_id: booking.id,
        passenger_name: t.passenger_name,
        passenger_phone: t.passenger_phone,
        qr_code: t.qr_code || t.ticket_number,
        status: t.status,
        seat_id: seat.id,
        seat: {
          id: seat.id,
          seat_number: seat.seat_number,
          seat_class: seat.seat_class,
        },
        trip: booking.trip,
        booking: {
          id: booking.id,
          booking_number: booking.booking_number,
          total_amount: booking.total_amount,
          payment_method: booking.payment_method,
          status: booking.status,
          created_at: booking.created_at,
        },
      };
    });
  }, [booking]);

  const fare = useMemo(
    () =>
      calculateFare(
        seats.map((seat) => ({
          seat_class: seat.seat_class,
          fare: trip?.fare ?? 0,
        })),
        promo?.discount ?? 0,
        settings.tax_rate_percentage
      ),
    [seats, trip, promo, settings.tax_rate_percentage]
  );

  const change = changeDue(Number(amountPaid || 0), fare.total);

  useEffect(() => {
    if (method !== 'cash') setAmountPaid(String(fare.total));
  }, [method, fare.total]);

  const runSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setSearching(true);
    setSearchError(null);
    try {
      const rows = await searchTrips({
        origin,
        destination,
        date,
        passengers: 1,
      });
      setResults(rows);
    } catch (err) {
      setSearchError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const chooseTrip = async (selected: TripDetail) => {
    const fresh = await getTrip(selected.id).catch(() => selected);
    setTrip(fresh);
    setSeats([]);
    setStep(1);
  };

  const toggleSeat = (seat: TripSeat) => {
    setSeats((current) => {
      const exists = current.some((item) => item.id === seat.id);
      if (exists) return current.filter((item) => item.id !== seat.id);
      if (current.length >= maxSeats) return current;
      return [...current, seat];
    });
  };

  const goToDetails = () => {
    setPassengers(
      seats.map((seat) => ({
        seatId: seat.id,
        name: '',
        phone: '',
      }))
    );
    setAmountPaid('');
    setStep(2);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    passengers.forEach((passenger, index) => {
      if (!passenger.name.trim()) next[`name-${index}`] = 'Enter passenger name.';
      if (passenger.phone.replace(/\D/g, '').length < 9)
        next[`phone-${index}`] = 'Enter a valid phone number.';
    });
    if (Number(amountPaid || 0) < fare.total)
      next.amountPaid = 'Tendered amount is less than total due.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const complete = async () => {
    if (!trip || !validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await posBook({
        staff_user_id: user?.id ?? 0,
        trip_id: trip.id,
        seat_ids: seats.map((seat) => seat.id),
        passengers: passengers.map((passenger) => ({
          seat_id: passenger.seatId,
          passenger_name: passenger.name,
          passenger_phone: passenger.phone,
        })),
        payment_method: method,
        promo_code: promo?.code ?? null,
        amount_paid: Number(amountPaid || 0),
      });
      setBooking(created);
      setStep(3);
      toast.success('Sale completed · Tickets issued');
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(0);
    setTrip(null);
    setSeats([]);
    setPassengers([]);
    setPromo(null);
    setBooking(null);
    setAmountPaid('');
    setMethod('cash');
    setErrors({});
    setResults(null);
  };

  const shareTicketWhatsApp = (t: TicketDetail | any, seatNumber?: string, seatClass?: string) => {
    if (!booking) return;
    const origin = booking.trip?.origin?.city || booking.trip?.origin?.name || 'Origin';
    const dest = booking.trip?.destination?.city || booking.trip?.destination?.name || 'Destination';
    const depTime = booking.trip?.departure_time
      ? `${formatDate(booking.trip.departure_time)} @ ${formatTime(booking.trip.departure_time)}`
      : 'Scheduled Departure';
    const plate = booking.trip?.bus?.plate_number || 'Assigned Coach';

    const text =
      `🚌 *LINKBUS UGANDA — DIGITAL BOARDING PASS*\n\n` +
      `👤 *Passenger:* ${t.passenger_name}\n` +
      `🎫 *Ticket No:* \`${t.ticket_number}\`\n` +
      `📍 *Corridor:* ${origin} ➔ ${dest}\n` +
      `🕒 *Departure:* ${depTime}\n` +
      `💺 *Seat:* ${seatNumber || '—'} (${titleCase(seatClass || 'standard')})\n` +
      `🚍 *Coach Plate:* ${plate}\n` +
      `💳 *Booking Ref:* #${booking.booking_number}\n\n` +
      `🔗 *View Ticket Online:* ${window.location.origin}/my-tickets\n\n` +
      `_Please arrive at the terminal 20 minutes before departure. Safe Travels!_`;

    const rawPhone = t.passenger_phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '256' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
    toast.success(`Opening WhatsApp for ${t.passenger_name}...`);
  };

  // Preset cash tender amounts
  const cashPresets = useMemo(() => {
    const total = fare.total;
    if (total <= 0) return [];
    const p1 = total;
    const p2 = Math.ceil(total / 10000) * 10000;
    const p3 = p2 < 50000 ? 50000 : p2 + 20000;
    const p4 = 100000;
    return Array.from(new Set([p1, p2, p3, p4].filter((n) => n >= total)));
  }, [fare.total]);

  return (
    <div className="space-y-6">
      {/* Wizard Step Progress Bar */}
      <Panel bodyClassName="px-5 py-4">
        <WizardSteps steps={STEPS} current={step} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        {/* Left Column: Interactive Wizard Step Views */}
        <div className="space-y-5">
          {/* STEP 0: Find Departure */}
          {step === 0 && (
            <Panel
              title="Find Intercity Departure"
              subtitle="Search available scheduled buses from this terminal for walk-in passengers"
            >
              <form onSubmit={runSearch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                <div>
                  <label htmlFor="pos-origin" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Origin Station
                  </label>
                  <IconSelect
                    id="pos-origin"
                    className="w-full"
                    icon={<MapPinIcon className="h-4 w-4 text-brand-600" aria-hidden />}
                    placeholder="All Origin Stations"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    options={(terminals.data ?? []).map((t) => ({
                      value: String(t.id),
                      label: `${t.city} (${t.name})`,
                    }))}
                  />
                </div>

                <div>
                  <label htmlFor="pos-destination" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Destination Station
                  </label>
                  <IconSelect
                    id="pos-destination"
                    className="w-full"
                    icon={<MapPinIcon className="h-4 w-4 text-brand-600" aria-hidden />}
                    placeholder="Any Destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    options={(terminals.data ?? []).map((t) => ({
                      value: String(t.id),
                      label: `${t.city} (${t.name})`,
                    }))}
                  />
                </div>

                <div>
                  <label htmlFor="pos-date" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                    Departure Date
                  </label>
                  <DateInput
                    id="pos-date"
                    className="w-full"
                    label="Departure date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <Button type="submit" loading={searching} icon={<SearchIcon className="h-4 w-4" />}>
                  Find Departures
                </Button>
              </form>

              <div className="mt-6 border-t border-line pt-6">
                {searchError && <ErrorState message={searchError} onRetry={() => runSearch()} />}

                {!searchError && results === null && (
                  <p className="text-xs text-muted">
                    Select an origin and destination above to view scheduled departures for this counter.
                  </p>
                )}

                {!searchError && results?.length === 0 && (
                  <EmptyState
                    compact
                    title="No departures found"
                    body="No scheduled buses match that corridor and date. Try selecting another departure date."
                  />
                )}

                {!searchError && results && results.length > 0 && (
                  <ul className="space-y-3">
                    {results.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => chooseTrip(option)}
                          className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-all hover:border-brand-500 hover:shadow-md active:scale-95 group"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-fg text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                {formatTime(option.departure_time)}
                              </span>
                              <span className="text-xs font-bold text-muted">·</span>
                              <span className="font-bold text-fg text-sm">
                                {option.origin.city} ➔ {option.destination.city}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              {formatDate(option.departure_time)} · {option.bus.plate_number} (
                              {titleCase(option.bus.bus_type)}) ·{' '}
                              <strong className="text-fg font-bold">
                                {option.available_seats} seats remaining
                              </strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusPill status={option.status} />
                            <span className="font-extrabold text-base tabular-nums text-fg">
                              {money(option.fare)}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>
          )}

          {/* STEP 1: Select Seats */}
          {step === 1 && trip && (
            <Panel
              title="Interactive 2D Cabin Seat Map"
              subtitle={`${trip.origin.city} ➔ ${trip.destination.city} · ${formatDate(trip.departure_time)} at ${formatTime(trip.departure_time)} · Click seats to select (up to ${maxSeats} seats)`}
            >
              <BusCabinSeatMap
                seats={trip.seats}
                selectedIds={seats.map((seat) => seat.id)}
                onToggle={toggleSeat}
                maxSelectable={maxSeats}
                fare={trip.fare}
              />
            </Panel>
          )}

          {/* STEP 2: Passenger Details & Tender Payment */}
          {step === 2 && trip && (
            <>
              <Panel
                title="Passenger Information"
                subtitle="Names and phone numbers printed on digital tickets and sent via WhatsApp/SMS"
              >
                <div className="space-y-4">
                  {passengers.map((passenger, index) => {
                    const seat = seats.find((item) => item.id === passenger.seatId);
                    return (
                      <div key={passenger.seatId} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center gap-1.5 font-bold text-fg text-xs">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white text-xs font-mono">
                              {seat?.seat_number}
                            </span>
                            Seat {seat?.seat_number} ({titleCase(seat?.seat_class ?? 'standard')})
                          </span>
                          <span className="text-[0.6875rem] font-bold text-muted uppercase">
                            Passenger #{index + 1}
                          </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <TextField
                            id={`pos-name-${index}`}
                            label="Full Passenger Name"
                            required
                            placeholder="e.g. Sarah Namubiru"
                            value={passenger.name}
                            error={errors[`name-${index}`]}
                            onChange={(event) =>
                              setPassengers((cur) =>
                                cur.map((item, i) =>
                                  i === index ? { ...item, name: event.target.value } : item
                                )
                              )
                            }
                          />
                          <TextField
                            id={`pos-phone-${index}`}
                            label="Phone Number (SMS / WhatsApp)"
                            type="tel"
                            required
                            placeholder="e.g. 0772 123456"
                            value={passenger.phone}
                            error={errors[`phone-${index}`]}
                            onChange={(event) =>
                              setPassengers((cur) =>
                                cur.map((item, i) =>
                                  i === index ? { ...item, phone: event.target.value } : item
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="Tender Payment & Settlement">
                {submitError && (
                  <div className="mb-4">
                    <InlineError message={submitError} />
                  </div>
                )}

                {/* Payment Method Selector */}
                <fieldset>
                  <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                    Collection Method
                  </legend>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {methods.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMethod(option.value)}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                          method === option.value
                            ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                            : 'border-line bg-surface text-fg hover:border-brand-500 hover:bg-surface-2'
                        }`}
                      >
                        {option.icon}
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {/* Cash Tender & Quick Presets */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2 items-start">
                  <div>
                    <TextField
                      id="pos-amount"
                      label="Amount Tendered (UGX)"
                      type="number"
                      min={0}
                      required
                      value={amountPaid}
                      error={errors.amountPaid}
                      hint={
                        method === 'cash'
                          ? 'Enter the physical cash handed over by the customer.'
                          : 'Exact settlement amount for electronic payments.'
                      }
                      onChange={(event) => setAmountPaid(event.target.value)}
                    />

                    {/* Quick Cash Presets */}
                    {method === 'cash' && cashPresets.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="text-[0.6875rem] font-bold text-muted self-center mr-1">
                          Fast Tender:
                        </span>
                        {cashPresets.map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAmountPaid(String(val))}
                            className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-bold text-fg hover:bg-surface-2 hover:border-brand-500 transition-colors"
                          >
                            {val === fare.total ? 'Exact' : money(val)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Change Due Display */}
                  <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Change Due to Passenger</p>
                    <p
                      className={`mt-1.5 text-3xl font-extrabold tabular-nums ${
                        change < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {money(Math.max(0, change))}
                    </p>
                    {change < 0 && (
                      <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">
                        ⚠️ Short by {money(-change)}
                      </p>
                    )}
                    {change >= 0 && amountPaid && Number(amountPaid) > fare.total && (
                      <p className="mt-1 text-xs text-muted">Hand customer change before printing tickets.</p>
                    )}
                  </div>
                </div>

                {/* Promo Code Input */}
                <div className="mt-6 border-t border-line pt-5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Staff Discount / Promo Code</h3>
                  <PromoCodeInput subtotal={fare.subtotal} applied={promo} onApply={setPromo} />
                </div>
              </Panel>
            </>
          )}

          {/* STEP 3: Complete & Receipts */}
          {step === 3 && booking && (
            <Panel>
              <div className="flex flex-col items-center py-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-brand-950/20">
                  <CheckCircle2Icon className="h-7 w-7" aria-hidden />
                </span>
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-fg">
                  Sale Successfully Completed!
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Booking Reference #{booking.booking_number} · {booking.tickets.length}{' '}
                  {booking.tickets.length === 1 ? 'ticket' : 'tickets'} issued
                </p>

                {change > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    💰 Return {money(change)} change to passenger
                  </div>
                )}
              </div>

              {/* Tickets List */}
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Issued Passenger Passes ({booking.tickets.length})
                  </h3>
                  <span className="text-[0.6875rem] text-muted">Click any pass to preview or print</span>
                </div>

                <div className="space-y-2.5">
                  {booking.tickets.map((t, idx) => {
                    const seat = booking.seats?.find((item) => item.id === t.trip_seat_id);
                    return (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/60 p-3 text-xs hover:border-brand-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-emerald-700 px-2 font-mono text-xs font-black text-white shadow-sm">
                            {seat?.seat_number || '—'}
                          </span>
                          <div>
                            <p className="font-bold text-fg text-sm">{t.passenger_name}</p>
                            <p className="text-muted font-mono text-[0.6875rem]">
                              Ticket #{t.ticket_number} · {titleCase(seat?.seat_class || 'standard')} Cabin
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 text-xs"
                            icon={<MessageSquareIcon className="h-3.5 w-3.5" />}
                            onClick={() => shareTicketWhatsApp(t, seat?.seat_number, seat?.seat_class)}
                          >
                            WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<PrinterIcon className="h-3.5 w-3.5" />}
                            onClick={() => {
                              setSelectedTicketIndex(idx);
                              setBoardingPassOpen(true);
                            }}
                          >
                            Preview / Print Pass
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Print & Sale Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 mt-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    icon={<ReceiptTextIcon className="h-4 w-4" />}
                    onClick={() => setReceiptOpen(true)}
                  >
                    View / Print Official Receipt
                  </Button>
                  <Button
                    variant="outline"
                    icon={<PrinterIcon className="h-4 w-4" />}
                    onClick={() => {
                      setSelectedTicketIndex(0);
                      setBoardingPassOpen(true);
                    }}
                  >
                    Print Boarding Slips ({booking.tickets.length})
                  </Button>
                </div>

                <Button variant="ghost" icon={<UserPlusIcon className="h-4 w-4" />} onClick={reset}>
                  Next Passenger (Esc)
                </Button>
              </div>
            </Panel>
          )}
        </div>

        {/* Right Column: Sticky Summary & Action Buttons */}
        <div className="space-y-5 xl:sticky xl:top-24">
          <Panel title="Counter Sale Summary">
            {!trip ? (
              <p className="text-xs text-muted">
                Select a departure from the list to begin issuing tickets.
              </p>
            ) : (
              <>
                <dl className="mb-4 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Corridor</dt>
                    <dd className="font-bold text-fg text-right">
                      {trip.origin.city} ➔ {trip.destination.city}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Departure</dt>
                    <dd className="font-bold tabular-nums text-fg">
                      {formatTime(trip.departure_time)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Coach</dt>
                    <dd className="font-mono font-bold text-fg">{trip.bus.plate_number}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Selected Seats</dt>
                    <dd className="font-bold text-brand-600 dark:text-brand-400">
                      {seats.length === 0 ? 'None' : seats.map((s) => s.seat_number).join(', ')}
                    </dd>
                  </div>
                </dl>

                {seats.length > 0 && (
                  <FareSummary
                    fare={fare}
                    taxRate={settings.tax_rate_percentage}
                    seatCount={seats.length}
                    promoCode={promo?.code}
                  />
                )}

                <div className="mt-5 space-y-2 border-t border-line pt-4">
                  {step === 1 && (
                    <>
                      <Button
                        block
                        size="lg"
                        disabled={seats.length === 0}
                        onClick={goToDetails}
                      >
                        Continue · {seats.length} {seats.length === 1 ? 'Seat' : 'Seats'}
                      </Button>
                      <Button block variant="ghost" onClick={() => setStep(0)}>
                        Change Departure
                      </Button>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <Button
                        block
                        size="lg"
                        loading={submitting}
                        icon={<BanknoteIcon className="h-4 w-4" />}
                        onClick={complete}
                      >
                        Collect Payment & Issue Tickets
                      </Button>
                      <Button block variant="ghost" disabled={submitting} onClick={() => setStep(1)}>
                        Back to Seat Map
                      </Button>
                    </>
                  )}

                  {step === 3 && (
                    <Button block variant="outline" onClick={reset}>
                      Start New Walk-in Sale
                    </Button>
                  )}
                </div>
              </>
            )}
          </Panel>
        </div>
      </div>

      {/* Official Sales Receipt Modal */}
      <ReceiptModal
        booking={booking}
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        companyName={settings.company_name}
        cashierName={user?.name}
        amountTendered={amountPaid ? Number(amountPaid) : undefined}
        changeReturned={Math.max(0, change)}
      />

      {/* Digital Boarding Pass Coupon Modal */}
      <BoardingPassModal
        tickets={issuedTickets}
        initialIndex={selectedTicketIndex}
        open={boardingPassOpen}
        onClose={() => setBoardingPassOpen(false)}
      />
    </div>
  );
}