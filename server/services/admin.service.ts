import { eq, count, desc, isNull } from 'drizzle-orm';
import { db, testConnection } from '../db';
import { organizations, organizationMemberships, projects, users, invitations } from '../db/schema';
import { NotFoundError, ConflictError } from '../errors';
import { auditService } from './audit.service';
import { generateToken, hashToken } from '../lib/crypto';
import { env, features } from '../config/env';

interface ListOptions {
  page: number;
  limit: number;
  offset: number;
}

interface CreateOrgData {
  name: string;
  adminEmail: string;
}

class AdminService {
  async listOrganizations(options: ListOptions) {
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: organizations.id,
          name: organizations.name,
          createdAt: organizations.createdAt,
          disabledAt: organizations.disabledAt,
        })
        .from(organizations)
        .orderBy(desc(organizations.createdAt))
        .limit(options.limit)
        .offset(options.offset),
      db.select({ total: count() }).from(organizations),
    ]);

    // Get metrics for each org
    const itemsWithMetrics = await Promise.all(
      items.map(async (org) => {
        const [memberCount] = await db
          .select({ count: count() })
          .from(organizationMemberships)
          .where(eq(organizationMemberships.organizationId, org.id));

        const [projectCount] = await db
          .select({ count: count() })
          .from(projects)
          .where(eq(projects.organizationId, org.id));

        return {
          ...org,
          memberCount: memberCount.count,
          projectCount: projectCount.count,
        };
      })
    );

    return {
      items: itemsWithMetrics,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  async createOrganization(data: CreateOrgData, createdBy: number) {
    // Check for duplicate name
    const [existing] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, data.name))
      .limit(1);

    if (existing) {
      throw new ConflictError('An organization with this name already exists');
    }

    // Create organization
    const [org] = await db
      .insert(organizations)
      .values({
        name: data.name,
      })
      .returning();

    // Create invitation for admin
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(invitations).values({
      email: data.adminEmail.toLowerCase(),
      organizationId: org.id,
      role: 'admin',
      tokenHash,
      expiresAt,
      invitedBy: createdBy,
    });

    // Send invitation email or log
    const inviteUrl = `${env.APP_URL}/accept-invitation?token=${token}`;

    if (features.email) {
      console.log(`[EMAIL] Organization admin invitation: ${inviteUrl}`);
    } else {
      console.log(`[DEV] Organization admin invitation for ${data.adminEmail}: ${inviteUrl}`);
    }

    // Audit log
    await auditService.log({
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: org.id,
      userId: createdBy,
      organizationId: org.id,
      details: { name: org.name, adminEmail: data.adminEmail },
    });

    return { ...org, invitationSent: true };
  }

  async getOrganization(id: number) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    if (!org) {
      throw new NotFoundError('Organization', id);
    }

    // Get metrics
    const [memberCount] = await db
      .select({ count: count() })
      .from(organizationMemberships)
      .where(eq(organizationMemberships.organizationId, id));

    const [projectCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.organizationId, id));

    const [activeProjectCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.organizationId, id));

    return {
      ...org,
      metrics: {
        memberCount: memberCount.count,
        projectCount: projectCount.count,
        activeProjectCount: activeProjectCount.count,
      },
    };
  }

  async disableOrganization(id: number, userId: number) {
    const org = await this.getOrganization(id);

    if (org.disabledAt) {
      throw new ConflictError('Organization is already disabled');
    }

    const [updated] = await db
      .update(organizations)
      .set({ disabledAt: new Date(), updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();

    // Audit log
    await auditService.log({
      action: 'organization.disabled',
      resourceType: 'organization',
      resourceId: id,
      userId,
      organizationId: id,
      details: {},
    });

    return updated;
  }

  async enableOrganization(id: number, userId: number) {
    const org = await this.getOrganization(id);

    if (!org.disabledAt) {
      throw new ConflictError('Organization is not disabled');
    }

    const [updated] = await db
      .update(organizations)
      .set({ disabledAt: null, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();

    // Audit log
    await auditService.log({
      action: 'organization.enabled',
      resourceType: 'organization',
      resourceId: id,
      userId,
      organizationId: id,
      details: {},
    });

    return updated;
  }

  async getSystemHealth() {
    const dbHealthy = await testConnection();

    const [orgCount] = await db.select({ count: count() }).from(organizations);
    const [userCount] = await db.select({ count: count() }).from(users);
    const [projectCount] = await db.select({ count: count() }).from(projects);

    return {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealthy,
      },
      metrics: {
        organizations: orgCount.count,
        users: userCount.count,
        projects: projectCount.count,
      },
      features: {
        email: features.email,
        encryption: features.encryption,
      },
    };
  }
}

export const adminService = new AdminService();
