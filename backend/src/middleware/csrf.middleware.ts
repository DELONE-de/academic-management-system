// src/middleware/csrf.middleware.ts
// CSRF protection for cookie-authenticated requests.
// The backend sets a non-HttpOnly csrf-token cookie on each response.
// State-changing requests (POST/PUT/PATCH/DELETE) must include a matching
// X-CSRF-Token header. SameSite=Lax on the auth cookie already prevents
// cross-site POST requests; this is defense-in-depth.

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { sendForbidden } from '../utils/response.js';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_COOKIE = 'acadmind_token';

const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/bootstrap',
  '/api/auth/bootstrap-status',
]);

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE]) {
    setCsrfCookie(res);
  }

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

function setCsrfCookie(res: Response): void {
  const token = randomUUID();
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,       // readable by JavaScript for the frontend to send back
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  });
}