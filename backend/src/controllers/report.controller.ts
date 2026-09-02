// src/controllers/report.controller.ts

import { Response, NextFunction } from 'express';
import { reportService } from '../services/report.service.js';
import { sendSuccess, sendForbidden } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';
import { Level, Semester } from '@prisma/client';
import { assertDepartmentAccess, assertStudentAccess } from '../middleware/access.middleware.js';
import {
  generateDepartmentReportPDF,
  generateTranscriptPDF,
} from '../utils/pdf-generator.js';
import { formatLevel, formatSemester } from '../utils/grading.js';

export class ReportController {
  async getDepartmentReport(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let departmentId = req.params.departmentId;
      if (req.user!.role === 'HOD') {
        departmentId = req.user!.departmentId!;
      } else {
        try {
          await assertDepartmentAccess(req, departmentId);
        } catch {
          sendForbidden(res, 'Access denied');
          return;
        }
      }

      const { level, semester, academicYear } = req.query;

      const report = await reportService.generateDepartmentReport(
        departmentId,
        level as Level,
        semester as Semester,
        academicYear as string
      );

      sendSuccess(res, report, 'Report generated successfully');
    } catch (error) {
      next(error);
    }
  }

  async downloadDepartmentReportPDF(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let departmentId = req.params.departmentId;
      if (req.user!.role === 'HOD') {
        departmentId = req.user!.departmentId!;
      } else {
        try {
          await assertDepartmentAccess(req, departmentId);
        } catch {
          sendForbidden(res, 'Access denied');
          return;
        }
      }

      const { level, semester, academicYear } = req.query;

      const report = await reportService.generateDepartmentReport(
        departmentId,
        level as Level,
        semester as Semester,
        academicYear as string
      );

      await generateDepartmentReportPDF(res, {
        departmentName: report.department.name,
        facultyName: report.department.facultyName,
        level: formatLevel(level as Level),
        semester: formatSemester(semester as Semester),
        academicYear: academicYear as string,
        stats: report.stats,
        students: report.students,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFacultyStats(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const facultyId = req.user!.facultyId;
      if (!facultyId) {
        res.status(400).json({ success: false, message: 'No faculty assigned to this user' });
        return;
      }
      const { academicYear } = req.query;

      const stats = await reportService.getFacultyStats(
        facultyId,
        academicYear as string
      );

      sendSuccess(res, stats, 'Faculty statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStudentTranscript(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      try {
        await assertStudentAccess(req, req.params.studentId);
      } catch (err: any) {
        res.status(err?.message === 'NOT_FOUND' ? 404 : 403).json({
          success: false,
          message: err?.message === 'FORBIDDEN' ? 'Access denied' : 'Student not found',
        });
        return;
      }

      const transcript = await reportService.getStudentTranscript(req.params.studentId);
      sendSuccess(res, transcript, 'Transcript retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async downloadStudentTranscriptPDF(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      try {
        await assertStudentAccess(req, req.params.studentId);
      } catch (err: any) {
        res.status(err?.message === 'NOT_FOUND' ? 404 : 403).json({
          success: false,
          message: err?.message === 'FORBIDDEN' ? 'Access denied' : 'Student not found',
        });
        return;
      }

      const transcript = await reportService.getStudentTranscript(req.params.studentId);

      await generateTranscriptPDF(res, {
        student: transcript.student,
        semesters: transcript.semesters,
        cgpa: transcript.cgpa,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();