import { useEffect, useState } from 'react';
import { DASHBOARD_CHANNEL, startHeartbeat, subscribe } from '../services/realtime';

/**
 * Equivalent of Echo.private('dashboard.stats').listen('DashboardStatsUpdated', …).
 * Returns a nonce that changes whenever the channel pushes, plus the last push time.
 */
export function useDashboardChannel(): {nonce: number;lastUpdate: Date | null;} {
  const [nonce, setNonce] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    startHeartbeat();
    return subscribe(DASHBOARD_CHANNEL, () => {
      setNonce((n) => n + 1);
      setLastUpdate(new Date());
    });
  }, []);

  return { nonce, lastUpdate };
}