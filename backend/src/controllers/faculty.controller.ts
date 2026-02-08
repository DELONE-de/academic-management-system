// src/controllers/faculty.controller.ts

import { Response, NextFunction } from 'express';
import { facultyService } from '../services/faculty.service.js';
import { sendSuccess } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';

export class FacultyController {
  async findAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const faculties = await facultyService.findAll();
      sendSuccess(res, faculties, 'Faculties retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const faculty = await facultyService.findById(req.params.id);

      // Check access for DEAN
      if (req.user!.role === 'DEAN' && faculty.id !== req.user!.facultyId) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      sendSuccess(res, faculty, 'Faculty retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMyFaculty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user!.role !== 'DEAN' || !req.user!.facultyId) {
        res.status(400).json({ success: false, message: 'No faculty assigned' });
        return;
      }

      const faculty = await facultyService.findById(req.user!.facultyId);
      sendSuccess(res, faculty, 'Faculty retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const facultyController = new FacultyController();