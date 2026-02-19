// src/controllers/department.controller.ts

import { Response, NextFunction } from 'express';
import { departmentService } from '../services/department.service.js';
import { sendSuccess } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';

export class DepartmentController {
  async findAllPublic(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await departmentService.findAll();
      sendSuccess(res, departments, 'Departments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // DEAN can only see their faculty's departments
      let facultyId = req.query.facultyId as string;
      if (req.user!.role === 'DEAN') {
        facultyId = req.user!.facultyId!;
      }

      const departments = await departmentService.findAll(facultyId);
      sendSuccess(res, departments, 'Departments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = await departmentService.findById(req.params.id);

      // Check access for HOD
      if (req.user!.role === 'HOD' && department.id !== req.user!.departmentId) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      // Check access for DEAN
      if (req.user!.role === 'DEAN' && department.facultyId !== req.user!.facultyId) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      sendSuccess(res, department, 'Department retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMyDepartment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user!.role !== 'HOD' || !req.user!.departmentId) {
        res.status(400).json({ success: false, message: 'No department assigned' });
        return;
      }

      const department = await departmentService.findById(req.user!.departmentId);
      sendSuccess(res, department, 'Department retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const departmentController = new DepartmentController();