// src/hooks/useFetch.ts

'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic data-fetching hook.
 *
 * `fetchFn` should return `{ data, error }` (the shape produced by the
 * centralized API client) so callers can distinguish "no data yet" from
 * "data failed to load".
 */
export function useFetch<T>(
  fetchFn: () => Promise<{ data?: T; error?: string }>,
  dependencies: any[] = []
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchFn();

      if (response.data !== undefined) {
        setData(response.data as T);
      } else {
        setError(response.error || 'An error occurred');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, fetch]);

  return { data, isLoading, error, refetch: fetch };
}