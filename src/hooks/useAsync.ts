import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../services/http';
import { handleUnauthorized } from '../services/session';

export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) handleUnauthorized();
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Loads once per dependency change and exposes reload for the error state's retry action. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> & {reload: () => void;} {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    loaderRef.
    current().
    then((data) => {
      if (!cancelled) setState({ data, loading: false, error: null });
    }).
    catch((error) => {
      if (!cancelled) setState({ data: null, loading: false, error: errorMessage(error) });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}