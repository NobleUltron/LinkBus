import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getPublicSettings, type PublicSettings } from '../services/settings';
interface SettingsContextValue {
  settings: PublicSettings;
  loading: boolean;
  refresh: () => void;
}
const FALLBACK: PublicSettings = {
  tax_rate_percentage: 3,
  cancellation_fee_percentage: 10,
  seat_lock_minutes: 10,
  max_seats_per_booking: 5,
  company_name: 'Link Bus Services',
  company_email: 'hello@linkbus.co.ug',
  company_phone: '+256 772 120 340',
  company_address: 'Nakivubo Rd, Namayiba, Kampala',
  free_luggage_kg: 20,
  excess_luggage_fee_per_kg: 350
};
const SettingsContext = createContext<SettingsContextValue | null>(null);
export function SettingsProvider({
  children


}: {children: React.ReactNode;}) {
  const [settings, setSettings] = useState<PublicSettings>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPublicSettings().then((next) => {
      if (!cancelled) setSettings(next);
    }).catch(() => undefined).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [nonce]);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const value = useMemo(() => ({
    settings,
    loading,
    refresh
  }), [settings, loading, refresh]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider');
  return context;
}