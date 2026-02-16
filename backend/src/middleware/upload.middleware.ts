// FILE: backend/src/middleware/upload.middleware.ts

import multer from 'multer';
import { Request } from 'express';
import { AppError } from './error.middleware.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for Excel files
const excelFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const allowedMimes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ];

  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    callback(null, true);
  } else {
    callback(new AppError('Only Excel files (.xlsx, .xls) and CSV files are allowed', 400) as any);
  }
};

// Create multer upload instance
export const uploadExcel = multer({
  storage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Error handler for multer errors
export function handleMulterError(error: any, req: any, res: any, next: any) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
    });
  }
  next(error);
}