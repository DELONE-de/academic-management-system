// FILE: backend/src/validators/bulk.validator.ts

import { z } from 'zod';
import { Level, Semester } from '@prisma/client';

// Valid levels
const validLevels = ['ND1', 'ND2', 'HND1', 'HND2', 'LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500'];

// Valid semesters
const validSemesters = ['FIRST', 'SECOND'];

/**
 * Parse and validate level string
 */
export function parseLevel(levelStr: string): Level | null {
  const normalized = levelStr.toUpperCase().replace(/\s+/g, '_').replace('LEVEL', 'LEVEL_');
  
  const levelMap: Record<string, Level> = {
    'ND1': Level.ND1,
    'ND_1': Level.ND1,
    'ND2': Level.ND2,
    'ND_2': Level.ND2,
    'HND1': Level.HND1,
    'HND_1': Level.HND1,
    'HND2': Level.HND2,
    'HND_2': Level.HND2,
    '100': Level.LEVEL_100,
    'LEVEL_100': Level.LEVEL_100,
    'LEVEL100': Level.LEVEL_100,
    '100_LEVEL': Level.LEVEL_100,
    '200': Level.LEVEL_200,
    'LEVEL_200': Level.LEVEL_200,
    'LEVEL200': Level.LEVEL_200,
    '200_LEVEL': Level.LEVEL_200,
    '300': Level.LEVEL_300,
    'LEVEL_300': Level.LEVEL_300,
    'LEVEL300': Level.LEVEL_300,
    '300_LEVEL': Level.LEVEL_300,
    '400': Level.LEVEL_400,
    'LEVEL_400': Level.LEVEL_400,
    'LEVEL400': Level.LEVEL_400,
    '400_LEVEL': Level.LEVEL_400,
    '500': Level.LEVEL_500,
    'LEVEL_500': Level.LEVEL_500,
    'LEVEL500': Level.LEVEL_500,
    '500_LEVEL': Level.LEVEL_500,
  };
  
  return levelMap[normalized] || null;
}

/**
 * Parse and validate semester string
 */
export function parseSemester(semesterStr: string): Semester | null {
  const normalized = semesterStr.toUpperCase().trim();
  
  const semesterMap: Record<string, Semester> = {
    'FIRST': Semester.FIRST,
    '1': Semester.FIRST,
    '1ST': Semester.FIRST,
    'FIRST_SEMESTER': Semester.FIRST,
    'SECOND': Semester.SECOND,
    '2': Semester.SECOND,
    '2ND': Semester.SECOND,
    'SECOND_SEMESTER': Semester.SECOND,
  };
  
  return semesterMap[normalized] || null;
}

/**
 * Validate academic year format (YYYY/YYYY)
 */
export function validateAcademicYear(yearStr: string): boolean {
  const regex = /^\d{4}\/\d{4}$/;
  if (!regex.test(yearStr)) return false;
  
  const [startYear, endYear] = yearStr.split('/').map(Number);
  return endYear === startYear + 1 && startYear >= 1990 && startYear <= new Date().getFullYear() + 1;
}

/**
 * Validate matric number format matches department code
 */
export function validateMatricNumberFormat(matricNumber: string, departmentCode: string): boolean {
  // Expected format: DEPT/YEAR/NUM (e.g., CSC/2023/001)
  const parts = matricNumber.split('/');
  if (parts.length < 2) return false;
  
  const deptPart = parts[0].toUpperCase();
  return deptPart === departmentCode.toUpperCase();
}

/**
 * Validate admission year
 */
export function validateAdmissionYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return year >= 1990 && year <= currentYear + 1 && Number.isInteger(year);
}

/**
 * Schema for single score addition
 */
export const addScoreSchema = z.object({
  studentId: z.string().cuid('Invalid student ID'),
  courseId: z.string().cuid('Invalid course ID'),
  score: z.number().min(0, 'Score must be at least 0').max(100, 'Score cannot exceed 100'),
  level: z.enum(['ND1', 'ND2', 'HND1', 'HND2', 'LEVEL_100', 'LEVEL_200', 'LEVEL_300', 'LEVEL_400', 'LEVEL_500']),
  semester: z.enum(['FIRST', 'SECOND']),
  academicYear: z.string().regex(/^\d{4}\/\d{4}$/, 'Academic year must be in format YYYY/YYYY'),
});

export type AddScoreInput = z.infer<typeof addScoreSchema>;

/**
 * Validate student import row
 */
export function validateStudentRow(row: any): string[] {
  const errors: string[] = [];
  
  if (!row.matricNumber || row.matricNumber.trim() === '') {
    errors.push('Matric number is required');
  }
  
  if (!row.firstName || row.firstName.trim() === '') {
    errors.push('First name is required');
  }
  
  if (!row.lastName || row.lastName.trim() === '') {
    errors.push('Last name is required');
  }
  
  if (!row.departmentCode || row.departmentCode.trim() === '') {
    errors.push('Department code is required');
  }
  
  if (!row.admissionYear || isNaN(row.admissionYear)) {
    errors.push('Valid admission year is required');
  } else if (!validateAdmissionYear(row.admissionYear)) {
    errors.push(`Admission year must be between 1990 and ${new Date().getFullYear() + 1}`);
  }
  
  if (!row.studentLevel || row.studentLevel.trim() === '') {
    errors.push('Student level is required');
  } else if (!parseLevel(row.studentLevel)) {
    errors.push(`Invalid level: ${row.studentLevel}. Valid values: ${validLevels.join(', ')}`);
  }
  
  // Validate matric number format matches department
  if (row.matricNumber && row.departmentCode) {
    if (!validateMatricNumberFormat(row.matricNumber, row.departmentCode)) {
      errors.push(`Matric number ${row.matricNumber} does not match department code ${row.departmentCode}`);
    }
  }
  
  // Validate email format if provided
  if (row.email && row.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      errors.push('Invalid email format');
    }
  }
  
  return errors;
}

/**
 * Validate score import row
 */
export function validateScoreRow(row: any): string[] {
  const errors: string[] = [];
  
  if (!row.matricNumber || row.matricNumber.trim() === '') {
    errors.push('Matric number is required');
  }
  
  if (!row.departmentCode || row.departmentCode.trim() === '') {
    errors.push('Department code is required');
  }
  
  if (!row.courseCode || row.courseCode.trim() === '') {
    errors.push('Course code is required');
  }
  
  if (row.score === undefined || row.score === null || row.score === '' || isNaN(row.score)) {
    errors.push('Valid score is required');
  } else if (row.score < 0 || row.score > 100) {
    errors.push('Score must be between 0 and 100');
  }
  
  if (!row.studentLevel || row.studentLevel.trim() === '') {
    errors.push('Student level is required');
  } else if (!parseLevel(row.studentLevel)) {
    errors.push(`Invalid level: ${row.studentLevel}. Valid values: ${validLevels.join(', ')}`);
  }
  
  if (!row.semester || row.semester.trim() === '') {
    errors.push('Semester is required');
  } else if (!parseSemester(row.semester)) {
    errors.push(`Invalid semester: ${row.semester}. Valid values: ${validSemesters.join(', ')}`);
  }
  
  if (!row.academicYear || row.academicYear.trim() === '') {
    errors.push('Academic year is required');
  } else if (!validateAcademicYear(row.academicYear)) {
    errors.push(`Invalid academic year format: ${row.academicYear}. Expected format: YYYY/YYYY (e.g., 2023/2024)`);
  }
  
  return errors;
}