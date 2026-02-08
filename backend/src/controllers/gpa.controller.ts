// src/controllers/gpa.controller.ts

import { Response, NextFunction } from 'express';
import { gpaService } from '../services/gpa.service.js';
import { sendSuccess } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';
import { Level, Semester } from '@prisma/client';

export class GPAController {
  async calculateSemesterGPA(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { studentId, level, semester, academicYear } = req.body;

      const result = await gpaService.calculateSemesterGPA(
        studentId,
        level as Level,
        semester as Semester,
        academicYear
      );

      sendSuccess(res, result, 'GPA calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getSemesterGPA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { level, semester, academicYear } = req.query;

      const gpa = await gpaService.getSemesterGPA(
        req.params.studentId,
        level as Level,
        semester as Semester,
        academicYear as string
      );

      sendSuccess(res, gpa, 'GPA retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStudentGPAHistory(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const history = await gpaService.getStudentGPAHistory(req.params.studentId);
      sendSuccess(res, history, 'GPA history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async calculateDepartmentGPAs(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let departmentId = req.body.departmentId;
      if (req.user!.role === 'HOD') {
        departmentId = req.user!.departmentId;
      }

      const { level, semester, academicYear } = req.body;

      const result = await gpaService.calculateDepartmentGPAs(
        departmentId,
        level as Level,
        semester as Semester,
        academicYear
      );

      sendSuccess(res, result, 'Department GPAs calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDepartmentGPAStats(
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

      const stats = await gpaService.getDepartmentGPAStats(
        departmentId,
        level as Level,
        semester as Semester,
        academicYear as string
      );

      sendSuccess(res, stats, 'Statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const gpaController = new GPAController();