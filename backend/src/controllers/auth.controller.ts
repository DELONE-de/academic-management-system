// src/controllers/auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';
import { AUTH_COOKIE_NAME, authCookieOptions, getTokenMaxAgeMs } from '../config/cookies.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      // Set HttpOnly cookie — this is the primary auth mechanism for browsers.
      // The token is also returned in the body for backward compatibility with
      // API clients and integration tests that use the Authorization header.
      res.cookie(
        AUTH_COOKIE_NAME,
        result.token,
        authCookieOptions(getTokenMaxAgeMs())
      );
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.register(req.body);
      sendCreated(res, user, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  async bootstrapStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await authService.getBootstrapStatus();
      sendSuccess(res, status, 'Bootstrap status retrieved');
    } catch (error) {
      next(error);
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