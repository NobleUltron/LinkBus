import type { User } from '../types/models';
import { api, ApiRequestError, getToken, removeToken, setToken } from './api-client';

export { ApiRequestError };

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface TwoFactorChallengeResponse {
  requires_2fa: true;
  challenge_token: string;
  email_masked: string;
  phone_masked?: string | null;
  message: string;
}

export type LoginResult = ({ requires_2fa: false } & AuthResponse) | TwoFactorChallengeResponse;

const USER_KEY = 'linkbus_user';

// ─── Demo accounts (convenience for the login page) ──────────────────────────
export const demoAccounts = [
  { label: 'Administrator', email: 'admin@linkbus.co.ug',       role: 'admin'     as const },
  { label: 'Counter staff', email: 'staff@linkbus.co.ug',       role: 'staff'     as const },
  { label: 'Driver',        email: 'john.okello@linkbus.co.ug', role: 'driver'    as const },
  { label: 'Passenger',     email: 'passenger@linkbus.co.ug',   role: 'passenger' as const },
];

// ─── Session helpers ──────────────────────────────────────────────────────────

export function readStoredSession(): { token: string | null; user: User | null } {
  try {
    const token = getToken();
    const raw = localStorage.getItem(USER_KEY);
    return { token, user: raw ? (JSON.parse(raw) as User) : null };
  } catch {
    return { token: null, user: null };
  }
}

export function persistSession(token: string, user: User): void {
  setToken(token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  removeToken();
  localStorage.removeItem(USER_KEY);
}

// ─── API calls ────────────────────────────────────────────────────────────────

interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  role: string;
  role_name: string;
  driver_id: number | null;
  driver?: {
    id: number;
    user_id: number;
    license_number: string;
    license_expiry: string;
    status: 'active' | 'suspended' | 'on_leave';
    experience_years: number;
    notes: string;
  } | null;
  two_factor_enabled?: boolean;
}

interface ApiAuthResponse {
  user?: ApiUser;
  token?: string;
  requires_2fa?: boolean;
  challenge_token?: string;
  email_masked?: string;
  phone_masked?: string | null;
  message?: string;
}

function mapApiUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone ?? '',
    avatar: apiUser.avatar,
    role_id: 0,
    role: apiUser.role as User['role'],
    role_name: apiUser.role_name,
    is_driver: apiUser.role === 'driver',
    driver_id: apiUser.driver_id,
    driver: apiUser.driver
      ? {
          id: apiUser.driver.id,
          user_id: apiUser.id,
          license_number: apiUser.driver.license_number,
          license_expiry: apiUser.driver.license_expiry,
          status: apiUser.driver.status,
          experience_years: apiUser.driver.experience_years,
          notes: apiUser.driver.notes,
        }
      : null,
    two_factor_enabled: Boolean(apiUser.two_factor_enabled),
    created_at: new Date().toISOString(),
  };
}

/** POST /api/auth/login */
export async function login({ email, password }: Credentials): Promise<LoginResult> {
  const data = await api.post<ApiAuthResponse>('/auth/login', { email, password });

  if (data.requires_2fa && data.challenge_token) {
    return {
      requires_2fa: true,
      challenge_token: data.challenge_token,
      email_masked: data.email_masked ?? email,
      phone_masked: data.phone_masked,
      message: data.message ?? 'Two-Factor code required',
    };
  }

  if (!data.user || !data.token) {
    throw new Error('Invalid login response from server.');
  }

  return {
    requires_2fa: false,
    user: mapApiUser(data.user),
    token: data.token,
  };
}

/** POST /api/auth/2fa/verify */
export async function verifyTwoFactor(challenge_token: string, code: string): Promise<AuthResponse> {
  const data = await api.post<{ user: ApiUser; token: string }>('/auth/2fa/verify', {
    challenge_token,
    code,
  });
  return {
    user: mapApiUser(data.user),
    token: data.token,
  };
}

/** POST /api/auth/2fa/resend */
export async function resendTwoFactor(challenge_token: string): Promise<{ success: boolean; message: string }> {
  return api.post('/auth/2fa/resend', { challenge_token });
}

/** POST /api/auth/2fa/toggle */
export async function toggleTwoFactor(enable: boolean): Promise<{
  success: boolean;
  two_factor_enabled: boolean;
  message: string;
  user: User;
}> {
  const data = await api.post<{
    success: boolean;
    two_factor_enabled: boolean;
    message: string;
    user: ApiUser;
  }>('/auth/2fa/toggle', { enable });

  return {
    ...data,
    user: mapApiUser(data.user),
  };
}

/** POST /api/auth/register */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const data = await api.post<{ user: ApiUser; token: string }>('/auth/register', {
    ...payload,
    password_confirmation: payload.password_confirmation ?? payload.password,
  });
  return { user: mapApiUser(data.user), token: data.token };
}

/** GET /api/auth/me */
export async function fetchCurrentUser(_token: string): Promise<User> {
  const data = await api.get<{ user: ApiUser }>('/auth/me');
  return mapApiUser(data.user);
}

/** POST /api/auth/logout */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore errors — token may already be invalid
  }
}

/** PUT /api/auth/profile */
export async function updateProfile(
  _userId: number,
  payload: {
    name: string;
    email?: string;
    phone: string;
    avatar?: string | null;
    license_number?: string;
    license_expiry?: string;
    experience_years?: number;
    driver_notes?: string;
  },
): Promise<User> {
  const data = await api.put<{ user: ApiUser }>('/auth/profile', payload);
  return mapApiUser(data.user);
}

/** PUT /api/auth/change-password */
export async function changePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  return api.put<{ message: string }>('/auth/change-password', payload);
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  challenge_token: string;
  email_masked: string;
  phone_masked?: string | null;
}

/** POST /api/auth/forgot-password */
export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return api.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
  password_confirmation: string;
}

/** POST /api/auth/reset-password */
export async function resetPassword(payload: ResetPasswordPayload): Promise<AuthResponse> {
  const data = await api.post<{ user: ApiUser; token: string }>('/auth/reset-password', payload);
  return { user: mapApiUser(data.user), token: data.token };
}

/** POST /api/auth/social-login */
export async function socialLogin(payload: {
  email: string;
  name: string;
  provider?: string;
}): Promise<AuthResponse> {
  const data = await api.post<{ user: ApiUser; token: string }>('/auth/social-login', payload);
  return { user: mapApiUser(data.user), token: data.token };
}

/**
 * POST /api/auth/google
 * Validates Google ID Token on Laravel backend & issues local Sanctum session token.
 */
export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const data = await api.post<{ user: ApiUser; token: string }>('/auth/google', {
    credential,
  });
  return { user: mapApiUser(data.user), token: data.token };
}


// ─── Remember Me Helpers ───────────────────────────────────────────────────
const REMEMBERED_EMAIL_KEY = 'linkbus_remembered_email';

export function getRememberedEmail(): string {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setRememberedEmail(email: string, remember: boolean): void {
  try {
    if (remember && email.trim()) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}