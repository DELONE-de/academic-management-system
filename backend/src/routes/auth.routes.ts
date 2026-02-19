// src/routes/auth.routes.ts

import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';
import { z } from 'zod';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', validateBody(loginSchema), authController.login);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (admin use)
 * @access  Public (should be protected in production)
 */
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/signup', validateBody(registerSchema), authController.register);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validateBody(
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    })
  ),
  authController.changePassword
);

export default router;