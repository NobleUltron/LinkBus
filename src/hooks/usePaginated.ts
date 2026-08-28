import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Paginated } from '../types/api';
import { errorMessage } from './useAsync';

export interface PaginatedState<T> {
  rows: T[];
  meta: Paginated<T>['meta'];
  loading: boolean;
  searching: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  perPage: number;
  setPerPage: (size: number) => void;
  search: string;
  setSearch: (value: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  reload: () => void;
  activeFilterCount: number;
}

const EMPTY_META = { total: 0, per_page: 10, current_page: 1, last_page: 1 };

/**
 * Search + filter + pagination against a Laravel-shaped paginate() response.
 * Every management screen shares this so the behaviour is identical everywhere.
 */
export function usePaginated<T>(
  loader: (args: { page: number; perPage: number; search: string; filters: Record<string, string> }) => Promise<Paginated<T>>,
  options: { perPage?: number; initialFilters?: Record<string, string> } = {},
): PaginatedState<T> {
  const [perPage, setPerPageState] = useState(options.perPage ?? 15);
  const [page, setPage] = useState(1);
  const [search, setSearchValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(options.initialFilters ?? {});
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (search !== debounced) {
      setSearching(true);
    }
    const timer = window.setTimeout(() => {
      setDebounced(search);
      setSearching(false);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [search, debounced]);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loaderRef
      .current({ page, perPage, search: debounced, filters })
      .then((response) => {
        if (cancelled) return;
        setRows(response.data);
        setMeta(response.meta);
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setMeta(EMPTY_META);
        setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, debounced, filterKey, nonce]);

  const setPageWithScroll = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setPerPage = useCallback((newSize: number) => {
    setPage(1);
    setPerPageState(newSize);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setPage(1);
    setFilters((current) => {
      const next = { ...current };
      if (!value) delete next[key];
      else next[key] = value;
      return next;
    });
  }, []);

  const setSearch = useCallback((value: string) => {
    setPage(1);
    setSearchValue(value);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchValue('');
    setPage(1);
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return useMemo(
    () => ({
      rows,
      meta,
      loading,
      searching,
      error,
      page,
      setPage: setPageWithScroll,
      perPage,
      setPerPage,
      search,
      setSearch,
      filters,
      setFilter,
      clearFilters,
      reload,
      activeFilterCount: Object.keys(filters).length + (search.trim() ? 1 : 0),
    }),
    [rows, meta, loading, searching, error, page, perPage, search, filters, setPageWithScroll, setPerPage, setFilter, setSearch, clearFilters, reload],
  );
}