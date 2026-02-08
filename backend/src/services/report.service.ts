// src/services/report.service.ts

import { Level, Semester } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/error.middleware.js';
import { DepartmentStats, StudentResult } from '../types/index.js';
import { calculateCGPA } from '../utils/grading.js';

export class ReportService {
  /**
   * Generates department report data
   */
  async generateDepartmentReport(
    departmentId: string,
    level: Level,
    semester: Semester,
    academicYear: string
  ): Promise<{
    department: any;
    stats: DepartmentStats;
    students: StudentResult[];
  }> {
    // Get department info
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        faculty: {
          select: { name: true },
        },
      },
    });

    if (!department) {
      throw new AppError('Department not found', 404);
    }

    // Get all results for the semester
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

    // Get semester GPAs
    const semesterGpas = await prisma.semesterGPA.findMany({
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
          include: {
            semesterGpas: true,
          },
        },
      },
      orderBy: { gpa: 'desc' },
    });

    // Group results by student
    const studentResultsMap = new Map<string, any[]>();
    for (const result of results) {
      const studentId = result.studentId;
      if (!studentResultsMap.has(studentId)) {
        studentResultsMap.set(studentId, []);
      }
      studentResultsMap.get(studentId)!.push(result);
    }

    // Build student results with GPA and CGPA
    const studentResults: StudentResult[] = [];
    let totalCarryOvers = 0;

    for (const gpa of semesterGpas) {
      const studentId = gpa.studentId;
      const studentResultData = studentResultsMap.get(studentId) || [];

      // Calculate CGPA from all semesters
      const allGpas = gpa.student.semesterGpas;
      const cgpaData = calculateCGPA(
        allGpas.map((g) => ({
          gpa: g.gpa,
          totalUnits: g.totalUnits,
          totalPoints: g.totalPoints,
        }))
      );

      const carryOvers = studentResultData.filter((r) => r.isCarryOver);
      totalCarryOvers += carryOvers.length;

      studentResults.push({
        studentId,
        matricNumber: gpa.student.matricNumber,
        studentName: `${gpa.student.firstName} ${gpa.student.lastName}`,
        level,
        semester,
        academicYear,
        results: studentResultData.map((r) => ({
          courseCode: r.course.code,
          courseTitle: r.course.title,
          unit: r.course.unit,
          score: r.score,
          grade: r.grade,
          gradePoint: r.gradePoint,
          pxu: r.pxu,
          isCarryOver: r.isCarryOver,
        })),
        gpa: gpa.gpa,
        cgpa: cgpaData.cgpa,
      });
    }

    // Calculate statistics
    const gpaValues = semesterGpas.map((g) => g.gpa);
    const stats: DepartmentStats = {
      departmentId,
      departmentName: department.name,
      totalStudents: semesterGpas.length,
      highestGpa: gpaValues.length > 0 ? Math.max(...gpaValues) : 0,
      lowestGpa: gpaValues.length > 0 ? Math.min(...gpaValues) : 0,
      averageGpa:
        gpaValues.length > 0
          ? Math.round((gpaValues.reduce((a, b) => a + b, 0) / gpaValues.length) * 100) / 100
          : 0,
      carryOverCount: totalCarryOvers,
      passRate:
        semesterGpas.length > 0
          ? Math.round(
              (semesterGpas.filter((g) => g.gpa >= 1.0).length / semesterGpas.length) * 100
            )
          : 0,
    };

    return {
      department: {
        ...department,
        facultyName: department.faculty.name,
      },
      stats,
      students: studentResults,
    };
  }

  /**
   * Gets faculty-wide statistics for Dean dashboard
   */
  async getFacultyStats(
    facultyId: string,
    academicYear?: string
  ): Promise<any> {
    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      include: {
        departments: {
          include: {
            _count: {
              select: {
                students: true,
                courses: true,
              },
            },
          },
        },
      },
    });

    if (!faculty) {
      throw new AppError('Faculty not found', 404);
    }

    const departmentStats = [];

    for (const dept of faculty.departments) {
      const where: any = {
        student: {
          departmentId: dept.id,
        },
      };

      if (academicYear) {
        where.academicYear = academicYear;
      }

      const gpas = await prisma.semesterGPA.findMany({
        where,
        select: { gpa: true },
      });

      const gpaValues = gpas.map((g) => g.gpa);
      const carryOvers = await prisma.result.count({
        where: {
          isCarryOver: true,
          student: {
            departmentId: dept.id,
          },
          ...(academicYear && { academicYear }),
        },
      });

      departmentStats.push({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        studentCount: dept._count.students,
        courseCount: dept._count.courses,
        averageGpa:
          gpaValues.length > 0
            ? Math.round((gpaValues.reduce((a, b) => a + b, 0) / gpaValues.length) * 100) / 100
            : null,
        highestGpa: gpaValues.length > 0 ? Math.max(...gpaValues) : null,
        lowestGpa: gpaValues.length > 0 ? Math.min(...gpaValues) : null,
        carryOverCount: carryOvers,
      });
    }

    return {
      faculty: {
        id: faculty.id,
        name: faculty.name,
        code: faculty.code,
      },
      departmentCount: faculty.departments.length,
      totalStudents: departmentStats.reduce((sum, d) => sum + d.studentCount, 0),
      departments: departmentStats,
    };
  }

  /**
   * Gets student transcript data
   */
  async getStudentTranscript(studentId: string): Promise<any> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        department: {
          include: {
            faculty: {
              select: { name: true },
            },
          },
        },
        results: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
                unit: true,
              },
            },
          },
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

    // Group results by level/semester/year
    const semesterGroups = new Map<string, any>();

    for (const result of student.results) {
      const key = `${result.level}-${result.semester}-${result.academicYear}`;
      if (!semesterGroups.has(key)) {
        const gpa = student.semesterGpas.find(
          (g) =>
            g.level === result.level &&
            g.semester === result.semester &&
            g.academicYear === result.academicYear
        );

        semesterGroups.set(key, {
          level: result.level,
          semester: result.semester,
          academicYear: result.academicYear,
          gpa: gpa?.gpa || 0,
          results: [],
        });
      }

      semesterGroups.get(key)!.results.push({
        courseCode: result.course.code,
        courseTitle: result.course.title,
        unit: result.course.unit,
        score: result.score,
        grade: result.grade,
        gradePoint: result.gradePoint,
        pxu: result.pxu,
        isCarryOver: result.isCarryOver,
      });
    }

    // Calculate CGPA
    const cgpaData = calculateCGPA(
      student.semesterGpas.map((g) => ({
        gpa: g.gpa,
        totalUnits: g.totalUnits,
        totalPoints: g.totalPoints,
      }))
    );

    return {
      student: {
        matricNumber: student.matricNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        department: student.department.name,
        faculty: student.department.faculty.name,
        admissionYear: student.admissionYear,
        currentLevel: student.currentLevel,
      },
      semesters: Array.from(semesterGroups.values()),
      cgpa: cgpaData.cgpa,
    };
  }
}

export const reportService = new ReportService();