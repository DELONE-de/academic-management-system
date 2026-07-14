// FILE: backend/src/routes/upload.routes.ts

import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadAI, handleMulterError, getFileType } from '../middleware/upload.middleware.js';
import { processUpload } from '../services/upload.service.js';
import { prisma } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.HOD, UserRole.DEAN, UserRole.EXAMINATION_OFFICER, UserRole.LECTURER));

/**
 * POST /api/upload
 * Upload a file for AI processing — streams progress via SSE
 */
router.post(
  '/',
  uploadAI.single('file'),
  handleMulterError,
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const uploadType = (req.body.uploadType as 'students' | 'results') || 'results';
    const departmentId = req.body.departmentId || req.user!.departmentId;
    const academicYear = req.body.academicYear as string | undefined;

    if (!departmentId) {
      res.status(400).json({ success: false, message: 'departmentId is required' });
      return;
    }

    if (uploadType === 'results' && !academicYear) {
      res.status(400).json({ success: false, message: 'academicYear is required for results upload' });
      return;
    }

    // Resolve department code from DB using auth user's departmentId
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { code: true },
    });

    if (!department) {
      res.status(400).json({ success: false, message: 'Department not found' });
      return;
    }

    const fileType = getFileType(req.file);
    if (!fileType) {
      res.status(400).json({ success: false, message: 'Unsupported file type' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await processUpload(
      req.file,
      fileType,
      uploadType,
      req.user!.id,
      departmentId,
      department.code,
      academicYear ?? '',
      res
    );
  }
);

/**
 * GET /api/upload/:jobId
 * Get upload job status and summary
 */
router.get('/:jobId', async (req: AuthRequest, res: Response) => {
  const job = await prisma.uploadJob.findUnique({
    where: { id: req.params.jobId },
    include: { reviewItems: true },
  });

  if (!job) {
    res.status(404).json({ success: false, message: 'Upload job not found' });
    return;
  }

  res.json({ success: true, data: job });
});

/**
 * GET /api/upload/:jobId/stream
 * Reconnect SSE stream to get current job status (for page refresh recovery)
 */
router.get('/:jobId/stream', async (req: AuthRequest, res: Response) => {
  const job = await prisma.uploadJob.findUnique({
    where: { id: req.params.jobId },
    select: { id: true, status: true, aiSummary: true, totalRows: true, issuesFound: true, issuesFixed: true, issuesPending: true },
  });

  if (!job) {
    res.status(404).json({ success: false, message: 'Upload job not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Emit current state immediately on reconnect
  res.write(`event: complete\ndata: ${JSON.stringify({ jobId: job.id, ...job })}\n\n`);
  res.write('event: done\ndata: {}\n\n');
  res.end();
});

export default router;
