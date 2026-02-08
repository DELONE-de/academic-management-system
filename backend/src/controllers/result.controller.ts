// src/controllers/result.controller.ts

import { Response, NextFunction } from 'express';
import { resultService } from '../services/result.service.js';
import { sendSuccess } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';
import { Level, Semester } from '@prisma/client';

export class ResultController {
  async enterScores(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departmentId = req.user!.departmentId!;
      const result = await resultService.enterScores(req.body, departmentId);
      sendSuccess(res, result, 'Scores entered successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStudentResults(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { level, semester, academicYear } = req.query;

      const results = await resultService.getStudentResults(
        req.params.studentId,
        level as Level,
        semester as Semester,
        academicYear as string
      );

      sendSuccess(res, results, 'Results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDepartmentResults(
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

      const results = await resultService.getDepartmentResults(
        departmentId,
        level as Level,
        semester as Semester,
        academicYear as string
      );

      sendSuccess(res, results, 'Results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departmentId = req.user!.departmentId!;
      const result = await resultService.updateResult(
        req.params.id,
        req.body.score,
        departmentId
      );
      sendSuccess(res, result, 'Result updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departmentId = req.user!.departmentId!;
      await resultService.deleteResult(req.params.id, departmentId);
      sendSuccess(res, null, 'Result deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCarryOverCourses(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const carryOvers = await resultService.getCarryOverCourses(req.params.studentId);
      sendSuccess(res, carryOvers, 'Carry-over courses retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const resultController = new ResultController();