# Foundry: Technical Architecture Document

**Version:** 1.0  
**Date:** January 8, 2026  
**Status:** COMPLETE  
**Source PRD Version:** 1.0  
**Deployment Target:** Replit

---

## Section 1: Architectural Overview

### High-Level Architecture

Foundry follows a **monolithic full-stack architecture** deployed as a single containerized application on Replit. This pattern is selected for:

1. **Deployment simplicity** — Single process deployment aligns with Replit's execution model
2. **Development velocity** — Shared codebase reduces coordination overhead for MVP
3. **Operational simplicity** — No distributed system complexity for early-stage product

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REPLIT CONTAINER                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         VITE DEV SERVER (Dev)                         │   │
│  │                    EXPRESS STATIC SERVING (Prod)                      │   │
│  │                           Port 5000                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        EXPRESS.JS API SERVER                          │   │
│  │                           Port 3001                                   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐      │   │
│  │  │   Auth     │  │  Projects  │  │  Sources   │  │ Processing │      │   │
│  │  │  Routes    │  │   Routes   │  │   Routes   │  │   Routes   │      │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘      │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │                      SERVICE LAYER                              │  │   │
│  │  │  AuthService │ ProjectService │ SourceService │ ProcessingService│  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │                    PROCESSING ENGINE                            │  │   │
│  │  │  PII Detection │ Field Mapping │ Quality Filtering │ Export    │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────────────────────┼────────────────────────────────────┐   │
│  │                                 ▼                                     │   │
│  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐    │   │
│  │  │  Drizzle ORM │  │  Job Queue Table │  │   File Storage       │    │   │
│  │  │              │  │  (DB-backed)     │  │   (Local FS)         │    │   │
│  │  └──────────────┘  └──────────────────┘  └──────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ PostgreSQL   │  │ Resend       │  │ Teamwork     │  │ GoHighLevel  │    │
│  │ (Neon)       │  │ (Email)      │  │ Desk API     │  │ API          │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Architectural Pattern

**Layered Monolith with Service Isolation**

The application is structured in distinct layers:

| Layer | Responsibility | Key Principle |
|-------|---------------|---------------|
| **Routes** | HTTP request handling, input validation, response formatting | Thin controllers, delegate to services |
| **Services** | Business logic, orchestration, transaction management | Single responsibility, throw on error |
| **Processing Engine** | Data transformation, PII detection, export generation | Stateless, idempotent operations |
| **Data Access** | Database queries via Drizzle ORM | Organization-scoped by default |
| **Infrastructure** | External API clients, file storage, email | Abstracted behind interfaces |

### System Boundaries

**In-Scope (This Architecture):**
- Web application (React SPA + Express API)
- PostgreSQL database (hosted on Neon)
- File upload and storage (local filesystem)
- Background job processing (DB-backed queue)
- Third-party API integrations (Teamwork Desk, GoHighLevel)
- Transactional email (Resend)

**Out-of-Scope (External Dependencies):**
- DNS and SSL (handled by Replit)
- Container orchestration (handled by Replit)
- Database hosting and backups (handled by Neon)

### Key Architectural Drivers

| Driver | Source | Impact |
|--------|--------|--------|
| **Replit deployment** | Constraint | Single process, port 5000, ephemeral filesystem |
| **Multi-tenancy** | PRD F-002 | Organization-scoped data isolation in all queries |
| **PII protection** | PRD F-007 | Processing engine with multiple detection strategies |
| **File upload (50MB)** | PRD F-003 | Streaming upload, chunked processing |
| **API integrations** | PRD F-004, F-005 | Abstracted connector pattern with retry logic |
| **Background processing** | PRD F-009 | DB-backed job queue (no separate workers) |
| **Audit compliance** | PRD F-011 | Comprehensive event logging |

---

## Section 2: Technology Stack

### Frontend Stack

| Technology | Version | Rationale | Alternatives Considered |
|------------|---------|-----------|------------------------|
| **React** | 18.x | Industry standard, excellent ecosystem, team familiarity assumed | Vue (smaller ecosystem), Svelte (less mature) |
| **TypeScript** | 5.x | Type safety, better IDE support, catches errors at compile time | JavaScript (no type safety) |
| **Vite** | 5.x | Fast HMR, excellent DX, simple configuration, Replit-native support | Create React App (deprecated), Webpack (complex) |
| **TanStack Query** | 5.x | Server state management, caching, background refetch | SWR (less features), Redux (overkill) |
| **React Router** | 6.x | Standard routing solution, good TypeScript support | TanStack Router (newer, less proven) |
| **Tailwind CSS** | 3.x | Utility-first CSS, rapid prototyping, consistent design | CSS Modules (more boilerplate), styled-components (runtime cost) |
| **shadcn/ui** | Latest | High-quality accessible components, copy-paste model, Tailwind integration | Radix (lower level), MUI (heavier) |
| **React Hook Form** | 7.x | Performant forms, excellent validation integration | Formik (more verbose) |
| **Zod** | 3.x | Schema validation, TypeScript inference, shared with backend | Yup (no TS inference) |

### Backend Stack

| Technology | Version | Rationale | Alternatives Considered |
|------------|---------|-----------|------------------------|
| **Node.js** | 20.x LTS | JavaScript everywhere, excellent async I/O, Replit native | Deno (less ecosystem), Bun (less stable) |
| **Express.js** | 4.x | Minimal, flexible, massive ecosystem, well-understood | Fastify (newer), Hono (less middleware) |
| **TypeScript** | 5.x | Shared types with frontend, type safety | JavaScript (no types) |
| **Drizzle ORM** | Latest | Type-safe queries, lightweight, SQL-like API | Prisma (heavier, less SQL control), Knex (no type safety) |
| **Zod** | 3.x | Input validation, runtime type checking | Joi (no TS inference), class-validator (decorators) |
| **bcrypt** | 5.x | Industry standard password hashing | Argon2 (better but more complex) |
| **jsonwebtoken** | 9.x | JWT implementation, well-tested | jose (newer, similar features) |

### Infrastructure Stack

| Technology | Purpose | Rationale | Alternatives Considered |
|------------|---------|-----------|------------------------|
| **PostgreSQL (Neon)** | Primary database | Serverless, Replit integration, JSONB support | Supabase (more features than needed), PlanetScale (MySQL) |
| **Resend** | Transactional email | Simple API, good deliverability, generous free tier | SendGrid (complex), Postmark (expensive) |
| **Local Filesystem** | File storage | Replit persistent storage sufficient for MVP | S3 (premature for MVP), Cloudflare R2 (adds complexity) |

### Processing Stack

| Technology | Purpose | Rationale | Alternatives Considered |
|------------|---------|-----------|------------------------|
| **Compromise NLP** | Named entity recognition | Lightweight, browser-compatible, no external API | spaCy (Python), AWS Comprehend (cost) |
| **Custom Regex Engine** | Pattern-based PII detection | Full control, no external dependencies | Microsoft Presidio (heavy), Google DLP (cost) |
| **csv-parse** | CSV parsing | Streaming support, handles edge cases | PapaParse (heavier), fast-csv (similar) |
| **xlsx** | Excel parsing | Comprehensive Excel support | ExcelJS (similar), SheetJS (licensing) |

### Development Tools

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **ESLint** | Code linting | Standard for TypeScript projects |
| **Prettier** | Code formatting | Consistent style, integrates with ESLint |
| **Vitest** | Unit testing | Fast, Vite-native, Jest-compatible API |
| **tsx** | TypeScript execution | Fast startup for scripts and migrations |

### Replit Compatibility Matrix

| Component | Replit Compatible | Notes |
|-----------|-------------------|-------|
| React + Vite | ✅ Yes | Native support |
| Express.js | ✅ Yes | Port 5000 required |
| PostgreSQL (Neon) | ✅ Yes | Serverless, connection pooling |
| Local file storage | ✅ Yes | Persistent storage available |
| Background workers | ⚠️ Partial | Must use in-process or DB-backed queue |
| WebSockets | ✅ Yes | Supported but not needed for MVP |
| Cron jobs | ⚠️ Partial | Use Replit's deployment wake + DB polling |

---

## Section 3: PRD-to-Architecture Traceability

### Feature-to-Component Mapping

| PRD Feature | Feature ID | Architectural Components | Architectural Pattern |
|-------------|------------|-------------------------|----------------------|
| User Authentication | F-001 | AuthService, JWT middleware, bcrypt | Stateless JWT auth |
| Organization Management | F-002 | OrgService, multi-tenant middleware | Tenant isolation |
| File Upload | F-003 | FileService, multer, streaming parser | Chunked upload |
| Teamwork Desk Integration | F-004 | TeamworkConnector, API client | Connector pattern |
| GoHighLevel Integration | F-005 | GoHighLevelConnector, API client | Connector pattern |
| Field Mapping | F-006 | MappingService, auto-detect engine | Configuration-driven |
| PII De-identification | F-007 | PIIEngine, Compromise NLP, regex | Pipeline pattern |
| Quality Filtering | F-008 | FilterService, rule engine | Configurable filters |
| Processing Pipeline | F-009 | ProcessingService, job queue | DB-backed queue |
| Data Export | F-010 | ExportService, format generators | Strategy pattern |
| Audit Logging | F-011 | AuditService, middleware | Decorator pattern |
| Platform Admin | F-012 | AdminService, admin routes | Role-based access |

### User Story Coverage

| User Story ID | Component(s) | Route(s) | Service(s) |
|---------------|--------------|----------|------------|
| US-AUTH-001 | Auth | POST /api/auth/invite | AuthService.invite() |
| US-AUTH-002 | Auth | POST /api/auth/login | AuthService.login() |
| US-AUTH-003 | Auth | PUT /api/users/:id/role | UserService.updateRole() |
| US-AUTH-004 | Auth | DELETE /api/users/:id | UserService.remove() |
| US-AUTH-005 | Auth | POST /api/auth/reset-password | AuthService.resetPassword() |
| US-ORG-001 | Org | POST /api/admin/organizations | AdminService.createOrg() |
| US-ORG-002 | Projects | POST /api/projects | ProjectService.create() |
| US-ORG-003 | Projects | PUT /api/projects/:id/archive | ProjectService.archive() |
| US-FILE-001 | Sources | POST /api/projects/:id/sources/file | SourceService.uploadFile() |
| US-FILE-002 | Sources | POST /api/projects/:id/sources/file | SourceService.uploadFile() |
| US-FILE-003 | Sources | POST /api/projects/:id/sources/file | SourceService.uploadFile() |
| US-API-TD-001 | Sources | POST /api/projects/:id/sources/teamwork | TeamworkConnector.connect() |
| US-API-TD-002 | Sources | PUT /api/sources/:id/config | SourceService.updateConfig() |
| US-API-TD-003 | Sources | PUT /api/sources/:id/config | SourceService.updateConfig() |
| US-API-TD-004 | Sources | GET /api/sources/:id/preview | SourceService.preview() |
| US-API-GHL-001 | Sources | POST /api/projects/:id/sources/ghl | GoHighLevelConnector.connect() |
| US-API-GHL-002 | Sources | PUT /api/sources/:id/config | SourceService.updateConfig() |
| US-MAP-001 | Mapping | GET /api/sources/:id/mappings/suggest | MappingService.autoDetect() |
| US-MAP-002 | Mapping | PUT /api/sources/:id/mappings | MappingService.update() |
| US-MAP-003 | Mapping | GET /api/sources/:id/mappings/preview | MappingService.preview() |
| US-DEID-001 | Processing | (internal) | PIIEngine.detectNames() |
| US-DEID-002 | Processing | (internal) | PIIEngine.detectEmails() |
| US-DEID-003 | Processing | (internal) | PIIEngine.detectPhones() |
| US-DEID-004 | Processing | (internal) | PIIEngine.detectAddresses() |
| US-DEID-005 | Processing | (internal) | PIIEngine.detectCompanies() |
| US-DEID-006 | Processing | PUT /api/projects/:id/pii-patterns | PIIService.addPattern() |
| US-FILT-001 | Processing | PUT /api/projects/:id/filters | FilterService.update() |
| US-FILT-002 | Processing | PUT /api/projects/:id/filters | FilterService.update() |
| US-FILT-003 | Processing | PUT /api/projects/:id/filters | FilterService.update() |
| US-PROC-001 | Processing | POST /api/projects/:id/process | ProcessingService.start() |
| US-PROC-002 | Processing | GET /api/projects/:id/jobs | ProcessingService.history() |
| US-PROC-003 | Processing | POST /api/jobs/:id/cancel | ProcessingService.cancel() |
| US-EXP-001 | Export | POST /api/projects/:id/exports | ExportService.generate() |
| US-EXP-002 | Export | POST /api/projects/:id/exports | ExportService.generate() |
| US-EXP-003 | Export | POST /api/projects/:id/exports | ExportService.generate() |
| US-AUD-001 | Audit | GET /api/audit | AuditService.list() |
| US-AUD-002 | Audit | GET /api/audit/export | AuditService.export() |
| US-PLAT-001 | Admin | GET /api/admin/organizations | AdminService.listOrgs() |
| US-PLAT-002 | Admin | GET /api/admin/health | AdminService.health() |
| US-PLAT-003 | Admin | PUT /api/admin/organizations/:id/disable | AdminService.disableOrg() |

### Gaps and Flags

| Item | Status | Resolution |
|------|--------|------------|
| All PRD features mapped | ✅ Complete | — |
| All user stories traced | ✅ Complete | — |
| GoHighLevel OAuth vs API key | ⚠️ Flagged | Architecture supports both; implementation decision deferred |
| PII accuracy 95% target | ⚠️ Flagged | Requires testing; may need external API fallback |

---

## Section 4: Component Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React SPA)                              │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Pages     │  │   Hooks     │  │ Components  │  │   Context   │        │
│  │             │  │             │  │             │  │             │        │
│  │ - Dashboard │  │ - useAuth   │  │ - FileUpload│  │ - AuthCtx   │        │
│  │ - Projects  │  │ - useProjects│ │ - MappingUI │  │ - OrgCtx    │        │
│  │ - Sources   │  │ - useSources │ │ - Preview   │  │             │        │
│  │ - Team      │  │ - useJobs   │  │ - Progress  │  │             │        │
│  │ - Settings  │  │             │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         API CLIENT (TanStack Query)                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTP/REST
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER (Express.js)                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                           MIDDLEWARE LAYER                            │   │
│  │  Security │ Auth │ RateLimit │ Logging │ ErrorHandler │ Validation   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                            ROUTE LAYER                                │   │
│  │                                                                        │   │
│  │  /api/auth    /api/projects    /api/sources    /api/admin             │   │
│  │  /api/users   /api/mappings    /api/jobs       /api/audit             │   │
│  │  /api/health  /api/exports                                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                           SERVICE LAYER                               │   │
│  │                                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │ AuthService  │  │ ProjectSvc   │  │ SourceSvc    │                 │   │
│  │  │              │  │              │  │              │                 │   │
│  │  │ - login()    │  │ - create()   │  │ - upload()   │                 │   │
│  │  │ - invite()   │  │ - list()     │  │ - connect()  │                 │   │
│  │  │ - verify()   │  │ - archive()  │  │ - preview()  │                 │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │   │
│  │                                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │ MappingSvc   │  │ ProcessSvc   │  │ ExportSvc    │                 │   │
│  │  │              │  │              │  │              │                 │   │
│  │  │ - autoDetect │  │ - start()    │  │ - generate() │                 │   │
│  │  │ - update()   │  │ - cancel()   │  │ - download() │                 │   │
│  │  │ - preview()  │  │ - status()   │  │ - list()     │                 │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │   │
│  │                                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │ AuditSvc     │  │ AdminSvc     │  │ UserSvc      │                 │   │
│  │  │              │  │              │  │              │                 │   │
│  │  │ - log()      │  │ - createOrg()│  │ - updateRole │                 │   │
│  │  │ - list()     │  │ - disable()  │  │ - remove()   │                 │   │
│  │  │ - export()   │  │ - health()   │  │ - list()     │                 │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        PROCESSING ENGINE                              │   │
│  │                                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │ PIIEngine    │  │ FilterEngine │  │ ExportEngine │                 │   │
│  │  │              │  │              │  │              │                 │   │
│  │  │ - NER        │  │ - minLength  │  │ - JSONL      │                 │   │
│  │  │ - Regex      │  │ - dateRange  │  │ - QA Pairs   │                 │   │
│  │  │ - Custom     │  │ - status     │  │ - Raw JSON   │                 │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         CONNECTOR LAYER                               │   │
│  │                                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │ TeamworkConn │  │ GHLConnector │  │ EmailClient  │                 │   │
│  │  │              │  │              │  │              │                 │   │
│  │  │ - fetch()    │  │ - fetch()    │  │ - send()     │                 │   │
│  │  │ - test()     │  │ - test()     │  │              │                 │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA ACCESS LAYER                             │   │
│  │                                                                        │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐│   │
│  │  │                      Drizzle ORM                                 ││   │
│  │  │  db.select().from(table).where(eq(table.orgId, ctx.orgId))      ││   │
│  │  └──────────────────────────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibility Matrix

| Component | Responsibilities | Dependencies | Interfaces |
|-----------|-----------------|--------------|------------|
| **AuthService** | Login, logout, invite, password reset, token management | UserRepository, EmailClient, bcrypt, JWT | login(), invite(), verify(), resetPassword() |
| **ProjectService** | CRUD projects, archive/restore, validation | ProjectRepository, AuditService | create(), get(), list(), update(), archive() |
| **SourceService** | File upload, API connection, data preview | FileStorage, Connectors, SourceRepository | upload(), connect(), preview(), delete() |
| **MappingService** | Auto-detection, manual mapping, preview | SourceService, PIIEngine | autoDetect(), update(), preview() |
| **ProcessingService** | Job orchestration, status tracking, cancellation | JobQueue, PIIEngine, FilterEngine, ExportEngine | start(), cancel(), status(), history() |
| **ExportService** | Format generation, download, history | ProcessedDataRepository, FileStorage | generate(), download(), list() |
| **PIIEngine** | NER, regex patterns, custom patterns, tokenization | Compromise NLP, pattern registry | detect(), tokenize(), addPattern() |
| **FilterEngine** | Quality filtering, date filtering, status filtering | — | apply(), validate() |
| **AuditService** | Event logging, log retrieval, export | AuditRepository | log(), list(), export() |
| **AdminService** | Org management, platform health, user management | OrgRepository, SystemMetrics | createOrg(), disableOrg(), health() |

### Service Layer Error Contract

All services follow a consistent error pattern:

```typescript
// Services ALWAYS throw on not found
async function getById(id: number): Promise<Resource> {
  const [resource] = await db.select()
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);
  if (!resource) throw new NotFoundError('Resource', id);
  return resource;
}

// Error hierarchy
class AppError extends Error { statusCode: number; code: string; }
class NotFoundError extends AppError { statusCode = 404; code = 'NOT_FOUND'; }
class BadRequestError extends AppError { statusCode = 400; code = 'BAD_REQUEST'; }
class UnauthorizedError extends AppError { statusCode = 401; code = 'UNAUTHORIZED'; }
class ForbiddenError extends AppError { statusCode = 403; code = 'FORBIDDEN'; }
class ConflictError extends AppError { statusCode = 409; code = 'CONFLICT'; }
```

### Interface Definitions

```typescript
// Auth Context (available in all authenticated routes)
interface AuthContext {
  userId: number;
  organizationId: number;
  role: 'viewer' | 'editor' | 'admin';
  isPlatformAdmin: boolean;
}

// Standard API Response
interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

// Pagination
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Processing Job Status
interface JobStatus {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  recordsProcessed: number;
  recordsTotal: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}
```

---

## Section 5: Authentication and Authorization

### Authentication Flow

#### Registration (via Invitation)

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Admin   │      │  Server  │      │  Email   │      │ Invitee  │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │ POST /api/auth/invite            │                 │
     │ {email, role}   │                 │                 │
     │─────────────────>                 │                 │
     │                 │                 │                 │
     │                 │ Create invitation token           │
     │                 │ (7-day expiry, single use)        │
     │                 │                 │                 │
     │                 │ Send email      │                 │
     │                 │─────────────────>                 │
     │                 │                 │                 │
     │                 │                 │ Invitation email │
     │ 201 Created     │                 │─────────────────>
     │<─────────────────                 │                 │
     │                 │                 │                 │
     │                 │                 │                 │
     │                 │                 │    Click link   │
     │                 │                 │<─────────────────
     │                 │                 │                 │
     │                 │ GET /invite/:token               │
     │                 │<──────────────────────────────────
     │                 │                 │                 │
     │                 │ Validate token  │                 │
     │                 │                 │                 │
     │                 │ Return invite form               │
     │                 │──────────────────────────────────>
     │                 │                 │                 │
     │                 │ POST /api/auth/accept-invite     │
     │                 │ {token, password, name}          │
     │                 │<──────────────────────────────────
     │                 │                 │                 │
     │                 │ Create user     │                 │
     │                 │ Hash password   │                 │
     │                 │ Issue JWT       │                 │
     │                 │                 │                 │
     │                 │ 201 + JWT tokens                 │
     │                 │──────────────────────────────────>
```

#### Login Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  Client  │      │  Server  │      │ Database │
└────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │
     │ POST /api/auth/login              │
     │ {email, password}                 │
     │─────────────────>                 │
     │                 │                 │
     │                 │ SELECT user     │
     │                 │─────────────────>
     │                 │                 │
     │                 │ user record     │
     │                 │<─────────────────
     │                 │                 │
     │                 │ bcrypt.compare()│
     │                 │                 │
     │                 │ Generate JWT    │
     │                 │ (access + refresh)
     │                 │                 │
     │ 200 OK          │                 │
     │ {accessToken,   │                 │
     │  refreshToken,  │                 │
     │  user}          │                 │
     │<─────────────────                 │
```

#### Token Management

| Token Type | Storage | Expiry | Purpose |
|------------|---------|--------|---------|
| Access Token | Memory (client) | 15 minutes | API authentication |
| Refresh Token | HttpOnly cookie | 7 days | Access token renewal |
| Invitation Token | Database | 7 days | One-time invite acceptance |
| Password Reset Token | Database | 1 hour | One-time password reset |

**Token Refresh Flow:**

```typescript
// Client-side refresh interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { accessToken } = await api.post('/api/auth/refresh');
      error.config.headers.Authorization = `Bearer ${accessToken}`;
      return api(error.config);
    }
    throw error;
  }
);
```

#### Logout Flow

```typescript
// POST /api/auth/logout
// 1. Clear refresh token cookie
// 2. Optionally revoke refresh token in DB (for session tracking)
// 3. Client clears access token from memory
```

#### Password Reset Flow

```
1. User requests reset: POST /api/auth/forgot-password {email}
2. Server generates token (1-hour expiry), stores hash in DB
3. Server sends email with reset link
4. User clicks link, enters new password
5. POST /api/auth/reset-password {token, newPassword}
6. Server validates token, hashes new password, invalidates token
7. User redirected to login
```

### Authorization: Role-Based Access Control (RBAC)

#### Role Hierarchy

```
Platform Admin (super-user)
    │
    ├── Can access all organizations (read-only for data)
    ├── Can create/disable organizations
    └── Can view platform health
    
Organization Admin
    │
    ├── All Editor permissions
    ├── Can invite/remove users
    ├── Can change user roles
    └── Can view audit logs
    
Organization Editor
    │
    ├── All Viewer permissions
    ├── Can create/edit projects
    ├── Can configure sources
    ├── Can trigger processing
    └── Can export data
    
Organization Viewer
    │
    ├── Can view projects
    ├── Can view sources (no credentials)
    ├── Can view processing status
    └── Can download exports
```

#### Permission Matrix

| Action | Viewer | Editor | Admin | Platform Admin |
|--------|--------|--------|-------|----------------|
| View projects | ✅ | ✅ | ✅ | ✅ |
| Create project | ❌ | ✅ | ✅ | ❌ |
| Edit project | ❌ | ✅ | ✅ | ❌ |
| Delete project | ❌ | ✅ | ✅ | ❌ |
| View sources | ✅ | ✅ | ✅ | ✅ |
| Add/edit sources | ❌ | ✅ | ✅ | ❌ |
| View mappings | ✅ | ✅ | ✅ | ✅ |
| Edit mappings | ❌ | ✅ | ✅ | ❌ |
| Trigger processing | ❌ | ✅ | ✅ | ❌ |
| Cancel processing | ❌ | ✅ | ✅ | ❌ |
| Download exports | ✅ | ✅ | ✅ | ❌ |
| Invite users | ❌ | ❌ | ✅ | ❌ |
| Remove users | ❌ | ❌ | ✅ | ❌ |
| Change roles | ❌ | ❌ | ✅ | ❌ |
| View audit log | ❌ | ❌ | ✅ | ✅ |
| Export audit log | ❌ | ❌ | ✅ | ✅ |
| View all orgs | ❌ | ❌ | ❌ | ✅ |
| Create org | ❌ | ❌ | ❌ | ✅ |
| Disable org | ❌ | ❌ | ❌ | ✅ |

#### Authorization Middleware

```typescript
// Role-based middleware
function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!roles.includes(req.auth.role) && !req.auth.isPlatformAdmin) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}

// Usage in routes
router.post('/projects', requireRole('editor', 'admin'), createProject);
router.delete('/users/:id', requireRole('admin'), removeUser);

// Organization-scoped middleware (applied globally)
function enforceOrgScope(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return next();
  
  // All queries must include organization filter
  req.orgScope = { organizationId: req.auth.organizationId };
  next();
}
```

---

## Section 6: Security Architecture (MVP)

### Security Middleware Stack

```typescript
// server/middleware/security.ts
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

export function setupSecurityMiddleware(app: Express) {
  // Security headers (relaxed CSP for MVP)
  app.use(helmet({ 
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false 
  }));
  
  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.APP_URL 
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
  // Request logging
  app.use(morgan(
    process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
  ));
}
```

### Rate Limiting Strategy

```typescript
// server/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

// Global rate limiter (all endpoints)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: { error: 'RATE_LIMITED', message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'RATE_LIMITED', message: 'Too many login attempts' },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Upload limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: { error: 'RATE_LIMITED', message: 'Upload limit exceeded' },
});
```

### Input Validation

```typescript
// All inputs validated with Zod schemas
import { z } from 'zod';

// Example: Login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Validation middleware factory
function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new BadRequestError('Validation failed', result.error.issues);
    }
    req.validated = result.data;
    next();
  };
}

// URL parameter validation (MANDATORY)
export function parseIntParam(value: string, paramName: string): number {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new BadRequestError(`Invalid ${paramName}`);
  }
  return parsed;
}
```

### Password Security

```typescript
// Password requirements
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

// Hashing (bcrypt with cost factor 10)
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### JWT Security

```typescript
// JWT configuration
const JWT_ACCESS_EXPIRY = '15m';
const JWT_REFRESH_EXPIRY = '7d';

interface JWTPayload {
  userId: number;
  organizationId: number;
  role: string;
  isPlatformAdmin: boolean;
  type: 'access' | 'refresh';
}

// Always verify token type
function verifyAccessToken(token: string): JWTPayload {
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  if (payload.type !== 'access') {
    throw new UnauthorizedError('Invalid token type');
  }
  return payload;
}
```

### Sensitive Data Handling

| Data Type | Storage | Protection |
|-----------|---------|------------|
| Passwords | Database | bcrypt hash (never stored plain) |
| API keys (external) | Database | AES-256 encryption at rest |
| JWT secrets | Environment | Replit Secrets only |
| User PII | Database | Encrypted columns (future) |
| Uploaded files | Filesystem | Organization-isolated directories |

### Error Handling (No Information Leakage)

```typescript
// Generic error responses for auth failures
// NEVER reveal whether email exists in system
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  
  // Same error regardless of email existence
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }
  
  // ... continue with login
});

// Error handler strips stack traces in production
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  
  res.status(statusCode).json({
    error: err instanceof AppError ? err.code : 'INTERNAL_ERROR',
    message: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
});
```

---

## Section 7: Data Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
│                                                                              │
│  ┌───────────────┐                                                          │
│  │ File Upload   │─────┐                                                    │
│  │ (CSV/Excel/   │     │                                                    │
│  │  JSON)        │     │                                                    │
│  └───────────────┘     │                                                    │
│                        ▼                                                    │
│  ┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │ Teamwork Desk │─>│  Source Ingest  │─>│  Raw Data Store │               │
│  │ API           │  │  (normalize to  │  │  (JSONB in      │               │
│  └───────────────┘  │   common format)│  │   PostgreSQL)   │               │
│                     └─────────────────┘  └────────┬────────┘               │
│  ┌───────────────┐           │                    │                        │
│  │ GoHighLevel   │───────────┘                    │                        │
│  │ API           │                                │                        │
│  └───────────────┘                                ▼                        │
│                                           ┌───────────────┐                 │
│                                           │ Field Mapping │                 │
│                                           │ Engine        │                 │
│                                           └───────┬───────┘                 │
│                                                   │                         │
│                                                   ▼                         │
│                              ┌────────────────────────────────────┐        │
│                              │        PROCESSING PIPELINE         │        │
│                              │                                    │        │
│                              │  ┌──────────┐  ┌──────────────┐   │        │
│                              │  │ Quality  │─>│     PII      │   │        │
│                              │  │ Filters  │  │ De-identify  │   │        │
│                              │  └──────────┘  └──────┬───────┘   │        │
│                              │                       │           │        │
│                              │                       ▼           │        │
│                              │              ┌──────────────┐     │        │
│                              │              │   Tokenize   │     │        │
│                              │              │   (consistent│     │        │
│                              │              │    tokens)   │     │        │
│                              │              └──────┬───────┘     │        │
│                              └───────────────────────────────────┘        │
│                                                   │                        │
│                                                   ▼                        │
│                              ┌──────────────────────────────────┐         │
│                              │     Processed Data Store         │         │
│                              │     (ready for export)           │         │
│                              └──────────────┬───────────────────┘         │
│                                             │                              │
│                                             ▼                              │
│                              ┌───────────────────────────────────┐        │
│                              │       EXPORT FORMATS              │        │
│                              │                                   │        │
│                              │  ┌─────────┐  ┌─────────┐        │        │
│                              │  │ JSONL   │  │ Q&A     │        │        │
│                              │  │ (Chat)  │  │ Pairs   │        │        │
│                              │  └─────────┘  └─────────┘        │        │
│                              │                                   │        │
│                              │  ┌─────────┐                     │        │
│                              │  │ Raw     │                     │        │
│                              │  │ JSON    │                     │        │
│                              │  └─────────┘                     │        │
│                              └───────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Storage Strategy

| Data Type | Storage | Retention | Rationale |
|-----------|---------|-----------|-----------|
| User data | PostgreSQL | Indefinite | Core application data |
| Organizations | PostgreSQL | Indefinite | Tenant boundaries |
| Projects | PostgreSQL | 90 days after archive | Per PRD spec |
| Source configs | PostgreSQL (JSONB) | With project | Flexible schema per source type |
| Raw source data | PostgreSQL (JSONB) | 30 days | Reprocessing capability |
| Processed data | PostgreSQL (JSONB) | With export | Export generation source |
| Export files | Local filesystem | 30 days | Download availability |
| Uploaded files | Local filesystem | 30 days | Reprocessing capability |
| Audit logs | PostgreSQL | 1 year | Compliance requirement |

### Caching Strategy (MVP)

For MVP, caching is minimal and application-level:

| Cache Type | Implementation | TTL |
|------------|---------------|-----|
| Session data | In-memory (request context) | Request lifecycle |
| API connector tokens | In-memory singleton | Per token expiry |
| Field detection results | Database column | Until source changes |

Post-MVP consideration: Redis for distributed caching if scaling beyond single instance.

### Multi-Tenancy Implementation

```typescript
// CRITICAL: All queries must be organization-scoped

// ✅ CORRECT - Always include org filter
const projects = await db.select()
  .from(projects)
  .where(eq(projects.organizationId, ctx.organizationId));

// ❌ FORBIDDEN - Never query without org scope
const projects = await db.select().from(projects);

// Middleware enforces this pattern
function withOrgScope(handler: Handler) {
  return async (req: Request, res: Response) => {
    if (!req.auth?.organizationId) {
      throw new UnauthorizedError('Organization context required');
    }
    return handler(req, res);
  };
}
```

---

## Section 8: Third-Party Integrations

### Integration Overview

| Integration | Classification | Purpose | Auth Method | Rate Limits |
|-------------|---------------|---------|-------------|-------------|
| Neon (PostgreSQL) | **Required** | Primary database | Connection string | Connection pool (10) |
| Resend | **Required** | Transactional email | API key | 100/day (free tier) |
| Teamwork Desk | **Required (MVP)** | Support ticket source | API key + subdomain | 100 req/min |
| GoHighLevel | **Required (MVP)** | Sales conversation source | OAuth or API key | 120 req/min |

### Neon PostgreSQL

**Classification:** Required (core infrastructure)

**Configuration:**
```typescript
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

neonConfig.fetchConnectionCache = true; // Enable connection caching

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
```

**Failure Modes:**
- Connection timeout → Retry with exponential backoff (3 attempts)
- Query timeout → Log and return 503 Service Unavailable
- Database unavailable → Health check fails, Replit restarts container

### Resend Email

**Classification:** Required (user authentication flows)

**Configuration:**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendInviteEmail(to: string, inviteUrl: string) {
  await resend.emails.send({
    from: 'Foundry <noreply@foundry.app>',
    to,
    subject: 'You\'ve been invited to Foundry',
    html: renderInviteTemplate(inviteUrl),
  });
}
```

**Failure Modes:**
- API error → Log, mark invitation as failed, allow retry
- Rate limit → Queue and retry (MVP: fail gracefully)
- Invalid email → Mark invitation as failed with reason

**Fallback:** For MVP, if Resend is unavailable, log invite link to console (dev mode only).

### Teamwork Desk API

**Classification:** Required (MVP launch partner)

**API Details:**
- Base URL: `https://{subdomain}.teamwork.com/desk/v1`
- Auth: `Authorization: Bearer {api_key}`
- Rate limit: 100 requests/minute

**Endpoints Used:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/tickets` | GET | List tickets with filters |
| `/tickets/{id}` | GET | Get ticket details |
| `/tickets/{id}/threads` | GET | Get conversation threads |
| `/me` | GET | Validate credentials |

**Configuration:**
```typescript
interface TeamworkConfig {
  subdomain: string;
  apiKey: string;  // Encrypted at rest
}

class TeamworkConnector implements SourceConnector {
  async testConnection(): Promise<boolean> {
    const response = await this.client.get('/me');
    return response.status === 200;
  }
  
  async fetchTickets(filters: TicketFilters): Promise<Ticket[]> {
    // Paginated fetch with rate limit handling
  }
}
```

**Failure Modes:**
- 401 Unauthorized → Prompt user to re-authenticate
- 429 Too Many Requests → Exponential backoff, max 5 retries
- 5xx Server Error → Retry 3 times, then fail job with reason
- Network timeout → Retry with increased timeout

### GoHighLevel API

**Classification:** Required (MVP launch partner)

**API Details:**
- Base URL: `https://rest.gohighlevel.com/v1`
- Auth: OAuth 2.0 (preferred) or API key
- Rate limit: 120 requests/minute

**Endpoints Used:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/conversations` | GET | List conversations |
| `/conversations/{id}/messages` | GET | Get messages |
| `/contacts/{id}` | GET | Get contact details |
| `/oauth/token` | POST | OAuth token exchange |

**OAuth Flow:**
```
1. Redirect user to GHL authorization URL
2. User grants access, redirected back with code
3. Exchange code for access_token + refresh_token
4. Store encrypted tokens in database
5. Auto-refresh before expiry
```

**Failure Modes:**
- OAuth token expired → Auto-refresh, if refresh fails prompt re-auth
- Rate limit → Exponential backoff
- Scope insufficient → Clear error message, prompt re-auth with correct scopes

### Connector Abstraction Pattern

```typescript
// Common interface for all source connectors
interface SourceConnector {
  type: string;
  testConnection(): Promise<{ success: boolean; error?: string }>;
  fetchData(config: unknown): AsyncGenerator<Record[]>;
  getSchema(): Promise<FieldSchema[]>;
}

// Factory pattern for connector instantiation
function createConnector(type: string, config: unknown): SourceConnector {
  switch (type) {
    case 'teamwork':
      return new TeamworkConnector(config as TeamworkConfig);
    case 'gohighlevel':
      return new GoHighLevelConnector(config as GHLConfig);
    default:
      throw new BadRequestError(`Unknown connector type: ${type}`);
  }
}
```

---

## Section 9: Replit Deployment Configuration

### .replit Configuration

```toml
run = "npm run start"
entrypoint = "server/index.ts"

[deployment]
run = ["sh", "-c", "npm run start"]
deploymentTarget = "cloudrun"

[env]
NODE_ENV = "production"

[[ports]]
localPort = 5000
externalPort = 80
```

### Environment Variables

#### Required (MVP will not start without these)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | `your-secure-random-string-here` |
| `APP_URL` | Public URL of application | `https://foundry.repl.co` |

#### Required with Development Defaults

| Variable | Description | Default (Dev) |
|----------|-------------|---------------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |

#### Optional (Features disabled if missing)

| Variable | Description | Impact if Missing |
|----------|-------------|-------------------|
| `RESEND_API_KEY` | Resend email API key | Emails logged to console |
| `TEAMWORK_ENCRYPTION_KEY` | Key for API credential encryption | Credentials stored in plain text (dev only) |

### Port Configuration

```typescript
// Development: Vite on 5000 proxies to Express on 3001
// Production: Express serves static + API on 5000

const PORT = process.env.PORT || 3001;
const VITE_PORT = 5000;

// Vite config (development)
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: VITE_PORT,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://localhost:${PORT}`,
        changeOrigin: true,
      },
    },
  },
});

// Express config (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist/client'));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile('index.html', { root: 'dist/client' });
  });
}
```

### Health Endpoint

```typescript
// GET /api/health - Required for Replit deployment
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});
```

### Graceful Shutdown

```typescript
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown for Replit deployments
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});
```

### Build Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "tsc -p tsconfig.server.json",
    "start": "NODE_ENV=production node dist/server/index.js",
    "db:push": "drizzle-kit push",
    "db:migrate": "npx tsx server/db/migrate.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## Section 10: Architecture Decision Records

### ADR-001: Monolithic Architecture

**Status:** Accepted

**Context:** 
Foundry is an MVP product targeting Replit deployment. The team needs to move quickly while maintaining code quality. Replit supports single-container deployments most effectively.

**Decision:**
Adopt a monolithic full-stack architecture with clear internal boundaries (layered services), deployed as a single container on Replit.

**Alternatives Considered:**
1. **Microservices** — Rejected: Adds deployment complexity, network latency, and operational overhead inappropriate for MVP stage and Replit's model.
2. **Serverless functions** — Rejected: Cold start latency issues, complex local development, limited support on Replit.

**Consequences:**
- ✅ Simplified deployment and operations
- ✅ Shared code and types between layers
- ✅ Fast development iteration
- ⚠️ Must maintain discipline in service boundaries to enable future extraction
- ⚠️ Single point of failure (acceptable for MVP)

---

### ADR-002: Database-Backed Job Queue

**Status:** Accepted

**Context:**
Processing jobs (PII detection, export generation) can take minutes. Replit doesn't support dedicated worker processes or external queue services in a cost-effective way for MVP.

**Decision:**
Implement a database-backed job queue using PostgreSQL. Jobs are stored in a `processing_jobs` table with status tracking. A polling mechanism processes jobs from within the main Express process.

**Alternatives Considered:**
1. **Redis + Bull** — Rejected: Adds infrastructure complexity, requires separate Redis instance.
2. **AWS SQS** — Rejected: External dependency, adds latency, cost for MVP.
3. **In-memory queue** — Rejected: Jobs lost on restart, no persistence.

**Implementation:**
```typescript
// Polling loop runs every 5 seconds
setInterval(async () => {
  const job = await claimNextPendingJob();
  if (job) {
    await processJob(job);
  }
}, 5000);
```

**Consequences:**
- ✅ No external dependencies
- ✅ Job persistence across restarts
- ✅ Simple implementation
- ⚠️ Polling adds slight latency (5 seconds max)
- ⚠️ Single-threaded processing (adequate for MVP scale)
- ⚠️ Must migrate to proper queue for scale (BullMQ, etc.)

---

### ADR-003: Local Filesystem for File Storage

**Status:** Accepted

**Context:**
Users upload files up to 50MB for processing. Replit provides persistent storage within the container filesystem.

**Decision:**
Store uploaded files and generated exports in the local filesystem using Replit's persistent storage. Files are organized by organization ID to maintain isolation.

**Alternatives Considered:**
1. **AWS S3** — Rejected: Adds complexity, cost, and external dependency for MVP.
2. **Cloudflare R2** — Rejected: Similar to S3, premature optimization.
3. **Database BLOB** — Rejected: Performance issues with large files.

**File Structure:**
```
/data
  /uploads
    /{org_id}
      /{source_id}
        /file.csv
  /exports
    /{org_id}
      /{export_id}
        /export.jsonl
```

**Consequences:**
- ✅ Zero external dependencies
- ✅ Simple implementation
- ✅ Adequate for MVP scale (50GB limit)
- ⚠️ Must migrate to object storage for scale
- ⚠️ Files lost if container migrated (Replit backup mitigates)

---

### ADR-004: Compromise NLP for Named Entity Recognition

**Status:** Accepted

**Context:**
PII de-identification requires detecting names, places, and organizations in unstructured text. The PRD specifies 95% detection accuracy target.

**Decision:**
Use Compromise NLP library for JavaScript-native named entity recognition, supplemented by regex patterns for structured PII (emails, phones, addresses).

**Alternatives Considered:**
1. **spaCy (Python)** — Rejected: Requires Python service, adds deployment complexity.
2. **AWS Comprehend** — Rejected: Per-request cost, external API latency.
3. **Google Cloud NLP** — Rejected: Same concerns as AWS Comprehend.
4. **Microsoft Presidio** — Rejected: Heavy dependencies, complex setup.

**Implementation Strategy:**
```typescript
class PIIEngine {
  // Layer 1: Regex for structured PII (high precision)
  detectEmails(text: string): Match[];
  detectPhones(text: string): Match[];
  detectAddresses(text: string): Match[];
  
  // Layer 2: NER for unstructured PII (high recall)
  detectNames(text: string): Match[];  // Compromise NLP
  detectCompanies(text: string): Match[];
  
  // Layer 3: Custom patterns (user-defined)
  detectCustom(text: string, patterns: Pattern[]): Match[];
}
```

**Consequences:**
- ✅ No external API dependencies
- ✅ Runs entirely in Node.js process
- ✅ Good performance for MVP scale
- ⚠️ Lower accuracy than cloud NLP services
- ⚠️ English-optimized (other languages may need post-MVP work)
- ⚠️ Must monitor false negative rate and add fallback if needed

---

### ADR-005: JWT with Refresh Token Authentication

**Status:** Accepted

**Context:**
Users need secure authentication with reasonable session persistence (24-hour inactivity timeout per PRD). The system must work in a stateless manner suitable for potential future horizontal scaling.

**Decision:**
Implement JWT-based authentication with short-lived access tokens (15 minutes) and longer-lived refresh tokens (7 days). Refresh tokens are stored in HttpOnly cookies.

**Alternatives Considered:**
1. **Session-based auth** — Rejected: Requires session storage, complicates scaling.
2. **JWT only (no refresh)** — Rejected: Long-lived tokens are security risk; short-lived tokens cause poor UX.
3. **OAuth with external provider** — Rejected: Adds dependency, PRD specifies email/password auth.

**Token Strategy:**
| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 15 min | Memory | API authentication |
| Refresh Token | 7 days | HttpOnly cookie | Token renewal |

**Consequences:**
- ✅ Stateless authentication
- ✅ Good security with short access token lifetime
- ✅ Smooth UX with automatic refresh
- ⚠️ Cannot immediately revoke access tokens (15 min max exposure)
- ⚠️ Refresh token theft allows session hijacking (mitigated by HttpOnly)

---

### ADR-006: Drizzle ORM with Core Select API

**Status:** Accepted

**Context:**
The application needs a TypeScript-first ORM that provides type safety while maintaining SQL-like syntax for predictable query behavior.

**Decision:**
Use Drizzle ORM with the Core Select API exclusively. The Query API (relational queries) is forbidden to maintain consistency and predictability.

**Alternatives Considered:**
1. **Prisma** — Rejected: Heavier runtime, less SQL control, schema-first approach.
2. **Knex** — Rejected: No built-in TypeScript types for results.
3. **Raw SQL** — Rejected: Type safety lost, more boilerplate.

**Coding Standard:**
```typescript
// ✅ REQUIRED - Core Select API
const [user] = await db.select()
  .from(users)
  .where(eq(users.id, id))
  .limit(1);

// ❌ FORBIDDEN - Query API
const user = await db.query.users.findFirst({
  where: eq(users.id, id)
});
```

**Consequences:**
- ✅ Full type inference from schema
- ✅ SQL-like syntax is predictable and debuggable
- ✅ Lightweight runtime
- ⚠️ Relational queries require explicit joins
- ⚠️ Team must follow coding standard consistently

---

### ADR-007: shadcn/ui Component Library

**Status:** Accepted

**Context:**
The UI needs accessible, well-designed components that work with Tailwind CSS. Development speed is critical for MVP.

**Decision:**
Use shadcn/ui as the component foundation. Components are copied into the codebase (not imported as a package), allowing customization.

**Alternatives Considered:**
1. **Material UI** — Rejected: Heavy bundle, styling conflicts with Tailwind.
2. **Radix UI (raw)** — Rejected: Lower level, requires more styling work.
3. **Headless UI** — Rejected: Fewer components, more assembly required.
4. **Custom components** — Rejected: Too slow for MVP.

**Consequences:**
- ✅ High-quality accessible components out of the box
- ✅ Full control over styling and customization
- ✅ Consistent with Tailwind CSS
- ✅ No package dependency (components are local)
- ⚠️ Must manually update components for bug fixes
- ⚠️ Initial setup requires copying component files

---

## Section 11: Validation Footer

### Completeness Checklist

- [x] All PRD features have architectural support
- [x] Technology stack complete with rationale
- [x] Auth flows fully specified
- [x] Integrations classified (required/optional)
- [x] Replit configuration complete
- [x] Security middleware specified
- [x] Minimum 5 ADRs documented (7 provided)

### Replit Compatibility Verification

| Requirement | Status | Notes |
|-------------|--------|-------|
| Port 5000 exposed | ✅ | Vite (dev) / Express (prod) |
| Single container | ✅ | Monolithic architecture |
| No persistent processes | ✅ | DB-backed queue instead of workers |
| Environment via Secrets | ✅ | All sensitive config in env vars |
| Non-interactive CLI | ✅ | All commands work without prompts |
| PostgreSQL via Neon | ✅ | Serverless, connection caching |
| Local file storage | ✅ | Replit persistent storage |

### Confidence Scores

| Section | Score (1-10) | Notes |
|---------|--------------|-------|
| Architectural Overview | 9 | Clear pattern aligned with constraints |
| Technology Stack | 9 | All decisions have rationale |
| PRD Traceability | 10 | Complete mapping |
| Component Architecture | 8 | May evolve during implementation |
| Authentication | 9 | Standard patterns, well-specified |
| Security | 8 | MVP-appropriate, needs hardening post-MVP |
| Data Architecture | 8 | Deferred schema details to Agent 3 |
| Integrations | 8 | GHL auth approach still flexible |
| Replit Config | 9 | Validated against Replit docs |
| ADRs | 9 | Key decisions documented |

### Document Status: COMPLETE

---

## Section 12: Downstream Agent Handoff Brief

### For Agent 3: Data Modeling

**Database:** PostgreSQL via Neon
**ORM:** Drizzle ORM (Core Select API only)
**Connection:** Neon HTTP driver with connection caching

**Key Entities from Architecture:**
- User (email, password_hash, name, is_platform_admin)
- Organization (name, created_at, disabled_at)
- OrganizationMembership (user_id, org_id, role)
- Project (org_id, name, description, status, archived_at)
- Source (project_id, type, config JSONB, status)
- SourceMapping (source_id, source_field, target_field, confidence)
- ProcessingJob (project_id, status, progress, started_at, completed_at)
- Export (job_id, format, file_path, created_at, expires_at)
- AuditLog (org_id, user_id, action, resource_type, resource_id, details JSONB)
- Invitation (org_id, email, role, token_hash, expires_at, accepted_at)
- PasswordReset (user_id, token_hash, expires_at, used_at)

**Multi-Tenancy Rule:** All tables with business data include `organization_id` column. All queries MUST filter by organization_id (enforced at service layer).

**JSONB Usage:** Source configurations vary by type (file, teamwork, gohighlevel). Use JSONB for flexible schema.

### For Agent 4: API Contract

**Framework:** Express.js on port 3001 (dev) / 5000 (prod)
**Base Path:** `/api`
**Auth:** JWT Bearer tokens in Authorization header
**Content-Type:** application/json

**Standard Response Format:**
```typescript
// Success
{ data: T }

// Error
{ error: string, message: string, details?: unknown }
```

**Route Groups:**
- `/api/auth` — Login, logout, refresh, invite, password reset
- `/api/users` — CRUD, role management
- `/api/organizations` — Read, update (admin)
- `/api/projects` — CRUD, archive
- `/api/projects/:id/sources` — CRUD sources
- `/api/sources/:id/mappings` — Mapping configuration
- `/api/projects/:id/process` — Trigger processing
- `/api/jobs/:id` — Job status, cancel
- `/api/projects/:id/exports` — Generate, list, download
- `/api/audit` — List, export logs
- `/api/admin` — Platform admin endpoints
- `/api/health` — Health check (required)

**Error Codes:** NOT_FOUND, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, CONFLICT, RATE_LIMITED, INTERNAL_ERROR

### For Agent 5: UI/UX Specification

**Framework:** React 18 + TypeScript + Vite
**Components:** shadcn/ui (Tailwind-based)
**State Management:** TanStack Query for server state, React Context for auth
**Forms:** React Hook Form + Zod validation
**Routing:** React Router v6

**Key Patterns:**
- Optimistic UI updates with TanStack Query mutations
- Toast notifications for async operations
- Modal dialogs for confirmations
- Drag-and-drop file upload (react-dropzone)
- Real-time progress polling for processing jobs

**Accessibility:** WCAG 2.1 AA compliance required

### For Agent 6: Implementation Orchestrator

**Critical Middleware (must be configured):**
- `helmet` — Security headers
- `cors` — CORS with credential support
- `express-rate-limit` — Rate limiting
- `morgan` — Request logging

**Required Utilities:**
- `parseIntParam()` — URL parameter validation
- Error class hierarchy (AppError, NotFoundError, etc.)
- Graceful shutdown handler

**Route Registration Order (CRITICAL):**
1. Security middleware
2. Auth routes (`/api/auth/*`)
3. Specific entity routes (`/api/users/*`, `/api/projects/*`)
4. Nested/parameterized routes LAST (`/api/projects/:id/sources`)
5. Error handler

**Auth Loop Prevention:**
```typescript
// Client must NOT redirect to /login when already on auth pages
if (response.status === 401 && !isOnAuthPage) {
  redirect('/login');
}
```

### For Agent 7: QA & Deployment

**Health Endpoint:** `GET /api/health` → `{ status: "ok" }`

**Deployment Verification Checklist:**
- [ ] Health endpoint returns 200
- [ ] Database connection successful
- [ ] Environment variables loaded
- [ ] Static files served (production)
- [ ] API routes responding
- [ ] Auth flow functional

**Critical Test Scenarios:**
- File upload → Processing → Export (happy path)
- Auth: login, logout, refresh, invite acceptance
- Multi-tenant isolation (user A cannot see user B's data)
- Rate limiting triggers correctly
- Error responses have correct format

---

*Document End*
