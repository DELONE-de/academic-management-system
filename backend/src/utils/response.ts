// src/utils/response.ts

import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

/**
 * Sends a successful response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
  };
  return res.status(statusCode).json(response);
}

/**
 * Sends an error response
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: string
): Response {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  };
  return res.status(statusCode).json(response);
}

/**
 * Sends a created response
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message: string = 'Created successfully'
): Response {
  return sendSuccess(res, data, message, 201);
}

/**
 * Sends a no content response
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Sends a bad request response
 */
export function sendBadRequest(
  res: Response,
  message: string = 'Bad request',
  error?: string
): Response {
  return sendError(res, message, 400, error);
}

/**
 * Sends an unauthorized response
 */
export function sendUnauthorized(
  res: Response,
  message: string = 'Unauthorized'
): Response {
  return sendError(res, message, 401);
}

/**
 * Sends a forbidden response
 */
export function sendForbidden(
  res: Response,
  message: string = 'Forbidden'
): Response {
  return sendError(res, message, 403);
}

/**
 * Sends a not found response
 */
export function sendNotFound(
  res: Response,
  message: string = 'Resource not found'
): Response {
  return sendError(res, message, 404);
}