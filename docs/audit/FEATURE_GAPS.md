# Feature Gap Analysis — Supporting Document

## Legend
- P0 = Critical (correctness, security, basic operation)
- P1 = High (major product improvement)
- P2 = Medium (important improvement)
- P3 = Low (nice-to-have)

| Feature Area | Current State | Gap | Priority | Complexity | Recommendation |
|---|---|---|---|---|---|
| **Student portal** | ❌ None | Students cannot log in, view results, GPA, CGPA, transcript, or carryovers | P0 | 1–2 weeks | Add `StudentUser` linking (student→user), login, results page, transcript download, GPA history |
| **User management** | ❌ None | No admin UI to list/create/deactivate users; only signup seed | P0 | 1 week | Admin panel: list, create, deactivate, role assignment, dept/faculty scoping |
| **Result correction workflow** | ❌ In-place overwrite | No edit history, no approval for corrections, no `ResultVersion` | P0 | 1 week | Add `ResultVersion` model; every edit creates a version; require approval for post-publication edits |
| **Result approval gating** | ❌ Results written before approval | AI pipeline writes results before any human review or batch | P0 | 3–5 days | Two-stage: stage → review → approve → persist |
| **Faculty management** | ❌ Missing (seed-only) | No faculty CRUD in UI or API | P1 | 2–3 days | Add API + UI for faculty CRUD (DEAN/Admin only) |
| **Institution management** | ❌ Missing | No institution model → multi-tenancy impossible | P1 | 1–2 weeks | Add `Institution` model + `institutionId` FK migration |
| **Department update** | ❌ Missing | No update API for department (only create/delete) | P1 | 1 day | Add `PUT /departments/:id` |
| **Pagination** | ⚠️ Partial | Students list has 50-cap; courses/results/reports/audit have no pagination | P1 | 3–5 days | Add pagination (skip/take + page control) to all list endpoints |
| **Notifications** | ❌ None | No email or in-app notifications for approvals, publication, errors | P1 | 1 week | Add `Notification` model + email service (SendGrid/etc.) for approval chain events |
| **Carryover tracking UI** | ⚠️ Backend only | API endpoint exists; no frontend page | P1 | 1–2 days | Build carryover tracking page with at-risk flags |
| **Bulk level promotion** | ⚠️ Component exists, never wired | `BulkLevelUpdate.tsx` exists, backend route exists, but no page uses it | P1 | 1 day | Wire into students page |
| **Configurable grading** | ❌ Hardcoded scale | Grades, boundaries, class-of-degree, carryover rules hardcoded | P1 | 1–2 weeks | GradingScale + GradingPolicy entities (see GPA_LOGIC.md) |
| **Result history** | ❌ Missing | No audit trail for score changes | P1 | 3–5 days | Add `ResultVersion` model; log every change |
| **CSV/Excel export** | ❌ Missing | No data export for students, results, audit, reports | P2 | 3–5 days | Add export buttons (XLSX) to all list pages |
| **Printable result slips** | ❌ Missing | Transcript PDF exists (HOD/Dean only); no per-semester result slip for students | P2 | 2–3 days | Add `GET /reports/result-slip/:studentId` PDF |
| **At-risk identification** | ❌ Missing | No flagging of students with failing trends, many carryovers, or graduation risk | P2 | 1 week | Add analytics endpoint + dashboard widget |
| **Dashboard GPA distribution chart** | ⚠️ Data computed, not visualized | Backend returns distribution but frontend uses CSS bars, not chart.js | P2 | 1 day | Use chart.js (already installed) |
| **Course allocation / lecturer workload** | ❌ Missing | No `CourseAssignment`/`LecturerCourse` model | P2 | 1–2 weeks | Add model + UI for assigning lecturers to courses |
| **Audit log explorer** | ⚠️ Basic | List by entity or actor; no date/action/user filters, no export | P2 | 2–3 days | Add filters + export |
| **API versioning + docs** | ❌ Missing | No version prefix; no OpenAPI spec | P3 | 2–3 days | Mount at `/api/v1/`; add swagger-jsdoc |
| **Docker + CI/CD** | ❌ Missing | No containerization, no automated pipeline | P3 | 1 week | Add Dockerfile, compose, GitHub Actions |
| **PDF branding** | ❌ Plain | No university logo, letterhead, or watermark on PDFs | P3 | 2–3 days | Accept logo image via config; add to PDFKit |
| **Accessibility** | ⚠️ Partial | Modal uses Headless UI; no full audit | P3 | 1 week | Add ARIA, keyboard nav, color contrast check |
| **Attendance / scheduling** | ❌ Missing | Out of core GPA scope | P3 | Defer | Not needed for MVP |
| **Assignment submission** | ❌ Missing | Out of core GPA scope | P3 | Defer | Not needed for MVP |
| **Parent portal** | ❌ Missing | Niche feature | P3 | Defer | Not needed for MVP |