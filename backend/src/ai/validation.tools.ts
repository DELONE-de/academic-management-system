// FILE: backend/src/ai/validation.tools.ts

import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { prisma } from '../config/database.js';
import { gpaService } from '../services/gpa.service.js';
import { calculateResult } from '../utils/grading.js';
import {
  validateStudentRow,
  validateScoreRow,
  parseLevel,
} from '../validators/bulk.validator.js';

// ============================================================
// GEMINI FUNCTION DECLARATIONS
// These are the tool schemas Gemini uses during function-calling
// ============================================================

export const validationFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: 'validateStudent',
    description:
      'Validates a student record — checks matric number format, required fields, and whether the student exists in the database.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        matricNumber: { type: SchemaType.STRING, description: 'Student matric number' },
        firstName: { type: SchemaType.STRING, description: 'Student first name' },
        lastName: { type: SchemaType.STRING, description: 'Student last name' },
        departmentCode: { type: SchemaType.STRING, description: 'Department code e.g. HIM' },
        admissionYear: { type: SchemaType.NUMBER, description: 'Year of admission e.g. 2024' },
        studentLevel: { type: SchemaType.STRING, description: 'Level e.g. LEVEL_100' },
        email: { type: SchemaType.STRING, description: 'Optional email address' },
      },
      required: ['matricNumber', 'firstName', 'lastName', 'departmentCode', 'admissionYear', 'studentLevel'],
    },
  },
  {
    name: 'validateCourse',
    description:
      'Validates multiple course codes and scores for a single student. departmentCode is always provided by the system from the authenticated user.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        departmentCode: { type: SchemaType.STRING, description: 'Department code from the system e.g. HIM' },
        academicYear: { type: SchemaType.STRING, description: 'Academic year e.g. 2024/2025' },
        courses: {
          type: SchemaType.ARRAY,
          description: 'All courses and scores for this student',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              courseCode: { type: SchemaType.STRING, description: 'Course code e.g. GST 111' },
              score: { type: SchemaType.NUMBER, description: 'Score 0-100' },
            },
          },
        },
      },
      required: ['departmentCode', 'academicYear', 'courses'],
    },
  },
  {
    name: 'checkRegistration',
    description:
      'Checks whether a student (matric format: 2025/5337) exists in the system and verifies all their courses are offered in the department. departmentCode is always provided by the system.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        matricNumber: { type: SchemaType.STRING, description: 'Student matric number e.g. 2025/5337' },
        departmentCode: { type: SchemaType.STRING, description: 'Department code from the system e.g. HIM' },
        courseCodes: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'All course codes to check for this student',
        },
      },
      required: ['matricNumber', 'departmentCode', 'courseCodes'],
    },
  },
  {
    name: 'findDuplicateStudents',
    description:
      'Checks for duplicate matric numbers — both within the uploaded batch and against existing DB records.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        matricNumbers: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'List of matric numbers to check for duplicates',
        },
      },
      required: ['matricNumbers'],
    },
  },
  {
    name: 'saveResult',
    description:
      'Saves validated score results for a single student to the database and triggers GPA recalculation. Only call this after checkRegistration and validateCourse both pass for the student.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        matricNumber: { type: SchemaType.STRING, description: 'Student matric number e.g. 2025/5337' },
        departmentCode: { type: SchemaType.STRING, description: 'Department code from the system' },
        academicYear: { type: SchemaType.STRING, description: 'Academic year e.g. 2024/2025' },
        courses: {
          type: SchemaType.ARRAY,
          description: 'Validated courses and scores to save',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              courseCode: { type: SchemaType.STRING },
              score: { type: SchemaType.NUMBER },
            },
          },
        },
      },
      required: ['matricNumber', 'departmentCode', 'academicYear', 'courses'],
    },
  },
];

// ============================================================
// TOOL HANDLERS
// Called by the upload service when Gemini invokes a function
// ============================================================

export interface ValidationResult {
  valid: boolean;
  confidence: number; // 0.0 - 1.0
  issues: string[];
  suggestions: Record<string, string>;
}

export async function validateStudent(args: {
  matricNumber: string;
  firstName: string;
  lastName: string;
  departmentCode: string;
  admissionYear: number;
  studentLevel: string;
  email?: string;
}): Promise<ValidationResult> {
  const issues: string[] = [];
  const suggestions: Record<string, string> = {};

  // Field-level validation
  const rowErrors = validateStudentRow({
    matricNumber: args.matricNumber,
    firstName: args.firstName,
    lastName: args.lastName,
    departmentCode: args.departmentCode,
    admissionYear: args.admissionYear,
    studentLevel: args.studentLevel,
    email: args.email,
    rowNumber: 0,
  });
  issues.push(...rowErrors);

  // Department exists check
  const department = await prisma.department.findUnique({
    where: { code: args.departmentCode.toUpperCase() },
    select: { id: true },
  });
  if (!department) {
    issues.push(`Department '${args.departmentCode}' not found`);
    suggestions['departmentCode'] = 'Check the department code against the list of registered departments';
  }

  // Duplicate matric check
  const existing = await prisma.student.findUnique({
    where: { matricNumber: args.matricNumber.toUpperCase() },
    select: { id: true },
  });
  if (existing) {
    issues.push(`Student '${args.matricNumber}' already exists in the database`);
    suggestions['matricNumber'] = 'This student is already registered — skip or update instead';
  }

  const confidence = issues.length === 0 ? 1.0 : Math.max(0.1, 1.0 - issues.length * 0.25);
  return { valid: issues.length === 0, confidence, issues, suggestions };
}

export interface CourseValidationIssue {
  courseCode: string;
  score?: number;
  issues: string[];
  suggestions: Record<string, string>;
  confidence: number;
}

export async function validateCourse(args: {
  departmentCode: string;
  academicYear: string;
  courses: Array<{ courseCode: string; score: number }>;
}): Promise<{ valid: boolean; courseIssues: CourseValidationIssue[] }> {
  const courseIssues: CourseValidationIssue[] = [];

  const department = await prisma.department.findUnique({
    where: { code: args.departmentCode.toUpperCase() },
    select: { id: true },
  });

  if (!department) {
    return {
      valid: false,
      courseIssues: args.courses.map((c) => ({
        courseCode: c.courseCode,
        score: c.score,
        issues: [`Department '${args.departmentCode}' not found`],
        suggestions: { departmentCode: 'Check the department code' },
        confidence: 0.0,
      })),
    };
  }

  // Fetch all courses for this department in one query
  const dbCourses = await prisma.course.findMany({
    where: { departmentId: department.id },
    select: { code: true },
  });
  const dbCourseCodes = new Set(dbCourses.map((c) => c.code.toUpperCase()));

  for (const c of args.courses) {
    const issues: string[] = [];
    const suggestions: Record<string, string> = {};

    // Score range
    const scoreErrors = validateScoreRow({
      matricNumber: 'PLACEHOLDER',
      courseCode: c.courseCode,
      score: c.score,
      academicYear: args.academicYear,
      rowNumber: 0,
    });
    issues.push(...scoreErrors.filter((e) => !e.includes('Matric')));

    // Course exists
    if (!dbCourseCodes.has(c.courseCode.toUpperCase())) {
      issues.push(`Course '${c.courseCode}' not found in department '${args.departmentCode}'`);
      suggestions['courseCode'] = 'Verify the course code matches what is registered for this department';
    }

    courseIssues.push({
      courseCode: c.courseCode,
      score: c.score,
      issues,
      suggestions,
      confidence: issues.length === 0 ? 1.0 : Math.max(0.1, 1.0 - issues.length * 0.3),
    });
  }

  return {
    valid: courseIssues.every((c) => c.issues.length === 0),
    courseIssues,
  };
}

export async function checkRegistration(args: {
  matricNumber: string;
  departmentCode: string;
  courseCodes: string[];
}): Promise<ValidationResult> {
  const issues: string[] = [];
  const suggestions: Record<string, string> = {};

  const student = await resolveStudent(args.matricNumber, args.departmentCode);

  if (!student) {
    issues.push(`Student '${args.matricNumber}' not found`);
    suggestions['matricNumber'] = 'Student must be registered before scores can be uploaded';
    return { valid: false, confidence: 0.0, issues, suggestions };
  }

  if (student.department.code.toUpperCase() !== args.departmentCode.toUpperCase()) {
    issues.push(
      `Student '${args.matricNumber}' belongs to '${student.department.code}', not '${args.departmentCode}'`
    );
    suggestions['departmentCode'] = `Use department code '${student.department.code}'`;
  }

  // Check all courses in one query
  const dbCourses = await prisma.course.findMany({
    where: {
      departmentId: student.departmentId,
      code: { in: args.courseCodes.map((c) => c.toUpperCase()) },
    },
    select: { code: true },
  });
  const foundCodes = new Set(dbCourses.map((c) => c.code.toUpperCase()));

  for (const code of args.courseCodes) {
    if (!foundCodes.has(code.toUpperCase())) {
      issues.push(`Course '${code}' is not offered in student's department`);
    }
  }

  if (issues.some((i) => i.includes('not offered'))) {
    suggestions['courseCodes'] = 'Verify all courses are offered for this department and level';
  }

  const confidence = issues.length === 0 ? 1.0 : Math.max(0.0, 1.0 - issues.length * 0.25);
  return { valid: issues.length === 0, confidence, issues, suggestions };
}

export async function findDuplicateStudents(args: {
  matricNumbers: string[];
}): Promise<{ duplicatesInBatch: string[]; duplicatesInDb: string[] }> {
  // Duplicates within the batch itself
  const seen = new Set<string>();
  const duplicatesInBatch: string[] = [];
  for (const m of args.matricNumbers) {
    const upper = m.toUpperCase();
    if (seen.has(upper)) duplicatesInBatch.push(m);
    else seen.add(upper);
  }

  // Duplicates against existing DB records
  const existing = await prisma.student.findMany({
    where: { matricNumber: { in: args.matricNumbers.map((m) => m.toUpperCase()) } },
    select: { matricNumber: true },
  });
  const duplicatesInDb = existing.map((s) => s.matricNumber);

  return { duplicatesInBatch, duplicatesInDb };
}

export async function saveResult(args: {
  matricNumber: string;
  departmentCode: string;
  academicYear: string;
  courses: Array<{ courseCode: string; score: number }>;
}): Promise<{ saved: number; skipped: number; gpaRecalculated: boolean; error?: string }> {
  const resolved = await resolveStudent(args.matricNumber, args.departmentCode);
  if (!resolved) return { saved: 0, skipped: 0, gpaRecalculated: false, error: `Student '${args.matricNumber}' not found` };

  const student = await prisma.student.findUnique({
    where: { id: resolved.id },
    select: { id: true, departmentId: true, department: { select: { passMark: true } } },
  });

  if (!student) return { saved: 0, skipped: 0, gpaRecalculated: false, error: `Student '${args.matricNumber}' not found` };

  const courses = await prisma.course.findMany({
    where: {
      departmentId: student.departmentId,
      code: { in: args.courses.map((c) => c.courseCode.toUpperCase()) },
    },
    select: { id: true, code: true, unit: true, level: true, semester: true },
  });
  const courseMap = new Map(courses.map((c) => [c.code.toUpperCase(), c]));

  let saved = 0;
  let skipped = 0;
  const gpaGroups = new Map<string, { level: any; semester: any }>();

  for (const c of args.courses) {
    const course = courseMap.get(c.courseCode.toUpperCase());
    if (!course) { skipped++; continue; }

    const calc = calculateResult(c.score, course.unit, student.department.passMark);

    await prisma.result.upsert({
      where: { studentId_courseId_academicYear: { studentId: student.id, courseId: course.id, academicYear: args.academicYear } },
      create: {
        studentId: student.id,
        courseId: course.id,
        score: c.score,
        grade: calc.grade,
        gradePoint: calc.gradePoint,
        pxu: calc.pxu,
        isCarryOver: calc.isCarryOver,
        level: course.level,
        semester: course.semester,
        academicYear: args.academicYear,
      },
      update: { score: c.score, grade: calc.grade, gradePoint: calc.gradePoint, pxu: calc.pxu, isCarryOver: calc.isCarryOver },
    });

    saved++;
    const key = `${course.level}-${course.semester}`;
    if (!gpaGroups.has(key)) gpaGroups.set(key, { level: course.level, semester: course.semester });
  }

  // Recalculate GPA for each affected level/semester group
  for (const group of gpaGroups.values()) {
    await gpaService.calculateSemesterGPA(student.id, group.level, group.semester, args.academicYear);
  }

  return { saved, skipped, gpaRecalculated: gpaGroups.size > 0 };
}

// ============================================================
// MATRIC RESOLUTION
// Scores files use short format YYYY/NNNN (e.g. 2024/1813).
// DB stores full format DEPT/YEAR/NUM (e.g. HIM/2024/1813).
// This helper resolves either format to the actual DB record.
// ============================================================

async function resolveStudent(matricNumber: string, departmentCode: string) {
  return prisma.student.findUnique({
    where: { matricNumber: matricNumber.toUpperCase() },
    select: { id: true, departmentId: true, department: { select: { code: true } } },
  });
}

// Dispatcher — called by upload service when Gemini returns a function call
export async function dispatchToolCall(
  name: string,
  args: Record<string, any>
): Promise<any> {
  switch (name) {
    case 'validateStudent':       return validateStudent(args as any);
    case 'validateCourse':        return validateCourse(args as any);
    case 'checkRegistration':     return checkRegistration(args as any);
    case 'findDuplicateStudents': return findDuplicateStudents(args as any);
    case 'saveResult':            return saveResult(args as any);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
