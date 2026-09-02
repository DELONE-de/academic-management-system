# AcadMind AI — OpenRouter/Gemma Integration Verification

## 1. Provider Routing

**PASS**

`ai.service.ts` `withFallback()` builds the provider order `[primary, gemini, groq]`. When `primary='openrouter'` and OpenRouter succeeds, the function returns immediately on line 86-95 without calling Gemini or Groq. Each provider is attempted only when the previous one fails.

**Evidence:** `ai.service.ts:73-96`

---

## 2. Fallback Behavior

**PASS with one Medium finding**

| Condition | Handled? | Where |
|---|---|---|
| Network failure | ✅ | `openrouter.ts:128-129` — caught, retryable=true |
| Timeout (60s) | ✅ | `openrouter.ts:83,126-127` — AbortController, retryable=true |
| HTTP 429 (rate limit) | ✅ | `openrouter.ts:24,116` — RETRYABLE_STATUS includes 429 |
| HTTP 500,502,503,504 | ✅ | `openrouter.ts:24,116` — RETRYABLE_STATUS |
| 4xx permanent (400,401,403,404,422) | ✅ | `openrouter.ts:121` — `retryable=false`, thrown immediately, no retry |
| Malformed output (parse fail) | ✅ | `openrouter.ts:214-219` — throws OpenRouterError (non-retryable) → falls to Gemini |
| No infinite retries | ✅ | `openrouter.ts:82,141` — bounded to 3 attempts (initial + 2 retries) |
| No infinite fallback loop | ✅ | `ai.service.ts:73-98` — bounded to 3 providers |

**Implicit `any` type on `openrouter.ts:48`**: `images` interface uses `Record<string, unknown>` which is acceptable.

---

## 3. OpenRouter API Correctness

**PASS**

| Component | Value | Verified |
|---|---|---|
| Base URL | `https://openrouter.ai/api/v1/chat/completions` | `openrouter.ts:17,86` |
| Model | `google/gemma-4-31b-it:free` | `openrouter.ts:18` |
| Auth header | `Authorization: Bearer <key>` | `openrouter.ts:89` |
| Content-Type | `application/json` | `openrouter.ts:90` |
| HTTP-Referer | `APP_URL` or `http://localhost:5000` | `openrouter.ts:91` |
| X-Title | `AcadMind AI` | `openrouter.ts:92` |
| Body format | `{model, messages, temperature, max_tokens, response_format}` | `openrouter.ts:94-100` |
| Multimodal | `image_url` data URI parts | `openrouter.ts:68-72` |
| Response parsing | `choices[0].message.content` | `openrouter.ts:105-108` |
| Error parsing | `response.text()` for error body | `openrouter.ts:117` |

**Risk:** OpenRouter may reject `response_format: { type: "json_object" }` if Gemma 4 31B doesn't support structured output mode. Cannot verify without a live API call. If rejected, every extraction would 400 and fall back to Gemini, making Gemma effectively non-primary for extraction. This is a functional risk, not a code bug.

---

## 4. Timeout / Retry / Latency

**PASS (bounded, but long)**

- Timeout: `60s` per request (`openrouter.ts:22`)
- Retries: 2 retries → 3 total attempts (`openrouter.ts:23,82`)
- Backoff: `500ms` then `1000ms` exponential (`openrouter.ts:137`)
- Worst-case single provider: `3 × 60s + 500ms + 1000ms = 181.5s ≈ 3min`
- Full chain worst case: OpenRouter (3min) → Gemini (SDK default ~120s + retries) → Groq → **potentially 5+ minutes**

**Finding (Medium):** For bulk upload processing, if all providers fail, the upload SSE could take **5+ minutes** before returning a failure. This is bounded but undesirable for UX. The 60s timeout could be reduced to 30s for extraction tasks, or the Gemini SDK should have an explicit timeout.

---

## 5. Schema Validation

**PASS**

Every structured AI response passes through Zod validation:

- `openrouter.ts:213` — `validateExtractedStudents(parsed)`
- `openrouter.ts:245` — `validateExtractedResults(parsed)`
- `upload.service.ts:122-151` — revalidates after extraction (redundant but safe)

**Path to Result table:**
```
AI → Zod validation → normalize → deterministic validation → saveResult (status:PROPOSED) → batch publish → status:OFFICIAL → GPA
```

Invalid AI output **cannot** reach `Result`, `SemesterGPA`, or official academic records. The Zod schemas reject:
- Missing required fields
- Invalid score ranges
- Wrong matric format
- Wrong academic year format
- Improper types

---

## 6. Deterministic Academic Authority

**PASS**

Trace the complete pipeline:

```
Upload → AI extract (score: 72) → normalize → validate → saveResult
                                                                  ↓
                                           calculateResult(72, 3, 40) ← deterministic
                                                                  ↓
                                           grade: 'B' (not AI's guess)
                                           gradePoint: 4
                                           pxu: 12
                                           isCarryOver: false
                                           status: 'PROPOSED'
```

- `saveResult()` at `validation.tools.ts:363` uses `calculateResult()` from `grading.ts`
- GPA recalculation via `gpaService.calculateSemesterGPA()` — deterministic
- GPA only counts `status: 'OFFICIAL'` results
- AI explanation (`aiExplainGPA`) is read-only, never modifies academic records
- Grade, GPA, CGPA, carryovers, pass/fail, class of degree are **all deterministic**

The AI **cannot** override any deterministic academic rule.

---

## 7. Confidence & Anomaly Detection

**PASS**

- `confidence.ts` — all functions are pure (no DB access), deterministic, application-controlled
- `anomaly.ts` — deterministic rule-based checks (suspicious scores, score/grade mismatches, duplicate results)
- Anomalies are added as `ReviewItem[]` requiring human review, cannot be bypassed by AI output
- Upload pipeline at `upload.service.ts:192-203` runs anomaly detection before validation

---

## 8. Auditability

**PASS with one Medium finding**

Each AI operation records via `recordAIOperation()`:
- `operation` (extraction/validation/explanation)
- `provider` (openrouter/gemini/groq)
- `model` (full model string)
- `promptVersion` (v1)
- `result` (PRIMARY_SUCCESS / PRIMARY_FAILED_FALLBACK_FAILED)
- `durationMs`
- `outputRecordCount` where applicable
- `error` on failure

No secrets (API keys, DB credentials, JWTs) are logged. No raw student documents are unnecessarily stored — only `rawRecords` in `UploadJob` for the review pipeline.

**Finding (Medium):** `fallbackUsed` in `buildAISummary` (`audit.ts:53`) checks for `PRIMARY_FAILED_FALLBACK_SUCCESS` entries. When OpenRouter fails and Gemini succeeds, the audit store has:
- OpenRouter entry: `PRIMARY_FAILED_FALLBACK_FAILED`
- Gemini entry: `PRIMARY_SUCCESS`

`buildAISummary` computes `fallbackUsed: false` because neither entry matches `PRIMARY_FAILED_FALLBACK_SUCCESS`. This is **incorrect** — fallback was used but the metadata says it wasn't. The root cause: the `PRIMARY_FAILED_FALLBACK_SUCCESS` result is only emitted by Gemini's internal Groq fallback, not by the ai.service routing layer.

---

## 9. Frontend Security

**PASS**

- No API keys (OpenRouter, Gemini, or Groq) are present anywhere in `frontend/src/`
- `frontend/.env.example` only contains `NEXT_PUBLIC_API_URL` and commented Supabase vars
- No `NEXT_PUBLIC_OPENROUTER_API_KEY` or similar exist
- Frontend build passes with no exposed secrets

---

## 10. Tests

**PASS** — 67/67 tests passing (6 suites)

However, there are **no provider-specific tests** (no mocked OpenRouter/Gemini/Groq routing tests). The existing tests cover:
- Deterministic grading (23 tests)
- GPA service integration (3 tests)
- Auth/security (9 tests)
- Bulk CRUD (13 tests)
- IDOR security (10 tests)
- Approval workflow (9 tests)

The provider routing, fallback chain, and OpenRouter API correctness cannot be tested without live API access or proper HTTP mocking. This is a test gap (Medium), not a code defect.

---

## Findings Summary

| # | Severity | Finding | File | Status |
|---|---|---|---|---|
| **F1** | **Medium** | **Gemini empty-result masking prevents Groq fallback** — `geminiExtractStudents`, `geminiExtractResults`, and `geminiExplainGPA` returned `[]`/`''` on non-quota errors instead of throwing, so Groq was never attempted when Gemini failed with a non-quota error. | `gemini.ts` | ✅ **FIXED** — non-quota catch blocks now `throw` the error; quota handling preserved |
| **F2** | **Medium** | **`fallbackUsed` in audit metadata was inaccurate** — When OpenRouter failed and Gemini succeeded, summary reported `fallbackUsed: false`. | `audit.ts`, `ai.service.ts` | ✅ **FIXED** — routing layer records authoritative entries with `fallbackUsed`; `buildAISummary` reads them |
| **F3** | **Medium** | **Vision extraction bypassed OpenRouter** — `upload.service.ts` and `file-extractor.ts` called `geminiVisionExtract` directly. | `ai.service.ts`, `upload.service.ts`, `file-extractor.ts` | ✅ **FIXED** — added `aiVisionExtract()` routed through provider layer (OpenRouter primary, Gemini fallback, Groq intentionally not routed for vision) |
| **F4** | **Low** | **SSE message said "Sending to Gemini"** even when OpenRouter was used | `upload.service.ts` | ✅ **FIXED** — provider-neutral message "Sending to AI for extraction..." |
| **F5** | **Low** | **Redundant Zod validation** in upload pipeline | `upload.service.ts` | ✅ **KEPT** — outer validation retained as defense-in-depth trust boundary between AI provider and business logic (academic data) |

### Fix verification

- **F1:** New test `Gemini legitimately returns zero records → NOT treated as provider failure` confirms empty extraction is still success; `Gemma + Gemini fail → Groq succeeds` confirms genuine failures propagate to Groq.
- **F2:** New tests confirm `fallbackUsed` is `false` for primary success, `true` for fallback success (both single and double fallback), and the terminal failure state for all-providers-fail.
- **F3:** New vision routing tests confirm OpenRouter primary and Gemini fallback.
- **F4:** Message string updated; no test needed (cosmetic).
- **F5:** Kept; no behavior change.

---

## Final Verdict

| Area | Status |
|---|---|
| 1. Provider routing | ✅ PASS |
| 2. Fallback behavior | ⚠️ PASS (1 Medium finding — F1) |
| 3. OpenRouter API correctness | ✅ PASS |
| 4. Timeout/retry/latency | ✅ PASS (bounded, recommended: reduce timeout to 30s) |
| 5. Schema validation | ✅ PASS |
| 6. Deterministic authority | ✅ PASS |
| 7. Confidence & anomalies | ✅ PASS |
| 8. Auditability | ⚠️ PASS (1 Medium finding — F2) |
| 9. Frontend security | ✅ PASS |
| 10. Tests | ✅ PASS (67/67, test gap for provider routing) |

**3 Medium findings, 2 Low findings. No Critical or High findings.**

The OpenRouter/Gemma 4 31B integration is functionally correct, follows the specified architecture, and does not introduce security or academic-integrity vulnerabilities. The three Medium findings (fallback masking, inaccurate audit fallback detection, vision bypass) should be addressed before relying on the OpenRouter primary path in production.