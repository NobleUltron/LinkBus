import type { Paginated, TripDetail, TripSearchParams } from '../types/api';
import type { Terminal, Trip } from '../types/models';
import { api } from './api-client';
import { paginate } from './http';

// ─── Response shape from Laravel API ─────────────────────────────────────────

interface ApiTrip {
  id: number;
  route_id: number;
  bus_id: number;
  driver_id: number;
  departure_time: string;
  arrival_time: string;
  fare: number;
  status: Trip['status'];
  available_seats: number;
  route?: {
    id: number;
    distance_km: number;
    estimated_duration_min: number;
    origin?: { id: number; name: string; city: string };
    destination?: { id: number; name: string; city: string };
  };
  bus?: {
    id: number;
    plate_number: string;
    model: string;
    bus_type: string;
    capacity: number;
  };
  driver?: {
    id: number;
    name: string;
  };
  seats?: Array<{
    id: number;
    seat_number: string;
    seat_class: 'standard' | 'vip';
    status: 'available' | 'locked' | 'booked';
    locked_by_me?: boolean;
  }>;
}

/** Maps the Laravel API response shape → the frontend's TripDetail shape. */
function mapTrip(t: ApiTrip): TripDetail {
  const origin: Terminal = {
    id: t.route?.origin?.id ?? 0,
    name: t.route?.origin?.name ?? '',
    city: t.route?.origin?.city ?? '',
    address: '',
    latitude: 0,
    longitude: 0,
    status: 'active',
    photo: null,
  };
  const destination: Terminal = {
    id: t.route?.destination?.id ?? 0,
    name: t.route?.destination?.name ?? '',
    city: t.route?.destination?.city ?? '',
    address: '',
    latitude: 0,
    longitude: 0,
    status: 'active',
    photo: null,
  };

  return {
    id: t.id,
    route_id: t.route_id,
    bus_id: t.bus_id,
    driver_id: t.driver_id,
    departure_time: t.departure_time,
    arrival_time: t.arrival_time,
    fare: t.fare,
    status: t.status,
    available_seats: t.available_seats,
    route: {
      id: t.route?.id ?? 0,
      origin_terminal_id: origin.id,
      destination_terminal_id: destination.id,
      distance_km: t.route?.distance_km ?? 0,
      estimated_duration_minutes: t.route?.estimated_duration_min ?? 0,
      status: 'active',
    },
    origin,
    destination,
    bus: {
      id: t.bus?.id ?? 0,
      plate_number: t.bus?.plate_number ?? '',
      model: t.bus?.model ?? '',
      bus_type: (t.bus?.bus_type as TripDetail['bus']['bus_type']) ?? 'standard',
      capacity: t.bus?.capacity ?? 0,
      status: 'active',
      notes: '',
    },
    driver: {
      id: t.driver?.id ?? 0,
      user_id: 0,
      license_number: '',
      license_expiry: '',
      status: 'active',
      experience_years: 0,
      notes: '',
    },
    driver_user: t.driver
      ? {
          id: 0,
          name: t.driver.name,
          email: '',
          phone: '',
          avatar: null,
          role_id: 0,
          role: 'driver',
          is_driver: true,
          created_at: '',
        }
      : null,
    seats: (t.seats ?? []).map((s) => ({
      id: s.id,
      trip_id: t.id,
      seat_number: s.seat_number,
      seat_class: s.seat_class,
      status: s.status,
    })),
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

/** GET /api/trips/search */
export async function searchTrips(params: TripSearchParams): Promise<TripDetail[]> {
  const data = await api.get<{ trips: ApiTrip[] }>('/trips/search', {
    origin_id: params.origin,
    destination_id: params.destination,
    date: params.date,
  });
  return data.trips.map(mapTrip);
}

/** GET /api/trips/{trip} */
export async function getTrip(tripId: number): Promise<TripDetail> {
  const data = await api.get<{ trip: ApiTrip }>(`/trips/${tripId}`);
  return mapTrip(data.trip);
}

/** GET /api/terminals */
export async function getTerminals(): Promise<Terminal[]> {
  const data = await api.get<{ terminals: Terminal[] }>('/terminals');
  return data.terminals;
}

export async function getActiveTerminals(): Promise<Terminal[]> {
  return getTerminals();
}

/** GET /api/trips (admin list) */
export async function listTrips(options: {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  from?: string;
  to?: string;
}): Promise<Paginated<TripDetail>> {
  const data = await api.get<{
    trips: ApiTrip[];
    meta: { current_page: number; last_page: number; total: number };
  }>('/trips', {
    status: options.status,
    date: options.date,
    from: options.from ?? options.date_from,
    to: options.to ?? options.date_to,
    page: options.page,
  });

  let trips = data.trips.map(mapTrip);

  // Client-side search (backend search comes later)
  if (options.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    trips = trips.filter((t) =>
      [t.origin.city, t.destination.city, t.bus.plate_number, t.driver_user?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }

  const meta = data.meta;
  return {
    data: trips,
    meta: {
      total: meta.total,
      per_page: 20,
      current_page: meta.current_page,
      last_page: meta.last_page,
    },
  };
}

/** Driver's assigned trips */
export async function getDriverTrips(userId?: number): Promise<TripDetail[]> {
  const data = await api.get<{ trips: ApiTrip[] }>('/trips', {
    user_id: userId || undefined,
  });
  return data.trips.map(mapTrip);
}

export interface TripInput {
  route_id: number;
  bus_id: number;
  driver_id: number;
  departure_time: string;
  arrival_time?: string;
  fare: number;
  status: Trip['status'];
}

/** POST /api/trips */
export async function createTrip(payload: TripInput): Promise<TripDetail> {
  // Compute arrival if not provided
  if (!payload.arrival_time) {
    const dep = new Date(payload.departure_time);
    payload = { ...payload, arrival_time: new Date(dep.getTime() + 4 * 3600000).toISOString() };
  }
  const data = await api.post<{ trip: ApiTrip }>('/trips', payload);
  return mapTrip(data.trip);
}

/** PUT /api/trips/{trip} */
export async function updateTrip(tripId: number, payload: TripInput): Promise<TripDetail> {
  const data = await api.put<{ trip: ApiTrip }>(`/trips/${tripId}`, payload);
  return mapTrip(data.trip);
}

/** Check driver & bus scheduling conflicts */
export async function checkTripConflicts(params: {
  route_id: number;
  driver_id?: number;
  bus_id?: number;
  departure_time: string;
  arrival_time: string;
  exclude_trip_id?: number;
}): Promise<{ has_conflicts: boolean; conflicts: string[] }> {
  return api.get<{ has_conflicts: boolean; conflicts: string[] }>('/trips/check-conflicts', params);
}

/** Change a trip's status (for driver portal) */
export async function updateTripStatus(tripId: number, status: TripDetail['status']): Promise<TripDetail> {
  const data = await api.put<{ trip: ApiTrip }>(`/trips/${tripId}`, { status });
  return mapTrip(data.trip);
}

/** PUT (soft-delete) */
export async function deleteTrip(tripId: number): Promise<void> {
  await api.put(`/trips/${tripId}`, { status: 'cancelled' });
}

/** GET /api/trips/{trip}/seats */
export async function getTripSeats(tripId: number): Promise<Array<{
  id: number;
  seat_number: string;
  seat_class: 'standard' | 'vip';
  status: 'available' | 'locked' | 'booked';
  locked_by_me: boolean;
}>> {
  const data = await api.get<{ seats: Array<{
    id: number;
    seat_number: string;
    seat_class: 'standard' | 'vip';
    status: 'available' | 'locked' | 'booked';
    locked_by_me: boolean;
  }> }>(`/trips/${tripId}/seats`);
  return data.seats;
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

export interface TripManifestResponse {
  trip: TripDetail;
  manifest: any[];
  data: any[];
  held_seats?: ManifestHeldSeat[];
  total: number;
  boarded: number;
}

/** GET /api/trips/{trip}/manifest */
export async function getTripManifest(tripId: number): Promise<TripManifestResponse> {
  return api.get<TripManifestResponse>(`/trips/${tripId}/manifest`);
}