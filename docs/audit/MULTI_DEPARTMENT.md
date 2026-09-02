# Multi-Department Readiness — Supporting Document

## Current state

The system is designed for **one institution** (one faculty "Basic Medical Sciences" with 10 departments seeded). The schema, code, and logic all assume a single institution with a shared grading scale, level system, and role model.

## Key blockers for multi-department/institution support

### Schema
| Blocking Issue | File | Required Change |
|---|---|---|
| No `Institution` model | `schema.prisma` | Add `Institution` with `id`, `name`, `code`, `slug`; add `institutionId` FK to `Faculty`, `User`, `Department` |
| `Department.code` globally unique | `schema.prisma:106` | Change to `@@unique([code, facultyId, institutionId])` |
| `Faculty.name` and `code` globally unique | `schema.prisma:87-88` | Change to `@@unique([code, institutionId])` |
| `Level` is a fixed enum | `schema.prisma:29-39` | Replace with `Level` table (institution-configurable) or at minimum add institution-level prefix |
| `Semester` is a fixed FIRST/SECOND enum | `schema.prisma:24-27` | Some institutions have trimesters, quarters, or 3 semesters |
| No `Program` entity | schema | Programs (ND, HND, B.Sc, etc.) should be a model with institution reference |
| No `AcademicSession`/`Calendar` | schema | Sessions should be modeled with start/end dates, current-flag, institution reference |
| `User.role` is a fixed enum | `schema.prisma:17-22` | Role should be a join table (`UserRole` with `departmentId`/`institutionId` scope) |

### Grading
| Hardcoded | File | Impact |
|---|---|---|
| Grade boundaries (A≥70, B≥60…) | `utils/grading.ts:30-35` | Institution cannot use e.g., 4.0 scale, or A≥75 |
| Grade point values (A=5, B=4…) | `utils/grading.ts:30-35` | Can't use 4.0 max |
| Class-of-degree bands | `utils/grading.ts:109-116` | Fixed thresholds |
| Carryover/repeat rules absent | `utils/grading.ts` | No per-policy variation |
| Rounding: 2dp via Math.round | `utils/grading.ts:80,100` | Some institutions use 3dp or truncation |

### Authorization
| Issue | Impact |
|---|---|
| Roles are global enum, not scoped per department | Can't have a Lecturer in dept A who cannot access dept B |
| No per-institution admin | A single global admin can't be delegated to each institution |
| No per-department Examination Officer | A person can't be Exam Officer for dept A only |
| No auditor/read-only role | Auditors need cross-department read-only access |

### Seed/onboarding
| Issue | File | Impact |
|---|---|---|
| Seed creates one faculty only | `prisma/seed.ts:24-30` | New institution needs code changes |
| Seed creates HIM courses only | `prisma/seed.ts:136-390` | Other departments get no courses |
| No onboarding flow | — | No "new department self-configures" UI |
| Public signup creates HOD for any department | `auth.routes.ts:24-25` | No admin approval workflow |

### API/authorization
| Issue | Impact |
|---|---|
| Many endpoints lack department scoping (see §10/S5) | Cross-department data access |
| Upload/review endpoints authorize all 4 roles equally | A Lecturer from dept A can review uploads from dept B |
| No `institutionId` parameter on any API call | All queries are institution-blind |

## What needs to change

### Phase 1 — Schema migration
```prisma
model Institution {
  id          String   @id @default(cuid())
  name        String   @unique
  code        String   @unique
  slug        String   @unique
  config      Json?    // Default grading scale, pass mark, etc.
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  faculties   Faculty[]
  users       User[]
  departments Department[]
}
```

### Phase 2 — Grading configuration
`GradingScale` + `GradingBand` + `GradingPolicy` per institution or department (see GPA_LOGIC.md).

### Phase 3 — RBAC
`Permission` + `Role` + `UserRole` join tables with `institutionId` and `departmentId` scoping (see §11.3).

### Phase 4 — Onboarding
A self-service wizard for new departments:
1. Select or create institution
2. Create faculty + department
3. Configure grading scale + pass mark
4. Set up academic sessions
5. Create first HOD
6. Import students + courses or use templates

### Phase 5 — Remove hardcoded assumptions
- `grading.ts` → reads from `GradingPolicy`
- `getClassOfDegree` → reads from `GradingPolicy` bands
- `Level` enum → reads from `Level` table
- `Semester` → reads from `AcademicSession` table
- `academicYear` → derived from `AcademicSession` dates
- Seed script → generates from config, not hardcoded values