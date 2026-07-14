// FILE: backend/src/routes/index.ts

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import studentRoutes from './student.routes.js';
import courseRoutes from './course.routes.js';
import resultRoutes from './result.routes.js';
import gpaRoutes from './gpa.routes.js';
import reportRoutes from './report.routes.js';
import departmentRoutes from './department.routes.js';
import bulkRoutes from './bulk.routes.js';
import uploadRoutes from './upload.routes.js';
import reviewRoutes from './review.routes.js';
import auditRoutes from './audit.routes.js';
import approvalRoutes from './approval.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      bulkStudentImport: true,
      bulkScoreUpload: true,
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
router.use('/bulk', bulkRoutes);
router.use('/upload', uploadRoutes);
router.use('/review', reviewRoutes);
router.use('/audit', auditRoutes);
router.use('/approval', approvalRoutes);

export default router;