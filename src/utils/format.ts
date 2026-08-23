/** Currency used across the product. Change here only. */
export const CURRENCY = 'UGX';

export function money(amount: number): string {
  return `${CURRENCY} ${Math.round(amount).toLocaleString('en-US')}`;
}

export function moneyShort(amount: number): string {
  if (amount >= 1_000_000) return `${CURRENCY} ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 10_000) return `${CURRENCY} ${Math.round(amount / 1000)}K`;
  return money(amount);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return 'Today';
  const tomorrow = new Date(today.getTime() + 86400000);
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function minutesBetween(from: string, to: string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
}

export function toDateInput(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function toDateTimeInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function titleCase(value: string): string {
  return value.
  split('_').
  map((part) => part.charAt(0).toUpperCase() + part.slice(1)).
  join(' ');
}

export function initials(name: string): string {
  return name.
  split(' ').
  filter(Boolean).
  slice(0, 2).
  map((part) => part[0]?.toUpperCase() ?? '').
  join('');
}

export function countdownLabel(secondsLeft: number): string {
  const m = Math.max(0, Math.floor(secondsLeft / 60));
  const s = Math.max(0, secondsLeft % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function getAvatarUrl(avatar?: string | null): string {
  return getMediaUrl(avatar);
}

export function getMediaUrl(mediaPath?: string | null): string {
  if (!mediaPath) return '';
  if (mediaPath.startsWith('data:') || mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    return mediaPath;
  }
  const cleanPath = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`;
  const relativePath = cleanPath.startsWith('/storage/') ? cleanPath : `/storage${cleanPath}`;

  const apiBase = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  if (apiBase && typeof apiBase === 'string' && apiBase.startsWith('http')) {
    try {
      const url = new URL(apiBase);
      return `${url.origin}${relativePath}`;
    } catch {
      // ignore
    }
  }
  return relativePath;
}