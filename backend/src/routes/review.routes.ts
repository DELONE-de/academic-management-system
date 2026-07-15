// FILE: backend/src/routes/review.routes.ts

import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { prisma } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import { UserRole } from '@prisma/client';
import { saveResult } from '../ai/validation.tools.js';

const router = Router();
router.use(authenticate);
router.use(authorize(UserRole.HOD, UserRole.DEAN, UserRole.EXAMINATION_OFFICER, UserRole.LECTURER));

/**
 * GET /api/review/:jobId
 * List all review items for an upload job, with job summary
 */
router.get('/:jobId', async (req: AuthRequest, res: Response) => {
  const job = await prisma.uploadJob.findUnique({
    where: { id: req.params.jobId },
    include: {
      reviewItems: { orderBy: { rowNumber: 'asc' } },
      uploadedBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!job) {
    res.status(404).json({ success: false, message: 'Upload job not found' });
    return;
  }

  res.json({ success: true, data: job });
});

/**
 * PATCH /api/review/:itemId
 * Resolve a single review item: accept | reject | edit
 * Body: { resolution: 'accepted' | 'rejected' | 'edited', correctedValue?: string }
 */
router.patch('/:itemId', async (req: AuthRequest, res: Response) => {
  const { resolution, correctedValue } = req.body as {
    resolution: 'accepted' | 'rejected' | 'edited';
    correctedValue?: string;
  };

  if (!['accepted', 'rejected', 'edited'].includes(resolution)) {
    res.status(400).json({ success: false, message: 'resolution must be accepted | rejected | edited' });
    return;
  }

  if (resolution === 'edited' && !correctedValue) {
    res.status(400).json({ success: false, message: 'correctedValue is required when resolution is edited' });
    return;
  }

  const item = await prisma.reviewItem.findUnique({
    where: { id: req.params.itemId },
    include: { uploadJob: { select: { id: true, issuesPending: true, issuesFixed: true } } },
  });

  if (!item) {
    res.status(404).json({ success: false, message: 'Review item not found' });
    return;
  }

  if (item.isResolved) {
    res.status(400).json({ success: false, message: 'Item already resolved' });
    return;
  }

  const updated = await prisma.reviewItem.update({
    where: { id: item.id },
    data: {
      isResolved: true,
      resolution,
      suggestedValue: resolution === 'edited' ? correctedValue : item.suggestedValue,
      resolvedById: req.user!.id,
      resolvedAt: new Date(),
    },
  });

  // Commit corrected data back to DB for accepted/edited non-missing items
  if (resolution !== 'rejected' && item.issueType !== 'missing_student' && item.rawRecord) {
    await commitReviewItem(item, resolution === 'edited' ? correctedValue : undefined);
  }

  // Update job pending/fixed counts
  await prisma.uploadJob.update({
    where: { id: item.uploadJob.id },
    data: {
      issuesPending: { decrement: 1 },
      issuesFixed: resolution !== 'rejected' ? { increment: 1 } : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: resolution === 'accepted' ? 'REVIEW_ACCEPTED'
        : resolution === 'rejected' ? 'REVIEW_REJECTED'
        : 'REVIEW_EDITED',
      entityType: 'review_item',
      entityId: item.id,
      actorId: req.user!.id,
      meta: { resolution, correctedValue, field: item.field, originalValue: item.originalValue },
    },
  });

  res.json({ success: true, data: updated });
});

/**
 * POST /api/review/:jobId/approve-all
 * Accept all pending review items for a job at once
 */
router.post('/:jobId/approve-all', async (req: AuthRequest, res: Response) => {
  const job = await prisma.uploadJob.findUnique({
    where: { id: req.params.jobId },
    select: { id: true, issuesPending: true },
  });

  if (!job) {
    res.status(404).json({ success: false, message: 'Upload job not found' });
    return;
  }

  const pending = await prisma.reviewItem.findMany({
    where: { uploadJobId: job.id, isResolved: false },
    select: { id: true },
  });

  if (pending.length === 0) {
    res.json({ success: true, message: 'No pending items', resolved: 0 });
    return;
  }

  await prisma.reviewItem.updateMany({
    where: { uploadJobId: job.id, isResolved: false },
    data: {
      isResolved: true,
      resolution: 'accepted',
      resolvedById: req.user!.id,
      resolvedAt: new Date(),
    },
  });

  await prisma.uploadJob.update({
    where: { id: job.id },
    data: {
      issuesPending: 0,
      issuesFixed: { increment: pending.length },
      status: 'APPROVED',
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'REVIEW_ACCEPTED',
      entityType: 'upload_job',
      entityId: job.id,
      actorId: req.user!.id,
      meta: { bulkApprove: true, count: pending.length },
    },
  });

  res.json({ success: true, message: `${pending.length} items approved`, resolved: pending.length });
});

// Commit a reviewed item back to the DB.
// rawRecord is the original extracted student row (matricNumber, academicYear, courses[]).
// For 'edited' resolutions on invalid_score, the correctedValue replaces the score for that course.
async function commitReviewItem(
  item: { issueType: string; field: string; originalValue: string | null; rawRecord: any },
  correctedValue?: string
): Promise<void> {
  const raw = item.rawRecord as { matricNumber: string; academicYear: string; courses: Array<{ courseCode: string; score: number }>; departmentCode?: string };
  if (!raw?.matricNumber || !raw?.academicYear || !raw?.courses) return;

  // Get departmentCode from the upload job's department
  const uploadJob = await prisma.uploadJob.findFirst({
    where: { reviewItems: { some: { originalValue: item.originalValue ?? undefined } } },
    include: { department: { select: { code: true } } },
  });
  const departmentCode = raw.departmentCode ?? uploadJob?.department?.code ?? '';
  if (!departmentCode) return;

  let courses = raw.courses;

  // For edited invalid_score: replace the score for the flagged course
  if (item.issueType === 'invalid_score' && item.field === 'courseCode' && correctedValue) {
    const correctedScore = parseFloat(correctedValue);
    if (!isNaN(correctedScore)) {
      courses = courses.map((c) =>
        c.courseCode.toUpperCase() === item.originalValue?.toUpperCase()
          ? { ...c, score: correctedScore }
          : c
      );
    }
  }

  await saveResult({ matricNumber: raw.matricNumber, departmentCode, academicYear: raw.academicYear, courses });
}

export default router;
