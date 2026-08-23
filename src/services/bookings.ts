import type { BookingDetail, Paginated, PromoValidation } from '../types/api';
import type { Booking, BookingStatus, PaymentMethod } from '../types/models';
import { api } from './api-client';

export interface PassengerInput {
  seat_id: number;
  passenger_name: string;
  passenger_phone: string;
}

export interface CreateBookingPayload {
  user_id: number;
  trip_id: number;
  seat_ids: number[];
  passengers: PassengerInput[];
  payment_method: PaymentMethod;
  promo_code?: string | null;
  notes?: string;
  return_trip_id?: number | null;
  return_seat_ids?: number[];
}

// ─── Response → frontend shape adapter ───────────────────────────────────────

interface ApiBooking {
  id: number;
  booking_number: string;
  status: Booking['status'];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  cancellation_fee: number;
  cancelled_at: string | null;
  created_at: string;
  trip?: {
    id: number;
    departure_time: string;
    arrival_time: string;
    fare: number;
    status: string;
    origin: string;
    destination: string;
    bus: string;
  };
  tickets?: Array<{
    id: number;
    ticket_number: string;
    qr_code: string;
    passenger_name: string;
    passenger_phone: string;
    seat_number: string;
    seat_class: 'standard' | 'vip';
    status: 'active' | 'used' | 'cancelled';
    boarded_at: string | null;
  }>;
  payment?: {
    method: PaymentMethod;
    amount: number;
    status: string;
    transaction_id: string;
  };
}

function mapBooking(b: ApiBooking): BookingDetail {
  const baseBooking: Booking = {
    id: b.id,
    booking_number: b.booking_number,
    user_id: 0,
    trip_id: b.trip?.id ?? 0,
    status: b.status,
    subtotal: b.subtotal,
    discount_amount: b.discount_amount,
    tax_amount: b.tax_amount,
    total_amount: b.total_amount,
    payment_method: b.payment_method,
    linked_booking_id: null,
    cancellation_fee: b.cancellation_fee ?? 0,
    cancelled_at: b.cancelled_at,
    notes: '',
    created_at: b.created_at,
  };

  const tickets = (b.tickets ?? []).map((t, idx) => ({
    id: t.id,
    booking_id: b.id,
    trip_seat_id: idx, // not strictly needed for display
    passenger_name: t.passenger_name,
    passenger_phone: t.passenger_phone ?? '',
    ticket_number: t.ticket_number,
    qr_code: t.qr_code,
    seat_number: t.seat_number,
    seat_class: t.seat_class,
    status: t.status,
    boarded_at: t.boarded_at,
  }));

  const seats = (b.tickets ?? []).map((t, idx) => ({
    id: idx,
    trip_id: b.trip?.id ?? 0,
    seat_number: t.seat_number,
    seat_class: t.seat_class,
    status: 'booked' as const,
  }));

  // Build a minimal TripDetail for display purposes
  const tripDetail = b.trip
    ? {
        id: b.trip.id,
        route_id: 0,
        bus_id: 0,
        driver_id: 0,
        departure_time: b.trip.departure_time,
        arrival_time: b.trip.arrival_time,
        fare: b.trip.fare,
        status: b.trip.status as any,
        available_seats: 0,
        route: { id: 0, origin_terminal_id: 0, destination_terminal_id: 0, distance_km: 0, estimated_duration_minutes: 0, status: 'active' as const },
        origin: { id: 0, name: b.trip.origin ?? '', city: b.trip.origin ?? '', address: '', latitude: 0, longitude: 0, status: 'active' as const, photo: null },
        destination: { id: 0, name: b.trip.destination ?? '', city: b.trip.destination ?? '', address: '', latitude: 0, longitude: 0, status: 'active' as const, photo: null },
        bus: { id: 0, plate_number: b.trip.bus ?? '', model: '', bus_type: 'standard' as const, capacity: 0, status: 'active' as const, notes: '' },
        driver: { id: 0, user_id: 0, license_number: '', license_expiry: '', status: 'active' as const, experience_years: 0, notes: '' },
        driver_user: null,
        seats,
      }
    : ({} as any);

  return {
    ...baseBooking,
    trip: tripDetail,
    tickets,
    seats,
    passenger: null,
    linked_booking: null,
  };
}

// ─── Seat locking ─────────────────────────────────────────────────────────────

export async function lockSeats(payload: {
  user_id: number;
  trip_id: number;
  seat_ids: number[];
}): Promise<{ expires_at: string; seat_ids: number[] }> {
  // Lock one seat at a time (API is per-seat)
  let expiresAt = '';
  for (const seat_id of payload.seat_ids) {
    const res = await api.post<{ expires_at: string }>('/bookings/lock-seat', {
      trip_id: payload.trip_id,
      seat_id,
    });
    expiresAt = res.expires_at;
  }
  return { expires_at: expiresAt, seat_ids: payload.seat_ids };
}

export async function releaseSeats(seatIds: number[]): Promise<void> {
  for (const seat_id of seatIds) {
    try {
      await api.post('/bookings/unlock-seat', { seat_id });
    } catch {
      // Ignore — lock may already be expired
    }
  }
}

// ─── Promo codes ──────────────────────────────────────────────────────────────

export async function validatePromoCode(payload: {
  code: string;
  subtotal: number;
}): Promise<PromoValidation> {
  const data = await api.post<{
    code: string;
    description: string;
    discount_amount: number;
  }>('/bookings/validate-promo', { code: payload.code, amount: payload.subtotal });
  return { code: data.code, description: data.description, discount: data.discount_amount };
}

// ─── Create booking ───────────────────────────────────────────────────────────

export async function createBooking(payload: CreateBookingPayload): Promise<BookingDetail[]> {
  const seats = payload.seat_ids.map((seat_id) => {
    const p = payload.passengers.find((p) => p.seat_id === seat_id);
    return {
      seat_id,
      passenger_name: p?.passenger_name ?? 'Passenger',
      passenger_phone: p?.passenger_phone ?? '',
    };
  });

  const data = await api.post<{ booking: ApiBooking }>('/bookings', {
    trip_id: payload.trip_id,
    seats,
    payment_method: payload.payment_method,
    promo_code: payload.promo_code ?? null,
  });

  const bookings: BookingDetail[] = [mapBooking(data.booking)];

  // Handle return trip booking
  if (payload.return_trip_id && payload.return_seat_ids?.length) {
    const returnSeats = payload.return_seat_ids.map((seat_id, idx) => ({
      seat_id,
      passenger_name: payload.passengers[idx]?.passenger_name ?? 'Passenger',
      passenger_phone: payload.passengers[idx]?.passenger_phone ?? '',
    }));

    const returnData = await api.post<{ booking: ApiBooking }>('/bookings', {
      trip_id: payload.return_trip_id,
      seats: returnSeats,
      payment_method: payload.payment_method,
    });
    bookings.push(mapBooking(returnData.booking));
  }

  return bookings;
}

/** POS counter sale */
export async function posBook(payload: {
  staff_user_id: number;
  trip_id: number;
  seat_ids: number[];
  passengers: PassengerInput[];
  payment_method: PaymentMethod;
  promo_code?: string | null;
  amount_paid: number;
}): Promise<BookingDetail> {
  const seats = payload.seat_ids.map((seat_id) => {
    const p = payload.passengers.find((p) => p.seat_id === seat_id);
    return {
      seat_id,
      passenger_name: p?.passenger_name ?? 'Passenger',
      passenger_phone: p?.passenger_phone ?? '',
    };
  });

  const data = await api.post<{ booking: ApiBooking }>('/bookings', {
    trip_id: payload.trip_id,
    seats,
    payment_method: payload.payment_method,
    promo_code: payload.promo_code ?? null,
    is_counter_sale: true,
  });

  return mapBooking(data.booking);
}

// ─── List & get bookings ──────────────────────────────────────────────────────

export interface BookingQuery {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  from?: string;
  to?: string;
  userId?: number;
}

export async function listBookings(query: BookingQuery): Promise<Paginated<BookingDetail>> {
  const data = await api.get<{
    bookings: ApiBooking[];
    meta: { current_page: number; last_page: number; total: number };
  }>('/bookings', {
    status: query.status,
    page: query.page,
    date: query.date,
    from: query.from ?? query.date_from,
    to: query.to ?? query.date_to,
    user_id: query.userId,
  });

  let bookings = data.bookings.map(mapBooking);

  if (query.search?.trim()) {
    const q = query.search.trim().toLowerCase();
    bookings = bookings.filter((b) =>
      [
        b.booking_number,
        b.trip?.origin?.city,
        b.trip?.destination?.city,
        ...b.tickets.map((t) => t.ticket_number),
        ...b.tickets.map((t) => t.passenger_name),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }

  const meta = data.meta;
  return {
    data: bookings,
    meta: {
      total: meta.total,
      per_page: query.perPage ?? 20,
      current_page: meta.current_page,
      last_page: meta.last_page,
    },
  };
}

export async function getBooking(bookingId: number): Promise<BookingDetail> {
  const data = await api.get<{ booking: ApiBooking }>(`/bookings/${bookingId}`);
  return mapBooking(data.booking);
}

export async function updateBookingStatus(bookingId: number, _status: BookingStatus): Promise<BookingDetail> {
  // Status is changed via cancel endpoint
  return getBooking(bookingId);
}

export async function cancelBooking(bookingId: number): Promise<{ fee: number; refund: number }> {
  const data = await api.post<{ booking: { cancellation_fee: number; total_amount: number } }>(
    `/bookings/${bookingId}/cancel`,
  );
  const fee = data.booking.cancellation_fee ?? 0;
  return { fee, refund: 0 };
}

export async function refundBooking(bookingId: number): Promise<BookingDetail> {
  await api.post(`/bookings/${bookingId}/cancel`);
  return getBooking(bookingId);
}

/** Board a passenger using their ticket number */
export async function boardPassenger(ticketNumber: string): Promise<{
  message: string;
  passenger_name: string;
  seat_number: string;
}> {
  return api.post('/bookings/board-passenger', { ticket_number: ticketNumber });
}

export async function listSeatLocks(): Promise<number> {
  return 0; // Real implementation would query a seat locks count endpoint
}

/** Get preformatted WhatsApp text and direct wa.me URL for booking */
export async function getWhatsappShare(bookingId: number): Promise<{
  phone: string;
  text: string;
  share_url: string;
}> {
  return api.get(`/bookings/${bookingId}/whatsapp-share`);
}

/** Resend automated WhatsApp message for a booking */
export async function resendWhatsapp(bookingId: number): Promise<{
  success: boolean;
  message: string;
}> {
  return api.post(`/bookings/${bookingId}/whatsapp-resend`);
}

/** Confirm cash collected at station counter (Staff / Admin) */
export async function confirmCashPayment(bookingId: number): Promise<{
  message: string;
  booking: BookingDetail;
}> {
  const data = await api.post<{ message: string; booking: ApiBooking }>(
    `/bookings/${bookingId}/confirm-payment`
  );
  return {
    message: data.message,
    booking: mapBooking(data.booking),
  };
}

/** Verify Mobile Money transaction authorization */
export async function verifyMomoPayment(payload: {
  phone: string;
  amount: number;
  provider: 'mtn' | 'airtel';
}): Promise<{
  status: string;
  transaction_id: string;
  message: string;
}> {
  return api.post('/payments/verify-momo', payload);
}