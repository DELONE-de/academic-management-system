// src/routes/gpa.routes.ts

import { Router, Response } from 'express';
import { gpaController } from '../controllers/gpa.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { prisma } from '../config/database.js';
import { geminiExplainGPA } from '../ai/gemini.js';
import { AuthRequest } from '../types/index.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

const calculateGPASchema = z.object({
  studentId: z.string().cuid(),
  level: z.enum([
    'ND1', 'ND2', 'HND1', 'HND2',
    'LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500'
  ]),
  semester: z.enum(['FIRST', 'SECOND']),
  academicYear: z.string().regex(/^\d{4}\/\d{4}$/),
});

const calculateDepartmentGPAsSchema = z.object({
  departmentId: z.string().cuid().optional(),
  level: z.enum([
    'ND1', 'ND2', 'HND1', 'HND2',
    'LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500'
  ]),
  semester: z.enum(['FIRST', 'SECOND']),
  academicYear: z.string().regex(/^\d{4}\/\d{4}$/),
});

/**
 * @route   POST /api/gpa/calculate
 * @desc    Calculate and store semester GPA for a student
 * @access  HOD only
 */
router.post(
  '/calculate',
  authorize('HOD'),
  validateBody(calculateGPASchema),
  gpaController.calculateSemesterGPA
);

/**
 * @route   GET /api/gpa/student/:studentId
 * @desc    Get semester GPA for a student
 * @access  HOD, DEAN
 */
router.get('/student/:studentId', gpaController.getSemesterGPA);

/**
 * @route   GET /api/gpa/student/:studentId/history
 * @desc    Get all semester GPAs and CGPA for a student
 * @access  HOD, DEAN
 */
router.get('/student/:studentId/history', gpaController.getStudentGPAHistory);

/**
 * @route   POST /api/gpa/calculate-department
 * @desc    Calculate GPAs for all students in a department
 * @access  HOD only
 */
router.post(
  '/calculate-department',
  authorize('HOD'),
  validateBody(calculateDepartmentGPAsSchema),
  gpaController.calculateDepartmentGPAs
);

/**
 * @route   GET /api/gpa/department/:departmentId/stats
 * @desc    Get GPA statistics for a department
 * @access  HOD, DEAN
 */
router.get('/department/:departmentId/stats', gpaController.getDepartmentGPAStats);

/**
 * @route   GET /api/gpa/student/:studentId/explain
 * @desc    AI plain-language explanation of a student's GPA for a semester
 * @query   level, semester, academicYear
 */
router.get('/student/:studentId/explain', async (req: AuthRequest, res: Response) => {
  const { level, semester, academicYear } = req.query as Record<string, string>;

  if (!level || !semester || !academicYear) {
    res.status(400).json({ success: false, message: 'level, semester, academicYear are required' });
    return;
  }

  const student = await prisma.student.findUnique({
    where: { id: req.params.studentId },
    select: { firstName: true, lastName: true, department: { select: { passMark: true } } },
  });

  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  const results = await prisma.result.findMany({
    where: { studentId: req.params.studentId, level: level as any, semester: semester as any, academicYear },
    include: { course: { select: { code: true, unit: true } } },
  });

  if (results.length === 0) {
    res.status(404).json({ success: false, message: 'No results found for this semester' });
    return;
  }

  const semGpa = await prisma.semesterGPA.findUnique({
    where: { studentId_level_semester_academicYear: { studentId: req.params.studentId, level: level as any, semester: semester as any, academicYear } },
  });

  const totalUnits = results.reduce((s, r) => s + r.course.unit, 0);
  const totalPoints = results.reduce((s, r) => s + r.pxu, 0);
  const gpa = semGpa?.gpa ?? (totalUnits > 0 ? Math.round((totalPoints / totalUnits) * 100) / 100 : 0);

  const explanation = await geminiExplainGPA({
    studentName: `${student.firstName} ${student.lastName}`,
    gpa,
    results: results.map((r) => ({
      courseCode: r.course.code,
      unit: r.course.unit,
      score: r.score,
      grade: r.grade,
      gradePoint: r.gradePoint,
      pxu: r.pxu,
    })),
    totalUnits,
    totalPoints,
  });

  res.json({ success: true, data: { gpa, explanation } });
});

export default router;