import type { AppNotification, NotificationLog } from '../types/models';
import { api } from './api-client';

export async function listNotifications(_userId?: number): Promise<AppNotification[]> {
  const data = await api.get<{ notifications: AppNotification[]; unread_count: number }>('/notifications');
  return data.notifications;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(_userId?: number): Promise<void> {
  await api.post('/notifications/read-all');
}

export async function deleteNotification(id: number): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

export async function clearAllNotifications(): Promise<void> {
  await api.delete('/notifications');
}

export interface BroadcastPayload {
  title: string;
  message: string;
  target: 'all' | 'passengers' | 'staff' | 'trip';
  trip_id?: number;
  send_sms?: boolean;
  send_email?: boolean;
}

export async function sendBroadcastAnnouncement(payload: BroadcastPayload): Promise<{
  message: string;
  stats: {
    total_users: number;
    in_app_sent: number;
    sms_sent: number;
    email_sent: number;
  };
}> {
  return api.post('/admin/notifications/broadcast', payload);
}

export async function sendTestSms(phone: string, message?: string): Promise<{
  success: boolean;
  message: string;
  result?: unknown;
}> {
  return api.post('/admin/notifications/test-sms', { phone, message });
}

export async function sendTestEmail(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  return api.post('/admin/notifications/test-email', { email });
}

export async function sendTestWhatsapp(phone: string, message?: string): Promise<{
  success: boolean;
  message: string;
  whatsapp_link?: string;
  result?: unknown;
}> {
  return api.post('/admin/notifications/test-whatsapp', { phone, message });
}

export async function getNotificationLogs(params?: {
  page?: number;
  channel?: 'sms' | 'email' | 'in_app' | 'whatsapp';
  status?: string;
  search?: string;
}): Promise<{
  logs: NotificationLog[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.channel) query.set('channel', params.channel);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const qs = query.toString();
  return api.get(`/admin/notifications/logs${qs ? `?${qs}` : ''}`);
}