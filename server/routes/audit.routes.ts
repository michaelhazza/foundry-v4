import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditService } from '../services/audit.service';
import { parsePagination, parseQueryInt } from '../lib/validation';

const router = Router();

// GET /api/audit-logs - List audit logs (admin only)
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as { page?: string; limit?: string });

    const filters = {
      userId: req.query.userId ? parseQueryInt(req.query.userId as string, 0) : undefined,
      action: req.query.action as string | undefined,
      resourceType: req.query.resourceType as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const result = await auditService.list(req.auth!.organizationId, {
      page,
      limit,
      offset,
      ...filters,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/audit-logs/export - Export audit logs to CSV (admin only)
router.get('/export', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const filters = {
      userId: req.query.userId ? parseQueryInt(req.query.userId as string, 0) : undefined,
      action: req.query.action as string | undefined,
      resourceType: req.query.resourceType as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const csv = await auditService.exportToCsv(req.auth!.organizationId, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

export default router;
