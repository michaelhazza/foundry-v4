import rateLimit from 'express-rate-limit';
import { RateLimitError } from '../errors';

// Auth endpoints: 5 requests per minute
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime?.getTime() || Date.now() + 60000 - Date.now()) / 1000);
    const error = new RateLimitError(retryAfter);
    res.status(429).json({
      ...error.toJSON(),
      requestId: req.headers['x-request-id'] || crypto.randomUUID(),
    });
  },
});

// General API: 100 requests per minute
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime?.getTime() || Date.now() + 60000 - Date.now()) / 1000);
    const error = new RateLimitError(retryAfter);
    res.status(429).json({
      ...error.toJSON(),
      requestId: req.headers['x-request-id'] || crypto.randomUUID(),
    });
  },
});

// Upload endpoints: 20 requests per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime?.getTime() || Date.now() + 3600000 - Date.now()) / 1000);
    const error = new RateLimitError(retryAfter);
    res.status(429).json({
      ...error.toJSON(),
      requestId: req.headers['x-request-id'] || crypto.randomUUID(),
    });
  },
});
