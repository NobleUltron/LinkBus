import type { Paginated } from '../types/api';
import { api, ApiRequestError } from './api-client';

export interface ResourceQuery {
  page?: number;
  perPage?: number;
  search?: string;
  filters?: Record<string, string>;
}

export interface ResourceApi<T> {
  list(query: ResourceQuery): Promise<Paginated<T>>;
  all(): Promise<T[]>;
  create(payload: Partial<T>): Promise<T>;
  update(id: number, payload: Partial<T>): Promise<T>;
  remove(id: number): Promise<void>;
}

/** Mapping table names to real Laravel API endpoint routes */
const ENDPOINTS: Record<string, string> = {
  buses: '/buses',
  drivers: '/drivers',
  terminals: '/terminals',
  routes: '/routes',
  roles: '/roles',
  users: '/admin/users',
  promoCodes: '/admin/promo-codes',
  advertisements: '/admin/advertisements',
};

export function makeResource<T extends { id: number }>(
  table: string,
  _searchFields: string[],
  blank: () => Omit<T, 'id'>,
): ResourceApi<T> {
  const endpoint = ENDPOINTS[table] ?? `/${table}`;

  return {
    async list(query) {
      try {
        const key = table === 'promoCodes' ? 'promo_codes' : table;
        const res = await api.get<Record<string, any>>(endpoint, {
          page: query.page,
          search: query.search,
          ...query.filters,
        });

        const items: T[] = res[key] ?? res[table] ?? res.data ?? (Array.isArray(res) ? res : []);
        const total = res.meta?.total ?? items.length;
        const current_page = res.meta?.current_page ?? 1;
        const last_page = res.meta?.last_page ?? 1;

        return {
          data: items,
          meta: { total, per_page: query.perPage ?? 20, current_page, last_page },
        };
      } catch {
        return { data: [], meta: { total: 0, per_page: 20, current_page: 1, last_page: 1 } };
      }
    },

    async all() {
      const res = await this.list({});
      return res.data;
    },

    async create(payload) {
      const body = { ...blank(), ...payload };
      const singularKey = table.endsWith('s') ? table.slice(0, -1) : table;
      const res = await api.post<Record<string, any>>(endpoint, body);
      return res[singularKey] ?? res.data ?? res;
    },

    async update(id, payload) {
      const singularKey = table.endsWith('s') ? table.slice(0, -1) : table;
      const res = await api.put<Record<string, any>>(`${endpoint}/${id}`, payload);
      return res[singularKey] ?? res.data ?? res;
    },

    async remove(id) {
      await api.delete(`${endpoint}/${id}`);
    },
  };
}