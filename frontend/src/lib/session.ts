// FILE: frontend/src/lib/session.ts
// Session persistence. The JWT token is stored in an HttpOnly cookie and is
// never accessible to JavaScript — no token is ever written to localStorage.
// Only a whitelisted subset of non-sensitive user display data (id, name,
// email, role, department/faculty ids) is cached in localStorage for UI
// hydration on page reload.
//
// CSRF: on a cross-origin deployment (Vercel frontend → Render backend) the
// backend's csrf-token cookie is set for the backend domain, which the frontend
// cannot read via document.cookie. The backend therefore also returns the token
// in the X-CSRF-Token response header; we keep it in memory here.

const USER_KEY = 'user';
const CSRF_COOKIE = 'csrf-token';

let inMemoryCsrfToken: string | null = null;

/**
 * The exact fields we are allowed to cache locally. Anything else on the user
 * object returned by the backend (e.g. password hashes, timestamps, relations)
 * is stripped before it touches localStorage.
 */
function sanitizeUser(user: unknown): Record<string, unknown> | null {
  if (!user || typeof user !== 'object') return null;
  const u = user as Record<string, unknown>;
  const pick = (key: string): unknown => {
    const value = u[key];
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object') {
      // Keep only display-relevant bits of department/faculty relations
      const rel = value as Record<string, unknown>;
      return {
        id: rel.id,
        name: rel.name,
        code: rel.code,
      };
    }
    return value;
  };
  const sanitized: Record<string, unknown> = {
    id: pick('id'),
    email: pick('email'),
    firstName: pick('firstName'),
    lastName: pick('lastName'),
    role: pick('role'),
    departmentId: pick('departmentId'),
    facultyId: pick('facultyId'),
    department: pick('department'),
    faculty: pick('faculty'),
  };
  return Object.fromEntries(Object.entries(sanitized).filter(([, v]) => v !== undefined));
}

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
    const sanitized = sanitizeUser(user);
    if (sanitized) {
      localStorage.setItem(USER_KEY, JSON.stringify(sanitized));
    }
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
