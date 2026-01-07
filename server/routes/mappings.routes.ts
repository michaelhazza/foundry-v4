import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { mappingService } from '../services/mapping.service';
import { parseIntParam } from '../lib/validation';

const router = Router();

const updateMappingsSchema = z.object({
  mappings: z.array(z.object({
    id: z.number().int().optional(),
    sourceField: z.string(),
    targetField: z.string(),
    isPii: z.boolean().default(false),
  })),
});

// GET /api/sources/:sourceId/mappings - Get mappings for source
router.get('/sources/:sourceId/mappings', requireAuth, async (req, res, next) => {
  try {
    const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
    const mappings = await mappingService.getBySource(sourceId, req.auth!.organizationId);
    res.json({ data: mappings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/sources/:sourceId/mappings - Update mappings
router.put(
  '/sources/:sourceId/mappings',
  requireAuth,
  validate(updateMappingsSchema),
  async (req, res, next) => {
    try {
      const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
      const mappings = await mappingService.updateMappings(
        sourceId,
        req.auth!.organizationId,
        req.body.mappings,
        req.auth!.userId
      );
      res.json({ data: mappings });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/sources/:sourceId/mappings/auto-detect - Auto-detect mappings
router.post('/sources/:sourceId/mappings/auto-detect', requireAuth, async (req, res, next) => {
  try {
    const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
    const mappings = await mappingService.autoDetect(sourceId, req.auth!.organizationId);
    res.json({ data: mappings });
  } catch (error) {
    next(error);
  }
});

// GET /api/sources/:sourceId/mappings/preview - Preview mapped data
router.get('/sources/:sourceId/mappings/preview', requireAuth, async (req, res, next) => {
  try {
    const sourceId = parseIntParam(req.params.sourceId, 'sourceId');
    const preview = await mappingService.getPreview(sourceId, req.auth!.organizationId);
    res.json({ data: preview });
  } catch (error) {
    next(error);
  }
});

export default router;
