// src/middleware/access.middleware.ts
// Centralized department/faculty/ownership scoping helpers.

import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../types/index.js';
import { prisma } from '../config/database.js';
import { sendForbidden, sendUnauthorized } from '../utils/response.js';

/**
 * Verifies that an HOD may only act on records within their own department.
 * DEAN may act on departments within their faculty.
 *
 * Returns the departmentId that the request is scoped to, or throws.
 */
export async function assertDepartmentAccess(
  req: AuthRequest,
  departmentId: string | null | undefined
): Promise<string | null> {
  if (!req.user) throw new Error('Not authenticated');

  // HOD — must match own department
  if (req.user.role === UserRole.HOD) {
    if (!departmentId || departmentId !== req.user.departmentId) {
      throw new Error('FORBIDDEN');
    }
    return departmentId;
  }

  // DEAN — must be a department in their faculty
  if (req.user.role === UserRole.DEAN) {
    if (!departmentId) return null;
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { facultyId: true },
    });
    if (!department || department.facultyId !== req.user.facultyId) {
      throw new Error('FORBIDDEN');
    }
    return departmentId;
  }

  // LECTURER / EXAMINATION_OFFICER — read access to their department only
  if (departmentId && departmentId !== req.user.departmentId) {
    throw new Error('FORBIDDEN');
  }
  return departmentId || null;
}

/**
 * Middleware variant of assertDepartmentAccess for route params.
 * Checks departmentId in params, body, or query.
 */
export function enforceDepartmentScope(
  paramName = 'departmentId'
): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void> {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res, 'Not authenticated');
        return;
      }
      const requested =
        req.params[paramName] ||
        req.body[paramName] ||
        (req.query[paramName] as string | undefined);
      await assertDepartmentAccess(req, requested);
      next();
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN') {
        sendForbidden(res, 'You can only access data within your department or faculty');
        return;
      }
      next(error);
    }
  };
}

/**
 * Verifies that a student belongs to a department the user can access.
 */
export async function assertStudentAccess(
  req: AuthRequest,
  studentId: string
): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { departmentId: true },
  });
  if (!student) throw new Error('NOT_FOUND');
  await assertDepartmentAccess(req, student.departmentId);
}

/**
 * Verifies that an upload job belongs to the user's department (or was uploaded by them).
 */
export async function assertUploadJobAccess(
  req: AuthRequest,
  jobId: string
): Promise<void> {
  const job = await prisma.uploadJob.findUnique({
    where: { id: jobId },
    select: { departmentId: true, uploadedById: true },
  });
  if (!job) throw new Error('NOT_FOUND');
  if (req.user!.role === UserRole.DEAN) {
    const department = await prisma.department.findUnique({
      where: { id: job.departmentId },
      select: { facultyId: true },
    });
    if (!department || department.facultyId !== req.user!.facultyId) {
      throw new Error('FORBIDDEN');
    }
    return;
  }
  if (req.user!.id !== job.uploadedById && req.user!.departmentId !== job.departmentId) {
    throw new Error('FORBIDDEN');
  }
}

/**
 * Verifies that a review item belongs to the user's department (or was uploaded by them).
 */
export async function assertReviewItemAccess(
  req: AuthRequest,
  itemId: string
): Promise<void> {
  const item = await prisma.reviewItem.findUnique({
    where: { id: itemId },
    select: { uploadJob: { select: { departmentId: true, uploadedById: true } } },
  });
  if (!item) throw new Error('NOT_FOUND');
  if (req.user!.role === UserRole.DEAN) {
    const department = await prisma.department.findUnique({
      where: { id: item.uploadJob.departmentId },
      select: { facultyId: true },
    });
    if (!department || department.facultyId !== req.user!.facultyId) {
      throw new Error('FORBIDDEN');
    }
    return;
  }
  if (
    req.user!.id !== item.uploadJob.uploadedById &&
    req.user!.departmentId !== item.uploadJob.departmentId
  ) {
    throw new Error('FORBIDDEN');
  }
}
