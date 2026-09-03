// src/controllers/auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';
import { AUTH_COOKIE_NAME, authCookieOptions, authCookieClearOptions, getTokenMaxAgeMs } from '../config/cookies.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await authService.login(req.body);
      // Set the HttpOnly auth cookie — the primary (and only browser) transport
      // for the token. The token is NEVER returned in the response body, so it
      // is never readable by JavaScript. API clients/tests use the cookie or
      // the documented Authorization header fallback.
      res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions(getTokenMaxAgeMs()));
      sendSuccess(res, { user }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Clear with the exact same name/path/sameSite/secure used when setting —
      // mismatched options are a common cause of stale surviving cookies.
      res.clearCookie(AUTH_COOKIE_NAME, authCookieClearOptions());
      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Issues a fresh CSRF token via the X-CSRF-Token response header.
   * The csrfProtection middleware (mounted before all /api routes) already
   * sets that header on every response — this endpoint simply exists so the
   * frontend has a canonical GET endpoint to call on boot.
   */
  async csrf(req: Request, res: Response): Promise<void> {
    sendSuccess(res, null, 'CSRF token issued');
  }

  async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.register(req.body);
      sendCreated(res, user, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  async bootstrapStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await authService.getBootstrapStatus();
      sendSuccess(res, status, 'Bootstrap status retrieved');
    } catch (error) {
      // This endpoint feeds the frontend's /signup redirect logic and must be
      // reliable: on a first-run database (migrations not yet applied) or any
      // transient failure, report "not bootstrapped" with 200 instead of 500.
      sendSuccess(res, { bootstrapped: false, userCount: 0, degraded: true }, 'Bootstrap status retrieved (degraded)');
    }
  }

  async bootstrap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.bootstrapFirstUser(req.body);
      sendCreated(res, user, 'Initial administrator created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.id);
      sendSuccess(res, user, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user!.id, currentPassword, newPassword);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();