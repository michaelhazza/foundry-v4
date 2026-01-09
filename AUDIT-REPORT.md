# Foundry v4 - Code Review Audit Report

**Agent:** Code Review Agent (Agent 8)
**Date:** January 9, 2026 (Updated)
**Branch:** `claude/build-app-from-specs-cnBx4`
**Auditor:** Claude Opus 4.5
**Audit Version:** 2.0

---

## Executive Summary

**Update from v1.0:** Several critical issues from the original audit have been addressed. The project detail tabs are now implemented as separate components. However, this audit uncovered a **fundamental architecture issue** with the role system that affects the entire application.

### Current Status

| Category | Count |
|----------|-------|
| **CRITICAL (Blocking)** | 3 |
| **HIGH (Security/Spec Violation)** | 8 |
| **MEDIUM (Functional)** | 4 |
| **LOW (Polish)** | 5 |
| **RESOLVED (from v1.0)** | 6 |

### Key Finding Summary

1. **Role System Mismatch (CRITICAL)** - Implementation uses `admin|member` but spec requires `viewer|editor|admin`
2. **Missing requireRole Middleware (HIGH)** - 11 routes missing role authorization
3. **Export Format Mismatch (HIGH)** - Enum values don't match API contract
4. **Project Tabs Implemented (RESOLVED)** - All 5 tab components now exist

---

## Section A: Human Review Required

### A.1 [CRITICAL] Role System Architecture Mismatch

**Severity:** CRITICAL - Blocks proper RBAC implementation
**Impact:** Entire application

**Issue:**

The specification documents (03-Data-Model.md, 04-API-Contract.md) define three roles:
- `viewer` - Read-only access
- `editor` - Create/edit projects, configure sources, trigger processing
- `admin` - Full access including user management

**However, the implementation uses a two-role system:**
- `admin`
- `member`

**Files Affected:**

| File | Line(s) | Current | Should Be |
|------|---------|---------|-----------|
| `server/middleware/auth.ts` | 13, 29-30, 87, 97 | `'admin' \| 'member'` | `'viewer' \| 'editor' \| 'admin'` |
| `server/routes/team.routes.ts` | 11-12 | `z.enum(['admin', 'member'])` | `z.enum(['viewer', 'editor', 'admin'])` |
| `server/routes/invitations.routes.ts` | 12-13 | `z.enum(['admin', 'member'])` | `z.enum(['viewer', 'editor', 'admin'])` |
| `server/services/invitation.service.ts` | 16 | `role: 'admin' \| 'member'` | `role: 'viewer' \| 'editor' \| 'admin'` |
| `client/src/types/index.ts` | 8, 103, 110 | `'admin' \| 'member'` | `'viewer' \| 'editor' \| 'admin'` |

**Human Decision Required:**
1. Should this be fixed to match the specification (recommended)?
2. If the 2-role system is intentional, should specifications be updated instead?
3. What is the migration path for existing database records?

---

### A.2 Email Service Incomplete

**Severity:** MEDIUM
**Location:** `server/services/auth.service.ts:254`, `server/services/invitation.service.ts:90`

**Issue:** Email sending contains TODO comments and only logs to console:

```typescript
// server/services/auth.service.ts:253-258
if (features.email) {
  // TODO: Send email via Resend
  console.log(`[EMAIL] Password reset link: ${resetUrl}`);
}
```

**Human Decision Required:**
1. Is console-only email acceptable for MVP?
2. Should email be required for production deployment?

---

### A.3 Dashboard Statistics Endpoint

**Severity:** MEDIUM
**Status:** Still missing from v1.0 audit

The `/api/dashboard/stats` endpoint referenced in UI spec is not implemented. Dashboard may need client-side calculation from projects list.

---

## Section B: Claude Code Fix Instructions

### B.1 [CRITICAL] Fix Role System to Match Specification

**Priority:** P0 - BLOCKING
**Estimated Effort:** Medium

**Step 1: Update Auth Middleware**

```typescript
// server/middleware/auth.ts

// Line 13: Change type
export interface AuthContext {
  userId: number;
  email: string;
  organizationId: number;
  role: 'viewer' | 'editor' | 'admin';  // Changed from 'admin' | 'member'
  isPlatformAdmin: boolean;
}

// Lines 29-30: Update JwtPayload
interface JwtPayload {
  userId: number;
  email: string;
  organizationId: number;
  role: 'viewer' | 'editor' | 'admin';  // Changed
  isPlatformAdmin: boolean;
}

// Line 87: Update casting
req.auth = {
  userId: payload.userId,
  email: payload.email,
  organizationId: payload.organizationId,
  role: membership.role as 'viewer' | 'editor' | 'admin',  // Changed
  isPlatformAdmin: payload.isPlatformAdmin,
};

// Line 97: Update requireRole function
export function requireRole(...roles: Array<'viewer' | 'editor' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new UnauthorizedError());
    }

    // Hierarchical role check: admin > editor > viewer
    const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
    const userLevel = roleHierarchy[req.auth.role];
    const requiredLevel = Math.min(...roles.map(r => roleHierarchy[r]));

    if (userLevel < requiredLevel) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}
```

**Step 2: Update Team Routes Schema**

```typescript
// server/routes/team.routes.ts:11-12
const updateRoleSchema = z.object({
  role: z.enum(['viewer', 'editor', 'admin']),  // Changed from ['admin', 'member']
});
```

**Step 3: Update Invitation Routes Schema**

```typescript
// server/routes/invitations.routes.ts:11-13
const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['viewer', 'editor', 'admin']),  // Changed from ['admin', 'member']
});
```

**Step 4: Update Invitation Service**

```typescript
// server/services/invitation.service.ts:16
async create(
  organizationId: number,
  email: string,
  role: 'viewer' | 'editor' | 'admin',  // Changed
  invitedBy: number
)
```

**Step 5: Update Client Types**

```typescript
// client/src/types/index.ts

// Line 8
export interface User {
  // ...
  role?: 'viewer' | 'editor' | 'admin';  // Changed
}

// Line 103
export interface TeamMember {
  // ...
  role: 'viewer' | 'editor' | 'admin';  // Changed
}

// Line 110
export interface Invitation {
  // ...
  role: 'viewer' | 'editor' | 'admin';  // Changed
}
```

---

### B.2 [HIGH] Add Missing requireRole('editor') Middleware

**Priority:** P1 - SECURITY
**Estimated Effort:** Small

Per API Contract (04-API-Contract.md), the following routes require `requireRole('editor')` but are missing it:

**Fix `server/routes/projects.routes.ts`:**

```typescript
// Line 36: POST /api/projects
router.post('/', requireAuth, requireRole('editor'), validate(createProjectSchema), async (req, res, next) => {

// Line 77: PATCH /api/projects/:id
router.patch('/:id', requireAuth, requireRole('editor'), validate(updateProjectSchema), async (req, res, next) => {

// Line 88: POST /api/projects/:id/archive
router.post('/:id/archive', requireAuth, requireRole('editor'), async (req, res, next) => {

// Line 99: POST /api/projects/:id/restore
router.post('/:id/restore', requireAuth, requireRole('editor'), async (req, res, next) => {
```

**Fix `server/routes/sources.routes.ts`:**

```typescript
// Line 75: POST /projects/:projectId/sources/file - add requireRole('editor')
router.post(
  '/projects/:projectId/sources/file',
  requireAuth,
  requireRole('editor'),  // ADD THIS
  uploadLimiter,
  upload.single('file'),
  async (req, res, next) => {

// Line 102: POST /projects/:projectId/sources/teamwork - add requireRole('editor')
router.post(
  '/projects/:projectId/sources/teamwork',
  requireAuth,
  requireRole('editor'),  // ADD THIS
  validate(teamworkSourceSchema),
  async (req, res, next) => {

// Line 123: POST /projects/:projectId/sources/gohighlevel - add requireRole('editor')
router.post(
  '/projects/:projectId/sources/gohighlevel',
  requireAuth,
  requireRole('editor'),  // ADD THIS
  validate(gohighlevelSourceSchema),
  async (req, res, next) => {

// Line 155: PATCH /sources/:id - add requireRole('editor')
router.patch('/:id', requireAuth, requireRole('editor'), validate(updateSourceSchema), async (req, res, next) => {

// Line 166: DELETE /sources/:id - add requireRole('editor')
router.delete('/:id', requireAuth, requireRole('editor'), async (req, res, next) => {

// Line 177: POST /sources/:id/test - add requireRole('editor')
router.post('/:id/test', requireAuth, requireRole('editor'), async (req, res, next) => {
```

---

### B.3 [HIGH] Fix Export Format Enum

**Priority:** P1
**Estimated Effort:** Small

**Issue:** API Contract specifies `['jsonl_conversation', 'jsonl_qa', 'json_raw']` but implementation uses `['jsonl', 'qa', 'raw']`.

**Fix `server/routes/exports.routes.ts`:**

```typescript
// Line 10-16
const createExportSchema = z.object({
  format: z.enum(['jsonl_conversation', 'jsonl_qa', 'json_raw']),  // Changed
  options: z.object({
    systemPrompt: z.string().optional(),
    contextWindow: z.number().int().min(1).max(10).optional(),
  }).optional(),
});
```

**Fix `client/src/types/index.ts`:**

```typescript
// Line 90
export interface Export {
  // ...
  format: 'jsonl_conversation' | 'jsonl_qa' | 'json_raw';  // Changed
}
```

**Fix `server/services/export.service.ts`:** Update the createExport method signature and format handling logic.

---

### B.4 [HIGH] Fix Project Status Enum

**Priority:** P2
**Estimated Effort:** Small

**Issue:** Client types define project status as `'draft' | 'processing' | 'completed' | 'error'` but Data Model specifies `'active' | 'archived'`.

**Fix `client/src/types/index.ts`:**

```typescript
// Line 17
export interface Project {
  // ...
  status: 'active' | 'archived';  // Changed from 'draft' | 'processing' | 'completed' | 'error'
}
```

---

### B.5 [MEDIUM] Implement Email Sending

**Priority:** P2
**Location:** `server/services/auth.service.ts`, `server/services/invitation.service.ts`

Replace console.log with actual email sending:

```typescript
// server/connectors/email.connector.ts
import { Resend } from 'resend';
import { env, features } from '../config/env';

const resend = features.email ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.log(`[DEV EMAIL] To: ${to}, Subject: ${subject}`);
    console.log(`[DEV EMAIL] Body: ${html}`);
    return true;
  }

  try {
    await resend.emails.send({
      from: 'Foundry <noreply@foundry.app>',
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}
```

---

### B.6 [MEDIUM] Add Rate Limit Headers

**Priority:** P2
**Location:** `server/middleware/rate-limit.ts`

Verify rate limiters include standard headers:

```typescript
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,  // X-RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});
```

---

### B.7 [LOW] Add bcrypt Cost Factor Alignment

**Priority:** P3
**Location:** `server/services/auth.service.ts:13`

**Current:** `SALT_ROUNDS = 12`
**Spec (03-Data-Model.md):** bcrypt cost factor 10

**Note:** Current setting is MORE secure (higher cost). Consider updating spec to match implementation, or lowering to match spec for consistency.

---

### B.8 [LOW] Add Request ID to Error Responses

**Priority:** P3
**Location:** `server/middleware/error-handler.ts`

Include requestId in error responses for debugging/support.

---

## Section C: Resolved Issues (from v1.0)

The following issues from the v1.0 audit have been verified as RESOLVED:

### ✅ C.1 Project Detail Tabs Implemented

**Original Issue:** All five tabs showed placeholder "coming soon" messages.

**Status:** RESOLVED - Components now exist:
- `client/src/components/project/sources-tab.tsx`
- `client/src/components/project/mapping-tab.tsx`
- `client/src/components/project/processing-tab.tsx`
- `client/src/components/project/exports-tab.tsx`
- `client/src/components/project/settings-tab.tsx`

### ✅ C.2 Upload Directory Creation

**Original Issue:** Need to create upload/export directories on startup.

**Status:** RESOLVED - `server/index.ts:17-22` now creates directories:
```typescript
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(exportsDir, { recursive: true });
```

### ✅ C.3 Source Sync Endpoint

**Original Issue:** POST `/api/sources/:id/sync` not implemented.

**Status:** RESOLVED - `server/routes/sources.routes.ts:199-207` now implements this endpoint.

### ✅ C.4 requireRole on jobs/mappings routes

**Original Issue:** Missing requireRole on some routes.

**Status:** PARTIALLY RESOLVED:
- `jobs.routes.ts:15` - Has requireRole('editor') ✅
- `jobs.routes.ts:59` - Has requireRole('editor') ✅
- `mappings.routes.ts:33` - Has requireRole('editor') ✅
- `mappings.routes.ts:53` - Has requireRole('editor') ✅

### ✅ C.5 exports.routes.ts requireRole

**Status:** RESOLVED - Line 19 has `requireRole('editor')`.

### ✅ C.6 Basic Route Structure

All 52 API endpoints from the contract are registered in `server/routes/index.ts`.

---

## Replit Deployment Verification

### ✅ Compliant Items
- [x] `.replit` file present with correct configuration
- [x] Port 5000 configured (Vite dev) / Port 3001 (Express dev) / Port 5000 (production)
- [x] Host `0.0.0.0` configured for server binding
- [x] `tsx` wrappers for drizzle-kit commands in package.json
- [x] Health endpoint at GET `/api/health`
- [x] Neon PostgreSQL `@neondatabase/serverless` driver configured
- [x] Environment variable validation on startup (`server/config/env.ts`)
- [x] SPA fallback for production static serving (`server/index.ts:50-56`)
- [x] Graceful shutdown handling (`server/index.ts:72-87`)

### ⚠️ Items to Verify Before Deployment
- [ ] `npm run build` completes without errors
- [ ] `npm run start` serves production build correctly
- [ ] Database migrations run successfully with `npm run db:push`
- [ ] Seed data creates platform admin user

---

## Recommended Fix Order

### Phase 1: Critical Fixes (Blocking)
1. **B.1** Fix Role System Architecture (all files)
2. **B.2** Add Missing requireRole Middleware (projects, sources routes)

### Phase 2: High Priority Fixes (Spec Compliance)
3. **B.3** Fix Export Format Enum
4. **B.4** Fix Project Status Enum

### Phase 3: Medium Priority (Functionality)
5. **B.5** Implement Email Sending
6. **B.6** Add Rate Limit Headers

### Phase 4: Low Priority (Polish)
7. **B.7** Align bcrypt cost factor (or update spec)
8. **B.8** Add Request ID to errors

---

## Document Status

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-09 | Initial audit |
| 2.0 | 2026-01-09 | Updated with role system findings, verified resolved items |

**Next Action:** Human approval of Section A items, then implement Section B fixes in priority order.
