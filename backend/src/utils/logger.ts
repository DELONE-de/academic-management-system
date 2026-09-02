// src/utils/logger.ts
// Lightweight structured logging with request correlation IDs.
// JSON-formatted output suitable for log aggregation. No external deps.

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface LogContext {
  requestId?: string;
  userId?: string;
  role?: string;
  departmentId?: string;
  [key: string]: unknown;
}

// Async-local request context (simple module-level storage; adequate for single-instance monolith)
const requestContexts = new WeakMap<Request, LogContext>();

export function getRequestId(req: Request): string {
  const ctx = requestContexts.get(req);
  return ctx?.requestId || 'no-request-id';
}

export function setRequestContext(req: Request, ctx: LogContext): void {
  requestContexts.set(req, ctx);
}

function emit(level: string, message: string, ctx: LogContext): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...ctx,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else if (level === 'debug') {
    if (process.env.DEBUG) console.debug(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(message: string, ctx: LogContext = {}): void {
    emit('info', message, ctx);
  },
  warn(message: string, ctx: LogContext = {}): void {
    emit('warn', message, ctx);
  },
  error(message: string, ctx: LogContext = {}): void {
    emit('error', message, ctx);
  },
  debug(message: string, ctx: LogContext = {}): void {
    emit('debug', message, ctx);
  },
};

/**
 * Express middleware: assigns a request ID and captures request context.
 */
export function requestCorrelation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const ctx: LogContext = { requestId };

  setRequestContext(req, ctx);
  res.setHeader('X-Request-Id', requestId);

  // Capture user context once auth middleware has run
  const originalJson = res.json.bind(res);
  res.json = ((body: any) => {
    const authReq = req as any;
    if (authReq.user) {
      ctx.userId = authReq.user.id;
      ctx.role = authReq.user.role;
      ctx.departmentId = authReq.user.departmentId || undefined;
    }
    return originalJson(body);
  }) as typeof res.json;

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('request', {
      requestId,
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ...(ctx.userId ? { userId: ctx.userId, role: ctx.role, departmentId: ctx.departmentId } : {}),
    });
  });

  next();
}
