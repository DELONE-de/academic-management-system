// FILE: backend/src/types/index.ts

import { Request } from 'express';
import { UserRole, Level, Semester, Grade } from '@prisma/client';

// Extended Request with user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    departmentId?: string | null;
    facultyId?: string | null;
  };
  file?: Express.Multer.File;
}

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// GPA Calculation types
export interface GradeInfo {
  grade: Grade;
  point: number;
}

export interface ResultCalculation {
  score: number;
  grade: Grade;
  gradePoint: number;
  pxu: number;
  isCarryOver: boolean;
}

export interface GPACalculation {
  gpa: number;
  totalUnits: number;
  totalPoints: number;
  results: ResultCalculation[];
}

export interface CGPACalculation {
  cgpa: number;
  cumulativeUnits: number;
  cumulativePoints: number;
  semesterGpas: {
    level: Level;
    semester: Semester;
    academicYear: string;
    gpa: number;
    totalUnits: number;
  }[];
}

// Score Entry types
export interface ScoreEntry {
  studentId: string;
  courseId: string;
  score: number;
}

export interface BulkScoreEntry {
  level: Level;
  semester: Semester;
  academicYear: string;
  scores: ScoreEntry[];
}

// JWT Payload
export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  departmentId?: string | null;
  facultyId?: string | null;
}

// =============================================
// BULK UPLOAD TYPES
// =============================================

// Bulk Student Import Types
export interface StudentImportRow {
  rowNumber: number;
  matricNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  departmentCode: string;
  admissionYear: number;
  studentLevel: string;
  email?: string;
  phone?: string;
}

export interface ValidatedStudentRow extends StudentImportRow {
  departmentId: string;
  level: Level;
}

export interface StudentImportError {
  rowNumber: number;
  matricNumber: string;
  firstName: string;
  lastName: string;
  departmentCode: string;
  admissionYear: number;
  studentLevel: string;
  errors: string[];
}

export interface StudentImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors: StudentImportError[];
  errorFileBuffer?: Buffer;
}

// Bulk Score Upload Types
export interface ScoreImportRow {
  rowNumber: number;
  matricNumber: string;
  departmentCode: string;
  courseCode: string;
  score: number;
  studentLevel: string;
  semester: string;
  academicYear: string;
}

export interface ValidatedScoreRow extends ScoreImportRow {
  studentId: string;
  courseId: string;
  departmentId: string;
  level: Level;
  semesterEnum: Semester;
  passMark: number;
  courseUnit: number;
}

export interface ScoreImportError {
  rowNumber: number;
  matricNumber: string;
  courseCode: string;
  score: number;
  studentLevel: string;
  semester: string;
  academicYear: string;
  errors: string[];
}

export interface ScoreImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  updatedCount: number;
  errors: ScoreImportError[];
  affectedStudents: string[];
  errorFileBuffer?: Buffer;
}

// Single Score Types
export interface AddScoreInput {
  studentId: string;
  courseId: string;
  score: number;
  level: Level;
  semester: Semester;
  academicYear: string;
}

export interface DeleteScoreResult {
  success: boolean;
  deletedResult: any;
  gpaRecalculated: boolean;
}

// GPA Recalculation Types
export interface GPARecalculationResult {
  studentId: string;
  level: Level;
  semester: Semester;
  academicYear: string;
  gpa: number;
  cgpa: number;
  totalUnits: number;
  totalPoints: number;
}