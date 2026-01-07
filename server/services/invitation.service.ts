import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../db';
import { invitations, users, organizationMemberships, organizations } from '../db/schema';
import { env, features } from '../config/env';
import { NotFoundError, ConflictError, BadRequestError } from '../errors';
import { generateToken, hashToken } from '../lib/crypto';
import { authService } from './auth.service';
import { auditService } from './audit.service';

const INVITATION_EXPIRY_DAYS = 7;

class InvitationService {
  async create(
    organizationId: number,
    email: string,
    role: 'admin' | 'member',
    invitedBy: number
  ) {
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists in organization
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(
        organizationMemberships,
        eq(organizationMemberships.userId, users.id)
      )
      .where(
        and(
          eq(users.email, normalizedEmail),
          eq(organizationMemberships.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existingUser) {
      throw new ConflictError('User is already a member of this organization');
    }

    // Check for pending invitation
    const [existingInvitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, normalizedEmail),
          eq(invitations.organizationId, organizationId),
          gt(invitations.expiresAt, new Date()),
          isNull(invitations.acceptedAt)
        )
      )
      .limit(1);

    if (existingInvitation) {
      throw new ConflictError('An invitation is already pending for this email');
    }

    // Generate token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    // Get organization name for email
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // Create invitation
    const [invitation] = await db
      .insert(invitations)
      .values({
        email: normalizedEmail,
        organizationId,
        role,
        tokenHash,
        expiresAt,
        invitedBy,
      })
      .returning();

    // Send email or log
    const inviteUrl = `${env.APP_URL}/accept-invitation?token=${token}`;

    if (features.email) {
      // TODO: Send email via Resend
      console.log(`[EMAIL] Invitation link: ${inviteUrl}`);
    } else {
      console.log(`[DEV] Invitation link for ${normalizedEmail}: ${inviteUrl}`);
    }

    // Audit log
    await auditService.log({
      action: 'invitation.created',
      resourceType: 'invitation',
      resourceId: invitation.id,
      userId: invitedBy,
      organizationId,
      details: { email: normalizedEmail, role },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      organizationName: org?.name,
    };
  }

  async listPending(organizationId: number) {
    const pendingInvitations = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        invitedByName: users.name,
      })
      .from(invitations)
      .leftJoin(users, eq(users.id, invitations.invitedBy))
      .where(
        and(
          eq(invitations.organizationId, organizationId),
          gt(invitations.expiresAt, new Date()),
          isNull(invitations.acceptedAt)
        )
      )
      .orderBy(invitations.createdAt);

    return pendingInvitations;
  }

  async cancel(id: number, organizationId: number) {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, id),
          eq(invitations.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!invitation) {
      throw new NotFoundError('Invitation', id);
    }

    await db.delete(invitations).where(eq(invitations.id, id));
  }

  async validate(token: string) {
    const tokenHash = hashToken(token);

    const [invitation] = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        organizationId: invitations.organizationId,
        organizationName: organizations.name,
        expiresAt: invitations.expiresAt,
        acceptedAt: invitations.acceptedAt,
      })
      .from(invitations)
      .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
      .where(eq(invitations.tokenHash, tokenHash))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestError('This invitation has already been accepted');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestError('This invitation has expired');
    }

    return {
      email: invitation.email,
      organizationName: invitation.organizationName,
      role: invitation.role,
    };
  }

  async accept(token: string, name: string, password: string) {
    const tokenHash = hashToken(token);

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tokenHash, tokenHash),
          gt(invitations.expiresAt, new Date()),
          isNull(invitations.acceptedAt)
        )
      )
      .limit(1);

    if (!invitation) {
      throw new BadRequestError('Invalid or expired invitation');
    }

    // Hash password
    const passwordHash = await authService.hashPassword(password);

    // Create user and membership in transaction
    const result = await db.transaction(async (tx) => {
      // Create user
      const [user] = await tx
        .insert(users)
        .values({
          email: invitation.email,
          name,
          passwordHash,
        })
        .returning();

      // Create membership
      await tx.insert(organizationMemberships).values({
        userId: user.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
      });

      // Mark invitation as accepted
      await tx
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invitation.id));

      return user;
    });

    // Login the new user
    const loginResult = await authService.login(invitation.email, password);

    // Audit log
    await auditService.log({
      action: 'invitation.accepted',
      resourceType: 'invitation',
      resourceId: invitation.id,
      userId: result.id,
      organizationId: invitation.organizationId,
      details: { email: invitation.email },
    });

    return loginResult;
  }
}

export const invitationService = new InvitationService();
