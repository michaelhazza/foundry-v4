import { eq, and, isNull, like, or, sql, count } from 'drizzle-orm';
import { db } from '../db';
import { projects, sources } from '../db/schema';
import { NotFoundError, ConflictError } from '../errors';
import { auditService } from './audit.service';

interface CreateProjectData {
  name: string;
  description?: string;
}

interface UpdateProjectData {
  name?: string;
  description?: string;
  piiSettings?: {
    allowList?: string[];
    customPatterns?: Array<{ name: string; pattern: string }>;
  };
  filterSettings?: {
    minLength?: number;
    dateRange?: { start?: string; end?: string };
    statuses?: string[];
  };
}

interface ListOptions {
  page: number;
  limit: number;
  offset: number;
  includeArchived?: boolean;
  search?: string;
}

class ProjectService {
  async create(organizationId: number, data: CreateProjectData, userId: number) {
    // Check for duplicate name
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          eq(projects.name, data.name)
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictError('A project with this name already exists');
    }

    const [project] = await db
      .insert(projects)
      .values({
        organizationId,
        name: data.name,
        description: data.description,
        status: 'draft',
        piiSettings: {},
        filterSettings: {},
      })
      .returning();

    // Audit log
    await auditService.log({
      action: 'project.created',
      resourceType: 'project',
      resourceId: project.id,
      userId,
      organizationId,
      details: { name: project.name },
    });

    return project;
  }

  async list(organizationId: number, options: ListOptions) {
    const conditions = [eq(projects.organizationId, organizationId)];

    if (!options.includeArchived) {
      conditions.push(isNull(projects.archivedAt));
    }

    if (options.search) {
      conditions.push(
        or(
          like(projects.name, `%${options.search}%`),
          like(projects.description, `%${options.search}%`)
        )!
      );
    }

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          archivedAt: projects.archivedAt,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          sourceCount: sql<number>`(
            SELECT COUNT(*) FROM sources WHERE sources.project_id = ${projects.id}
          )`.as('sourceCount'),
        })
        .from(projects)
        .where(and(...conditions))
        .orderBy(projects.updatedAt)
        .limit(options.limit)
        .offset(options.offset),
      db
        .select({ total: count() })
        .from(projects)
        .where(and(...conditions)),
    ]);

    return {
      items,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  async getById(id: number, organizationId: number) {
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, id), eq(projects.organizationId, organizationId))
      )
      .limit(1);

    if (!project) {
      throw new NotFoundError('Project', id);
    }

    // Get source count
    const [{ sourceCount }] = await db
      .select({ sourceCount: count() })
      .from(sources)
      .where(eq(sources.projectId, id));

    return { ...project, sourceCount };
  }

  async update(
    id: number,
    organizationId: number,
    data: UpdateProjectData,
    userId: number
  ) {
    const project = await this.getById(id, organizationId);

    // Check for duplicate name if changing
    if (data.name && data.name !== project.name) {
      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, organizationId),
            eq(projects.name, data.name)
          )
        )
        .limit(1);

      if (existing) {
        throw new ConflictError('A project with this name already exists');
      }
    }

    const [updated] = await db
      .update(projects)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    // Audit log
    await auditService.log({
      action: 'project.updated',
      resourceType: 'project',
      resourceId: id,
      userId,
      organizationId,
      details: { changes: Object.keys(data) },
    });

    return updated;
  }

  async archive(id: number, organizationId: number, userId: number) {
    await this.getById(id, organizationId);

    const [updated] = await db
      .update(projects)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    // Audit log
    await auditService.log({
      action: 'project.archived',
      resourceType: 'project',
      resourceId: id,
      userId,
      organizationId,
      details: {},
    });

    return updated;
  }

  async restore(id: number, organizationId: number, userId: number) {
    await this.getById(id, organizationId);

    const [updated] = await db
      .update(projects)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    // Audit log
    await auditService.log({
      action: 'project.restored',
      resourceType: 'project',
      resourceId: id,
      userId,
      organizationId,
      details: {},
    });

    return updated;
  }
}

export const projectService = new ProjectService();
