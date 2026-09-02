# AcadMind AI — Upload Performance & Concurrency Hardening

**Date:** September 2, 2026
**Status:** Implemented, tested, committed, and pushed (`f246f93`)

---

## Summary

Focused performance and reliability pass on the existing AI upload/result-processing pipeline. The goal: prevent bulk uploads from generating excessive simultaneous AI requests, exhausting provider quotas, causing request timeouts, blocking the Node.js process, creating duplicate processing, or overwhelming the database.

No new product features. No architectural rewrite. The deterministic academic engine, human-review workflow, approval workflow, and modular monolith structure are preserved.

---

## Before / After

### Concurrency

| | Before | After |
|---|---|---|
| Simultaneous AI calls | **Unbounded** — each upload fired its own provider requests concurrently | **Bounded** — global semaphore caps simultaneous AI requests at `AI_MAX_CONCURRENCY` (default **3**) |

### Timeout

| | Before | After |
|---|---|---|
| All AI operations | Single 60s timeout | Operation-specific: extraction **45s**, vision **90s**, explanation **30s** |

### Validation database access

| | Before | After |
|---|---|---|
| `groqValidateWithTools` results path | Per-record DB lookups (student + department courses re-fetched for every record) | Preloads department/courses/students **once**; per-record validation uses in-memory context |

### Duplicate processing

| | Before | After |
|---|---|---|
| Concurrent uploads by one user | No guard | HTTP **409** while a `PROCESSING` job exists (< 10 min) |

---

## What Changed

### 1. Bounded AI concurrency

**Files:**
- `backend/src/utils/concurrency.ts` (NEW) — lightweight async `Semaphore`
- `backend/src/ai/ai.service.ts` — every provider attempt wrapped in the global semaphore

**Behavior:**

```
100 records (or N concurrent uploads)
        ↓
maximum 3 AI operations at once (AI_MAX_CONCURRENCY)
        ↓
remaining work waits
```

- Configurable via `AI_MAX_CONCURRENCY` environment variable (default 3).
- Extraction remains **one AI call per document** (batched), not one per record.
- No queueing subsystem added — a simple semaphore, consistent with the modular monolith.

### 2. Batch validation (N+1 fix)

**Files:**
- `backend/src/ai/validation.tools.ts` — added `loadBatchValidationContext()`; threaded an optional `BatchValidationContext` through `validateStudent`, `checkRegistration`, `validateCourse`, `saveResult`
- `backend/src/ai/groq.ts` — `groqValidateWithTools` loads the context once and passes it to per-record validation

**Effect:**
- Department, its courses, and all batch students are queried **once** per upload.
- Per-record `checkRegistration`, `validateCourse`, and `saveResult` read from the preloaded maps instead of re-querying.
- The Gemini function-calling path (`dispatchToolCall`) still uses DB-backed originals — behavior unchanged for that path.

### 3. Operation-specific timeouts (OpenRouter)

**File:** `backend/src/ai/openrouter.ts`

```ts
export const OPERATION_TIMEOUTS = {
  extraction:  45_000,  // normal structured extraction
  vision:      90_000,  // vision/document processing can be slower
  explanation: 30_000,  // simple GPA explanation
};
```

- Structured extraction: **45s**
- Vision / document processing: **90s**
- GPA explanation: **30s**

### 4. Bounded retries + rate-limit handling

**File:** `backend/src/ai/openrouter.ts`

- Max **2 retries** (3 attempts) with exponential backoff (500ms, 1s).
- Permanent 4xx (400, 401, 403, 404, 422) are **not** retried — they throw immediately and trigger provider fallback.
- HTTP 429 honors the **`Retry-After`** header (up to 120s) before falling back to exponential backoff.
- Timeout via `AbortController`; abort error message reflects the operation-specific timeout.

**Interaction (bounded, no multiplication):**

```
OpenRouter retries (≤3 attempts)
  × provider fallback (Gemini → Groq)      ← sequential, not multiplicative
  × upload concurrency (≤ AI_MAX_CONCURRENCY)
```

A single failed operation cannot produce `3 × 3 × 3 = 27` requests.

### 5. Duplicate-processing protection

**File:** `backend/src/routes/upload.routes.ts`

Before creating a new upload, the route checks whether the user already has a `PROCESSING` upload job created within the last 10 minutes. If so, it responds **409** with the active job id/file name, instructing the user to wait.

This protects against:
- double submit
- browser retry
- repeated API request
- SSE reconnect
- server retry

No distributed job queue was introduced.

### 6. Memory safety

- Multer memory storage with **20MB** file-size limit retained.
- Unsupported MIME types rejected early by the upload middleware.
- Single-buffer processing — no unnecessary copies added.
- Stale `PROCESSING` jobs are recovered (marked `REJECTED`) on server startup and after 10 minutes.

### 7. SSE progress (unchanged, provider-neutral)

Upload status messages remain provider-neutral (`Sending to AI for extraction...`) and cover:

```
Uploading → Parsing → Extracting → Normalizing → Validating → Review → Complete / Failed
```

Provider/API errors are not leaked through SSE — failures surface as a controlled `REJECTED` job + error event.

---

## Tests

**Total:** 87 passing across 8 suites (was 82 before this work).

### New tests

| Suite | Tests | Covers |
|---|---|---|
| `concurrency.test.ts` | 4 | Semaphore max concurrency respected (100 tasks → peak ≤ 3), serialization at max=1, `run()` releases on throw, rejects max<1 |
| `ai-provider.test.ts` | +2 | AI concurrency bound respected across 20 parallel extractions; permanent 4xx (non-429) is not retried |

All provider tests use **mocked modules** — no live OpenRouter/Gemini/Groq calls.

### Regression

The full existing suite (grading, GPA, auth, bulk, security/IDOR, approval) still passes — deterministic grades/GPA/CGPA, approval workflow, and access controls unchanged.

---

## Configuration

Add to `backend/.env` (optional):

```env
# Maximum simultaneous AI provider requests across all uploads (default 3)
AI_MAX_CONCURRENCY=3
```

---

## Remaining Performance Concerns

1. **Worst-case latency when ALL providers fail** — bounded but can reach ~5+ minutes (3 OpenRouter attempts × timeout + Gemini + Groq). Recommended next-phase work: reduce extraction timeout to 30s and/or add a per-user upload concurrency cap. Deferred intentionally (explicitly out of scope for this pass).
2. `enterScores` and `calculateDepartmentGPAs` N+1 issues were inspected — both were already optimized in earlier phases (batch course lookup / bounded concurrency), so no further change was needed here.
3. In-memory Multer storage remains acceptable at current scale; a controlled object-storage migration (e.g. Supabase Storage) is a candidate for a future infrastructure phase.

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/utils/concurrency.ts` | NEW async Semaphore |
| `backend/src/ai/ai.service.ts` | Gate provider attempts behind `AI_MAX_CONCURRENCY` semaphore |
| `backend/src/ai/validation.tools.ts` | `loadBatchValidationContext()`; context-aware validation handlers |
| `backend/src/ai/groq.ts` | Preload batch context once in `groqValidateWithTools` |
| `backend/src/ai/openrouter.ts` | Operation-specific timeouts; `Retry-After` handling |
| `backend/src/routes/upload.routes.ts` | Duplicate-processing guard (409 while PROCESSING) |
| `backend/.env.example` | Document `AI_MAX_CONCURRENCY` |
| `README.md` | Performance & concurrency section |
| `backend/src/__tests__/concurrency.test.ts` | NEW 4 semaphore tests |
| `backend/src/__tests__/ai-provider.test.ts` | +2 routing tests |

---

## Verification

- Backend: `npx tsc --noEmit` — no errors
- Backend tests: **87 passing / 8 suites**
- No live AI APIs used in tests
