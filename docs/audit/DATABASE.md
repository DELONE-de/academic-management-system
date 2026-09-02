# Database Audit — Supporting Document

## Schema summary (Prisma, `backend/prisma/schema.prisma`)

14 models, 7 enums. Migration history: `20260228153107_init` (core), `20260715143742_add_ai_pipeline_tables` (AI pipeline).

| Model | Table | Purpose | Key relations |
|---|---|---|---|
| Faculty | `faculties` | Top-level academic unit | → Department[], User[] (Deans) |
| Department | `departments` | Department within faculty | → Faculty, Student[], Course[], User[] (HODs), UploadJob[], ResultBatch[] |
| User | `users` | System user | → Department? (HOD), Faculty? (Dean), UploadJob[], ReviewItem[], ResultBatch[], BatchApproval[], AuditLog[] |
| Student | `students` | Student record | → Department, Result[], SemesterGPA[] |
| Course | `courses` | Course in a department | → Department, Result[] |
| Result | `results` | Course result for student | → Student, Course |
| SemesterGPA | `semester_gpas` | GPA snapshot per semester | → Student |
| UploadJob | `upload_jobs` | AI upload tracking | → User, Department, ReviewItem[] |
| ReviewItem | `review_items` | AI-flagged record | → UploadJob, User? (resolver) |
| ResultBatch | `result_batches` | Approval workflow group | → Department, User, BatchApproval[] |
| BatchApproval | `batch_approvals` | Approval step | → ResultBatch, User |
| AuditLog | `audit_logs` | Activity log | → User |

## Constraints & indexes

### Unique constraints
- `Faculty.name`, `Faculty.code`
- `Department.code` (⚠️ global — blocks cross-faculty reuse)
- `User.email`
- `Student.matricNumber`, `Student.email`
- `Course` `@@unique([code, departmentId])`
- `Result` `@@unique([studentId, courseId, academicYear])`
- `SemesterGPA` `@@unique([studentId, level, semester, academicYear])`

### Indexes
- `Student` `@@index([departmentId, currentLevel])`
- `Course` `@@index([departmentId, level, semester])`
- `Result` `@@index([studentId, level, semester])`
- `SemesterGPA` `@@index([studentId])`
- `AuditLog` `@@index([entityType, entityId])`, `@@index([actorId])`

## Data-integrity findings

| # | Issue | Impact |
|---|---|---|
| D1 | No `Institution` model; no `institutionId` anywhere | Cannot support multiple universities/campuses |
| D2 | `Department.code` globally unique | Blocks cross-faculty/institution reuse of codes |
| D3 | No `Program` model; programs conflated into `Level` enum | Cannot model ND vs B.Sc. vs diploma properly |
| D4 | No `AcademicSession` model; `academicYear` is free-text string | No date ranges, no current-session tracking, typo-prone |
| D5 | No `Level` table; fixed enum ND1–HND2 + 100–500 | Adding levels requires migration + validator edits |
| D6 | No result change history (`ResultVersion`) | Corrections are un-auditable |
| D7 | `SemesterGPA` snapshots can drift from `Result` | Stale CGPA displayed |
| D8 | `UploadJob.rawRecords` unsanitized JSON, unbounded | PII bloat, no retention policy |
| D9 | No soft-delete on any model | Hard cascading deletes = irreversible data loss |
| D10 | `User.role` is a fixed enum | Cannot model multi-role users or per-department roles |
| D11 | Missing indexes: `results(academicYear)`, `results(student.departmentId, level, semester)`, `result_batches` FKs | Report/query performance at scale |
| D12 | `seed.ts` deletes all tables at start | Running seed on prod wipes everything |
| D13 | No seed users | Cannot log in after seeding; relies on insecure public signup |

## Recommended schema additions (multi-department)

```prisma
model Institution {
  id        String   @id @default(cuid())
  name      String   @unique
  code      String   @unique
  slug      String   @unique
  config    Json?    // default grading scale, pass mark, branding
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  faculties Faculty[]
  users     User[]
}

// Add institutionId to Faculty, Department, User
model Program {
  id             String       @id @default(cuid())
  name           String
  code           String
  departmentId   String
  department     Department   @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  levels         ProgramLevel[]
  @@unique([code, departmentId])
}

model AcademicSession {
  id             String   @id @default(cuid())
  name           String   // "2026/2027"
  startDate      DateTime
  endDate        DateTime
  institutionId  String
  isCurrent      Boolean  @default(false)
  @@unique([name, institutionId])
}

model ResultVersion {          // immutable history
  id          String   @id @default(cuid())
  resultId    String
  result      Result   @relation(fields: [resultId], references: [id], onDelete: Cascade)
  score       Float
  grade       String
  gradePoint  Float
  changedById String
  changedAt   DateTime @default(now())
}
```

## Migration strategy
- Add `prisma migrate dev` to the documented setup flow.
- Run `prisma migrate deploy` in CI/CD before deploy.
- Add a backup step before every migrate.
- Never run `prisma/seed.ts` against a non-empty DB without `--force` and confirmation.