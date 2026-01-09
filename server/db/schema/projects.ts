import { pgTable, serial, varchar, text, timestamp, integer, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export interface PiiSettings {
  allowList?: string[];
  customPatterns?: Array<{ name: string; pattern: string }>;
}

export interface FilterSettings {
  minLength?: number;
  dateRange?: {
    start?: string;
    end?: string;
  };
  statuses?: string[];
}

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // 'draft' | 'processing' | 'completed' | 'error'
  piiSettings: jsonb('pii_settings').$type<PiiSettings>().default({}),
  filterSettings: jsonb('filter_settings').$type<FilterSettings>().default({}),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgNameUnique: unique('org_name_unique').on(table.organizationId, table.name),
  orgIdIdx: index('projects_org_id_idx').on(table.organizationId),
  statusIdx: index('projects_status_idx').on(table.status),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
