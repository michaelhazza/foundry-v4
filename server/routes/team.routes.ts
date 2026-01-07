import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { userService } from '../services/user.service';
import { parseIntParam } from '../lib/validation';

const router = Router();

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

// GET /api/team - List team members
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const members = await userService.listTeamMembers(req.auth!.organizationId);
    res.json({ data: members });
  } catch (error) {
    next(error);
  }
});

// GET /api/team/:userId - Get team member details
router.get('/:userId', requireAuth, async (req, res, next) => {
  try {
    const userId = parseIntParam(req.params.userId, 'userId');
    const member = await userService.getTeamMember(userId, req.auth!.organizationId);
    res.json({ data: member });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/team/:userId - Update member role (admin only)
router.patch('/:userId', requireAuth, requireRole('admin'), validate(updateRoleSchema), async (req, res, next) => {
  try {
    const userId = parseIntParam(req.params.userId, 'userId');
    const { role } = req.body;
    const member = await userService.updateRole(userId, req.auth!.organizationId, role);
    res.json({ data: member });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/team/:userId - Remove team member (admin only)
router.delete('/:userId', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const userId = parseIntParam(req.params.userId, 'userId');
    await userService.removeMember(userId, req.auth!.organizationId, req.auth!.userId);
    res.json({ data: { message: 'Member removed' } });
  } catch (error) {
    next(error);
  }
});

export default router;
