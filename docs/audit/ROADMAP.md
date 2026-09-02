# Recommended Roadmap — Supporting Document

## Phase 0: Stabilization (P0 — ~1–2 weeks)

**Goal:** Make the system safe to run with real data. Fix all CRITICAL and HIGH security/correctness issues.

| # | Task | Dependencies | Est. effort | Impact |
|---|---|---|---|---|
| 0.1 | Delete `creds.txt`, rotate DB password, add to `.gitignore`, scrub git history if repo is public | — | 30 min | 🔴 Stops full DB compromise |
| 0.2 | Fail-fast: require `JWT_SECRET` env var at startup (remove default fallback) | — | 30 min | 🔴 Stops token forgery |
| 0.3 | Move `POST /departments/public` and `DELETE /departments/public/:id` behind `authenticate` + `authorize` | — | 1 hour | 🔴 Stops anonymous data destruction |
| 0.4 | Gate registration behind admin auth; or if public must stay temporarily, fix `registerSchema` to accept both HOD/DEAN and add conditional dept/facultyId validation | — | 1 hour | 🔴 Stops anonymous account creation |
| 0.5 | Add department/faculty scoping to ALL read endpoints for results, students, GPAs, transcripts, uploads, reviews | 0.3 (auth middleware) | 1–2 days | 🔴 Stops cross-tenant data access |
| 0.6 | Stop pre-approval AI writes: stage records in `rawRecords` or `StagedResult`; only commit to `Result`/`SemesterGPA` after human review + batch approval | — | 1–2 days | 🔴 Workflow integrity |
| 0.7 | Add audit logging to all result create/update/delete (`ResultVersion` model) | — | 1 day | 🔴 Traceability |
| 0.8 | Fix B3 (ND/HND levels in bulk validator), B4 (CGPA page name), B5 (dead API methods), B6 (dashboard GPA groupBy) | — | 2 hours | ✅ Correctness |
| 0.9 | Add rate limiting (auth: 5/min, upload: 3 concurrent, API-wide: 100/min) | — | 2 hours | 🔴 Brute force / DoS |
| 0.10 | Fix dept scoping on student/course update/delete (B9) | — | 2 hours | ✅ Privilege |
| 0.11 | Rewrite test suite: `grading.ts` unit tests (full matrix), auth tests, a passing smoke test on current routes | 0.2 (JWT) | 2–3 days | ✅ Regression safety |

## Phase 1: Foundation (P1 — ~3–4 weeks)

**Goal:** Build the architectural foundation for scalability, configurability, and multi-department support.

| # | Task | Dependencies | Est. effort | Impact |
|---|---|---|---|---|
| 1.1 | Configurable grading engine: `GradingScale`, `GradingBand`, `GradingPolicy` models; refactor `grading.ts` to be pure + tested | 0.11 (tests) | 1–2 weeks | 🏗 Multi-dept enabler |
| 1.2 | `Institution` model + `institutionId` FK migration; `Program` model; `AcademicSession` model; `Level` table | 1.1 | 1 week | 🏗 Multi-tenancy enabler |
| 1.3 | RBAC: `Permission` enum, `Role`/`UserRole` join tables, `requirePermission` middleware; migrate `authorize` calls | — | 1 week | 🏗 Security enabler |
| 1.4 | Result history: `ResultVersion` model; every write creates a version; post-publication edit requires approval | 0.6 | 3–5 days | 🔒 Traceability |
| 1.5 | JWT to httpOnly cookie (or refresh-token rotation) + CSRF protection | 0.9 | 1 day | 🔒 XSS |
| 1.6 | Query fixes: batch course lookup, parallel recalcs, Map grouping, add indexes on `(academicYear)` and `(student.departmentId, level, semester)` | — | 1 day | ⚡ Performance |
| 1.7 | Pagination for all list endpoints + frontend pagination controls | — | 3–5 days | ✅ UX |
| 1.8 | Startup env var validation (Zod) + structured logging (pino) + correlation IDs | — | 2 days | 🛠 Ops |

## Phase 2: Core Product (P1/P2 — ~3–5 weeks)

**Goal:** Build the features that make the system valuable to students, admins, and departments.

| # | Task | Dependencies | Est. effort | Impact |
|---|---|---|---|---|
| 2.1 | Student self-service portal: `StudentUser` linking, login, results page, GPA/CGPA history, transcript download, carryover view | 0.5 (scoping), 1.3 (RBAC) | 1–2 weeks | 🚀 Largest missing feature |
| 2.2 | User management admin panel: list, create, deactivate, role assignment, dept/faculty/institution scope | 1.3 | 1 week | 🚀 Admin tooling |
| 2.3 | Faculty/institution/department CRUD admin UI | 1.2 | 3–5 days | 🚀 Multi-dept mgmt |
| 2.4 | Approval gating: batch creation validates results exist; "publish" actually writes staged results to `Result`/`SemesterGPA` | 0.6 | 3–5 days | 🔒 Workflow integrity |
| 2.5 | Department self-config onboarding wizard | 1.1, 1.2 | 1 week | 🚀 Adoption |
| 2.6 | Notifications (in-app + email) for approval events | 1.3 | 1 week | ✅ UX |
| 2.7 | At-risk & carryover tracking UI + graduation-eligibility view | 2.1 | 1 week | 🚀 Student support |

## Phase 3: Multi-Department Architecture (P2 — ~3–4 weeks)

**Goal:** Remove all hardcoded single-institution assumptions; make the system configurable without code changes.

| # | Task | Dependencies | Est. effort | Impact |
|---|---|---|---|---|
| 3.1 | Integrate configurable grading engine into all GPA/CGPA calculation paths | 1.1 | 1 week | 🏗 Multi-dept |
| 3.2 | Replace `Level` enum usage with `Level` table lookups throughout | 1.2 | 1 week | 🏗 Multi-dept |
| 3.3 | Replace `Semester` enum with `AcademicSession` lookups | 1.2 | 3 days | 🏗 Multi-dept |
| 3.4 | Add `institutionId` scoping to all API queries + auth middleware | 1.2, 1.3 | 1 week | 🏗 Multi-tenancy |
| 3.5 | Seed/onboarding script generator: reads from config, not hardcoded values | 1.2 | 3 days | 🏗 Multi-dept |
| 3.6 | Cross-department/faculty analytics with real distribution bucketing | 1.6 | 3 days | ✅ Dean UX |

## Phase 4: Product Differentiation (P2 — ~2–3 weeks)

**Goal:** Add features that make departments actively want to adopt the platform.

| # | Task | Dependencies | Est. effort | Impact |
|---|---|---|---|---|
| 4.1 | Bulk Excel/CSV import (non-AI fast path) + export (students, results, audit) | — | 3–5 days | 🚀 Adoption |
| 4.2 | Printable result slips + branded PDFs (university logo, watermark) | 1.2 | 2–3 days | ✅ Professional |
| 4.3 | At-risk analytics dashboard widget + department performance trends | 2.1 | 1 week | 🚀 Value |
| 4.4 | Audit log explorer with date/action/user filters + CSV export | — | 2–3 days | ✅ Admin |
| 4.5 | Course allocation / lecturer workload model | 1.3 | 1–2 weeks | 🚀 Adoption |

## Phase 5: Production Readiness (P2/P3 — ongoing)

**Goal:** Make the system deployable, observable, and maintainable.

| # | Task | Dependencies | Est. effort | Impact |
|---|---|---|---|---|
| 5.1 | Docker + docker-compose (multi-stage build, Postgres, Redis) | — | 1 week | 🛠 Deploy |
| 5.2 | CI/CD (GitHub Actions: lint→typecheck→test→build→migrate→deploy) | 0.11, 5.1 | 1 week | 🛠 Ops |
| 5.3 | Automated backups + DR test | 5.1 | 1 week | 🛠 Ops |
| 5.4 | Monitoring + error tracking (Sentry, uptime robot) | 1.8 | 2 days | 🛠 Ops |
| 5.5 | Load testing at 10k/100k scale; fix bottlenecks | 1.6 | 1 week | ⚡ Scale |
| 5.6 | Security headers (CSP), secrets manager (env or Vault), pen test | 1.5 | 1 week | 🔒 Security |
| 5.7 | OpenAPI/Swagger documentation | — | 3 days | 📖 Docs |
| 5.8 | Rewrite README as proper setup/usage/architecture docs | — | 2 days | 📖 Docs |

## Dependency graph

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5
  |              |            |           |            |            |
  |              0.11         |           |            |            |
  |              └──tests─────┤           |            |            |
  |                           1.1         |            |            |
  |                           └──grading──┤            |            |
  |                             1.2       |            |            |
  |                             └──inst────┤            |            |
  |                               1.3      |            |            |
  |                               └──RBAC──┤            |            |
  |                                         3.1───3.3───┤            |
  |                                                     4.1───4.5───┤
  |                                                                5.1───5.8
```

**Key insight:** Most of Phase 0 can be done in parallel. Phase 1 items 1.1–1.3 are the critical path for everything that follows. Phase 2.1 (student portal) is the highest-user-value item and should start as soon as RBAC + scoping are ready.