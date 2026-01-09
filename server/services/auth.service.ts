import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../db';
import { users, organizationMemberships, organizations, passwordResets } from '../db/schema';
import { env, features } from '../config/env';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../errors';
import { generateToken, hashToken } from '../lib/crypto';
import { auditService } from './audit.service';
import { emailConnector } from '../connectors/email.connector';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 12;

interface LoginResult {
  user: {
    id: number;
    email: string;
    name: string;
    organizationId: number;
    organizationName: string;
    role: string;
    isPlatformAdmin: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

interface TokenPayload {
  userId: number;
  email: string;
  organizationId: number;
  role: string;
  isPlatformAdmin: boolean;
}

class AuthService {
  async login(email: string, password: string): Promise<LoginResult> {
    // Find user with membership
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        isPlatformAdmin: users.isPlatformAdmin,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Get primary organization membership
    const [membership] = await db
      .select({
        organizationId: organizationMemberships.organizationId,
        role: organizationMemberships.role,
        organizationName: organizations.name,
        disabledAt: organizations.disabledAt,
      })
      .from(organizationMemberships)
      .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
      .where(eq(organizationMemberships.userId, user.id))
      .limit(1);

    if (!membership) {
      throw new UnauthorizedError('No organization membership found');
    }

    if (membership.disabledAt) {
      throw new UnauthorizedError('Organization has been disabled');
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      organizationId: membership.organizationId,
      role: membership.role,
      isPlatformAdmin: user.isPlatformAdmin || false,
    };

    const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      env.JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Log audit event
    await auditService.log({
      action: 'user.login',
      resourceType: 'user',
      resourceId: user.id,
      userId: user.id,
      organizationId: membership.organizationId,
      details: { email: user.email },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: membership.organizationId,
        organizationName: membership.organizationName,
        role: membership.role,
        isPlatformAdmin: user.isPlatformAdmin || false,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_SECRET) as { userId: number; type: string };

      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Get user and membership
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          isPlatformAdmin: users.isPlatformAdmin,
        })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const [membership] = await db
        .select()
        .from(organizationMemberships)
        .where(eq(organizationMemberships.userId, user.id))
        .limit(1);

      if (!membership) {
        throw new UnauthorizedError('No organization membership');
      }

      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        organizationId: membership.organizationId,
        role: membership.role,
        isPlatformAdmin: user.isPlatformAdmin || false,
      };

      const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });

      return { accessToken };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async getCurrentUser(token: string) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          isPlatformAdmin: users.isPlatformAdmin,
        })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const [membership] = await db
        .select({
          organizationId: organizationMemberships.organizationId,
          role: organizationMemberships.role,
          organizationName: organizations.name,
        })
        .from(organizationMemberships)
        .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
        .where(eq(organizationMemberships.userId, user.id))
        .limit(1);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: membership?.organizationId,
        organizationName: membership?.organizationName,
        role: membership?.role,
        isPlatformAdmin: user.isPlatformAdmin,
      };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    // Generate token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save to database
    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Send email or log
    const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;

    await emailConnector.sendPasswordReset(email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);

    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          gt(passwordResets.expiresAt, new Date()),
          isNull(passwordResets.usedAt)
        )
      )
      .limit(1);

    if (!reset) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update user and mark token as used
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, reset.userId));

      await tx
        .update(passwordResets)
        .set({ usedAt: new Date() })
        .where(eq(passwordResets.id, reset.id));
    });

    // Get organization for audit log
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, reset.userId))
      .limit(1);

    if (membership) {
      await auditService.log({
        action: 'user.password_reset',
        resourceType: 'user',
        resourceId: reset.userId,
        userId: reset.userId,
        organizationId: membership.organizationId,
        details: {},
      });
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }
}

export const authService = new AuthService();
