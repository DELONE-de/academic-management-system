# Architecture — Supporting Document

## Overview

Two-tier application:
- **Backend:** Node.js/Express (TypeScript ESM), Prisma ORM → PostgreSQL (Supabase)
- **Frontend:** Next.js 14 (App Router) + React 18, Tailwind CSS, Axios, react-hook-form

The system's defining feature is the AI-assisted upload pipeline that extracts student records and scores from Excel/CSV/PDF/image files, validates them via AI function-calling, and routes flagged issues through a human-in-the-loop review center before persisting.

## Backend structure

```
backend/src/
├── app.ts                  # Express bootstrap: helmet, cors, morgan, json, routes, error handling
├── config/
│   ├── database.ts         # Prisma singleton + connect/disconnect + stuck-job recovery
│   └── jwt.ts              # JWT sign/verify/extract
├── controllers/            # Thin HTTP handlers (auth, course, department, gpa, report, result, student)
├── services/               # Business logic (auth, course, department, gpa, report, result, student, upload)
├── routes/                 # Express routers (auth, course, department, gpa, report, result, review, student, upload, approval, audit, index)
├── middleware/
│   ├── auth.middleware.ts  # authenticate (JWT), authorize (role), restrictToDepartment, restrictToFaculty
│   ├── error.middleware.ts # AppError, errorHandler, notFoundHandler
│   ├── upload.middleware.ts# Multer config (20MB AI, 10MB Excel), MIME/extension filtering
│   └── validation.middleware.ts # Zod validateBody/validateQuery/validateParams
├── ai/
│   ├── gemini.ts           # Gemini 2.0 Flash: vision OCR, structured extraction, function-calling validation, GPA explanation
│   ├── groq.ts             # Groq llama-3.3-70b fallback: same extraction + validation
│   └── validation.tools.ts # Function declarations + handlers (validateStudent, validateCourse, checkRegistration, findDuplicateStudents, saveResult)
├── validators/             # Zod schemas for request bodies
├── utils/
│   ├── grading.ts          # Nigerian 5-point grading scale, GPA/CGPA, class of degree
│   ├── excel.ts            # XLSX parse, templates, error files
│   ├── file-extractor.ts   # Extract content from Excel/CSV/PDF/image
│   ├── pdf-generator.ts    # PDFKit transcripts + department reports
│   └── response.ts         # sendSuccess/sendError/... helpers
├── types/index.ts          # Shared TS types
└── __tests__/bulk.test.ts  # Broken test file (references removed routes)
```

## Frontend structure

```
frontend/src/
├── app/
│   ├── (auth)/login/page.tsx, signup/page.tsx, setup/page.tsx
│   ├── (dashboard)/        # dashboard, students(+new/+upload/+[id]), courses, scores(+/upload), gpa, cgpa, reports, approval, review/[jobId], departments
│   ├── layout.tsx          # Root: AuthProvider + Toaster
│   └── page.tsx            # redirect → /login
├── components/
│   ├── ui/                 # Button, Card, Input, Select, Table, Modal, FileUpload
│   ├── layout/             # DashboardLayout, Header, Sidebar
│   ├── forms/              # StudentForm (used), CourseForm (dead)
│   └── BulkLevelUpdate.tsx # Dead (never wired)
├── context/AuthContext.tsx # Auth state (localStorage-backed)
├── hooks/                  # useAuth, useFetch (useFetch is dead)
├── lib/                    # api.ts (Axios client + API modules), utils.ts
└── types/index.ts
```

## Data flow — AI upload pipeline (core differentiator)

1. `POST /api/upload` (SSE) → `upload.routes.ts` → `processUpload()` in `upload.service.ts`
2. `extractFileContent()` → structured rows (Excel/CSV) OR Gemini vision/text extraction (PDF/image)
3. `geminiValidateWithTools()` — agentic loop: Gemini calls `checkRegistration`/`validateCourse`/`saveResult`/etc. (Groq fallback on quota)
4. Issues with confidence < 0.9 → `ReviewItem` rows → job status `NEEDS_REVIEW`
5. `POST /api/review/:itemId` (accept/reject/edit) → `commitReviewItem()` → `saveResult()` writes to `Result`
6. Batch approval workflow (`approval.routes.ts`) → PUBLISHED

> ⚠️ Note: step 3's `saveResult` already writes results during validation — the review step is corrective, not gating (see main audit §6.5).

## Data flow — GPA recalculation

- Result created/updated/deleted → `gpaService.calculateSemesterGPA(studentId, level, semester, year)` → upserts `SemesterGPA` (gpa, totalUnits, totalPoints, cumulativeGpa, cumulativeUnits)
- CGPA = Σ all `SemesterGPA` records for the student
- Reports read `SemesterGPA` snapshots

## Key architectural strengths
- Controller → Service → Prisma separation
- Transactional approval updates
- Stuck-job recovery
- Clean reusable UI primitives

## Key architectural debt
- Fat routes (logic embedded in routes: gpa `/explain`, dashboard aggregation, upload, review)
- Duplicate result-write logic (4 implementations)
- Inconsistent authz scoping (many reads unscoped)
- No institution layer (single-institution hardcoded)
- No background jobs (AI validation runs synchronously in the SSE request)