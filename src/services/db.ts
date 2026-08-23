import { busesSeed, driversSeed, rolesSeed, usersSeed } from '../data/fleet';
import { advertisementsSeed, promoCodesSeed } from '../data/marketing';
import { routesSeed, terminalsSeed } from '../data/network';
import { luggageDescriptions, parcelsSeed } from '../data/parcels';
import { settingsSeed } from '../data/settings';
import { generateSeats, generateTrips, makeRandom } from '../data/trips';
import type {
  Advertisement,
  AppNotification,
  AuditLog,
  Booking,
  Bus,
  BusRoute,
  Driver,
  Luggage,
  Parcel,
  Payment,
  PromoCode,
  Role,
  SeatLock,
  Setting,
  Terminal,
  Ticket,
  Trip,
  TripSeat,
  User } from
'../types/models';
import { calculateFare } from '../utils/fare';

export interface Database {
  roles: Role[];
  users: User[];
  terminals: Terminal[];
  routes: BusRoute[];
  buses: Bus[];
  drivers: Driver[];
  trips: Trip[];
  seats: TripSeat[];
  seatLocks: SeatLock[];
  bookings: Booking[];
  tickets: Ticket[];
  payments: Payment[];
  luggage: Luggage[];
  parcels: Parcel[];
  promoCodes: PromoCode[];
  advertisements: Advertisement[];
  settings: Setting[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
}

const counters: Record<string, number> = {};

export function nextId(table: keyof Database): number {
  const key = String(table);
  counters[key] = (counters[key] ?? 0) + 1;
  return counters[key];
}

function seedCounter(table: keyof Database, rows: {id: number;}[]): void {
  counters[String(table)] = rows.reduce((max, row) => Math.max(max, row.id), 0);
}

export function bookingNumber(): string {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const serial = String(nextId('bookings')).padStart(4, '0');
  return `LB-${stamp}-${serial}`;
}

export function ticketNumber(seed: number): string {
  return `TKT-${String(100000 + seed * 37).slice(0, 6)}-${String(seed * 91 % 97).padStart(2, '0')}`;
}

export function tagNumber(seed: number): string {
  return `LUG-${String(400000 + seed * 53).slice(0, 6)}`;
}

export function trackingNumber(seed: number): string {
  return `PCL-${8841300 + seed * 7}`;
}

export function transactionId(method: string, seed: number): string {
  const prefix = method === 'cash' ? 'CSH' : method === 'card' ? 'CRD' : method === 'airtel_money' ? 'ATL' : 'MTN';
  return `${prefix}-${String(920000 + seed * 131).slice(0, 6)}`;
}

const PASSENGER_POOL = usersSeed.filter((u) => u.role === 'passenger');
const PAYMENT_METHODS = ['cash', 'mtn_mobile_money', 'airtel_money', 'card'] as const;
const TAX_RATE = Number(settingsSeed.find((s) => s.key === 'tax_rate_percentage')?.value ?? 3);

function buildDatabase(): Database {
  const trips = generateTrips(routesSeed, busesSeed);
  const seats: TripSeat[] = [];
  let seatId = 1;
  trips.forEach((trip) => {
    const bus = busesSeed.find((b) => b.id === trip.bus_id)!;
    const generated = generateSeats(trip, bus, seatId);
    seatId += generated.length;
    seats.push(...generated);
  });

  const bookings: Booking[] = [];
  const tickets: Ticket[] = [];
  const payments: Payment[] = [];
  const luggage: Luggage[] = [];
  const notifications: AppNotification[] = [];

  const rand = makeRandom(20260813);
  let bookingId = 0;
  let ticketId = 0;
  let paymentId = 0;
  let luggageId = 0;

  trips.forEach((trip) => {
    if (trip.status === 'cancelled') return;
    const tripSeats = seats.filter((s) => s.trip_id === trip.id);
    const departure = new Date(trip.departure_time).getTime();
    const isPast = departure < Date.now();
    const fillRate = isPast ? 0.5 + rand() * 0.35 : 0.15 + rand() * 0.45;
    const seatsToSell = Math.floor(tripSeats.length * fillRate);
    let sold = 0;

    while (sold < seatsToSell) {
      const groupSize = Math.min(1 + Math.floor(rand() * 3), seatsToSell - sold);
      if (groupSize <= 0) break;
      const pick = tripSeats.filter((s) => s.status === 'available').slice(0, groupSize);
      if (pick.length === 0) break;

      const passenger = PASSENGER_POOL[Math.floor(rand() * PASSENGER_POOL.length)];
      const fare = calculateFare(
        pick.map((s) => ({ seat_class: s.seat_class, fare: trip.fare })),
        0,
        TAX_RATE
      );
      const method = PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)];
      const roll = rand();
      const status: Booking['status'] = isPast ?
      roll < 0.06 ?
      'cancelled' :
      'completed' :
      roll < 0.08 ?
      'pending' :
      roll < 0.13 ?
      'cancelled' :
      'confirmed';

      bookingId += 1;
      const createdAt = new Date(departure - (2 + rand() * 90) * 3600000).toISOString();
      const cancelled = status === 'cancelled';

      bookings.push({
        id: bookingId,
        booking_number: `LB-${String(new Date(createdAt).getFullYear()).slice(2)}${String(new Date(createdAt).getMonth() + 1).padStart(2, '0')}${String(new Date(createdAt).getDate()).padStart(2, '0')}-${String(bookingId).padStart(4, '0')}`,
        user_id: passenger.id,
        trip_id: trip.id,
        status,
        subtotal: fare.subtotal,
        discount_amount: 0,
        tax_amount: fare.taxAmount,
        total_amount: fare.total,
        payment_method: method,
        linked_booking_id: null,
        cancellation_fee: cancelled ? Math.round(fare.total * 10) / 100 : 0,
        cancelled_at: cancelled ? new Date(departure - 3600000).toISOString() : null,
        notes: '',
        created_at: createdAt
      });

      pick.forEach((seat) => {
        if (cancelled) {
          seat.status = 'available';
        } else {
          seat.status = 'booked';
        }
        ticketId += 1;
        tickets.push({
          id: ticketId,
          booking_id: bookingId,
          trip_seat_id: seat.id,
          passenger_name: passenger.name,
          passenger_phone: passenger.phone,
          ticket_number: ticketNumber(ticketId),
          qr_code: `SMARTBUS:${ticketNumber(ticketId)}`,
          status: cancelled ? 'cancelled' : isPast ? 'used' : 'active',
          boarded_at: !cancelled && isPast ? new Date(departure - 900000).toISOString() : null
        });

        if (rand() < 0.22 && !cancelled) {
          luggageId += 1;
          luggage.push({
            id: luggageId,
            booking_id: bookingId,
            trip_seat_id: seat.id,
            tag_number: tagNumber(luggageId),
            description: luggageDescriptions[Math.floor(rand() * luggageDescriptions.length)],
            weight_kg: Math.round((8 + rand() * 24) * 10) / 10,
            status: isPast ? 'delivered' : trip.status === 'in_transit' ? 'in_transit' : 'checked_in',
            notes: ''
          });
        }
      });

      paymentId += 1;
      payments.push({
        id: paymentId,
        booking_id: bookingId,
        method,
        amount: fare.total,
        status: cancelled ? 'refunded' : status === 'pending' ? 'pending' : 'completed',
        transaction_id: transactionId(method, paymentId),
        created_at: createdAt
      });

      sold += pick.length;
    }

    trip.available_seats = tripSeats.filter((s) => s.status === 'available').length;
  });

  const now = Date.now();
  const notify = (
  id: number,
  userId: number | null,
  type: string,
  title: string,
  message: string,
  minutesAgo: number,
  read: boolean)
  : AppNotification => ({
    id,
    user_id: userId,
    type,
    title,
    message,
    data: null,
    read_at: read ? new Date(now - minutesAgo * 60000 + 60000).toISOString() : null,
    created_at: new Date(now - minutesAgo * 60000).toISOString()
  });

  notifications.push(
    notify(1, 1, 'booking', 'Revenue milestone reached', 'Today’s counter and online sales have passed UGX 20M.', 12, false),
    notify(2, 1, 'fleet', 'Bus UBG 731N in maintenance', 'Gearbox service scheduled until Friday; two departures were cancelled.', 95, false),
    notify(3, 1, 'system', 'Weekly report ready', 'The revenue and occupancy report for last week is available in Reports.', 620, true),
    notify(4, 2, 'checkin', 'Boarding opened', 'Kampala → Jinja 07:15 has moved to boarding at bay 4.', 8, false),
    notify(5, 2, 'luggage', 'Excess luggage flagged', 'A bag on booking LB-260813-0042 is 6kg over the allowance.', 47, true),
    notify(6, 3, 'ticket', 'Your ticket is ready', 'Your boarding pass for Kampala → Masaka is available in My Tickets.', 30, false),
    notify(7, 3, 'promo', 'STUDENT15 is still active', 'Save 15% on your next booking with a valid student ID.', 1440, true),
    notify(8, 4, 'trip', 'Trip assigned', 'You are rostered on Kampala → Fort Portal departing 06:00 tomorrow.', 180, false)
  );

  seedCounter('bookings', bookings);
  seedCounter('tickets', tickets);
  seedCounter('payments', payments);
  seedCounter('luggage', luggage);
  seedCounter('parcels', parcelsSeed);
  seedCounter('seatLocks', []);
  seedCounter('notifications', notifications);
  seedCounter('users', usersSeed);
  seedCounter('roles', rolesSeed);
  seedCounter('buses', busesSeed);
  seedCounter('drivers', driversSeed);
  seedCounter('terminals', terminalsSeed);
  seedCounter('routes', routesSeed);
  seedCounter('trips', trips);
  seedCounter('seats', seats);
  seedCounter('promoCodes', promoCodesSeed);
  seedCounter('advertisements', advertisementsSeed);
  seedCounter('settings', settingsSeed);
  seedCounter('auditLogs', []);

  return {
    roles: [...rolesSeed],
    users: [...usersSeed],
    terminals: [...terminalsSeed],
    routes: [...routesSeed],
    buses: [...busesSeed],
    drivers: [...driversSeed],
    trips,
    seats,
    seatLocks: [],
    bookings,
    tickets,
    payments,
    luggage,
    parcels: [...parcelsSeed],
    promoCodes: [...promoCodesSeed],
    advertisements: [...advertisementsSeed],
    settings: [...settingsSeed],
    notifications,
    auditLogs: []
  };
}

export const db: Database = buildDatabase();