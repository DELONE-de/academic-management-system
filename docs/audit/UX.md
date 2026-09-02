# UX Audit — Supporting Document

## Persona-based evaluation

### Student
| Task | Works today? | Notes |
|---|---|---|
| View results | ❌ | No student login at all |
| View GPA/CGPA | ❌ | — |
| Semester history | ❌ | — |
| Outstanding/failed courses | ❌ | — |
| Track progress | ❌ | — |
| Download/print results | ❌ | — |
| Know what's needed to graduate | ❌ | — |

**Verdict:** Student experience is entirely absent. Highest-priority UX gap.

### Lecturer / Exam Officer
| Task | Works today? | Notes |
|---|---|---|
| Access assigned courses | ❌ | No course-assignment model; any role sees all |
| Enter results | ⚠️ | Via AI upload page (gated to HOD/EXO/LEC) — works |
| Modify results when authorized | ⚠️ | Backend endpoints exist; no UI for direct edit |
| Submit results | ✅ | Batch submit works (approval page) |
| Track submission status | ✅ | Approval page shows statuses |
| Avoid mistakes | ⚠️ | AI review helps; but pre-approval writes are risky |

### Department Administrator (HOD)
| Task | Works today? | Notes |
|---|---|---|
| Manage students | ✅ | Create/upload/search; no pagination, no bulk level UI wired |
| Manage courses | ✅ | CRUD; inline form (duplicates dead CourseForm) |
| Manage sessions/semesters | ❌ | Free-text academicYear only |
| Manage results | ✅ | Upload + review + reports |
| Manage lecturers | ❌ | No user management |
| Generate reports | ✅ | PDF + on-screen stats |
| Correct errors | ⚠️ | Result edit backend exists; no UI; no history |
| Audit changes | ⚠️ | Audit page not linked in sidebar |

### University Administrator (Dean)
| Task | Works today? | Notes |
|---|---|---|
| Manage multiple departments | ⚠️ | Departments page is orphaned (no nav link); faculty stats exist |
| Cross-department comparison | ❌ | No dedicated Dean dashboard |
| Approve results | ✅ | Approval page |
| Publish | ✅ | — |

## Design-system evaluation

| Area | Grade | Notes |
|---|---|---|
| Navigation | C− | Static sidebar, all items for all roles; departments page orphaned; scores→scores/upload redirect is confusing |
| Dashboard | C | Good cards; silent error swallow; distribution not charted; no role-specific views |
| Forms | B+ | react-hook-form + Zod; good validation; signup uses raw api.post inconsistently |
| Tables | B | Reusable Table; students list no pagination UI |
| Search | C | Student search only; no course/result/audit search |
| Filtering | C | Level/semester filters on some pages only |
| Pagination | D | Only students (50-cap, no controls) |
| Error messages | C | Toasts good; `.catch(()=>{})` silent failures |
| Empty states | C− | Some tables; several pages render nothing |
| Loading states | C | Button spinners; no skeletons |
| Mobile | C− | Layout responsive; review/approval cramped; untested |
| Accessibility | C− | Headless UI modals; no ARIA audit, focus mgmt, contrast check |
| Consistency | C | Mixed patterns throughout |
| Visual polish | B | Tailwind + Inter; clean cards |

## Frontend bugs affecting UX
1. **CGPA page shows `undefined` student name** (`cgpa/page.tsx` reads `history.student.name`; API returns firstName/lastName).
2. **Dashboard silently fails** on API error (`.catch(() => {})`) — blank page, no feedback.
3. **`/departments` (Dean) page is orphaned** — no sidebar link.
4. **No pagination controls** anywhere; student list capped at 50.
5. **Bulk level update component never wired** to any page.
6. **CourseForm component dead** — courses page uses inline form (duplicate code to maintain).
7. **Signup only offers HOD/DEAN** but backend rejects DEAN (B1) — broken path.
8. **Setup page hardcodes `facultyId: ''`** — likely fails; no faculty creation UI.
9. **Review center** — no undo for Accept All; can't see committed-vs-pending clearly.
10. **Delete confirmations** — only `confirm()` in courses page; students/results deletions have no confirmation.

## Recommended UX improvements (prioritized)
- **P0:** Fix CGPA page name bug; add error/empty/loading states to dashboard + all data pages.
- **P1:** Student portal; role-based sidebar filtering; user management UI; pagination everywhere; wire BulkLevelUpdate; faculty/institution admin.
- **P2:** Real GPA distribution charts (chart.js already installed); at-risk & carryover views; result slip printing; branded PDFs.
- **P3:** Accessibility audit; mobile polish for review/approval; keyboard navigation; focus management.