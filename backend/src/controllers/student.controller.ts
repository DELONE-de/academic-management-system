// src/controllers/student.controller.ts

import { Response, NextFunction } from 'express';
import { studentService } from '../services/student.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';
import { Level } from '@prisma/client';

export class StudentController {
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // For HOD, force department to their own
      if (req.user!.role === 'HOD') {
        req.body.departmentId = req.user!.departmentId;
      }

      const student = await studentService.create(req.body);
      sendCreated(res, student, 'Student created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search, level } = req.query;

      // HOD can only see their department
      let departmentId = req.query.departmentId as string;
      if (req.user!.role === 'HOD') {
        departmentId = req.user!.departmentId!;
      }

      const { students, total } = await studentService.findAll({
        departmentId,
        level: level as Level,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
      });

      sendSuccess(res, students, 'Students retrieved successfully', 200, {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        total,
        totalPages: Math.ceil(total / (limit ? parseInt(limit as string) : 50)),
      });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const student = await studentService.findById(req.params.id);

      // Check access for HOD
      if (req.user!.role === 'HOD' && student.departmentId !== req.user!.departmentId) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      sendSuccess(res, student, 'Student retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const student = await studentService.update(req.params.id, req.body);
      sendSuccess(res, student, 'Student updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await studentService.delete(req.params.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getByDepartmentLevel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let departmentId = req.params.departmentId;
      if (req.user!.role === 'HOD') {
        departmentId = req.user!.departmentId!;
      }

      const students = await studentService.getByDepartmentLevelSemester(
        departmentId,
        req.params.level as Level
      );

      sendSuccess(res, students, 'Students retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const studentController = new StudentController();