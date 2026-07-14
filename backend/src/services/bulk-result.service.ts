// FILE: backend/src/services/bulk-result.service.ts

import { Level, Semester } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import { ScoreImportError, ScoreImportResult } from '../types/index.js';
import { parseExcelBuffer, parseScoreRows, generateScoreErrorExcel } from '../utils/excel.js';
import { validateScoreRow } from '../validators/bulk.validator.js';
import { calculateResult } from '../utils/grading.js';
import { gpaService } from './gpa.service.js';

export class BulkResultService {
  async importScores(
    buffer: Buffer,
    userDepartmentId: string | null,
    userRole: string,
    departmentCode: string
  ): Promise<ScoreImportResult> {
    const rawData = parseExcelBuffer<any>(buffer);
    if (rawData.length === 0) {
      throw new AppError('Excel file is empty or has no valid data rows', 400);
    }

    // Each row = one student with many courses
    const studentRows = parseScoreRows(rawData);

    // Load all students and courses in two queries
    const students = await prisma.student.findMany({
      select: {
        id: true,
        matricNumber: true,
        departmentId: true,
        department: { select: { code: true, passMark: true } },
      },
    });
    const studentMap = new Map(
      students.map((s) => [
        s.matricNumber.toUpperCase(),
        { id: s.id, departmentId: s.departmentId, deptCode: s.department.code, passMark: s.department.passMark },
      ])
    );

    const courses = await prisma.course.findMany({
      select: {
        id: true,
        code: true,
        departmentId: true,
        level: true,
        semester: true,
        unit: true,
        department: { select: { code: true } },
      },
    });
    // key: DEPTCODE-COURSECODE
    const courseMap = new Map(
      courses.map((c) => [
        `${c.department.code.toUpperCase()}-${c.code.toUpperCase()}`,
        { id: c.id, departmentId: c.departmentId, level: c.level, semester: c.semester, unit: c.unit },
      ])
    );

    // Flatten student rows into validated per-course entries
    type ValidEntry = {
      studentId: string;
      courseId: string;
      score: number;
      level: Level;
      semester: Semester;
      academicYear: string;
      passMark: number;
      unit: number;
    };

    const validEntries: ValidEntry[] = [];
    const errors: ScoreImportError[] = [];

    for (const row of studentRows) {
      const student = studentMap.get(row.matricNumber.toUpperCase());

      if (!student) {
        errors.push({
          rowNumber: row.rowNumber,
          matricNumber: row.matricNumber,
          courseCode: '—',
          score: 0,
          studentLevel: '',
          semester: '',
          academicYear: row.academicYear,
          errors: [`Student '${row.matricNumber}' not found`],
        });
        continue;
      }

      if (userRole === 'HOD' && student.departmentId !== userDepartmentId) {
        errors.push({
          rowNumber: row.rowNumber,
          matricNumber: row.matricNumber,
          courseCode: '—',
          score: 0,
          studentLevel: '',
          semester: '',
          academicYear: row.academicYear,
          errors: ['You can only add scores for students in your department'],
        });
        continue;
      }

      // Validate each course entry for this student
      for (const c of row.courses) {
        const courseErrors = validateScoreRow({
          matricNumber: row.matricNumber,
          courseCode: c.courseCode,
          score: c.score,
          academicYear: row.academicYear,
          rowNumber: row.rowNumber,
        });

        const courseKey = `${departmentCode.toUpperCase()}-${c.courseCode.toUpperCase()}`;
        const course = courseMap.get(courseKey);

        if (!course) {
          courseErrors.push(`Course '${c.courseCode}' not found in department '${student.deptCode}'`);
        }

        if (courseErrors.length > 0) {
          errors.push({
            rowNumber: row.rowNumber,
            matricNumber: row.matricNumber,
            courseCode: c.courseCode,
            score: c.score,
            studentLevel: course?.level ?? '',
            semester: course?.semester ?? '',
            academicYear: row.academicYear,
            errors: courseErrors,
          });
        } else if (course) {
          validEntries.push({
            studentId: student.id,
            courseId: course.id,
            score: c.score,
            level: course.level,
            semester: course.semester,
            academicYear: row.academicYear,
            passMark: student.passMark,
            unit: course.unit,
          });
        }
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        totalRows: studentRows.reduce((sum, r) => sum + r.courses.length, 0),
        successCount: 0,
        errorCount: errors.length,
        updatedCount: 0,
        errors,
        affectedStudents: [],
        errorFileBuffer: generateScoreErrorExcel(errors),
      };
    }

    try {
      const affectedStudentIds = new Set<string>();
      let successCount = 0;
      let updatedCount = 0;

      const existingResults = await prisma.result.findMany({
        where: {
          OR: validEntries.map((e) => ({
            studentId: e.studentId,
            courseId: e.courseId,
            academicYear: e.academicYear,
          })),
        },
        select: { id: true, studentId: true, courseId: true, academicYear: true },
      });
      const existingMap = new Map(
        existingResults.map((r) => [`${r.studentId}-${r.courseId}-${r.academicYear}`, r.id])
      );

      const newRecords: any[] = [];
      const updateRecords: any[] = [];

      for (const entry of validEntries) {
        const calc = calculateResult(entry.score, entry.unit, entry.passMark);
        const key = `${entry.studentId}-${entry.courseId}-${entry.academicYear}`;
        const existingId = existingMap.get(key);

        affectedStudentIds.add(entry.studentId);

        if (existingId) {
          updateRecords.push({ id: existingId, ...calc });
          updatedCount++;
        } else {
          newRecords.push({
            studentId: entry.studentId,
            courseId: entry.courseId,
            score: entry.score,
            grade: calc.grade,
            gradePoint: calc.gradePoint,
            pxu: calc.pxu,
            isCarryOver: calc.isCarryOver,
            level: entry.level,
            semester: entry.semester,
            academicYear: entry.academicYear,
          });
          successCount++;
        }
      }

      if (newRecords.length > 0) {
        await prisma.result.createMany({ data: newRecords, skipDuplicates: true });
      }

      for (const record of updateRecords) {
        await prisma.result.update({
          where: { id: record.id },
          data: {
            score: record.score,
            grade: record.grade,
            gradePoint: record.gradePoint,
            pxu: record.pxu,
            isCarryOver: record.isCarryOver,
          },
        });
      }

      // Recalculate GPA per student/level/semester/year group
      const recalcGroups = new Map<string, { studentId: string; level: Level; semester: Semester; academicYear: string }>();
      for (const entry of validEntries) {
        const key = `${entry.studentId}-${entry.level}-${entry.semester}-${entry.academicYear}`;
        if (!recalcGroups.has(key)) {
          recalcGroups.set(key, {
            studentId: entry.studentId,
            level: entry.level,
            semester: entry.semester,
            academicYear: entry.academicYear,
          });
        }
      }

      for (const group of recalcGroups.values()) {
        try {
          await gpaService.calculateSemesterGPA(
            group.studentId,
            group.level,
            group.semester,
            group.academicYear
          );
        } catch (err) {
          console.error(`GPA recalc failed for ${group.studentId}:`, err);
        }
      }

      return {
        success: true,
        totalRows: validEntries.length,
        successCount,
        errorCount: 0,
        updatedCount,
        errors: [],
        affectedStudents: Array.from(affectedStudentIds),
      };
    } catch (error: any) {
      throw new AppError(`Failed to import scores: ${error.message}`, 500);
    }
  }
}

export const bulkResultService = new BulkResultService();
