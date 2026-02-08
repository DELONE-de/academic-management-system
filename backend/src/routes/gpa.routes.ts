// src/routes/gpa.routes.ts

import { Router } from 'express';
import { gpaController } from '../controllers/gpa.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

const calculateGPASchema = z.object({
  studentId: z.string().cuid(),
  level: z.enum([
    'ND1', 'ND2', 'HND1', 'HND2',
    'LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500'
  ]),
  semester: z.enum(['FIRST', 'SECOND']),
  academicYear: z.string().regex(/^\d{4}\/\d{4}$/),
});

const calculateDepartmentGPAsSchema = z.object({
  departmentId: z.string().cuid().optional(),
  level: z.enum([
    'ND1', 'ND2', 'HND1', 'HND2',
    'LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500'
  ]),
  semester: z.enum(['FIRST', 'SECOND']),
  academicYear: z.string().regex(/^\d{4}\/\d{4}$/),
});

/**
 * @route   POST /api/gpa/calculate
 * @desc    Calculate and store semester GPA for a student
 * @access  HOD only
 */
router.post(
  '/calculate',
  authorize('HOD'),
  validateBody(calculateGPASchema),
  gpaController.calculateSemesterGPA
);

/**
 * @route   GET /api/gpa/student/:studentId
 * @desc    Get semester GPA for a student
 * @access  HOD, DEAN
 */
router.get('/student/:studentId', gpaController.getSemesterGPA);

/**
 * @route   GET /api/gpa/student/:studentId/history
 * @desc    Get all semester GPAs and CGPA for a student
 * @access  HOD, DEAN
 */
router.get('/student/:studentId/history', gpaController.getStudentGPAHistory);

/**
 * @route   POST /api/gpa/calculate-department
 * @desc    Calculate GPAs for all students in a department
 * @access  HOD only
 */
router.post(
  '/calculate-department',
  authorize('HOD'),
  validateBody(calculateDepartmentGPAsSchema),
  gpaController.calculateDepartmentGPAs
);

/**
 * @route   GET /api/gpa/department/:departmentId/stats
 * @desc    Get GPA statistics for a department
 * @access  HOD, DEAN
 */
router.get('/department/:departmentId/stats', gpaController.getDepartmentGPAStats);

export default router;