// src/services/result.service.ts

import { Level, Semester } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import { calculateResult } from '../utils/grading.js';
import { BulkScoreEntryInput } from '../validators/result.validator.js';

export class ResultService {
  /**
   * Enters scores for multiple students (bulk entry)
   */
  async enterScores(input: BulkScoreEntryInput, departmentId: string): Promise<any> {
    const { level, semester, academicYear, scores } = input;

    // Get department pass mark
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { passMark: true },
    });

    if (!department) {
      throw new AppError('Department not found', 404);
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const scoreEntry of scores) {
      try {
        // Get course unit
        const course = await prisma.course.findUnique({
          where: { id: scoreEntry.courseId },
          select: { unit: true, departmentId: true },
        });

        if (!course) {
          errors.push({
            studentId: scoreEntry.studentId,
            courseId: scoreEntry.courseId,
            error: 'Course not found',
          });
          continue;
        }

        // Verify course belongs to department
        if (course.departmentId !== departmentId) {
          errors.push({
            studentId: scoreEntry.studentId,
            courseId: scoreEntry.courseId,
            error: 'Course does not belong to this department',
          });
          continue;
        }

        // Calculate grade, point, and PXU
        const calculation = calculateResult(
          scoreEntry.score,
          course.unit,
          department.passMark
        );

        // Upsert result
        const result = await prisma.result.upsert({
          where: {
            studentId_courseId_academicYear: {
              studentId: scoreEntry.studentId,
              courseId: scoreEntry.courseId,
              academicYear,
            },
          },
          create: {
            studentId: scoreEntry.studentId,
            courseId: scoreEntry.courseId,
            score: scoreEntry.score,
            grade: calculation.grade,
            gradePoint: calculation.gradePoint,
            pxu: calculation.pxu,
            isCarryOver: calculation.isCarryOver,
            level,
            semester,
            academicYear,
          },
          update: {
            score: scoreEntry.score,
            grade: calculation.grade,
            gradePoint: calculation.gradePoint,
            pxu: calculation.pxu,
            isCarryOver: calculation.isCarryOver,
          },
          include: {
            student: {
              select: { matricNumber: true, firstName: true, lastName: true },
            },
            course: {
              select: { code: true, title: true, unit: true },
            },
          },
        });

        results.push(result);
      } catch (error: any) {
        errors.push({
          studentId: scoreEntry.studentId,
          courseId: scoreEntry.courseId,
          error: error.message,
        });
      }
    }

    return {
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors,
    };
  }

  /**
   * Gets results for a student by semester
   */
  async getStudentResults(
    studentId: string,
    level?: Level,
    semester?: Semester,
    academicYear?: string
  ): Promise<any[]> {
    const where: any = { studentId };

    if (level) where.level = level;
    if (semester) where.semester = semester;
    if (academicYear) where.academicYear = academicYear;

    const results = await prisma.result.findMany({
      where,
      include: {
        course: {
          select: {
            code: true,
            title: true,
            unit: true,
          },
        },
      },
      orderBy: [{ level: 'asc' }, { semester: 'asc' }, { course: { code: 'asc' } }],
    });

    return results;
  }

  /**
   * Gets all results for a department by level and semester
   */
  async getDepartmentResults(
    departmentId: string,
    level: Level,
    semester: Semester,
    academicYear: string
  ): Promise<any[]> {
    const results = await prisma.result.findMany({
      where: {
        level,
        semester,
        academicYear,
        student: {
          departmentId,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            matricNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            unit: true,
          },
        },
      },
      orderBy: [
        { student: { matricNumber: 'asc' } },
        { course: { code: 'asc' } },
      ],
    });

    return results;
  }

  /**
   * Updates a single result
   */
  async updateResult(
    resultId: string,
    score: number,
    departmentId: string
  ): Promise<any> {
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        course: {
          select: { unit: true, departmentId: true },
        },
        student: {
          select: { departmentId: true },
        },
      },
    });

    if (!result) {
      throw new AppError('Result not found', 404);
    }

    // Verify department access
    if (result.student.departmentId !== departmentId) {
      throw new AppError('Access denied to this result', 403);
    }

    // Get department pass mark
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { passMark: true },
    });

    if (!department) {
      throw new AppError('Department not found', 404);
    }

    // Recalculate
    const calculation = calculateResult(
      score,
      result.course.unit,
      department.passMark
    );

    const updated = await prisma.result.update({
      where: { id: resultId },
      data: {
        score,
        grade: calculation.grade,
        gradePoint: calculation.gradePoint,
        pxu: calculation.pxu,
        isCarryOver: calculation.isCarryOver,
      },
      include: {
        student: {
          select: { matricNumber: true, firstName: true, lastName: true },
        },
        course: {
          select: { code: true, title: true, unit: true },
        },
      },
    });

    return updated;
  }

  /**
   * Deletes a result
   */
  async deleteResult(resultId: string, departmentId: string): Promise<void> {
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        student: {
          select: { departmentId: true },
        },
      },
    });

    if (!result) {
      throw new AppError('Result not found', 404);
    }

    if (result.student.departmentId !== departmentId) {
      throw new AppError('Access denied to this result', 403);
    }

    await prisma.result.delete({
      where: { id: resultId },
    });
  }

  /**
   * Gets carry-over courses for a student
   */
  async getCarryOverCourses(studentId: string): Promise<any[]> {
    const carryOvers = await prisma.result.findMany({
      where: {
        studentId,
        isCarryOver: true,
      },
      include: {
        course: {
          select: {
            code: true,
            title: true,
            unit: true,
            level: true,
            semester: true,
          },
        },
      },
      orderBy: [{ level: 'asc' }, { semester: 'asc' }],
    });

    return carryOvers;
  }
}

export const resultService = new ResultService();