import { api } from './api-client';

export interface NewsletterSubscriber {
  id: number;
  contact: string;
  channel: 'email' | 'phone' | 'whatsapp';
  source: string;
  status: 'active' | 'unsubscribed';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscribeResponse {
  success: boolean;
  message: string;
  data: NewsletterSubscriber;
}

export interface SubscribersListResponse {
  success: boolean;
  data: {
    data: NewsletterSubscriber[];
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}

export async function subscribeToFareAlerts(contact: string, source = 'route_alerts_bar'): Promise<SubscribeResponse> {
  return api.post<SubscribeResponse>('/newsletter/subscribe', { contact, source });
}

export async function fetchNewsletterSubscribers(params?: {
  search?: string;
  channel?: string;
  status?: string;
  page?: number;
}): Promise<SubscribersListResponse> {
  return api.get<SubscribersListResponse>('/admin/newsletter-subscribers', params);
}

export async function deleteNewsletterSubscriber(id: number): Promise<{ success: boolean; message: string }> {
  return api.delete<{ success: boolean; message: string }>(`/admin/newsletter-subscribers/${id}`);
}

export interface BroadcastPayload {
  title: string;
  message: string;
  channel: 'all' | 'whatsapp' | 'email' | 'phone';
  promo_code?: string;
}

export interface BroadcastResponse {
  success: boolean;
  message: string;
  dispatched_count: number;
  total_targeted: number;
  whatsapp_broadcast_url?: string;
  message_preview?: string;
}

export async function broadcastFareAlert(payload: BroadcastPayload): Promise<BroadcastResponse> {
  return api.post<BroadcastResponse>('/admin/newsletter-subscribers/broadcast', payload);
}
