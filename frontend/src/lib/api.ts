// FILE: frontend/src/lib/api.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  ApiResponse, 
  BulkUploadResult, 
  AddScoreInput, 
  AddScoreResult, 
  DeleteScoreResult,
  StudentWithGPA,
  SemesterGPA,
  Student,
  Course,
  Result
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // Increased for bulk uploads
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post<ApiResponse>('/auth/login', { email, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get<ApiResponse>('/auth/profile');
    return response.data;
  },
};

// Students API
export const studentsApi = {
  getAll: async (params?: any) => {
    const response = await api.get<ApiResponse<Student[]>>('/students', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Student>>(`/students/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post<ApiResponse<Student>>('/students', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put<ApiResponse<Student>>(`/students/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse>(`/students/${id}`);
    return response.data;
  },
  getByDepartmentLevel: async (departmentId: string, level: string) => {
    const response = await api.get<ApiResponse<Student[]>>(`/students/department/${departmentId}/level/${level}`);
    return response.data;
  },
  
  // Bulk Upload
  bulkUpload: async (file: File): Promise<ApiResponse<BulkUploadResult> | Blob> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/students/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'arraybuffer',
    });
    
    // Check if response is error Excel file
    const contentType = response.headers['content-type'];
    if (contentType?.includes('spreadsheet')) {
      return new Blob([response.data], { type: contentType });
    }
    
    // Parse JSON response
    const text = new TextDecoder().decode(response.data);
    return JSON.parse(text) as ApiResponse<BulkUploadResult>;
  },
  
  downloadTemplate: async (): Promise<Blob> => {
    const response = await api.get('/students/bulk-upload/template', { responseType: 'blob' });
    return response.data;
  },
};

// Courses API
export const coursesApi = {
  getAll: async (params?: any) => {
    const response = await api.get<ApiResponse<Course[]>>('/courses', { params });
    return response.data;
  },
  getByDepartmentLevelSemester: async (departmentId: string, level: string, semester: string) => {
    const response = await api.get<ApiResponse<Course[]>>(`/courses/department/${departmentId}/level/${level}/semester/${semester}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post<ApiResponse<Course>>('/courses', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put<ApiResponse<Course>>(`/courses/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete<ApiResponse>(`/courses/${id}`);
    return response.data;
  },
};

// Results API
export const resultsApi = {
  enterScores: async (data: any) => {
    const response = await api.post<ApiResponse>('/results/scores', data);
    return response.data;
  },
  
  getStudentResults: async (studentId: string, params?: any) => {
    const response = await api.get<ApiResponse<Result[]>>(`/results/student/${studentId}`, { params });
    return response.data;
  },
  
  getStudentResultsWithGPA: async (studentId: string) => {
    const response = await api.get<ApiResponse<StudentWithGPA>>(`/results/student/${studentId}/with-gpa`);
    return response.data;
  },
  
  getDepartmentResults: async (departmentId: string, params: any) => {
    const response = await api.get<ApiResponse<Result[]>>(`/results/department/${departmentId}`, { params });
    return response.data;
  },
  
  getCarryOvers: async (studentId: string) => {
    const response = await api.get<ApiResponse<Result[]>>(`/results/carryovers/${studentId}`);
    return response.data;
  },
  
  // Add single score
  addScore: async (data: AddScoreInput): Promise<ApiResponse<AddScoreResult>> => {
    const response = await api.post<ApiResponse<AddScoreResult>>('/results/add', data);
    return response.data;
  },
  
  // Delete single score
  deleteScore: async (resultId: string): Promise<ApiResponse<DeleteScoreResult>> => {
    const response = await api.delete<ApiResponse<DeleteScoreResult>>(`/results/delete/${resultId}`);
    return response.data;
  },
  
  // Update score
  updateScore: async (resultId: string, score: number) => {
    const response = await api.put<ApiResponse<Result>>(`/results/${resultId}`, { score });
    return response.data;
  },
  
  // Bulk Upload
  bulkUpload: async (file: File): Promise<ApiResponse<BulkUploadResult> | Blob> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/results/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'arraybuffer',
    });
    
    const contentType = response.headers['content-type'];
    if (contentType?.includes('spreadsheet')) {
      return new Blob([response.data], { type: contentType });
    }
    
    const text = new TextDecoder().decode(response.data);
    return JSON.parse(text) as ApiResponse<BulkUploadResult>;
  },
  
  downloadTemplate: async (): Promise<Blob> => {
    const response = await api.get('/results/bulk-upload/template', { responseType: 'blob' });
    return response.data;
  },
};

// Approval API
export const approvalApi = {
  list: async (status?: string) => {
    const response = await api.get<ApiResponse>('/approval', { params: status ? { status } : {} });
    return response.data;
  },
  submit: async (data: { departmentId: string; level: string; semester: string; academicYear: string }) => {
    const response = await api.post<ApiResponse>('/approval', data);
    return response.data;
  },
  approve: async (batchId: string, comment?: string) => {
    const response = await api.post<ApiResponse>(`/approval/${batchId}/approve`, { comment });
    return response.data;
  },
  reject: async (batchId: string, comment?: string) => {
    const response = await api.post<ApiResponse>(`/approval/${batchId}/reject`, { comment });
    return response.data;
  },
  publish: async (batchId: string) => {
    const response = await api.post<ApiResponse>(`/approval/${batchId}/publish`);
    return response.data;
  },
};

// Review API
export const reviewApi = {
  getJob: async (jobId: string) => {
    const response = await api.get<ApiResponse>(`/review/${jobId}`);
    return response.data;
  },
  resolveItem: async (itemId: string, resolution: 'accepted' | 'rejected' | 'edited', correctedValue?: string) => {
    const response = await api.patch<ApiResponse>(`/review/${itemId}`, { resolution, correctedValue });
    return response.data;
  },
  approveAll: async (jobId: string) => {
    const response = await api.post<ApiResponse>(`/review/${jobId}/approve-all`);
    return response.data;
  },
};

// AI Upload API (SSE-based)
export const uploadApi = {
  uploadResults: (file: File, academicYear: string, departmentId?: string): EventSource => {
    // Build form data and POST via fetch (EventSource doesn't support POST)
    // We return a fake EventSource-like object using fetch + ReadableStream
    throw new Error('Use uploadApi.streamUpload instead');
  },

  // POST multipart, returns the fetch Response for SSE reading
  streamUpload: async (
    file: File,
    uploadType: 'students' | 'results',
    academicYear: string,
    departmentId?: string
  ): Promise<Response> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', uploadType);
    formData.append('academicYear', academicYear);
    if (departmentId) formData.append('departmentId', departmentId);

    return fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  },

  getJob: async (jobId: string) => {
    const response = await api.get<ApiResponse>(`/upload/${jobId}`);
    return response.data;
  },
};

export const gpaApi = {
  calculateSemesterGPA: async (data: any) => {
    const response = await api.post<ApiResponse>('/gpa/calculate', data);
    return response.data;
  },
  
  getStudentGPAHistory: async (studentId: string) => {
    const response = await api.get<ApiResponse>(`/gpa/student/${studentId}/history`);
    return response.data;
  },
  
  getSemesterGPA: async (studentId: string, params: any) => {
    const response = await api.get<ApiResponse<SemesterGPA>>(`/gpa/student/${studentId}`, { params });
    return response.data;
  },
  
  calculateDepartmentGPAs: async (data: any) => {
    const response = await api.post<ApiResponse>('/gpa/calculate-department', data);
    return response.data;
  },
  
  getDepartmentStats: async (departmentId: string, params?: any) => {
    const response = await api.get<ApiResponse>(`/gpa/department/${departmentId}/stats`, { params });
    return response.data;
  },
};

// Departments API
export const departmentsApi = {
  getAll: async (facultyId?: string) => {
    const response = await api.get<ApiResponse>('/departments', { params: { facultyId } });
    return response.data;
  },
  getAllPublic: async () => {
    const response = await api.get<ApiResponse>('/departments/public');
    return response.data;
  },
  createPublic: async (data: { name: string; code: string; description?: string; passMark?: number; facultyId: string }) => {
    const response = await api.post<ApiResponse>('/departments/public', data);
    return response.data;
  },
  deletePublic: async (id: string) => {
    const response = await api.delete<ApiResponse>(`/departments/public/${id}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<ApiResponse>(`/departments/${id}`);
    return response.data;
  },
};

// Reports API
export const reportsApi = {
  getDashboardStats: async () => {
    const response = await api.get<ApiResponse>('/reports/dashboard');
    return response.data;
  },
  getDepartmentReport: async (departmentId: string, params: any) => {
    const response = await api.get<ApiResponse>(`/reports/department/${departmentId}`, { params });
    return response.data;
  },
  downloadDepartmentReportPDF: async (departmentId: string, params: any) => {
    const response = await api.get(`/reports/department/${departmentId}/pdf`, { params, responseType: 'blob' });
    return response.data;
  },
  downloadTranscriptPDF: async (studentId: string): Promise<Blob> => {
    const response = await api.get(`/reports/transcript/${studentId}/pdf`, { responseType: 'blob' });
    return response.data;
  },
  getFacultyStats: async (academicYear?: string) => {
    const response = await api.get<ApiResponse>('/reports/faculty', { params: { academicYear } });
    return response.data;
  },
};

export default api;