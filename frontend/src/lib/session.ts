// FILE: frontend/src/lib/session.ts
// Session persistence for header-based (Bearer) JWT auth.
//
// TOKEN STORAGE — known XSS tradeoff, used deliberately:
// The JWT is stored in localStorage under a single dedicated key. This is a
// conscious acceptance of the XSS risk documented in the repo's own
// PRODUCTION_AUDIT_REPORT.md (finding H2). Access is deliberately narrow:
// getToken/setToken/clearToken are used ONLY by lib/api.ts's request
// interceptor (and AuthContext for login/clear) — no other code touches it.
//
// Only a whitelisted subset of non-sensitive user display data (id, name,
// email, role, department/faculty ids) is cached separately for UI hydration
// on page reload.

const USER_KEY = 'user';
const TOKEN_KEY = 'auth_token';

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

// ============================================================
// TOKEN STORAGE — dedicated key, used only via these three helpers
// (consumed by lib/api.ts's request interceptor)
// ============================================================

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

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable — ignore
  }
}

// ============================================================
// USER CACHE (non-sensitive display data only)
// ============================================================

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
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable — ignore
  }
}
