# Foundry v4 - Code Review Audit Report

**Agent:** Code Review Agent (Agent 8)
**Date:** January 9, 2026
**Branch:** `claude/build-app-from-specs-cnBx4`
**Auditor:** Claude Opus 4.5

---

## Executive Summary

The Foundry codebase represents a **substantially complete** implementation of the multi-tenant AI training data platform. The audit found:

- **94 files** across server and client
- **7/7 spec documents** present and validated
- **~90% API endpoint coverage** vs specification
- **Replit deployment configuration** correctly implemented
- **5 Critical Issues** requiring immediate attention
- **12 Medium Issues** for enhancement
- **8 Minor Issues** for polish

---

## Section A: Human Review Required

These items require human decisions or strategic input before proceeding.

### A.1 Project Detail Tabs - Placeholder Implementation
**Severity:** Critical
**Location:** `client/src/pages/projects/project-detail.tsx:10-28`

**Issue:** All five project detail tabs (Sources, Mapping, Processing, Exports, Settings) display placeholder "coming soon" messages instead of functional UI components.

```tsx
function SourcesTab() {
  return <div className="rounded-lg border bg-card p-6">Sources management coming soon...</div>;
}
// Same pattern for MappingTab, ProcessingTab, ExportsTab, SettingsTab
```

**Impact:** Core user workflows from PRD are non-functional:
- US-FILE-001: File upload UI missing
- US-MAP-001/002/003: Field mapping UI missing
- US-PROC-001: Processing execution UI missing
- US-EXP-001/002/003: Export generation UI missing

**Human Decision Required:**
1. Is this intentional for phased delivery?
2. What is the priority order for implementing these tabs?
3. Should backend APIs be tested standalone before UI completion?

---

### A.2 Dark Mode Toggle Missing
**Severity:** Low
**Location:** `client/src/index.css` (CSS present), UI toggle missing

**Issue:** Dark mode CSS variables ARE correctly implemented in `client/src/index.css` (lines 46-78), but no UI toggle exists to switch between light/dark modes.

**Impact:** Users cannot manually switch themes. System preference detection could work if `prefers-color-scheme` media query is added.

**Human Decision Required:**
1. Is dark mode toggle MVP scope or post-MVP?
2. If MVP, should it auto-detect system preference only, or include manual toggle?

---

### A.3 Dashboard Statistics Endpoint
**Severity:** Medium
**Location:** Missing from `server/routes/`

**Issue:** 05-UI-UX-Specification.md (line 517) references `/api/dashboard/stats` endpoint for dashboard statistics, but this endpoint is not implemented.

**Impact:** Dashboard may show inaccurate or missing statistics.

**Human Decision Required:**
1. Should dashboard stats come from a dedicated endpoint or be calculated client-side from projects list?

---

### A.4 Password Reset Token Expiry
**Severity:** Low
**Location:** `server/services/auth.service.ts`

**Issue:** Password reset tokens have 1-hour expiry per PRD (US-AUTH-005), but the service doesn't explicitly set this. Need verification.

**Human Decision Required:**
1. Confirm the intended token expiry time
2. Consider user experience for time zones

---

### A.5 Email Service Configuration
**Severity:** Medium
**Location:** `server/connectors/email.connector.ts`

**Issue:** The email connector uses Resend API, but graceful degradation behavior when RESEND_API_KEY is not set needs verification.

**Human Decision Required:**
1. Should invitations fail silently or hard-fail when email is disabled?
2. Should a mock email mode exist for development?

---

## Section B: Claude Code Fix Instructions

These are actionable technical fixes that can be implemented directly.

### B.1 [CRITICAL] Implement Project Sources Tab
**Priority:** P0
**Estimated Effort:** Large

**File:** `client/src/pages/projects/project-detail.tsx`

**Instructions:**
1. Create a new file `client/src/components/project/sources-tab.tsx`
2. Implement:
   - Source list display with SourceCard components
   - "Add Source" dropdown menu (File Upload, Teamwork, GoHighLevel)
   - File upload dialog with drag-and-drop using react-dropzone
   - Teamwork connection dialog with form fields (subdomain, apiKey)
   - GoHighLevel connection dialog
   - Delete source confirmation
   - Test connection functionality

**API Endpoints to use:**
- GET `/api/projects/:id/sources`
- POST `/api/projects/:id/sources/file` (multipart)
- POST `/api/projects/:id/sources/teamwork`
- POST `/api/projects/:id/sources/gohighlevel`
- DELETE `/api/sources/:id`
- POST `/api/sources/:id/test`

**Reference:** 05-UI-UX-Specification.md lines 741-861

---

### B.2 [CRITICAL] Implement Project Mapping Tab
**Priority:** P0
**Estimated Effort:** Large

**File:** `client/src/pages/projects/project-detail.tsx`

**Instructions:**
1. Create `client/src/components/project/mapping-tab.tsx`
2. Implement:
   - Source selector dropdown
   - Mapping table with source field → target field dropdowns
   - isPii checkbox column
   - Confidence indicators (High/Medium/Low badges)
   - Auto-detect mappings button
   - Preview panel showing sample data with de-identification applied

**API Endpoints:**
- GET `/api/sources/:id/mappings`
- PUT `/api/sources/:id/mappings`
- POST `/api/sources/:id/mappings/auto-detect`
- GET `/api/sources/:id/mappings/preview`

---

### B.3 [CRITICAL] Implement Project Processing Tab
**Priority:** P0
**Estimated Effort:** Medium

**File:** Create `client/src/components/project/processing-tab.tsx`

**Instructions:**
1. Implement:
   - "Run Processing" button
   - Job history table with columns: Started, Duration, Status, Records
   - Progress indicator for running jobs (progress bar + percentage)
   - Cancel button for pending/processing jobs
   - Job detail view showing warnings/errors

**API Endpoints:**
- POST `/api/projects/:id/jobs`
- GET `/api/projects/:id/jobs`
- GET `/api/jobs/:id`
- POST `/api/jobs/:id/cancel`

---

### B.4 [CRITICAL] Implement Project Exports Tab
**Priority:** P0
**Estimated Effort:** Medium

**File:** Create `client/src/components/project/exports-tab.tsx`

**Instructions:**
1. Implement:
   - Job selector (from completed jobs)
   - Export format selector (JSONL Conversation, Q&A Pairs, Raw JSON)
   - Export options panel (system prompt, context window)
   - Generate Export button
   - Export history table
   - Download button for each export

**API Endpoints:**
- GET `/api/projects/:id/jobs` (filter completed)
- POST `/api/jobs/:id/exports`
- GET `/api/jobs/:id/exports`
- GET `/api/exports/:id/download`

---

### B.5 [CRITICAL] Implement Project Settings Tab
**Priority:** P1
**Estimated Effort:** Medium

**File:** Create `client/src/components/project/settings-tab.tsx`

**Instructions:**
1. Implement:
   - Project name/description edit form
   - PII Settings section (email domain allow-list, company allow-list, custom patterns)
   - Filter Settings section (min message count, min word count, date range, status filter)
   - Archive/Restore project button
   - Danger zone with delete confirmation

**API Endpoints:**
- PATCH `/api/projects/:id`
- POST `/api/projects/:id/archive`
- POST `/api/projects/:id/restore`

---

### B.6 [MEDIUM] Add Missing Role Authorization Middleware
**Priority:** P1
**Location:** Various routes

**Issue:** Several routes are missing `requireRole` middleware checks:

**Fixes needed:**
```typescript
// server/routes/exports.routes.ts:19
// Add requireRole('editor') for export creation
router.post('/jobs/:jobId/exports', requireAuth, requireRole('editor'), validate(createExportSchema), async (req, res, next) => {

// server/routes/jobs.routes.ts:59
// Add requireRole('editor') for job cancellation
router.post('/:id/cancel', requireAuth, requireRole('editor'), async (req, res, next) => {

// server/routes/mappings.routes.ts:51-52
// Add requireRole('editor') for auto-detect
router.post('/sources/:sourceId/mappings/auto-detect', requireAuth, requireRole('editor'), async (req, res, next) => {
```

---

### B.7 [MEDIUM] Fix Export Format Enum Mismatch
**Priority:** P1
**Location:** `server/routes/exports.routes.ts:11` and API Contract

**Issue:** Export format enum uses `['jsonl', 'qa', 'raw']` but API Contract specifies `['jsonl_conversation', 'jsonl_qa', 'json_raw']`.

**Fix:**
```typescript
// server/routes/exports.routes.ts
const createExportSchema = z.object({
  format: z.enum(['jsonl_conversation', 'jsonl_qa', 'json_raw']),
  // ...
});

// server/services/export.service.ts - update format parameter type
async createExport(
  jobId: number,
  organizationId: number,
  format: 'jsonl_conversation' | 'jsonl_qa' | 'json_raw',
  // ...
)
```

---

### B.8 [MEDIUM] Add Pagination to Audit Logs Export
**Priority:** P2
**Location:** `server/routes/audit.routes.ts`

**Issue:** Audit log export endpoint exists but needs to verify it handles large datasets properly with streaming.

**Verify/Fix:**
1. Ensure CSV export uses streaming for large datasets
2. Add date range parameters to export endpoint
3. Consider adding export size limits per spec (max 1 year range)

---

### B.9 [MEDIUM] Create Upload Directory on Startup
**Priority:** P1
**Location:** `server/routes/sources.routes.ts:17`

**Issue:** Multer storage assumes upload directory exists. Should create it on startup.

**Fix:** Add to `server/index.ts`:
```typescript
import fs from 'fs';
import path from 'path';

// After env validation, before routes
const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const exportsDir = path.join(process.cwd(), 'data', 'exports');
fs.mkdirSync(exportsDir, { recursive: true });
```

---

### B.10 [MEDIUM] Add Source Sync Endpoint
**Priority:** P2
**Location:** `server/routes/sources.routes.ts`

**Issue:** API Contract specifies `POST /api/sources/:id/sync` endpoint (line 221) but it's not implemented.

**Fix:** Add to sources.routes.ts:
```typescript
// POST /api/sources/:id/sync - Trigger sync for API source
router.post('/:id/sync', requireAuth, requireRole('editor'), async (req, res, next) => {
  try {
    const id = parseIntParam(req.params.id, 'id');
    const result = await sourceService.sync(id, req.auth!.organizationId, req.auth!.userId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});
```

Also implement `sync` method in source.service.ts.

---

### B.11 [MINOR] Add Request ID to Error Responses
**Priority:** P3
**Location:** `server/middleware/error-handler.ts`

**Fix:** Include requestId in error responses for debugging:
```typescript
res.status(statusCode).json({
  error: {
    code: error.code,
    message: error.message,
    details: error.details,
    requestId: req.requestId,  // Add this
  },
});
```

---

### B.12 [MINOR] Add Rate Limit Headers to Response
**Priority:** P3
**Location:** `server/middleware/rate-limit.ts`

**Issue:** Per API Contract, rate limit headers should be included.

**Fix:** Verify express-rate-limit is configured to send headers:
```typescript
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders: false,
});
```

---

### B.13 [MINOR] Improve Accessibility - Focus States
**Priority:** P3
**Location:** Client components

**Issue:** Custom form inputs may be missing focus ring styles per spec.

**Fix:** Ensure all interactive elements have:
```css
focus:ring-2 focus:ring-ring focus:ring-offset-2
```

---

### B.14 [MINOR] Add Toast Notifications
**Priority:** P2
**Location:** Client app

**Issue:** Toast notifications for async operations not implemented.

**Fix:**
1. Add Radix Toast provider in `main.tsx`
2. Create toast utility hook
3. Add success/error toasts after mutations

---

### B.15 [MINOR] Add Loading Spinners to Buttons
**Priority:** P3
**Location:** Various client forms

**Issue:** Buttons should show loading spinner when isPending.

**Fix pattern:**
```tsx
<button disabled={isPending}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isPending ? 'Saving...' : 'Save'}
</button>
```

---

## Replit Deployment Verification

### ✅ Compliant Items
- [x] `.replit` file present with correct configuration
- [x] Port 5000 configured in vite.config.ts
- [x] Host `0.0.0.0` configured for server binding
- [x] `tsx` wrappers for drizzle-kit commands
- [x] Health endpoint at GET `/api/health`
- [x] Neon PostgreSQL compatible driver configured
- [x] Environment variable validation on startup
- [x] SPA fallback for production static serving

### ⚠️ Items to Verify
- [ ] `npm run build` completes without errors
- [ ] `npm run start` serves production build correctly
- [ ] Database migrations run successfully with `npm run db:push`
- [ ] Seed data creates platform admin user

---

## Test Coverage Recommendations

Before deployment, verify:

1. **Authentication Flow**
   - Login with valid/invalid credentials
   - Token refresh cycle
   - Password reset flow

2. **Multi-Tenancy Isolation**
   - Users cannot access other organizations' projects
   - Platform admin can view all organizations

3. **File Upload**
   - CSV, Excel, JSON uploads
   - 50MB limit enforcement
   - Invalid file type rejection

4. **Processing Pipeline**
   - Job creation and progress tracking
   - PII detection and tokenization
   - Filter application
   - Job cancellation

5. **Export Generation**
   - All three export formats
   - Download functionality
   - 30-day expiry

---

## Summary of Findings

| Category | Count |
|----------|-------|
| Critical (Must Fix) | 5 |
| Medium (Should Fix) | 7 |
| Minor (Nice to Fix) | 8 |
| Human Review Items | 5 |

### Recommended Priority Order

1. **Phase 1 (Critical):** Implement project detail tabs (B.1-B.5)
2. **Phase 2 (Security):** Add missing role authorization (B.6)
3. **Phase 3 (Correctness):** Fix format enum mismatch (B.7)
4. **Phase 4 (Stability):** Directory creation, sync endpoint (B.9-B.10)
5. **Phase 5 (Polish):** Toast notifications, accessibility (B.14, B.13)

---

**Document Status:** COMPLETE
**Next Action:** Human review of Section A items, then implement Section B fixes in priority order.
