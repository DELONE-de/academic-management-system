// FILE: backend/src/routes/index.ts

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import studentRoutes from './student.routes.js';
import courseRoutes from './course.routes.js';
import resultRoutes from './result.routes.js';
import gpaRoutes from './gpa.routes.js';
import reportRoutes from './report.routes.js';
import departmentRoutes from './department.routes.js';
import uploadRoutes from './upload.routes.js';
import reviewRoutes from './review.routes.js';
import auditRoutes from './audit.routes.js';
import approvalRoutes from './approval.routes.js';
import { prisma } from '../config/database.js';

const router = Router();

// Health check endpoint — distinguishes API / database / AI configuration health
router.get('/health', async (req, res) => {
  const checks: Record<string, string> = { api: 'ok' };
  let dbHealthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (error) {
    dbHealthy = false;
    checks.database = 'unavailable';
  }

  // AI configuration — present keys, but their absence is not fatal (system works without AI)
  checks.ai = process.env.GEMINI_API_KEY ? 'configured' : 'not_configured';
  if (!process.env.GEMINI_API_KEY && process.env.GROQ_API_KEY) checks.ai = 'configured_via_groq';

  res.status(dbHealthy ? 200 : 503).json({
    success: dbHealthy,
    message: dbHealthy ? 'API is running' : 'Database unavailable',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
    features: {
      bulkStudentImport: false,
      bulkScoreUpload: false,
      singleScoreManagement: true,
      gpaRecalculation: true,
      aiUploadPipeline: true,
      humanReviewCenter: true,
      approvalWorkflow: true,
      auditLog: true,
    },
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/courses', courseRoutes);
router.use('/results', resultRoutes);
router.use('/gpa', gpaRoutes);
router.use('/reports', reportRoutes);
router.use('/departments', departmentRoutes);
router.use('/upload', uploadRoutes);
router.use('/review', reviewRoutes);
router.use('/audit', auditRoutes);
router.use('/approval', approvalRoutes);

export default router;