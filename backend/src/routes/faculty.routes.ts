// src/routes/faculty.routes.ts

import { Router } from 'express';
import { facultyController } from '../controllers/faculty.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/faculties
 * @desc    Get all faculties
 * @access  HOD, DEAN
 */
router.get('/', facultyController.findAll);

/**
 * @route   GET /api/faculties/my-faculty
 * @desc    Get current user's faculty (DEAN)
 * @access  DEAN
 */
router.get('/my-faculty', facultyController.getMyFaculty);

/**
 * @route   GET /api/faculties/:id
 * @desc    Get faculty by ID
 * @access  HOD, DEAN
 */
router.get('/:id', facultyController.findById);

export default router;