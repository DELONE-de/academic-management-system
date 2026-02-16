// FILE: backend/src/controllers/result.controller.ts

import { Response, NextFunction } from 'express';
import { resultService } from '../services/result.service.js';
import { gpaService } from '../services/gpa.service.js';
import { sendSuccess, sendBadRequest } from '../utils/response.js';
import { AuthRequest, AddScoreInput } from '../types/index.js';
import { Level, Semester } from '@prisma/client';
import { addScoreSchema } from '../validators/bulk.validator.js';

export class ResultController {
  /**
   * Enter scores for multiple students (existing)
   */
  async enterScores(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departmentId = req.user!.departmentId!;
      const result = await resultService.enterScores(req.body, departmentId);
      sendSuccess(res, result, 'Scores entered successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a single score
   * POST /api/results/add
   */
  async addSingleScore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input
      const validationResult = addScoreSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        sendBadRequest(res, 'Validation failed', errors.join('; '));
        return;
      }

      const departmentId = req.user!.departmentId!;
      const result = await resultService.addSingleScore(validationResult.data as AddScoreInput, departmentId);
      
      sendSuccess(res, result, `Score added successfully. GPA: ${result.gpa.toFixed(2)}, CGPA: ${result.cgpa.toFixed(2)}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a single score
   * DELETE /api/results/delete/:resultId
   */
  async deleteSingleScore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { resultId } = req.params;
      
      if (!resultId) {
        sendBadRequest(res, 'Result ID is required');
        return;
      }

      const departmentId = req.user!.departmentId!;
      const result = await resultService.deleteSingleScore(resultId, departmentId);
      
      sendSuccess(res, result, `Score deleted successfully. GPA ${result.gpaRecalculated ? 'recalculated' : 'cleared'}.`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get results for a student
   */
  async getStudentResults(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

  /**
   * Get results for a student with GPA info
   * GET /api/results/student/:studentId/with-gpa
   */
  async getStudentResultsWithGPA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await resultService.getStudentResultsWithGPA(req.params.studentId);
      sendSuccess(res, results, 'Results with GPA retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get department results
   */
  async getDepartmentResults(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let departmentId = req.params.departmentId;
      if (req.user!.role === 'HOD') departmentId = req.user!.departmentId!;
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

  /**
   * Update a result
   */
  async updateResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departmentId = req.user!.departmentId!;
      const result = await resultService.updateResult(req.params.id, req.body.score, departmentId);
      sendSuccess(res, result, 'Result updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a result (existing)
   */
  async deleteResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departmentId = req.user!.departmentId!;
      await resultService.deleteResult(req.params.id, departmentId);
      sendSuccess(res, null, 'Result deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get carry-over courses
   */
  async getCarryOverCourses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const carryOvers = await resultService.getCarryOverCourses(req.params.studentId);
      sendSuccess(res, carryOvers, 'Carry-over courses retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const resultController = new ResultController();