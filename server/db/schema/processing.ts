import { pgTable, serial, varchar, text, timestamp, integer, jsonb, index, bigint } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { sources } from './sources';

export interface JobConfigSnapshot {
  piiSettings?: Record<string, unknown>;
  filterSettings?: Record<string, unknown>;
  sourceIds?: number[];
}

export const processingJobs = pgTable('processing_jobs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: integer('progress').notNull().default(0), // 0-100
  recordsTotal: integer('records_total').notNull().default(0),
  recordsProcessed: integer('records_processed').notNull().default(0),
  configSnapshot: jsonb('config_snapshot').$type<JobConfigSnapshot>().default({}),
  warnings: jsonb('warnings').$type<string[]>(),
  errors: jsonb('errors').$type<string[]>(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('processing_jobs_project_id_idx').on(table.projectId),
  statusIdx: index('processing_jobs_status_idx').on(table.status),
  createdAtIdx: index('processing_jobs_created_at_idx').on(table.createdAt),
}));

export const processedRecords = pgTable('processed_records', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull().references(() => processingJobs.id, { onDelete: 'cascade' }),
  sourceId: integer('source_id').notNull().references(() => sources.id, { onDelete: 'cascade' }),
  originalData: jsonb('original_data').notNull(),
  processedData: jsonb('processed_data').notNull(),
  piiTokensMap: jsonb('pii_tokens_map').$type<Record<string, string>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  jobIdIdx: index('processed_records_job_id_idx').on(table.jobId),
  sourceIdIdx: index('processed_records_source_id_idx').on(table.sourceId),
}));

export const exports = pgTable('exports', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull().references(() => processingJobs.id, { onDelete: 'cascade' }),
  format: varchar('format', { length: 50 }).notNull(), // 'jsonl_conversation' | 'jsonl_qa' | 'json_raw'
  filePath: text('file_path').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  recordCount: integer('record_count').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  jobIdIdx: index('exports_job_id_idx').on(table.jobId),
  expiresAtIdx: index('exports_expires_at_idx').on(table.expiresAt),
}));

export type ProcessingJob = typeof processingJobs.$inferSelect;
export type NewProcessingJob = typeof processingJobs.$inferInsert;
export type ProcessedRecord = typeof processedRecords.$inferSelect;
export type NewProcessedRecord = typeof processedRecords.$inferInsert;
export type Export = typeof exports.$inferSelect;
export type NewExport = typeof exports.$inferInsert;
