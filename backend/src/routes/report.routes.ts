// src/routes/report.routes.ts

import { Router, Response } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { prisma } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import { UserRole, ApprovalStatus } from '@prisma/client';

const router = Router();

router.use(authenticate);

/**
 * GET /api/reports/dashboard
 * Single call for all dashboard stats — students, pending approvals, upload jobs, GPA distribution
 */
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const { role, departmentId } = req.user!;
  const deptFilter = role === UserRole.HOD ? { departmentId: departmentId! } : {};

  const [
    totalStudents,
    pendingApprovals,
    recentJobs,
    gpaStats,
    publishedBatches,
  ] = await Promise.all([
    prisma.student.count({ where: deptFilter }),
    prisma.resultBatch.count({
      where: {
        ...deptFilter,
        status: { notIn: [ApprovalStatus.PUBLISHED, ApprovalStatus.REJECTED, ApprovalStatus.DRAFT] },
      },
    }),
    prisma.uploadJob.findMany({
      where: role === UserRole.HOD ? { departmentId: departmentId! } : {},
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, fileName: true, status: true, totalRows: true,
        issuesFound: true, issuesPending: true, createdAt: true,
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.semesterGPA.groupBy({
      by: ['gpa'],
      where: role === UserRole.HOD ? { student: { departmentId: departmentId! } } : {},
      _count: true,
    }),
    prisma.resultBatch.count({ where: { ...deptFilter, status: ApprovalStatus.PUBLISHED } }),
  ]);

  // Bucket GPAs into class bands
  const distribution = { firstClass: 0, secondUpper: 0, secondLower: 0, thirdClass: 0, pass: 0, fail: 0 };
  for (const row of gpaStats) {
    const g = row.gpa;
    const n = row._count;
    if (g >= 4.5) distribution.firstClass += n;
    else if (g >= 3.5) distribution.secondUpper += n;
    else if (g >= 2.4) distribution.secondLower += n;
    else if (g >= 1.5) distribution.thirdClass += n;
    else if (g >= 1.0) distribution.pass += n;
    else distribution.fail += n;
  }

  res.json({
    success: true,
    data: { totalStudents, pendingApprovals, publishedBatches, recentJobs, gpaDistribution: distribution },
  });
});
/**
 * @route   GET /api/reports/department/:departmentId
 * @desc    Get department report data
 * @access  HOD, DEAN
 */
router.get('/department/:departmentId', reportController.getDepartmentReport);

/**
 * @route   GET /api/reports/department/:departmentId/pdf
 * @desc    Download department report as PDF
 * @access  HOD, DEAN
 */
router.get('/department/:departmentId/pdf', reportController.downloadDepartmentReportPDF);

/**
 * @route   GET /api/reports/faculty
 * @desc    Get faculty-wide statistics (Dean only)
 * @access  DEAN only
 */
router.get('/faculty', authorize('DEAN'), reportController.getFacultyStats);

/**
 * @route   GET /api/reports/transcript/:studentId
 * @desc    Get student transcript data
 * @access  HOD, DEAN
 */
router.get('/transcript/:studentId', reportController.getStudentTranscript);

/**
 * @route   GET /api/reports/transcript/:studentId/pdf
 * @desc    Download student transcript as PDF
 * @access  HOD, DEAN
 */
router.get('/transcript/:studentId/pdf', reportController.downloadStudentTranscriptPDF);

export default router;