// src/lib/api.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ======================
// AUTH API
// ======================

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post<ApiResponse>('/auth/login', { email, password });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get<ApiResponse>('/auth/profile');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post<ApiResponse>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

// ======================
// STUDENTS API
// ======================

export const studentsApi = {
  getAll: async (params?: {
    departmentId?: string;
    level?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const response = await api.get<ApiResponse>('/students', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse>(`/students/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse>('/students', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put<ApiResponse>(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse>(`/students/${id}`);
    return response.data;
  },

  getByDepartmentLevel: async (departmentId: string, level: string) => {
    const response = await api.get<ApiResponse>(
      `/students/department/${departmentId}/level/${level}`
    );
    return response.data;
  },
};

// ======================
// COURSES API
// ======================

export const coursesApi = {
  getAll: async (params?: {
    departmentId?: string;
    level?: string;
    semester?: string;
    search?: string;
  }) => {
    const response = await api.get<ApiResponse>('/courses', { params });
    return response.data;
  },

  getByDepartmentLevelSemester: async (
    departmentId: string,
    level: string,
    semester: string
  ) => {
    const response = await api.get<ApiResponse>(
      `/courses/department/${departmentId}/level/${level}/semester/${semester}`
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse>(`/courses/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse>('/courses', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put<ApiResponse>(`/courses/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse>(`/courses/${id}`);
    return response.data;
  },
};

// ======================
// RESULTS API
// ======================

export const resultsApi = {
  enterScores: async (data: any) => {
    const response = await api.post<ApiResponse>('/results/scores', data);
    return response.data;
  },

  getStudentResults: async (
    studentId: string,
    params?: { level?: string; semester?: string; academicYear?: string }
  ) => {
    const response = await api.get<ApiResponse>(`/results/student/${studentId}`, {
      params,
    });
    return response.data;
  },

  getDepartmentResults: async (
    departmentId: string,
    params: { level: string; semester: string; academicYear: string }
  ) => {
    const response = await api.get<ApiResponse>(`/results/department/${departmentId}`, {
      params,
    });
    return response.data;
  },

  updateResult: async (id: string, score: number) => {
    const response = await api.put<ApiResponse>(`/results/${id}`, { score });
    return response.data;
  },

  deleteResult: async (id: string) => {
    const response = await api.delete<ApiResponse>(`/results/${id}`);
    return response.data;
  },

  getCarryOvers: async (studentId: string) => {
    const response = await api.get<ApiResponse>(`/results/carryovers/${studentId}`);
    return response.data;
  },
};

// ======================
// GPA API
// ======================

export const gpaApi = {
  calculateSemesterGPA: async (data: {
    studentId: string;
    level: string;
    semester: string;
    academicYear: string;
  }) => {
    const response = await api.post<ApiResponse>('/gpa/calculate', data);
    return response.data;
  },

  getSemesterGPA: async (
    studentId: string,
    params: { level: string; semester: string; academicYear: string }
  ) => {
    const response = await api.get<ApiResponse>(`/gpa/student/${studentId}`, { params });
    return response.data;
  },

  getStudentGPAHistory: async (studentId: string) => {
    const response = await api.get<ApiResponse>(`/gpa/student/${studentId}/history`);
    return response.data;
  },

  calculateDepartmentGPAs: async (data: {
    departmentId?: string;
    level: string;
    semester: string;
    academicYear: string;
  }) => {
    const response = await api.post<ApiResponse>('/gpa/calculate-department', data);
    return response.data;
  },

  getDepartmentStats: async (
    departmentId: string,
    params?: { level?: string; semester?: string; academicYear?: string }
  ) => {
    const response = await api.get<ApiResponse>(`/gpa/department/${departmentId}/stats`, {
      params,
    });
    return response.data;
  },
};

// ======================
// REPORTS API
// ======================

export const reportsApi = {
  getDepartmentReport: async (
    departmentId: string,
    params: { level: string; semester: string; academicYear: string }
  ) => {
    const response = await api.get<ApiResponse>(`/reports/department/${departmentId}`, {
      params,
    });
    return response.data;
  },

  downloadDepartmentReportPDF: async (
    departmentId: string,
    params: { level: string; semester: string; academicYear: string }
  ) => {
    const response = await api.get(`/reports/department/${departmentId}/pdf`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  getFacultyStats: async (academicYear?: string) => {
    const response = await api.get<ApiResponse>('/reports/faculty', {
      params: { academicYear },
    });
    return response.data;
  },

  getStudentTranscript: async (studentId: string) => {
    const response = await api.get<ApiResponse>(`/reports/transcript/${studentId}`);
    return response.data;
  },

  downloadTranscriptPDF: async (studentId: string) => {
    const response = await api.get(`/reports/transcript/${studentId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ======================
// DEPARTMENTS API
// ======================

export const departmentsApi = {
  getAll: async (facultyId?: string) => {
    const response = await api.get<ApiResponse>('/departments', {
      params: { facultyId },
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse>(`/departments/${id}`);
    return response.data;
  },

  getMyDepartment: async () => {
    const response = await api.get<ApiResponse>('/departments/my-department');
    return response.data;
  },
};

// ======================
// FACULTIES API
// ======================

export const facultiesApi = {
  getAll: async () => {
    const response = await api.get<ApiResponse>('/faculties');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse>(`/faculties/${id}`);
    return response.data;
  },

  getMyFaculty: async () => {
    const response = await api.get<ApiResponse>('/faculties/my-faculty');
    return response.data;
  },
};

export default api;