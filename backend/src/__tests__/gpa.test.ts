// src/__tests__/gpa.test.ts
// Integration tests for GPA calculation via the service layer.

import { prisma } from '../config/database.js';
import { gpaService } from '../services/gpa.service.js';
import { Level, Semester, Grade } from '@prisma/client';

let counter = 0;
function unique(name: string): string {
  counter++;
  return `${name}_${counter}`;
}

async function createTestData() {
  const fc = unique('TF');
  const faculty = await prisma.faculty.create({
    data: { name: fc, code: fc },
  });
  const dc = unique('TST');
  const department = await prisma.department.create({
    data: { name: dc, code: dc, facultyId: faculty.id, passMark: 40 },
  });
  const student = await prisma.student.create({
    data: {
      matricNumber: unique('TST/2024/'),
      firstName: 'Test',
      lastName: 'Student',
      currentLevel: 'LEVEL_100',
      admissionYear: 2024,
      departmentId: department.id,
    },
  });
  const course = await prisma.course.create({
    data: {
      code: unique('TST101'),
      title: 'Introduction to Testing',
      unit: 3,
      level: 'LEVEL_100',
      semester: 'FIRST',
      departmentId: department.id,
    },
  });
  return { faculty, department, student, course };
}

describe('GPAService', () => {
  afterAll(async () => {
    await prisma.semesterGPA.deleteMany();
    await prisma.result.deleteMany();
    await prisma.student.deleteMany();
    await prisma.course.deleteMany();
    await prisma.department.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.$disconnect();
  });

  it('returns zero GPA for a student with no results', async () => {
    const { student } = await createTestData();
    const result = await gpaService.calculateSemesterGPA(
      student.id, Level.LEVEL_100, Semester.FIRST, '2024/2025'
    );
    expect(result.semesterGPA).toBeNull();
    expect(result.cgpa).toBe(0);
  });

  it('calculates a perfect 5.00 GPA for a single A-grade result', async () => {
    const { student, course } = await createTestData();

    await prisma.result.create({
      data: {
        studentId: student.id,
        courseId: course.id,
        score: 85,
        grade: Grade.A,
        gradePoint: 5,
        pxu: 15,
        status: 'OFFICIAL',
        level: Level.LEVEL_100,
        semester: Semester.FIRST,
        academicYear: '2024/2025',
      },
    });

    const result = await gpaService.calculateSemesterGPA(
      student.id, Level.LEVEL_100, Semester.FIRST, '2024/2025'
    );

    expect(result.semesterGPA).not.toBeNull();
    expect(result.semesterGPA.gpa).toBe(5.0);
    expect(result.semesterGPA.totalUnits).toBe(3);
    expect(result.semesterGPA.totalPoints).toBe(15);
  });

  it('calculates GPA correctly for a mix of grades', async () => {
    const { student, department } = await createTestData();

    const courseA = await prisma.course.create({
      data: { code: unique('TST102'), title: 'Testing 2', unit: 3, level: Level.LEVEL_100, semester: Semester.FIRST, departmentId: department.id },
    });
    const courseB = await prisma.course.create({
      data: { code: unique('TST103'), title: 'Testing 3', unit: 2, level: Level.LEVEL_100, semester: Semester.FIRST, departmentId: department.id },
    });
    const courseC = await prisma.course.create({
      data: { code: unique('TST104'), title: 'Testing 4', unit: 1, level: Level.LEVEL_100, semester: Semester.FIRST, departmentId: department.id },
    });

    await prisma.result.create({
      data: { studentId: student.id, courseId: courseA.id, score: 80, grade: Grade.A, gradePoint: 5, pxu: 15, status: 'OFFICIAL', level: Level.LEVEL_100, semester: Semester.FIRST, academicYear: '2024/2025' },
    });
    await prisma.result.create({
      data: { studentId: student.id, courseId: courseB.id, score: 65, grade: Grade.B, gradePoint: 4, pxu: 8, status: 'OFFICIAL', level: Level.LEVEL_100, semester: Semester.FIRST, academicYear: '2024/2025' },
    });
    await prisma.result.create({
      data: { studentId: student.id, courseId: courseC.id, score: 30, grade: Grade.F, gradePoint: 0, pxu: 0, status: 'OFFICIAL', level: Level.LEVEL_100, semester: Semester.FIRST, academicYear: '2024/2025' },
    });

    const result = await gpaService.calculateSemesterGPA(
      student.id, Level.LEVEL_100, Semester.FIRST, '2024/2025'
    );

    expect(result.semesterGPA.gpa).toBe(3.83);
    expect(result.semesterGPA.totalUnits).toBe(6);
    expect(result.semesterGPA.totalPoints).toBe(23);
  });
});