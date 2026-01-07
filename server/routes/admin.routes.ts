import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, requirePlatformAdmin } from '../middleware/auth';
import { adminService } from '../services/admin.service';
import { parseIntParam, parsePagination } from '../lib/validation';

const router = Router();

const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  adminEmail: z.string().email('Invalid admin email'),
});

// All admin routes require platform admin
router.use(requireAuth, requirePlatformAdmin);

// GET /api/admin/organizations - List all organizations
router.get('/organizations', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });
    const result = await adminService.listOrganizations({ page, limit, offset });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/organizations - Create organization
router.post('/organizations', validate(createOrgSchema), async (req, res, next) => {
  try {
    const org = await adminService.createOrganization(req.body, req.auth!.userId);
    res.status(201).json({ data: org });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/organizations/:id - Get organization details
router.get('/organizations/:id', async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const org = await adminService.getOrganization(id);
    res.json({ data: org });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/organizations/:id/disable - Disable organization
router.post('/organizations/:id/disable', async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const org = await adminService.disableOrganization(id, req.auth!.userId);
    res.json({ data: org });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/organizations/:id/enable - Enable organization
router.post('/organizations/:id/enable', async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const org = await adminService.enableOrganization(id, req.auth!.userId);
    res.json({ data: org });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/health - System health
router.get('/health', async (req, res, next) => {
  try {
    const health = await adminService.getSystemHealth();
    res.json({ data: health });
  } catch (error) {
    next(error);
  }
});

export default router;
