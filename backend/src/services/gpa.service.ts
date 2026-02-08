// src/services/gpa.service.ts

import { Level, Semester } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import { calculateGPA, calculateCGPA } from '../utils/grading.js';

export class GPAService {
  /**
   * Calculates and stores semester GPA for a student
   */
  async calculateSemesterGPA(
    studentId: string,
    level: Level,
    semester: Semester,
    academicYear: string
  ): Promise<any> {
    // Get all results for the semester
    const results = await prisma.result.findMany({
      where: {
        studentId,
        level,
        semester,
        academicYear,
      },
      include: {
        course: {
          select: { unit: true },
        },
        student: {
          select: {
            department: {
              select: { passMark: true },
            },
          },
        },
      },
    });

    if (results.length === 0) {
      throw new AppError('No results found for this semester', 404);
    }

    const passMark = results[0].student.department.passMark;

    // Calculate GPA
    const gpaData = calculateGPA(
      results.map((r) => ({
        score: r.score,
        unit: r.course.unit,
        passMark,
      }))
    );

    // Calculate cumulative data for CGPA
    const allSemesterGpas = await prisma.semesterGPA.findMany({
      where: {
        studentId,
        NOT: {
          AND: [{ level }, { semester }, { academicYear }],
        },
      },
    });

    const cgpaData = calculateCGPA([
      ...allSemesterGpas.map((s) => ({
        gpa: s.gpa,
        totalUnits: s.totalUnits,
        totalPoints: s.totalPoints,
      })),
      gpaData,
    ]);

    // Upsert semester GPA
    const semesterGPA = await prisma.semesterGPA.upsert({
      where: {
        studentId_level_semester_academicYear: {
          studentId,
          level,
          semester,
          academicYear,
        },
      },
      create: {
        studentId,
        level,
        semester,
        academicYear,
        gpa: gpaData.gpa,
        totalUnits: gpaData.totalUnits,
        totalPoints: gpaData.totalPoints,
        cumulativeGpa: cgpaData.cgpa,
        cumulativeUnits: cgpaData.cumulativeUnits,
      },
      update: {
        gpa: gpaData.gpa,
        totalUnits: gpaData.totalUnits,
        totalPoints: gpaData.totalPoints,
        cumulativeGpa: cgpaData.cgpa,
        cumulativeUnits: cgpaData.cumulativeUnits,
      },
    });

    return {
      semesterGPA,
      cgpa: cgpaData.cgpa,
    };
  }

  /**
   * Gets semester GPA for a student
   */
  async getSemesterGPA(
    studentId: string,
    level: Level,
    semester: Semester,
    academicYear: string
  ): Promise<any> {
    const semesterGPA = await prisma.semesterGPA.findUnique({
      where: {
        studentId_level_semester_academicYear: {
          studentId,
          level,
          semester,
          academicYear,
        },
      },
    });

    if (!semesterGPA) {
      // Calculate on-the-fly if not stored
      const results = await prisma.result.findMany({
        where: {
          studentId,
          level,
          semester,
          academicYear,
        },
        include: {
          course: {
            select: { unit: true },
          },
          student: {
            select: {
              department: {
                select: { passMark: true },
              },
            },
          },
        },
      });

      if (results.length === 0) {
        throw new AppError('No results found for this semester', 404);
      }

      const passMark = results[0].student.department.passMark;
      const gpaData = calculateGPA(
        results.map((r) => ({
          score: r.score,
          unit: r.course.unit,
          passMark,
        }))
      );

      return {
        gpa: gpaData.gpa,
        totalUnits: gpaData.totalUnits,
        totalPoints: gpaData.totalPoints,
        calculated: true,
      };
    }

    return semesterGPA;
  }

  /**
   * Gets all semester GPAs for a student (for CGPA view)
   */
  async getStudentGPAHistory(studentId: string): Promise<any> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        matricNumber: true,
        firstName: true,
        lastName: true,
        currentLevel: true,
        department: {
          select: { passMark: true },
        },
      },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    const semesterGpas = await prisma.semesterGPA.findMany({
      where: { studentId },
      orderBy: [{ level: 'asc' }, { semester: 'asc' }, { academicYear: 'asc' }],
    });

    // Calculate current CGPA
    const cgpaData = calculateCGPA(
      semesterGpas.map((s) => ({
        gpa: s.gpa,
        totalUnits: s.totalUnits,
        totalPoints: s.totalPoints,
      }))
    );

    return {
      student: {
        id: student.id,
        matricNumber: student.matricNumber,
        name: `${student.firstName} ${student.lastName}`,
        currentLevel: student.currentLevel,
      },
      semesterGpas,
      cgpa: cgpaData.cgpa,
      totalUnits: cgpaData.cumulativeUnits,
      totalPoints: cgpaData.cumulativePoints,
    };
  }

  /**
   * Calculates GPAs for all students in a department for a semester
   */
  async calculateDepartmentGPAs(
    departmentId: string,
    level: Level,
    semester: Semester,
    academicYear: string
  ): Promise<any> {
    // Get all students in the department with results for this semester
    const students = await prisma.student.findMany({
      where: {
        departmentId,
        results: {
          some: {
            level,
            semester,
            academicYear,
          },
        },
      },
      select: { id: true },
    });

    const results: any[] = [];
    const errors: any[] = [];

    for (const student of students) {
      try {
        const gpa = await this.calculateSemesterGPA(
          student.id,
          level,
          semester,
          academicYear
        );
        results.push({ studentId: student.id, ...gpa });
      } catch (error: any) {
        errors.push({ studentId: student.id, error: error.message });
      }
    }

    return {
      calculated: results.length,
      errors: errors.length,
      results,
      errorDetails: errors,
    };
  }

  /**
   * Gets department GPA statistics
   */
  async getDepartmentGPAStats(
    departmentId: string,
    level?: Level,
    semester?: Semester,
    academicYear?: string
  ): Promise<any> {
    const where: any = {
      student: {
        departmentId,
      },
    };

    if (level) where.level = level;
    if (semester) where.semester = semester;
    if (academicYear) where.academicYear = academicYear;

    const gpas = await prisma.semesterGPA.findMany({
      where,
      select: {
        gpa: true,
        student: {
          select: {
            id: true,
            matricNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { gpa: 'desc' },
    });

    if (gpas.length === 0) {
      return {
        count: 0,
        highestGpa: null,
        lowestGpa: null,
        averageGpa: null,
      };
    }

    const gpaValues = gpas.map((g) => g.gpa);
    const average = gpaValues.reduce((a, b) => a + b, 0) / gpaValues.length;

    return {
      count: gpas.length,
      highestGpa: {
        value: gpas[0].gpa,
        student: gpas[0].student,
      },
      lowestGpa: {
        value: gpas[gpas.length - 1].gpa,
        student: gpas[gpas.length - 1].student,
      },
      averageGpa: Math.round(average * 100) / 100,
      distribution: {
        firstClass: gpaValues.filter((g) => g >= 4.5).length,
        secondUpper: gpaValues.filter((g) => g >= 3.5 && g < 4.5).length,
        secondLower: gpaValues.filter((g) => g >= 2.4 && g < 3.5).length,
        thirdClass: gpaValues.filter((g) => g >= 1.5 && g < 2.4).length,
        pass: gpaValues.filter((g) => g >= 1.0 && g < 1.5).length,
        fail: gpaValues.filter((g) => g < 1.0).length,
      },
    };
  }
}

export const gpaService = new GPAService();