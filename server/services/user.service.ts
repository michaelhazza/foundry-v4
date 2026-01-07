import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { users, organizationMemberships } from '../db/schema';
import { NotFoundError, BadRequestError, ForbiddenError } from '../errors';
import { auditService } from './audit.service';

class UserService {
  async listTeamMembers(organizationId: number) {
    const members = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: organizationMemberships.role,
        joinedAt: organizationMemberships.createdAt,
      })
      .from(users)
      .innerJoin(
        organizationMemberships,
        eq(organizationMemberships.userId, users.id)
      )
      .where(eq(organizationMemberships.organizationId, organizationId))
      .orderBy(users.name);

    return members;
  }

  async getTeamMember(userId: number, organizationId: number) {
    const [member] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: organizationMemberships.role,
        joinedAt: organizationMemberships.createdAt,
      })
      .from(users)
      .innerJoin(
        organizationMemberships,
        eq(organizationMemberships.userId, users.id)
      )
      .where(
        and(
          eq(users.id, userId),
          eq(organizationMemberships.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!member) {
      throw new NotFoundError('Team member', userId);
    }

    return member;
  }

  async updateRole(
    userId: number,
    organizationId: number,
    newRole: 'admin' | 'member'
  ) {
    // Check membership exists
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundError('Team member', userId);
    }

    // Check not the only admin
    if (membership.role === 'admin' && newRole === 'member') {
      const adminCount = await db
        .select({ count: organizationMemberships.id })
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.role, 'admin')
          )
        );

      if (adminCount.length <= 1) {
        throw new BadRequestError('Cannot remove the only admin');
      }
    }

    // Update role
    await db
      .update(organizationMemberships)
      .set({ role: newRole, updatedAt: new Date() })
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.organizationId, organizationId)
        )
      );

    return this.getTeamMember(userId, organizationId);
  }

  async removeMember(
    userId: number,
    organizationId: number,
    requestingUserId: number
  ) {
    // Cannot remove self
    if (userId === requestingUserId) {
      throw new ForbiddenError('Cannot remove yourself from the organization');
    }

    // Check membership exists
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundError('Team member', userId);
    }

    // Check not the only admin
    if (membership.role === 'admin') {
      const adminCount = await db
        .select({ count: organizationMemberships.id })
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.role, 'admin')
          )
        );

      if (adminCount.length <= 1) {
        throw new BadRequestError('Cannot remove the only admin');
      }
    }

    // Remove membership
    await db
      .delete(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.organizationId, organizationId)
        )
      );

    // Audit log
    await auditService.log({
      action: 'member.removed',
      resourceType: 'user',
      resourceId: userId,
      userId: requestingUserId,
      organizationId,
      details: {},
    });
  }
}

export const userService = new UserService();
