import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { invitationService } from '../services/invitation.service';
import { parseIntParam } from '../lib/validation';

const router = Router();

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['viewer', 'editor', 'admin']),
});

const acceptInvitationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

// POST /api/invitations - Create invitation (admin only)
router.post('/', requireAuth, requireRole('admin'), validate(createInvitationSchema), async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const invitation = await invitationService.create(req.auth!.organizationId, email, role, req.auth!.userId);
    res.status(201).json({ data: invitation });
  } catch (error) {
    next(error);
  }
});

// GET /api/invitations - List pending invitations
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const invitations = await invitationService.listPending(req.auth!.organizationId);
    res.json({ data: invitations });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/invitations/:id - Cancel invitation
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    await invitationService.cancel(id, req.auth!.organizationId);
    res.json({ data: { message: 'Invitation cancelled' } });
  } catch (error) {
    next(error);
  }
});

// GET /api/invitations/:token/validate - Validate invitation token (public)
router.get('/:token/validate', async (req, res, next) => {
  try {
    const invitation = await invitationService.validate(req.params.token);
    res.json({ data: invitation });
  } catch (error) {
    next(error);
  }
});

// POST /api/invitations/:token/accept - Accept invitation (public)
router.post('/:token/accept', validate(acceptInvitationSchema), async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const result = await invitationService.accept(req.params.token, name, password);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
