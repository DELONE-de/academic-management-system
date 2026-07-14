// FILE: backend/src/routes/approval.routes.ts

import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { prisma } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import { UserRole, ApprovalStatus, Level, Semester } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Role → next status map
const NEXT_STATUS: Partial<Record<UserRole, ApprovalStatus>> = {
  [UserRole.EXAMINATION_OFFICER]: ApprovalStatus.APPROVED_BY_EXAM_OFFICER,
  [UserRole.HOD]: ApprovalStatus.APPROVED_BY_HOD,
  [UserRole.DEAN]: ApprovalStatus.APPROVED_BY_DEAN,
};

/**
 * GET /api/approval
 * List batches visible to the current user's role
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (req.user!.role === UserRole.HOD) where.departmentId = req.user!.departmentId!;

  const batches = await prisma.resultBatch.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      department: { select: { name: true, code: true } },
      submittedBy: { select: { firstName: true, lastName: true, role: true } },
      approvals: {
        orderBy: { createdAt: 'asc' },
        include: { approver: { select: { firstName: true, lastName: true, role: true } } },
      },
    },
  });

  res.json({ success: true, data: batches });
});

/**
 * POST /api/approval
 * Lecturer or HOD submits a new result batch for approval
 */
router.post(
  '/',
  authorize(UserRole.LECTURER, UserRole.HOD, UserRole.EXAMINATION_OFFICER),
  async (req: AuthRequest, res: Response) => {
    const { departmentId, level, semester, academicYear } = req.body as {
      departmentId: string;
      level: Level;
      semester: Semester;
      academicYear: string;
    };

    if (!departmentId || !level || !semester || !academicYear) {
      res.status(400).json({ success: false, message: 'departmentId, level, semester, academicYear are required' });
      return;
    }

    // Prevent duplicate open batches
    const existing = await prisma.resultBatch.findFirst({
      where: {
        departmentId,
        level,
        semester,
        academicYear,
        status: { notIn: [ApprovalStatus.REJECTED, ApprovalStatus.PUBLISHED] },
      },
    });

    if (existing) {
      res.status(409).json({ success: false, message: 'An active batch already exists for this period', data: existing });
      return;
    }

    const batch = await prisma.resultBatch.create({
      data: {
        departmentId,
        level,
        semester,
        academicYear,
        status: ApprovalStatus.SUBMITTED,
        submittedById: req.user!.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'RESULT_SUBMITTED',
        entityType: 'result_batch',
        entityId: batch.id,
        actorId: req.user!.id,
        meta: { departmentId, level, semester, academicYear },
      },
    });

    res.status(201).json({ success: true, data: batch });
  }
);

/**
 * POST /api/approval/:batchId/approve
 * Advance the batch one step up the chain
 */
router.post('/:batchId/approve', async (req: AuthRequest, res: Response) => {
  const role = req.user!.role;
  const nextStatus = NEXT_STATUS[role];

  if (!nextStatus) {
    res.status(403).json({ success: false, message: 'Your role cannot approve batches' });
    return;
  }

  const batch = await prisma.resultBatch.findUnique({ where: { id: req.params.batchId } });
  if (!batch) { res.status(404).json({ success: false, message: 'Batch not found' }); return; }

  // HOD can only approve their own department
  if (role === UserRole.HOD && batch.departmentId !== req.user!.departmentId) {
    res.status(403).json({ success: false, message: 'You can only approve batches for your department' });
    return;
  }

  const [updated] = await prisma.$transaction([
    prisma.resultBatch.update({
      where: { id: batch.id },
      data: { status: nextStatus },
    }),
    prisma.batchApproval.create({
      data: {
        batchId: batch.id,
        approverId: req.user!.id,
        role,
        status: nextStatus,
        comment: req.body.comment,
      },
    }),
    prisma.auditLog.create({
      data: {
        action: 'RESULT_APPROVED',
        entityType: 'result_batch',
        entityId: batch.id,
        actorId: req.user!.id,
        meta: { newStatus: nextStatus, comment: req.body.comment },
      },
    }),
  ]);

  res.json({ success: true, data: updated });
});

/**
 * POST /api/approval/:batchId/reject
 */
router.post(
  '/:batchId/reject',
  authorize(UserRole.EXAMINATION_OFFICER, UserRole.HOD, UserRole.DEAN),
  async (req: AuthRequest, res: Response) => {
    const batch = await prisma.resultBatch.findUnique({ where: { id: req.params.batchId } });
    if (!batch) { res.status(404).json({ success: false, message: 'Batch not found' }); return; }

    const [updated] = await prisma.$transaction([
      prisma.resultBatch.update({
        where: { id: batch.id },
        data: { status: ApprovalStatus.REJECTED },
      }),
      prisma.batchApproval.create({
        data: {
          batchId: batch.id,
          approverId: req.user!.id,
          role: req.user!.role,
          status: ApprovalStatus.REJECTED,
          comment: req.body.comment,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'RESULT_REJECTED',
          entityType: 'result_batch',
          entityId: batch.id,
          actorId: req.user!.id,
          meta: { comment: req.body.comment },
        },
      }),
    ]);

    res.json({ success: true, data: updated });
  }
);

/**
 * POST /api/approval/:batchId/publish
 * Dean publishes — final step
 */
router.post(
  '/:batchId/publish',
  authorize(UserRole.DEAN, UserRole.HOD),
  async (req: AuthRequest, res: Response) => {
    const batch = await prisma.resultBatch.findUnique({ where: { id: req.params.batchId } });
    if (!batch) { res.status(404).json({ success: false, message: 'Batch not found' }); return; }

    if (batch.status !== ApprovalStatus.APPROVED_BY_HOD && batch.status !== ApprovalStatus.APPROVED_BY_DEAN) {
      res.status(400).json({ success: false, message: 'Batch must be fully approved before publishing' });
      return;
    }

    const [updated] = await prisma.$transaction([
      prisma.resultBatch.update({ where: { id: batch.id }, data: { status: ApprovalStatus.PUBLISHED } }),
      prisma.auditLog.create({
        data: {
          action: 'RESULT_PUBLISHED',
          entityType: 'result_batch',
          entityId: batch.id,
          actorId: req.user!.id,
          meta: {},
        },
      }),
    ]);

    res.json({ success: true, data: updated });
  }
);

export default router;
