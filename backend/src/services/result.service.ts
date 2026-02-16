// FILE: backend/src/services/result.service.ts

import { Level, Semester } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import { calculateResult } from '../utils/grading.js';
import { BulkScoreEntryInput, AddScoreInput, DeleteScoreResult } from '../types/index.js';
import { gpaService } from './gpa.service.js';

export class ResultService {
  /**
   * Enter scores for multiple students (bulk entry - existing method)
   */
  async enterScores(input: BulkScoreEntryInput, departmentId: string): Promise<any> {
    const { level, semester, academicYear, scores } = input;

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { passMark: true },
    });

    if (!department) throw new AppError('Department not found', 404);

    const results: any[] = [];
    const errors: any[] = [];
    const affectedStudentIds = new Set<string>();

    for (const scoreEntry of scores) {
      try {
        const course = await prisma.course.findUnique({
          where: { id: scoreEntry.courseId },
          select: { unit: true, departmentId: true },
        });

        if (!course) {
          errors.push({ studentId: scoreEntry.studentId, courseId: scoreEntry.courseId, error: 'Course not found' });
          continue;
        }

        if (course.departmentId !== departmentId) {
          errors.push({ studentId: scoreEntry.studentId, courseId: scoreEntry.courseId, error: 'Course does not belong to this department' });
          continue;
        }

        const calculation = calculateResult(scoreEntry.score, course.unit, department.passMark);

        const result = await prisma.result.upsert({
          where: {
            studentId_courseId_academicYear: { studentId: scoreEntry.studentId, courseId: scoreEntry.courseId, academicYear },
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
            student: { select: { matricNumber: true, firstName: true, lastName: true } },
            course: { select: { code: true, title: true, unit: true } },
          },
        });

        results.push(result);
        affectedStudentIds.add(scoreEntry.studentId);
      } catch (error: any) {
        errors.push({ studentId: scoreEntry.studentId, courseId: scoreEntry.courseId, error: error.message });
      }
    }

    // Recalculate GPA for affected students
    for (const studentId of affectedStudentIds) {
      try {
        await gpaService.calculateSemesterGPA(studentId, level, semester, academicYear);
      } catch (error) {
        console.error(`Failed to recalculate GPA for student ${studentId}:`, error);
      }
    }

    return { successCount: results.length, errorCount: errors.length, results, errors };
  }

  /**
   * Add a single score with validation and GPA recalculation
   */
  async addSingleScore(input: AddScoreInput, departmentId: string): Promise<any> {
    const { studentId, courseId, score, level, semester, academicYear } = input;

    // Verify student exists and belongs to department
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { department: { select: { id: true, passMark: true } } },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    if (student.departmentId !== departmentId) {
      throw new AppError('Student does not belong to your department', 403);
    }

    // Verify course exists and belongs to department
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, unit: true, departmentId: true, level: true, semester: true, code: true, title: true },
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.departmentId !== departmentId) {
      throw new AppError('Course does not belong to your department', 403);
    }

    // Validate course level and semester match
    if (course.level !== level) {
      throw new AppError(`Course ${course.code} is for ${course.level}, not ${level}`, 400);
    }

    if (course.semester !== semester) {
      throw new AppError(`Course ${course.code} is for ${course.semester} semester, not ${semester}`, 400);
    }

    // Calculate grade, grade point, and PXU
    const calculation = calculateResult(score, course.unit, student.department.passMark);

    // Upsert result
    const result = await prisma.result.upsert({
      where: {
        studentId_courseId_academicYear: { studentId, courseId, academicYear },
      },
      create: {
        studentId,
        courseId,
        score,
        grade: calculation.grade,
        gradePoint: calculation.gradePoint,
        pxu: calculation.pxu,
        isCarryOver: calculation.isCarryOver,
        level,
        semester,
        academicYear,
      },
      update: {
        score,
        grade: calculation.grade,
        gradePoint: calculation.gradePoint,
        pxu: calculation.pxu,
        isCarryOver: calculation.isCarryOver,
      },
      include: {
        student: { select: { matricNumber: true, firstName: true, lastName: true } },
        course: { select: { code: true, title: true, unit: true } },
      },
    });

    // Recalculate GPA
    const gpaResult = await gpaService.calculateSemesterGPA(studentId, level, semester, academicYear);

    return {
      result,
      gpa: gpaResult.semesterGPA.gpa,
      cgpa: gpaResult.cgpa,
    };
  }

  /**
   * Delete a single score with GPA recalculation
   */
  async deleteSingleScore(resultId: string, departmentId: string): Promise<DeleteScoreResult> {
    // Find the result
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        student: { select: { id: true, departmentId: true } },
        course: { select: { code: true } },
      },
    });

    if (!result) {
      throw new AppError('Result not found', 404);
    }

    if (result.student.departmentId !== departmentId) {
      throw new AppError('You do not have permission to delete this result', 403);
    }

    const { studentId, level, semester, academicYear } = result;

    // Delete the result
    const deletedResult = await prisma.result.delete({
      where: { id: resultId },
      include: {
        student: { select: { matricNumber: true, firstName: true, lastName: true } },
        course: { select: { code: true, title: true } },
      },
    });

    // Check if there are any remaining results for this semester
    const remainingResults = await prisma.result.count({
      where: { studentId, level, semester, academicYear },
    });

    let gpaRecalculated = false;

    if (remainingResults > 0) {
      // Recalculate GPA
      await gpaService.calculateSemesterGPA(studentId, level, semester, academicYear);
      gpaRecalculated = true;
    } else {
      // Delete the semester GPA record if no results remain
      await prisma.semesterGPA.deleteMany({
        where: { studentId, level, semester, academicYear },
      });
    }

    return {
      success: true,
      deletedResult,
      gpaRecalculated,
    };
  }

  /**
   * Get results for a student by semester
   */
  async getStudentResults(studentId: string, level?: Level, semester?: Semester, academicYear?: string): Promise<any[]> {
    const where: any = { studentId };
    if (level) where.level = level;
    if (semester) where.semester = semester;
    if (academicYear) where.academicYear = academicYear;

    return prisma.result.findMany({
      where,
      include: { course: { select: { code: true, title: true, unit: true } } },
      orderBy: [{ level: 'asc' }, { semester: 'asc' }, { course: { code: 'asc' } }],
    });
  }

  /**
   * Get all results for a department by level and semester
   */
  async getDepartmentResults(departmentId: string, level: Level, semester: Semester, academicYear: string): Promise<any[]> {
    return prisma.result.findMany({
      where: { level, semester, academicYear, student: { departmentId } },
      include: {
        student: { select: { id: true, matricNumber: true, firstName: true, lastName: true } },
        course: { select: { id: true, code: true, title: true, unit: true } },
      },
      orderBy: [{ student: { matricNumber: 'asc' } }, { course: { code: 'asc' } }],
    });
  }

  /**
   * Update a single result (existing method)
   */
  async updateResult(resultId: string, score: number, departmentId: string): Promise<any> {
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: { course: { select: { unit: true } }, student: { select: { departmentId: true } } },
    });

    if (!result) throw new AppError('Result not found', 404);
    if (result.student.departmentId !== departmentId) throw new AppError('Access denied to this result', 403);

    const department = await prisma.department.findUnique({ where: { id: departmentId }, select: { passMark: true } });
    if (!department) throw new AppError('Department not found', 404);

    const calculation = calculateResult(score, result.course.unit, department.passMark);

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
        student: { select: { matricNumber: true, firstName: true, lastName: true } },
        course: { select: { code: true, title: true, unit: true } },
      },
    });

    // Recalculate GPA
    await gpaService.calculateSemesterGPA(result.studentId, result.level, result.semester, result.academicYear);

    return updated;
  }

  /**
   * Delete a result (existing method - now calls deleteSingleScore)
   */
  async deleteResult(resultId: string, departmentId: string): Promise<void> {
    await this.deleteSingleScore(resultId, departmentId);
  }

  /**
   * Get carry-over courses for a student
   */
  async getCarryOverCourses(studentId: string): Promise<any[]> {
    return prisma.result.findMany({
      where: { studentId, isCarryOver: true },
      include: { course: { select: { code: true, title: true, unit: true, level: true, semester: true } } },
      orderBy: [{ level: 'asc' }, { semester: 'asc' }],
    });
  }

  /**
   * Get all results for a student with GPA info
   */
  async getStudentResultsWithGPA(studentId: string): Promise<any> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        department: { select: { name: true, code: true } },
        results: {
          include: { course: { select: { code: true, title: true, unit: true } } },
          orderBy: [{ level: 'asc' }, { semester: 'asc' }],
        },
        semesterGpas: {
          orderBy: [{ level: 'asc' }, { semester: 'asc' }],
        },
      },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    return student;
  }
}

export const resultService = new ResultService();