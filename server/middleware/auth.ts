import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../errors';
import { db } from '../db';
import { users, organizationMemberships, organizations } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface AuthContext {
  userId: number;
  email: string;
  organizationId: number;
  role: 'viewer' | 'editor' | 'admin';
  isPlatformAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

interface JwtPayload {
  userId: number;
  email: string;
  organizationId: number;
  role: 'viewer' | 'editor' | 'admin';
  isPlatformAdmin: boolean;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.slice(7);
    let payload: JwtPayload;

    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }

    // Check if organization is disabled
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, payload.organizationId))
      .limit(1);

    if (!org) {
      throw new UnauthorizedError('Organization not found');
    }

    if (org.disabledAt) {
      throw new ForbiddenError('Organization has been disabled');
    }

    // Check membership is still valid
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.userId, payload.userId),
          eq(organizationMemberships.organizationId, payload.organizationId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new UnauthorizedError('No longer a member of this organization');
    }

    req.auth = {
      userId: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      role: membership.role as 'viewer' | 'editor' | 'admin',
      isPlatformAdmin: payload.isPlatformAdmin,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: Array<'viewer' | 'editor' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new UnauthorizedError());
    }

    // Hierarchical role check: admin > editor > viewer
    const roleHierarchy: Record<string, number> = { viewer: 1, editor: 2, admin: 3 };
    const userLevel = roleHierarchy[req.auth.role] || 0;
    const requiredLevel = Math.min(...roles.map(r => roleHierarchy[r]));

    if (userLevel < requiredLevel) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return next(new UnauthorizedError());
  }

  if (!req.auth.isPlatformAdmin) {
    return next(new ForbiddenError('Platform admin access required'));
  }

  next();
}
