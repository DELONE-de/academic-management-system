# Technical Debt Register — Supporting Document

## Must Fix (correctness/security/data-loss)

| # | Problem | Why it matters | Current impact | Future impact | Solution | Est. complexity | Priority |
|---|---|---|---|---|---|---|---|
| TD1 | Plaintext DB password in git (`creds.txt`) | Full DB compromise | Any repo reader has DB password | Same | Delete, rotate, gitignore, scrub history | 30 min | P0 |
| TD2 | Public unauthenticated department create/delete | Anonymous data destruction | Anyone can delete any department (cascade loss) | Same | Authenticate + authorize | 1 hour | P0 |
| TD3 | Default JWT secret (`'default-secret-change-in-production'`) | Token forgery | Attacker can forge any role | Same | Fail-fast on missing env var | 30 min | P0 |
| TD4 | Public self-registration of HOD accounts | Account takeover | Anyone creates HOD → full dept access | Same | Admin-gate registration | 1 hour | P0 |
| TD5 | Broken access control on results/GPAs/transcripts reads | Cross-tenant data exposure | Any user reads any student's data | Scale | Central dept scoping middleware | 1 day | P0 |
| TD6 | Results written before human approval | Data integrity | Bad AI writes persist; approval workflow is cosmetic | Audit integrity at scale | Two-stage persist | 1–2 days | P0 |
| TD7 | No audit log on result mutations | Score changes untraceable | Can't detect who changed what grade | Legal/compliance risk | Add `ResultVersion` | 1 day | P0 |
| TD8 | Broken tests (bulk.test.ts) | No regression safety | `npm test` fails; no coverage for GPA/auth | Critical bugs go undetected | Rewrite tests | 2–3 days | P0 |
| TD9 | ND/HND levels rejected in bulk score entry | Polytech users can't use bulk | ND/HND users must use single-score entry | Same | Add to enum | 30 min | P0 |
| TD10 | CGPA page shows `undefined` for student name | Broken feature | Users see undefined in CGPA view | Same | Fix frontend field ref | 15 min | P0 |

## Should Fix (architecture/usability/maintainability)

| # | Problem | Why it matters | Current impact | Solution | Est. complexity | Priority |
|---|---|---|---|---|---|---|
| TD11 | N+1 in `enterScores` (per-score course lookup) | Performance at scale | 100 students × 10 courses = 1000+ queries | Batch course lookup | 2 hours | P1 |
| TD12 | Sequential GPA recalc in `calculateDepartmentGPAs` | Performance at scale | 1000 students = 1000 sequential queries | Parallelize with concurrency cap | 1 day | P1 |
| TD13 | O(n·m) filter in report service | Performance | 1000 students × 1000 gpas = 1M iterations | Map grouping | 1 hour | P1 |
| TD14 | HOD course/student update not dept-scoped | Privilege | HOD can update another dept's data | Enforce scoping | 2 hours | P1 |
| TD15 | Upload/review ownership check missing | Privacy | Any user reads any upload/review | Scope to uploader | 1 day | P1 |
| TD16 | Duplicate result-write logic (4 implementations) | Maintenance | `enterScores`, `addSingleScore`, `updateResult`, `saveResult` — same logic repeated | Extract to shared method | 1 day | P1 |
| TD17 | Fat routes (logic in routes, not services) | Testability | `gpa.routes.ts` `/explain`, `report.routes.ts` dashboard, `upload.routes.ts`, `review.routes.ts` | Move to services | 1 day | P1 |
| TD18 | GPA snapshot drift | Data integrity | `SemesterGPA` can become stale | Recompute on every result read | 1 day | P1 |
| TD19 | No rate limiting | Security | Auth brute-force, upload DoS | Add `express-rate-limit` | 2 hours | P1 |
| TD20 | JWT in `localStorage` | XSS vulnerability | Token stolen by any XSS | httpOnly cookie or refresh tokens | 4 hours | P1 |
| TD21 | No user management | Admin UX | Can't create/deactivate users | Add admin panel | 1 week | P1 |
| TD22 | No pagination on most list endpoints | UX | Students 50-cap; courses/results/reports unbounded | Add pagination everywhere | 3 days | P1 |
| TD23 | `bulkScoreEntrySchema` missing ND/HND levels | Correctness | Polytech users can't use bulk entry | Add to enum | 30 min | P0 |
| TD24 | `resolveStudent` ignores departmentCode | Correctness risk | Wrong dept match possible | Verify in `saveResult` | 1 hour | P1 |
| TD25 | `registerSchema` only allows HOD | Bug | DEAN signup always fails | Add both roles | 30 min | P0 |

## Nice to Have

| # | Problem | Solution | Est. complexity |
|---|---|---|---|
| TD26 | No API versioning | `/api/v1/` prefix | 1 hour |
| TD27 | No OpenAPI/Swagger | swagger-jsdoc + swagger-ui-express | 2 days |
| TD28 | No structured logging / correlation IDs | pino or winston with request IDs | 1 day |
| TD29 | No Dockerfile | Multi-stage Dockerfile | 1 day |
| TD30 | No CI/CD | GitHub Actions (lint→typecheck→test→build→deploy) | 1 day |
| TD31 | `@types/*` in production deps | Move to devDependencies | 15 min |
| TD32 | Dead frontend code (`useFetch`, `CourseForm`, `BulkLevelUpdate`, `chart.js`, Supabase env vars, bulk API methods) | Remove or wire | 1 day |
| TD33 | Mixed lockfiles (package-lock + pnpm-lock) | Standardize on pnpm | 1 hour |
| TD34 | In-memory multer OOM risk | Supabase Storage or disk storage for >1MB files | 1 day |
| TD35 | No CSRF protection | Add origin check + SameSite cookie | 1 day |
| TD36 | Gemini safety settings `BLOCK_NONE` | `BLOCK_MEDIUM_AND_ABOVE` | 15 min |
| TD37 | MIME `text/plain` accepted as CSV | Remove; add magic-byte check | 30 min |
| TD38 | Weak password policy | 8+ chars + complexity | 1 hour |
| TD39 | Seed deletes all data | Add `--force` flag, document | 1 hour |
| TD40 | No startup env var validation | Zod schema for env vars | 2 hours |