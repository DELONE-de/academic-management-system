// src/routes/department.routes.ts

import { Router } from 'express';
import { departmentController } from '../controllers/department.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @route   GET /api/departments/public
 * @desc    Get all departments (public for signup)
 * @access  Public
 */
router.get('/public', departmentController.findAllPublic);

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
router.get('/my-department', departmentController.getMyDepartment);

/**
 * @route   GET /api/departments/:id
 * @desc    Get department by ID
 * @access  HOD, DEAN
 */
router.get('/:id', departmentController.findById);

export default router;