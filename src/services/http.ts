/**
 * http.ts — backward-compatibility shim.
 * All real functionality lives in api-client.ts.
 * Components that still import from ./http will continue to work.
 */
export { ApiRequestError, clone, matches } from './api-client';
export type { Paginated } from './api-client';

/** Pagination helper used by admin list views. */
export function paginate<T>(rows: T[], page = 1, perPage = 10): import('./api-client').Paginated<T> {
  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), lastPage);
  return {
    data: rows.slice((current - 1) * perPage, current * perPage),
    meta: { total, per_page: perPage, current_page: current, last_page: lastPage },
  };
}

/** Legacy shim for mock async calls */
export function respond<T>(producer: () => T, _latency = 100): Promise<T> {
  return Promise.resolve().then(producer);
}