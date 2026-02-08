// src/types/index.ts

import { Request } from 'express';
import { User, UserRole, Level, Semester, Grade } from '@prisma/client';

// Extended Request with user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    departmentId?: string | null;
    facultyId?: string | null;
  };
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

// Report types
export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  totalStudents: number;
  highestGpa: number;
  lowestGpa: number;
  averageGpa: number;
  carryOverCount: number;
  passRate: number;
}

export interface StudentResult {
  studentId: string;
  matricNumber: string;
  studentName: string;
  level: Level;
  semester: Semester;
  academicYear: string;
  results: {
    courseCode: string;
    courseTitle: string;
    unit: number;
    score: number;
    grade: Grade;
    gradePoint: number;
    pxu: number;
    isCarryOver: boolean;
  }[];
  gpa: number;
  cgpa?: number;
}

// JWT Payload
export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  departmentId?: string | null;
  facultyId?: string | null;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}