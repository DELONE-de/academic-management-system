// src/controllers/auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await authService.login(req.body);
      // Header-based (Bearer) auth: the token is returned in the response body
      // and the client stores it, attaching it as an Authorization header on
      // every request. There is no server-side session.
      sendSuccess(res, { user, token }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Header-based JWT is stateless: the server holds no session to destroy.
      // The client discards its token; this endpoint exists for API
      // compatibility and simply acknowledges the logout.
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
