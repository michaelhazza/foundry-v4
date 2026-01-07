import { eq, and, gte, lte, desc, count } from 'drizzle-orm';
import { db } from '../db';
import { auditLogs, users } from '../db/schema';

interface AuditLogEntry {
  action: string;
  resourceType: string;
  resourceId: number;
  userId: number;
  organizationId: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

interface ListOptions {
  page: number;
  limit: number;
  offset: number;
  userId?: number;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
}

class AuditService {
  async log(entry: AuditLogEntry) {
    try {
      await db.insert(auditLogs).values({
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        userId: entry.userId,
        organizationId: entry.organizationId,
        details: entry.details || {},
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      });
    } catch (error) {
      // Log audit failures but don't throw - audit should not break operations
      console.error('Failed to write audit log:', error);
    }
  }

  async list(organizationId: number, options: ListOptions) {
    const conditions = [eq(auditLogs.organizationId, organizationId)];

    if (options.userId) {
      conditions.push(eq(auditLogs.userId, options.userId));
    }

    if (options.action) {
      conditions.push(eq(auditLogs.action, options.action));
    }

    if (options.resourceType) {
      conditions.push(eq(auditLogs.resourceType, options.resourceType));
    }

    if (options.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(options.startDate)));
    }

    if (options.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(options.endDate)));
    }

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          details: auditLogs.details,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          userId: auditLogs.userId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.userId))
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(options.limit)
        .offset(options.offset),
      db
        .select({ total: count() })
        .from(auditLogs)
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

  async exportToCsv(
    organizationId: number,
    filters: Omit<ListOptions, 'page' | 'limit' | 'offset'>
  ): Promise<string> {
    const conditions = [eq(auditLogs.organizationId, organizationId)];

    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }

    if (filters.resourceType) {
      conditions.push(eq(auditLogs.resourceType, filters.resourceType));
    }

    if (filters.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
    }

    if (filters.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
    }

    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10000); // Max export limit

    // Generate CSV
    const headers = [
      'ID',
      'Timestamp',
      'User',
      'Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'Details',
      'IP Address',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.userName || '',
      log.userEmail || '',
      log.action,
      log.resourceType,
      log.resourceId,
      JSON.stringify(log.details),
      log.ipAddress || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) =>
            typeof cell === 'string' && cell.includes(',')
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(',')
      ),
    ].join('\n');

    return csv;
  }
}

export const auditService = new AuditService();
