// src/middleware/error.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { logger, getRequestId } from '../utils/logger.js';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = getRequestId(req);
  const ctx = { requestId, method: req.method, route: req.originalUrl };

  if (err instanceof AppError) {
    logger.warn(`operational error: ${err.message}`, { ...ctx, statusCode: err.statusCode });
    sendError(res, err.message, err.statusCode);
    return;
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    logger.error('database error', { ...ctx, error: err.message });
    sendError(res, 'Database operation failed', 400);
    return;
  }

  logger.error('unhandled error', { ...ctx, error: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });

  // Default error
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred' 
    : err.message;

  sendError(res, message, 500);
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route ${req.originalUrl} not found`, 404);
}