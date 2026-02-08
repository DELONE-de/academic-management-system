// src/controllers/course.controller.ts

import { Response, NextFunction } from 'express';
import { courseService } from '../services/course.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';
import { Level, Semester } from '@prisma/client';

export class CourseController {
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user!.role === 'HOD') {
        req.body.departmentId = req.user!.departmentId;
      }

      const course = await courseService.create(req.body);
      sendCreated(res, course, 'Course created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { level, semester, search } = req.query;

      let departmentId = req.query.departmentId as string;
      if (req.user!.role === 'HOD') {
        departmentId = req.user!.departmentId!;
      }

      const courses = await courseService.findAll({
        departmentId,
        level: level as Level,
        semester: semester as Semester,
        search: search as string,
      });

      sendSuccess(res, courses, 'Courses retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getByDepartmentLevelSemester(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let departmentId = req.params.departmentId;
      if (req.user!.role === 'HOD') {
        departmentId = req.user!.departmentId!;
      }

      const courses = await courseService.getByDepartmentLevelSemester(
        departmentId,
        req.params.level as Level,
        req.params.semester as Semester
      );

      sendSuccess(res, courses, 'Courses retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const course = await courseService.findById(req.params.id);
      sendSuccess(res, course, 'Course retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const course = await courseService.update(req.params.id, req.body);
      sendSuccess(res, course, 'Course updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await courseService.delete(req.params.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const courseController = new CourseController();