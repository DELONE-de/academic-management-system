// src/middleware/csrf.middleware.ts
// CSRF protection for cookie-authenticated requests.
// The backend sets a non-HttpOnly csrf-token cookie AND exposes the same token
// in the X-CSRF-Token response header so a cross-origin frontend (Vercel → Render)
// can read it and echo it back. State-changing requests (POST/PUT/PATCH/DELETE)
// must include a matching X-CSRF-Token header.

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { sendForbidden } from '../utils/response.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../config/cookies.js';

const CSRF_COOKIE = CSRF_COOKIE_NAME;
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_COOKIE = AUTH_COOKIE_NAME;

const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/bootstrap',
  '/api/auth/bootstrap-status',
]);

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Ensure the CSRF token exists (cookie + response header) on every request.
  const existing = req.cookies?.[CSRF_COOKIE];
  const token = existing && existing.length >= 16 ? existing : randomUUID();
  if (!existing || existing.length < 16) {
    setCsrfCookie(res, token);
  }
  // Expose the token to the frontend via a response header (readable cross-origin).
  res.setHeader('X-CSRF-Token', token);

  if (CSRF_EXEMPT_PATHS.has(req.baseUrl + req.path) || CSRF_EXEMPT_PATHS.has(req.originalUrl)) {
    next();
    return;
  }

  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Header-based (Bearer) auth is not CSRF-vulnerable
  if (req.headers.authorization?.startsWith('Bearer ')) {
    next();
    return;
  }

  // No auth cookie → no session to protect → skip CSRF (auth middleware will reject with 401)
  if (!req.cookies?.[AUTH_COOKIE]) {
    next();
    return;
  }

  const headerToken = req.headers[CSRF_HEADER] as string | undefined;
  const cookieToken = req.cookies?.[CSRF_COOKIE];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    sendForbidden(res, 'Invalid or missing CSRF token');
    return;
  }

  next();
}

function setCsrfCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,       // readable by JavaScript for the frontend to send back
    secure: isProduction,
    // None in production so the cookie is sent on cross-origin (Vercel→Render)
    // credentialed requests; Lax in development (same-site localhost).
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/',
  });
}