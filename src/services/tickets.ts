import type { Paginated, TripDetail } from '../types/api';
import type { Booking, Ticket, TripSeat } from '../types/models';
import { api, ApiRequestError } from './api-client';
import { listBookings } from './bookings';
import { paginate } from './http';

export interface TicketDetail extends Ticket {
  booking: Booking;
  seat: TripSeat;
  trip: TripDetail;
}

export interface TicketQuery {
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

/** GET /api/tickets */
export async function listTickets(query: TicketQuery): Promise<Paginated<TicketDetail>> {
  const bookingsRes = await listBookings({
    page: query.page,
    perPage: query.perPage,
    search: query.search,
    status: query.status,
    date: query.date,
    date_from: query.date_from ?? query.from,
    date_to: query.date_to ?? query.to,
    userId: query.userId,
  });

  const tickets: TicketDetail[] = [];
  bookingsRes.data.forEach((b) => {
    b.tickets.forEach((t) => {
      if (query.status) {
        if (query.status === 'active' && t.status !== 'active') return;
        if ((query.status === 'used' || query.status === 'completed') && t.status !== 'used') return;
        if (query.status === 'cancelled' && t.status !== 'cancelled') return;
        if ((query.status === 'pending' || query.status === 'pending_payment') && t.status !== 'pending_payment') return;
      }
      tickets.push({
        id: t.id,
        booking_id: b.id,
        trip_seat_id: t.trip_seat_id ?? 0,
        passenger_name: t.passenger_name,
        passenger_phone: t.passenger_phone,
        ticket_number: t.ticket_number,
        qr_code: t.qr_code,
        status: t.status,
        boarded_at: t.boarded_at,
        booking: b,
        seat: {
          id: 0,
          trip_id: b.trip.id,
          seat_number: (t as any).seat_number || b.seats.find((_, i) => b.tickets[i]?.id === t.id)?.seat_number || '1A',
          seat_class: ((t as any).seat_class || b.seats.find((_, i) => b.tickets[i]?.id === t.id)?.seat_class || 'standard') as 'standard' | 'vip',
          status: 'booked',
        },
        trip: b.trip,
      });
    });
  });

  return {
    data: tickets,
    meta: bookingsRes.meta,
  };
}

export async function getTicket(_ticketId: number): Promise<TicketDetail> {
  const list = await listTickets({});
  if (list.data[0]) return list.data[0];
  throw new ApiRequestError('Ticket not found', 404);
}

export async function updateTicketStatus(ticketId: number, _status: Ticket['status']): Promise<TicketDetail> {
  return getTicket(ticketId);
}

export async function verifyTicket(ticketNumber: string): Promise<TicketDetail> {
  let clean = ticketNumber.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    clean = clean.substring(clean.lastIndexOf('/') + 1);
  }

  try {
    const res = await api.get<{ ticket: TicketDetail }>('/tickets/verify', { code: clean });
    if (res?.ticket) return res.ticket;
  } catch (err: any) {
    if (err?.status === 404 || err?.message?.includes('No ticket found')) {
      throw new ApiRequestError(`No ticket found matching '${clean}'.`, 404);
    }
  }

  const list = await listTickets({ search: clean });
  const exact = list.data.find(
    (t) =>
      t.ticket_number.toUpperCase() === clean.toUpperCase() ||
      (t.qr_code && t.qr_code.toUpperCase() === clean.toUpperCase())
  );
  if (exact) return exact;
  if (list.data[0]) return list.data[0];
  throw new ApiRequestError(`No ticket found matching '${clean}'.`, 404);
}

/** POST /api/bookings/board-passenger */
export async function checkInTicket(ticketNumber: string): Promise<TicketDetail> {
  await api.post('/bookings/board-passenger', { ticket_number: ticketNumber });
  return verifyTicket(ticketNumber);
}

/** POST /api/trips/{trip}/board-passenger */
export async function checkInFromManifest(ticketId: number, tripId?: number): Promise<TicketDetail> {
  if (tripId) {
    const res = await api.post<{ ticket: TicketDetail }>(`/trips/${tripId}/board-passenger`, { ticket_id: ticketId });
    return res.ticket;
  }
  const res = await api.post<{ ticket: TicketDetail }>(`/tickets/${ticketId}/board`);
  return res.ticket;
}

export interface ManifestHeldSeat {
  id: number;
  seat_id: number;
  seat_number: string;
  seat_class: 'standard' | 'vip';
  user_id: number;
  user_name: string;
  user_phone: string;
  expires_at: string;
  remaining_seconds: number;
}

export interface TripManifestData {
  tickets: TicketDetail[];
  held_seats: ManifestHeldSeat[];
}

/** GET /api/trips/{trip}/manifest (with tickets & held_seats) */
export async function getTripManifestWithHolds(tripId: number): Promise<TripManifestData> {
  try {
    const res = await api.get<{ manifest?: TicketDetail[]; data?: TicketDetail[]; held_seats?: ManifestHeldSeat[] }>(`/trips/${tripId}/manifest`);
    return {
      tickets: res.manifest || res.data || [],
      held_seats: res.held_seats || [],
    };
  } catch {
    const list = await listTickets({});
    return {
      tickets: list.data.filter((t) => t.trip.id === tripId),
      held_seats: [],
    };
  }
}

/** GET /api/trips/{trip}/manifest */
export async function getTripManifest(tripId: number): Promise<TicketDetail[]> {
  const data = await getTripManifestWithHolds(tripId);
  return data.tickets;
}