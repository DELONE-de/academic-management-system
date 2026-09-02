# UNIVERSITY GPA SYSTEM — COMPREHENSIVE AUDIT REPORT

## Audit Metadata

| Field | Value |
|---|---|
| **Audit date** | 2026-09-01 |
| **Project** | GPA/CGPA Academic Management System (branded in README as "AcadMind AI") |
| **Commit examined** | `401d6a7` ("audit") on `main` (working tree clean) |
| **Technology stack** | Node.js/Express + TypeScript (backend), Next.js 14 + React 18 (frontend), Prisma 5 + PostgreSQL (Supabase), JWT auth, Gemini + Groq AI |
| **Auditor** | Senior Architecture / Security / QA audit (multi-disciplinary) |
| **Audit scope** | Full static codebase audit: backend, frontend, database schema, AI pipeline, tests, docs, config. No runtime/penetration testing performed. |
| **Overall system score** | **42 / 100** (Production readiness: **NOT PRODUCTION READY** — blocked by critical security & correctness issues) |
| **Production readiness** | 🔴 **BLOCKED** — multiple CRITICAL security vulnerabilities, broken test suite, no student self-service, no CI/CD/deployment infrastructure |

> **IMPORTANT SCOPE NOTE:** A prior audit (`PRODUCTION_AUDIT_REPORT.md`, at repo root) already exists. This audit is **independent** — it re-verified every claim against the actual source and found several where the prior audit was **incorrect or misleading** (notably the claim that the password-stripping in `auth.service.ts` is broken — it is actually correct, and the claim about "recalculateAllStudentGPA pattern" which does not exist). Where this audit differs from the prior report, the discrepancy is called out explicitly.

---

## 1. Executive Summary

The system is a GPA/CGPA management platform for (primarily Nigerian) universities, with an ambitious and genuinely innovative **AI-powered result/student upload pipeline** (Gemini 2.0 Flash with Groq fallback, function-calling validation, confidence scoring, and a human-in-the-loop review center). The core grading engine is **correct for the Nigerian 5-point scale** it targets. The service-layer separation is clean, the Prisma schema is thoughtfully designed, and the approval workflow + audit logging are solid foundations.

However, the project is **not production-ready** and should not be deployed to any environment with real student data until:

1. **Critical security fixes** — hardcoded DB password committed to git (`creds.txt`), public unauthenticated write/delete endpoints (`/api/departments/public`), insecure default JWT secret, open self-registration, no rate limiting.
2. **Data-integrity fixes** — the AI upload pipeline writes results *before* human review approval, unauthenticated read endpoints expose all students' results across departments, result edits can be applied post-publication without controls.
3. **A reworked GPA engine** — the current engine is hardcoded to one grading scale, one pass-mark model, ignores repeat/carryover rules, and stores GPA snapshots that can drift from source results.
4. **Rebuilt test infrastructure** — the only test file references routes that no longer exist and will fail.

The system has strong bones and a genuinely differentiating AI feature, but as a **product for other departments** it is single-institution/single-scale hardcoded, lacks a student portal, lacks faculty/level admin CRUD, and has no deployment story.

**Highest-value assessment:** This is a promising **demo-grade** application, not a deployable product. The correct path forward is NOT a rewrite — the schema, grading math, AI pipeline, and approval workflow are worth keeping. The correct path is systematic hardening (security → GPA engine → RBAC → multi-department data model → tests → ops) as outlined in the roadmap in Section 24.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend runtime | Node.js + Express 4.18.2 | ESM (`"type": "module"`), TypeScript 5.3.3 |
| ORM | Prisma 5.7.0 | Postgres driver; `@prisma/adapter-pg` present but not used |
| Database | PostgreSQL via Supabase | Pooled connection + pgBouncer; `DIRECT_URL` for migrations |
| Backend validation | Zod 3.22.4 | Route middleware + inline `safeParse` (inconsistent) |
| Auth | JWT (jsonwebtoken) + bcryptjs | Token stored in `localStorage` on frontend |
| File upload | Multer (in-memory storage) | 20MB limit |
| Excel/CSV | SheetJS (xlsx) 0.18.5 | Parsing + template/error-file generation |
| PDF | pdf-parse (read) + PDFKit (write) | Transcripts + department reports |
| AI (primary) | Google Gemini 2.0 Flash | Vision OCR, structured extraction, function-calling validation, GPA explanation |
| AI (fallback) | Groq `llama-3.3-70b-versatile` | Used on Gemini 429/quota errors |
| Frontend | Next.js 14.2.35 (App Router), React 18 | Tailwind CSS 3.4, `react-hook-form` + Zod, Axios, `react-hot-toast`, Headless UI, Heroicons |
| Testing | Jest + Supertest (backend) | Only 1 test file; **broken** |

### Notable stack issues
- `@types/*` packages, `tsx`, and `typescript` are in `dependencies` instead of `devDependencies` (bloats production install).
- Frontend declares both `tailwindcss` v3 and `@tailwindcss/postcss` v4 — v4 is unused dead weight; config uses v3.
- `@types/react` is v19 while `react` is v18 (type mismatch, can break CI).
- Supabase keys in frontend `.env.example` are unused (dead config).
- `chart.js` + `react-chartjs-2` in frontend deps are **never used** (dashboard uses hand-rolled CSS bars).
- Two lockfiles in frontend (`package-lock.json` and `pnpm-lock.yaml`) — mixed package-manager usage.

---

## 3. Current Architecture

### 3.1 High-level view

```
[Next.js Frontend (App Router)]
      │  Axios (JWT in localStorage) / fetch+SSE for uploads
      ▼
[Express API  /api  → routes → controllers → services → Prisma]
      │
      ├── auth, students, courses, results, gpa, reports
      ├── departments (partially public)
      ├── upload (SSE) → AI pipeline → Gemini/Groq
      ├── review (human-in-the-loop)
      ├── approval (batch workflow)
      └── audit
      │
      ▼
[PostgreSQL (Supabase) — 14 models, 7 enums]
```

### 3.2 Backend layering

- **`src/app.ts`** — Express bootstrap: helmet, CORS, morgan, 10mb JSON body, route mounting, error handling, graceful shutdown.
- **`src/routes/*`** — 11 route modules + index. Route-level auth/authorization and Zod validation.
- **`src/controllers/*`** — 7 thin controllers delegating to services (correct pattern, but several use inconsistent inline responses instead of the `send*` helpers).
- **`src/services/*`** — 8 services holding business logic (GPA, results, students, courses, departments, reports, auth, upload).
- **`src/ai/*`** — Gemini integration, Groq fallback, and the validation function-tool dispatchers that actually **write results to the DB** during upload validation.
- **`src/utils/*`** — grading math, PDF generation, Excel parsing, file extraction, response helpers.
- **`src/middleware/*`** — auth (JWT + RBAC + dept/faculty scoping), error handling, upload filtering, validation.
- **`src/validators/*`** — Zod schemas for request bodies.
- **`src/types/index.ts`** — shared TypeScript contracts.

### 3.3 Frontend layering

- **`src/app/(auth)/`** — login, signup, setup (public dept creation) pages.
- **`src/app/(dashboard)/`** — dashboard, students, courses, scores/upload, gpa, cgpa, reports, approval, review, departments (orphaned) pages.
- **`src/context/AuthContext.tsx`** — auth state (localStorage-backed), client-only route guard in dashboard `layout.tsx`.
- **`src/lib/api.ts`** — Axios client + per-domain API modules.
- **`src/components/ui|layout|forms`** — reusable UI components.

### 3.4 Interaction flow (score upload path — the core differentiator)

1. HOD/Lecturer/Exam Officer uploads Excel/CSV/PDF/image via `POST /api/upload` (SSE streamed).
2. `upload.service.ts` extracts content → parses structured rows OR sends to Gemini for structured extraction (vision for images/PDFs).
3. `geminiValidateWithTools` runs an agentic function-calling loop calling `validateStudent` / `checkRegistration` / `validateCourse` / `findDuplicateStudents` / **`saveResult`**.
4. `saveResult` **immediately upserts results and recalculates GPA** for anything that passes validation.
5. Issues flagged with confidence < 0.9 are persisted as `ReviewItem`s → job status `NEEDS_REVIEW`.
6. Human reviews items in the review center; `commitReviewItem` (re)writes results on accept/edit.
7. Approvals: Lecturer/HOD creates `ResultBatch` → Exam Officer → HOD → Dean → PUBLISHED, with audit logs at each step.

> ⚠️ **Architectural concern:** Step 4 writes results to the DB *during validation*, before human review and *before* any batch/approval exists. The "review center" therefore mostly affects *corrective* writes, not gating writes. This undermines the approval workflow's integrity (see Section 6/8).

---

## 4. Current Features

| Feature | Status | Where Implemented | Quality | Problems | Recommendation |
|---|---|---|---|---|---|
| Login (JWT + bcrypt) | ✅ Fully working | `backend/src/services/auth.service.ts`, `auth.routes.ts`, frontend `login/page.tsx` | Good | No rate limiting, no account lockout, token in localStorage, no refresh/rotation | Add rate limit, httpOnly cookie or refresh tokens, lockout |
| Self-service signup (HOD/DEAN) | ⚠️ Partially working | `auth.routes.ts:24-25`, `signup/page.tsx` | Poor | **PUBLIC and unauthenticated** (anyone creates HOD). Backend only allows HOD (`z.literal('HOD')`) though UI offers DEAN → DEAN signup fails | Protect behind admin; align schema/UI |
| Department create/delete (public) | ❌ Broken/Unsafe | `department.routes.ts:15-16`, `department.controller.ts`, `setup/page.tsx` | Poor | **Fully public POST/DELETE**; `facultyId: ''` hardcoded in setup page | Require auth; remove setup page or gate it |
| Student CRUD | ✅ Fully working | `student.service.ts`, `student.controller.ts`, `students/*` pages | Good | HOD update/delete not department-scoped; hard delete cascades; no soft-delete; no pagination UI | Add scoping, soft-delete, pagination |
| Student list/search | ✅ Fully working | `student.service.findAll` | Good | 50-row hard cap, no pagination controls in UI | Add pagination |
| Bulk student import (legacy) | ❌ Broken/Dead | `frontend/src/lib/api.ts:85-103` (`studentsApi.bulkUpload` → `/students/bulk-upload`) | Dead | Endpoint does not exist in backend; method unused | Remove dead code; rely on AI upload |
| Course CRUD | ✅ Fully working | `course.service.ts`, `course.controller.ts`, `courses/page.tsx` | Good | HOD update/delete not scoped; duplicate error generic; inline form in page duplicates unused `CourseForm` | Add scoping; reuse component |
| Manual single score entry | ✅ Fully working | `result.service.addSingleScore`, `result.controller.ts`, `resultsApi.addScore` | Good | Uses `req.user.departmentId!` (non-null assertion — DEAN would crash); backend endpoint exists but no UI page calls it | Guard role; wire UI |
| Bulk score entry (manual) | ⚠️ Partially working | `result.service.enterScores`, `resultsApi.enterScores` | Medium | **N+1 queries** (per-score course lookup); validator rejects ND/HND levels (`bulkScoreEntrySchema`); not called by any page | Batch queries; fix levels; wire UI |
| **AI upload pipeline** | ✅ Fully working | `upload.routes.ts`, `upload.service.ts`, `gemini.ts`, `groq.ts` | Good/High | Writes results before review; no concurrency limit; fragile JSON parsing; unsanitized `rawRecords` stored; MIME `text/plain`→CSV; no ownership check on `GET /upload/:jobId` | Gate writes; sanitize; scope access |
| Human review center | ✅ Fully working | `review.routes.ts`, `review/[jobId]/page.tsx` | Good | No ownership check; bulk approve-all has no undo; commit logic uses a dubious job lookup by `originalValue` | Add scoping/undo |
| GPA calculation (semester/CGPA) | ✅ Fully working | `utils/grading.ts`, `services/gpa.service.ts`, `gpa/routes.ts` | Good for one scale | Hardcoded scale, no repeat/carryover credit rules, GPA snapshots can drift (see §8) | Configurable grading engine |
| GPA history | ✅ Fully working | `gpa.service.getStudentGPAHistory`, `cgpa/page.tsx` | Medium | `cgpa/page.tsx` accesses `history.student.name` but API returns `firstName`/`lastName` → **shows undefined** (type bug) | Fix frontend bug |
| GPA explanation (AI) | ✅ Fully working | `gpa.routes.ts` `/explain`, `geminiExplainGPA` | Medium | No caching; no frontend page calls it | Cache; wire UI |
| Department GPA stats | ✅ Fully working | `gpa.service.getDepartmentGPAStats`, `gpa/page.tsx` | Good | Distribution computed in-memory; `groupBy` on Float in dashboard is broken | Fix dashboard bucket logic |
| Transcript PDF | ✅ Fully working | `report.service.getStudentTranscript`, `pdf-generator.ts` | Good | No branding/watermark; Helvetica only (no Unicode) | Polish |
| Department report PDF | ✅ Fully working | `report.service`, `pdf-generator.ts`, `reports/page.tsx` | Good | N+1 filter loop; no Excel export; no course/score filters | Optimize; add exports |
| Faculty stats (Dean) | ⚠️ Partially working | `report.service.getFacultyStats`, `reports/faculty`, `departments/page.tsx` | Medium | No dedicated Dean dashboard page; no drill-down | Build Dean page |
| Approval workflow | ✅ Fully working | `approval.routes.ts`, `approval/page.tsx` | Good | Approve route lacks role authz middleware (checked inline); no "batch has results" validation; no notifications; all roles see all batches | Add RBAC, validation, notifications |
| Audit log | ✅ Fully working | `audit.routes.ts`, `AuditLog` model | Good | No filtering by date/action; no export; not immutable (regular table) | Harden |
| Password change | ✅ Fully working | `auth.service.changePassword` | Good | No password reset/forgot flow; no token revocation | Add reset |
| Faculty management | ❌ Missing | — | — | No faculty CRUD anywhere (seed-only) | Add admin CRUD |
| Department update | ❌ Missing | — | — | No update endpoint | Add |
| User management (list/deactivate) | ❌ Missing | — | — | Only signup + seed | Add admin user panel |
| **Student self-service portal** | ❌ **Missing** | — | — | Students cannot log in at all; no `Student`↔`User` link | **Highest-value missing feature** |
| Notifications/email | ❌ Missing | — | — | None | Add |
| Carryover tracking UI | ❌ Missing | — | — | Backend endpoint exists, no page | Add |
| Bulk level update UI | ❌ Missing | — | — | Backend route exists, `BulkLevelUpdate.tsx` component exists but is **never wired** | Wire it |
| Attendance/scheduling/assignments | ❌ Missing | — | — | Out of scope for GPA core | Defer |
| Tests | ❌ Broken | `backend/src/__tests__/bulk.test.ts` | Broken | References non-existent `/api/bulk/*` routes; invalid bcrypt hash for test user | Rebuild (see §15) |

---

## 5. What Is Working Well

1. **AI upload pipeline with human-in-the-loop** — genuinely differentiated, well-implemented (function-calling loop, confidence scoring, SSE progress, Groq fallback on quota). This is the reason to keep the project rather than rewrite.
2. **Grading math is correct** for the target Nigerian 5-point scale (A=5…F=0, GPA=ΣPXU/ΣUnits, rounded to 2dp). CGPA math is correct.
3. **Clean service-layer separation** — controllers delegate to services; services own DB logic; testable in principle.
4. **Solid Prisma schema** — 14 models, sensible relationships, composite unique constraints (`results(studentId,courseId,academicYear)`, `semester_gpas(studentId,level,semester,academicYear)`), relevant indexes, `cascade` deletes on the right relations.
5. **Audit logging** — created for upload/review/approval events; queryable by entity and actor.
6. **Approval workflow** — multi-step chain with transactional updates and audit trail.
7. **Stuck-job recovery** — `database.ts:recoverStuckJobs` recovers interrupted uploads; per-user stale `PROCESSING` job cleanup in `upload.service.ts`.
8. **Reusable UI primitives** — `Button`, `Card`, `Input`, `Select`, `Table`, `Modal`, `FileUpload` are clean and typed.
9. **Validation discipline (backend)** — Zod validators on most bodies; matric format, level, year, score ranges enforced.

---

## 6. Critical Problems

### 6.1 CRITICAL — plaintext DB password committed to git (`creds.txt`)
**Location:** `creds.txt:1` (repo root). Contains `db passwd:Adeoluwa@2007$`.
**Impact:** Anyone with repo access (public GitHub per git remote) has the production DB password → full data compromise of all student/academic records.
**Fix (P0):** Delete file, **rotate the password** (it's already exposed), add `creds.txt` to `.gitignore`, scrub git history if the repo is/will be public.

### 6.2 CRITICAL — public unauthenticated write/delete endpoints
**Location:** `backend/src/routes/department.routes.ts:15-16` — `POST /api/departments/public` and `DELETE /api/departments/public/:id` are registered **before** `router.use(authenticate)` and call `departmentController.create`/`remove` directly with no auth.
**Impact:** Any anonymous user can create and destroy departments → denial of service, data corruption, tampering with the academic structure. The frontend `setup/page.tsx` is built on this (public dept creation) — the pattern is intentional but unsafe.
**Fix (P0):** Protect behind `authenticate` (+ `authorize('DEAN')` for delete). Keep only `GET /public` open for the signup form — or remove public signup entirely.

### 6.3 CRITICAL — insecure default JWT secret
**Location:** `backend/src/config/jwt.ts:7` — `const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'`.
**Impact:** If `JWT_SECRET` env is missing, the server silently signs/verifies tokens with a **well-known public string** → any attacker can forge tokens for any role (HOD/DEAN) and fully compromise the system.
**Fix (P0):** Fail fast at startup if `JWT_SECRET` is not set; generate/require a strong secret.

### 6.4 CRITICAL — open self-registration of HOD accounts
**Location:** `backend/src/routes/auth.routes.ts:24-25` — `POST /api/auth/register` and `/signup` are public. Comment even admits "should be protected in production".
**Impact:** Anyone can create an HOD account bound to any department → full read/write access to that department's students, courses, results, GPAs, and reports.
**Fix (P0):** Require `authenticate` + `authorize('DEAN')` (or a super-admin bootstrap flow); remove the public `/signup` alias.

### 6.5 HIGH — results written to DB before human review / before batch approval
**Location:** `backend/src/ai/validation.tools.ts:saveResult` (upserts results + recalculates GPA during the validation loop); invoked automatically for every passing row during upload.
**Impact:** 
- The approval workflow is cosmetic: results already exist in `results`/`semester_gpas` before any batch is created or approved.
- "Approved" uploads silently persist immediately; a rejected review item cannot undo already-saved results (only reject a *future* commit).
- Data integrity of GPA is at risk if the AI misreads a score that happens to pass validation.
**Fix (P0/P1):** Two-stage pipeline — stage extracted records, persist only after human approval/commit, and only create GPA snapshots from persisted results. Wrap writes in `$transaction`.

### 6.6 HIGH — unauthenticated/read endpoints expose other departments' and other students' data (broken access control / IDOR)
**Location:** 
- `result.routes.ts:48-67,87` — `GET /results/student/:studentId`, `GET /results/student/:studentId/with-gpa`, `GET /results/carryovers/:studentId` have **no authorization** (any authenticated user). 
- `result.controller.getDepartmentResults` — a DEAN or any user passing an arbitrary `departmentId` in the path can read another department's results (only HOD is forced to their own; DEAN can read any department in *any* faculty, not just their own).
- `student.controller.findById`, `course.controller.findById`, `gpa.controller.getStudentGPAHistory`, `report.controller` transcript/report endpoints — no department/faculty scoping.
**Impact:** Any authenticated user (including a Lecturer or Exam Officer) can read any student's results, GPA history, and transcripts; a Dean can read any department's data even outside their faculty. IDOR-grade issue.
**Fix (P0/P1):** Enforce department/faculty scoping consistently at service or middleware layer for ALL reads of results/students/transcripts.

### 6.7 HIGH — no rate limiting anywhere
**Location:** `app.ts` (entire middleware stack).
**Impact:** Login is brute-forceable; upload endpoint can be flooded to burn AI quota / OOM the server (in-memory multer).
**Fix (P0):** `express-rate-limit` on auth (e.g., 5/min) and upload; per-user concurrency cap on AI jobs.

### 6.8 HIGH — no CSRF / token-in-localStorage / no refresh
**Location:** `frontend/src/lib/api.ts:27` and `frontend/src/context/AuthContext.tsx:66` store JWT in `localStorage`; no CSRF tokens; no refresh rotation.
**Impact:** Any XSS steals the JWT (full account takeover); localStorage is readable by any script. (JWT-in-header mitigates classic CSRF but localStorage is the bigger risk.)
**Fix (P1):** httpOnly+Secure+SameSite cookie with CSRF header, or refresh-token rotation; sanitize output to reduce XSS surface.

### 6.9 HIGH — tests are broken
**Location:** `backend/src/__tests__/bulk.test.ts` — calls `/api/bulk/students`, `/api/bulk/scores`, `/api/bulk/*/template` which **do not exist** (routes were removed in favor of the AI pipeline). Test user password is `'$2a$10$test'` (invalid hash) so even login fails.
**Impact:** `npm test` fails on every run → zero working regression safety for the GPA engine and auth (the two most critical subsystems).
**Fix (P1):** Rewrite tests against current routes + dedicated test DB (see §15).

### 6.10 HIGH — N+1 / sequential query patterns
**Location:** `result.service.enterScores` (per-score `course.findUnique` in a loop), `gpa.service.calculateDepartmentGPAs` (per-student sequential recalcs), `report.service.generateDepartmentReport` (in-memory filter O(n·m)).
**Impact:** At ~1,000 students × ~10 courses (10k rows), enterScores issues 10k+ sequential queries; department-wide GPA recalc and report generation become minutes-long / time out. Breaks first at scale (see §10).
**Fix (P1):** Batch course lookups with `findMany`+Map; parallelize recalcs with bounded concurrency; use Map grouping in report service.

### 6.11 MEDIUM — `resolveStudent` ignores departmentCode
**Location:** `backend/src/ai/validation.tools.ts:399-404` — resolves by `matricNumber` only, ignoring `departmentCode`.
**Impact:** Since matric numbers are unique DB-wide (unique index), cross-department collision is limited, but a file claiming dept A with a student from dept B could write results into B's record under the wrong department context. `checkRegistration` does check, but `saveResult` does not re-verify.
**Fix (P1):** Verify `student.department.code === departmentCode` inside `saveResult`.

---

## 7. Bugs & Fixes

| # | Bug | Location | Severity | Fix |
|---|---|---|---|---|
| B1 | DEAN signup always fails — backend `registerSchema` is `z.literal('HOD')`, frontend offers DEAN | `validators/auth.validator.ts:21` vs `signup/page.tsx` | HIGH | `z.enum(['HOD','DEAN'])` + conditional dept/facultyId (or remove DEAN from public signup) |
| B2 | Test suite references removed routes `/api/bulk/*` and uses invalid bcrypt hash | `__tests__/bulk.test.ts` | HIGH | Rewrite tests (see §15) |
| B3 | `bulkScoreEntrySchema` rejects ND/HND levels though schema/levels support them | `validators/result.validator.ts:12-14` | MEDIUM | Add ND1,ND2,HND1,HND2 to enum |
| B4 | `cgpa/page.tsx` reads `history.student.name`; API returns `firstName`/`lastName` → renders `undefined` | `frontend/src/app/(dashboard)/cgpa/page.tsx:68` | MEDIUM | Use firstName+lastName |
| B5 | Frontend legacy bulk-upload API methods call non-existent endpoints (`/students/bulk-upload`, `/results/bulk-upload`); `uploadResults` always throws | `frontend/src/lib/api.ts:85-103,181-197,247-251` | LOW (dead code) | Remove |
| B6 | Dashboard GPA distribution uses `semesterGPA.groupBy({by:['gpa']})` on a Float — buckets meaningless (each unique float its own group) | `report.routes.ts:46-50` | MEDIUM | Fetch gpa values & bucket in code (as done in `gpa.service`) |
| B7 | `result.controller` uses `req.user.departmentId!` non-null assertion — DEAN (no dept) would throw | `result.controller.ts:17,39,61` etc. | MEDIUM | Role-guard before non-null assert |
| B8 | `commitReviewItem` finds upload job via `findFirst({ where: { reviewItems: { some: { originalValue: ... } } } })` — non-unique/wrong key, may resolve wrong job | `review.routes.ts:179-182` | MEDIUM | Pass jobId/departmentCode explicitly |
| B9 | HOD update/delete for students & courses not department-scoped (HOD can mutate another dept's records if ID known) | `student.controller.ts:69-85`, `course.controller.ts:77-92` | MEDIUM | Enforce scoping |
| B10 | `setup/page.tsx` hardcodes `facultyId: ''` — backend requires valid facultyId → setup likely fails | `frontend/src/app/(auth)/setup/page.tsx` | MEDIUM | Provide faculty selection or remove page |
| B11 | `.catch(() => {})` swallows errors on dashboard/other fetches → silent blank states | `dashboard/page.tsx` and several pages | MEDIUM | Add error/retry UI |
| B12 | CORS `origin.startsWith(o)` is permissive (e.g. `evil.localhost:3000.com` passes) | `app.ts:37` | LOW/MED | Exact-match origins |
| B13 | Non-prod error handler leaks raw error messages to clients | `error.middleware.ts:45-47` | MEDIUM | Hide in prod (already) + avoid dev leak on deployed staging |
| B14 | `saveResult` during upload has no transaction — crash between result write & GPA recalc leaves inconsistent state | `validation.tools.ts:362-387` | MEDIUM | Wrap in `$transaction` |

---

## 8. GPA / Academic Logic Audit

> **Verdict:** The math is **correct** for the single scale it hardcodes. The **engine design** is not configurable, not safe against all inputs, and does not model several academic rules that Nigerian institutions actually enforce.

### 8.1 What's correct (CONFIRMED)
- `determineGrade` mapping: A≥70→5, B≥60→4, C≥50→3, D≥45→2, E≥40→1, F<passMark→0. ✅ (Note: E is 40–44 at 1 point; standard Nigerian HND scale.)
- `calculateResult`: PXU = gradePoint × unit; carryOver = score < passMark. ✅
- `calculateGPA`: ΣPXU / ΣUnits, rounded to 2dp; empty → 0. ✅
- `calculateCGPA`: cumulative ΣPoints / ΣUnits. ✅
- `getClassOfDegree`: First ≥4.5, 2:1 ≥3.5, 2:2 ≥2.4, Third ≥1.5, Pass ≥1.0. ✅ (matches common Nigerian bands)
- `gpa.service` recomputes CGPA by summing **all** semester snapshots (not just adjacent). ✅

### 8.2 Problems (CONFIRMED / RECOMMENDATION)

| Issue | Location | Severity | Detail |
|---|---|---|---|
| Grading scale hardcoded | `utils/grading.ts` | HIGH | A/B/C/D/E thresholds + points and class-of-degree bands are literals. Different depts/faculties/institutions (e.g., some use 60=A on HND, others 4.0 scale) cannot configure. |
| passMark stored per-department but grading boundaries not | `Department.passMark` | MEDIUM | `passMark` (40) only used for F boundary; D/E boundaries fixed (45/40). A dept with passMark 50 would grade 40-49 as E (pass) incorrectly → inconsistent with `passMark`. **Design smell.** |
| Repeat/carryover credit rules absent | `Result.isCarryOver`, `calculateGPA` | HIGH | Failed courses are simply counted again with their units in the GPA — no "last sit" or "grade replaced" or "capped carryover" rules. GPA/CGPA can be inflated by re-sitting. No modeling of which attempt counts. |
| Zero-credit courses unsupported | `Course.unit Int` min 1 in validator | LOW | Some institutions have non-credit (0-unit) courses; validator rejects unit 0. |
| GPA snapshot drift | `SemesterGPA` stored + `calculateSemesterGPA` recomputes on demand in some paths | MEDIUM | Stored `gpa/cumulativeGpa` can become stale if results are edited/deleted outside the recalc path (e.g., AI `saveResult`, direct DB edits). `getStudentGPAHistory` reads stored snapshots, not recomputed — can show wrong CGPA. |
| Missing results treated as absent, not failed | `calculateGPA` sums only rows present | MEDIUM | A student with missing results in a semester just has fewer units counted — there's no explicit "ABSENT"/"INCOMPLETE" handling. |
| `calculateDepartmentGPAs` only processes students who have ≥1 result that semester | `gpa.service.ts:207` | MEDIUM | Students with 0 results that semester are skipped → no 0.00 GPA record → department stats undercount. |
| Pass rate uses `gpa >= 1.0` | `report.service.ts:173-178` | LOW | Pass rate should be based on courses passed / total courses, not semester GPA threshold. Misleading metric. |
| Rounding: `Math.round(x*100)/100` | `grading.ts:80,100` | LOW | Standard but some institutions truncate or use 3dp; not configurable. |
| Scores as Float | `Result.score Float` | LOW | Accepts fractional scores (e.g., 69.5) — some systems disallow; also accepts `-0` etc. |

### 8.3 GPA engine redesign (RECOMMENDATION)
Introduce a **configurable grading engine**:
- `GradingScale` entity: `{ id, departmentId|institutionId, name, isDefault }` with `GradingBand[]` `{ minScore, maxScore, grade, gradePoint }`, `maxGradePoint`, `minPassScore`.
- `GradingPolicy` entity for academic rules: carryover handling (`LAST_SIT_ONLY | BEST_OF | REPEAT_COUNTS`), whether repeated courses' units double-count in CGPA, rounding mode (`ROUND_2 | TRUNCATE_2`), missing-result policy (`ABSENT`, `INCOMPLETE`), zero-unit handling.
- Refactor `calculateGPA/CGPA` to take `(policy)` and be **pure + unit-testable**; persist only raw results and compute GPA on the fly (or recompute via a `recalculateStudent(studentId)` job).
- Store an immutable `ResultVersion`/history when a score changes, so "result corrections" are auditable (currently `Result` is overwritten in place via `upsert` — **no change history**).

---

## 9. Database Audit

**Location:** `backend/prisma/schema.prisma` (14 models), migrations in `backend/prisma/migrations/`.

### 9.1 Strengths (CONFIRMED)
- Sensible relational design: Faculty → Department → {Student, Course, User}, Student → {Result, SemesterGPA}, UploadJob → ReviewItem, ResultBatch → BatchApproval, AuditLog.
- Good composite uniqueness: `results(studentId, courseId, academicYear)`, `semester_gpas(studentId, level, semester, academicYear)`, `courses(code, departmentId)`, `students(matricNumber)`, `students(email)`.
- Good indexes: `students(departmentId,currentLevel)`, `courses(departmentId,level,semester)`, `results(studentId,level,semester)`, `audit_logs(entityType,entityId)`, `audit_logs(actorId)`.
- Cascade deletes on student/course/department relations where sensible.

### 9.2 Problems (CONFIRMED / RECOMMENDATION)

| # | Issue | Severity | Impact / Fix |
|---|---|---|---|
| D1 | **No Institution/University entity** | HIGH | Everything is scoped to Faculty/Department only; no `institutionId` — a second university or campus is impossible without schema change. (Multi-tenancy blocker, see §18.) |
| D2 | **`Department.code` is globally unique** | MEDIUM | Two departments in different faculties/institutions with the same code collide. Should be unique per faculty (+institution). |
| D3 | **No `Program`/`Session`/`AcademicCalendar` entities** | HIGH | "Program" (e.g., ND vs B.Sc) is conflated into `Level` enum values; academic session is a free-text string `academicYear`; no semester date ranges, current-session tracking. |
| D4 | **`Level` enum mixes ND/HND and 100–500** | MEDIUM | Hardcoded union of polytechnic & university levels; adding e.g. LEVEL_600 or DIP2 requires a migration + validator edits. |
| D5 | **Result has no change history** | HIGH | `Result` is `upsert`-overwritten; no `ResultVersion`, no `editedById`, no `editedAt`. Result corrections are unauditable at the row level. |
| D6 | **`Result` stores denormalized `level`, `semester`, `academicYear`** | LOW | Duplicated from Course context; risk of drift if Course changes. Acceptable for snapshotting, but should be documented as intentional snapshot. |
| D7 | **`SemesterGPA` snapshot can drift** | MEDIUM | Stored cumulative values are redundant with `results`; no job ensures consistency (no recompute-all-on-edit except direct paths). |
| D8 | **`UploadJob.rawRecords Json` unsanitized & unbounded** | MEDIUM | Full AI-extracted records stored; can bloat DB, stores sensitive PII without retention/redaction policy. |
| D9 | **No soft-delete / isDeleted on any model** | MEDIUM | Student/course/department deletes are hard + cascade; accidental deletion is unrecoverable and destroys GPA history. |
| D10 | **`User` role is a fixed enum, not a join table** | MEDIUM | Can't grant a user multiple roles or per-department roles (a lecturer in 2 depts, an HOD who is also exam officer). Blocks RBAC evolution (§11). |
| D11 | **Missing indexes on `results(academicYear)` and results-by-course** | LOW/MED | Department report queries filter by `level,semester,academicYear,student.departmentId` — needs an index on (academicYear) or (student.departmentId, level, semester). `ResultBatch`/`BatchApproval` unindexed on foreign keys. |
| D12 | **`Faculty.name` and `Faculty.code` globally unique** | LOW | Same collision concern as D2 at institution scale. |
| D13 | **No seed users / admin bootstrap in seed** | LOW | `prisma/seed.ts` creates no users → cannot log in after seeding; relies on public signup (itself a security hole). |
| D14 | **Migration history mismatch with schema** | INFO | `GPAExplanation` model referenced in the prior audit's table of contents is NOT in the current schema (14 models, no GPAExplanation) — prior report inaccurate on this point. |

### 9.3 Data-loss scenarios
- `Student`/`Department` hard delete cascades to `Result`, `SemesterGPA` → permanent loss of academic history.
- Public `DELETE /api/departments/public/:id` allows anonymous destruction of a department + all its students/courses/results (cascade) — **total data-loss vector**.
- `prisma/seed.ts` **deletes all tables** at the start — running seed on a production DB wipes everything.

### 9.4 Migration strategy
- Only 2 migrations; no `prisma migrate dev` workflow documented for fresh clone; `DIRECT_URL`/pgBouncer config handled. Adequate for solo dev, but no CI-driven `migrate deploy`, no backup-before-migrate, no down migrations.

---

## 10. Security Audit

### 10.1 Severity table

| ID | Severity | Finding | Location | Impact | Remediation |
|---|---|---|---|---|---|
| S1 | **CRITICAL** | Plaintext DB password in git | `creds.txt:1` | Full DB compromise | Delete, rotate password, gitignore, scrub history |
| S2 | **CRITICAL** | Unauthenticated dept create/delete | `department.routes.ts:15-16` | Anonymous create/delete departments; cascade data loss | `authenticate` + `authorize` |
| S3 | **CRITICAL** | Default JWT secret fallback | `jwt.ts:7` | Token forgery → full admin access | Fail-fast on missing secret |
| S4 | **CRITICAL** | Public self-registration (HOD) | `auth.routes.ts:24-25` | Anyone creates HOD accounts | Admin-only registration |
| S5 | **HIGH** | Broken access control / IDOR on result/GPA/transcript reads | `result.routes.ts`, `gpa.routes.ts`, `report.routes.ts` (no dept/faculty scoping) | Users read other users'/departments' data | Central scoping middleware/service |
| S6 | **HIGH** | Results written before human review | `validation.tools.ts:saveResult` | Integrity of approval workflow; bad AI writes persist | Two-stage persist after approval |
| S7 | **HIGH** | No rate limiting | `app.ts` | Brute force login; AI quota DoS; OOM | `express-rate-limit` |
| S8 | **HIGH** | JWT in localStorage | `frontend/lib/api.ts:27`, `AuthContext.tsx:66` | XSS → token theft | httpOnly cookie / refresh tokens |
| S9 | **MEDIUM** | Upload job/review items lack ownership check | `upload.routes.ts:102-114`, `review.routes.ts:18-33` | Any auth user views/reads any upload job & PII | Scope to uploader/dept |
| S10 | **MEDIUM** | MIME `text/plain` accepted as CSV | `upload.middleware.ts:13` | Arbitrary file upload disguised as CSV | Remove; magic-byte check |
| S11 | **MEDIUM** | AI safety settings set to BLOCK_NONE | `gemini.ts:29-31` | Harmful/abusive content not filtered | BLOCK_MEDIUM_AND_ABOVE or log triggers |
| S12 | **MEDIUM** | Weak password policy (min 6, no complexity) | `auth.validator.ts` | Weak accounts | 8+ chars, complexity, breached-pass check |
| S13 | **MEDIUM** | No email verification | `auth.service.register` | Fake accounts | Verification flow |
| S14 | **MEDIUM** | CORS `startsWith` origin permissiveness | `app.ts:37` | Cross-origin abuse | Exact-match allowlist |
| S15 | **MEDIUM** | No CSRF protection (relevant after cookie move) | `app.ts` | CSRF on state-changing calls | SameSite=Strict + origin check |
| S16 | **MEDIUM** | Passwords >72 chars silently truncated (bcrypt limit) | `auth.validator.ts` (max 100) | Login mismatch, weak effective entropy | Cap at 72 |
| S17 | **MEDIUM** | No audit log for result add/update/delete (only batch/approval events) | `AuditAction` enum, result service | Score changes untraceable | Log all result mutations |
| S18 | **MEDIUM** | `rawRecords`/error messages echo AI output to client & DB (prompt-injection surface) | `upload.service.ts`, `gemini.ts` | Prompt injection into stored/rendered content (XSS if rendered unsafely) | Sanitize, treat AI output as untrusted |
| S19 | **LOW** | `@types/*` in production deps | `package.json` | Supply-chain surface bloat | Move to devDeps |
| S20 | **LOW** | No security headers beyond helmet defaults | `app.ts:25` | Minor | Add CSP (careful with SSE/fetch) |
| S21 | **LOW** | `Student.email` unique but no password/user link | schema | Students can't self-serve (availability, not vuln) | See roadmap |
| S22 | **LOW** | No account lockout / login throttling beyond rate limit | auth | Slow brute force | Add lockout |
| S23 | **INFO** | Health endpoint leaks feature flags (harmless) | `routes/index.ts:19-36` | Info disclosure | Trivial |

### 10.2 Cross-tenant access summary (worst case)
- A **Lecturer** (least-privileged role after student) can: read *any* student's results/GPA/transcript in *any* department (S5), view *any* upload job including raw AI-extracted PII (S9), and (with `/results/department/:id`) read any department's results by passing an arbitrary `departmentId`.
- A **Dean** can read any department's data in *any* faculty via `GET /reports/department/:id` and `/results/department/:id` (faculty check only on some routes).

---

## 11. Roles & Permissions Audit

### 11.1 Current roles (enum `UserRole`)

| Role | Can do today (per routes) | Dept/Faculty scoping |
|---|---|---|
| **HOD** | Create/update/delete students, courses, results, scores; calculate GPAs; upload+review; submit/approve batches; reports; audit | Scoped to own dept on most write paths & some reads; **not scoped** on student/course update-delete, result reads |
| **DEAN** | Approve/publish batches; faculty stats; view reports/transcripts | Faculty scoping partial — can read any dept in any faculty via several endpoints |
| **EXAMINATION_OFFICER** | Upload+review; approve batches; audit; submit batches | Not dept-scoped anywhere |
| **LECTURER** | Upload+review; submit batches | Not dept-scoped anywhere |

### 11.2 Problems (CONFIRMED / RECOMMENDATION)

1. **No STUDENT role** — students are data-only entities, cannot log in (biggest role gap).
2. **No SUPER_ADMIN / UNIVERSITY_ADMIN / ACADEMIC_ADVISER / AUDITOR** roles. Registration is the only user-creation path; no user management UI at all.
3. **Roles are not scoped** — a Lecturer/Exam Officer has no department boundary enforced; a Dean's faculty boundary is inconsistently enforced. **This is both a security issue (S5) and a permission-model gap.**
4. **Permissions are hardcoded per-route** (`authorize('HOD')`) rather than derived from a permission model. No separation of "role" vs "permission".
5. **`approval.routes.ts` approve endpoint** checks role inline without `authorize()` — inconsistent enforcement style, and **any authenticated user whose role maps in NEXT_STATUS can approve**; a LECTURER has no entry so is blocked, but the pattern is fragile.
6. **Upload/review routes authorize all 4 roles** equally — a Lecturer can delete/alter any department's upload jobs.
7. Privilege-escalation surface: an attacker who registers (S4) as HOD gains near-total control; token forgery (S3) grants any role.

### 11.3 Recommended RBAC architecture (RECOMMENDATION)
- Introduce `Permission` enum (e.g., `student:create`, `result:read`, `result:write`, `result:approve`, `batch:publish`, `report:read`, `audit:read`, `user:manage`, `department:manage`).
- Join tables: `Role` (system + per-dept), `UserRole` (user, role, departmentId?, facultyId?, institutionId?), `RolePermission`.
- Default seed roles matching the roadmap (Super Admin, University Admin, Faculty Admin, Department Admin, Exam Officer, Lecturer, Academic Adviser, Student, Auditor, Viewer).
- Enforce via a `requirePermission` middleware that resolves the user's effective permission set across their roles + scopes (department/faculty/institution).
- Keep the current `authorize` as a thin role-shortcut over the permission layer during migration.

---

## 12. Frontend / UX Audit

### 12.1 Student experience — as a student, today: **impossible**
Students cannot log in, view results, download transcripts, or see GPA/CGPA. This is the single largest UX gap.

### 12.2 Lecturer / Exam Officer / HOD / Dean experience

| Area | Rating | Notes |
|---|---|---|
| Navigation | ⚠️ | Sidebar is static, shows all items to all roles (no role filtering); `/departments` page is orphaned (no nav link); score entry is split across confusing paths (`/scores` redirects to `/scores/upload`) |
| Dashboard | ⚠️ | Good stat cards + quick links + recent uploads, but **errors silently swallowed** (`.catch(()=>{})`), GPA distribution computed but **not visualized**, no role-specific views |
| Forms | ✅ | `react-hook-form` + Zod; clean, validated; `CourseForm` is dead (page uses inline form) |
| Tables | ✅ | Reusable `Table` component; students list lacks pagination controls (hard 50-cap) |
| Search/Filter | ⚠️ | Student search exists; no server-side pagination UI; courses filter by level/semester; no date-range filters on audit/reports |
| Error messages | ⚠️ | Toasts used; many fetches swallow errors silently → blank pages |
| Empty states | ⚠️ | Some tables have emptyMessage; several pages have no empty/loading handling |
| Loading states | ⚠️ | Buttons have isLoading; pages mostly rely on fetch + render (no skeletons) |
| Mobile responsiveness | ⚠️ | Tailwind responsive in layout; review center + approval likely cramped on mobile; not tested |
| Accessibility | ⚠️ | Modal uses Headless UI (good); no ARIA audit, no keyboard-nav test, no focus management; color contrast unverified |
| Consistency | ⚠️ | Mixed patterns: inline forms vs components; raw `api.post` in signup vs `authApi` elsewhere; `sendSuccess` vs raw `res.json` on backend |

### 12.3 Specific UX bugs
- `cgpa/page.tsx` shows `undefined` for student name (B4).
- `students/new` and `courses` forms have no proper back/cancel semantics everywhere.
- Review center: no undo for "Accept All"; no way to see already-committed vs pending clearly.
- Approval page uses `as any` and mixes form fields loosely.
- No confirmation/guard before destructive actions on student/course/result deletion (only `confirm()` in courses page).
- No printable result sheet or "result slip" for students (transcript exists for HOD/Dean only).

---

## 13. Backend / API Audit

### 13.1 Endpoint inventory & evaluation (key endpoints)

| Endpoint | Auth | Authoriz. | Validation | Error handling | Notes |
|---|---|---|---|---|---|
| `POST /auth/login` | Public | — | Zod | OK | No rate limit (S7) |
| `POST /auth/register` `/signup` | Public | — | Zod | OK | CRITICAL open (S4); B1 role mismatch |
| `GET /auth/profile` | ✅ | — | — | OK | Fine |
| `POST /auth/change-password` | ✅ | — | Zod | OK | No reset flow |
| `POST /students` | ✅ | HOD | Zod | OK | Dept forced for HOD; DEAN can create into any dept |
| `GET /students` | ✅ | HOD/DEAN | — | OK | Pagination; HOD-scoped; DEAN unscoped |
| `GET /students/:id` | ✅ | — | — | OK | **IDOR**: no dept check beyond HOD-only check in controller |
| `PUT/DELETE /students/:id` | ✅ | HOD | Zod | OK | **Not dept-scoped** (B9) |
| `POST /courses` | ✅ | HOD | Zod | OK | HOD forced dept |
| `PUT/DELETE /courses/:id` | ✅ | HOD | Zod | OK | **Not dept-scoped** (B9) |
| `POST /results/scores` | ✅ | HOD | Zod (bulk) | OK | N+1; ND/HND rejected (B3); unused by UI |
| `POST /results/add` | ✅ | HOD | Zod inline | OK | Uses `req.user.departmentId!` (B7); unused by UI |
| `GET /results/student/:id` | ✅ | — | — | OK | **IDOR** (S5) |
| `GET /results/department/:id` | ✅ | — | — | OK | **Cross-dept read** (S5) |
| `GET /results/carryovers/:id` | ✅ | — | — | OK | **IDOR** (S5) |
| `PUT /results/:id` / `DELETE /results/:id` | ✅ | HOD | Zod | OK | Dept-scoped in service; no audit log for score change |
| `POST /gpa/calculate` | ✅ | HOD | Zod | OK | Forces nothing — takes arbitrary studentId |
| `GET /gpa/student/:id/history` | ✅ | — | — | OK | **IDOR** (S5) |
| `GET /gpa/department/:id/stats` | ✅ | — | — | OK | Cross-dept (S5) |
| `GET /gpa/student/:id/explain` | ✅ | — | — | OK | No caching; cross-dept |
| `GET /reports/dashboard` | ✅ | — | — | OK | Broken groupBy (B6); HOD-scoped |
| `GET /reports/department/:id` + `/pdf` | ✅ | — | — | OK | Cross-dept (S5); N+1 (M) |
| `GET /reports/transcript/:id` + `/pdf` | ✅ | — | — | OK | **IDOR** (S5) |
| `GET /reports/faculty` | ✅ | DEAN | — | OK | Faculty-scoped correctly |
| `POST /departments/public` / `DELETE /departments/public/:id` | ❌ **none** | — | — | — | CRITICAL (S2) |
| `POST /upload` (SSE) | ✅ | all 4 | partial | Partial | No concurrency limit; writes pre-approval (S6); ownership gap on GET |
| `GET /upload/:jobId` | ✅ | all 4 | — | — | No ownership check (S9) |
| `PATCH /review/:itemId` / `POST /review/:jobId/approve-all` | ✅ | all 4 | partial | OK | No ownership check; no undo |
| `POST /approval` | ✅ | LEC/HOD/EXO | partial | OK | No check that batch has results |
| `POST /approval/:id/approve` | ✅ | inline role check | — | OK | Inconsistent RBAC style; **no dept scoping for EXO/DEAN** |
| `POST /approval/:id/publish` | ✅ | DEAN/HOD | — | OK | HOD can publish without full chain check edge cases |
| `GET /audit` + by entity | ✅ | HOD/DEAN/EXO | — | OK | No date/action filter; no export |

### 13.2 Backend structural issues (CONFIRMED)
- **Business logic in wrong layer:** `gpa.routes.ts` `/explain` embeds DB queries + GPA math directly in the route (bypasses service/controller). `report.routes.ts` dashboard embeds aggregation in the route. `upload.routes.ts` and `review.routes.ts` embed DB writes in routes. **Fat-routes problem.**
- **Inconsistent validation:** middleware uses `schema.parse` (throws), controllers sometimes `safeParse`; some endpoints (approval, upload, review) have only hand-rolled checks.
- **Inconsistent responses:** some controllers use `res.status(403).json(...)` directly (e.g., `department.controller.findById`, `student.controller.findById`) instead of `sendForbidden`.
- **Duplicate logic:** result upsert + GPA recalc logic is duplicated across `result.service.enterScores/addSingleScore/updateResult` and `validation.tools.saveResult` — 4 implementations of the same write path.
- **No pagination** on courses list, department results, department reports, GPA history, transcript — unbounded queries.
- **No filtering** on audit log by date/action/user; no search on results.
- **No rate limiting** anywhere.
- **No request logging/structured logs/correlation IDs** (morgan only, console-based).
- **No API versioning** (`/api` not `/api/v1`), no OpenAPI/Swagger docs.

---

## 14. Performance Audit

### 14.1 Known hot spots (CONFIRMED)
| # | Issue | Location | Grows with |
|---|---|---|---|
| P1 | N+1: `enterScores` → per-score course lookup | `result.service.ts:30` | #students × #courses |
| P2 | N+1: `calculateDepartmentGPAs` sequential recalcs | `gpa.service.ts:214-221` | #students |
| P3 | In-memory filter O(n·m) in report | `report.service.ts:122` | #students × #gpa-records |
| P4 | Unbounded queries: department results, transcripts, course lists | several | dataset size |
| P5 | `rawRecords` JSON bloat in `upload_jobs` | `upload.service.ts:187` | upload volume |
| P6 | In-memory multer (20MB) — OOM risk under concurrency | `upload.middleware.ts:7` | concurrent uploads |
| P7 | Sequential AI validation loop (one-by-one tool calls) | `gemini.ts` agentic loop | #records |
| P8 | `semesterGPA.groupBy` on Float (broken + heavy) | `report.routes.ts:46` | dataset size |

### 14.2 Scaling forecast (CONFIRMED reasoning)
- **100 students:** fine.
- **1,000 students / 10k results:** `enterScores` and department report start to lag (10k+ sequential queries, O(n·m) filter); GPA bulk recalc minutes. Still "works".
- **10,000 students / 100k results:** N+1 paths time out; in-memory multer risks OOM with a few concurrent uploads; dashboard `groupBy` is meaningless; report generation seconds→minutes; no pagination → UI hangs.
- **100,000+ students:** Requires indexed aggregation, batch/parallel recalcs, Redis caching for stats, paginated everything, background job processing, and offload of upload buffering to disk/object storage. None of this exists.

---

## 15. Testing Audit

**Status: BROKEN.**

- Single test file: `backend/src/__tests__/bulk.test.ts` (234 lines).
- Tests target `/api/bulk/students`, `/api/bulk/scores`, `/api/bulk/students/template`, `/api/bulk/scores/template` — **none exist** (removed when the AI pipeline replaced bulk routes).
- Test user password `'$2a$10$test'` is not a valid bcrypt hash — login would fail regardless.
- No test DB isolation strategy documented; tests mutate a shared DB and rely on `afterAll` cleanup.
- **Zero tests** for the most critical logic: GPA/CGPA math (`grading.ts`), grading edge cases, result upsert/recalc, auth (login/register/roles), authorization scoping (IDOR), department/faculty scoping, approval workflow transitions, AI pipeline stages.

### Recommended testing strategy (RECOMMENDATION)
1. **Unit tests (priority 1):** `grading.ts` — full boundary matrix (39, 40, 44, 45, 49, 50, 59, 60, 69, 70, 99, 100, 0, -1, 101), carryover, zero-unit, empty, rounding, CGPA across semesters, class-of-degree bands. This is the single most important test suite (real-world consequences).
2. **Auth/RBAC tests (priority 1):** login success/fail, inactive user, token expiry, forged token with default secret, each role × each route, cross-department access denied.
3. **Service integration tests** against a dedicated test Postgres (or SQLite-compatible in-memory), not the dev DB.
4. **API tests (Supertest)** for each endpoint with auth/validation/error assertions, using the current routes.
5. **AI pipeline tests** with mocked Gemini/Groq (deterministic fixtures) — extraction parsing, validation tool dispatch, `saveResult` write gating.
6. **Frontend:** at minimum component tests for forms + AuthContext; keep light.
7. CI gate: `npm run test` must pass before merge (requires fixing tests first).

---

## 16. Documentation Audit

| Doc | Exists? | Quality | Notes |
|---|---|---|---|
| README | ✅ but wrong | **Planning doc** (AcadMind AI implementation plan), not usage/setup docs | No install, env vars, run instructions beyond `START_SERVERS.md` (2 commands), no API overview |
| Architecture docs | ❌ | — | None (this audit + `docs/audit/ARCHITECTURE.md` will start one) |
| API docs | ❌ | — | No OpenAPI/Swagger; code JSDoc comments only |
| Database docs | ❌ | — | Schema comments exist inline; no ER doc |
| Deployment docs | ❌ | — | None (Render mention in commit messages only) |
| Env var docs | ⚠️ | `.env.example` lists keys with a few comments; no required-vs-optional matrix, no formats |
| Admin/user docs | ❌ | — | None |
| Contribution/testing docs | ❌ | — | None |

A fresh developer **cannot** run this project from the README alone — no step-by-step install, no Prisma migration/bootstrap guidance, no demo-account info.

---

## 17. Deployment / Production Audit

**Status: NOT PRODUCTION READY.**

| Area | Status | Findings |
|---|---|---|
| Environment config | ⚠️ | `.env.example` exists; no startup validation of required vars; insecure JWT fallback (S3) |
| Secrets management | ❌ | `creds.txt` with plaintext DB password in git (S1); no secret manager |
| Deployment process | ❌ | No Dockerfile, no compose, no deploy scripts, no Render config in repo |
| Database migrations | ⚠️ | Prisma migrate present; no CI-driven `migrate deploy`; seed deletes all data; no backup-before-migrate |
| Backups | ❌ | None documented; no retention/restore test |
| Logging | ⚠️ | morgan + console only; no structured logs, no correlation IDs, no log shipping |
| Monitoring | ❌ | None (no metrics, no uptime checks) |
| Error tracking | ❌ | None (no Sentry etc.) |
| Health checks | ⚠️ | `/api/health` is static JSON — doesn't ping DB or check AI quota |
| CI/CD | ❌ | None |
| Rollbacks | ❌ | None (schema-only migration revert; no image/version rollback) |
| Security config | ❌ | CRITICALs S1–S4 unresolved; no rate limiting; localStorage tokens; no CSP |
| Disaster recovery | ❌ | None documented |

---

## 18. Multi-Department Readiness

### 18.1 Verdict
The current system is designed around **one faculty (Basic Medical Sciences) with 10 departments**, all seeded by one script. It is **not ready** for other departments/faculties/institutions without developer intervention. It is *marginally* multi-department within one faculty (dept-scoping exists on some paths) but has hardcoded single-institution, single-scale assumptions throughout.

### 18.2 Where single-department/institution assumptions are hardcoded (CONFIRMED)
1. **No Institution/University entity** — no `institutionId` anywhere (schema.prisma). Two universities cannot share the platform.
2. **Department.code globally unique** — blocks cross-faculty reuse of common codes.
3. **Grading scale hardcoded** in `grading.ts` — a new department with a different pass mark/scale cannot configure grading (only `passMark` is per-dept).
4. **Level enum is a fixed union** (ND/HND/100–500) — can't add DIP, 600-level, etc., without migration.
5. **Class-of-degree bands hardcoded** — some institutions use different bands.
6. **Academic session as free-text `academicYear` string** — no session/term/calendar entities; no "current session" concept.
7. **No Program entity** — programs are conflated with levels.
8. **Roles are global and not per-department** — a Lecturer can't be scoped to multiple departments; no per-dept administrators.
9. **Registration is global & public** — no per-institution onboarding/admin.
10. **Reports/PDFs are single-faculty/university generic** — no university branding, no per-institution header.
11. **Seed data is HIM/BMS-specific** — `prisma/seed.ts` hardcodes one faculty + 10 depts + HIM courses.
12. **Department-level admin flows absent** — no faculty CRUD, no department update, no "new department self-configures" flow.
13. **GPA/AI validation tools are department-code driven** but `resolveStudent` ignores department (B-adjacent) and there's no institution scope.
14. **Upload/approval are dept-scoped but not institution-scoped** — IDs are globally unique cuid so cross-institution collision is not possible, but authorization scoping doesn't enforce institution boundaries.

### 18.3 What must change for multi-department/institution readiness (RECOMMENDATION)
- Introduce `Institution` model; add `institutionId` FK to `Faculty`, `User`, `Student` (via dept), `Course` (via dept), `ResultBatch`, `UploadJob`.
- Change `Department.code` unique → `@@unique([code, facultyId])` (or include institution).
- Add `Program` + `AcademicSession` + `AcademicCalendar` models.
- Refactor grading into configurable `GradingScale`/`GradingPolicy` (per dept or institution, with defaults).
- Replace fixed `Level` enum with a `Level` table (or add institution-configurable levels).
- Introduce per-institution RBAC (Section 11.3) with scoped roles.
- Build an onboarding/self-config flow so a new department can set up itself (faculty, dept, programs, levels, grading scale, session, HOD, courses) without code changes.
- Store GPA/results with institution-scoped unique constraints.

---

## 19. Missing Features

See the full table in `docs/audit/FEATURE_GAPS.md`. Summary of the most significant gaps:

| Feature | Priority | Current state |
|---|---|---|
| Student self-service portal (login, results, GPA/CGPA, transcripts) | P0 | **Entirely missing** — students have no system access |
| User management (admin: list/create/deactivate/reset) | P0 | Missing |
| Result correction workflow with history/approval | P0 | Missing (in-place overwrite, no audit on score changes) |
| Faculty & Institution management CRUD | P1 | Missing (faculty seed-only; no institution) |
| Department update + delete guards | P1 | Missing |
| Pagination everywhere (students/courses/results/audit/reports) | P1 | Partial |
| Notifications (email/in-app) for approvals & publication | P1 | Missing |
| Carryover/at-risk tracking UI | P1 | Backend only |
| Bulk level promotion workflow | P1 | Component exists, never wired |
| Result approval gating (don't write until approved) | P0 | Missing (integrity) |
| CSV/Excel export (students/results/audit/reports) | P2 | Missing |
| Result verification/printable result slips | P2 | Missing |
| Course allocation / lecturer workload | P2 | Missing |
| Attendance, scheduling, assignments | P3 | Missing (out of core scope) |

---

## 20. Features That Could Drive Adoption

Why would another department choose this over Excel? The current value prop is strong on **result collection**, weak elsewhere.

| Feature | User value | Business value | Complexity | Adoption impact | Priority |
|---|---|---|---|---|---|
| AI upload + human review (existing) | High | High | Already built | **Primary hook** | Keep/perfect |
| Student self-service portal | Very high | High | Med | **Major** | P0 |
| Result approval workflow (existing, needs gating) | High | High | Low–Med | High | P0/P1 |
| Configurable grading per department | High | High | Med | **Adoption enabler** | P1 |
| Transcript + printable result slips | High | Med | Low | High | P1 |
| Carryover & graduation-eligibility tracking | High | High | Med | High | P1 |
| Department/faculty analytics dashboards | Med | Med | Med | Med | P2 |
| Bulk Excel import (non-AI, fast path) | Med | Med | Low | Med | P2 |
| Notifications/email | Med | Med | Low–Med | Med | P1 |
| At-risk student identification | High | High | Med | High | P2 |

---

## 21. Technical Debt

Full breakdown in `docs/audit/TECHNICAL_DEBT.md`. Headline items:

### Must Fix (correctness/security/data-loss)
- S1 plaintext DB password in git
- S2 public dept write/delete (data-loss vector)
- S3 default JWT secret
- S4 open HOD registration
- S5 cross-tenant data reads (IDOR)
- S6 results written before approval
- B3 ND/HND levels rejected in bulk entry
- B4 cgpa page shows undefined
- B2 broken tests
- P0: no audit log on result mutations

### Should Fix (architecture/usability)
- P1/P2/P4 N+1 + unbounded queries
- B9 missing dept scoping on updates
- S9 upload/review ownership checks
- Fat routes (logic in routes)
- Duplicate result-write logic (4 copies)
- GPA snapshot drift + non-configurable engine
- No user management
- No pagination

### Nice to Have
- API versioning + OpenAPI
- Structured logging / correlation IDs / monitoring
- Docker + CI/CD
- CSRF, CSP
- Excel/CSV export, branding on PDFs
- Dead-code cleanup (frontend bulk methods, useFetch, CourseForm, BulkLevelUpdate, chart.js, Supabase env vars)

---

## 22. Overall Score

| Dimension | Score /100 | Justification |
|---|---|---|
| Architecture | 58 | Clean controller→service layering, good schema; but fat routes, duplicated write logic, mixed patterns |
| Code quality | 55 | Generally readable TS, strict mode; but dead code, inconsistent validation/responses, type mismatches |
| Security | 18 | 4 CRITICALs + several HIGHs; cannot be trusted with real data today |
| Database design | 60 | Solid relational core, good constraints/indexes; but no institution/program/session, no result history, no soft-delete |
| GPA correctness | 70 | Math correct for one scale; not configurable, drift risk, no repeat/carryover rules |
| UX | 35 | Good UI primitives & AI review UX; no student access, silent errors, no pagination, broken CGPA page |
| Performance | 40 | Fine at demo scale; N+1 + unbounded queries + in-memory uploads break at ~1k–10k students |
| Testing | 10 | One broken test file; zero coverage of GPA/auth/scoping |
| Documentation | 20 | README is a plan, not docs; no API/deploy/admin docs |
| Scalability | 35 | No background jobs, caching, pagination strategy, or batch aggregation |
| Multi-dept readiness | 25 | Single institution/scale hardcoded; needs institution/program/config-grading/role work |
| Production readiness | 15 | Blocked by CRITICALs; no CI/CD, Docker, backups, monitoring, secret mgmt |
| Product value | 60 | Differentiating AI pipeline; but missing student portal & admin tooling limit value |
| **Overall** | **42** | Promising demo; not a deployable product yet |

---

## 23. Priority Matrix

| Priority | Items |
|---|---|
| **P0 (Critical)** | S1–S4 security fixes; S5 access-control fix; S6 result-write gating; B2 test fix (GPA/auth tests); B4 cgpa bug; B3 ND/HND levels; audit log on result mutations; delete `creds.txt` + rotate DB password |
| **P1 (High)** | Configurable grading engine (GradingScale/Policy); Student portal (auth+results+transcript); User management; S7 rate limiting; S9 ownership checks; P1/P4 query fixes; pagination; approval gating tied to batch; result-change history; faculty/institution CRUD; RBAC permission model; notifications |
| **P2 (Medium)** | Dashboard analytics (real distribution charts); carryover/at-risk UI; bulk promotion wiring; Excel/CSV export; API versioning + OpenAPI; structured logging; Docker + CI/CD; dept self-config onboarding; soft-delete; indexes |
| **P3 (Low)** | PDF branding/watermarks; accessibility pass; PWA/mobile polish; attendance/scheduling; multilingual; parent portal; dead-code cleanup |

---

## 24. Recommended Roadmap

Detailed plan in `docs/audit/ROADMAP.md`. Summary:

### PHASE 0 — Stabilization (P0; ~1–2 weeks)
1. Delete `creds.txt`, rotate DB password, gitignore + history scrub.
2. Lock JWT secret (fail-fast) — S3.
3. Protect `/departments/public` writes; remove public signup or admin-gate it — S2/S4.
4. Fix B1 (register schema) — if public signup stays temporarily, at least align HOD/DEAN.
5. Enforce dept/faculty scoping on all read endpoints (S5) — quickest win: a `scopeToUser` guard.
6. Stop pre-approval writes: make AI `saveResult` stage instead of persist (S6).
7. Add audit logging to all result mutations (P0).
8. Fix B3/B4/B5/B6 bugs.
9. Rebuild test infra: unit tests for `grading.ts` + auth + a passing smoke suite.

### PHASE 1 — Foundation (P1; ~3–4 weeks)
10. Configurable `GradingScale`/`GradingPolicy` + refactor `grading.ts` to be pure & tested.
11. `Institution`, `Program`, `AcademicSession` models + `institutionId` scoping migration.
12. RBAC: `Permission` + `Role`/`UserRole` join tables; `requirePermission` middleware; migrate `authorize`.
13. Result history (`ResultVersion`) + correction workflow.
14. Rate limiting + upload concurrency caps; httpOnly cookie or refresh-token auth.
15. Query fixes: batch course lookups, parallel recalcs, Map grouping, indexes, pagination everywhere.

### PHASE 2 — Core Product (P1/P2; ~3–5 weeks)
16. Student self-service portal (login, results, GPA/CGPA history, transcript download, carryovers).
17. User management admin UI (create/deactivate/reset, role assignment).
18. Faculty/institution/department admin CRUD + onboarding self-config flow.
19. Result batch approval gating tied to actual writes; batch contents validation.
20. Notifications (in-app + email) for approvals/publication.
21. Carryover/at-risk & graduation-eligibility views; bulk promotion wiring.

### PHASE 3 — Multi-Department Architecture (P2; ~3–4 weeks)
22. Remove hardcoded single-faculty assumptions from seed/onboarding; dept self-config (levels, grading scale, session, HOD, courses).
23. Configurable academic calendars/sessions; current-session tracking.
24. Cross-department/faculty analytics with real distribution bucketing.
25. Course allocation / lecturer workload model (course assignments per dept).

### PHASE 4 — Product Differentiation (P2/P3)
26. Bulk Excel/CSV import (non-AI fast path) + export everywhere.
27. Result verification/printable slips, branded PDFs.
28. At-risk analytics, department performance trends.
29. Audit-log explorer with filters/export.

### PHASE 5 — Production Readiness (P2/P3; ongoing)
30. Docker + docker-compose, CI/CD (lint→typecheck→test→build→migrate→deploy), backups & DR test, monitoring + error tracking (Sentry), structured logging + correlation IDs, health checks with DB/AI ping, security headers/CSP, secrets manager, load test at 10k/100k scale, OpenAPI docs.

**Dependencies:** Phase 0 before anything else. Phase 1 before Phase 3 (schema/RBAC). Student portal (2.16) depends on RBAC + scoping. AI staging (0.6) before approval gating (2.19).

---

## 25. Top 10 Actions We Should Take First

1. **Remove the committed database password** (`creds.txt`), rotate the DB password, gitignore it, and scrub git history if the repo is public. (S1)
2. **Fail fast on missing `JWT_SECRET`** and remove the hardcoded default. (S3)
3. **Protect `/api/departments/public` POST/DELETE** behind authentication (and restrict delete to DEAN). (S2)
4. **Lock down registration** — remove public `/signup`/`/register` or gate behind an authenticated administrator, and align the HOD/DEAN role schema bug. (S4, B1)
5. **Enforce department/faculty scoping on every read of results, students, GPAs, and transcripts** so no user can view another department's data. (S5)
6. **Stop persisting results during AI validation** — stage records and only write after human approval, in a transaction. (S6)
7. **Add audit logging to all result create/update/delete** and stop in-place overwrite (start result history). (P0)
8. **Fix the broken test suite**, starting with comprehensive unit tests for the GPA engine (`grading.ts`) and auth/authorization. (B2)
9. **Fix the known correctness bugs** — ND/HND levels in bulk entry, the CGPA page `undefined` name, dashboard GPA distribution, department-scoped updates. (B3, B4, B6, B9)
10. **Add rate limiting** on auth and upload, and cap concurrent AI jobs, before any real deployment. (S7)

---

## Appendix: Prior-audit discrepancies corrected

| Prior audit claim | Actual finding |
|---|---|
| "Password-stripping in `auth.service.ts` is fatally flawed / password leaked" | **Incorrect.** `const { password: _, ...userWithoutPassword } = user` correctly removes `password`. No leak. |
| "`recalculateAllStudentGPA` pattern ensures data consistency" | **Does not exist** in the codebase; GPA recalc is on specific write paths only, and can drift. |
| "14 models including `GPAExplanation`" | Current schema has **14 models but no `GPAExplanation`**; the `explain` endpoint computes from `results` directly. |
| "Bulk routes exist under `/students/bulk-upload`" | Frontend references them; **backend has no such routes** — they are dead frontend code (confirmed). |
| "Login exposes password" (implied by leak claim) | Not confirmed; login returns `userWithoutPassword` correctly. |

---

*End of main audit. Supporting documents in `docs/audit/` provide deep dives: [ARCHITECTURE](audit/ARCHITECTURE.md) · [SECURITY](audit/SECURITY.md) · [DATABASE](audit/DATABASE.md) · [GPA_LOGIC](audit/GPA_LOGIC.md) · [UX](audit/UX.md) · [FEATURE_GAPS](audit/FEATURE_GAPS.md) · [MULTI_DEPARTMENT](audit/MULTI_DEPARTMENT.md) · [TECHNICAL_DEBT](audit/TECHNICAL_DEBT.md) · [ROADMAP](audit/ROADMAP.md).*
