# Foundry: Data Model Document

**Version:** 1.0  
**Date:** January 8, 2026  
**Status:** COMPLETE  
**Source PRD Version:** 1.0  
**Source Architecture Version:** 1.0  
**Database:** PostgreSQL (Neon)  
**ORM:** Drizzle ORM

---

## Section 1: Entity Overview

### Entity List

| Entity | Purpose | PRD Reference |
|--------|---------|---------------|
| `users` | User accounts with authentication credentials | US-AUTH-001 to US-AUTH-005 |
| `organizations` | Multi-tenant containers for customer companies | US-ORG-001, F-002 |
| `organization_memberships` | User-organization relationships with roles (Viewer, Editor, Admin) | US-AUTH-003 |
| `invitations` | Pending user invitations with 7-day expiring tokens | US-AUTH-001 |
| `password_resets` | Password reset tokens with 1-hour expiry | US-AUTH-005 |
| `projects` | AI training data initiatives within organizations | US-ORG-002, US-ORG-003 |
| `sources` | Data inputs (file uploads, API connections) | US-FILE-001 to US-API-GHL-002 |
| `source_mappings` | Field mapping configurations from source to standard fields | US-MAP-001 to US-MAP-003 |
| `processing_jobs` | Batch processing job tracking with status and progress | US-PROC-001 to US-PROC-003 |
| `processed_records` | Individual processed records with de-identified content | US-DEID-001 to US-FILT-003 |
| `exports` | Generated export files with format and download metadata | US-EXP-001 to US-EXP-004 |
| `audit_logs` | Compliance event logging for all data operations | US-AUD-001, US-AUD-002 |

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FOUNDRY DATA MODEL                                │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │    users     │
                              │──────────────│
                              │ id (PK)      │
                              │ email        │
                              │ password_hash│
                              │ name         │
                              │ is_platform_ │
                              │   admin      │
                              └──────┬───────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
                 ▼                   ▼                   ▼
    ┌────────────────────┐  ┌───────────────┐  ┌─────────────────┐
    │ organization_      │  │ password_     │  │                 │
    │ memberships        │  │ resets        │  │                 │
    │────────────────────│  │───────────────│  │                 │
    │ id (PK)            │  │ id (PK)       │  │                 │
    │ user_id (FK)       │  │ user_id (FK)  │  │                 │
    │ organization_id(FK)│  │ token_hash    │  │                 │
    │ role               │  │ expires_at    │  │                 │
    └─────────┬──────────┘  └───────────────┘  │                 │
              │                                │                 │
              ▼                                │                 │
    ┌──────────────────┐                       │                 │
    │  organizations   │                       │                 │
    │──────────────────│                       │                 │
    │ id (PK)          │◄──────────────────────┘                 │
    │ name             │                                         │
    │ disabled_at      │                                         │
    └────────┬─────────┘                                         │
             │                                                   │
             ├─────────────────┬─────────────────┐               │
             │                 │                 │               │
             ▼                 ▼                 ▼               │
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐     │
    │   invitations   │ │  projects   │ │   audit_logs    │     │
    │─────────────────│ │─────────────│ │─────────────────│     │
    │ id (PK)         │ │ id (PK)     │ │ id (PK)         │     │
    │ organization_id │ │ org_id (FK) │ │ organization_id │     │
    │ email           │ │ name        │ │ user_id (FK)────┼─────┘
    │ role            │ │ description │ │ action          │
    │ token_hash      │ │ status      │ │ resource_type   │
    │ expires_at      │ │ archived_at │ │ details (JSONB) │
    └─────────────────┘ │ pii_settings│ └─────────────────┘
                        │ filter_sett.│
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │    sources      │ │ processing_jobs │ │                 │
    │─────────────────│ │─────────────────│ │                 │
    │ id (PK)         │ │ id (PK)         │ │                 │
    │ project_id (FK) │ │ project_id (FK) │ │                 │
    │ type            │ │ status          │ │                 │
    │ name            │ │ progress        │ │                 │
    │ config (JSONB)  │ │ records_total   │ │                 │
    │ status          │ │ records_done    │ │                 │
    │ file_path       │ │ config_snapshot │ │                 │
    │ raw_data(JSONB) │ │ error           │ │                 │
    └────────┬────────┘ └────────┬────────┘ │                 │
             │                   │          │                 │
             ▼                   ├──────────┘                 │
    ┌─────────────────┐          │                            │
    │ source_mappings │          ▼                            │
    │─────────────────│ ┌─────────────────┐                   │
    │ id (PK)         │ │processed_records│                   │
    │ source_id (FK)  │ │─────────────────│                   │
    │ source_field    │ │ id (PK)         │                   │
    │ target_field    │ │ job_id (FK)     │                   │
    │ confidence      │ │ source_id (FK)  │                   │
    │ is_pii          │ │ original_data   │                   │
    └─────────────────┘ │ processed_data  │                   │
                        │ pii_tokens_map  │                   │
                        └─────────────────┘                   │
                                 │                            │
                                 ▼                            │
                        ┌─────────────────┐                   │
                        │    exports      │                   │
                        │─────────────────│                   │
                        │ id (PK)         │                   │
                        │ job_id (FK)     │                   │
                        │ format          │                   │
                        │ file_path       │                   │
                        │ file_size       │                   │
                        │ record_count    │                   │
                        │ expires_at      │                   │
                        └─────────────────┘                   │
```

---

## Section 2: Schema Definition

### Complete Drizzle Schema

```typescript
// server/db/schema.ts

import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  varchar,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// STANDARD PATTERNS
// ============================================================================

/**
 * Standard audit columns applied to all tables
 * - createdAt: Auto-set on insert
 * - updatedAt: Must be updated by application on changes
 */
const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

/**
 * Users table - Core user accounts
 * 
 * Notes:
 * - email is unique across entire system
 * - isPlatformAdmin grants access to platform administration features
 * - passwordHash stores bcrypt hash (cost factor 10)
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  ...auditColumns,
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

/**
 * Password reset tokens
 * 
 * Notes:
 * - tokenHash stores SHA-256 hash of the actual token sent via email
 * - expiresAt is 1 hour from creation
 * - usedAt indicates token has been consumed
 */
export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...auditColumns,
}, (table) => ({
  userIdIdx: index('password_resets_user_id_idx').on(table.userId),
  tokenHashIdx: index('password_resets_token_hash_idx').on(table.tokenHash),
}));

// ============================================================================
// ORGANIZATIONS & MEMBERSHIP
// ============================================================================

/**
 * Organizations - Multi-tenant containers
 * 
 * Notes:
 * - name must be unique across platform
 * - disabledAt indicates org is disabled (users cannot access)
 */
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  ...auditColumns,
}, (table) => ({
  nameIdx: uniqueIndex('organizations_name_idx').on(table.name),
}));

/**
 * Organization memberships - User-Organization relationship with roles
 * 
 * Roles:
 * - viewer: Can view projects, sources, exports (read-only)
 * - editor: Can create/edit projects, configure sources, trigger processing
 * - admin: All editor permissions + user management + audit log access
 */
export const organizationMemberships = pgTable('organization_memberships', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().default('viewer'), // viewer, editor, admin
  ...auditColumns,
}, (table) => ({
  userIdIdx: index('org_memberships_user_id_idx').on(table.userId),
  orgIdIdx: index('org_memberships_org_id_idx').on(table.organizationId),
  uniqueMembership: uniqueIndex('org_memberships_unique_idx').on(table.userId, table.organizationId),
}));

/**
 * Invitations - Pending invites to join an organization
 * 
 * Notes:
 * - tokenHash stores SHA-256 hash of the actual token sent via email
 * - expiresAt is 7 days from creation
 * - acceptedAt indicates invitation was used
 */
export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('viewer'),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  invitedById: integer('invited_by_id').references(() => users.id, { onDelete: 'set null' }),
  ...auditColumns,
}, (table) => ({
  orgIdIdx: index('invitations_org_id_idx').on(table.organizationId),
  tokenHashIdx: index('invitations_token_hash_idx').on(table.tokenHash),
  emailIdx: index('invitations_email_idx').on(table.email),
}));

// ============================================================================
// PROJECTS
// ============================================================================

/**
 * Projects - AI training data initiatives
 * 
 * Notes:
 * - status: 'active' | 'archived'
 * - archivedAt: Set when project is archived, used for 90-day retention
 * - piiSettings: Configuration for de-identification (allow-lists, custom patterns)
 * - filterSettings: Quality filter configuration (min length, date range, status filters)
 */
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, archived
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  
  // De-identification configuration
  piiSettings: jsonb('pii_settings').$type<{
    emailDomainAllowList?: string[];
    companyAllowList?: string[];
    customPatterns?: Array<{
      pattern: string;
      token: string;
      description?: string;
    }>;
  }>().default({}),
  
  // Quality filter configuration
  filterSettings: jsonb('filter_settings').$type<{
    minMessageCount?: number;
    minWordCount?: number;
    dateRange?: {
      start?: string;
      end?: string;
      rolling?: string; // e.g., "6months"
    };
    statusFilter?: string[];
  }>().default({}),
  
  ...auditColumns,
}, (table) => ({
  orgIdIdx: index('projects_org_id_idx').on(table.organizationId),
  statusIdx: index('projects_status_idx').on(table.status),
  orgNameIdx: uniqueIndex('projects_org_name_idx').on(table.organizationId, table.name),
}));

// ============================================================================
// SOURCES
// ============================================================================

/**
 * Sources - Data inputs for projects
 * 
 * Types:
 * - file: CSV, Excel, JSON file uploads
 * - teamwork: Teamwork Desk API connection
 * - gohighlevel: GoHighLevel API connection
 * 
 * Notes:
 * - config: Type-specific configuration (credentials, filters, etc.)
 * - filePath: Local path for file uploads
 * - rawSchema: Detected columns/fields from source
 * - recordCount: Number of records detected in source
 */
export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // file, teamwork, gohighlevel
  name: varchar('name', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, connected, error, syncing
  
  // Type-specific configuration (stored encrypted for API credentials)
  config: jsonb('config').$type<
    | FileSourceConfig
    | TeamworkSourceConfig
    | GoHighLevelSourceConfig
  >().default({}),
  
  // File upload specific
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  
  // Detected schema from source
  rawSchema: jsonb('raw_schema').$type<Array<{
    name: string;
    type: string;
    sample: string[];
  }>>(),
  
  // Record count
  recordCount: integer('record_count'),
  
  // Connection status details
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastError: text('last_error'),
  
  ...auditColumns,
}, (table) => ({
  projectIdIdx: index('sources_project_id_idx').on(table.projectId),
  typeIdx: index('sources_type_idx').on(table.type),
  statusIdx: index('sources_status_idx').on(table.status),
}));

// Source config type definitions
interface FileSourceConfig {
  type: 'file';
  format: 'csv' | 'xlsx' | 'xls' | 'json';
  delimiter?: string;
  hasHeader?: boolean;
  sheetName?: string; // For Excel
  jsonPath?: string; // For JSON array path
}

interface TeamworkSourceConfig {
  type: 'teamwork';
  subdomain: string;
  apiKeyEncrypted: string;
  filters?: {
    dateStart?: string;
    dateEnd?: string;
    statuses?: string[];
    includeInternalNotes?: boolean;
  };
}

interface GoHighLevelSourceConfig {
  type: 'gohighlevel';
  authMethod: 'oauth' | 'apikey';
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
  apiKeyEncrypted?: string;
  tokenExpiresAt?: string;
  selectedChannels?: ('sms' | 'email' | 'call')[];
  filters?: {
    dateStart?: string;
    dateEnd?: string;
    status?: string;
  };
}

/**
 * Source mappings - Field mapping from source to standard fields
 * 
 * Target fields (standard):
 * - conversation_id: Unique identifier for conversation
 * - content: Message/body text
 * - sender_role: agent, customer, system
 * - sender_id: Identifier for sender (will be tokenized)
 * - timestamp: Message timestamp
 * - status: Ticket/conversation status
 * - custom_*: User-defined fields
 */
export const sourceMappings = pgTable('source_mappings', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id').notNull().references(() => sources.id, { onDelete: 'cascade' }),
  sourceField: varchar('source_field', { length: 255 }).notNull(),
  targetField: varchar('target_field', { length: 255 }).notNull(),
  confidence: varchar('confidence', { length: 10 }).notNull().default('low'), // high, medium, low
  isPii: boolean('is_pii').notNull().default(false),
  transformRule: jsonb('transform_rule').$type<{
    type: string;
    params?: Record<string, unknown>;
  }>(),
  ...auditColumns,
}, (table) => ({
  sourceIdIdx: index('source_mappings_source_id_idx').on(table.sourceId),
  uniqueMapping: uniqueIndex('source_mappings_unique_idx').on(table.sourceId, table.sourceField),
}));

// ============================================================================
// PROCESSING
// ============================================================================

/**
 * Processing jobs - Batch processing execution tracking
 * 
 * Status flow:
 * pending → running → completed | failed | cancelled
 * 
 * Notes:
 * - configSnapshot: Frozen copy of project settings at job start
 * - progress: 0-100 percentage
 * - recordsTotal/recordsProcessed: For progress calculation
 */
export const processingJobs = pgTable('processing_jobs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, running, completed, failed, cancelled
  progress: integer('progress').notNull().default(0), // 0-100
  recordsTotal: integer('records_total').notNull().default(0),
  recordsProcessed: integer('records_processed').notNull().default(0),
  recordsFiltered: integer('records_filtered').notNull().default(0),
  
  // Snapshot of configuration at job start
  configSnapshot: jsonb('config_snapshot').$type<{
    piiSettings: Record<string, unknown>;
    filterSettings: Record<string, unknown>;
    mappings: Array<{
      sourceId: number;
      sourceField: string;
      targetField: string;
    }>;
  }>(),
  
  // Timing
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  
  // Error tracking
  error: text('error'),
  warnings: jsonb('warnings').$type<string[]>().default([]),
  
  // Triggered by
  triggeredById: integer('triggered_by_id').references(() => users.id, { onDelete: 'set null' }),
  
  ...auditColumns,
}, (table) => ({
  projectIdIdx: index('processing_jobs_project_id_idx').on(table.projectId),
  statusIdx: index('processing_jobs_status_idx').on(table.status),
  createdAtIdx: index('processing_jobs_created_at_idx').on(table.createdAt),
}));

/**
 * Processed records - Individual processed records with de-identified content
 * 
 * Notes:
 * - originalData: Raw data from source (kept for debugging/reprocessing)
 * - processedData: De-identified, mapped data ready for export
 * - piiTokensMap: Mapping of tokens to original values (for auditing, never exported)
 * - filtered: Whether record was excluded by quality filters
 * - filterReason: Why record was filtered (if applicable)
 */
export const processedRecords = pgTable('processed_records', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull().references(() => processingJobs.id, { onDelete: 'cascade' }),
  sourceId: integer('source_id').notNull().references(() => sources.id, { onDelete: 'cascade' }),
  sourceRecordId: varchar('source_record_id', { length: 255 }), // Original ID from source
  
  // Data
  originalData: jsonb('original_data').notNull(),
  processedData: jsonb('processed_data'),
  
  // PII tracking (for audit, never exposed)
  piiTokensMap: jsonb('pii_tokens_map').$type<Record<string, string>>().default({}),
  
  // Filter status
  filtered: boolean('filtered').notNull().default(false),
  filterReason: varchar('filter_reason', { length: 100 }),
  
  ...auditColumns,
}, (table) => ({
  jobIdIdx: index('processed_records_job_id_idx').on(table.jobId),
  sourceIdIdx: index('processed_records_source_id_idx').on(table.sourceId),
  filteredIdx: index('processed_records_filtered_idx').on(table.filtered),
}));

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Exports - Generated export files
 * 
 * Formats:
 * - jsonl_conversation: OpenAI-compatible conversational format
 * - jsonl_qa: Question/Answer pairs
 * - json_raw: Raw structured JSON
 * 
 * Notes:
 * - filePath: Local path to generated file
 * - expiresAt: 30 days from creation (files deleted after)
 */
export const exports = pgTable('exports', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull().references(() => processingJobs.id, { onDelete: 'cascade' }),
  format: varchar('format', { length: 30 }).notNull(), // jsonl_conversation, jsonl_qa, json_raw
  
  // File details
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  recordCount: integer('record_count').notNull(),
  
  // Export configuration used
  exportConfig: jsonb('export_config').$type<{
    includeSystemPrompt?: boolean;
    systemPromptText?: string;
    contextWindow?: number; // For Q&A pairs
    includeMetadata?: boolean;
  }>().default({}),
  
  // Expiry
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  
  // Download tracking
  downloadCount: integer('download_count').notNull().default(0),
  lastDownloadAt: timestamp('last_download_at', { withTimezone: true }),
  
  ...auditColumns,
}, (table) => ({
  jobIdIdx: index('exports_job_id_idx').on(table.jobId),
  formatIdx: index('exports_format_idx').on(table.format),
  expiresAtIdx: index('exports_expires_at_idx').on(table.expiresAt),
}));

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * Audit logs - Comprehensive activity logging
 * 
 * Action types:
 * - auth.login, auth.logout, auth.password_reset
 * - user.invite, user.remove, user.role_change
 * - project.create, project.update, project.archive
 * - source.create, source.update, source.delete
 * - processing.start, processing.complete, processing.cancel, processing.fail
 * - export.generate, export.download
 * 
 * Notes:
 * - Logs are immutable (append-only)
 * - Retained for 1 year
 */
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  
  // Action details
  action: varchar('action', { length: 50 }).notNull(), // e.g., auth.login, project.create
  resourceType: varchar('resource_type', { length: 50 }), // e.g., project, source, export
  resourceId: integer('resource_id'),
  
  // Request context
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 compatible
  userAgent: text('user_agent'),
  
  // Additional details (action-specific)
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  
  // Timestamp (createdAt only - logs are immutable)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdIdx: index('audit_logs_org_id_idx').on(table.organizationId),
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
}));

// ============================================================================
// RELATIONS (for documentation - not used with Core Select API)
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMemberships),
  passwordResets: many(passwordResets),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(organizationMemberships),
  projects: many(projects),
  invitations: many(invitations),
  auditLogs: many(auditLogs),
}));

export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  user: one(users, {
    fields: [organizationMemberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [organizationMemberships.organizationId],
    references: [organizations.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  sources: many(sources),
  processingJobs: many(processingJobs),
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  project: one(projects, {
    fields: [sources.projectId],
    references: [projects.id],
  }),
  mappings: many(sourceMappings),
}));

export const sourceMappingsRelations = relations(sourceMappings, ({ one }) => ({
  source: one(sources, {
    fields: [sourceMappings.sourceId],
    references: [sources.id],
  }),
}));

export const processingJobsRelations = relations(processingJobs, ({ one, many }) => ({
  project: one(projects, {
    fields: [processingJobs.projectId],
    references: [projects.id],
  }),
  processedRecords: many(processedRecords),
  exports: many(exports),
}));

export const processedRecordsRelations = relations(processedRecords, ({ one }) => ({
  job: one(processingJobs, {
    fields: [processedRecords.jobId],
    references: [processingJobs.id],
  }),
  source: one(sources, {
    fields: [processedRecords.sourceId],
    references: [sources.id],
  }),
}));

export const exportsRelations = relations(exports, ({ one }) => ({
  job: one(processingJobs, {
    fields: [exports.jobId],
    references: [processingJobs.id],
  }),
}));
```

---

## Section 3: Relationships

### Foreign Key Definitions

| Child Table | Foreign Key | Parent Table | On Delete | Rationale |
|-------------|-------------|--------------|-----------|-----------|
| `password_resets` | `user_id` | `users` | CASCADE | Reset tokens meaningless without user |
| `organization_memberships` | `user_id` | `users` | CASCADE | Membership ends when user deleted |
| `organization_memberships` | `organization_id` | `organizations` | CASCADE | Membership ends when org deleted |
| `invitations` | `organization_id` | `organizations` | CASCADE | Invites meaningless without org |
| `invitations` | `invited_by_id` | `users` | SET NULL | Preserve invite even if inviter deleted |
| `projects` | `organization_id` | `organizations` | CASCADE | Projects deleted with org |
| `sources` | `project_id` | `projects` | CASCADE | Sources deleted with project |
| `source_mappings` | `source_id` | `sources` | CASCADE | Mappings deleted with source |
| `processing_jobs` | `project_id` | `projects` | CASCADE | Jobs deleted with project |
| `processing_jobs` | `triggered_by_id` | `users` | SET NULL | Preserve job history if user deleted |
| `processed_records` | `job_id` | `processing_jobs` | CASCADE | Records deleted with job |
| `processed_records` | `source_id` | `sources` | CASCADE | Records deleted with source |
| `exports` | `job_id` | `processing_jobs` | CASCADE | Exports deleted with job |
| `audit_logs` | `organization_id` | `organizations` | CASCADE | Logs deleted with org |
| `audit_logs` | `user_id` | `users` | SET NULL | Preserve logs even if user deleted |

### Cardinality Summary

| Relationship | Cardinality | Notes |
|--------------|-------------|-------|
| User ↔ Organization | Many-to-Many | Via `organization_memberships` |
| Organization → Projects | One-to-Many | Org contains multiple projects |
| Project → Sources | One-to-Many | Project has multiple data sources |
| Source → SourceMappings | One-to-Many | Each source has multiple field mappings |
| Project → ProcessingJobs | One-to-Many | Multiple processing runs per project |
| ProcessingJob → ProcessedRecords | One-to-Many | Job produces many records |
| ProcessingJob → Exports | One-to-Many | Job can produce multiple export formats |
| Organization → AuditLogs | One-to-Many | All org activity logged |

---

## Section 4: Index Strategy

### Index Summary

| Table | Index Name | Columns | Type | Rationale |
|-------|------------|---------|------|-----------|
| `users` | `users_email_idx` | `email` | UNIQUE | Login lookups, uniqueness |
| `password_resets` | `password_resets_user_id_idx` | `user_id` | BTREE | User's reset tokens lookup |
| `password_resets` | `password_resets_token_hash_idx` | `token_hash` | BTREE | Token validation |
| `organizations` | `organizations_name_idx` | `name` | UNIQUE | Name uniqueness, search |
| `organization_memberships` | `org_memberships_user_id_idx` | `user_id` | BTREE | User's organizations lookup |
| `organization_memberships` | `org_memberships_org_id_idx` | `organization_id` | BTREE | Org's members lookup |
| `organization_memberships` | `org_memberships_unique_idx` | `user_id, organization_id` | UNIQUE | Prevent duplicate memberships |
| `invitations` | `invitations_org_id_idx` | `organization_id` | BTREE | Org's pending invites |
| `invitations` | `invitations_token_hash_idx` | `token_hash` | BTREE | Token validation |
| `invitations` | `invitations_email_idx` | `email` | BTREE | Check existing invites |
| `projects` | `projects_org_id_idx` | `organization_id` | BTREE | Org's projects list |
| `projects` | `projects_status_idx` | `status` | BTREE | Filter by status |
| `projects` | `projects_org_name_idx` | `organization_id, name` | UNIQUE | Unique names per org |
| `sources` | `sources_project_id_idx` | `project_id` | BTREE | Project's sources list |
| `sources` | `sources_type_idx` | `type` | BTREE | Filter by source type |
| `sources` | `sources_status_idx` | `status` | BTREE | Filter by connection status |
| `source_mappings` | `source_mappings_source_id_idx` | `source_id` | BTREE | Source's mappings |
| `source_mappings` | `source_mappings_unique_idx` | `source_id, source_field` | UNIQUE | One mapping per field |
| `processing_jobs` | `processing_jobs_project_id_idx` | `project_id` | BTREE | Project's job history |
| `processing_jobs` | `processing_jobs_status_idx` | `status` | BTREE | Filter by status (queue) |
| `processing_jobs` | `processing_jobs_created_at_idx` | `created_at` | BTREE | Chronological listing |
| `processed_records` | `processed_records_job_id_idx` | `job_id` | BTREE | Job's records |
| `processed_records` | `processed_records_source_id_idx` | `source_id` | BTREE | Source's records |
| `processed_records` | `processed_records_filtered_idx` | `filtered` | BTREE | Exclude filtered records |
| `exports` | `exports_job_id_idx` | `job_id` | BTREE | Job's exports |
| `exports` | `exports_format_idx` | `format` | BTREE | Filter by format |
| `exports` | `exports_expires_at_idx` | `expires_at` | BTREE | Cleanup expired exports |
| `audit_logs` | `audit_logs_org_id_idx` | `organization_id` | BTREE | Org's audit log |
| `audit_logs` | `audit_logs_user_id_idx` | `user_id` | BTREE | User's activity |
| `audit_logs` | `audit_logs_action_idx` | `action` | BTREE | Filter by action type |
| `audit_logs` | `audit_logs_created_at_idx` | `created_at` | BTREE | Date range queries |
| `audit_logs` | `audit_logs_resource_idx` | `resource_type, resource_id` | BTREE | Resource history |

---

## Section 5: Query Patterns

### Common Query Examples (Core Select API)

```typescript
// ============================================================================
// USER & AUTH QUERIES
// ============================================================================

// Find user by email (login)
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

// Get user with organization memberships
const userWithOrgs = await db
  .select({
    user: users,
    membership: organizationMemberships,
    organization: organizations,
  })
  .from(users)
  .leftJoin(organizationMemberships, eq(users.id, organizationMemberships.userId))
  .leftJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
  .where(eq(users.id, userId));

// Validate password reset token
const [resetToken] = await db
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

// ============================================================================
// ORGANIZATION QUERIES
// ============================================================================

// Get organization members with roles
const members = await db
  .select({
    user: {
      id: users.id,
      email: users.email,
      name: users.name,
    },
    role: organizationMemberships.role,
    joinedAt: organizationMemberships.createdAt,
  })
  .from(organizationMemberships)
  .innerJoin(users, eq(organizationMemberships.userId, users.id))
  .where(eq(organizationMemberships.organizationId, orgId))
  .orderBy(asc(users.name));

// Check user's role in organization
const [membership] = await db
  .select()
  .from(organizationMemberships)
  .where(
    and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.organizationId, orgId)
    )
  )
  .limit(1);

// ============================================================================
// PROJECT QUERIES
// ============================================================================

// List active projects for organization
const activeProjects = await db
  .select()
  .from(projects)
  .where(
    and(
      eq(projects.organizationId, orgId),
      eq(projects.status, 'active')
    )
  )
  .orderBy(desc(projects.updatedAt));

// Get project with source count
const projectsWithCounts = await db
  .select({
    project: projects,
    sourceCount: sql<number>`count(${sources.id})::int`,
  })
  .from(projects)
  .leftJoin(sources, eq(projects.id, sources.projectId))
  .where(eq(projects.organizationId, orgId))
  .groupBy(projects.id)
  .orderBy(desc(projects.updatedAt));

// ============================================================================
// SOURCE QUERIES
// ============================================================================

// Get sources with mapping counts
const sourcesWithMappings = await db
  .select({
    source: sources,
    mappingCount: sql<number>`count(${sourceMappings.id})::int`,
    mappedCount: sql<number>`count(case when ${sourceMappings.targetField} is not null then 1 end)::int`,
  })
  .from(sources)
  .leftJoin(sourceMappings, eq(sources.id, sourceMappings.sourceId))
  .where(eq(sources.projectId, projectId))
  .groupBy(sources.id);

// Get source mappings for preview
const mappings = await db
  .select()
  .from(sourceMappings)
  .where(eq(sourceMappings.sourceId, sourceId))
  .orderBy(asc(sourceMappings.sourceField));

// ============================================================================
// PROCESSING JOB QUERIES
// ============================================================================

// Get next pending job (for job queue)
const [nextJob] = await db
  .select()
  .from(processingJobs)
  .where(eq(processingJobs.status, 'pending'))
  .orderBy(asc(processingJobs.createdAt))
  .limit(1);

// Get job with progress
const [job] = await db
  .select({
    id: processingJobs.id,
    status: processingJobs.status,
    progress: processingJobs.progress,
    recordsTotal: processingJobs.recordsTotal,
    recordsProcessed: processingJobs.recordsProcessed,
    recordsFiltered: processingJobs.recordsFiltered,
    startedAt: processingJobs.startedAt,
    completedAt: processingJobs.completedAt,
    error: processingJobs.error,
  })
  .from(processingJobs)
  .where(eq(processingJobs.id, jobId))
  .limit(1);

// Get processing history for project
const history = await db
  .select({
    job: processingJobs,
    triggeredBy: {
      id: users.id,
      name: users.name,
    },
    exportCount: sql<number>`count(${exports.id})::int`,
  })
  .from(processingJobs)
  .leftJoin(users, eq(processingJobs.triggeredById, users.id))
  .leftJoin(exports, eq(processingJobs.id, exports.jobId))
  .where(eq(processingJobs.projectId, projectId))
  .groupBy(processingJobs.id, users.id, users.name)
  .orderBy(desc(processingJobs.createdAt));

// ============================================================================
// EXPORT QUERIES
// ============================================================================

// Get exports for job
const jobExports = await db
  .select()
  .from(exports)
  .where(eq(exports.jobId, jobId))
  .orderBy(asc(exports.format));

// Get unexpired exports for project
const projectExports = await db
  .select({
    export: exports,
    jobStatus: processingJobs.status,
    jobCompletedAt: processingJobs.completedAt,
  })
  .from(exports)
  .innerJoin(processingJobs, eq(exports.jobId, processingJobs.id))
  .where(
    and(
      eq(processingJobs.projectId, projectId),
      gt(exports.expiresAt, new Date())
    )
  )
  .orderBy(desc(exports.createdAt));

// ============================================================================
// AUDIT LOG QUERIES
// ============================================================================

// Query audit logs with filters
const logs = await db
  .select({
    log: auditLogs,
    userName: users.name,
    userEmail: users.email,
  })
  .from(auditLogs)
  .leftJoin(users, eq(auditLogs.userId, users.id))
  .where(
    and(
      eq(auditLogs.organizationId, orgId),
      gte(auditLogs.createdAt, startDate),
      lte(auditLogs.createdAt, endDate),
      // Optional filters
      userId ? eq(auditLogs.userId, userId) : undefined,
      action ? eq(auditLogs.action, action) : undefined
    )
  )
  .orderBy(desc(auditLogs.createdAt))
  .limit(pageSize)
  .offset((page - 1) * pageSize);

// ============================================================================
// PLATFORM ADMIN QUERIES
// ============================================================================

// List all organizations with stats
const orgsWithStats = await db
  .select({
    organization: organizations,
    userCount: sql<number>`count(distinct ${organizationMemberships.userId})::int`,
    projectCount: sql<number>`count(distinct ${projects.id})::int`,
  })
  .from(organizations)
  .leftJoin(organizationMemberships, eq(organizations.id, organizationMemberships.organizationId))
  .leftJoin(projects, eq(organizations.id, projects.organizationId))
  .groupBy(organizations.id)
  .orderBy(desc(organizations.createdAt));
```

### Transaction Examples

```typescript
// Create user from invitation (transaction)
async function acceptInvitation(
  tokenHash: string,
  name: string,
  passwordHash: string
): Promise<{ user: User; organization: Organization }> {
  return await db.transaction(async (tx) => {
    // 1. Validate and consume invitation
    const [invitation] = await tx
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
      throw new Error('Invalid or expired invitation');
    }

    // 2. Mark invitation as accepted
    await tx
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    // 3. Create user
    const [user] = await tx
      .insert(users)
      .values({
        email: invitation.email,
        name,
        passwordHash,
      })
      .returning();

    // 4. Create organization membership
    await tx.insert(organizationMemberships).values({
      userId: user.id,
      organizationId: invitation.organizationId,
      role: invitation.role,
    });

    // 5. Get organization details
    const [organization] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, invitation.organizationId))
      .limit(1);

    return { user, organization };
  });
}

// Create project with default settings (transaction)
async function createProject(
  orgId: number,
  name: string,
  description?: string
): Promise<Project> {
  return await db.transaction(async (tx) => {
    // Check for duplicate name
    const [existing] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, orgId),
          eq(projects.name, name),
          eq(projects.status, 'active')
        )
      )
      .limit(1);

    if (existing) {
      throw new Error('A project with this name already exists');
    }

    // Create project
    const [project] = await tx
      .insert(projects)
      .values({
        organizationId: orgId,
        name,
        description,
        piiSettings: {
          emailDomainAllowList: [],
          companyAllowList: [],
          customPatterns: [],
        },
        filterSettings: {
          minMessageCount: 1,
        },
      })
      .returning();

    return project;
  });
}

// Archive project (soft delete)
async function archiveProject(projectId: number): Promise<void> {
  await db
    .update(projects)
    .set({
      status: 'archived',
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));
}
```

---

## Section 6: Migration Strategy

### Drizzle Configuration

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './server/db/schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Database Connection

```typescript
// server/db/index.ts
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Enable connection caching for Replit cold starts
neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });

// Export for raw SQL queries if needed
export { sql };
```

### Migration Scripts

```json
// package.json scripts
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:push": "drizzle-kit push:pg",
    "db:migrate": "tsx server/db/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx server/db/seed.ts"
  }
}
```

```typescript
// server/db/migrate.ts
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from './index';

async function runMigrations() {
  console.log('⏳ Running migrations...');
  
  try {
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigrations();
```

### Seed Data

```typescript
// server/db/seed.ts
import { db } from './index';
import { users, organizations, organizationMemberships } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create platform admin
    const passwordHash = await bcrypt.hash('admin123!', 10);
    
    const [adminUser] = await db
      .insert(users)
      .values({
        email: 'admin@foundry.app',
        passwordHash,
        name: 'Platform Admin',
        isPlatformAdmin: true,
      })
      .onConflictDoNothing()
      .returning();

    if (adminUser) {
      console.log('✅ Created platform admin:', adminUser.email);
    }

    // Create demo organization
    const [demoOrg] = await db
      .insert(organizations)
      .values({
        name: 'Demo Organization',
      })
      .onConflictDoNothing()
      .returning();

    if (demoOrg && adminUser) {
      // Add admin to demo org
      await db
        .insert(organizationMemberships)
        .values({
          userId: adminUser.id,
          organizationId: demoOrg.id,
          role: 'admin',
        })
        .onConflictDoNothing();

      console.log('✅ Created demo organization:', demoOrg.name);
    }

    console.log('✅ Seeding completed');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
```

### Initial Migration Approach

1. **Development**: Use `npm run db:push` for rapid iteration (applies schema directly)
2. **Production**: Use `npm run db:generate` then `npm run db:migrate` for versioned migrations

### Rollback Procedure

For MVP, rollback is manual:
1. Identify failing migration in `./migrations`
2. Connect to Neon console
3. Run compensating SQL manually
4. Remove failing migration file
5. Re-run `db:push` or `db:migrate`

---

## Section 7: Type Exports

```typescript
// server/db/types.ts
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  users,
  organizations,
  organizationMemberships,
  invitations,
  passwordResets,
  projects,
  sources,
  sourceMappings,
  processingJobs,
  processedRecords,
  exports,
  auditLogs,
} from './schema';

// Select types (for reading from DB)
export type User = InferSelectModel<typeof users>;
export type Organization = InferSelectModel<typeof organizations>;
export type OrganizationMembership = InferSelectModel<typeof organizationMemberships>;
export type Invitation = InferSelectModel<typeof invitations>;
export type PasswordReset = InferSelectModel<typeof passwordResets>;
export type Project = InferSelectModel<typeof projects>;
export type Source = InferSelectModel<typeof sources>;
export type SourceMapping = InferSelectModel<typeof sourceMappings>;
export type ProcessingJob = InferSelectModel<typeof processingJobs>;
export type ProcessedRecord = InferSelectModel<typeof processedRecords>;
export type Export = InferSelectModel<typeof exports>;
export type AuditLog = InferSelectModel<typeof auditLogs>;

// Insert types (for writing to DB)
export type NewUser = InferInsertModel<typeof users>;
export type NewOrganization = InferInsertModel<typeof organizations>;
export type NewOrganizationMembership = InferInsertModel<typeof organizationMemberships>;
export type NewInvitation = InferInsertModel<typeof invitations>;
export type NewPasswordReset = InferInsertModel<typeof passwordResets>;
export type NewProject = InferInsertModel<typeof projects>;
export type NewSource = InferInsertModel<typeof sources>;
export type NewSourceMapping = InferInsertModel<typeof sourceMappings>;
export type NewProcessingJob = InferInsertModel<typeof processingJobs>;
export type NewProcessedRecord = InferInsertModel<typeof processedRecords>;
export type NewExport = InferInsertModel<typeof exports>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;

// Enum-like types
export type UserRole = 'viewer' | 'editor' | 'admin';
export type ProjectStatus = 'active' | 'archived';
export type SourceType = 'file' | 'teamwork' | 'gohighlevel';
export type SourceStatus = 'pending' | 'connected' | 'error' | 'syncing';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ExportFormat = 'jsonl_conversation' | 'jsonl_qa' | 'json_raw';

// JSONB types
export type PiiSettings = NonNullable<Project['piiSettings']>;
export type FilterSettings = NonNullable<Project['filterSettings']>;
export type SourceConfig = NonNullable<Source['config']>;
export type ExportConfig = NonNullable<Export['exportConfig']>;
```

---

## Section 8: Document Validation

### Completeness Checklist

- [x] All PRD entities represented
- [x] All relationships defined with cascade behaviour
- [x] Foreign keys indexed
- [x] Audit columns on all tables
- [x] Migration scripts specified
- [x] Type exports defined
- [x] Query patterns documented
- [x] Transaction examples provided
- [x] Seed data specified

### Entity Coverage

| PRD Entity | Schema Table | Status |
|------------|--------------|--------|
| User | `users` | ✅ Complete |
| Organization | `organizations` | ✅ Complete |
| OrganizationMembership | `organization_memberships` | ✅ Complete |
| Invitation | `invitations` | ✅ Complete |
| PasswordReset | `password_resets` | ✅ Complete |
| Project | `projects` | ✅ Complete |
| Source (File) | `sources` (type='file') | ✅ Complete |
| Source (Teamwork) | `sources` (type='teamwork') | ✅ Complete |
| Source (GoHighLevel) | `sources` (type='gohighlevel') | ✅ Complete |
| SourceMapping | `source_mappings` | ✅ Complete |
| ProcessingJob | `processing_jobs` | ✅ Complete |
| ProcessedRecord | `processed_records` | ✅ Complete |
| Export | `exports` | ✅ Complete |
| AuditLog | `audit_logs` | ✅ Complete |

### PRD Feature Coverage

| Feature | Data Support | Notes |
|---------|--------------|-------|
| F-001: User Authentication | ✅ | users, password_resets, invitations |
| F-002: Org Management | ✅ | organizations, organization_memberships |
| F-003: File Upload | ✅ | sources.config JSONB with file metadata |
| F-004: Teamwork Desk | ✅ | sources.config JSONB with credentials |
| F-005: GoHighLevel | ✅ | sources.config JSONB with OAuth tokens |
| F-006: Field Mapping | ✅ | source_mappings table |
| F-007: PII De-identification | ✅ | projects.pii_settings, processed_records.pii_tokens_map |
| F-008: Quality Filtering | ✅ | projects.filter_settings, processed_records.filtered |
| F-009: Processing Pipeline | ✅ | processing_jobs, processed_records |
| F-010: Data Export | ✅ | exports table |
| F-011: Audit Logging | ✅ | audit_logs table |
| F-012: Platform Admin | ✅ | users.is_platform_admin, organizations queries |

### Replit/Neon Compatibility

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Connection pooling | ✅ | `fetchConnectionCache = true` |
| No long transactions | ✅ | Transactions scoped tightly |
| Single schema file | ✅ | `server/db/schema.ts` |
| Drizzle Core Select API | ✅ | All examples use select().from() |

### Document Status: COMPLETE

---

## Section 9: Downstream Agent Handoff Brief

### For Agent 4: API Contract

**Entity Operations Needed:**

| Entity | Operations | Notes |
|--------|------------|-------|
| Auth | login, logout, refresh, invite, accept-invite, forgot-password, reset-password | JWT-based |
| Users | list (org), get, update-role, remove | Org-scoped |
| Organizations | get, update | Admin only for update |
| Projects | create, list, get, update, archive, restore | Org-scoped |
| Sources | create (file/api), list, get, update-config, delete, test-connection, preview | Project-scoped |
| Mappings | get, update, auto-detect, preview | Source-scoped |
| ProcessingJobs | create, list, get, cancel | Project-scoped |
| Exports | create, list, get, download | Job-scoped |
| AuditLogs | list, export | Org-scoped, admin only |
| Admin | list-orgs, create-org, disable-org, enable-org, health | Platform admin only |

**Relationship Traversal Patterns:**
- List projects → includes source count
- Get project → includes sources, latest job status
- Get source → includes mappings
- Get job → includes export list
- List audit logs → includes user name

**Pagination Requirements:**
- Projects: cursor-based on updatedAt (default 20)
- Sources: no pagination (max ~10 per project)
- Jobs: cursor-based on createdAt (default 10)
- Exports: no pagination (max ~20 per job)
- Audit logs: cursor-based on createdAt (default 50)

### For Agent 5: UI/UX Specification

**Data Shapes for Forms:**

```typescript
// Create Project
{ name: string; description?: string }

// Create File Source
{ file: File; name?: string }

// Create Teamwork Source
{ name: string; subdomain: string; apiKey: string; filters?: {...} }

// Update Mappings
{ mappings: Array<{ sourceField: string; targetField: string; isPii: boolean }> }

// Trigger Processing
{ } // No input needed

// Generate Export
{ format: 'jsonl_conversation' | 'jsonl_qa' | 'json_raw'; config?: {...} }
```

**List/Detail Patterns:**
- Projects list → card grid with name, description, source count, last activity
- Project detail → tabs (Sources, Mapping, Processing, Exports, Settings)
- Sources list → table with type icon, name, status, record count
- Jobs list → timeline with status, progress, timestamps
- Exports list → table with format, size, record count, download button

### For Agent 6: Implementation Orchestrator

**Schema File Location:** `server/db/schema.ts`

**Database Module:** `server/db/index.ts`

**Migration Commands:**
```bash
npm run db:push      # Development: apply schema directly
npm run db:generate  # Production: generate migration files
npm run db:migrate   # Production: run migrations
npm run db:seed      # Seed initial data
npm run db:studio    # Open Drizzle Studio (debug)
```

**Type Imports:**
```typescript
import { db } from './db';
import { users, projects, sources, ... } from './db/schema';
import type { User, Project, Source, ... } from './db/types';
```

**Critical Patterns:**
1. Always filter by `organizationId` for tenant isolation
2. Use transactions for multi-table operations
3. Update `updatedAt` manually on updates
4. Use Core Select API only (no Query API)

### For Agent 7: QA & Deployment

**Seed Data for Testing:**
- Platform admin: admin@foundry.app / admin123!
- Demo organization: "Demo Organization"

**Migration Verification Steps:**
1. Run `npm run db:push` (dev) or `npm run db:migrate` (prod)
2. Verify all tables created: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
3. Run `npm run db:seed`
4. Verify admin user can log in

**Test Data Scenarios:**
- Create organization with 3 users (admin, editor, viewer)
- Create project with file source
- Create project with Teamwork source
- Run processing job
- Generate all export formats
- Query audit logs for all operations

---

*Document End*
