// FILE: backend/src/controllers/bulk.controller.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { bulkStudentService } from '../services/bulk-student.service.js';
import { bulkResultService } from '../services/bulk-result.service.js';
import { sendSuccess, sendBadRequest } from '../utils/response.js';
import { generateStudentTemplate, generateScoreTemplate } from '../utils/excel.js';

export class BulkController {
  /**
   * Bulk import students from Excel file
   * POST /api/students/bulk-upload
   */
  async bulkImportStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        sendBadRequest(res, 'No file uploaded. Please upload an Excel file.');
        return;
      }

      const result = await bulkStudentService.importStudents(
        req.file.buffer,
        req.user!.departmentId || null,
        req.user!.role
      );

      if (!result.success && result.errorFileBuffer) {
        // Send error file for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=student_import_errors.xlsx');
        res.setHeader('X-Import-Success', 'false');
        res.setHeader('X-Total-Rows', result.totalRows.toString());
        res.setHeader('X-Error-Count', result.errorCount.toString());
        res.send(result.errorFileBuffer);
        return;
      }

      sendSuccess(res, {
        totalRows: result.totalRows,
        successCount: result.successCount,
        skippedCount: result.skippedCount,
        errorCount: result.errorCount,
      }, `Successfully imported ${result.successCount} students. ${result.skippedCount} skipped (duplicates).`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk import scores from Excel file
   * POST /api/results/bulk-upload
   */
  async bulkImportScores(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        sendBadRequest(res, 'No file uploaded. Please upload an Excel file.');
        return;
      }

      const result = await bulkResultService.importScores(
        req.file.buffer,
        req.user!.departmentId || null,
        req.user!.role
      );

      if (!result.success && result.errorFileBuffer) {
        // Send error file for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=score_import_errors.xlsx');
        res.setHeader('X-Import-Success', 'false');
        res.setHeader('X-Total-Rows', result.totalRows.toString());
        res.setHeader('X-Error-Count', result.errorCount.toString());
        res.send(result.errorFileBuffer);
        return;
      }

      sendSuccess(res, {
        totalRows: result.totalRows,
        successCount: result.successCount,
        updatedCount: result.updatedCount,
        errorCount: result.errorCount,
        affectedStudents: result.affectedStudents.length,
      }, `Successfully processed ${result.successCount} new scores and updated ${result.updatedCount} existing scores. GPA recalculated for ${result.affectedStudents.length} students.`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download student upload template
   * GET /api/students/bulk-upload/template
   */
  async downloadStudentTemplate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const buffer = generateStudentTemplate();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=student_upload_template.xlsx');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download score upload template
   * GET /api/results/bulk-upload/template
   */
  async downloadScoreTemplate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const buffer = generateScoreTemplate();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=score_upload_template.xlsx');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export const bulkController = new BulkController();