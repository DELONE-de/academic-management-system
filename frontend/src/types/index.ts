// src/types/index.ts

export type UserRole = 'HOD' | 'DEAN';

export type Level = 
  | 'ND1' | 'ND2' | 'HND1' | 'HND2'
  | 'LEVEL_100' | 'LEVEL_200' | 'LEVEL_300' | 'LEVEL_400' | 'LEVEL_500';

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
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Faculty {
  id: string;
  name: string;
  code: string;
  description?: string;
  departments?: Department[];
  _count?: {
    departments: number;
  };
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  passMark: number;
  facultyId: string;
  faculty?: Faculty;
  _count?: {
    students: number;
    courses: number;
  };
}

export interface Student {
  id: string;
  matricNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  currentLevel: Level;
  admissionYear: number;
  isActive: boolean;
  departmentId: string;
  department?: Department;
  results?: Result[];
  semesterGpas?: SemesterGPA[];
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  unit: number;
  level: Level;
  semester: Semester;
  isElective: boolean;
  description?: string;
  departmentId: string;
  department?: Department;
  createdAt: string;
  updatedAt: string;
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
  student?: Student;
  course?: Course;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

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

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}