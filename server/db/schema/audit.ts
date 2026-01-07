import { pgTable, serial, varchar, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { organizations } from './organizations';

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  action: varchar('action', { length: 100 }).notNull(), // e.g., 'user.login', 'project.created', 'source.deleted'
  resourceType: varchar('resource_type', { length: 100 }).notNull(), // e.g., 'user', 'project', 'source'
  resourceId: integer('resource_id').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  organizationId: integer('organization_id').notNull().references(() => organizations.id),
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdIdx: index('audit_logs_org_id_idx').on(table.organizationId),
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceTypeIdx: index('audit_logs_resource_type_idx').on(table.resourceType),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
