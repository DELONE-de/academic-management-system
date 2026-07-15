// FILE: backend/src/routes/result.routes.ts

import { Router } from 'express';
import { resultController } from '../controllers/result.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { bulkScoreEntrySchema, updateScoreSchema } from '../validators/result.validator.js';
import { generateScoreTemplate } from '../utils/excel.js';

const router = Router();

router.use(authenticate);

/**
 * @route   POST /api/results/scores
 * @desc    Enter scores for multiple students (manual entry)
 * @access  HOD only
 */
router.post('/scores', authorize('HOD'), validateBody(bulkScoreEntrySchema), resultController.enterScores);

/**
 * @route   POST /api/results/add
 * @desc    Add a single score
 * @access  HOD only
 */
router.post('/add', authorize('HOD'), resultController.addSingleScore);

/**
 * @route   DELETE /api/results/delete/:resultId
 * @desc    Delete a single score
 * @access  HOD only
 */
router.delete('/delete/:resultId', authorize('HOD'), resultController.deleteSingleScore);

/**
 * @route   GET /api/results/bulk-upload/template
 * @desc    Download score upload template
 * @access  HOD only
 */
router.get('/bulk-upload/template', authorize('HOD'), (req, res) => {
  const buffer = generateScoreTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=score_upload_template.xlsx');
  res.send(buffer);
});

/**
 * @route   GET /api/results/student/:studentId
 * @desc    Get results for a student
 * @access  HOD, DEAN
 */
router.get('/student/:studentId', resultController.getStudentResults);

/**
 * @route   GET /api/results/student/:studentId/with-gpa
 * @desc    Get results for a student with GPA information
 * @access  HOD, DEAN
 */
router.get('/student/:studentId/with-gpa', resultController.getStudentResultsWithGPA);

/**
 * @route   GET /api/results/department/:departmentId
 * @desc    Get all results for a department
 * @access  HOD, DEAN
 */
router.get('/department/:departmentId', resultController.getDepartmentResults);

/**
 * @route   PUT /api/results/:id
 * @desc    Update a result
 * @access  HOD only
 */
router.put('/:id', authorize('HOD'), validateBody(updateScoreSchema), resultController.updateResult);

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