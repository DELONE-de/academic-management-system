// FILE: frontend/src/types/index.ts

export type UserRole = 'HOD' | 'DEAN';
export type Level = 'ND1' | 'ND2' | 'HND1' | 'HND2' | 'LEVEL_100' | 'LEVEL_200' | 'LEVEL_300' | 'LEVEL_400' | 'LEVEL_500';
export type Semester = 'FIRST' | 'SECOND';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  departmentId?: string;
  facultyId?: string;
  department?: Department;
  faculty?: Faculty;
}

export interface Faculty {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  passMark: number;
  facultyId: string;
  faculty?: Faculty;
  _count?: { students: number; courses: number };
}

export interface Student {
  id: string;
  matricNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  currentLevel: Level;
  admissionYear: number;
  isActive: boolean;
  departmentId: string;
  department?: Department;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  unit: number;
  level: Level;
  semester: Semester;
  isElective: boolean;
  departmentId: string;
}

export interface Result {
  id: string;
  score: number;
  grade: Grade;
  gradePoint: number;
  pxu: number;
  isCarryOver: boolean;
  level: Level;
  semester: Semester;
  academicYear: string;
  studentId: string;
  courseId: string;
  course?: Course;
  student?: Student;
}

export interface SemesterGPA {
  id: string;
  gpa: number;
  totalUnits: number;
  totalPoints: number;
  level: Level;
  semester: Semester;
  academicYear: string;
  cumulativeGpa?: number;
  cumulativeUnits?: number;
  studentId: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

// Bulk Upload Types
export interface BulkUploadResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  skippedCount?: number;
  updatedCount?: number;
  affectedStudents?: number;
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

// Single Score Types
export interface AddScoreInput {
  studentId: string;
  courseId: string;
  score: number;
  level: Level;
  semester: Semester;
  academicYear: string;
}

export interface AddScoreResult {
  result: Result;
  gpa: number;
  cgpa: number;
}

export interface DeleteScoreResult {
  success: boolean;
  deletedResult: Result;
  gpaRecalculated: boolean;
}

export interface StudentWithGPA {
  id: string;
  matricNumber: string;
  firstName: string;
  lastName: string;
  department: Department;
  results: Result[];
  semesterGpas: SemesterGPA[];
}

export interface DepartmentStats {
  totalStudents: number;
  highestGpa: number;
  lowestGpa: number;
  averageGpa: number;
  firstClass: number;
  secondClassUpper: number;
  secondClassLower: number;
  thirdClass: number;
  pass: number;
  fail: number;
  carryOverCount: number;
  passRate: number;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}