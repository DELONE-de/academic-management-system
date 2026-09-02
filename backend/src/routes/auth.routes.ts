// src/routes/auth.routes.ts

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const router = Router();

// Brute-force protection on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many account creation attempts, please try again later' },
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', loginLimiter, validateBody(loginSchema), authController.login);

/**
 * @route   GET /api/auth/bootstrap-status
 * @desc    Check whether the system has an initial administrator
 * @access  Public
 */
router.get('/bootstrap-status', authController.bootstrapStatus);

/**
 * @route   POST /api/auth/bootstrap
 * @desc    Create the very first administrator (only when system has no users)
 * @access  Public — safe because it only works on an empty user table
 */
router.post('/bootstrap', registerLimiter, authController.bootstrap);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (DEAN only)
 * @access  Private — only DEAN can create new accounts
 */
router.post('/register', registerLimiter, authenticate, authorize(UserRole.DEAN), validateBody(registerSchema), authController.register);

/**
 * @route   POST /api/auth/signup (alias — protected)
 * @desc    Alias for register, same protection
 * @access  Private — only DEAN can create new accounts
 */
router.post('/signup', registerLimiter, authenticate, authorize(UserRole.DEAN), validateBody(registerSchema), authController.register);

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