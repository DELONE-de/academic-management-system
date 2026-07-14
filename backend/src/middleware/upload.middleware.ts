// FILE: backend/src/middleware/upload.middleware.ts

import multer from 'multer';
import { Request } from 'express';
import { AppError } from './error.middleware.js';

const storage = multer.memoryStorage();

const ALLOWED_MIMES: Record<string, string> = {
  // Excel
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  // CSV
  'text/csv': 'csv',
  'text/plain': 'csv',
  // PDF
  'application/pdf': 'pdf',
  // Images
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};

const ALLOWED_EXTENSIONS: Record<string, string> = {
  '.xlsx': 'excel',
  '.xls': 'excel',
  '.csv': 'csv',
  '.pdf': 'pdf',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.webp': 'image',
};

export function getFileType(file: Express.Multer.File): string | null {
  if (ALLOWED_MIMES[file.mimetype]) return ALLOWED_MIMES[file.mimetype];
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  return ALLOWED_EXTENSIONS[ext] || null;
}

const aiUploadFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  if (getFileType(file)) {
    callback(null, true);
  } else {
    callback(
      new AppError(
        'Unsupported file type. Allowed: .xlsx, .xls, .csv, .pdf, .jpg, .png, .webp',
        400
      ) as any
    );
  }
};

// Legacy Excel-only filter (kept for existing bulk routes)
const excelFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const type = getFileType(file);
  if (type === 'excel' || type === 'csv') {
    callback(null, true);
  } else {
    callback(new AppError('Only Excel (.xlsx, .xls) and CSV files are allowed', 400) as any);
  }
};

// AI upload — accepts Excel, CSV, PDF, images
export const uploadAI = multer({
  storage,
  fileFilter: aiUploadFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for images/PDFs
});

// Legacy Excel-only upload (existing bulk routes)
export const uploadExcel = multer({
  storage,
  fileFilter: excelFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function handleMulterError(error: any, req: any, res: any, next: any) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 20MB' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${error.message}` });
  }
  next(error);
}