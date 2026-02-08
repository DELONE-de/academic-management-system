// src/middleware/auth.middleware.ts

import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../types/index.js';
import { extractToken, verifyToken } from '../config/jwt.js';
import { sendUnauthorized, sendForbidden } from '../utils/response.js';
import { prisma } from '../config/database.js';

/**
 * Authentication middleware - verifies JWT token
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      sendUnauthorized(res, 'No authentication token provided');
      return;
    }

    const payload = verifyToken(token);

    if (!payload) {
      sendUnauthorized(res, 'Invalid or expired token');
      return;
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
        departmentId: true,
        facultyId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      sendUnauthorized(res, 'User not found or inactive');
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      facultyId: user.facultyId,
    };

    next();
  } catch (error) {
    sendUnauthorized(res, 'Authentication failed');
  }
}

/**
 * Authorization middleware factory - checks user role
 * @param allowedRoles - Array of roles allowed to access the route
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Not authenticated');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendForbidden(res, 'You do not have permission to access this resource');
      return;
    }

    next();
  };
}

/**
 * Department access middleware - ensures HOD can only access their department
 */
export function restrictToDepartment(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendUnauthorized(res, 'Not authenticated');
    return;
  }

  // DEAN can access all departments in their faculty
  if (req.user.role === UserRole.DEAN) {
    next();
    return;
  }

  // HOD can only access their own department
  const requestedDepartmentId = req.params.departmentId || req.body.departmentId;

  if (req.user.role === UserRole.HOD && requestedDepartmentId) {
    if (req.user.departmentId !== requestedDepartmentId) {
      sendForbidden(res, 'You can only access your own department');
      return;
    }
  }

  next();
}

/**
 * Faculty access middleware - ensures DEAN can only access their faculty
 */
export async function restrictToFaculty(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    sendUnauthorized(res, 'Not authenticated');
    return;
  }

  if (req.user.role !== UserRole.DEAN) {
    next();
    return;
  }

  // Check if the department belongs to the dean's faculty
  const departmentId = req.params.departmentId || req.body.departmentId;

  if (departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { facultyId: true },
    });

    if (!department || department.facultyId !== req.user.facultyId) {
      sendForbidden(res, 'You can only access departments in your faculty');
      return;
    }
  }

  next();
}