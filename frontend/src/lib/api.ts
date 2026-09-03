// FILE: frontend/src/lib/api.ts
// Centralized API client — handles auth (HttpOnly cookie), session, and maps
// errors to friendly messages. The JWT is stored in an HttpOnly cookie by the
// backend; axios sends it automatically with `withCredentials`.

import axios, { AxiosInstance, AxiosError } from 'axios';
import { clearSession, getCsrfToken, setCsrfToken } from './session';
import { friendlyMessage } from './errors';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
  // Send the HttpOnly auth cookie on same-origin / configured-origin requests.
  withCredentials: true,
});

// Attach the CSRF token header to state-changing requests
api.interceptors.request.use((config) => {
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    const csrf = getCsrfToken();
    if (csrf) config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});

// Capture the CSRF token from every response header (cross-origin deployments
// cannot read the backend-domain cookie, so the header is the source of truth).
api.interceptors.response.use((response) => {
  const csrfHeader = response.headers?.['x-csrf-token'];
  if (csrfHeader) setCsrfToken(csrfHeader);
  return response;
});

// Centralized response handling — never expose raw exceptions
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    // Auth failure — clear local state and redirect to login
    if (status === 401 && typeof window !== 'undefined') {
      clearSession();
      // Avoid redirect loops: only redirect if not already on login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// API HELPERS
// ============================================================

/**
 * Safely extract data from a response, returning `undefined` on failure.
 * The caller handles the null case (loading / empty / error states).
 */
function extractData<T>(response: any): T | undefined {
  if (response?.data?.success && response.data.data !== undefined) {
    return response.data.data as T;
  }
  return undefined;
}

/**
 * Wraps an API call with error handling, returning a standard shape.
 */
async function call<T>(
  fn: () => Promise<any>,
  transform?: (data: any) => T
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await fn();
    const data = extractData<T>(response);
    if (data !== undefined) {
      return { data: transform ? transform(data) : data };
    }
    return { error: response?.data?.message || 'Unexpected response format' };
  } catch (err: any) {
    return { error: friendlyMessage(err) };
  }
}

// ============================================================
// AUTH API
// ============================================================
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  bootstrapStatus: async () => {
    const response = await api.get('/auth/bootstrap-status');
    return response.data;
  },
  bootstrap: async (data: any) => {
    const response = await api.post('/auth/bootstrap', data);
    return response.data;
  },
};

// ============================================================
// STUDENTS API
// ============================================================
export const studentsApi = {
  getAll: (params?: any) => call<any[]>((() => api.get('/students', { params }))),
  getById: (id: string) => call<any>((() => api.get(`/students/${id}`))),
  create: (data: any) => call<any>((() => api.post('/students', data))),
  update: (id: string, data: any) => call<any>((() => api.put(`/students/${id}`, data))),
  remove: (id: string) => call<null>((() => api.delete(`/students/${id}`))),
  getByDepartmentLevel: (departmentId: string, level: string) =>
    call<any[]>((() => api.get(`/students/department/${departmentId}/level/${level}`))),
  downloadTemplate: async (): Promise<Blob> => {
    const response = await api.get('/students/bulk-upload/template', { responseType: 'blob' });
    return response.data;
  },
};

// ============================================================
// COURSES API
// ============================================================
export const coursesApi = {
  getAll: (params?: any) => call<any[]>((() => api.get('/courses', { params }))),
  getByDepartmentLevelSemester: (departmentId: string, level: string, semester: string) =>
    call<any[]>((() => api.get(`/courses/department/${departmentId}/level/${level}/semester/${semester}`))),
  create: (data: any) => call<any>((() => api.post('/courses', data))),
  update: (id: string, data: any) => call<any>((() => api.put(`/courses/${id}`, data))),
  remove: (id: string) => call<null>((() => api.delete(`/courses/${id}`))),
};

// ============================================================
// RESULTS API
// ============================================================
export const resultsApi = {
  enterScores: (data: any) => call<any>((() => api.post('/results/scores', data))),
  getStudentResults: (studentId: string, params?: any) =>
    call<any[]>((() => api.get(`/results/student/${studentId}`, { params }))),
  getStudentResultsWithGPA: (studentId: string) =>
    call<any>((() => api.get(`/results/student/${studentId}/with-gpa`))),
  getDepartmentResults: (departmentId: string, params: any) =>
    call<any[]>((() => api.get(`/results/department/${departmentId}`, { params }))),
  getCarryOvers: (studentId: string) =>
    call<any[]>((() => api.get(`/results/carryovers/${studentId}`))),
  addScore: (data: any) => call<any>((() => api.post('/results/add', data))),
  deleteScore: (resultId: string) => call<any>((() => api.delete(`/results/delete/${resultId}`))),
  updateScore: (resultId: string, score: number) =>
    call<any>((() => api.put(`/results/${resultId}`, { score }))),
  downloadTemplate: async (): Promise<Blob> => {
    const response = await api.get('/results/bulk-upload/template', { responseType: 'blob' });
    return response.data;
  },
};

// ============================================================
// APPROVAL API
// ============================================================
export const approvalApi = {
  list: (status?: string) => call<any[]>((() => api.get('/approval', { params: status ? { status } : {} }))),
  submit: (data: any) => call<any>((() => api.post('/approval', data))),
  approve: (batchId: string, comment?: string) =>
    call<any>((() => api.post(`/approval/${batchId}/approve`, { comment }))),
  reject: (batchId: string, comment?: string) =>
    call<any>((() => api.post(`/approval/${batchId}/reject`, { comment }))),
  publish: (batchId: string) => call<any>((() => api.post(`/approval/${batchId}/publish`))),
};

// ============================================================
// REVIEW API
// ============================================================
export const reviewApi = {
  getJob: (jobId: string) => call<any>((() => api.get(`/review/${jobId}`))),
  resolveItem: (itemId: string, resolution: 'accepted' | 'rejected' | 'edited', correctedValue?: string) =>
    call<any>((() => api.patch(`/review/${itemId}`, { resolution, correctedValue }))),
  approveAll: (jobId: string) => call<any>((() => api.post(`/review/${jobId}/approve-all`))),
};

// ============================================================
// AI UPLOAD API (SSE-based — uses fetch, not axios)
// ============================================================
export const uploadApi = {
  streamUpload: async (
    file: File,
    uploadType: 'students' | 'results',
    academicYear: string,
    departmentId?: string
  ): Promise<{ response: Response }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', uploadType);
    formData.append('academicYear', academicYear);
    if (departmentId) formData.append('departmentId', departmentId);

    const csrf = getCsrfToken();
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      // Send the HttpOnly auth cookie on cross-origin requests
      credentials: 'include',
      headers: csrf ? { 'X-CSRF-Token': csrf } : {},
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(body.message || 'Upload failed');
    }

    return { response };
  },

  getJob: (jobId: string) => call<any>((() => api.get(`/upload/${jobId}`))),
  getJobs: () => call<any[]>((() => api.get('/upload'))),
};

// ============================================================
// GPA API
// ============================================================
export const gpaApi = {
  calculateSemesterGPA: (data: any) => call<any>((() => api.post('/gpa/calculate', data))),
  getStudentGPAHistory: (studentId: string) =>
    call<any>((() => api.get(`/gpa/student/${studentId}/history`))),
  getSemesterGPA: (studentId: string, params: any) =>
    call<any>((() => api.get(`/gpa/student/${studentId}`, { params }))),
  calculateDepartmentGPAs: (data: any) =>
    call<any>((() => api.post('/gpa/calculate-department', data))),
  getDepartmentStats: (departmentId: string, params?: any) =>
    call<any>((() => api.get(`/gpa/department/${departmentId}/stats`, { params }))),
};

// ============================================================
// DEPARTMENTS API
// ============================================================
export const departmentsApi = {
  getAll: (facultyId?: string) => call<any[]>((() => api.get('/departments', { params: { facultyId } }))),
  getAllPublic: () => call<any[]>((() => api.get('/departments/public'))),
  createPublic: (data: any) => call<any>((() => api.post('/departments/public', data))),
  deletePublic: (id: string) => call<any>((() => api.delete(`/departments/public/${id}`))),
  getById: (id: string) => call<any>((() => api.get(`/departments/${id}`))),
};

// ============================================================
// REPORTS API
// ============================================================
export const reportsApi = {
  getDashboardStats: () => call<any>((() => api.get('/reports/dashboard'))),
  getDepartmentReport: (departmentId: string, params: any) =>
    call<any>((() => api.get(`/reports/department/${departmentId}`, { params }))),
  downloadDepartmentReportPDF: async (departmentId: string, params: any) => {
    const response = await api.get(`/reports/department/${departmentId}/pdf`, { params, responseType: 'blob' });
    return response.data;
  },
  downloadTranscriptPDF: async (studentId: string): Promise<Blob> => {
    const response = await api.get(`/reports/transcript/${studentId}/pdf`, { responseType: 'blob' });
    return response.data;
  },
  getFacultyStats: (academicYear?: string) =>
    call<any>((() => api.get('/reports/faculty', { params: { academicYear } }))),
};

export default api;