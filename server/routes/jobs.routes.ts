import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { processingService } from '../services/processing.service';
import { parseIntParam, parsePagination } from '../lib/validation';

const router = Router();

const startJobSchema = z.object({
  sourceIds: z.array(z.number().int()).optional(),
});

// POST /api/projects/:projectId/jobs - Start processing job
router.post('/projects/:projectId/jobs', requireAuth, requireRole('editor'), validate(startJobSchema), async (req, res, next) => {
  try {
    const projectId = parseIntParam(req.params.projectId, 'projectId');
    const job = await processingService.startJob(
      projectId,
      req.auth!.organizationId,
      req.body.sourceIds,
      req.auth!.userId
    );
    res.status(201).json({ data: job });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:projectId/jobs - List jobs for project
router.get('/projects/:projectId/jobs', requireAuth, async (req, res, next) => {
  try {
    const projectId = parseIntParam(req.params.projectId, 'projectId');
    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });

    const result = await processingService.listJobs(projectId, req.auth!.organizationId, {
      page,
      limit,
      offset,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/jobs/:id - Get job status
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const job = await processingService.getJob(id, req.auth!.organizationId);
    res.json({ data: job });
  } catch (error) {
    next(error);
  }
});

// POST /api/jobs/:id/cancel - Cancel job
router.post('/:id/cancel', requireAuth, requireRole('editor'), async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const job = await processingService.cancelJob(id, req.auth!.organizationId, req.auth!.userId);
    res.json({ data: job });
  } catch (error) {
    next(error);
  }
});

export default router;
