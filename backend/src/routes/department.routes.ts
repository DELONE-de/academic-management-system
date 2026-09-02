// src/routes/department.routes.ts

import { Router } from 'express';
import { departmentController } from '../controllers/department.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @route   GET /api/departments/public
 * @desc    Get all departments (public for signup)
 * @access  Public (read-only)
 */
router.get('/public', departmentController.findAllPublic);

/**
 * @route   POST /api/departments/public
 * @desc    Create a department
 * @access  DEAN only — protected
 */
router.post('/public', authenticate, authorize('DEAN'), departmentController.create);

/**
 * @route   DELETE /api/departments/public/:id
 * @desc    Delete a department
 * @access  DEAN only — protected
 */
router.delete('/public/:id', authenticate, authorize('DEAN'), departmentController.remove);

router.use(authenticate);

/**
 * @route   GET /api/departments
 * @desc    Get all departments (filtered by faculty for DEAN)
 * @access  HOD, DEAN
 */
router.get('/', departmentController.findAll);

/**
 * @route   GET /api/departments/my-department
 * @desc    Get current user's department (HOD)
 * @access  HOD
 */
// NOTE: must be before /:id to avoid being matched as id="my-department"
router.get('/my-department', departmentController.getMyDepartment);

/**
 * @route   GET /api/departments/:id
 * @desc    Get department by ID
 * @access  HOD, DEAN
 */
router.get('/:id', departmentController.findById);

export default router;