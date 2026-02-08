// src/routes/report.routes.ts

import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/reports/department/:departmentId
 * @desc    Get department report data
 * @access  HOD, DEAN
 */
router.get('/department/:departmentId', reportController.getDepartmentReport);

/**
 * @route   GET /api/reports/department/:departmentId/pdf
 * @desc    Download department report as PDF
 * @access  HOD, DEAN
 */
router.get('/department/:departmentId/pdf', reportController.downloadDepartmentReportPDF);

/**
 * @route   GET /api/reports/faculty
 * @desc    Get faculty-wide statistics (Dean only)
 * @access  DEAN only
 */
router.get('/faculty', authorize('DEAN'), reportController.getFacultyStats);

/**
 * @route   GET /api/reports/transcript/:studentId
 * @desc    Get student transcript data
 * @access  HOD, DEAN
 */
router.get('/transcript/:studentId', reportController.getStudentTranscript);

/**
 * @route   GET /api/reports/transcript/:studentId/pdf
 * @desc    Download student transcript as PDF
 * @access  HOD, DEAN
 */
router.get('/transcript/:studentId/pdf', reportController.downloadStudentTranscriptPDF);

export default router;