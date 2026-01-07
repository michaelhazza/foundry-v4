import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors';
import { logger } from '../lib/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();

  // Log error
  logger.error(err.message, {
    requestId,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: (req as any).auth?.userId,
  });

  // Handle known AppError types
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ...err.toJSON(),
      requestId,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    err.errors.forEach((e) => {
      const path = e.path.join('.');
      fields[path] = e.message;
    });
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: fields,
      },
      requestId,
    });
  }

  // Unknown errors - don't leak details in production
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred',
    },
    requestId,
  });
}
