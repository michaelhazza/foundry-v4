import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = req[target];
    const result = schema.safeParse(data);

    if (!result.success) {
      // Let error handler deal with ZodError
      return next(result.error);
    }

    // Replace with parsed/transformed data
    req[target] = result.data;
    next();
  };
}
