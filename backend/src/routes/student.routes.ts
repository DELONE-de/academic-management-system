// FILE: backend/src/routes/student.routes.ts

import { Router } from 'express';
import { studentController } from '../controllers/student.controller.js';
import { bulkController } from '../controllers/bulk.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { createStudentSchema, updateStudentSchema } from '../validators/student.validator.js';
import { uploadExcel, handleMulterError } from '../middleware/upload.middleware.js';

const router = Router();

router.use(authenticate);

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  HOD only
 */
router.post('/', authorize('HOD'), validateBody(createStudentSchema), studentController.create);

/**
 * @route   POST /api/students/bulk-upload
 * @desc    Bulk import students from Excel file
 * @access  HOD only
 */
router.post(
  '/bulk-upload',
  authorize('HOD'),
  uploadExcel.single('file'),
  handleMulterError,
  bulkController.bulkImportStudents
);

/**
 * @route   GET /api/students/bulk-upload/template
 * @desc    Download student upload template
 * @access  HOD only
 */
router.get('/bulk-upload/template', authorize('HOD'), bulkController.downloadStudentTemplate);

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

export default router;