// src/hooks/useFetch.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFetch<T>(
  fetchFn: () => Promise<{ success: boolean; data?: T; message?: string }>,
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
      
      if (response.success) {
        setData(response.data || null);
      } else {
        setError(response.message || 'An error occurred');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'An error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetch();
  }, [...dependencies, fetch]);

  return { data, isLoading, error, refetch: fetch };
}