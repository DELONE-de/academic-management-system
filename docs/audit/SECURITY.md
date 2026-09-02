# Security Audit — Supporting Document

## Full vulnerability register

See main audit §10 for the severity table (S1–S23). This document provides additional context on the most impactful vulnerabilities.

### S1: Plaintext DB password in git
- **File:** `creds.txt` at repo root
- **Value exposed:** `Adeoluwa@2007$`
- **Risk:** Full database compromise (read/write all student/academic records, drop tables, ransomware)
- **Remediation:** Delete, rotate password, add to `.gitignore`, `git filter-branch` or BFG to remove from history if repo is public
- **Test:** Verify `creds.txt` is in `.gitignore` and `git log --all -- 'creds.txt'` is empty after cleaning

### S2: Public unauthenticated department write/delete
- **File:** `backend/src/routes/department.routes.ts:15-16`
- **Impact:** Anonymous user can `DELETE /api/departments/public/:id` — cascade deletes all students, courses, results, uploads, batches for that department. Total data-loss vector.
- **Remediation:** Move `POST /public` and `DELETE /public/:id` after `router.use(authenticate)`. Add `authorize('DEAN')` on delete.

### S5: Broken access control (IDOR)
- **Affected endpoints (all lack department/faculty scoping):**
  - `GET /api/results/student/:studentId`
  - `GET /api/results/student/:studentId/with-gpa`
  - `GET /api/results/carryovers/:studentId`
  - `GET /api/gpa/student/:studentId`
  - `GET /api/gpa/student/:studentId/history`
  - `GET /api/gpa/student/:studentId/explain`
  - `GET /api/reports/transcript/:studentId`
  - `GET /api/reports/transcript/:studentId/pdf`
  - `GET /api/reports/department/:departmentId` (DEAN scoping absent)
  - `GET /api/results/department/:departmentId` (DEAN scoping absent)
  - `GET /api/gpa/department/:departmentId/stats` (DEAN scoping absent)
  - `GET /api/students/:id` (HOD check only; DEAN unscoped)
  - `GET /api/upload/:jobId` (no ownership check)
  - `GET /api/review/:jobId` (no ownership check)
- **Remediation:** Centralize scoping in a `scopeToDepartment`/`scopeToFaculty` middleware or service wrapper. Every query on student/result/course must filter by `departmentId` from the user's session (or faculty's departments).

### S6: Results written before approval
- **File:** `backend/src/ai/validation.tools.ts:362-390` (`saveResult`)
- **Impact:** The AI pipeline upserts results and recalculates GPA during the validation loop — before any human review or batch approval. The approval workflow is therefore a "publish" workflow on already-saved data, not a true gating workflow.
- **Remediation:** Two-stage pipeline: (1) stage records (e.g., `StagedResult` table or keep in `rawRecords`), (2) after human review, commit in a transaction. Only commit to `Result`/`SemesterGPA` after batch approval.

### Credential security
- **JWT default secret** (`jwt.ts:7`): `'default-secret-change-in-production'` — change to fail-fast on missing env var
- **Password policy** (`auth.validator.ts:18`): min 6 chars, no complexity — change to 8+ chars, require uppercase, lowercase, digit, special
- **bcrypt 72-byte limit** (`auth.validator.ts:13`): max 100 chars but bcrypt truncates at 72 — cap at 72
- **No rate limiting**: login is brute-forceable at 100+ req/s
- **No account lockout**: no lockout after N failed attempts
- **No email verification**: registration is instant + public