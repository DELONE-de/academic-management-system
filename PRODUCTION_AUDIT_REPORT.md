# AcadMind AI — Production Readiness Audit Report

**Audit Date:** September 1, 2026
**Auditor:** Code Audit Agent
**Project:** AcadMind AI — Academic Management System (GPA/CGPA)
**Codebase Path:** `academic-management-system/`
**Overall Health Score: 42 / 100**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Codebase Inventory](#1-codebase-inventory)
3. [Production Readiness Findings](#2-production-readiness-findings)
4. [Feature Audit](#3-feature-audit)
5. [User Persona & Suggested Features](#4-user-persona--suggested-features)
6. [Prioritized Roadmap](#5-prioritized-roadmap)
7. [Architectural Strengths](#6-architectural-strengths-to-preserve)
8. [Known Bugs](#7-known-bugs)

---

## Executive Summary

AcadMind AI is a GPA/CGPA management system designed for Nigerian universities. It features an innovative AI-powered document upload pipeline that uses Gemini 2.0 Flash (with Groq as fallback) to extract student records and scores from Excel, CSV, PDF, and image files, validate them through function-calling tools, and route flagged issues through a human-in-the-loop review center before persisting to the database. The grading system follows the Nigerian 5-point scale.

**Strengths:** The application demonstrates strong domain modeling (14 Prisma models, 7 enums), a well-designed AI upload pipeline with dual-provider fallback, comprehensive audit logging, and a multi-role approval workflow. The service layer separation (controllers → services → Prisma) is clean and maintainable.

**Critical Gaps:** The project has multiple critical security vulnerabilities that must be resolved before any production deployment, including a plaintext database password committed to version control, unauthenticated write/delete endpoints, an insecure JWT secret fallback, and open self-registration. The test suite is broken, there is no CI/CD pipeline, no Docker configuration, and student self-service (a core user need) is entirely absent.

### Top 5 Critical Issues

1. **Plaintext database password committed to git** — `creds.txt` contains `Adeoluwa@2007$` in plain text
2. **Unauthenticated write/delete endpoints** — `POST /api/departments/public` and `DELETE /api/departments/public/:id` are fully public, allowing anyone to create or destroy departments
3. **JWT secret has insecure fallback** — `'default-secret-change-in-production'` is used when `JWT_SECRET` env var is missing, allowing token forgery
4. **Open self-registration** — `POST /api/auth/register` is publicly accessible, allowing anyone to create HOD accounts
5. **JWT stored in localStorage** — Frontend stores auth tokens in `localStorage`, making them vulnerable to XSS theft

---

## 1. Codebase Inventory

### 1.1 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend Runtime | Node.js + Express.js | 4.18.2 |
| Backend Language | TypeScript | 5.3.3 |
| ORM | Prisma | 5.7.0 |
| Database | PostgreSQL (Supabase) | — |
| Frontend Framework | Next.js | 14.2.35 |
| Frontend Library | React | 18 |
| Styling | Tailwind CSS | 3.4.19 |
| Charts | Chart.js + react-chartjs-2 | 4.5.1 |
| Forms | react-hook-form + Zod | 7.72.1 |
| HTTP Client | Axios | 1.15.0 |
| Primary AI | Google Gemini 2.0 Flash | — |
| Fallback AI | Groq llama-3.3-70b-versatile | — |
| Auth | JWT (jsonwebtoken) + bcryptjs | — |
| File Upload | Multer (memory storage) | — |
| Excel Processing | SheetJS (xlsx) | 0.18.5 |
| PDF Parsing | pdf-parse | 2.4.5 |
| PDF Generation | PDFKit | 0.14.0 |
| Testing | Jest + Supertest | 29.7.0 |

### 1.2 Project Structure

```
academic-management-system/
├── backend/
│   ├── src/
│   │   ├── ai/                    # AI integration (Gemini, Groq, validation tools)
│   │   │   ├── gemini.ts          # 361 lines — primary AI extraction + validation
│   │   │   ├── groq.ts            # 227 lines — fallback AI provider
│   │   │   └── validation.tools.ts # 420 lines — tool dispatchers for AI function calls
│   │   ├── config/
│   │   │   ├── database.ts        # 52 lines — Prisma singleton + connection management
│   │   │   └── jwt.ts             # 45 lines — JWT sign/verify/extract
│   │   ├── controllers/           # 6 files — request handlers
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts  # 149 lines — JWT auth + RBAC + dept/faculty access
│   │   │   ├── error.middleware.ts # 57 lines — global error handler
│   │   │   ├── upload.middleware.ts # 95 lines — Multer config with MIME validation
│   │   │   └── validation.middleware.ts # 74 lines — Zod schema validation
│   │   ├── routes/                # 11 route files
│   │   ├── services/              # 8 service files (business logic)
│   │   ├── types/index.ts         # 277 lines — shared TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── grading.ts         # 156 lines — Nigerian 5-point grading scale
│   │   │   ├── file-extractor.ts  # 59 lines — multi-format file content extraction
│   │   │   ├── pdf-generator.ts   # 316 lines — PDFKit transcript/report generation
│   │   │   ├── excel.ts           # 277 lines — Excel parsing + template generation
│   │   │   └── response.ts        # API response helpers
│   │   ├── validators/            # 5 validator files (Zod schemas)
│   │   ├── __tests__/bulk.test.ts # 234 lines — only test file
│   │   └── app.ts                 # 136 lines — Express entry point
│   ├── prisma/
│   │   ├── schema.prisma          # 373 lines — 14 models, 7 enums
│   │   ├── seed.ts                # 632 lines — faculty, departments, courses, students
│   │   └── migrations/            # 2 migration files
│   ├── scripts/                   # 3 demo/test data generation scripts
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.cjs
│   └── .env.example               # 24 lines
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/            # login, signup pages
│   │   │   ├── (dashboard)/       # 14+ dashboard pages
│   │   │   └── layout.tsx         # root layout
│   │   ├── components/
│   │   │   ├── ui/                # 8 reusable UI components
│   │   │   ├── layout/            # Header, Sidebar, DashboardLayout
│   │   │   └── forms/             # StudentForm, CourseForm, BulkLevelUpdate
│   │   ├── context/AuthContext.tsx # 110 lines — auth state management
│   │   ├── hooks/                 # useAuth, useFetch
│   │   ├── lib/
│   │   │   ├── api.ts             # 360 lines — all API client methods
│   │   │   └── utils.ts           # formatting, classnames
│   │   └── types/index.ts         # 186 lines — frontend TypeScript types
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── .env.example               # 3 lines
├── creds.txt                      # ⚠️ PLAINTEXT DB PASSWORD
├── README.md                      # Implementation plan document
└── START_SERVERS.md               # Dev server startup instructions
```

### 1.3 Database Schema (Prisma)

**14 Models:**

| Model | Purpose | Key Relationships |
|---|---|---|
| `Faculty` | Top-level academic unit | Has many Departments, Users (Dean) |
| `Department` | Academic department within faculty | Belongs to Faculty; has Students, Courses, Users (HOD), UploadJobs, ResultBatches |
| `User` | System user accounts with role | Linked to Department (HOD) or Faculty (Dean); has UploadJobs, ReviewItems, AuditLogs |
| `Student` | Student academic record | Belongs to Department; has Results, SemesterGPAs |
| `Course` | Course offered in a department | Belongs to Department; has Results |
| `Result` | Individual course grade for a student | Belongs to Student + Course; unique on (studentId, courseId, academicYear) |
| `SemesterGPA` | Computed GPA per semester per student | Belongs to Student; unique on (studentId, level, semester, academicYear) |
| `GPAExplanation` | AI-generated GPA explanations | Stores text explanations of GPA calculations |
| `UploadJob` | AI upload pipeline job tracking | Belongs to User (uploader) + Department; has ReviewItems |
| `ReviewItem` | Flagged record from AI pipeline | Belongs to UploadJob; resolved by User |
| `ResultBatch` | Group of results for approval workflow | Belongs to Department + User (submitter); has BatchApprovals |
| `BatchApproval` | Approval step in the chain | Belongs to ResultBatch + User (approver) |
| `AuditLog` | Append-only activity log | Belongs to User (actor); indexed on (entityType, entityId) |

**7 Enums:** `UserRole` (HOD, DEAN, LECTURER, EXAMINATION_OFFICER), `Semester` (FIRST, SECOND), `Level` (ND1, ND2, HND1, HND2, LEVEL_100-500), `Grade` (A-F), `UploadStatus` (PENDING, PROCESSING, NEEDS_REVIEW, APPROVED, REJECTED), `ApprovalStatus` (DRAFT, SUBMITTED, APPROVED_BY_EXAM_OFFICER, APPROVED_BY_HOD, APPROVED_BY_DEAN, REJECTED, PUBLISHED), `AuditAction` (9 action types).

### 1.4 API Routes

| Group | Routes | Auth | Description |
|---|---|---|---|
| `/api/health` | `GET /` | Public | Health check with feature flags |
| `/api/auth` | `POST /login`, `POST /register`, `POST /signup`, `GET /profile`, `POST /change-password` | Mixed | Authentication |
| `/api/students` | `POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /department/:deptId/level/:level`, `PATCH /bulk-update-level`, `GET /bulk-upload/template` | Authenticated | Student CRUD + bulk |
| `/api/courses` | `POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /department/:deptId/level/:level/semester/:semester` | Authenticated | Course CRUD |
| `/api/results` | `POST /scores`, `POST /add`, `DELETE /delete/:resultId`, `GET /bulk-upload/template`, `GET /student/:studentId`, `GET /student/:studentId/with-gpa`, `GET /department/:deptId`, `PUT /:id`, `DELETE /:id`, `GET /carryovers/:studentId` | Authenticated | Score management |
| `/api/gpa` | `POST /calculate`, `GET /student/:studentId`, `GET /student/:studentId/history`, `POST /calculate-department`, `GET /department/:deptId/stats`, `GET /student/:studentId/explain` | Authenticated | GPA operations |
| `/api/reports` | `GET /dashboard`, `GET /department/:deptId`, `GET /department/:deptId/pdf`, `GET /faculty`, `GET /transcript/:studentId`, `GET /transcript/:studentId/pdf` | Authenticated | Reporting |
| `/api/departments` | `GET /public`, **`POST /public`**, **`DELETE /public/:id`**, `GET /`, `GET /my-department`, `GET /:id` | Mixed (⚠️ POST/DELETE public) | Department management |
| `/api/upload` | `POST /` (SSE), `GET /`, `GET /:jobId`, `GET /:jobId/stream` | Authenticated | AI upload pipeline |
| `/api/review` | `GET /:jobId`, `PATCH /:itemId`, `POST /:jobId/approve-all` | Authenticated | Human review center |
| `/api/approval` | `GET /`, `POST /`, `POST /:batchId/approve`, `POST /:batchId/reject`, `POST /:batchId/publish` | Authenticated | Approval workflow |
| `/api/audit` | `GET /`, `GET /:entityType/:entityId` | Authenticated | Audit log queries |

---

## 2. Production Readiness Findings

### CRITICAL — Must fix before any deployment

| # | Finding | Location | Description | Recommended Fix |
|---|---|---|---|---|
| C1 | **Plaintext DB password in version control** | `creds.txt:1` | Contains `db passwd:Adeoluwa@2007$` committed to git repository. Anyone with repo access has database credentials. | Delete the file immediately, rotate the database password, add `creds.txt` to `.gitignore`, scan git history and consider repo rotation if repo is public. |
| C2 | **Unauthenticated department write/delete** | `department.routes.ts:15-16` | `POST /api/departments/public` and `DELETE /api/departments/public/:id` have no authentication middleware. Any anonymous user can create or delete departments. | Move behind `authenticate` middleware + `authorize('DEAN')`. Only the `GET /public` endpoint should remain unauthenticated (for signup form). |
| C3 | **JWT secret has insecure fallback** | `jwt.ts:7` | `const JWT_SECRET = process.env.JWT_SECRET \|\| 'default-secret-change-in-production'` — if the env var is unset, the server silently uses a well-known default secret, allowing any attacker to forge valid JWT tokens. | Replace with: `if (!process.env.JWT_SECRET) { throw new Error('JWT_SECRET must be set'); }` and fail startup if missing. |
| C4 | **Open self-registration** | `auth.routes.ts:24-25` | `POST /api/auth/register` and `POST /api/auth/signup` are fully public. The comment on line 22 says `"should be protected in production"`. Anyone can create HOD accounts and access the system. | Require `authenticate` + `authorize('DEAN')` on registration endpoints. Remove the public `/signup` route. |
| C5 | **AI pipeline writes directly without transactions** | `validation.tools.ts:362-377` | The `saveResult` function upserts individual `Result` records and then calls `gpaService.calculateSemesterGPA` separately. If the process crashes between result writes and GPA calculation, the data becomes inconsistent. | Wrap the result upserts + GPA recalculation in a Prisma `$transaction`. |
| C6 | **Seed file contains real student names** | `seed.ts:393-619` | The seed script contains what appear to be real Nigerian student names and matriculation numbers (e.g., "Alawode Adebusola Peace", "2024/1813"). This may violate data privacy expectations. | Replace with clearly synthetic/fictional names for all seed data. |

### HIGH — Fix before production launch

| # | Finding | Location | Description | Recommended Fix |
|---|---|---|---|---|
| H1 | **No rate limiting on any endpoint** | `app.ts` (entire file) | No `express-rate-limit` or equivalent. The `/api/auth/login` endpoint is vulnerable to brute-force attacks. The `/api/upload` endpoint could be overwhelmed with concurrent AI processing jobs. | Add rate limiting: 5 req/min on `/auth/login`, 3 concurrent uploads per user, 100 req/min API-wide. |
| H2 | **JWT stored in localStorage** | `api.ts:27`, `AuthContext.tsx:66` | Auth tokens are stored in `localStorage`, making them accessible to any XSS attack. A single XSS vulnerability would expose all user sessions. | Move JWT to `httpOnly`, `Secure`, `SameSite=Strict` cookies. Remove `localStorage` token storage. |
| H3 | **No CSRF protection** | `app.ts` (middleware stack) | State-changing POST/PUT/DELETE requests have no CSRF token validation. Combined with the JWT-in-cookie approach (once fixed), this becomes essential. | Add `csurf` middleware or verify `SameSite=Strict` on auth cookies plus an `Origin`/`Referer` header check. |
| H4 | **File upload accepts `text/plain` as CSV** | `upload.middleware.ts:13` | The MIME type `text/plain` is mapped to the `csv` file type. An attacker can upload an arbitrary `.txt` file disguised as CSV. | Remove `text/plain` from `ALLOWED_MIMES`. Only accept `text/csv` for CSV uploads. |
| H5 | **No password complexity requirements** | `auth.validator.ts:18` | Password validation only requires `min 6 characters`. No uppercase, number, or special character requirements. The frontend (`signup/page.tsx:22`) also only enforces min 6. | Add Zod refinement: require at least 1 uppercase, 1 lowercase, 1 number, and 1 special character. Minimum 8 characters. |
| H6 | **Matric resolution ignores department code** | `validation.tools.ts:399-404` | The `resolveStudent` function queries only by `matricNumber`, completely ignoring the `departmentCode` parameter. This means a student from department A's matric could be matched against department B's records. | Update the query to also filter by department relationship, or at minimum verify the resolved student's department matches the expected code (the check exists in `checkRegistration` but not in `saveResult`). |
| H7 | **No pagination on bulk data endpoints** | `report.routes.ts:18-71`, `audit.routes.ts:16-30` | The dashboard endpoint fetches all `semesterGPA` records for distribution calculation without limits. The audit log has pagination (`take`/`skip`) but defaults to 50 with no query validation. | Add mandatory pagination limits; use `Math.min(parseInt(limit), 200)` for all list endpoints. |
| H8 | **Unsanitized AI output stored in database** | `upload.service.ts:187` | `rawRecords: records as any` stores the full AI-extracted record set in the `UploadJob.rawRecords` JSON field. This data is AI-generated and may contain prompt injection payloads or malformed data. | Validate and sanitize all fields before storing. Strip any non-printable characters. Limit field lengths. |
| H9 | **Gemini safety settings disabled** | `gemini.ts:29-31` | Both `HARM_CATEGORY_HARASSMENT` and `HARM_CATEGORY_HATE_SPEECH` are set to `BLOCK_NONE`. While this may be intentional to avoid false positives on academic content, it means the AI can return harmful content. | Use `BLOCK_ONLY_HIGH` or `BLOCK_MEDIUM_AND_ABOVE` in production. At minimum, log when safety filters are triggered. |
| H10 | **Register schema only allows HOD role but frontend offers DEAN** | `auth.validator.ts:21` vs `signup/page.tsx:26` | Backend `registerSchema` uses `z.literal('HOD')`, rejecting DEAN registrations. Frontend signup form offers both HOD and DEAN. This means DEAN signup always fails silently. | Update `registerSchema` to `z.enum(['HOD', 'DEAN'])` and add conditional validation for `departmentId` vs `facultyId`. |
| H11 | **No `.env` file validation** | `app.ts:10` | Missing environment variables (e.g., `DATABASE_URL`, `GEMINI_API_KEY`) cause cryptic runtime errors deep in request handlers rather than at startup. | Create a Zod schema for all required env vars. Validate on startup in `app.ts` before `connectDatabase()`. |

### MEDIUM — Fix before scaling

| # | Finding | Location | Description | Recommended Fix |
|---|---|---|---|---|
| M1 | **In-memory multer storage** | `upload.middleware.ts:7` | All uploaded files (up to 20MB) are buffered in RAM. With concurrent uploads, this can cause OOM. | Use Supabase Storage or disk-based multer storage for files > 1MB. |
| M2 | **No structured logging** | `error.middleware.ts:31`, throughout | Uses `console.log`/`console.error` only. No structured logs, no log levels, no request correlation. | Add `pino` or `winston` with JSON output, request IDs, and environment-aware log levels. |
| M3 | **N+1 query in `enterScores`** | `result.service.ts:28-81` | The `enterScores` function queries `prisma.course.findUnique()` inside a `for` loop for each score entry. 100 scores = 100 DB queries. | Batch course lookups: collect all `courseId`s first, then `prisma.course.findMany({ where: { id: { in: courseIds } } })`, build a Map, and look up in memory. |
| M4 | **N+1 query in `calculateDepartmentGPAs`** | `gpa.service.ts:214-223` | Loops through students calling `calculateSemesterGPA()` individually. | Consider a single SQL-based GPA calculation or batch the queries. |
| M5 | **No health check with DB connectivity** | `routes/index.ts:19-36` | The `/api/health` endpoint returns a static JSON response without actually checking database connectivity. | Add `await prisma.$queryRaw`SELECT 1`` and verify AI API key availability. |
| M6 | **No request correlation IDs** | `app.ts` (middleware stack) | No unique identifier per request for tracing and debugging. | Add middleware that generates a UUID per request and attaches it to `req.id` and response headers. |
| M7 | **Prisma logs all queries in development** | `database.ts:13-14` | `log: ['query', 'error', 'warn']` in development logs every SQL query, which can be extremely verbose. | Use `['error', 'warn']` as default; add `query` only with a `DEBUG_PRISMA` env flag. |
| M8 | **No graceful shutdown timeout** | `app.ts:121-131` | `SIGINT`/`SIGTERM` handlers call `disconnectDatabase()` but have no force-exit timer if the disconnect hangs. | Add `setTimeout(() => process.exit(1), 10000)` as a fallback. |
| M9 | **`bulkScoreEntrySchema` missing ND/HND levels** | `result.validator.ts:12-14` | Only allows `LEVEL_100` through `LEVEL_500`. The database schema and grading system support `ND1`, `ND2`, `HND1`, `HND2` but the bulk score entry validator rejects them. | Add `ND1, ND2, HND1, HND2` to the `z.enum()` array. |
| M10 | **No email verification on registration** | `auth.service.ts:71-113` | New users are created immediately without email verification. An attacker with a valid email can create an account instantly. | Add email verification flow with time-limited tokens. |
| M11 | **脆弱的 JSON 解析** (Fragile JSON parsing) | `gemini.ts:107-108`, `groq.ts:40-41` | AI responses are parsed with `text.replace(/^```json\n?/, '').replace(/\n?```$/, '')` then `JSON.parse()`. If the AI returns unexpected formatting, this silently returns `[]` with no error logging. | Wrap in try/catch with `console.warn` for the raw AI response. Consider using `generateObject()` for all structured extraction. |
| M12 | **Upload job endpoint has no ownership check** | `upload.routes.ts:102-114` | `GET /api/upload/:jobId` returns the job and all review items without checking if the requesting user uploaded the job or belongs to the same department. Any authenticated user can view any upload job. | Add ownership or department-scoping check. |
| M13 | **Legacy test routes reference non-existent endpoints** | `bulk.test.ts:75,159` | Tests call `/api/bulk/students` and `/api/bulk/scores` which do not exist in the current route configuration. All tests will fail. | Update test routes to match current API, or remove stale tests and write new ones. |

### LOW — Address when convenient

| # | Finding | Location | Description | Recommended Fix |
|---|---|---|---|---|
| L1 | **No API versioning** | `app.ts:65` | Routes mounted at `/api` with no version prefix. Breaking changes will require client coordination. | Prefix routes with `/api/v1/`. |
| L2 | **No API documentation** | — | No Swagger/OpenAPI spec. Developers must read source code to understand the API. | Add `swagger-jsdoc` + `swagger-ui-express` with JSDoc annotations. |
| L3 | **Dual lock files** | `frontend/` | Both `pnpm-lock.yaml` and `package-lock.json` exist, indicating mixed package manager usage. | Standardize on one package manager (recommend pnpm). Delete the other lock file. |
| L4 | **`@types/bcryptjs` in production dependencies** | `backend/package.json:24` | Type definitions are in `dependencies` instead of `devDependencies`. | Move to `devDependencies`. |
| L5 | **No `robots.txt` or `sitemap.xml`** | — | Missing for search engine optimization. | Add if the application will have any public-facing pages. |
| L6 | **No Dockerfile** | — | No containerization for reproducible builds and deployments. | Add multi-stage Dockerfile. |
| L7 | **No CI/CD pipeline** | — | No automated testing, linting, or deployment. | Add GitHub Actions workflow: lint → typecheck → test → build → deploy. |
| L8 | **README is a planning document, not usage docs** | `README.md` | Contains implementation plan and milestones, not setup/installation/usage instructions. | Rewrite README with setup instructions, environment variables, API overview, and development workflow. |
| L9 | **Missing ND/HND levels in bulk score entry** | `result.validator.ts:12-14` | The `bulkScoreEntrySchema` validator only allows `LEVEL_100`-`LEVEL_500`, but the `Department.passMark` field and Level enum support ND/HND levels. Users in polytechnic programs cannot use bulk score entry. | Add ND/HND levels to the enum validator. |

---

## 3. Feature Audit

| Feature | Status | Completeness | Issues & Recommendations |
|---|---|---|---|
| **User Authentication (Login)** | ✅ Complete | 85% | JWT + bcrypt works correctly. **Issues:** No rate limiting, no account lockout after failed attempts, no email verification, JWT in localStorage. |
| **User Registration** | ⚠️ Partial | 40% | Backend only accepts HOD role but frontend offers DEAN. Registration is fully public with no admin approval. No email verification. No lecturer/exam-officer registration flow. |
| **Role-Based Authorization** | ✅ Complete | 80% | `authorize()` middleware works for all 4 roles. Department-scoping middleware exists. **Issues:** Lecturer and Exam Officer have no department-scoping in the middleware, only HOD/DEAN are scoped. |
| **Faculty Management** | ❌ Missing | 0% | No API routes for creating, updating, or deleting faculties. Only seed data creates faculties. No frontend UI for faculty management. |
| **Department Management** | ⚠️ Partial | 50% | Read operations work with proper RBAC. **Critical bug:** Create and delete are on unauthenticated `/public` routes. No update endpoint. No UI beyond listing. |
| **Student CRUD** | ✅ Complete | 90% | Create, read, update, delete all work with proper validation and RBAC. Search and pagination implemented. **Issues:** No soft-delete (hard delete cascades to all results/GPAs). Missing phone number update validator. |
| **Bulk Student Import** | ❌ Broken | 10% | Frontend `api.ts:85-103` calls `/students/bulk-upload` but no such route exists. Test file `bulk.test.ts` references `/api/bulk/students` which doesn't exist. The legacy bulk import appears to have been removed when the AI pipeline was added. |
| **Student Level Update** | ✅ Complete | 90% | `PATCH /api/students/bulk-update-level` exists for HOD. No frontend UI for this operation. |
| **Course Management (CRUD)** | ✅ Complete | 90% | Full CRUD with Zod validation. Department/level/semester filtering. **Issues:** No duplicate course code check within a department (the DB unique constraint on `[code, departmentId]` handles this, but error message is generic). |
| **Manual Score Entry** | ✅ Complete | 95% | Single score (`POST /results/add`) and bulk score (`POST /results/scores`) both work with validation and automatic GPA recalculation. **Issues:** Bulk schema excludes ND/HND levels. |
| **AI Upload Pipeline** | ✅ Complete | 90% | The core differentiator. Multi-format file support (Excel, CSV, PDF, images). Gemini extraction with Groq fallback. Function-calling validation. SSE progress streaming. Stuck job recovery on restart. **Issues:** No concurrency limit per user. No file size warning for large PDFs. AI response parsing is fragile. |
| **Human Review Center** | ✅ Complete | 85% | Accept/reject/edit per review item. Bulk approve-all. Commits accepted data back to DB. Audit logging. **Issues:** No ownership check — any authenticated user can review any job. No undo for bulk approve-all. |
| **Approval Workflow** | ✅ Complete | 80% | Multi-step chain: Lecturer → Exam Officer → HOD → Dean. Rejection. Publishing. Audit logging. **Issues:** No validation that the batch has actual results before submitting. No notification when a batch reaches a new approval stage. The workflow requires all intermediate steps even if the institution doesn't use all roles. |
| **GPA Calculation** | ✅ Complete | 95% | Semester GPA, CGPA, department stats, degree classification — all correct per Nigerian 5-point scale. On-the-fly calculation if semester GPA record doesn't exist. **Issues:** `calculateDepartmentGPAs` has N+1 query pattern. |
| **GPA AI Explanation** | ✅ Complete | 70% | "Why is this GPA X?" plain-language explanation via Gemini/Groq. **Issues:** No caching — same request triggers a new AI call each time. No loading state in frontend for this feature. |
| **Transcript Generation (PDF)** | ✅ Complete | 85% | PDFKit-based transcript with student info, semester-by-semester results, GPA/CGPA, degree classification, carry-over highlighting. **Issues:** Uses Helvetica (no Unicode support for special characters). No institution branding/logo. No watermark or security features. |
| **Department Reports (PDF)** | ✅ Complete | 80% | Summary statistics + per-student course breakdown. **Issues:** Same PDFKit limitations. No filtering by course or score range. No export to Excel/CSV. |
| **Faculty Statistics** | ⚠️ Partial | 60% | Backend `GET /api/reports/faculty` exists for Dean role. **Issues:** No frontend page for faculty statistics. Only shows aggregate numbers, no per-department drill-down in the UI. |
| **Dashboard** | ✅ Complete | 70% | Stats cards (students, pending approvals, published batches, recent uploads). Quick links. Recent upload jobs. **Issues:** GPA distribution chart data is computed but not visualized in the dashboard. No role-specific views — all roles see the same layout. No real-time updates. |
| **Audit Logging** | ✅ Complete | 85% | All significant mutations create `AuditLog` entries. Queryable by entity type/entity ID and by actor. Pagination with limit/offset. **Issues:** No filtering by date range. No export capability. No alerting on suspicious patterns. |
| **Password Change** | ✅ Complete | 80% | `POST /api/auth/change-password` with current password verification. **Issues:** No password reset/forgot password flow. No force-logout on password change (existing tokens remain valid). |
| **Attendance Management** | ❌ Missing | 0% | Not implemented. No schema, no API, no UI. |
| **Course Scheduling/Timetable** | ❌ Missing | 0% | Not implemented. |
| **Assignment Submission** | ❌ Missing | 0% | Not implemented. |
| **Student Self-Service Portal** | ❌ Missing | 0% | Students cannot log in, view their results, download transcripts, or track their GPA progress. The `Student` model has no `password` or `userId` field — students are data-only entities managed by HODs. |
| **Email Notifications** | ❌ Missing | 0% | No email service integration. No notifications for account creation, results publication, approval requests, or system alerts. |
| **Notifications System** | ❌ Missing | 0% | No in-app notification system. No WebSocket or polling for real-time updates. |
| **Data Export (CSV/Excel)** | ⚠️ Partial | 30% | Template generation exists for student/score uploads. PDF export exists for transcripts/reports. **Issues:** No CSV/Excel export for student lists, result lists, or audit logs. No bulk data download. |
| **Accessibility (WCAG)** | ⚠️ Partial | 30% | Uses semantic HTML in places but no ARIA labels, no keyboard navigation testing, no screen reader testing, no focus management. Color contrast not verified. |
| **Mobile Responsiveness** | ⚠️ Partial | 50% | Tailwind responsive classes used in dashboard layout. **Issues:** Some pages (review center, approval) are likely not optimized for mobile. No PWA support. No offline capability. |
| **Test Suite** | ❌ Broken | 10% | Only 1 test file (`bulk.test.ts`, 234 lines). All tests reference non-existent routes (`/api/bulk/students`, `/api/bulk/scores`). Tests will fail on every run. No test database setup or teardown strategy documented. |
| **Error Boundaries (Frontend)** | ❌ Missing | 0% | No React Error Boundaries. A runtime error in any component crashes the entire page. No fallback UI for API failures beyond toast notifications. |

---

## 4. User Persona & Suggested Features

### 4.1 Administrator / IT Staff

The system administrator manages the overall system, creates user accounts, and monitors system health.

| Priority | Feature | Rationale | Effort |
|---|---|---|---|
| **Quick Win** | Role-based dashboard views | All roles currently see identical dashboards. Admin should see system-wide stats, not department-scoped. | 1-2 days |
| **Quick Win** | User management panel (list, create, deactivate) | Currently only signup + seed script. No way to manage users through the UI. | 2-3 days |
| **Must-Have** | System health monitoring page | No visibility into database connection status, AI API quota usage, active upload jobs, or error rates. | 3-5 days |
| **Must-Have** | Environment variable management docs | `.env.example` exists but doesn't document which vars are required vs optional, or their expected formats. | 1 day |
| **Nice-to-Have** | Institution-wide cross-faculty analytics | Dean only sees own faculty. No institution-level aggregation. | 1 week |
| **Nice-to-Have** | API rate limit configuration | Hardcoded limits. Should be configurable per-role and per-endpoint. | 2 days |

### 4.2 HOD (Head of Department)

The HOD is the primary power user — entering scores, managing students, and generating reports for their department.

| Priority | Feature | Rationale | Effort |
|---|---|---|---|
| **Quick Win** | Department-scoped student list with prominent level tabs | Student list exists but isn't prominently filtered by the HOD's department on the dashboard. | 1 day |
| **Quick Win** | Carry-over tracking UI | `GET /results/carryovers/:studentId` exists but has no frontend page. HODs need this for at-risk students. | 1-2 days |
| **Must-Have** | One-click end-of-semester workflow | The current flow (enter scores → review → submit for approval) requires navigating 4+ pages. A guided workflow would reduce errors. | 1 week |
| **Must-Have** | Performance trend charts | Semester-over-semester GPA trends for the department. Data is available via GPA stats but not visualized. | 3-5 days |
| **Must-Have** | Student search by matric number on dashboard | Quick lookup without navigating to the students page. | 1 day |
| **Nice-to-Have** | Course prerequisites enforcement | The schema doesn't model prerequisites. No validation that a student has passed prerequisites before enrolling. | 1-2 weeks |
| **Nice-to-Have** | Bulk result entry via file upload (non-AI) | The AI pipeline is powerful but heavyweight. A simple Excel upload for experienced users would be faster. | 3-5 days |

### 4.3 Dean

The Dean oversees multiple departments within a faculty and needs cross-department comparison tools.

| Priority | Feature | Rationale | Effort |
|---|---|---|---|
| **Must-Have** | Cross-department comparison dashboard | `GET /reports/faculty` exists in backend but has no frontend page. Deans need department-vs-department GPA comparisons. | 3-5 days |
| **Must-Have** | Faculty-wide GPA distribution visualization | Dashboard stats compute `gpaDistribution` but it's not rendered in any chart. | 2-3 days |
| **Must-Have** | Batch approval queue with department filter | Current approval page shows all batches. Dean needs to filter by department and approval stage. | 2 days |
| **Nice-to-Have** | Faculty-wide student ranking across departments | No cross-department student performance comparison exists. | 1 week |
| **Nice-to-Have** | Academic calendar integration | No semester date tracking. Manual `academicYear` entry is error-prone. | 3-5 days |
| **Nice-to-Have** | PDF report with faculty letterhead/logo | Current PDFs are plain. No branding. | 2-3 days |

### 4.4 Lecturer

Lecturers enter scores for courses they teach and need focused views for their courses.

| Priority | Feature | Rationale | Effort |
|---|---|---|---|
| **Must-Have** | Course-specific result entry view | Lecturers can enter scores but the UI doesn't filter courses by those they're assigned to. There's no `CourseAssignment` or `LecturerCourse` model in the schema. | 1-2 weeks |
| **Must-Have** | Class list per course | No way to see enrolled students for a specific course. | 3-5 days |
| **Nice-to-Have** | Grade distribution per course after entry | After entering scores, see a histogram for the course. Data available but not visualized. | 2 days |
| **Nice-to-Have** | Score entry deadline tracking | No deadline concept in the system. | 3 days |

### 4.5 Examination Officer

The Examination Officer reviews results before they enter the formal approval chain.

| Priority | Feature | Rationale | Effort |
|---|---|---|---|
| **Must-Have** | Dedicated approval queue with role-appropriate filters | Shared approval page shows everything. Exam Officer needs to see batches awaiting their specific approval step. | 2-3 days |
| **Must-Have** | Conflict detection (duplicate results across semesters) | No validation that a student doesn't have conflicting results (e.g., same course in same semester twice). | 3-5 days |
| **Nice-to-Have** | Exam timetable management | Not implemented. Could help coordinate when results are expected. | 1-2 weeks |
| **Nice-to-Have** | Bulk result verification tools | Quick way to spot anomalies across an entire semester's results (e.g., all students scoring exactly 50). | 3-5 days |

### 4.6 Student

Students are currently data-only entities with no system access. This is the most significant feature gap.

| Priority | Feature | Rationale | Effort |
|---|---|---|---|
| **Must-Have** | Student self-service login | Students cannot access the system at all. The `Student` model has no `userId` field. Need a `Student` → `User` linking mechanism. | 1-2 weeks |
| **Must-Have** | Personal results view | Students need to see their results per semester, with GPA/CGPA. The data exists; no student-facing UI does. | 3-5 days |
| **Must-Have** | Personal transcript download | HOD can download transcripts but students cannot. The PDF generation code exists. | 1-2 days |
| **Must-Have** | GPA progress tracker with visualizations | Semester-by-semester GPA trend chart, CGPA trajectory, class-of-degree projection. | 3-5 days |
| **Nice-to-Have** | Course registration interface | Students could select courses for the upcoming semester. Requires a `CourseRegistration` model. | 1-2 weeks |
| **Nice-to-Have** | Academic advisor messaging | Students could message their HOD or academic advisor. Requires a `Message` or `Notification` model. | 1 week |
| **Nice-to-Have** | Self-service account recovery | Forgot password via email. | 3-5 days |

### 4.7 Parent/Guardian (Not Currently Modeled)

| Priority | Feature | Rationale | Effort |
|---|---|---|---|
| **Nice-to-Have** | Parent portal with student progress view | Parents could view their child's results and GPA trends. Requires new `Parent` role + `ParentStudent` relationship model. | 2-3 weeks |
| **Nice-to-Have** | Fee payment integration | Paystack/Flutterwave integration for school fees. Requires `Payment` model. | 2-3 weeks |
| **Nice-to-Have** | Automated progress reports via email | Term-end summary emails to parents. | 1 week |

---

## 5. Prioritized Roadmap

### Phase 1: Security Hardening (1-2 weeks) — BLOCKER

This phase addresses all critical and high-severity security issues. The application must not be deployed to any accessible environment until these are resolved.

| Task | Priority | Effort | Findings Addressed |
|---|---|---|---|
| Delete `creds.txt`, rotate DB password | Critical | 30 min | C1 |
| Remove unauthenticated `POST`/`DELETE` on `/departments/public` | Critical | 1 hour | C2 |
| Add JWT_SECRET validation at startup (fail-fast) | Critical | 30 min | C3 |
| Restrict `/register` to admin-only | Critical | 1 hour | C4 |
| Wrap `saveResult` in Prisma `$transaction` | Critical | 2 hours | C5 |
| Replace real student names in seed with synthetic data | Critical | 1 hour | C6 |
| Add rate limiting (`express-rate-limit`) | High | 2 hours | H1 |
| Move JWT to httpOnly cookies | High | 4 hours | H2 |
| Add CSRF protection | High | 2 hours | H3 |
| Remove `text/plain` from allowed MIME types | High | 15 min | H4 |
| Add password complexity rules | High | 30 min | H5 |
| Fix `resolveStudent` to verify department | High | 1 hour | H6 |
| Fix `registerSchema` to accept DEAN role | High | 30 min | H10 |
| Add env var validation at startup | High | 2 hours | H11 |

### Phase 2: Production Infrastructure (2-3 weeks)

This phase makes the application deployable, observable, and maintainable.

| Task | Priority | Effort | Findings Addressed |
|---|---|---|---|
| Add Dockerfile + docker-compose.yml | High | 4 hours | L6 |
| Set up CI/CD (GitHub Actions: lint, typecheck, test, build) | High | 1 day | L7 |
| Add structured logging (pino/winston) | High | 4 hours | M2 |
| Add request correlation IDs | Medium | 2 hours | M6 |
| Fix test suite (update routes, add test DB setup) | High | 2 days | M13 |
| Add health check with DB ping | Medium | 1 hour | M5 |
| Add graceful shutdown with timeout | Medium | 30 min | M8 |
| Add error boundaries in frontend | High | 4 hours | Feature Audit |
| Rewrite README with setup/usage instructions | Medium | 2 hours | L8 |
| Remove stale `text/plain` MIME and fix `bulkScoreEntrySchema` | Medium | 30 min | M9, L9 |

### Phase 3: Core UX Improvements (3-4 weeks)

This phase addresses the most impactful user experience gaps.

| Task | Priority | Effort | Findings Addressed |
|---|---|---|---|
| Student self-service portal (login, view results) | Must-Have | 1-2 weeks | Feature Audit |
| Role-based dashboard views | Must-Have | 3-5 days | 4.1, 4.2 |
| Forgot password / self-service account recovery | Must-Have | 3-5 days | Feature Audit |
| Carry-over tracking UI | Quick Win | 1-2 days | 4.2 |
| Faculty management CRUD (admin UI) | Must-Have | 3-5 days | Feature Audit |
| Cross-department comparison for Dean | Must-Have | 3-5 days | 4.3 |
| Email notifications (results published, approval needed) | Must-Have | 1 week | Feature Audit |
| Fix dead code paths (legacy bulk upload routes, broken tests) | Quick Win | 1 day | H13 |
| N+1 query optimization in `enterScores` | Medium | 2 hours | M3 |

### Phase 4: Advanced Features (4-6 weeks)

This phase adds significant new capabilities that expand the user base and value proposition.

| Task | Priority | Effort |
|---|---|---|
| Attendance management | Must-Have | 1-2 weeks |
| Course scheduling / timetable | Nice-to-Have | 1-2 weeks |
| Assignment submission portal | Nice-to-Have | 1-2 weeks |
| Course prerequisite enforcement | Nice-to-Have | 3-5 days |
| Multilingual support (English + Yoruba/Hausa/Igbo) | Nice-to-Have | 1-2 weeks |
| WCAG accessibility audit and fixes | Nice-to-Have | 1 week |
| CSV/Excel data export for all entities | Quick Win | 3-5 days |
| Mobile-responsive improvements + PWA | Nice-to-Have | 1 week |

### Phase 5: Scale & SaaS (Ongoing)

This phase prepares for multi-institution deployment and commercial viability.

| Task | Priority | Effort |
|---|---|---|
| NestJS migration (incremental, module-by-module) | Strategic | 4-6 weeks |
| Multi-tenancy (`institutionId` on all tables, row-level security) | Strategic | 2-3 weeks |
| Payment gateway integration (Paystack/Flutterwave) | Strategic | 1-2 weeks |
| Load testing beyond demo scale (5,000+ results) | Must-Have | 1 week |
| AI cost optimization (caching, batching, rate limiting per institution) | Must-Have | 1 week |
| OpenAPI/Swagger documentation | Nice-to-Have | 2-3 days |
| Redis caching layer for frequent queries | Nice-to-Have | 2-3 days |
| WebSocket for real-time notifications | Nice-to-Have | 1 week |
| Parent/guardian portal with role model | Nice-to-Have | 2-3 weeks |

---

## 6. Architectural Strengths to Preserve

These are well-designed aspects of the codebase that should be maintained and built upon:

1. **AI Pipeline with Human-in-the-Loop** — The `geminiValidateWithTools` → `ReviewItem` → `commitReviewItem` flow is the core product differentiator. The 5-round function-calling loop with confidence scoring is sophisticated and well-implemented.

2. **Dual AI Provider with Automatic Fallback** — Gemini as primary with Groq as fallback, triggered automatically on 429/quota errors. This provides resilience against AI API outages.

3. **Comprehensive Audit Trail** — The `AuditLog` model captures all significant mutations with actor, entity, action, and metadata. This is essential for academic integrity and compliance.

4. **Multi-Role Approval Workflow** — The approval chain (Lecturer → Exam Officer → HOD → Dean) with `$transaction` usage in `approval.routes.ts:128-151` is correctly implemented.

5. **GPA Recalculation Cascade** — Automatic GPA recalculation when results are created, updated, or deleted. The `recalculateAllStudentGPA` pattern ensures data consistency.

6. **Clean Service Layer Separation** — Controllers delegate to services, services use Prisma. This separation makes the codebase testable and maintainable.

7. **Recovery of Stuck Upload Jobs** — `database.ts:36-44` recovers `PROCESSING` jobs that were interrupted by server restart, marking them as rejected with an informative message.

8. **Flexible Matric Number Resolution** — The system handles both `YYYY/NNNN` (score files) and `DEPT/YEAR/NUM` (student files) matric formats, with the `resolveStudent` function bridging the two.

---

## 7. Known Bugs

| # | Bug | Location | Impact | Fix |
|---|---|---|---|---|
| B1 | **Register schema rejects DEAN role** | `auth.validator.ts:21` | `z.literal('HOD')` causes all DEAN registrations to fail with validation error. Frontend `signup/page.tsx:26` offers DEAN as an option. | Change to `z.enum(['HOD', 'DEAN'])` with conditional `departmentId`/`facultyId` validation. |
| B2 | **Test suite references non-existent routes** | `bulk.test.ts:75,159` | Tests call `POST /api/bulk/students` and `POST /api/bulk/scores` which don't exist in current routes. All tests fail with 404. | Update routes to `/api/students/bulk-upload` and `/api/results/bulk-upload`, or rewrite tests entirely. |
| B3 | **Bulk score entry rejects ND/HND levels** | `result.validator.ts:12-14` | `bulkScoreEntrySchema` only allows `LEVEL_100` through `LEVEL_500`. HODs in polytechnic programs (ND1, ND2, HND1, HND2) cannot use bulk score entry. | Add `ND1, ND2, HND1, HND2` to the `z.enum()` array. |
| B4 | **`resolveStudent` ignores department code** | `validation.tools.ts:399-404` | The function queries by `matricNumber` only, ignoring the `departmentCode` parameter. Could match students from wrong departments. | Add department filter to the Prisma query, or add a post-query verification that `student.department.code === departmentCode`. |
| B5 | **Frontend legacy API paths** | `api.ts:85-103, 181-202` | `studentsApi.bulkUpload` calls `/students/bulk-upload` and `resultsApi.bulkUpload` calls `/results/bulk-upload`. Neither endpoint exists. | Remove or update these methods to point to the correct `/upload` endpoint. |
| B6 | **No error handling in dashboard stats fetch** | `dashboard/page.tsx:14-15` | `reportsApi.getDashboardStats().then(r => r.success && setStats(r.data)).catch(() => {})` — errors are silently swallowed. If the API is down, the dashboard shows nothing with no indication. | Add error state and fallback UI. |
| B7 | **Missing error state in multiple frontend pages** | Multiple pages | Several pages call API methods in `useEffect` with `.catch(() => {})` — silently swallowing errors. Users see blank pages with no feedback. | Add error states, loading states, and retry mechanisms to all data-fetching pages. |

---

*This audit was performed on September 1, 2026 by reading all source files in the repository. Findings are based on static code analysis and do not include runtime testing, load testing, or penetration testing. A follow-up audit is recommended after Phase 1 security hardening is complete.*
