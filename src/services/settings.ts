import type { Advertisement, Setting, SettingGroup } from '../types/models';
import { api } from './api-client';

export interface PublicSettings {
  tax_rate_percentage: number;
  cancellation_fee_percentage: number;
  seat_lock_minutes: number;
  max_seats_per_booking: number;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  free_luggage_kg: number;
  excess_luggage_fee_per_kg: number;
}

/** Fetches settings from the API and normalizes them. */
export async function getPublicSettings(): Promise<PublicSettings> {
  try {
    const data = await api.get<{ settings: Record<string, Setting[]> }>('/settings');
    const allSettings: Setting[] = Object.values(data.settings).flat();

    function val(key: string, fallback: string): string {
      return allSettings.find((s) => s.key === key)?.value ?? fallback;
    }

    return {
      tax_rate_percentage: Number(val('tax_rate', '0')),
      cancellation_fee_percentage: Number(val('cancellation_fee_pct', '10')),
      seat_lock_minutes: Number(val('seat_lock_minutes', '10')),
      max_seats_per_booking: 5,
      company_name: val('company_name', 'LinkBus Uganda'),
      company_email: val('company_email', ''),
      company_phone: val('company_phone', ''),
      company_address: val('company_address', ''),
      free_luggage_kg: Number(val('max_luggage_kg', '20')),
      excess_luggage_fee_per_kg: Number(val('excess_luggage_fee_kg', '2000')),
    };
  } catch {
    // Return defaults if not authenticated / API unavailable
    return {
      tax_rate_percentage: 0,
      cancellation_fee_percentage: 10,
      seat_lock_minutes: 10,
      max_seats_per_booking: 5,
      company_name: 'LinkBus Uganda',
      company_email: 'info@linkbus.co.ug',
      company_phone: '+256-700-123456',
      company_address: 'Kampala, Uganda',
      free_luggage_kg: 20,
      excess_luggage_fee_per_kg: 2000,
    };
  }
}

export async function getGroupedSettings(): Promise<Record<SettingGroup, Setting[]>> {
  const data = await api.get<{ settings: Record<string, Setting[]> }>('/admin/settings');
  const empty: Record<SettingGroup, Setting[]> = {
    company: [],
    booking: [],
    payment: [],
    luggage: [],
    notifications: [],
    subscribers: [],
  };
  Object.entries(data.settings).forEach(([group, items]) => {
    if (group in empty) empty[group as SettingGroup] = items;
  });
  return empty;
}

export async function updateSettings(changes: Record<string, string>): Promise<Setting[]> {
  const settings = Object.entries(changes).map(([key, value]) => ({ key, value }));
  await api.put('/admin/settings', { settings });
  return [];
}

export async function getActiveAdvertisements(type?: Advertisement['type']): Promise<Advertisement[]> {
  try {
    const url = type ? `/advertisements?type=${encodeURIComponent(type)}` : '/advertisements';
    const data = await api.get<{ advertisements: Advertisement[] }>(url);
    const now = Date.now();
    return (data.advertisements || [])
      .filter((ad) => ad.status === 'active')
      .filter((ad) => new Date(ad.start_date).getTime() <= now && new Date(ad.end_date).getTime() >= now)
      .filter((ad) => (type ? ad.type === type : true))
      .sort((a, b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  user?: { id: number; name: string; email: string };
  action: string;
  model_type: string;
  model_id: number | null;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  created_at: string;
}

export async function fetchAuditLogs(search?: string): Promise<{ logs: AuditLogItem[]; meta: any }> {
  try {
    const data = await api.get<{ logs: AuditLogItem[]; meta: any }>('/admin/audit-logs', { search });
    return data;
  } catch {
    return { logs: [], meta: {} };
  }
}