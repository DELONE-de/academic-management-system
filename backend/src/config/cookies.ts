// src/config/cookies.ts
// Centralized cookie configuration for authentication.

export const AUTH_COOKIE_NAME = 'acadmind_token';

const isProduction = process.env.NODE_ENV === 'production';

// SameSite for a cross-origin deployment (Vercel frontend → Render backend):
// `None` is required so the browser sends the cookie on credentialed cross-origin
// requests. In development (localhost frontend/backend are same-site) `Lax` is safer.
function resolveSameSite(): 'lax' | 'none' {
  if (process.env.COOKIE_SAMESITE) {
    const v = process.env.COOKIE_SAMESITE.toLowerCase();
    if (v === 'none' || v === 'lax') return v;
  }
  return isProduction ? 'none' : 'lax';
}

/**
 * Parse a JWT expires-in value (e.g. "7d", "12h", "30m", "90s") into milliseconds.
 * Defaults to 7 days when unparseable.
 */
export function getTokenMaxAgeMs(expiresIn?: string): number {
  const raw = (expiresIn || process.env.JWT_EXPIRES_IN || '7d').trim();
  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

/**
 * Options for the authentication cookie.
 * - httpOnly: the token is never readable from JavaScript.
 * - secure: true in production (HTTPS).
 * - sameSite: 'none' in production (cross-origin Vercel→Render); 'lax' in dev.
 */
export function authCookieOptions(maxAgeMs?: number): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'none';
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: resolveSameSite(),
    maxAge: maxAgeMs ?? getTokenMaxAgeMs(),
    path: '/',
  };
}
