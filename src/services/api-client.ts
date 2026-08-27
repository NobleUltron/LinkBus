/**
 * Real HTTP client for the LinkBus Laravel API.
 * Replaces the in-memory `respond()` mock with actual fetch calls.
 */

import { handleUnauthorized } from './session';

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? '/api';
}

export const API_BASE = getApiBaseUrl();

const TOKEN_KEY = 'linkbus_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiRequestError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status = 422, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors;
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, body, ...init } = options;

  const base = getApiBaseUrl();
  let url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;

  if (params) {
    let effectiveParams = params;
    if (effectiveParams && typeof effectiveParams === 'object' && 'params' in effectiveParams && typeof (effectiveParams as any).params === 'object') {
      effectiveParams = (effectiveParams as any).params;
    }

    const searchParams = new URLSearchParams();
    Object.entries(effectiveParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    if (response.status === 401 && token && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/2fa')) {
      handleUnauthorized();
    }
    const errData = data as { message?: string; errors?: Record<string, string[]> };
    throw new ApiRequestError(
      errData.message ?? `HTTP Error ${response.status}`,
      response.status,
      errData.errors,
    );
  }

  return data as T;
}

// ─── HTTP method helpers ──────────────────────────────────────────────────────

export const api = {
  get<T>(endpoint: string, params?: FetchOptions['params']): Promise<T> {
    return apiFetch<T>(endpoint, { method: 'GET', params });
  },

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return apiFetch<T>(endpoint, { method: 'POST', body });
  },

  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return apiFetch<T>(endpoint, { method: 'PUT', body });
  },

  patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return apiFetch<T>(endpoint, { method: 'PATCH', body });
  },

  delete<T>(endpoint: string): Promise<T> {
    return apiFetch<T>(endpoint, { method: 'DELETE' });
  },

  async download(endpoint: string, params?: FetchOptions['params'], fallbackFilename = 'download.xlsx'): Promise<string> {
    const base = getApiBaseUrl();
    let url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, application/json, */*',
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
      }
      let errMsg = `HTTP Error ${response.status}`;
      try {
        const errJson = await response.json();
        errMsg = errJson.message ?? errMsg;
      } catch {
        try {
          const errText = await response.text();
          if (errText) errMsg = errText;
        } catch {
          // ignore
        }
      }
      throw new ApiRequestError(errMsg, response.status);
    }

    // Extract filename from Content-Disposition header if present
    let filename = fallbackFilename;
    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].trim());
      }
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    return filename;
  },
};

// ─── Legacy compatibility helpers ────────────────────────────────────────────

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function matches(
  haystack: (string | number | null | undefined)[],
  needle: string,
): boolean {
  if (!needle.trim()) return true;
  const q = needle.trim().toLowerCase();
  return haystack.some((value) => String(value ?? '').toLowerCase().includes(q));
}
