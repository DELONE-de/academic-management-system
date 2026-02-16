// FILE: backend/src/routes/bulk.routes.ts

import { Router } from 'express';
import { bulkController } from '../controllers/bulk.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadExcel, handleMulterError } from '../middleware/upload.middleware.js';

const router = Router();

// All bulk routes require authentication and HOD or higher role
router.use(authenticate);
router.use(authorize('HOD', 'DEAN'));

/**
 * @route   POST /api/bulk/students
 * @desc    Bulk import students from Excel file
 * @access  HOD, DEAN (Admin)
 */
router.post(
  '/students',
  uploadExcel.single('file'),
  handleMulterError,
  bulkController.bulkImportStudents
);

/**
 * @route   GET /api/bulk/students/template
 * @desc    Download student upload template
 * @access  HOD, DEAN
 */
router.get('/students/template', bulkController.downloadStudentTemplate);

/**
 * @route   POST /api/bulk/scores
 * @desc    Bulk import scores from Excel file
 * @access  HOD, DEAN (Admin)
 */
router.post(
  '/scores',
  uploadExcel.single('file'),
  handleMulterError,
  bulkController.bulkImportScores
);

/**
 * @route   GET /api/bulk/scores/template
 * @desc    Download score upload template
 * @access  HOD, DEAN
 */
router.get('/scores/template', bulkController.downloadScoreTemplate);

export default router;