// src/routes/index.ts

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import studentRoutes from './student.routes.js';
import courseRoutes from './course.routes.js';
import resultRoutes from './result.routes.js';
import gpaRoutes from './gpa.routes.js';
import reportRoutes from './report.routes.js';
import departmentRoutes from './department.routes.js';
import facultyRoutes from './faculty.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/courses', courseRoutes);
router.use('/results', resultRoutes);
router.use('/gpa', gpaRoutes);
router.use('/reports', reportRoutes);
router.use('/departments', departmentRoutes);
router.use('/faculties', facultyRoutes);

export default router;