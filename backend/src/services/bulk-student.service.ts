// FILE: backend/src/services/bulk-student.service.ts

import { Level } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import {
  StudentImportRow,
  StudentImportError,
  StudentImportResult,
  ValidatedStudentRow,
} from '../types/index.js';
import {
  parseExcelBuffer,
  parseStudentRows,
  generateStudentErrorExcel,
} from '../utils/excel.js';
import { validateStudentRow, parseLevel } from '../validators/bulk.validator.js';

export class BulkStudentService {
  /**
   * Process bulk student import from Excel file
   */
  async importStudents(
    buffer: Buffer,
    userDepartmentId: string | null,
    userRole: string
  ): Promise<StudentImportResult> {
    // Parse Excel file
    const rawData = parseExcelBuffer<any>(buffer);
    
    if (rawData.length === 0) {
      throw new AppError('Excel file is empty or has no valid data rows', 400);
    }

    // Parse rows
    const rows = parseStudentRows(rawData);
    
    // Get all departments for validation
    const departments = await prisma.department.findMany({
      select: { id: true, code: true },
    });
    const departmentMap = new Map(departments.map(d => [d.code.toUpperCase(), d.id]));

    // Get existing matric numbers for duplicate check
    const existingMatrics = await prisma.student.findMany({
      select: { matricNumber: true },
    });
    const existingMatricSet = new Set(existingMatrics.map(s => s.matricNumber.toUpperCase()));

    const validatedRows: ValidatedStudentRow[] = [];
    const errors: StudentImportError[] = [];
    let skippedCount = 0;

    // Validate each row
    for (const row of rows) {
      const rowErrors = validateStudentRow(row);
      
      // Check if department exists
      const departmentId = departmentMap.get(row.departmentCode.toUpperCase());
      if (!departmentId) {
        rowErrors.push(`Department with code '${row.departmentCode}' not found`);
      }

      // For HOD, verify they can only import to their department
      if (userRole === 'HOD' && departmentId && departmentId !== userDepartmentId) {
        rowErrors.push(`You can only import students to your own department`);
      }

      // Check for duplicate matric number
      if (existingMatricSet.has(row.matricNumber.toUpperCase())) {
        rowErrors.push(`Student with matric number '${row.matricNumber}' already exists`);
        skippedCount++;
      }

      if (rowErrors.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          matricNumber: row.matricNumber,
          firstName: row.firstName,
          lastName: row.lastName,
          departmentCode: row.departmentCode,
          admissionYear: row.admissionYear,
          studentLevel: row.studentLevel,
          errors: rowErrors,
        });
      } else {
        const level = parseLevel(row.studentLevel);
        if (level && departmentId) {
          validatedRows.push({
            ...row,
            departmentId,
            level,
          });
          // Add to set to catch duplicates within the file
          existingMatricSet.add(row.matricNumber.toUpperCase());
        }
      }
    }

    // If there are errors, generate error file and return
    if (errors.length > 0) {
      const errorFileBuffer = generateStudentErrorExcel(errors);
      return {
        success: false,
        totalRows: rows.length,
        successCount: 0,
        errorCount: errors.length,
        skippedCount,
        errors,
        errorFileBuffer,
      };
    }

    // Bulk insert valid students using transaction
    try {
      const result = await prisma.$transaction(async (tx) => {
        const studentsToCreate = validatedRows.map(row => ({
          matricNumber: row.matricNumber.toUpperCase(),
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          middleName: row.middleName?.trim() || null,
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          currentLevel: row.level,
          admissionYear: row.admissionYear,
          departmentId: row.departmentId,
          isActive: true,
        }));

        const created = await tx.student.createMany({
          data: studentsToCreate,
          skipDuplicates: true,
        });

        return created;
      });

      return {
        success: true,
        totalRows: rows.length,
        successCount: result.count,
        errorCount: 0,
        skippedCount: validatedRows.length - result.count,
        errors: [],
      };
    } catch (error: any) {
      console.error('Bulk student import error:', error);
      throw new AppError(`Failed to import students: ${error.message}`, 500);
    }
  }
}

export const bulkStudentService = new BulkStudentService();