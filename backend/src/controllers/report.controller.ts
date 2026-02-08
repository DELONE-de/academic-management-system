// src/controllers/report.controller.ts

import { Response, NextFunction } from 'express';
import { reportService } from '../services/report.service.js';
import { sendSuccess } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';
import { Level, Semester } from '@prisma/client';
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
      const facultyId = req.user!.facultyId!;
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