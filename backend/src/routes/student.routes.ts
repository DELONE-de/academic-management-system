// FILE: backend/src/routes/student.routes.ts

import { Router } from 'express';
import { studentController } from '../controllers/student.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { createStudentSchema, updateStudentSchema } from '../validators/student.validator.js';
import { generateStudentTemplate } from '../utils/excel.js';

const router = Router();

router.use(authenticate);

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  HOD only
 */
router.post('/', authorize('HOD'), validateBody(createStudentSchema), studentController.create);

/**
 * @route   GET /api/students/bulk-upload/template
 * @desc    Download student upload template
 * @access  HOD only
 */
router.get('/bulk-upload/template', authorize('HOD'), (req, res) => {
  const buffer = generateStudentTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=student_upload_template.xlsx');
  res.send(buffer);
});

/**
 * @route   GET /api/students
 * @desc    Get all students
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
router.put('/:id', authorize('HOD'), validateBody(updateStudentSchema), studentController.update);

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
router.get('/department/:departmentId/level/:level', studentController.getByDepartmentLevel);

/**
 * @route   PATCH /api/students/bulk-update-level
 * @desc    Bulk update student levels
 * @access  HOD only
 */
router.patch('/bulk-update-level', authorize('HOD'), studentController.bulkUpdateLevel);

export default router;