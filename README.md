# AcadMind AI — Implementation Plan (Demo → SaaS)

## Guiding principle

Two tracks, not one push:

1. **Demo track** — prove the AI-review pattern works and looks like a real product. Fast, scrappy where it doesn't matter, polished where it does (upload flow, review center, dashboard).
2. **SaaS track** — only after the demo earns a "yes" from an HOD/Dean. This is where the framework migration, multi-tenancy, billing, and hardening happen.

Building both at once is how ambitious rewrites stall. Sequence them.

---

## Phase 0 — Decisions to lock before writing code

| Decision | Recommendation | Why |
|---|---|---|
| Backend framework for demo | **Keep Express** | Your GPA system's Express backend already has the schema, GPA logic, PDF/Excel generation working. NestJS migration is real effort — do it in Phase 2, after validation, not before. |
| AI provider | **Gemini** (per your plan), with Groq as fallback | You already have a proven Groq integration with human-in-the-loop review from the GPA project. Keep it as a fallback if Gemini rate limits or costs bite during the demo. |
| Database | **Supabase** | Fast to stand up, gives you Postgres + storage + auth in one place. Worth the switch even for the demo. |
| OCR / handwriting | **Typed/scanned docs as the core path; handwriting as a stretch demo, not a promise** | Even strong OCR/vision models misread handwritten digits. A misread "7" as "1" in front of a Dean kills credibility. Demo with clean typed scans first. |

If you want to follow the original NestJS-from-day-one plan instead, that's a valid call too — just know it adds ~1-2 weeks before you have anything demoable.

---

## Phase 1 — Demo track (target: 4-5 weeks, part-time pace)

### Week 1 — Foundation
- [ ] Set up Supabase project (Postgres + Storage + Auth)
- [ ] Port your existing Prisma schema (Student, Course, Result, SemesterGPA, Department, Faculty, User/HOD/Dean) — mostly reusable as-is
- [ ] Add new roles: **Lecturer**, **Examination Officer** (existing system only has HOD/Dean)
- [ ] Seed script: generate demo dataset — 500 students, 50 courses, 5 departments, 3 levels, 5,000+ results, **with intentional errors** (duplicate matric numbers, invalid scores, missing students, wrong course codes, unregistered students)

### Week 2 — AI Upload Pipeline (Module 4 & 5, the core differentiator)
- [ ] File upload endpoint: Excel, CSV, PDF, image
- [ ] Gemini function-calling setup: `extractStudents()`, `extractResults()` from uploaded files
- [ ] Backend validation tools Gemini can call: `validateStudent()`, `validateCourse()`, `checkRegistration()`, `findDuplicateStudents()`
- [ ] Confidence scoring per extracted field (this is what makes "AI Found 12 Issues, 9 Fixed, 3 Need Review" possible)
- [ ] AI Activity Feed — stream status updates during processing (Server-Sent Events or simple polling is enough; no need for websockets)

### Week 3 — Human Review Center (Module 6) + GPA Engine (Module 7)
- [ ] Review UI: Accept / Reject / Edit per flagged record
- [ ] Port your existing `grading.ts` logic (GPA, CGPA, degree classification) — already built and correct, just needs wiring to new endpoints
- [ ] AI explanation call: "why is this GPA 4.62" — one Gemini call summarizing the calculation in plain language

### Week 4 — Approval Workflow, Reports, Dashboard
- [ ] Approval chain: Lecturer → Exam Officer → HOD → Dean (optional), each step logged
- [ ] Audit log (Module 11) — simple append-only table is enough for the demo
- [ ] Reports: reuse your existing PDFKit/XLSX generation code for transcripts and department reports
- [ ] Dashboard cards + charts (Recharts): students, pending approvals, published results, GPA distribution, pass rate

### Week 5 — Polish, Landing Page, Rehearsal
- [ ] Landing page (Module 1): hero, features, workflow, security, request-demo CTA
- [ ] Full dry run of the demo script end to end — this is when you'll find the rough edges
- [ ] Cut anything that isn't load-bearing for the script. A working narrow path beats a broken wide one.

---

## Phase 2 — Post-demo hardening → SaaS

**Only start this after the demo gets real interest.** Rewriting before validation is the most common way this kind of project stalls.

- [ ] Migrate Express → NestJS **incrementally**, module by module — start with the least-coupled piece (reports), then auth, then the core result/GPA logic last
- [ ] Multi-tenancy: `institutionId` scoping on every table, row-level security policies in Supabase
- [ ] Billing integration (Paystack/Flutterwave — you've already scoped these for SendPadi, so the integration pattern transfers)
- [ ] Cost controls on Gemini calls: cache repeated validations, batch requests, set hard rate limits per institution
- [ ] Proper immutable audit log (not just the in-app feed)
- [ ] Load testing beyond demo scale (5,000 results was the demo target; real institutions will exceed that)
- [ ] Security pass: move JWT out of `localStorage` into httpOnly cookies, re-audit RBAC enforcement at the service layer, sanitize all file uploads

---

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Handwriting OCR misreads scores | Demo credibility | Lead with clean typed/printed scans; treat handwriting as a bonus, not a guarantee |
| Full NestJS rewrite before validation | Wasted weeks, delayed demo | Defer to Phase 2 |
| Gemini rate limits / cost at scale | Budget, demo reliability | Groq fallback (already proven in your GPA project), cache validation results |
| Solo dev, dual job (NTBLCP + this) | Timeline slip | Weekly milestones above are deliberately loose — treat them as checkpoints, not deadlines |

---

## Immediate next step

Start Week 1. Most of it is **porting**, not new work — your schema, GPA logic, and PDF/Excel generation already exist and are tested. The genuinely new build is the AI upload pipeline (Week 2), so getting the foundation done fast buys you more time for the part that actually needs it.
