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
   * Registers a new user (admin only in production)
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

    // Validate role-specific requirements
    if (role === 'HOD' && !departmentId) {
      throw new AppError('Department ID is required for HOD role', 400);
    }

    if (role === 'DEAN' && !facultyId) {
      throw new AppError('Faculty ID is required for DEAN role', 400);
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
        departmentId: role === 'HOD' ? departmentId : null,
        facultyId: role === 'DEAN' ? facultyId : null,
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