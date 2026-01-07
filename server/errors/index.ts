export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('BAD_REQUEST', message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: number | string) {
    super('NOT_FOUND', `${resource}${id ? ` with id '${id}'` : ''} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(code, message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, unknown>) {
    super('VALIDATION_ERROR', 'Request validation failed', 422, details);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, { retryAfter });
  }
}
