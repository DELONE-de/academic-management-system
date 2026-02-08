// src/routes/course.routes.ts

import { Router } from 'express';
import { courseController } from '../controllers/course.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { createCourseSchema, updateCourseSchema } from '../validators/course.validator.js';

const router = Router();

router.use(authenticate);

/**
 * @route   POST /api/courses
 * @desc    Create a new course
 * @access  HOD only
 */
router.post(
  '/',
  authorize('HOD'),
  validateBody(createCourseSchema),
  courseController.create
);

/**
 * @route   GET /api/courses
 * @desc    Get all courses with filtering
 * @access  HOD, DEAN
 */
router.get('/', courseController.findAll);

/**
 * @route   GET /api/courses/department/:departmentId/level/:level/semester/:semester
 * @desc    Get courses by department, level, and semester
 * @access  HOD, DEAN
 */
router.get(
  '/department/:departmentId/level/:level/semester/:semester',
  courseController.getByDepartmentLevelSemester
);

/**
 * @route   GET /api/courses/:id
 * @desc    Get course by ID
 * @access  HOD, DEAN
 */
router.get('/:id', courseController.findById);

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course
 * @access  HOD only
 */
router.put(
  '/:id',
  authorize('HOD'),
  validateBody(updateCourseSchema),
  courseController.update
);

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete course
 * @access  HOD only
 */
router.delete('/:id', authorize('HOD'), courseController.delete);

export default router;