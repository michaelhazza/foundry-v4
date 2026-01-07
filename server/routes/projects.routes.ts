import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { projectService } from '../services/project.service';
import { parseIntParam, parsePagination } from '../lib/validation';

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  piiSettings: z.object({
    allowList: z.array(z.string()).optional(),
    customPatterns: z.array(z.object({
      name: z.string(),
      pattern: z.string(),
    })).optional(),
  }).optional(),
  filterSettings: z.object({
    minLength: z.number().int().min(0).optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    statuses: z.array(z.string()).optional(),
  }).optional(),
});

// POST /api/projects - Create project
router.post('/', requireAuth, validate(createProjectSchema), async (req, res, next) => {
  try {
    const project = await projectService.create(req.auth!.organizationId, req.body, req.auth!.userId);
    res.status(201).json({ data: project });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects - List projects
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });
    const includeArchived = req.query.includeArchived === 'true';
    const search = req.query.search as string | undefined;

    const result = await projectService.list(req.auth!.organizationId, {
      page,
      limit,
      offset,
      includeArchived,
      search,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id - Get project
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const project = await projectService.getById(id, req.auth!.organizationId);
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/projects/:id - Update project
router.patch('/:id', requireAuth, validate(updateProjectSchema), async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const project = await projectService.update(id, req.auth!.organizationId, req.body, req.auth!.userId);
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:id/archive - Archive project
router.post('/:id/archive', requireAuth, async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const project = await projectService.archive(id, req.auth!.organizationId, req.auth!.userId);
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:id/restore - Restore project
router.post('/:id/restore', requireAuth, async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const project = await projectService.restore(id, req.auth!.organizationId, req.auth!.userId);
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
});

export default router;
