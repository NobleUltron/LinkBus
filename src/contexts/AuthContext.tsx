import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { RoleSlug, User } from '../types/models';
import { clearSession, fetchCurrentUser, login as loginRequest, logout as logoutRequest, persistSession, readStoredSession, register as registerRequest } from '../services/auth';
import { registerUnauthorizedHandler } from '../services/session';

/** Written synchronously on intentional logout so ProtectedRoute can suppress the `from` state. */
export const INTENTIONAL_LOGOUT_KEY = 'lb_intentional_logout';
interface AuthContextValue {
  user: User | null;
  token: string | null;
  booting: boolean;
  login: (email: string, password: string) => Promise<User>;
  completeSession: (token: string, user: User) => void;
  register: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<User>;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isDriver: boolean;
  isPassenger: boolean;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function landingPathForRole(role: RoleSlug): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'staff') return '/staff/dashboard';
  if (role === 'driver') return '/driver';
  return '/passenger/dashboard';
}

export function getSafeRedirectPath(from: string | undefined | null, role: RoleSlug): string {
  const defaultPath = landingPathForRole(role);
  if (!from || from === '/login' || from === '/' || from === '/register') {
    return defaultPath;
  }

  // Prevent cross-role redirect traps (e.g. driver redirected to passenger dashboard)
  if (from.startsWith('/admin') && role !== 'admin') return defaultPath;
  if (from.startsWith('/staff') && role !== 'staff' && role !== 'admin') return defaultPath;
  if (from.startsWith('/driver') && role !== 'driver' && role !== 'admin') return defaultPath;
  if (from.startsWith('/passenger') && role !== 'passenger' && role !== 'admin') return defaultPath;

  return from;
}
export function AuthProvider({
  children


}: {children: React.ReactNode;}) {
  const stored = readStoredSession();
  const [user, setUser] = useState<User | null>(stored.user);
  const [token, setToken] = useState<string | null>(stored.token);
  const [booting, setBooting] = useState<boolean>(Boolean(stored.token));

  // Verify the persisted token on load, exactly like GET /api/auth/user does.
  useEffect(() => {
    if (!stored.token) {
      setBooting(false);
      return;
    }
    let cancelled = false;
    fetchCurrentUser(stored.token).then((verified) => {
      if (cancelled) return;
      setUser(verified);
      persistSession(stored.token!, verified);
    }).catch(() => {
      if (cancelled) return;
      clearSession();
      setUser(null);
      setToken(null);
    }).finally(() => {
      if (!cancelled) setBooting(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const logout = useCallback(() => {
    // Stamp the flag BEFORE clearing state so ProtectedRoute reads it on the next render
    // and knows NOT to save `from` — distinguishing intentional logout from session expiry.
    sessionStorage.setItem(INTENTIONAL_LOGOUT_KEY, '1');
    logoutRequest().catch(() => undefined);
    clearSession();
    setUser(null);
    setToken(null);
  }, []);

  // Global 401 handling — the equivalent of the axios response interceptor.
  useEffect(() => registerUnauthorizedHandler(logout), [logout]);
  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest({
      email,
      password
    });
    if (data.requires_2fa) {
      throw new Error('2FA_REQUIRED');
    }
    persistSession(data.token, data.user);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  }, []);
  const completeSession = useCallback((newToken: string, newUser: User) => {
    persistSession(newToken, newUser);
    setUser(newUser);
    setToken(newToken);
  }, []);
  const register = useCallback(async (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const response = await registerRequest(payload);
    persistSession(response.token, response.user);
    setUser(response.user);
    setToken(response.token);
    return response.user;
  }, []);
  const updateUser = useCallback((next: User) => {
    setUser(next);
    if (token) persistSession(token, next);
  }, [token]);
  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    booting,
    login,
    completeSession,
    register,
    logout,
    updateUser,
    isAuthenticated: Boolean(user && token),
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff',
    isDriver: user?.role === 'driver',
    isPassenger: user?.role === 'passenger'
  }), [user, token, booting, login, completeSession, register, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}