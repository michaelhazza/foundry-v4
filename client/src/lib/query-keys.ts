export const queryKeys = {
  // Auth
  auth: {
    me: ['auth', 'me'] as const,
  },

  // Projects
  projects: {
    all: ['projects'] as const,
    list: (params?: { page?: number; search?: string; includeArchived?: boolean }) =>
      ['projects', 'list', params] as const,
    detail: (id: number) => ['projects', id] as const,
  },

  // Sources
  sources: {
    all: ['sources'] as const,
    list: (projectId: number) => ['sources', 'project', projectId] as const,
    byProject: (projectId: number) => ['sources', 'project', projectId] as const,
    detail: (id: number) => ['sources', id] as const,
    preview: (id: number) => ['sources', id, 'preview'] as const,
  },

  // Mappings
  mappings: {
    list: (sourceId: number) => ['mappings', 'source', sourceId] as const,
    bySource: (sourceId: number) => ['mappings', 'source', sourceId] as const,
    preview: (sourceId: number) => ['mappings', 'source', sourceId, 'preview'] as const,
  },

  // Jobs
  jobs: {
    all: ['jobs'] as const,
    list: (projectId: number) => ['jobs', 'project', projectId] as const,
    byProject: (projectId: number) => ['jobs', 'project', projectId] as const,
    detail: (id: number) => ['jobs', id] as const,
  },

  // Exports
  exports: {
    all: ['exports'] as const,
    byJob: (jobId: number) => ['exports', 'job', jobId] as const,
    detail: (id: number) => ['exports', id] as const,
  },

  // Team
  team: {
    all: ['team'] as const,
    member: (userId: number) => ['team', userId] as const,
    invitations: ['team', 'invitations'] as const,
  },

  // Audit
  audit: {
    all: ['audit'] as const,
    list: (params?: Record<string, unknown>) => ['audit', 'list', params] as const,
  },

  // Admin
  admin: {
    organizations: {
      all: ['admin', 'organizations'] as const,
      list: (params?: { page?: number }) => ['admin', 'organizations', 'list', params] as const,
      detail: (id: number) => ['admin', 'organizations', id] as const,
    },
    health: ['admin', 'health'] as const,
  },
};
