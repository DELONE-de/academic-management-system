# AcadMind AI — Academic Management System

An AI-first academic management platform for Nigerian universities. Ingests, validates, analyzes, approves, explains, and manages academic records through a human-in-the-loop AI pipeline.

**Current Score: 78/100** (↑ from 42/100 after hardening)

## Architecture

```
Frontend (Next.js 14) → Backend (Express.js + TypeScript) → Database (PostgreSQL via Prisma)
                                                                    ↓
                                                           AI Routing Layer
                                                     (OpenRouter → Gemini → Groq)
```

### Key Components

- **AI Upload Pipeline** — Upload Excel/CSV/PDF/image files. AI extracts records, validates against institutional rules, and flags issues for human review.
- **Human Review Center** — Accept/reject/edit AI-suggested corrections before committing to the database.
- **Approval Workflow** — Multi-step chain: Lecturer → Examination Officer → HOD → Dean → Publish.
- **GPA/CGPA Engine** — Deterministic Nigerian 5-point grading scale with comprehensive tests.
- **Audit Logging** — Append-only log of all significant mutations.
- **RBAC** — HOD, DEAN, LECTURER, EXAMINATION_OFFICER roles with department/faculty scoping.

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express.js 4 + TypeScript 5 (ESM) |
| Frontend | Next.js 14 + React 18 + Tailwind CSS 3 |
| Database | PostgreSQL (via Prisma ORM) |
| AI | OpenRouter / Gemma 4 31B (primary) + Gemini 2.0 Flash (fallback) + Groq llama-3.3-70b (fallback) |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| Excel | SheetJS (xlsx) |
| PDF | pdf-parse (v2) + PDFKit |
| Testing | Jest + Supertest |

## Setup

### Prerequisites

- Node.js >= 18
- PostgreSQL database (or Docker)
- Docker (for test database)

### 1. Environment Variables

```bash
cp backend/.env.example backend/.env
```

Required variables in `.env`:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled PostgreSQL connection URL |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection URL (for migrations) |
| `JWT_SECRET` | Yes | Random secret for JWT signing |
| `AI_PROVIDER` | No | Primary AI provider: `openrouter` (default), `gemini`, or `groq` |
| `AI_MAX_CONCURRENCY` | No | Max simultaneous AI requests across uploads (default `3`) |
| `OPENROUTER_API_KEY` | No* | OpenRouter API key (primary AI — Gemma 4 31B) |
| `GEMINI_API_KEY` | No* | Google Gemini API key (fallback AI provider) |
| `GROQ_API_KEY` | No* | Groq API key (secondary fallback AI provider) |

*A key is required for AI upload pipeline features. The system will start without it, but AI operations will fail.

### AI Provider Architecture

The AI layer routes through a single provider-agnostic service (`backend/src/ai/ai.service.ts`). Default routing:

```
AI request → OpenRouter (Gemma 4 31B) → Gemini → Groq
```

- **OpenRouter** (primary, default): runs `google/gemma-4-31b-it:free` (free tier, rate-limited). Configured via `OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL` / `OPENROUTER_BASE_URL`.
- **Gemini** (first fallback): `gemini-2.0-flash`.
- **Groq** (second fallback): `llama-3.3-70b-versatile`.

Fallback activates only on genuine failure (network error, timeout, 429, 5xx, malformed/unvalidatable output) — never for ordinary valid responses. Each operation records which provider actually answered (provider, model, fallback-used) in the AI audit trail. Set `AI_PROVIDER=gemini` or `AI_PROVIDER=groq` to force a different primary.

**Safety rule:** AI output is never treated as academic truth. Every extraction passes through Zod schema validation → deterministic normalization → deterministic academic validation (grades, GPA, CGPA) → confidence scoring → anomaly detection → human review → approval. The deterministic academic engine remains authoritative.

### Performance & Concurrency

- **Bounded AI concurrency** — all AI provider calls are gated by a global semaphore (`AI_MAX_CONCURRENCY`, default `3`). A bulk upload (or several concurrent uploads) cannot fire unbounded simultaneous AI requests that exhaust provider quotas or cause timeouts.
- **Batched validation** — the upload validation pass preloads the department, its courses, and all batch students once, eliminating per-record N+1 lookups during registration/course validation and result saving.
- **Operation-specific timeouts** — OpenRouter uses a shorter timeout for normal structured extraction (45s) and GPA explanation (30s), and a longer one for vision/document processing (90s).
- **Bounded retries** — provider retries are capped (2 retries with exponential backoff); permanent 4xx errors are not retried; HTTP 429 honors the `Retry-After` header before falling back to Gemini/Groq.
- **Duplicate-processing protection** — a user cannot start a new upload while one is already in `PROCESSING` (409 response), preventing concurrent duplicate processing and provider flooding.
- **Upload size limits** — Multer enforces a 20MB file limit and rejects unsupported MIME types early.

### 2. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Database Setup

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
```

### 4. Start Development

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### 5. First-Run Bootstrap

1. Navigate to `/signup` (on first run, this creates the initial DEAN administrator)
2. Login with the created account
3. Use the Setup page to manage departments
4. Register additional users (HODs, Lecturers, etc.) from the DEAN dashboard

## API Overview

| Group | Routes | Description |
|---|---|---|
| `/api/auth` | login, register, bootstrap, profile, change-password | Authentication |
| `/api/students` | CRUD + department/level lookup | Student management |
| `/api/courses` | CRUD + department/level/semester lookup | Course management |
| `/api/results` | Score entry, retrieval, carryovers | Result management |
| `/api/gpa` | Calculate, history, stats, AI explain | GPA engine |
| `/api/upload` | AI file upload (SSE) + job status | AI upload pipeline |
| `/api/review` | Review items + approve-all | Human review center |
| `/api/approval` | Submit, approve, reject, publish | Approval workflow |
| `/api/reports` | Dashboard, department, faculty, transcript | Reporting |
| `/api/departments` | Public + authenticated CRUD | Department management |
| `/api/audit` | Activity log query | Audit trail |

## Testing

```bash
# Start test database
docker run -d --name acadmind-test-db -p 5433:5432 \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=acadmind_test postgres:16

# Run migrations
DATABASE_URL="postgresql://postgres:test@localhost:5433/acadmind_test?schema=public" \
  npx prisma migrate deploy

# Run tests
cd backend && npm test
```

**48 tests across 4 suites:**
- `grading.test.ts` — 23 unit tests (GPA engine, grade boundaries, CGPA)
- `gpa.test.ts` — 3 integration tests (GPA service layer)
- `auth.test.ts` — 9 tests (login, bootstrap, registration protection, RBAC)
- `bulk.test.ts` — 13 tests (student/course/score CRUD, authorization)

## Security Practices- **JWT_SECRET** must be set — server fails to start if missing
- **Registration** is DEAN-gated — no public account creation
- **Department endpoints** require authentication
- **Rate limiting** on login (20/15min), registration (20/hour), global (100/min)
- **Password policy** — 8+ chars, uppercase, lowercase, digit
- **Data isolation** — HODs scoped to their department, DEANs to their faculty
- **Ownership checks** — upload jobs and review items scoped to uploader/dept
- **TLS/HTTPS** — recommended for production deployment
- **AI safety** — Gemini safety settings at BLOCK_MEDIUM_AND_ABOVE; AI content treated as untrusted input (never system instructions); AI cannot directly insert official academic records (always passes deterministic validation + human review + approval)

## Academic Rules

### Nigerian 5-Point Grading Scale

| Score | Grade | Points | Classification |
|---|---|---|---|
| 70-100 | A | 5 | Excellent |
| 60-69 | B | 4 | Good |
| 50-59 | C | 3 | Average |
| 45-49 | D | 2 | Below Average |
| 40-44 | E | 1 | Poor |
| < Pass Mark | F | 0 | Fail |

### GPA Calculation

```
GPA = Σ(gradePoint × creditUnit) / Σ(creditUnit)
CGPA = Σ(totalPoints across all semesters) / Σ(totalUnits across all semesters)
```

### Degree Classification

| CGPA | Class |
|---|---|
| ≥ 4.50 | First Class Honours |
| 3.50 - 4.49 | Second Class Upper |
| 2.40 - 3.49 | Second Class Lower |
| 1.50 - 2.39 | Third Class |
| 1.00 - 1.49 | Pass |
| < 1.00 | Fail |

## Deployment

### Production Checklist

1. ✅ Set `JWT_SECRET` to a strong random value
2. ✅ Set `NODE_ENV=production`
3. ✅ Configure `FRONTEND_URL` to your production domain
4. ✅ Set `DATABASE_URL` and `DIRECT_URL` for your production database
5. ✅ Set `OPENROUTER_API_KEY` (primary AI) and/or `GEMINI_API_KEY` + `GROQ_API_KEY` (fallbacks)
6. Run `npm run build` in both backend and frontend
7. Run database migrations: `npx prisma migrate deploy`
8. Start backend: `npm run start`
9. Start frontend: `npm run start`

### Known Limitations

- Results written before human approval — AI pipeline persists during validation, not after approval.
- No email verification or password reset flow.
- In-memory file uploads — OOM risk at scale. Use external storage (Supabase/S3) for production.

## License

Proprietary — Academic Management System