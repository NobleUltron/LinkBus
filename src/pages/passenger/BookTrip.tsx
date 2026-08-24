import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  Loader2Icon,
  LockIcon,
  RadioIcon,
  RepeatIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { BusCabinSeatMap } from '../../components/booking/BusCabinSeatMap';
import { FareSummary } from '../../components/booking/FareSummary';
import { PromoCodeInput } from '../../components/booking/PromoCodeInput';
import { TripTimelineStepper } from '../../components/booking/TripTimelineStepper';
import { WizardSteps } from '../../components/booking/WizardSteps';
import { Button } from '../../components/ui/Button';
import { TextField, ToggleField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { BrandedLoader } from '../../components/ui/Brand';
import { EmptyState, ErrorState, InlineError } from '../../components/ui/States';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { useSeatLock } from '../../hooks/useSeatLock';
import { createBooking, verifyMomoPayment } from '../../services/bookings';
import { getTrip, searchTrips } from '../../services/trips';
import type { BookingDetail, PromoValidation, TripDetail } from '../../types/api';
import type { PaymentMethod, TripSeat } from '../../types/models';
import { calculateFare } from '../../utils/fare';
import {
  countdownLabel,
  formatDate,
  formatDateTime,
  formatTime,
  money,
  titleCase,
} from '../../utils/format';

const paymentMethods: {
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'mtn_mobile_money',
    label: 'MTN Mobile Money',
    hint: 'Enter your phone number & approve prompt on your phone',
    icon: <SmartphoneIcon className="h-4 w-4 text-amber-500" />,
  },
  {
    value: 'airtel_money',
    label: 'Airtel Money',
    hint: 'Enter your phone number & approve prompt on your phone',
    icon: <SmartphoneIcon className="h-4 w-4 text-red-500" />,
  },
  {
    value: 'card',
    label: 'Debit / Credit Card',
    hint: 'Visa, Mastercard & UnionPay 256-bit encrypted checkout',
    icon: <CreditCardIcon className="h-4 w-4 text-blue-500" />,
  },
  {
    value: 'cash',
    label: 'Pay Cash at Station Counter',
    hint: 'Settle in cash at terminal ticket desk 30 mins before trip',
    icon: <BanknoteIcon className="h-4 w-4 text-emerald-500" />,
  },
];

interface PassengerForm {
  seatId: number;
  name: string;
  phone: string;
}

export function BookTrip() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const lock = useSeatLock();

  const { data: trip, loading, error, reload } = useAsync(
    () => getTrip(Number(tripId)),
    [tripId]
  );

  const [step, setStep] = useState(0);
  const [roundTrip, setRoundTrip] = useState(false);
  const [outboundSeats, setOutboundSeats] = useState<TripSeat[]>([]);
  const [returnTrip, setReturnTrip] = useState<TripDetail | null>(null);
  const [returnSeats, setReturnSeats] = useState<TripSeat[]>([]);
  const [returnOptions, setReturnOptions] = useState<TripDetail[] | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);

  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [passengerErrors, setPassengerErrors] = useState<Record<string, string>>({});

  const [method, setMethod] = useState<PaymentMethod>('mtn_mobile_money');
  const [momoPhone, setMomoPhone] = useState('');
  const [momoModalOpen, setMomoModalOpen] = useState(false);
  const [momoStage, setMomoStage] = useState<'prompt' | 'authorizing' | 'success'>('prompt');
  const [momoTxId, setMomoTxId] = useState('');

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardProcessing, setCardProcessing] = useState(false);

  const [promo, setPromo] = useState<PromoValidation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<BookingDetail[] | null>(null);

  const maxSeats = settings.max_seats_per_booking;
  const steps = roundTrip
    ? ['Outbound Seats', 'Return Leg', 'Passenger Details', 'Payment']
    : ['Choose Seats', 'Passenger Details', 'Payment'];

  const fare = useMemo(() => {
    if (!trip) return calculateFare([], 0, settings.tax_rate_percentage);
    const seatsList = [
      ...outboundSeats.map((seat) => ({
        seat_class: seat.seat_class,
        fare: trip.fare,
      })),
      ...(returnTrip
        ? returnSeats.map((seat) => ({
            seat_class: seat.seat_class,
            fare: returnTrip.fare,
          }))
        : []),
    ];
    return calculateFare(seatsList, promo?.discount ?? 0, settings.tax_rate_percentage);
  }, [trip, outboundSeats, returnTrip, returnSeats, promo, settings.tax_rate_percentage]);

  // Sync MoMo phone when passengers change
  useEffect(() => {
    if (!momoPhone && (passengers[0]?.phone || user?.phone)) {
      setMomoPhone(passengers[0]?.phone || user?.phone || '');
    }
  }, [passengers, user, momoPhone]);

  // Load return options once passenger opts into a round trip
  useEffect(() => {
    if (!roundTrip || !trip) return;
    setReturnLoading(true);
    searchTrips({
      origin: String(trip.destination.id),
      destination: String(trip.origin.id),
      passengers: Math.max(1, outboundSeats.length),
    })
      .then((rows) =>
        setReturnOptions(
          rows.filter((row) => new Date(row.departure_time) > new Date(trip.arrival_time))
        )
      )
      .catch(() => setReturnOptions([]))
      .finally(() => setReturnLoading(false));
  }, [roundTrip, trip, outboundSeats.length]);

  // A lapsed hold sends passenger back to the seat map
  useEffect(() => {
    if (!lock.expired) return;
    setStep(0);
    setPassengers([]);
    toast.error('Your seat hold has expired. Please choose your seats again.');
    lock.reset();
    reload();
  }, [lock.expired]);

  if (loading) return <BrandedLoader message="Loading departure seat map..." />;

  if (error || !trip) {
    return (
      <Panel className="mx-auto max-w-2xl">
        <ErrorState message={error ?? 'That trip could not be found.'} onRetry={reload} />
      </Panel>
    );
  }

  const toggleSeat =
    (list: TripSeat[], setList: (next: TripSeat[]) => void, limit: number) =>
    (seat: TripSeat) => {
      const exists = list.some((item) => item.id === seat.id);
      if (exists) setList(list.filter((item) => item.id !== seat.id));
      else if (list.length < limit) setList([...list, seat]);
    };

  const goToPassengerDetails = async () => {
    const seatIds = [...outboundSeats.map((s) => s.id), ...returnSeats.map((s) => s.id)];
    const held = await lock.hold({
      userId: user?.id ?? 0,
      tripId: trip.id,
      seatIds,
    });
    if (!held) {
      toast.error(lock.error ?? 'Those seats could not be held.');
      reload();
      return;
    }
    const initialPassengers = outboundSeats.map((seat, index) => ({
      seatId: seat.id,
      name: index === 0 ? user?.name ?? '' : '',
      phone: index === 0 ? user?.phone ?? '' : '',
    }));
    setPassengers(initialPassengers);
    if (!momoPhone) setMomoPhone(initialPassengers[0]?.phone || user?.phone || '');
    setStep(roundTrip ? 2 : 1);
  };

  const validatePassengers = (): boolean => {
    const errors: Record<string, string> = {};
    passengers.forEach((passenger, index) => {
      if (!passenger.name.trim()) errors[`name-${index}`] = 'Enter passenger name.';
      if (passenger.phone.replace(/\D/g, '').length < 9)
        errors[`phone-${index}`] = 'Enter a valid phone number.';
    });
    setPassengerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const executeBooking = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const bookings = await createBooking({
        user_id: user?.id ?? 0,
        trip_id: trip.id,
        seat_ids: outboundSeats.map((seat) => seat.id),
        passengers: passengers.map((passenger) => ({
          seat_id: passenger.seatId,
          passenger_name: passenger.name,
          passenger_phone: passenger.phone,
        })),
        payment_method: method,
        promo_code: promo?.code ?? null,
        return_trip_id: returnTrip?.id ?? null,
        return_seat_ids: returnSeats.map((seat) => seat.id),
      });
      lock.release();
      setConfirmed(bookings);
      if (method === 'cash') {
        toast.info('Seat reservation held. Please settle cash at station counter.');
      } else {
        toast.success('Payment verified & booking confirmed!');
      }
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartPayment = async () => {
    if (method === 'cash') {
      await executeBooking();
    } else if (method === 'mtn_mobile_money' || method === 'airtel_money') {
      const cleanPhone = momoPhone.replace(/\D/g, '');
      if (cleanPhone.length < 9) {
        toast.error('Please enter a valid Mobile Money phone number.');
        return;
      }
      setMomoModalOpen(true);
      setMomoStage('prompt');
    } else if (method === 'card') {
      if (!cardName) setCardName(passengers[0]?.name || user?.name || '');
      setCardModalOpen(true);
    }
  };

  const handleApproveMomo = async () => {
    setMomoStage('authorizing');
    try {
      const provider = method === 'mtn_mobile_money' ? 'mtn' : 'airtel';
      const res = await verifyMomoPayment({
        phone: momoPhone,
        amount: fare.total,
        provider,
      });
      setMomoTxId(res.transaction_id);
      setMomoStage('success');
      setTimeout(async () => {
        setMomoModalOpen(false);
        await executeBooking();
      }, 900);
    } catch (err) {
      toast.error(errorMessage(err));
      setMomoStage('prompt');
    }
  };

  const handleApproveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvv) {
      toast.error('Please fill in all card details.');
      return;
    }
    setCardProcessing(true);
    setTimeout(async () => {
      setCardProcessing(false);
      setCardModalOpen(false);
      await executeBooking();
    }, 1200);
  };

  // SUCCESS CONFIRMATION VIEW
  if (confirmed) {
    const isPendingCash = confirmed[0]?.status === 'pending';

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Panel>
          <div className="flex flex-col items-center py-6 text-center">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-brand-950/20 ${
                isPendingCash ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
            >
              {isPendingCash ? (
                <ClockIcon className="h-7 w-7" aria-hidden />
              ) : (
                <CheckCircle2Icon className="h-7 w-7" aria-hidden />
              )}
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-fg">
              {isPendingCash
                ? 'Seat Reservation Held (Awaiting Payment)'
                : 'You’re All Booked & Confirmed!'}
            </h1>
            <p className="mt-1.5 text-xs text-muted max-w-md">
              {isPendingCash
                ? 'Your seats are temporarily reserved. Please present your Booking Reference at any LinkBus terminal ticket desk to pay in cash and activate your digital boarding pass.'
                : confirmed.length > 1
                ? 'Both outbound and return legs are confirmed and linked to your account.'
                : 'Payment verified! Your digital QR boarding pass is active and ready in My Tickets.'}
            </p>

            {isPendingCash && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
                <span>Payment Due at Departure Counter: {money(fare.total)}</span>
              </div>
            )}
          </div>

          <ul className="divide-y divide-line border-t border-line mt-4">
            {confirmed.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-4 py-4 text-xs">
                <div>
                  <p className="font-bold text-fg text-sm">
                    {b.trip.origin.city} ➔ {b.trip.destination.city}
                  </p>
                  <p className="text-muted mt-0.5">
                    {formatDateTime(b.trip.departure_time)} · Ref #{b.booking_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-sm tabular-nums text-fg">
                    {money(b.total_amount)}
                  </p>
                  <p className="text-muted text-[0.6875rem]">
                    Seat{b.seats.length > 1 ? 's' : ''}{' '}
                    <strong className="text-fg font-bold">
                      {b.seats.map((s) => s.seat_number).join(', ')}
                    </strong>
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 border-t border-line pt-5 mt-4">
            <Link
              to="/my-tickets"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
            >
              {isPendingCash ? 'View Reservation in My Tickets' : 'View Digital Boarding Passes'}
            </Link>
            <Button variant="outline" onClick={() => navigate('/passenger/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  const seatStep = step === 0;
  const returnStep = roundTrip && step === 1;
  const detailsStep = (roundTrip && step === 2) || (!roundTrip && step === 1);
  const paymentStep = (roundTrip && step === 3) || (!roundTrip && step === 2);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back Button & Seat Hold Timer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition-colors hover:text-fg"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden />
          Back to Departures
        </button>

        {lock.locked && (
          <div
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold ${
              lock.secondsLeft < 60
                ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 animate-pulse'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
            }`}
            aria-live="polite"
          >
            <ClockIcon className="h-4 w-4" aria-hidden />
            Seats Held · {countdownLabel(lock.secondsLeft)} Remaining
          </div>
        )}
      </div>

      {/* Wizard Step Progress Header */}
      <Panel bodyClassName="px-5 py-4">
        <WizardSteps steps={steps} current={step} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        {/* Left Column: Step Views */}
        <div className="space-y-6">
          {/* STEP 1: Outbound Seats */}
          {seatStep && (
            <Panel
              title={`Choose Your Seats · ${trip.origin.city} ➔ ${trip.destination.city}`}
              subtitle={`${formatDate(trip.departure_time)} at ${formatTime(trip.departure_time)} · ${trip.bus.model} (${titleCase(trip.bus.bus_type)})`}
            >
              <BusCabinSeatMap
                seats={trip.seats}
                selectedIds={outboundSeats.map((seat) => seat.id)}
                onToggle={toggleSeat(outboundSeats, setOutboundSeats, maxSeats)}
                maxSelectable={maxSeats}
                fare={trip.fare}
              />

              <div className="mt-6 border-t border-line pt-5">
                <ToggleField
                  id="round-trip"
                  label="Add a return journey (Round Trip)"
                  hint="Includes a synchronized return leg for the same number of passenger seats."
                  checked={roundTrip}
                  onChange={(value) => {
                    setRoundTrip(value);
                    if (!value) {
                      setReturnTrip(null);
                      setReturnSeats([]);
                    }
                  }}
                />
              </div>
            </Panel>
          )}

          {/* STEP 2: Return Trip & Return Seats */}
          {returnStep && (
            <Panel
              title="Select Your Return Departure"
              subtitle={`${trip.destination.city} ➔ ${trip.origin.city} · ${outboundSeats.length} ${outboundSeats.length === 1 ? 'seat' : 'seats'} required`}
            >
              {returnLoading && <div className="skeleton h-28 rounded-xl" />}

              {!returnLoading && returnOptions?.length === 0 && (
                <EmptyState
                  compact
                  title="No return departures available"
                  body="There are no scheduled return trips after your arrival time. You can continue as a one-way booking."
                  action={
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRoundTrip(false);
                        setStep(0);
                      }}
                    >
                      Continue One-Way
                    </Button>
                  }
                />
              )}

              {!returnLoading && returnOptions && returnOptions.length > 0 && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {returnOptions.slice(0, 6).map((option) => {
                      const active = returnTrip?.id === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={async () => {
                            setReturnSeats([]);
                            // If seats weren't in the search payload, fetch the full trip
                            if (!option.seats || option.seats.length === 0) {
                              try {
                                const full = await getTrip(option.id);
                                setReturnTrip(full);
                              } catch {
                                setReturnTrip(option);
                              }
                            } else {
                              setReturnTrip(option);
                            }
                          }}
                          className={`rounded-2xl border p-4 text-left transition-all ${
                            active
                              ? 'border-brand-600 bg-brand-500/10 shadow-sm'
                              : 'border-line bg-surface hover:border-brand-500/50 hover:bg-surface-2'
                          }`}
                        >
                          <p className="font-bold text-fg text-sm">
                            {formatTime(option.departure_time)} ➔ {formatTime(option.arrival_time)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {formatDate(option.departure_time)} · {option.bus.plate_number} ·{' '}
                            <strong className="text-fg">{option.available_seats} seats left</strong>
                          </p>
                          <p className="mt-2 text-sm font-extrabold text-fg">{money(option.fare)}</p>
                        </button>
                      );
                    })}
                  </div>

                  {returnTrip && (
                    <div className="mt-6 border-t border-line pt-5">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
                        Select Return Seats (Pick {outboundSeats.length})
                      </h3>
                      <BusCabinSeatMap
                        seats={returnTrip.seats}
                        selectedIds={returnSeats.map((seat) => seat.id)}
                        onToggle={toggleSeat(returnSeats, setReturnSeats, outboundSeats.length)}
                        maxSelectable={outboundSeats.length}
                        fare={returnTrip.fare}
                      />
                    </div>
                  )}
                </>
              )}
            </Panel>
          )}

          {/* STEP 3: Passenger Details */}
          {detailsStep && (
            <Panel
              title="Passenger Contact Details"
              subtitle="Names and phone numbers printed on digital QR boarding passes"
            >
              <div className="space-y-4">
                {passengers.map((passenger, index) => {
                  const seat = outboundSeats.find((item) => item.id === passenger.seatId);
                  const returnSeat = returnSeats[index];
                  return (
                    <div
                      key={passenger.seatId}
                      className="rounded-2xl border border-line bg-surface p-5 shadow-sm"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-fg">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white font-mono text-xs">
                            {seat?.seat_number}
                          </span>
                          Passenger #{index + 1} · Seat {seat?.seat_number}
                          {returnSeat ? ` (Return Seat ${returnSeat.seat_number})` : ''}
                        </span>
                        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[0.6875rem] font-bold text-muted">
                          {titleCase(seat?.seat_class ?? 'standard')}
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          id={`passenger-name-${index}`}
                          label="Full Name"
                          required
                          placeholder="e.g. Sarah Namubiru"
                          value={passenger.name}
                          error={passengerErrors[`name-${index}`]}
                          onChange={(event) =>
                            setPassengers((cur) =>
                              cur.map((item, i) =>
                                i === index ? { ...item, name: event.target.value } : item
                              )
                            )
                          }
                        />
                        <TextField
                          id={`passenger-phone-${index}`}
                          label="Phone Number (WhatsApp / SMS)"
                          type="tel"
                          required
                          placeholder="e.g. 0772 123456"
                          value={passenger.phone}
                          error={passengerErrors[`phone-${index}`]}
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
          )}

          {/* STEP 4: Payment Method */}
          {paymentStep && (
            <Panel
              title="Select Payment Method"
              subtitle="Secure checkout backed by Bank of Uganda regulated payment gateways"
            >
              {submitError && (
                <div className="mb-4">
                  <InlineError message={submitError} />
                </div>
              )}

              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Payment Method</legend>
                {paymentMethods.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                      method === option.value
                        ? 'border-brand-600 bg-brand-500/10 shadow-sm'
                        : 'border-line bg-surface hover:border-brand-500/40 hover:bg-surface-2'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={option.value}
                      checked={method === option.value}
                      onChange={() => setMethod(option.value)}
                      className="mt-1 h-4 w-4 accent-brand-600"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        {option.icon}
                        <span className="font-bold text-fg text-xs">{option.label}</span>
                      </div>
                      <span className="block text-[0.6875rem] text-muted mt-0.5">{option.hint}</span>
                    </div>
                  </label>
                ))}
              </fieldset>

              {/* Mobile Money Phone Input Details */}
              {(method === 'mtn_mobile_money' || method === 'airtel_money') && (
                <div className="mt-4 rounded-2xl border border-line bg-surface-2/60 p-4 transition-all animate-fadeIn">
                  <div className="flex items-center gap-2 mb-2">
                    <SmartphoneIcon className={`h-4 w-4 ${method === 'mtn_mobile_money' ? 'text-amber-500' : 'text-red-500'}`} />
                    <h4 className="text-xs font-bold text-fg">
                      {method === 'mtn_mobile_money' ? 'MTN MoMo' : 'Airtel Money'} Prompt Destination
                    </h4>
                  </div>
                  <TextField
                    id="momo-phone"
                    label="Mobile Money Registered Number"
                    type="tel"
                    required
                    placeholder="e.g. 0772 123456 or +256700000000"
                    value={momoPhone}
                    hint="A USSD push prompt will be sent to this number to approve the payment with your PIN."
                    onChange={(e) => setMomoPhone(e.target.value)}
                  />
                </div>
              )}

              {/* Cash at Counter Notice */}
              {method === 'cash' && (
                <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-800 dark:text-amber-300">Station Counter Cash Reservation</h4>
                      <p className="text-amber-700/90 dark:text-amber-400 mt-0.5 text-[0.75rem] leading-relaxed">
                        This creates an <strong className="font-bold">UNPAID reservation</strong>. Your seat will be held under your booking reference, but your digital boarding pass will remain inactive until you pay <strong className="font-bold">{money(fare.total)}</strong> cash at any LinkBus terminal ticket counter at least 45 minutes before departure.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 border-t border-line pt-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                  Have a Promo Code or Voucher?
                </h3>
                <PromoCodeInput subtotal={fare.subtotal} applied={promo} onApply={setPromo} />
              </div>
            </Panel>
          )}
        </div>

        {/* Right Column: Sticky Summary Panel */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <Panel title="Trip Itinerary">
            <TripTimelineStepper trip={trip} compact />
            {returnTrip && (
              <div className="mt-4 border-t border-dashed border-line pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                  <RepeatIcon className="h-3.5 w-3.5 text-brand-600" />
                  Return Journey
                </p>
                <TripTimelineStepper trip={returnTrip} compact />
              </div>
            )}
          </Panel>

          <Panel title="Fare Breakdown">
            {outboundSeats.length === 0 ? (
              <p className="text-xs text-muted">Pick your seat above to view fare breakdown.</p>
            ) : (
              <>
                <ul className="mb-4 space-y-2 text-xs">
                  <li className="flex justify-between gap-3">
                    <span className="text-muted">Outbound Seats</span>
                    <span className="font-bold text-fg">
                      {outboundSeats.map((s) => s.seat_number).join(', ')}
                    </span>
                  </li>
                  {returnSeats.length > 0 && (
                    <li className="flex justify-between gap-3">
                      <span className="text-muted">Return Seats</span>
                      <span className="font-bold text-fg">
                        {returnSeats.map((s) => s.seat_number).join(', ')}
                      </span>
                    </li>
                  )}
                </ul>

                <FareSummary
                  fare={fare}
                  taxRate={settings.tax_rate_percentage}
                  seatCount={outboundSeats.length + returnSeats.length}
                  promoCode={promo?.code}
                />
              </>
            )}

            <div className="mt-5 space-y-2 border-t border-line pt-4">
              {seatStep && (
                <Button
                  block
                  size="lg"
                  loading={lock.locking}
                  disabled={outboundSeats.length === 0}
                  onClick={() => (roundTrip ? setStep(1) : goToPassengerDetails())}
                >
                  {roundTrip ? 'Select Return Journey' : 'Continue to Passenger Details'}
                </Button>
              )}

              {returnStep && (
                <>
                  <Button
                    block
                    size="lg"
                    loading={lock.locking}
                    disabled={!returnTrip || returnSeats.length !== outboundSeats.length}
                    onClick={goToPassengerDetails}
                  >
                    Continue to Passenger Details
                  </Button>
                  <Button block variant="ghost" onClick={() => setStep(0)}>
                    Back to Outbound Seats
                  </Button>
                </>
              )}

              {detailsStep && (
                <>
                  <Button
                    block
                    size="lg"
                    onClick={() => {
                      if (validatePassengers()) setStep(roundTrip ? 3 : 2);
                    }}
                  >
                    Continue to Payment
                  </Button>
                  <Button
                    block
                    variant="ghost"
                    onClick={() => {
                      lock.release();
                      setStep(roundTrip ? 1 : 0);
                    }}
                  >
                    Back to Seats
                  </Button>
                </>
              )}

              {paymentStep && (
                <>
                  <Button
                    block
                    size="lg"
                    loading={submitting}
                    onClick={handleStartPayment}
                    className={method === 'cash' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                    icon={
                      method === 'cash' ? (
                        <BanknoteIcon className="h-4 w-4" />
                      ) : method === 'card' ? (
                        <CreditCardIcon className="h-4 w-4" />
                      ) : (
                        <SmartphoneIcon className="h-4 w-4" />
                      )
                    }
                  >
                    {method === 'cash'
                      ? 'Reserve Seats (Pay Cash at Counter)'
                      : `Pay ${money(fare.total)} & Confirm Booking`}
                  </Button>
                  <Button
                    block
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => setStep(roundTrip ? 2 : 1)}
                  >
                    Back to Passenger Details
                  </Button>
                </>
              )}

              {!lock.locked && seatStep && (
                <p className="flex items-start gap-2 pt-1 text-[0.6875rem] text-muted">
                  <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  Seats are locked for {settings.seat_lock_minutes} minutes upon continuation to prevent double bookings.
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Mobile Sticky Quick Action Bar ── */}
      {seatStep && outboundSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-line bg-surface/95 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div>
              <p className="text-[0.6875rem] font-semibold text-muted">
                {outboundSeats.length} {outboundSeats.length === 1 ? 'Seat' : 'Seats'} Selected
              </p>
              <p className="text-sm sm:text-base font-black text-fg">{money(fare.total)}</p>
            </div>
            <Button
              size="md"
              loading={lock.locking}
              onClick={roundTrip ? () => setStep(1) : goToPassengerDetails}
              className="bg-brand-600 px-5 text-white hover:bg-brand-700 shadow-md"
            >
              {roundTrip ? 'Choose Return ➔' : 'Continue ➔'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Mobile Money USSD Push Verification Modal ── */}
      <Modal
        open={momoModalOpen}
        onClose={() => {
          if (!submitting) setMomoModalOpen(false);
        }}
        title="Mobile Money Payment Authorization"
        subtitle={`Approve payment of ${money(fare.total)} on your mobile phone`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              disabled={momoStage === 'authorizing' || submitting}
              onClick={() => setMomoModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              loading={momoStage === 'authorizing' || submitting}
              disabled={momoStage === 'success'}
              className="bg-brand-600 hover:bg-brand-700"
              onClick={handleApproveMomo}
            >
              {momoStage === 'authorizing' ? 'Verifying PIN...' : 'Approve Prompt on Phone'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-surface-2/60 border border-line">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm mb-3 ${
              method === 'mtn_mobile_money' ? 'bg-amber-500' : 'bg-red-500'
            }`}>
              <SmartphoneIcon className="h-6 w-6" />
            </span>

            <h3 className="font-extrabold text-base text-fg">
              Prompt Sent to {momoPhone}
            </h3>
            <p className="text-xs text-muted max-w-xs mt-1">
              Please check your phone screen and enter your {method === 'mtn_mobile_money' ? 'MTN MoMo' : 'Airtel Money'} PIN to authorize the payment.
            </p>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface px-4 py-2 border border-line shadow-sm">
              <span className="text-xs font-mono text-muted">Amount Due:</span>
              <span className="font-extrabold text-sm text-fg tabular-nums">{money(fare.total)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300">
            <ShieldCheckIcon className="h-4 w-4 shrink-0 text-blue-500" />
            <span>Encrypted payment processed through Bank of Uganda regulated gateway.</span>
          </div>
        </div>
      </Modal>

      {/* ── Debit / Credit Card Checkout Modal ── */}
      <Modal
        open={cardModalOpen}
        onClose={() => {
          if (!cardProcessing && !submitting) setCardModalOpen(false);
        }}
        title="Card Payment Checkout"
        subtitle={`Pay ${money(fare.total)} with Visa, Mastercard or UnionPay`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              disabled={cardProcessing || submitting}
              onClick={() => setCardModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              form="card-payment-form"
              type="submit"
              loading={cardProcessing || submitting}
              className="bg-brand-600 hover:bg-brand-700"
            >
              Authorize {money(fare.total)}
            </Button>
          </div>
        }
      >
        <form id="card-payment-form" onSubmit={handleApproveCard} className="space-y-4 py-2">
          <TextField
            id="card-number"
            label="Card Number"
            required
            placeholder="4242 •••• •••• 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="card-expiry"
              label="Expiry (MM/YY)"
              required
              placeholder="12/28"
              value={cardExpiry}
              onChange={(e) => setCardExpiry(e.target.value)}
            />
            <TextField
              id="card-cvv"
              label="Security Code (CVV)"
              type="password"
              required
              placeholder="•••"
              value={cardCvv}
              onChange={(e) => setCardCvv(e.target.value)}
            />
          </div>

          <TextField
            id="card-name"
            label="Cardholder Name"
            required
            placeholder="e.g. John Mukasa"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />

          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
            <LockIcon className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>256-bit TLS encrypted connection. PCI-DSS compliant checkout.</span>
          </div>
        </form>
      </Modal>
    </div>
  );
}