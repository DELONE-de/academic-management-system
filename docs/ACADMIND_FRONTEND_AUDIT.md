# AcadMind AI — Frontend Audit Report

**Date:** September 2, 2026

## Summary

The frontend has been hardened with centralized error handling, role-based navigation, route protection, AI-first dashboard, improved review/approval UX, and accessibility improvements.

## Starting Condition

- 16 page routes, 12+ components, Axios API client with localStorage JWT
- AuthContext with basic login/logout, no error distinction (401 vs 403 vs 429)
- Non-role-aware sidebar (all links visible to everyone)
- Dashboard with swallowed errors (`.catch(() => {})`)
- API client returning raw axios response shape (`.success` / `.data`)
- Review page with plain confidence text, no errors on approve-all
- Approval page without workflow visualization or confirmation dialogs
- No error boundaries, no structured error messages, no show/hide password
- No frontend tests

## Problems Fixed

### 1. API Client Hardening
- **Centralized `call<T>()` wrapper** — all API methods return `{ data?: T, error?: string }` instead of raw axios responses. Pages never interact with `response.success` / `response.data.success` directly.
- **`toFriendlyError()`** — maps 401/403/404/422/429/500/network errors to user-friendly messages. Never exposes backend stack traces.
- **`friendlyMessage()`** — convenience function for error display.
- **Session management** — `getToken()`, `setToken()`, `clearSession()` centralized in `lib/session.ts` so a future HttpOnly cookie migration is a single-file change.
- **401 auto-redirect** — intercepts 401 responses and redirects to `/login?expired=1`.

### 2. AuthContext Improvements
- Uses centralized `session.ts` instead of direct `localStorage` calls.
- Login error uses `toFriendlyError()` to distinguish "invalid credentials" from "network error".
- Session expiry handled gracefully with `?expired=1` query param.

### 3. Role-Based Navigation + Route Protection
- **`lib/navigation.ts`** — single source of truth for nav items and per-route role permissions.
- **Sidebar** — now shows only nav items allowed for the user's role (HOD sees Students/Courses/GPA; DEAN also sees Departments; etc.).
- **`RouteGuard`** component — wraps dashboard routes and redirects unauthorized users.
- **Dashboard layout** — integrated with RouteGuard and pathname-based role check.
- Backend remains authoritative; frontend protection is for UX only.

### 4. Dashboard
- Added `loading`/`error` state (no more silently swallowed failures).
- Role-aware stats cards and quick links.
- AI processing summary section.
- Recent upload jobs with proper empty state.

### 5. Login Page
- Show/hide password toggle with `EyeIcon`/`EyeSlashIcon`.
- Session-expired notice (from `?expired=1` redirect).
- Accessible password field with `aria-invalid`, `htmlFor`.
- Suspense boundary for `useSearchParams`.

### 6. AI Review Page
- **`ConfidenceIndicator`** component — shows colored bar + text label (`92% High` / `75% Medium` / `40% Low`). Always includes text (accessible — not color-only).
- Error handling improved — uses `fetchJob()` with loading/error states.
- Confirm dialog for "Accept All" (prevent accidental bulk approval).

### 7. Approval Page
- **`WorkflowIndicator`** — visual 5-stage progress bar (Lecturer → Exam Officer → HOD → Dean → Published). Shows `✓` for completed, `●` for current, `○` for pending.
- Confirmation dialogs for approve, reject, and publish actions.
- Loading/error states.

### 8. Error Boundaries
- **`ErrorBoundary`** component — renders a "Something went wrong" fallback with "Try again" button. Catches render errors in subtrees.
- Wired in `DashboardLayout` — a single component failure won't crash the entire application.

### 9. Accessibility
- Sidebar uses `aria-label="Main navigation"` and `aria-current="page"`.
- Dashboard status badges include `aria-label`.
- Login password field has `aria-invalid` and labeled.
- Status indicators include text (not color-only): "✓ Complete", "⚠ Needs Review", "✕ Rejected".
- Spinners use `role="status"` semantics where sensible.

### 10. Error Handling Across All Pages
- Students, courses, departments, reports, GPA, CGPA, student detail pages all updated to use new `{ data, error }` API shape.
- No more `r.success` / `response.success` usage anywhere.
- Loading spinners consistently used.
- Error states with retry buttons.
- Empty states with helpful messages.

### 11. Mobile Responsiveness
- Sidebar: mobile hamburger menu with overlay (`Bars3Icon`/`XMarkIcon`).
- Tables: `overflow-x-auto` for horizontal scrolling on small screens.

### 12. Confirmations for Destructive Actions
- Delete student: built into API client (handled by StudentForm/backend).
- Reject batch: `window.confirm()`.
- Publish results: `window.confirm()` with explanation.
- Approve all review items: `window.confirm()`.

## Security Improvements

- No client-side secrets or API keys exposed.
- No `dangerouslySetInnerHTML` usage.
- AI content displayed as plain text (not raw HTML).
- Sensitive info (tokens) stored in centralized `session.ts` for future cookie migration.
- 401 auto-redirect clears session.

## Files Changed (Frontend)

| File | Change |
|---|---|
| `src/lib/api.ts` | Rewritten with `call<T>()` wrapper, all methods return `{ data, error }` |
| `src/lib/errors.ts` | NEW — friendly error mapping (401/403/404/422/429/500/network) |
| `src/lib/session.ts` | NEW — centralized token storage |
| `src/lib/navigation.ts` | NEW — role-based nav config + route rules |
| `src/context/AuthContext.tsx` | Uses centralized session, friendly errors |
| `src/components/layout/Sidebar.tsx` | Role-based nav, mobile drawer |
| `src/components/layout/RouteGuard.tsx` | NEW — role-based route protection |
| `src/components/layout/ErrorBoundary.tsx` | NEW — catches render errors |
| `src/components/layout/DashboardLayout.tsx` | Wraps children in ErrorBoundary |
| `src/app/(dashboard)/layout.tsx` | Integrated RouteGuard |
| `src/app/(dashboard)/dashboard/page.tsx` | Role-aware, AI-first, loading/error states |
| `src/app/(auth)/login/page.tsx` | Show/hide password, session-expired, Suspense boundary |
| `src/app/(dashboard)/review/[jobId]/page.tsx` | ConfidenceIndicator, confirm approve-all |
| `src/app/(dashboard)/approval/page.tsx` | WorkflowIndicator, confirmations |
| `src/app/(dashboard)/students/*` | Updated to new API shape |
| `src/app/(dashboard)/courses/page.tsx` | Updated to new API shape |
| `src/app/(dashboard)/gpa/page.tsx` | Updated to new API shape |
| `src/app/(dashboard)/cgpa/page.tsx` | Updated to new API shape, loading/error |
| `src/app/(dashboard)/reports/page.tsx` | Updated to new API shape |
| `src/app/(dashboard)/scores/upload/page.tsx` | Updated `streamUpload` + `getJobs` |
| `src/app/(dashboard)/students/upload/page.tsx` | Updated `streamUpload` + `getJobs` |
| `src/app/(auth)/setup/page.tsx` | Updated to new API shape |
| `src/hooks/useFetch.ts` | Updated to new API shape |

## Remaining Limitations

1. **No frontend tests** — No jest/cypress configured. Manual QA verified build output.
2. **JWT in localStorage** — Deferred; centralized in `session.ts` for easy migration.
3. **No student self-service portal** — Requires new login flow for Student role.
4. **Chart.js unused** — GPA distribution data computed but not visualized with chart.js (CSS bars used instead).
5. **No email/password reset** — Documented, not implemented.

## Frontend Readiness Score

| Category | Score | Notes |
|---|---|---|
| Security | 75/100 | No secrets, centralized session, 401/403 handling, no unsafe rendering |
| AI Experience | 70/100 | Upload workflow, confidence bars, anomaly display, review UX |
| UX | 72/100 | Loading/empty/error states, role-aware nav, confirmations |
| Accessibility | 50/100 | ARIA labels, non-color indicators, focus states, keyboard nav partially |
| Responsive | 60/100 | Mobile sidebar, scrollable tables |
| Performance | 70/100 | Build output optimized, paginated API calls |
| **Overall** | **66/100** | |

## Deferred Intentionally

- Student self-service (requires new login flow + backend Student role)
- Email/password reset (no email infrastructure configured)
- Full WCAG audit (keyboard nav, screen reader, contrast — partial but not exhaustive)
- Chart.js GPA charts (data available, CSS bars used; chart.js already installed)