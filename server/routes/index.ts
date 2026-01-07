import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import invitationsRoutes from './invitations.routes';
import teamRoutes from './team.routes';
import projectsRoutes from './projects.routes';
import sourcesRoutes from './sources.routes';
import mappingsRoutes from './mappings.routes';
import jobsRoutes from './jobs.routes';
import exportsRoutes from './exports.routes';
import auditRoutes from './audit.routes';
import adminRoutes from './admin.routes';
import { generalLimiter, authLimiter } from '../middleware/rate-limit';

const router = Router();

// Health endpoint - no auth, no rate limit
router.use(healthRoutes);

// Auth routes with stricter rate limiting
router.use('/auth', authLimiter, authRoutes);

// Apply general rate limiting to all other routes
router.use(generalLimiter);

// Protected routes (auth middleware applied per-route as needed)
router.use('/invitations', invitationsRoutes);
router.use('/team', teamRoutes);
router.use('/projects', projectsRoutes);
router.use('/sources', sourcesRoutes);
router.use('/mappings', mappingsRoutes);
router.use('/jobs', jobsRoutes);
router.use('/exports', exportsRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/admin', adminRoutes);

export default router;
