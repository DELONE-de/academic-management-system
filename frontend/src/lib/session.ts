// FILE: frontend/src/lib/session.ts
// Session persistence. The JWT token is stored in an HttpOnly cookie and is
// never accessible to JavaScript. Only the non-sensitive user profile is
// cached in localStorage for hydration on page reload.

const USER_KEY = 'user';

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
