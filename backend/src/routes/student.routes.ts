// src/routes/student.routes.ts

import { Router } from 'express';
import { studentController } from '../controllers/student.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { createStudentSchema, updateStudentSchema } from '../validators/student.validator.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  HOD only
 */
router.post(
  '/',
  authorize('HOD'),
  validateBody(createStudentSchema),
  studentController.create
);

/**
 * @route   GET /api/students
 * @desc    Get all students with filtering
 * @access  HOD, DEAN
 */
router.get('/', studentController.findAll);

/**
 * @route   GET /api/students/:id
 * @desc    Get student by ID
 * @access  HOD, DEAN
 */
router.get('/:id', studentController.findById);

/**
 * @route   PUT /api/students/:id
 * @desc    Update student
 * @access  HOD only
 */
router.put(
  '/:id',
  authorize('HOD'),
  validateBody(updateStudentSchema),
  studentController.update
);

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete student
 * @access  HOD only
 */
router.delete('/:id', authorize('HOD'), studentController.delete);

/**
 * @route   GET /api/students/department/:departmentId/level/:level
 * @desc    Get students by department and level
 * @access  HOD, DEAN
 */
router.get(
  '/department/:departmentId/level/:level',
  studentController.getByDepartmentLevel
);

export default router;