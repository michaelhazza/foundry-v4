import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { exportService } from '../services/export.service';
import { parseIntParam } from '../lib/validation';

const router = Router();

const createExportSchema = z.object({
  format: z.enum(['jsonl', 'qa', 'raw']),
  options: z.object({
    systemPrompt: z.string().optional(),
    contextWindow: z.number().int().min(1).max(10).optional(),
  }).optional(),
});

// POST /api/jobs/:jobId/exports - Generate export
router.post('/jobs/:jobId/exports', requireAuth, validate(createExportSchema), async (req, res, next) => {
  try {
    const jobId = parseIntParam(req.params.jobId, 'jobId');
    const exportRecord = await exportService.createExport(
      jobId,
      req.auth!.organizationId,
      req.body.format,
      req.body.options,
      req.auth!.userId
    );
    res.status(201).json({ data: exportRecord });
  } catch (error) {
    next(error);
  }
});

// GET /api/jobs/:jobId/exports - List exports for job
router.get('/jobs/:jobId/exports', requireAuth, async (req, res, next) => {
  try {
    const jobId = parseIntParam(req.params.jobId, 'jobId');
    const exports = await exportService.listByJob(jobId, req.auth!.organizationId);
    res.json({ data: exports });
  } catch (error) {
    next(error);
  }
});

// GET /api/exports/:id - Get export metadata
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const exportRecord = await exportService.getById(id, req.auth!.organizationId);
    res.json({ data: exportRecord });
  } catch (error) {
    next(error);
  }
});

// GET /api/exports/:id/download - Download export file
router.get('/:id/download', requireAuth, async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const { stream, filename, contentType } = await exportService.download(id, req.auth!.organizationId);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
