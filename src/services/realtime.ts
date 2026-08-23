/**
 * Stand-in for Laravel Echo + Pusher.
 * `subscribe('dashboard.stats', handler)` mirrors
 * Echo.private('dashboard.stats').listen('DashboardStatsUpdated', handler).
 */
type Handler = (payload: unknown) => void;

const channels = new Map<string, Set<Handler>>();

export function subscribe(channel: string, handler: Handler): () => void {
  const set = channels.get(channel) ?? new Set<Handler>();
  set.add(handler);
  channels.set(channel, set);
  return () => {
    set.delete(handler);
  };
}

export function broadcast(channel: string, payload: unknown = null): void {
  channels.get(channel)?.forEach((handler) => handler(payload));
}

export const DASHBOARD_CHANNEL = 'dashboard.stats';

let heartbeat: number | null = null;

/** Periodic push so dashboards visibly refresh without a reload. */
export function startHeartbeat(intervalMs = 25000): void {
  if (heartbeat !== null) return;
  heartbeat = window.setInterval(() => broadcast(DASHBOARD_CHANNEL, { at: new Date().toISOString() }), intervalMs);
}