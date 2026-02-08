// src/routes/result.routes.ts

import { Router } from 'express';
import { resultController } from '../controllers/result.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { bulkScoreEntrySchema, updateScoreSchema } from '../validators/result.validator.js';

const router = Router();

router.use(authenticate);

/**
 * @route   POST /api/results/scores
 * @desc    Enter scores for multiple students (bulk entry)
 * @access  HOD only
 */
router.post(
  '/scores',
  authorize('HOD'),
  validateBody(bulkScoreEntrySchema),
  resultController.enterScores
);

/**
 * @route   GET /api/results/student/:studentId
 * @desc    Get results for a student
 * @access  HOD, DEAN
 */
router.get('/student/:studentId', resultController.getStudentResults);

/**
 * @route   GET /api/results/department/:departmentId
 * @desc    Get all results for a department by semester
 * @access  HOD, DEAN
 */
router.get('/department/:departmentId', resultController.getDepartmentResults);

/**
 * @route   PUT /api/results/:id
 * @desc    Update a single result
 * @access  HOD only
 */
router.put(
  '/:id',
  authorize('HOD'),
  validateBody(updateScoreSchema),
  resultController.updateResult
);

/**
 * @route   DELETE /api/results/:id
 * @desc    Delete a result
 * @access  HOD only
 */
router.delete('/:id', authorize('HOD'), resultController.deleteResult);

/**
 * @route   GET /api/results/carryovers/:studentId
 * @desc    Get carry-over courses for a student
 * @access  HOD, DEAN
 */
router.get('/carryovers/:studentId', resultController.getCarryOverCourses);

export default router;