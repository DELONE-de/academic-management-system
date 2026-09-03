// FILE: frontend/src/lib/session.ts
// Session persistence. The JWT token is stored in an HttpOnly cookie and is
// never accessible to JavaScript. Only the non-sensitive user profile is
// cached in localStorage for hydration on page reload.
//
// CSRF: on a cross-origin deployment (Vercel frontend → Render backend) the
// backend's csrf-token cookie is set for the backend domain, which the frontend
// cannot read via document.cookie. The backend therefore also returns the token
// in the X-CSRF-Token response header; we keep it in memory here.

const USER_KEY = 'user';
const CSRF_COOKIE = 'csrf-token';

let inMemoryCsrfToken: string | null = null;

export function getStoredUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // storage unavailable — ignore
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // storage unavailable — ignore
  }
}

/**
 * Store the CSRF token received from the backend (via the X-CSRF-Token header
 * or, on same-origin setups, the csrf-token cookie).
 */
export function setCsrfToken(token: string | null): void {
  inMemoryCsrfToken = token;
}

/**
 * Reads the CSRF token: first from the in-memory value captured from the
 * backend response header (cross-origin), falling back to the non-HttpOnly
 * csrf-token cookie (same-origin dev).
 */
export function getCsrfToken(): string | null {
  if (inMemoryCsrfToken) return inMemoryCsrfToken;
  if (typeof window === 'undefined') return null;
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${CSRF_COOKIE}=`));
    return match ? decodeURIComponent(match.split('=')[1]) : null;
  } catch {
    return null;
  }
}