// src/config/cookies.ts
// Centralized cookie configuration for authentication.

export const AUTH_COOKIE_NAME = 'acadmind_token';

const isProduction = process.env.NODE_ENV === 'production';

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
 * - sameSite: 'lax' — appropriate for a same-site deployment (the common case).
 * - secure: only in production.
 */
export function authCookieOptions(maxAgeMs?: number): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: maxAgeMs ?? getTokenMaxAgeMs(),
    path: '/',
  };
}
