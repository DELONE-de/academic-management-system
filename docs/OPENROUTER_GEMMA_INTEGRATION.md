# AcadMind AI — OpenRouter / Gemma 4 31B Primary AI Provider

**Date:** September 2, 2026
**Status:** Implemented, tested, committed, and pushed (`4d2dd2b`)

---

## Summary

AcadMind AI now runs **Google Gemma 4 31B (free) via OpenRouter** as its **primary AI provider**, with **Gemini 2.0 Flash** and **Groq llama-3.3-70b** as automatic fallbacks.

The system remains a modular monolith. The deterministic academic engine (grades, GPA, CGPA, carryovers, class of degree) remains authoritative. AI output always passes schema validation → normalization → deterministic validation → confidence scoring → anomaly detection → human review → approval before becoming an official academic record.

---

## Architecture

```
                 ACADMIND AI
                      │
                      ▼
          OpenRouter / Gemma 4 31B        ← PRIMARY (default)
                      │
          ┌───────────┴───────────┐
          │                       │
       success                  failure
          │                       │
          ▼                       ▼
      Validate                 Gemini        ← FALLBACK 1
          │                       │
          ▼                    failure
     Normalize                    │
          │                       ▼
          ▼                     Groq          ← FALLBACK 2
     Confidence                   │
          │                       │
          ▼                       ▼
      Anomaly                 Validate
       Check                     │
          │                       │
          └───────────┬───────────┘
                      ▼
             Human Review
                      │
                      ▼
                  Approval
                      │
                      ▼
                 Publication
```

### Provider Layer

```
AIProvider (ai.service.ts)
├── OpenRouterGemmaProvider   ← PRIMARY   (openrouter.ts)
├── GeminiProvider            ← FALLBACK  (gemini.ts)
└── GroqProvider              ← FALLBACK  (groq.ts)
```

The application depends on the `ai.service.ts` routing layer, never on a specific vendor.

### Default Routing

```
AI request → OpenRouter (google/gemma-4-31b-it:free) → Gemini → Groq
```

Set `AI_PROVIDER=gemini` or `AI_PROVIDER=groq` to force a different primary.

---

## New / Changed Files

### New files

| File | Purpose |
|---|---|
| `backend/src/ai/openrouter.ts` | OpenRouter provider — Gemma 4 31B requests, timeout/retry, multimodal input, JSON parsing, Zod output validation |
| `backend/src/ai/ai.service.ts` | Provider-agnostic routing: OpenRouter → Gemini → Groq with fallback metadata |

### Changed files

| File | Change |
|---|---|
| `backend/src/ai/audit.ts` | `AIAuditEntry.provider` extended to `'openrouter' \| 'gemini' \| 'groq'` |
| `backend/src/services/upload.service.ts` | Extraction + validation now routed through `ai.service.ts` |
| `backend/src/routes/gpa.routes.ts` | GPA explanation routed through `aiExplainGPA` |
| `backend/src/config/env.ts` | Validates `AI_PROVIDER` value; warns when `OPENROUTER_API_KEY` missing |
| `backend/.env.example` | Documents `AI_PROVIDER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL` |
| `README.md` | Provider architecture, routing, safety rules, deployment checklist |

---

## Environment Variables

Add to `backend/.env`:

```env
# --- Primary AI Provider ---
AI_PROVIDER=openrouter                # openrouter | gemini | groq

# --- OpenRouter (PRIMARY) ---
OPENROUTER_API_KEY=                   # from https://openrouter.ai/keys
OPENROUTER_MODEL=google/gemma-4-31b-it:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# --- Fallbacks (keep existing) ---
GEMINI_API_KEY=
GROQ_API_KEY=

# Optional — sent to OpenRouter as HTTP-Referer
APP_URL=http://localhost:5000
```

**Never expose these to the frontend.** The frontend communicates only with the backend.

---

## Fallback Conditions

The system falls back **only** on genuine failure:

- Network failure
- Request timeout (60s)
- Provider unavailable
- HTTP 429 (rate limit)
- 5xx provider error
- Malformed / unvalidatable structured output (after up to 2 retries)

Fallback is **not** used for ordinary valid responses. Each operation records which provider actually answered.

### Example audit metadata

```json
{
  "provider": "openrouter",
  "model": "google/gemma-4-31b-it:free",
  "fallbackUsed": false,
  "promptVersion": "v1"
}
```

---

## Provider Resilience

- Explicit 60-second request timeout (AbortController)
- Up to 2 retries with exponential backoff (500ms, 1s)
- Retries 429 and temporary 5xx (500, 502, 503, 504)
- Does **not** retry permanent 4xx validation failures indefinitely
- No infinite fallback loops — final state is a controlled review/error state

### Rate Limits (free model)

The `google/gemma-4-31b-it:free` model is rate-limited. The system:
- Handles HTTP 429 cleanly
- Falls back to Gemini/Groq when configured
- Does not expose raw provider errors to users
- Records provider rate-limit events in the AI audit trail

---

## AI Task Routing

| Task | Primary | Fallback | Notes |
|---|---|---|---|
| Student extraction | OpenRouter | Gemini → Groq | Zod-validated JSON |
| Result extraction | OpenRouter | Gemini → Groq | Zod-validated JSON |
| Validation pass | OpenRouter | Gemini → Groq | Uses deterministic tool dispatch (Gemma doesn't reliably do function-calling) |
| GPA explanation | OpenRouter | Gemini → Groq | Grounded in verified data only |
| Vision / document understanding | OpenRouter (multimodal) | Gemini | Hybrid: deterministic parsers used for XLSX/CSV/PDF text first |

Deterministic parsers (XLSX, CSV, PDF text extraction) are **kept** — AI is only used where semantic reasoning adds value.

---

## Safety & Academic Integrity (unchanged rules)

- **AI never becomes academic truth.**
- AI output → schema validation → normalization → deterministic academic validation → confidence scoring → anomaly detection → human review → approval → official result.
- The deterministic engine remains authoritative for: scores, grades, grade points, units, GPA, CGPA, carryovers, pass/fail, class of degree.
- `saveResult()` transaction protection remains intact.
- AI may extract, normalize, match, explain, classify, detect anomalies, and recommend — never calculate or override.

---

## Testing

Backend: **67 tests passing** (6 suites).

Coverage relevant to this change:
- Grading engine unit tests (deterministic authority preserved)
- Auth / RBAC tests
- IDOR / access-control tests
- Approval workflow tests
- GPA service integration tests

Provider tests use **mocked HTTP** — no live OpenRouter/Gemini/Groq calls in CI.

### Test matrix (provider behavior)

| Scenario | Expected |
|---|---|
| Gemma request succeeds | No fallback; provider = `openrouter` |
| Gemma fails (network/429/5xx) | Fallback to Gemini |
| Gemma + Gemini fail | Fallback to Groq |
| All providers fail | Controlled empty/review state, terminal audit entry |
| Valid AI JSON | Accepted |
| Malformed AI JSON | Rejected → retry → fallback |
| AI says wrong grade | Deterministic grade wins |

---

## Deployment Checklist (AI)

1. Set `OPENROUTER_API_KEY` (from https://openrouter.ai/keys)
2. Keep `GEMINI_API_KEY` and `GROQ_API_KEY` as fallbacks
3. Optional: set `OPENROUTER_MODEL` / `OPENROUTER_BASE_URL` / `APP_URL`
4. Run `npx prisma migrate deploy` (schema unchanged by this work)
5. Start backend, then frontend

---

## Future Considerations

- **Prompts**: currently centralized in `src/ai/prompts.ts` with `PROMPT_VERSION = 'v1'`. Future versions can be tracked per provider.
- **Confidence / anomaly**: `src/ai/confidence.ts` and `src/ai/anomaly.ts` already provide evidence-based scoring and deterministic anomaly detection; these remain authoritative over model-provided confidence.
- **Rate limits**: consider a per-user concurrency cap for uploads if the free OpenRouter tier becomes a bottleneck.
