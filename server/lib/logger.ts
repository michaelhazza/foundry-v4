import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: number;
  path?: string;
  method?: string;
  duration?: number;
  error?: string;
  stack?: string;
  [key: string]: unknown;
}

// Fields to redact from logs
const SENSITIVE_FIELDS = ['password', 'passwordHash', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret'];

function redactSensitive(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const safeContext = context ? redactSensitive(context) : undefined;

  if (env.NODE_ENV === 'development') {
    // Pretty format for development
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = levelColors[level];

    let output = `${color}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}`;
    if (safeContext) {
      output += '\n' + JSON.stringify(safeContext, null, 2);
    }
    return output;
  }

  // JSON format for production
  return JSON.stringify({
    level,
    timestamp,
    message,
    ...safeContext,
  });
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const output = formatLog(level, message, context);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (env.NODE_ENV === 'development') {
      log('debug', message, context);
    }
  },
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
};
