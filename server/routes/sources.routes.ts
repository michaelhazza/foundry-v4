import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rate-limit';
import { sourceService } from '../services/source.service';
import { parseIntParam } from '../lib/validation';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orgId = (req as any).auth?.organizationId || 'temp';
    const uploadPath = path.join(process.cwd(), 'data', 'uploads', String(orgId));
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: CSV, Excel, JSON'));
    }
  },
});

const teamworkSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subdomain: z.string().min(1, 'Subdomain is required'),
  apiKey: z.string().min(1, 'API key is required'),
});

const gohighlevelSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  apiKey: z.string().min(1, 'API key is required'),
  locationId: z.string().optional(),
});

const updateSourceSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
});

// GET /api/projects/:projectId/sources - List sources for project
router.get('/projects/:projectId/sources', requireAuth, async (req, res, next) => {
  try {
    const projectId = parseIntParam(req.params.projectId, 'projectId');
    const sources = await sourceService.listByProject(projectId, req.auth!.organizationId);
    res.json({ data: sources });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/sources/file - Upload file source
router.post(
  '/projects/:projectId/sources/file',
  requireAuth,
  uploadLimiter,
  upload.single('file'),
  async (req, res, next) => {
    try {
      const projectId = parseIntParam(req.params.projectId, 'projectId');
      if (!req.file) {
        return res.status(400).json({
          error: { code: 'BAD_REQUEST', message: 'No file uploaded' },
        });
      }
      const source = await sourceService.createFileSource(
        projectId,
        req.auth!.organizationId,
        req.file,
        req.auth!.userId
      );
      res.status(201).json({ data: source });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/projects/:projectId/sources/teamwork - Create Teamwork source
router.post(
  '/projects/:projectId/sources/teamwork',
  requireAuth,
  validate(teamworkSourceSchema),
  async (req, res, next) => {
    try {
      const projectId = parseIntParam(req.params.projectId, 'projectId');
      const source = await sourceService.createTeamworkSource(
        projectId,
        req.auth!.organizationId,
        req.body,
        req.auth!.userId
      );
      res.status(201).json({ data: source });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/projects/:projectId/sources/gohighlevel - Create GoHighLevel source
router.post(
  '/projects/:projectId/sources/gohighlevel',
  requireAuth,
  validate(gohighlevelSourceSchema),
  async (req, res, next) => {
    try {
      const projectId = parseIntParam(req.params.projectId, 'projectId');
      const source = await sourceService.createGoHighLevelSource(
        projectId,
        req.auth!.organizationId,
        req.body,
        req.auth!.userId
      );
      res.status(201).json({ data: source });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/sources/:id - Get source
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const source = await sourceService.getById(id, req.auth!.organizationId);
    res.json({ data: source });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/sources/:id - Update source
router.patch('/:id', requireAuth, validate(updateSourceSchema), async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const source = await sourceService.update(id, req.auth!.organizationId, req.body, req.auth!.userId);
    res.json({ data: source });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/sources/:id - Delete source
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    await sourceService.delete(id, req.auth!.organizationId, req.auth!.userId);
    res.json({ data: { message: 'Source deleted' } });
  } catch (error) {
    next(error);
  }
});

// POST /api/sources/:id/test - Test source connection
router.post('/:id/test', requireAuth, async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const result = await sourceService.testConnection(id, req.auth!.organizationId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/sources/:id/preview - Preview source data
router.get('/:id/preview', requireAuth, async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const preview = await sourceService.getPreview(id, req.auth!.organizationId);
    res.json({ data: preview });
  } catch (error) {
    next(error);
  }
});

export default router;
