// FILE: frontend/src/lib/errors.ts
// Centralized frontend error handling — maps backend error codes to user-friendly
// messages so pages never expose raw exceptions or stack traces.

import { AxiosError } from 'axios';

export type ApiErrorKind =
  | 'auth'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'rate-limit'
  | 'server'
  | 'network'
  | 'unknown';

export interface FriendlyError {
  kind: ApiErrorKind;
  message: string;
  status?: number;
}

const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
  auth: 'Your session has expired. Please sign in again.',
  forbidden: "You don't have permission to access this resource.",
  'not-found': 'The requested resource was not found.',
  validation: 'The information you provided is invalid. Please check and try again.',
  'rate-limit': 'Too many requests. Please wait a moment and try again.',
  server: 'Something went wrong on our end. Please try again shortly.',
  network: 'Network error. Please check your connection and try again.',
  unknown: 'An unexpected error occurred. Please try again.',
};

/**
 * Converts an Axios error (or any thrown value) into a friendly, safe message.
 */
export function toFriendlyError(error: unknown, fallback?: string): FriendlyError {
  const axiosError = error as AxiosError<{ message?: string }>;

  if (!axiosError || !axiosError.isAxiosError) {
    return { kind: 'unknown', message: fallback || DEFAULT_MESSAGES.unknown };
  }

  if (axiosError.response) {
    const status = axiosError.response.status;
    const backendMessage = axiosError.response.data?.message;

    let kind: ApiErrorKind;
    switch (status) {
      case 401:
        kind = 'auth';
        break;
      case 403:
        kind = 'forbidden';
        break;
      case 404:
        kind = 'not-found';
        break;
      case 400:
      case 422:
        kind = 'validation';
        break;
      case 429:
        kind = 'rate-limit';
        break;
      default:
        if (status >= 500) kind = 'server';
        else kind = 'unknown';
    }

    // Prefer the backend's message only for validation errors where it is helpful;
    // for auth/forbidden/server use friendly defaults (never raw stack traces).
    const useBackendMessage =
      (kind === 'validation' || kind === 'rate-limit') && backendMessage;

    return {
      kind,
      status,
      message: useBackendMessage ? backendMessage : DEFAULT_MESSAGES[kind],
    };
  }

  // No response — network failure or request aborted
  return { kind: 'network', message: DEFAULT_MESSAGES.network };
}

/**
 * Convenience: get the user-friendly message for an error.
 */
export function friendlyMessage(error: unknown, fallback?: string): string {
  return toFriendlyError(error, fallback).message;
}
