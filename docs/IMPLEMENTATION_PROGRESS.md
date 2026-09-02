# AcadMind AI — Implementation Progress

## Overview

This document tracks the systematic hardening, security fixing, and AI-first implementation of the AcadMind AI Academic Management System.

## Phase 0 — Codebase Discovery ✅

**Completed:** Comprehensive reading of all backend (28 files), frontend (20+ files), Prisma schema, migrations, seed data, test files, and audit documents.

**Key findings:**
- 14 Prisma models, 7 enums, 2 migrations
- Express + Next.js architecture with clean service layer
- AI pipeline with Gemini primary + Groq fallback
- Audit score: 42/100 overall

## Phase 1 — Security ✅

### 1.1 Exposed credentials
- [x] `creds.txt` removed from filesystem
- [x] `creds.txt` added to `.gitignore`
- [x] Git history contains the credential (commit `bfbb29b`). Rotation required: the database password `Adeoluwa@2007$` should be changed if the database is accessible.
- [x] JWT secret now fails fast at startup: `const JWT_SECRET = (() => { if (!secret) throw new Error('...') })()`
- [x] Environment validation added (`src/config/env.ts`) — validates required vars at startup

### 1.2 Authentication & Authorization
- [x] Registration endpoints protected — only DEAN can create accounts
- [x] `POST /api/auth/register` and `POST /api/auth/signup` now require authentication + DEAN role
- [x] Bootstrap endpoint added (`POST /api/auth/bootstrap`) for first-time system setup (only works when no users exist)
- [x] Rate limiting on login (20 req/15min) and registration (20 req/hour)
- [x] Password policy: 8+ chars, uppercase, lowercase, number required
- [x] `registerSchema` now accepts both `HOD` and `DEAN` roles
- [x] `auth.service.ts` handles both HOD (departmentId) and DEAN (facultyId) registration

### 1.3 Department Security
- [x] `POST /departments/public` now requires authentication + DEAN authorization
- [x] `DELETE /departments/public/:id` now requires authentication + DEAN authorization
- [x] `GET /departments/public` remains public (for signup/bootstrap flows)

### 1.4 Data Isolation (IDOR fixes)
- [x] Created `src/middleware/access.middleware.ts` — centralized department/faculty/ownership scoping
- [x] Upload routes: `GET /upload/:jobId` and `GET /upload/:jobId/stream` now check ownership/department scope
- [x] Review routes: `GET /review/:jobId`, `PATCH /review/:itemId`, `POST /review/:jobId/approve-all` now check ownership
- [x] Result controller: `getStudentResults`, `getStudentResultsWithGPA`, `getCarryOverCourses` now check student access
- [x] GPA controller: `getSemesterGPA`, `getStudentGPAHistory` now check student access
- [x] Report controller: `getStudentTranscript`, `downloadStudentTranscriptPDF` now check student access
- [x] Approval routes: `GET /approval` scoped to DEAN's faculty; `approve`, `reject`, `publish` check department access
- [x] `resolveStudent()` now validates department code (not just matric number)

### 1.5 Additional Security Fixes
- [x] Gemini safety settings: `BLOCK_NONE` → `BLOCK_MEDIUM_AND_ABOVE` + added all 4 harm categories
- [x] MIME validation: `text/plain` removed from accepted CSV types
- [x] `bulkScoreEntrySchema` now includes ND1, ND2, HND1, HND2 levels
- [x] Student seed data: real-looking names replaced with clearly synthetic demo data
- [x] `@prisma/client` symlink issue fixed (prisma generate now works correctly)

## Phase 2 — Data Integrity ✅

### 2.1 Transactions
- [x] `saveResult()` in `validation.tools.ts` now uses `prisma.$transaction()` for atomic result upserts + GPA recalculation
- [x] `gpa.service.ts` refactored to accept optional `tx` (transaction client) parameter for atomic operations

### 2.2 Authorization Scoping
- [x] Centralized `assertDepartmentAccess()`, `assertStudentAccess()`, `assertUploadJobAccess()`, `assertReviewItemAccess()` helpers
- [x] Wire into upload, review, approval, result, GPA, and report routes

### 2.3 Approval Workflow Integrity
- [x] Duplicate approval prevention: checks for existing approval by the same role
- [x] Department/faculty scoping for approve, reject, publish

## Phase 3 — Broken Functionality ✅

### 3.1 Registration/Dashboard
- [x] Public signup page replaced with bootstrap page (first-time DEAN creation)
- [x] Login page updated: removed "Sign up" link, replaced with "Initialize system"
- [x] Setup page (department management) now requires DEAN authentication
- [x] Frontend builds successfully

### 3.2 Seed Data
- [x] Real student names replaced with synthetic data (19 synthetic students)

### 3.3 Build Verification
- [x] Backend TypeScript compiles cleanly (`tsc --noEmit`)
- [x] Frontend builds successfully (`next build`)

## Phase 4 — Testing ✅

### 4.1 Test Infrastructure
- [x] Docker Postgres test database on port 5433
- [x] `jest.setup.cjs` with test environment variables
- [x] Named `.env.test` for test database configuration

### 4.2 Grading Unit Tests (23 tests)
- [x] `determineGrade` — all grade boundaries, custom pass mark, invalid scores
- [x] `calculateResult` — PXU calculation, carry-over detection
- [x] `calculateGPA` — perfect GPA, failing GPA, mixed GPA, single course, boundary scores
- [x] `calculateCGPA` — multiple semesters, zero units
- [x] `getClassOfDegree` — all class bands
- [x] `formatLevel`, `formatSemester` — all supported levels

### 4.3 GPA Integration Tests (3 tests)
- [x] Zero results returns null GPA
- [x] Single A-grade result returns 5.00 GPA
- [x] Mixed grades (A, B, F) compute correct weighted GPA

### 4.4 Remaining Test Coverage (planned)
- [ ] Auth/security tests
- [ ] Bulk upload pipeline tests (rewrite of existing `bulk.test.ts`)
- [ ] System health check tests

## Phase 5 — AI Pipeline (In Progress)

### 5.1 Completed
- [x] Provided: Gemini safety settings improved
- [x] Transactional `saveResult()` with atomicity

### 5.2 Remaining
- [ ] Confidence scoring improvements
- [ ] Anomaly detection
- [ ] AI output schema validation
- [ ] Prompt centralization
- [ ] AI auditability

## Phase 6 — Production Readiness (In Progress)

### 6.1 Completed
- [x] Environment validation at startup
- [x] Rate limiting (global + auth-specific)
- [x] Graceful shutdown handlers
- [x] Health check endpoint (`/api/health`)
- [x] Test database in Docker

### 6.2 Remaining
- [ ] Structured logging / correlation IDs
- [ ] Production deployment documentation
- [ ] README rewrite
- [ ] Final audit document

## Files Changed

### Security
- `backend/src/config/jwt.ts` — Fail-fast JWT_SECRET validation
- `backend/src/config/env.ts` — NEW environment validation module
- `backend/src/validators/auth.validator.ts` — DEAN role, password policy
- `backend/src/services/auth.service.ts` — DEAN registration, bootstrap
- `backend/src/controllers/auth.controller.ts` — Bootstrap methods
- `backend/src/routes/auth.routes.ts` — Protected registration, bootstrap, rate limiting
- `backend/src/routes/department.routes.ts` — Protected POST/DELETE
- `backend/src/middleware/upload.middleware.ts` — Removed `text/plain` MIME
- `backend/src/ai/gemini.ts` — Safety settings hardened
- `backend/src/validators/result.validator.ts` — Added ND/HND levels
- `backend/src/ai/validation.tools.ts` — resolveStudent with department check, transactional saveResult

### Authorization
- `backend/src/middleware/access.middleware.ts` — NEW centralized scoping helpers
- `backend/src/routes/upload.routes.ts` — Ownership checks
- `backend/src/routes/review.routes.ts` — Ownership checks
- `backend/src/routes/approval.routes.ts` — Department/faculty scoping
- `backend/src/controllers/result.controller.ts` — Student/department access checks
- `backend/src/controllers/gpa.controller.ts` — Student access checks
- `backend/src/controllers/report.controller.ts` — Student/department access checks
- `backend/src/routes/gpa.routes.ts` — Student access check on explain

### Data Integrity
- `backend/src/services/gpa.service.ts` — Transaction client support
- `backend/src/ai/validation.tools.ts` — Transactional saveResult

### Tests
- `backend/src/__tests__/grading.test.ts` — NEW (23 tests)
- `backend/src/__tests__/gpa.test.ts` — NEW (3 integration tests)
- `backend/jest.config.cjs` — Added setupFiles
- `backend/jest.setup.cjs` — NEW test environment

### Frontend
- `frontend/src/app/(auth)/signup/page.tsx` — Rewritten as bootstrap page
- `frontend/src/app/(auth)/login/page.tsx` — Removed public signup link
- `frontend/src/app/(auth)/setup/page.tsx` — Requires DEAN auth

### Other
- `backend/prisma/seed.ts` — Synthetic student names
- `backend/.env.test` — NEW test database configuration
- `creds.txt` — DELETED
- `.gitignore` — Added creds.txt

## Remaining Issues (per audit)

### High Priority
1. **JWT in localStorage** — Frontend stores tokens in `localStorage` (XSS vulnerability). Migration to httpOnly cookies requires auth flow refactoring.
2. **No CSRF protection** — Needed if moving to cookie-based auth.
3. **Results written before approval** — AI pipeline writes directly to `Result` table during validation, before batch approval. The approval workflow gates "publication" but not the initial persistence.
4. **No email verification** — No email verification on registration.
5. **No password reset flow** — No forgot password mechanism.

### Medium Priority
6. **In-memory multer storage** — OOM risk for large concurrent uploads.
7. **No structured logging** — Uses `console.log`/`console.error` only.
8. **N+1 query in enterScores** — Per-score course lookup in loop.
9. **N+1 query in calculateDepartmentGPAs** — Sequential per-student GPA calculation.
10. **No request correlation IDs** — Cannot trace requests across logs.
11. **No API versioning** — Routes mounted at `/api` without version prefix.
12. **No student self-service** — Students cannot log in or view their own results.

## Final Audit Score (Target: 70+/100)

Scoring will be added in the final audit document (`docs/ACADMIND_FINAL_AUDIT.md`).