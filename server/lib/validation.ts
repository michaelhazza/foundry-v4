import { BadRequestError } from '../errors';

/**
 * Safely parse an integer URL parameter.
 * ALWAYS use this instead of parseInt(req.params.id, 10).
 *
 * @throws BadRequestError if value is not a valid positive integer
 */
export function parseIntParam(value: string, paramName: string): number {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new BadRequestError(`Invalid ${paramName}`);
  }
  return parsed;
}

/**
 * Parse optional query parameter with default value.
 */
export function parseQueryInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

/**
 * Parse pagination parameters from query string.
 */
export function parsePagination(query: { page?: string; limit?: string }) {
  const page = parseQueryInt(query.page, 1);
  const limit = Math.min(parseQueryInt(query.limit, 20), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
