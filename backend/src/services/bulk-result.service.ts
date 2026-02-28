// FILE: backend/src/services/bulk-result.service.ts

import { Level, Semester, Grade } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import {
  ScoreImportRow,
  ScoreImportError,
  ScoreImportResult,
  ValidatedScoreRow,
} from '../types/index.js';
import {
  parseExcelBuffer,
  parseScoreRows,
  generateScoreErrorExcel,
} from '../utils/excel.js';
import { validateScoreRow, parseLevel, parseSemester } from '../validators/bulk.validator.js';
import { calculateResult } from '../utils/grading.js';
import { gpaService } from './gpa.service.js';

export class BulkResultService {
  /**
   * Process bulk score import from Excel file
   */
  async importScores(
    buffer: Buffer,
    userDepartmentId: string | null,
    userRole: string
  ): Promise<ScoreImportResult> {
    // Parse Excel file
    const rawData = parseExcelBuffer<any>(buffer);
    
    if (rawData.length === 0) {
      throw new AppError('Excel file is empty or has no valid data rows', 400);
    }

    // Parse rows
    const rows = parseScoreRows(rawData);

    // Get all students for validation
    const students = await prisma.student.findMany({
      select: { 
        id: true, 
        matricNumber: true, 
        departmentId: true,
        department: { select: { code: true, passMark: true } }
      },
    });
    const studentMap = new Map(students.map(s => [
      s.matricNumber.toUpperCase(), 
      { id: s.id, departmentId: s.departmentId, deptCode: s.department.code, passMark: s.department.passMark }
    ]));

    // Get all courses for validation
    const courses = await prisma.course.findMany({
      select: { 
        id: true, 
        code: true, 
        departmentId: true, 
        level: true, 
        semester: true,
        unit: true,
        department: { select: { code: true } }
      },
    });
    const courseMap = new Map(courses.map(c => [
      `${c.department.code.toUpperCase()}-${c.code.toUpperCase()}`, 
      { 
        id: c.id, 
        departmentId: c.departmentId, 
        level: c.level, 
        semester: c.semester,
        unit: c.unit 
      }
    ]));

    const validatedRows: ValidatedScoreRow[] = [];
    const errors: ScoreImportError[] = [];

    // Validate each row
    for (const row of rows) {
      const rowErrors = validateScoreRow(row);
      
      // Get student
      const student = studentMap.get(row.matricNumber.toUpperCase());
      if (!student) {
        rowErrors.push(`Student with matric number '${row.matricNumber}' not found`);
      } else {
        // For HOD, verify they can only add scores to their department
        if (userRole === 'HOD' && student.departmentId !== userDepartmentId) {
          rowErrors.push(`You can only add scores for students in your department`);
        }
      }

      // Get course - auto-detect from student's department
      let course = null;
      if (student) {
        const courseKey = `${student.deptCode.toUpperCase()}-${row.courseCode.toUpperCase()}`;
        course = courseMap.get(courseKey);
        if (!course) {
          rowErrors.push(`Course '${row.courseCode}' not found in student's department (${student.deptCode})`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          matricNumber: row.matricNumber,
          courseCode: row.courseCode,
          score: row.score,
          studentLevel: course?.level || '',
          semester: course?.semester || '',
          academicYear: row.academicYear,
          errors: rowErrors,
        });
      } else if (student && course) {
        validatedRows.push({
          ...row,
          studentId: student.id,
          courseId: course.id,
          departmentId: student.departmentId,
          departmentCode: student.deptCode,
          level: course.level,
          semesterEnum: course.semester,
          studentLevel: course.level,
          semester: course.semester,
          passMark: student.passMark,
          courseUnit: course.unit,
        });
      }
    }

    // If there are validation errors, generate error file and return
    if (errors.length > 0) {
      const errorFileBuffer = generateScoreErrorExcel(errors);
      return {
        success: false,
        totalRows: rows.length,
        successCount: 0,
        errorCount: errors.length,
        updatedCount: 0,
        errors,
        affectedStudents: [],
        errorFileBuffer,
      };
    }

    // Bulk upsert scores and recalculate GPA
    try {
      const affectedStudentIds = new Set<string>();
      let successCount = 0;
      let updatedCount = 0;

      // Check existing results in bulk
      const existingResults = await prisma.result.findMany({
        where: {
          OR: validatedRows.map(row => ({
            studentId: row.studentId,
            courseId: row.courseId,
            academicYear: row.academicYear,
          })),
        },
        select: { studentId: true, courseId: true, academicYear: true },
      });
      const existingSet = new Set(
        existingResults.map(r => `${r.studentId}-${r.courseId}-${r.academicYear}`)
      );

      // Process in smaller batches
      const BATCH_SIZE = 20;
      for (let i = 0; i < validatedRows.length; i += BATCH_SIZE) {
        const batch = validatedRows.slice(i, i + BATCH_SIZE);
        
        await prisma.$transaction(async (tx) => {
          for (const row of batch) {
            const calculation = calculateResult(row.score, row.courseUnit, row.passMark);
            const key = `${row.studentId}-${row.courseId}-${row.academicYear}`;
            const isUpdate = existingSet.has(key);

            await tx.result.upsert({
              where: {
                studentId_courseId_academicYear: {
                  studentId: row.studentId,
                  courseId: row.courseId,
                  academicYear: row.academicYear,
                },
              },
              create: {
                studentId: row.studentId,
                courseId: row.courseId,
                score: row.score,
                grade: calculation.grade,
                gradePoint: calculation.gradePoint,
                pxu: calculation.pxu,
                isCarryOver: calculation.isCarryOver,
                level: row.level,
                semester: row.semesterEnum,
                academicYear: row.academicYear,
              },
              update: {
                score: row.score,
                grade: calculation.grade,
                gradePoint: calculation.gradePoint,
                pxu: calculation.pxu,
                isCarryOver: calculation.isCarryOver,
              },
            });

            if (isUpdate) updatedCount++;
            else successCount++;
            affectedStudentIds.add(row.studentId);
          }
        }, {
          timeout: 60000,
        });
      }

      // Recalculate GPA for all affected students (outside transaction for performance)
      const affectedStudentsArray = Array.from(affectedStudentIds);
      
      // Group by student/level/semester/year for efficient recalculation
      const recalculationGroups = new Map<string, { studentId: string; level: Level; semester: Semester; academicYear: string }>();
      
      for (const row of validatedRows) {
        const key = `${row.studentId}-${row.level}-${row.semesterEnum}-${row.academicYear}`;
        if (!recalculationGroups.has(key)) {
          recalculationGroups.set(key, {
            studentId: row.studentId,
            level: row.level,
            semester: row.semesterEnum,
            academicYear: row.academicYear,
          });
        }
      }

      // Recalculate GPA for each group
      for (const group of recalculationGroups.values()) {
        try {
          await gpaService.calculateSemesterGPA(
            group.studentId,
            group.level,
            group.semester,
            group.academicYear
          );
        } catch (error) {
          console.error(`Failed to recalculate GPA for student ${group.studentId}:`, error);
        }
      }

      return {
        success: true,
        totalRows: rows.length,
        successCount,
        errorCount: 0,
        updatedCount,
        errors: [],
        affectedStudents: affectedStudentsArray,
      };
    } catch (error: any) {
      console.error('Bulk score import error:', error);
      throw new AppError(`Failed to import scores: ${error.message}`, 500);
    }
  }
}

export const bulkResultService = new BulkResultService();