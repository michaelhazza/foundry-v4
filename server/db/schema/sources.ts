import { pgTable, serial, varchar, text, timestamp, integer, jsonb, index, bigint } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export interface FileSourceConfig {
  sheetName?: string;
  jsonPath?: string;
  delimiter?: string;
}

export interface TeamworkSourceConfig {
  subdomain: string;
  apiKey: string; // encrypted
  filters?: {
    status?: string[];
    dateRange?: { start?: string; end?: string };
  };
}

export interface GoHighLevelSourceConfig {
  apiKey: string; // encrypted
  locationId?: string;
  filters?: {
    types?: string[];
    dateRange?: { start?: string; end?: string };
  };
}

export type SourceConfig = FileSourceConfig | TeamworkSourceConfig | GoHighLevelSourceConfig;

export interface RawSchemaField {
  name: string;
  type: string;
  sample: unknown[];
}

export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // 'file' | 'teamwork' | 'gohighlevel'
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'connected' | 'error'
  filePath: text('file_path'),
  fileSize: bigint('file_size', { mode: 'number' }),
  mimeType: varchar('mime_type', { length: 100 }),
  config: jsonb('config').$type<SourceConfig>().default({}),
  rawSchema: jsonb('raw_schema').$type<RawSchemaField[]>().default([]),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('sources_project_id_idx').on(table.projectId),
  typeIdx: index('sources_type_idx').on(table.type),
}));

export const sourceMappings = pgTable('source_mappings', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id').notNull().references(() => sources.id, { onDelete: 'cascade' }),
  sourceField: varchar('source_field', { length: 255 }).notNull(),
  targetField: varchar('target_field', { length: 255 }).notNull(),
  confidence: varchar('confidence', { length: 50 }).notNull().default('low'), // 'high' | 'medium' | 'low'
  isPii: integer('is_pii').notNull().default(0), // Use integer as boolean for compatibility
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sourceIdIdx: index('source_mappings_source_id_idx').on(table.sourceId),
}));

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type SourceMapping = typeof sourceMappings.$inferSelect;
export type NewSourceMapping = typeof sourceMappings.$inferInsert;
