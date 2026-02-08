// src/middleware/validation.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendBadRequest } from '../utils/response.js';

/**
 * Creates a validation middleware for request body
 * @param schema - Zod schema to validate against
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        sendBadRequest(res, 'Validation failed', JSON.stringify(errorMessages));
        return;
      }
      sendBadRequest(res, 'Invalid request data');
    }
  };
}

/**
 * Creates a validation middleware for query parameters
 * @param schema - Zod schema to validate against
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        sendBadRequest(res, 'Invalid query parameters', JSON.stringify(errorMessages));
        return;
      }
      sendBadRequest(res, 'Invalid query parameters');
    }
  };
}

/**
 * Creates a validation middleware for route parameters
 * @param schema - Zod schema to validate against
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        sendBadRequest(res, 'Invalid route parameters', JSON.stringify(errorMessages));
        return;
      }
      sendBadRequest(res, 'Invalid route parameters');
    }
  };
}