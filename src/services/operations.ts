import type { Paginated } from '../types/api';
import type { Luggage, Parcel } from '../types/models';
import { api } from './api-client';
import { ApiRequestError, matches, paginate } from './http';

export interface LuggageDetail extends Luggage {
  booking_number: string;
  passenger_name: string;
  seat_number: string | null;
  route: string;
  departure_time: string;
}

export type ParcelDetail = Parcel & {
  origin_city: string;
  destination_city: string;
};

// ─── Luggage ──────────────────────────────────────────────────────────────────

export async function listLuggage(query: {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  from?: string;
  to?: string;
}): Promise<Paginated<LuggageDetail>> {
  const data = await api.get<{
    luggage: LuggageDetail[];
    meta: { current_page: number; last_page: number; total: number };
  }>('/luggage', {
    status: query.status,
    page: query.page,
    date: query.date,
    from: query.from ?? query.date_from,
    to: query.to ?? query.date_to,
  });

  let rows: LuggageDetail[] = data.luggage || [];

  if (query.search?.trim()) {
    rows = rows.filter((item) =>
      matches([item.tag_number, item.booking_number, item.passenger_name, item.description, item.route], query.search!),
    );
  }

  const meta = data.meta;
  return {
    data: rows,
    meta: { total: meta?.total ?? rows.length, per_page: query.perPage ?? 20, current_page: meta?.current_page ?? 1, last_page: meta?.last_page ?? 1 },
  };
}

export async function findLuggageByBooking(reference: string): Promise<{
  booking_number: string;
  passenger_name: string;
  booking_id: number;
  route: string;
  departure_time: string;
  items: LuggageDetail[];
}> {
  const data = await api.get<{
    booking_id: number;
    booking_number: string;
    passenger_name: string;
    route: string;
    departure_time: string;
    items: LuggageDetail[];
  }>('/luggage/lookup', { reference });

  return data;
}

export async function createLuggage(payload: {
  booking_id: number;
  weight_kg: number;
  description: string;
  fee: number;
  excess_weight_kg?: number;
  status?: Luggage['status'];
}): Promise<LuggageDetail> {
  const data = await api.post<{ luggage: LuggageDetail }>('/luggage', payload);
  return data.luggage;
}

export async function updateLuggageStatus(id: number, status: Luggage['status']): Promise<LuggageDetail> {
  const data = await api.put<{ luggage: LuggageDetail }>(`/luggage/${id}`, { status });
  return data.luggage;
}

export async function deleteLuggage(id: number): Promise<void> {
  await api.delete(`/luggage/${id}`);
}

export async function findLuggageByTag(tag: string): Promise<LuggageDetail> {
  const data = await api.get<{ luggage: LuggageDetail[] }>('/luggage');
  const found = (data.luggage || []).find((l: any) => l.tag_number?.toLowerCase() === tag.trim().toLowerCase());
  if (!found) throw new ApiRequestError('No bag matches that tag number.', 404);
  return found;
}

// ─── Parcels ──────────────────────────────────────────────────────────────────

export type ParcelInput = Omit<Parcel, 'id' | 'tracking_number' | 'created_at' | 'status'> & {
  status?: Parcel['status'];
};

export async function listParcels(query: {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  from?: string;
  to?: string;
}): Promise<Paginated<ParcelDetail>> {
  const data = await api.get<{
    parcels: Array<any>;
    meta: { current_page: number; last_page: number; total: number };
  }>('/parcels', {
    status: query.status,
    page: query.page,
    date: query.date,
    from: query.from ?? query.date_from,
    to: query.to ?? query.date_to,
  });

  let rows: ParcelDetail[] = data.parcels.map((p: any) => ({
    ...p,
    origin_city: p.origin ?? '—',
    destination_city: p.destination ?? '—',
  }));

  if (query.search?.trim()) {
    rows = rows.filter((p) =>
      matches([p.tracking_number, p.sender_name, p.recipient_name, p.recipient_phone, p.origin_city, p.destination_city], query.search!),
    );
  }

  const meta = data.meta;
  return {
    data: rows,
    meta: { total: meta.total, per_page: query.perPage ?? 20, current_page: meta.current_page, last_page: meta.last_page },
  };
}

export async function createParcel(payload: ParcelInput): Promise<ParcelDetail> {
  const data = await api.post<{ parcel: any }>('/parcels', payload);
  const p = data.parcel;
  return { ...p, origin_city: p.origin ?? '—', destination_city: p.destination ?? '—' };
}

export async function updateParcel(id: number, changes: Partial<Parcel>): Promise<ParcelDetail> {
  const data = await api.put<{ parcel: any }>(`/parcels/${id}`, changes);
  const p = data.parcel;
  return { ...p, origin_city: p.origin ?? '—', destination_city: p.destination ?? '—' };
}

export async function deleteParcel(_id: number): Promise<void> {
  // API doesn't support delete parcels; just update status
}

export async function trackParcel(tracking: string): Promise<ParcelDetail> {
  const data = await api.get<{ parcel: any }>('/parcels/track', { tracking_number: tracking });
  const p = data.parcel;
  return { ...p, origin_city: p.origin ?? '—', destination_city: p.destination ?? '—' };
}