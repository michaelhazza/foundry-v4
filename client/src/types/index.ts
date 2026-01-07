// User types
export interface User {
  id: number;
  email: string;
  name: string;
  organizationId?: number;
  organizationName?: string;
  role?: 'admin' | 'member';
  isPlatformAdmin?: boolean;
}

// Project types
export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'processing' | 'completed' | 'error';
  piiSettings?: PiiSettings;
  filterSettings?: FilterSettings;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  sourceCount?: number;
}

export interface PiiSettings {
  allowList?: string[];
  customPatterns?: Array<{ name: string; pattern: string }>;
}

export interface FilterSettings {
  minLength?: number;
  dateRange?: { start?: string; end?: string };
  statuses?: string[];
}

// Source types
export interface Source {
  id: number;
  projectId: number;
  type: 'file' | 'teamwork' | 'gohighlevel';
  name: string;
  status: 'pending' | 'connected' | 'error';
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  config?: Record<string, unknown>;
  rawSchema?: RawSchemaField[];
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawSchemaField {
  name: string;
  type: string;
  sample: unknown[];
}

// Mapping types
export interface SourceMapping {
  id: number;
  sourceId: number;
  sourceField: string;
  targetField: string;
  confidence: 'high' | 'medium' | 'low';
  isPii: boolean;
}

// Job types
export interface ProcessingJob {
  id: number;
  projectId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  recordsTotal: number;
  recordsProcessed: number;
  warnings?: string[];
  errors?: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Export types
export interface Export {
  id: number;
  jobId: number;
  format: 'jsonl' | 'qa' | 'raw';
  filePath: string;
  fileSize: number;
  recordCount: number;
  expiresAt: string;
  createdAt: string;
}

// Team types
export interface TeamMember {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Invitation {
  id: number;
  email: string;
  role: 'admin' | 'member';
  expiresAt: string;
  createdAt: string;
  invitedByName?: string;
}

// Audit types
export interface AuditLog {
  id: number;
  action: string;
  resourceType: string;
  resourceId: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  userId: number;
  userName?: string;
  userEmail?: string;
}

// Organization types (admin)
export interface Organization {
  id: number;
  name: string;
  disabledAt?: string;
  createdAt: string;
  memberCount?: number;
  projectCount?: number;
}

// Pagination types
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}
