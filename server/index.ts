import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env, logFeatureStatus } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { requestIdMiddleware } from './middleware/request-id';
import { requestLogger } from './middleware/request-logger';
import routes from './routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create required directories on startup
const dataDir = path.join(process.cwd(), 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const exportsDir = path.join(dataDir, 'exports');

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(exportsDir, { recursive: true });

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === 'development' ? true : env.APP_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Request tracking
app.use(requestIdMiddleware);
app.use(requestLogger);

// API Routes
app.use('/api', routes);

// Serve static files in production
if (env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../dist/public');

  app.use(express.static(staticPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = env.PORT;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📦 Environment: ${env.NODE_ENV}`);
  logFeatureStatus();
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
