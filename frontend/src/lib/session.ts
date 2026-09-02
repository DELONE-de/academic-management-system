// FILE: frontend/src/lib/session.ts
// Centralized session/token handling. The backend currently issues a Bearer JWT
// that the client stores. Keeping this in one module makes a future migration to
// HttpOnly cookies a single-point change.

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable — ignore
  }
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
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // storage unavailable — ignore
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // storage unavailable — ignore
  }
}
