// FILE: backend/src/services/gpa.service.ts

import { Level, Semester } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import { calculateGPA, calculateCGPA } from '../utils/grading.js';
import { GPARecalculationResult } from '../types/index.js';

export class GPAService {
  /**
   * Calculate and store semester GPA for a student
   */
  async calculateSemesterGPA(
    studentId: string,
    level: Level,
    semester: Semester,
    academicYear: string
  ): Promise<{ semesterGPA: any; cgpa: number }> {
    // Get all results for the semester
    const results = await prisma.result.findMany({
      where: { studentId, level, semester, academicYear },
      include: {
        course: { select: { unit: true } },
        student: { select: { department: { select: { passMark: true } } } },
      },
    });

    if (results.length === 0) {
      // No results, delete any existing GPA record
      await prisma.semesterGPA.deleteMany({
        where: { studentId, level, semester, academicYear },
      });
      
      // Return current CGPA
      const allGpas = await prisma.semesterGPA.findMany({
        where: { studentId },
      });
      
      const cgpaData = calculateCGPA(
        allGpas.map(g => ({ gpa: g.gpa, totalUnits: g.totalUnits, totalPoints: g.totalPoints }))
      );
      
      return { semesterGPA: null, cgpa: cgpaData.cgpa };
    }

    const passMark = results[0].student.department.passMark;

    // Calculate GPA using existing grading logic
    const gpaData = calculateGPA(
      results.map(r => ({ score: r.score, unit: r.course.unit, passMark }))
    );

    // Get all other semester GPAs for CGPA calculation
    const otherGpas = await prisma.semesterGPA.findMany({
      where: {
        studentId,
        NOT: { AND: [{ level }, { semester }, { academicYear }] },
      },
    });

    // Calculate CGPA including current semester
    const cgpaData = calculateCGPA([
      ...otherGpas.map(g => ({ gpa: g.gpa, totalUnits: g.totalUnits, totalPoints: g.totalPoints })),
      gpaData,
    ]);

    // Upsert semester GPA
    const semesterGPA = await prisma.semesterGPA.upsert({
      where: {
        studentId_level_semester_academicYear: { studentId, level, semester, academicYear },
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

    return { semesterGPA, cgpa: cgpaData.cgpa };
  }

  /**
   * Recalculate GPA for a specific student/level/semester/year
   */
  async recalculateGPA(
    studentId: string,
    level: Level,
    semester: Semester,
    academicYear: string
  ): Promise<GPARecalculationResult> {
    const result = await this.calculateSemesterGPA(studentId, level, semester, academicYear);
    
    return {
      studentId,
      level,
      semester,
      academicYear,
      gpa: result.semesterGPA?.gpa || 0,
      cgpa: result.cgpa,
      totalUnits: result.semesterGPA?.totalUnits || 0,
      totalPoints: result.semesterGPA?.totalPoints || 0,
    };
  }

  /**
   * Get semester GPA for a student
   */
  async getSemesterGPA(
    studentId: string,
    level: Level,
    semester: Semester,
    academicYear: string
  ): Promise<any> {
    const semesterGPA = await prisma.semesterGPA.findUnique({
      where: { studentId_level_semester_academicYear: { studentId, level, semester, academicYear } },
    });

    if (!semesterGPA) {
      // Calculate on-the-fly if not stored
      const results = await prisma.result.findMany({
        where: { studentId, level, semester, academicYear },
        include: {
          course: { select: { unit: true } },
          student: { select: { department: { select: { passMark: true } } } },
        },
      });

      if (results.length === 0) {
        throw new AppError('No results found for this semester', 404);
      }

      const passMark = results[0].student.department.passMark;
      const gpaData = calculateGPA(
        results.map(r => ({ score: r.score, unit: r.course.unit, passMark }))
      );

      return { gpa: gpaData.gpa, totalUnits: gpaData.totalUnits, totalPoints: gpaData.totalPoints, calculated: true };
    }

    return semesterGPA;
  }

  /**
   * Get all semester GPAs and CGPA for a student
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
        department: { select: { passMark: true } },
      },
    });

    if (!student) throw new AppError('Student not found', 404);

    const semesterGpas = await prisma.semesterGPA.findMany({
      where: { studentId },
      orderBy: [{ level: 'asc' }, { semester: 'asc' }, { academicYear: 'asc' }],
    });

    const cgpaData = calculateCGPA(
      semesterGpas.map(s => ({ gpa: s.gpa, totalUnits: s.totalUnits, totalPoints: s.totalPoints }))
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
   * Calculate GPAs for all students in a department for a semester
   */
  async calculateDepartmentGPAs(
    departmentId: string,
    level: Level,
    semester: Semester,
    academicYear: string
  ): Promise<any> {
    const students = await prisma.student.findMany({
      where: { departmentId, results: { some: { level, semester, academicYear } } },
      select: { id: true },
    });

    const results: any[] = [];
    const errors: any[] = [];

    for (const student of students) {
      try {
        const gpa = await this.calculateSemesterGPA(student.id, level, semester, academicYear);
        results.push({ studentId: student.id, ...gpa });
      } catch (error: any) {
        errors.push({ studentId: student.id, error: error.message });
      }
    }

    return { calculated: results.length, errors: errors.length, results, errorDetails: errors };
  }

  /**
   * Get department GPA statistics
   */
  async getDepartmentGPAStats(
    departmentId: string,
    level?: Level,
    semester?: Semester,
    academicYear?: string
  ): Promise<any> {
    const where: any = { student: { departmentId } };
    if (level) where.level = level;
    if (semester) where.semester = semester;
    if (academicYear) where.academicYear = academicYear;

    const gpas = await prisma.semesterGPA.findMany({
      where,
      select: { gpa: true, student: { select: { id: true, matricNumber: true, firstName: true, lastName: true } } },
      orderBy: { gpa: 'desc' },
    });

    if (gpas.length === 0) {
      return { count: 0, highestGpa: null, lowestGpa: null, averageGpa: null };
    }

    const gpaValues = gpas.map(g => g.gpa);
    const average = gpaValues.reduce((a, b) => a + b, 0) / gpaValues.length;

    return {
      count: gpas.length,
      highestGpa: { value: gpas[0].gpa, student: gpas[0].student },
      lowestGpa: { value: gpas[gpas.length - 1].gpa, student: gpas[gpas.length - 1].student },
      averageGpa: Math.round(average * 100) / 100,
      distribution: {
        firstClass: gpaValues.filter(g => g >= 4.5).length,
        secondUpper: gpaValues.filter(g => g >= 3.5 && g < 4.5).length,
        secondLower: gpaValues.filter(g => g >= 2.4 && g < 3.5).length,
        thirdClass: gpaValues.filter(g => g >= 1.5 && g < 2.4).length,
        pass: gpaValues.filter(g => g >= 1.0 && g < 1.5).length,
        fail: gpaValues.filter(g => g < 1.0).length,
      },
    };
  }
}

export const gpaService = new GPAService();