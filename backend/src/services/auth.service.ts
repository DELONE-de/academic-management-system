// src/services/auth.service.ts

import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { generateToken } from '../config/jwt.js';
import { AppError } from '../middleware/error.middleware.js';
import { LoginInput, RegisterInput } from '../validators/auth.validator.js';

export class AuthService {
  /**
   * Authenticates a user and returns JWT token
   */
  async login(input: LoginInput): Promise<{ user: any; token: string }> {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        faculty: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      facultyId: user.facultyId,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Returns whether the system has been bootstrapped (has at least one user).
   */
  async getBootstrapStatus(): Promise<{ bootstrapped: boolean; userCount: number }> {
    const userCount = await prisma.user.count();
    return { bootstrapped: userCount > 0, userCount };
  }

  /**
   * Creates the very first administrator (DEAN) — only allowed when no users exist.
   * Prevents the chicken-and-egg problem of protected registration while keeping
   * public privilege escalation impossible once the system is in use.
   */
  async bootstrapFirstUser(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    facultyId?: string;
  }): Promise<any> {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      throw new AppError('System has already been initialized. Registration requires an administrator.', 403);
    }

    const { email, password, firstName, lastName, facultyId } = input;

    if (!facultyId) {
      throw new AppError('Faculty ID is required for the initial DEAN account', 400);
    }

    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
    if (!faculty) {
      throw new AppError('Faculty not found', 404);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Email already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'DEAN',
        facultyId,
      },
      include: {
        faculty: { select: { id: true, name: true, code: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPLOAD_PROCESSED' as any,
        entityType: 'user',
        entityId: user.id,
        actorId: user.id,
        meta: { event: 'bootstrap_first_user', role: user.role },
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Registers a new HOD or DEAN user (requires an authenticated DEAN caller)
   */
  async register(input: RegisterInput): Promise<any> {
    const { email, password, firstName, lastName, role, departmentId, facultyId } = input;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    if (role === 'HOD') {
      if (!departmentId) throw new AppError('Department ID is required for HOD role', 400);
      // Verify department exists
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) throw new AppError('Department not found', 404);
    }

    if (role === 'DEAN') {
      if (!facultyId) throw new AppError('Faculty ID is required for DEAN role', 400);
      // Verify faculty exists
      const faculty = await prisma.faculty.findUnique({
        where: { id: facultyId },
      });
      if (!faculty) throw new AppError('Faculty not found', 404);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        ...(role === 'HOD' ? { departmentId } : {}),
        ...(role === 'DEAN' ? { facultyId } : {}),
      },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        faculty: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Gets current user profile
   */
  async getProfile(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: {
          select: { id: true, name: true, code: true, facultyId: true },
        },
        faculty: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Changes user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}

export const authService = new AuthService();