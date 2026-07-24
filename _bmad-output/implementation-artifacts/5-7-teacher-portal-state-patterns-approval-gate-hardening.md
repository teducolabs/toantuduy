---
baseline_commit: 7d2cd28
---

# Story 5.7: Teacher Portal State Patterns & Approval Gate Hardening

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want all teacher portal edge-case state patterns implemented and the dual approval gate verified end-to-end,
so that the portal is robust against status changes, network failures, and security boundary crossings.

## Acceptance Criteria

1. **Given** an APPROVED Teacher's `TeacherAccount.status` is subsequently changed to `PENDING` or `REJECTED` by an admin, **when** they make any subsequent request to `/(teacher)/` routes or server actions, **then** the server-side status check catches the change and redirects to the pending screen — the JWT role claim alone does not grant access (AD-6).
2. **And** teacher portal offline state: a shadcn `Toast` fires once on connectivity loss; assignment submission is disabled; browsing existing data is available (UX-DR15).
3. **And** load error on Class Report or Assignment Builder: an inline retry card appears; the assignment builder preserves draft state on a failed fetch (UX-DR15).
4. **And** full keyboard navigation across the teacher portal: Tab/Shift-Tab through all table rows and form fields; Enter fires the primary action on the focused element (UX-DR19).

## Design Decisions (resolved during story creation — do not re-litigate)

These close gaps between the ACs and the current code. Implement exactly as stated.

- **D1 — "Redirects to the pending screen" = `redirect('/register/teacher/pending')` from the teacher layout.** The layout (`src/app/(teacher)/layout.tsx` lines 22–29) ALREADY runs `getTeacherAccountStatus(session.user.id)` (a live DB read) on every request — the AD-6 mechanism exists. What it does today on non-APPROVED is render an inline `<p>{common.teacherPendingApproval}</p>` instead of redirecting. Change that branch to `redirect('/register/teacher/pending')` — the unauthenticated pending page (`src/app/register/teacher/pending/page.tsx`, built in 5.1) shows the identical copy and lives OUTSIDE the `(teacher)` group, so no redirect loop. Both `PENDING` and `REJECTED` (and a missing `TeacherAccount` row, `null`) redirect to the same pending screen — the AC names one destination; rejection-specific messaging already happens at the next sign-in attempt (5.1's Credentials `authorize()`).
- **D2 — Server actions keep returning `{ error: { code: 'UNAUTHORIZED' } }` — no redirect from actions.** The project's action contract (`{ data } | { error }`, never throw) cannot redirect. `requireTeacherAccountId()` (`src/app/(teacher)/classes/actions.ts` lines 31–43) already re-reads `TeacherAccount.status` from the DB per call, so a status flip is caught on the very next action invocation. The "redirect to pending" half of AC #1 is satisfied at the route layer (D1): any navigation after the flip hits the layout redirect. This story's action-side work is VERIFICATION: confirm every teacher action test file carries the full AD-6 matrix (no session / wrong role / no TeacherAccount / PENDING / REJECTED) — 5.3–5.6 established it; extend any file that's missing a case rather than adding new gate code.
- **D3 — One portal-wide offline toast component, mounted in the teacher layout.** New `src/components/teacher/teacher-offline-toast.tsx`, a side-effect-only Client Component that is a near-copy of `src/components/parent/dashboard-offline-toast.tsx` (Story 4.5): `useOnlineStatus()` (REUSE from `src/components/student/use-online-status.ts` — never fork, per 4.5's binding note) + `shouldFireOfflineToast` (REUSE the exported pure function from `src/components/parent/dashboard-offline-toast-state.ts` — it is surface-agnostic; do not duplicate the one-liner) + `toast(common.teacherOfflineToast)` from `sonner` (the `<Toaster />` is already mounted globally in `src/app/layout.tsx` — zero setup). Mount it once inside the APPROVED branch of `src/app/(teacher)/layout.tsx` so it covers every portal page. Toast copy is EXACT per EXPERIENCE.md line 204: `'Không có kết nối.'` — shorter than the parent-dashboard string; do not reuse `dashboard.offlineToastMessage`.
- **D4 — "Assignment submission disabled" = disable the mutating buttons while offline, in the two components that submit assignments.** Call `useOnlineStatus()` inside `assignment-set-builder.tsx` and `assign-set-dialog.tsx` (both already `'use client'`) and add `!isOnline` to the `disabled` condition of: builder Step 3's "Lưu nháp" and "Giao bài" buttons and its replace-confirm `AlertDialogAction`, and the dialog's assign button and its replace-confirm `AlertDialogAction`. Do NOT disable navigation, filters, step Back/Continue, or the Sheet/Dialog themselves — "browsing existing data is available" (AC #2). Do not add offline checks to server actions (the request would simply fail and the existing inline error handling catches it).
- **D5 — Class Report load-error retry = the 4.5 server-first-fetch + client-retry-wrapper pattern.** Today `/(teacher)/reports/[assignmentSetId]/page.tsx` calls `getClassReportAction` server-side and `notFound()`s on ANY error; a transient DB failure inside the action currently THROWS (the repo call is not try/caught) and surfaces as an unstyled Next error. Two changes: (a) wrap the repo+compute body of `getClassReportAction` in try/catch returning `{ error: { code: 'LOAD_FAILED', message: ... } }` (gate + zod stay outside the try); (b) split the page per Story 4.5's dashboard precedent — `page.tsx` keeps the server-side first fetch, still `notFound()`s on `NOT_FOUND`/`VALIDATION_ERROR` (a foreign/draft/missing set is a real 404, not retryable), and passes any other result into a new Client Component `src/components/teacher/class-report-content.tsx` which holds the result in `useState`, renders the inline retry card (`reports.loadErrorMessage` + `assignments.retryCta` Button) on error, re-invokes `getClassReportAction({ assignmentSetId })` on click, and renders the existing header + `<ClassReportTable>` on success. Move the header JSX (title, replaced pill, subline) from `page.tsx` into this component unchanged. A retry that returns `NOT_FOUND` (set deleted meanwhile) renders the error card again — acceptable; do not build a client-side 404.
- **D6 — Assignment Builder retry + draft preservation ALREADY EXISTS (5.4) — verify, do not rebuild.** `assignment-set-builder.tsx` lines 71–86 keep all step state mounted across steps; lines 344–353 render the inline fetch-error card with a `assignments.retryCta` retry button (`fetchAttempt` re-trigger); `createdDraftId` guarantees no duplicate draft on retry. AC #3's builder half is satisfied — this story only VERIFIES it (code-trace + existing `assignment-builder-state.test.ts`) and leaves it untouched except for D4's offline-disable additions.
- **D7 — Keyboard navigation is a verification pass, not a rebuild.** Every interactive element in the portal is a native `<button>`, `<a>` (next/link), `<input>`, or a Base-UI-backed shadcn primitive (Sheet, Dialog, Select, AlertDialog) — all natively Tab/Enter-operable; the report table's sort headers are real ≥44px `<button>`s (5.6). Report/roster table ROWS are non-interactive by design — "Tab through all table rows" means through the interactive elements within/around tables in DOM order, not making rows focusable (do NOT add `tabIndex` to `<tr>`). The task is: sweep for keyboard traps or custom `onKeyDown`/mouse-only handlers (none exist today), confirm the new retry card button and offline-disabled buttons remain reachable/announced, and record live-vs-code-trace verification per the established convention.
- **D8 — Locale keys:** `common.ts` gains `teacherOfflineToast: 'Không có kết nối.'` (EXACT, EXPERIENCE.md 204); `reports.ts` gains `loadErrorMessage: 'Không tải được dữ liệu.'` (mirrors the dashboard load-error copy, EXPERIENCE.md 193/205 give no teacher-specific string). Reuse `assignments.retryCta` ('Thử lại') — reports/[id] page already imports `assignments` strings; do not duplicate the CTA.
- **D9 — No schema changes, no new dependencies, no middleware.** The gate mechanism is the existing per-request DB read in layout + actions; do not introduce Next middleware, JWT re-validation, or session revocation machinery.

## Tasks / Subtasks

- [x] Task 1: Approval-gate redirect + verification matrix (AC: #1; D1, D2)
  - [x] 1.1 `src/app/(teacher)/layout.tsx`: replace the inline pending `<main>` branch (lines 23–29) with `redirect('/register/teacher/pending')` (`redirect` is already imported). The `getTeacherAccountStatus` call and the role check above it are untouched.
  - [x] 1.2 Remove the now-unused `common.teacherPendingApproval` import from the layout ONLY if unused there afterward — the key itself stays (the pending page uses it).
  - [x] 1.3 Verify the AD-6 test matrix exists in ALL teacher action test files (`classes/actions.test.ts`, `assignments/actions.test.ts`, `reports/actions.test.ts`): each exported action rejects for no session / wrong role / no TeacherAccount row / PENDING / REJECTED. Add any missing case (the PENDING-after-approval flip is exactly the PENDING case — the mock does not know history). Expected: 5.3–5.6 already cover this; this is an audit, likely zero or tiny diffs.
  - [x] 1.4 End-to-end code-trace for the Completion Notes: admin flips status → next `/(teacher)/` navigation → layout `getTeacherAccountStatus` DB read → `redirect('/register/teacher/pending')`; next server-action call → `requireTeacherAccountId` DB read → `{ error: UNAUTHORIZED }`. State plainly that the JWT is never the sole gate.
- [x] Task 2: Portal-wide offline toast (AC: #2; D3, D8)
  - [x] 2.1 New `src/components/teacher/teacher-offline-toast.tsx` — copy the shape of `dashboard-offline-toast.tsx` verbatim: `'use client'`, `useOnlineStatus()` from `@/components/student/use-online-status`, `shouldFireOfflineToast` from `@/components/parent/dashboard-offline-toast-state`, mount-skip ref guard, `toast(common.teacherOfflineToast)`, returns `null`.
  - [x] 2.2 Mount `<TeacherOfflineToast />` once in `src/app/(teacher)/layout.tsx` inside the APPROVED render branch (e.g. next to `{children}`) so every portal page gets it; do not mount it per-page.
- [x] Task 3: Disable assignment submission while offline (AC: #2; D4)
  - [x] 3.1 `assignment-set-builder.tsx`: `const isOnline = useOnlineStatus()`; add `|| !isOnline` to the `disabled` props of the Step 3 "Lưu nháp" button, "Giao bài" button, and the replace-confirm `AlertDialogAction`. Leave Back/Continue, filters, selects, and the Sheet itself enabled.
  - [x] 3.2 `assign-set-dialog.tsx`: same — assign button and replace-confirm `AlertDialogAction` gain `|| !isOnline`.
  - [x] 3.3 Do not add new pure-state helpers for this — the predicate is a boolean OR at the call site; `assignment-builder-state.ts` stays untouched.
- [x] Task 4: Class Report inline retry card (AC: #3; D5, D8)
  - [x] 4.1 `src/app/(teacher)/reports/actions.ts`: wrap the `getClassReportData` + `computeClassReport` + return block in try/catch; catch returns `{ error: { code: 'LOAD_FAILED', message: 'Could not load report' } }`. `requireTeacherAccountId` and zod parsing stay outside the try. `NOT_FOUND` behavior unchanged.
  - [x] 4.2 New `src/components/teacher/class-report-content.tsx` (`'use client'`): props `{ assignmentSetId: string, initialResult: <the action's ActionResult union> }` — export the result type from `actions.ts` (e.g. `export type ClassReportResult = ...`) the way 4.5 exported `DashboardDataResult`. `useState(initialResult)`; on error render an inline card (`Card` or a bordered `div` matching the builder's error block style): `role="alert"` message `reports.loadErrorMessage` + `Button` labeled `assignments.retryCta` that sets a submitting flag, awaits `getClassReportAction({ assignmentSetId })`, and replaces state (wrap in try/catch → on throw keep the error card). On success render the existing header (title, `assignments.replacedPill` pill, className · questionCount · dueAt subline) + `<ClassReportTable report={report} />` — JSX moved from `page.tsx` unchanged.
  - [x] 4.3 `src/app/(teacher)/reports/[assignmentSetId]/page.tsx`: keep `await params` + server-side `getClassReportAction` call; `if ('error' in result && (result.error.code === 'NOT_FOUND' || result.error.code === 'VALIDATION_ERROR')) notFound()`; otherwise render `<ClassReportContent assignmentSetId={assignmentSetId} initialResult={result} />`.
  - [x] 4.4 Builder half of AC #3: verify (code-trace, no changes) that the 5.4 retry card + preserved draft state still hold after Task 3.1's edits — the `fetchFailed`/`fetchAttempt` flow and mounted-state preservation are already implemented (D6).
- [x] Task 5: Keyboard navigation sweep (AC: #4; D7)
  - [x] 5.1 Sweep `src/app/(teacher)/**` and `src/components/teacher/**` for: elements with click handlers that are not native buttons/links, `tabIndex={-1}` on interactive elements, custom `onKeyDown`, or focus traps. Expected result: none — record the sweep outcome.
  - [x] 5.2 Confirm the new retry button (Task 4.2) and disabled-while-offline buttons (Task 3) are native `Button`s — disabled buttons drop out of tab order, which is standard and acceptable; the toast (Task 2) announces the reason.
  - [x] 5.3 Live browser Tab/Enter pass if possible; otherwise the established fallback (explicit code-trace note in Completion Notes, flagged as not live-verified).
- [x] Task 6: Locale strings (AC: #2, #3; D8)
  - [x] 6.1 `src/locales/vi/common.ts`: add `teacherOfflineToast: 'Không có kết nối.'` (EXACT).
  - [x] 6.2 `src/locales/vi/reports.ts`: add `loadErrorMessage: 'Không tải được dữ liệu.'`. No new retry CTA key — reuse `assignments.retryCta`.
- [x] Task 7: Tests & gate (all ACs)
  - [x] 7.1 `reports/actions.test.ts`: add a `LOAD_FAILED` case — mock `db.assignmentSet.findFirst` (or the repo path) to reject and assert the action returns `{ error: { code: 'LOAD_FAILED' } }` instead of throwing. Existing AD-6/NOT_FOUND/happy-path tests must stay green.
  - [x] 7.2 Task 1.3's matrix audit results in test additions only where a case is missing.
  - [x] 7.3 Component-render tests are NOT expected — the project has no DOM test environment (`environment: 'node'`, no testing-library; 4.5 set this precedent explicitly). The offline falling-edge logic is already covered by `dashboard-offline-toast-state.test.ts` (the reused pure function); do not duplicate that test. New branching in `class-report-content.tsx` is a two-arm union check — if you extract any non-trivial predicate, test it as a pure module per convention, otherwise code-trace it.
  - [x] 7.4 Full gate before done: `npx vitest run` (**249 green at baseline — all must pass plus new**), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build`.
  - [x] 7.5 Live browser verification if possible (offline toggle via DevTools, status-flip via direct DB update, Tab/Enter pass); otherwise the established fallback stated plainly in Completion Notes. Manual QA still needs an APPROVED teacher via direct DB update until 7.2.

## Dev Notes

### Current state of files being modified (read them before editing)

- `src/app/(teacher)/layout.tsx` — role check → `getTeacherAccountStatus(session.user.id)` → **inline pending render at lines 23–29 (the piece D1 replaces with a redirect)** → nav + signout + `max-w-4xl` main. `redirect` already imported. Because this layout awaits `auth()` and a DB read, every `/(teacher)/` page is dynamic — the status re-check genuinely runs per request; nothing to add for freshness.
- `src/app/register/teacher/pending/page.tsx` — the redirect target: unauthenticated full-screen `common.teacherPendingApproval` message (5.1). No changes to it.
- `src/app/(teacher)/classes/actions.ts` `requireTeacherAccountId` (lines 31–43) — THE dual gate: session role check + fresh `db.teacherAccount.findUnique` status read per call. **Do not modify it**; every teacher action already starts with it (5.3–5.6).
- `src/lib/auth.ts` — sign-in-time gate lives in Credentials `authorize()` (pending/rejected rejected with distinguishable codes) per its own comment (lines 25–27); already-issued sessions are the layout/action checks' job. **No auth.ts changes in this story.**
- `src/components/teacher/assignment-set-builder.tsx` — the 5.4 Sheet: all step state stays mounted across steps (comment at lines 71–72), fetch-error retry card at lines 344–353, `createdDraftId` no-duplicate-draft guard at lines 84–85/164/197–211. Task 3.1 only adds `useOnlineStatus` + three `|| !isOnline` disabled terms.
- `src/components/teacher/assign-set-dialog.tsx` — assigns an existing draft; inline error + preserved state already (comment lines 26–27). Task 3.2 adds the offline term to its two mutating buttons.
- `src/app/(teacher)/reports/[assignmentSetId]/page.tsx` — Server Component; currently `notFound()` on ANY action error (line 10–12) and renders header + `<ClassReportTable>` inline — that JSX moves into `class-report-content.tsx` (D5). `report.dueAt` is a `Date` crossing into a Client Component — fine (React 19 serializes Date over the RSC/action boundary; already the case today with `ClassReportTable`).
- `src/app/(teacher)/reports/actions.ts` — `getClassReportAction`: gate → zod → repo → `NOT_FOUND` on null → `computeClassReport` → data. **An exception from the repo currently propagates (throws) — that's the bug Task 4.1 fixes.** `ClassReportWithHeader` is already exported; add the exported result union type here.
- `src/components/parent/dashboard-offline-toast.tsx` + `dashboard-offline-toast-state.ts` — the 4.5 template for Task 2; the pure `shouldFireOfflineToast(previous, current)` is exported and unit-tested — import it, don't copy it.
- `src/components/student/use-online-status.ts` — `useOnlineStatus(): boolean` (`navigator.onLine` + `online`/`offline` window listeners). Cross-surface reuse is the established convention (4.5 imported it into `(parent)` code); importing into `components/teacher/` is consistent. Do not move or fork it.
- `src/components/teacher/class-report-table.tsx` / `class-report-sort.ts` — 5.6's sortable table; sort headers already real ≥44px buttons with `aria-sort`. Untouched by this story (receives the same `report` prop from the new wrapper).
- `src/locales/vi/common.ts` — `teacherPendingApproval` (line 13) stays; add `teacherOfflineToast`. `src/locales/vi/reports.ts` — 5.6's flat const; add `loadErrorMessage`.

### Architecture guardrails

- **AD-6 is already mechanically satisfied** (per-request DB reads in layout + `requireTeacherAccountId`); this story changes the non-APPROVED route *response* (inline → redirect) and audits test coverage. Do not weaken either check, do not cache the status read, do not move the check into the JWT.
- **Layers (AD-2):** `class-report-content.tsx` receives/holds action results and calls the `'use server'` action on retry — the exact client→action pattern 4.5's `dashboard-content.tsx` established. No component imports repositories or `@/lib/db`.
- **Action contract:** `{ data: T } | { error: { code, message } }`, never throw — Task 4.1 exists precisely because the report action currently CAN throw. Follow `getDashboardDataAction`'s shape.
- **No real-time machinery (AD-8):** the offline toast is a browser-connectivity listener, not a server connection; nothing here polls or subscribes.
- **`src/lib/auth.ts` is untestable under vitest** (calls `NextAuth()` at import) — tests mock `@/lib/auth`; the layout itself has no unit test (no DOM environment) — its behavior is covered by code-trace + the pending page's existing render.

### UX guardrails

- Toast copy `'Không có kết nối.'` and load-error copy `'Không tải được dữ liệu.'` / `'Thử lại'` are EXACT strings (EXPERIENCE.md 204, 193/205). No inline Vietnamese in components (UX-DR18).
- Toast fires ONCE per disconnect (falling edge) — the reused `shouldFireOfflineToast` + mount-skip ref guard handle this; don't re-derive.
- Retry card: `role="alert"` on the message, real `Button` for the CTA (≥44px default), adult radii (`rounded-brand-md` wrapper if you add a border) — match the builder's error block style (`text-feedback-incorrect` message) or the dashboard error card; keep it visually quiet, teacher surface is dense/adult.
- Disabled buttons while offline: `disabled` attribute only (shadcn Button handles the visual); the toast is the announcement — do not add extra banners inside the builder.
- Keyboard: only native elements; never `tabIndex` on `<tr>`; Esc-close on Sheet/Dialog comes free from the primitives.

### What NOT to build (scope walls)

- **No middleware, JWT re-validation, session revocation, or sign-out-on-status-flip** — the per-request DB check + redirect IS the v1 contract (D9).
- **No rejection-specific screen for the in-session flip** — both PENDING and REJECTED redirect to the pending screen (D1); rejection detail is the sign-in flow's job (5.1, untouched).
- **No rebuild of the builder's retry/draft-preservation** — it exists (D6). No changes to `assignment-builder-state.ts`.
- **No retry card on the `/reports` index or `/classes` pages** — AC #3 names Class Report + Assignment Builder only. (Their server-side fetches erroring is a pre-existing generic-error behavior; out of scope.)
- **No offline disabling of class creation, join-code copy, or navigation** — AC #2 disables *assignment submission* only; browsing stays available.
- **No DOM-rendering test framework** (jsdom/testing-library) — 4.5 explicitly kept this out; pure-function extraction is the convention.
- **No schema changes, no migrations, no new dependencies, no new locale files.**
- **No admin approval queue work** — flipping status is done via direct DB update until Story 7.2.

### Project Structure Notes

- Files to **create**: `src/components/teacher/teacher-offline-toast.tsx`, `src/components/teacher/class-report-content.tsx`.
- Files to **modify**: `src/app/(teacher)/layout.tsx`, `src/app/(teacher)/reports/actions.ts` (+ `actions.test.ts`), `src/app/(teacher)/reports/[assignmentSetId]/page.tsx`, `src/components/teacher/assignment-set-builder.tsx`, `src/components/teacher/assign-set-dialog.tsx`, `src/locales/vi/common.ts`, `src/locales/vi/reports.ts` (+ any test files the Task 1.3 audit touches).
- Naming: kebab-case files, PascalCase components, camelCase functions.

## Previous Story Intelligence

- **Story 5.6 (commit `7d2cd28`, done):** built the report page/action/table this story wraps. Its scope walls explicitly handed 5.7: "offline toast, load-error inline retry card, portal-wide keyboard-nav hardening, approval-gate E2E hardening". Its dev record notes `AssignmentSetCard` has THREE call sites (`/assignments`, `/reports`, `/classes`) — irrelevant here but a reminder that tsc catches teacher-surface integration misses.
- **Story 4.5 is the pattern donor:** `dashboard-offline-toast.tsx` (falling-edge toast, reused hook + pure predicate) and `dashboard-content.tsx` (server-first-fetch + client retry via re-invoked server action) are the two shapes Tasks 2 and 4 copy. 4.5 also set the testing precedent: no DOM tests; extract predicates to pure modules or code-trace.
- **Test baseline is 249** (27 files) after 5.6. Mock pattern: inline `vi.mock('@/lib/auth')`, `vi.mock('@/lib/db')`, `vi.mock('next/cache')`; `environment: 'node'`.
- **Verification convention:** live browser QA usually impossible in this sandbox; accepted fallback = `next build` + full unit coverage + explicit end-to-end code trace in Completion Notes, with the live-verification gap flagged. This story's toast/keyboard/offline items are exactly the kind that need that flag.
- **Git pattern:** one commit per story, conventional-commit style, story file + sprint-status updated alongside code.
- **Do NOT speculatively add rate limiting** (the open action item is scoped to auth paths, not this story).

## Latest Tech Notes (verified against 5.6, 2026-07-24)

- **No new packages.** Next `15.3.9` (App Router), React 19, Prisma `^5.22.0`, zod `^4.4.3`, sonner (already global via `src/components/ui/sonner.tsx` in root layout), `@base-ui/react ^1.6.0` primitives, Tailwind v4, lucide-react, vitest `^4.1.10`.
- `redirect()` in a layout throws `NEXT_REDIRECT` internally — never wrap it in try/catch; call it at the top level of the branch.
- `navigator.onLine` is a connectivity *hint* (false positives possible) — acceptable per 4.5/3.7 precedent; the disabled-button + toast UX degrades gracefully because server-action failures still land in the existing inline error paths.
- React 19 serializes `Date` across the server-action/RSC boundary — passing the action result (with `dueAt: Date | null`) into the client wrapper and re-fetching client-side both work without manual ISO conversion.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.7] (lines 1023–1039) — ACs verbatim; Epic 5 overview (863–865)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md] — line 204 (portal offline: Toast "Không có kết nối.", submission disabled, browsing available), 205 (load error: inline retry card, builder preserves draft), 193 (dashboard load-error copy mirrored by D8), 244 ("Desktop-forward. Mouse and keyboard.")
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-6] — dual gate rule (signIn callback + layout/action status checks); #AD-2 layers; #AD-8 no persistent connections
- [Source: _bmad-output/project-context.md] — teacher approval gate dual-check rule, action shape, locale rule, layer rules
- [Source: src/app/(teacher)/layout.tsx] — the status check + inline pending branch D1 converts to a redirect
- [Source: src/app/register/teacher/pending/page.tsx] — redirect target (5.1)
- [Source: src/app/(teacher)/classes/actions.ts#requireTeacherAccountId] (31–43) — the action-side gate (verification only)
- [Source: src/lib/auth.ts] (25–27) — comment locating the three gate layers; no changes here
- [Source: src/components/parent/dashboard-offline-toast.tsx, dashboard-offline-toast-state.ts] — 4.5 offline-toast template + reusable pure predicate
- [Source: src/components/parent/dashboard-content.tsx] — 4.5 retry-wrapper template for `class-report-content.tsx`
- [Source: src/components/student/use-online-status.ts] — the one online-status hook (reuse, never fork)
- [Source: src/components/teacher/assignment-set-builder.tsx] (71–86, 344–353) — existing retry card + preserved draft state (D6); Task 3.1 edit points (Step 3 footer 431–450, replace-confirm 455–474)
- [Source: src/components/teacher/assign-set-dialog.tsx] — Task 3.2 edit points (assign button 88–95, replace-confirm 100–119)
- [Source: src/app/(teacher)/reports/actions.ts] — action to make throw-safe; [Source: src/app/(teacher)/reports/[assignmentSetId]/page.tsx] — page to split
- [Source: _bmad-output/implementation-artifacts/4-5-parent-dashboard-performance-all-state-patterns.md] — pattern donor story (offline toast, retry wrapper, testing-deviation precedent)
- [Source: _bmad-output/implementation-artifacts/5-6-class-report.md] — previous story intelligence; scope-wall handoff to 5.7; baseline 249

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Epics, architecture spine, UX experience/design docs, project context, Stories 4.5/5.1–5.6, git history, and the live teacher-surface codebase were analyzed. The nine design decisions above resolve every gap between the ACs and the current system — notably that most of this story's surface area already exists (per-request status checks, builder retry/draft preservation, offline-toast and retry-card patterns from 4.5) and the net-new work is: the pending redirect, one portal-wide toast, three offline-disabled buttons, a throw-safe report action, one client retry wrapper, and verification passes.

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5) via Claude Code

### Debug Log References

- Full gate: `npx vitest run` → 27 files / 277 tests green (baseline 249 + 28 new); `npx tsc --noEmit` → 0; `npx eslint <changed files>` → 0; `npx next build` → success.

### Completion Notes List

- **Task 1 (AC #1, D1/D2):** Teacher layout's non-APPROVED branch now calls `redirect('/register/teacher/pending')` instead of rendering inline copy; the `getTeacherAccountStatus` per-request DB read and the role check are untouched. The `common` import stays (nav labels use it); `teacherPendingApproval` remains in the locale for the pending page. **AD-6 end-to-end code trace:** admin flips `TeacherAccount.status` (direct DB update until 7.2) → teacher's next `/(teacher)/` navigation runs the layout → `getTeacherAccountStatus` performs a fresh DB read (layout awaits `auth()` + DB, so every portal route is dynamic — never cached) → non-APPROVED (PENDING, REJECTED, or missing row = `null`) → `redirect('/register/teacher/pending')`. Teacher's next server-action call → `requireTeacherAccountId` performs its own fresh `db.teacherAccount.findUnique` status read → returns `{ error: { code: 'UNAUTHORIZED' } }` per the action contract (actions never redirect/throw). **The JWT role claim is never the sole gate** — both paths re-read status from the DB on every request.
- **Task 1.3 matrix audit:** `requireTeacherAccountId`, `getClassReportAction`, `createAssignmentSetDraftAction`, `assignAssignmentSetAction` already carried the full 5-case AD-6 matrix. Added full `it.each` matrices (no session / wrong role / no TeacherAccount row / PENDING / REJECTED — the PENDING case IS the post-approval flip, the mock has no history) to: `getAssignmentBuilderContextAction`, `getQuestionLibraryAction` (each previously had one partial case, now superseded), `getAssignmentSetsAction`, `createClassAction` (single PENDING case replaced by the matrix), `getClassesAction`, `getClassDetailAction`. Every matrix also asserts the first repo call is never reached.
- **Task 2 (AC #2, D3):** New `teacher-offline-toast.tsx` mirrors 4.5's `dashboard-offline-toast.tsx` exactly: reuses `useOnlineStatus()` (student hook, cross-surface reuse per 4.5 convention) + exported pure `shouldFireOfflineToast` predicate + mount-skip ref guard; fires `toast(common.teacherOfflineToast)` once per falling edge via the globally mounted sonner `<Toaster />`. Mounted once in the layout's APPROVED branch — covers every portal page.
- **Task 3 (AC #2, D4):** `useOnlineStatus()` added to `assignment-set-builder.tsx` and `assign-set-dialog.tsx`; `|| !isOnline` added to exactly five disabled conditions: builder "Lưu nháp", builder "Giao bài", builder replace-confirm `AlertDialogAction`, dialog assign button, dialog replace-confirm `AlertDialogAction`. Navigation, filters, Back/Continue, Sheet/Dialog open/close untouched — browsing stays available. No offline checks in server actions; no changes to `assignment-builder-state.ts`.
- **Task 4 (AC #3, D5):** `getClassReportAction`'s repo+compute body wrapped in try/catch returning `{ error: { code: 'LOAD_FAILED' } }` — gate and zod stay outside; NOT_FOUND unchanged. Exported `ClassReportResult` union type. New `class-report-content.tsx` client wrapper (4.5 `dashboard-content.tsx` pattern): holds result in `useState`, renders inline retry card (`role="alert"` `reports.loadErrorMessage` + `assignments.retryCta` outline Button, `rounded-brand-md` bordered block matching the builder's error style) on error, re-invokes the action on click (own try/catch keeps the card on a mid-flight throw), renders the header + `<ClassReportTable>` (JSX moved from page.tsx unchanged) on success. `page.tsx` keeps the server-side first fetch and `notFound()`s only on `NOT_FOUND`/`VALIDATION_ERROR`.
- **Task 4.4 / D6 verification (builder half of AC #3):** code-traced after Task 3 edits — `fetchFailed`/`fetchAttempt` inline retry card (builder lines ~347–356) and always-mounted step state are intact; `createdDraftId` still guarantees no duplicate draft on retry. Task 3 only added disabled terms to three buttons; `assignment-builder-state.ts` and the fetch effect are untouched.
- **Task 5 (AC #4, D7) keyboard sweep:** grepped `src/app/(teacher)/**` + `src/components/teacher/**` for `onKeyDown`, `tabIndex`, mouse-only handlers, and click handlers on non-native elements — **zero findings**. Every interactive element is a shadcn `Button`/native `<button>` (incl. the report table's sort headers), `Input`, Base-UI `Checkbox`/`Select`/`Sheet`/`Dialog`/`AlertDialog`, or `next/link` `<a>` — all natively Tab/Enter-operable; Esc-close comes from the primitives. No `tabIndex` added to `<tr>` (rows non-interactive by design). The new retry button is a native `Button`; offline-disabled buttons drop out of tab order via `disabled` (standard), with the toast as the announcement.
- **Task 7.3:** No component-render tests added (no DOM environment — 4.5 precedent). Falling-edge toast logic already covered by `dashboard-offline-toast-state.test.ts` (reused pure function). `class-report-content.tsx` branching is a two-arm union check — code-traced, no predicate worth extracting. Offline-disable is a boolean OR at call sites — no new pure helpers per Task 3.3.
- **Live verification NOT performed** (sandbox — established fallback): offline DevTools toggle, status-flip via direct DB update, and the live Tab/Enter pass remain manual QA items. Verified instead via `next build` + 277 unit tests + the explicit code traces above. Manual QA needs an APPROVED teacher via direct DB update until Story 7.2.

### File List

- `src/components/teacher/teacher-offline-toast.tsx` (new)
- `src/components/teacher/class-report-content.tsx` (new)
- `src/app/(teacher)/layout.tsx` (modified — pending branch → redirect, toast mounted)
- `src/app/(teacher)/reports/actions.ts` (modified — throw-safe try/catch, `ClassReportResult` export)
- `src/app/(teacher)/reports/actions.test.ts` (modified — LOAD_FAILED case)
- `src/app/(teacher)/reports/[assignmentSetId]/page.tsx` (modified — split to client wrapper)
- `src/app/(teacher)/assignments/actions.test.ts` (modified — full AD-6 matrices ×3)
- `src/app/(teacher)/classes/actions.test.ts` (modified — full AD-6 matrices ×3)
- `src/components/teacher/assignment-set-builder.tsx` (modified — offline-disable ×3 buttons)
- `src/components/teacher/assign-set-dialog.tsx` (modified — offline-disable ×2 buttons)
- `src/locales/vi/common.ts` (modified — `teacherOfflineToast`)
- `src/locales/vi/reports.ts` (modified — `loadErrorMessage`)
- `_bmad-output/implementation-artifacts/5-7-teacher-portal-state-patterns-approval-gate-hardening.md` (story record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status tracking)

## Change Log

- 2026-07-24: Story implemented (all 7 tasks). Pending-approval branch converted to `redirect('/register/teacher/pending')`; portal-wide offline toast (reused 4.5 hook + predicate); five assignment-submission buttons offline-disabled; report action made throw-safe (`LOAD_FAILED`) with a client retry wrapper (`class-report-content.tsx`) per the 4.5 pattern; AD-6 test matrix completed across all 10 exported teacher actions (+28 tests, 249 → 277); keyboard sweep clean (zero findings); two locale keys added. Gate: vitest 277 green, tsc 0, eslint 0, next build success. Live browser pass not possible in sandbox — flagged in Completion Notes. Status: review.
- 2026-07-24: Story created via create-story workflow (ultimate context engine analysis: epics + architecture spine + UX docs + full teacher-surface codebase survey + Stories 4.5/5.6 intelligence). Key decisions: layout redirect to the existing pending page (D1), action-side gate stays return-based (D2), reuse 4.5's offline-toast hook/predicate portal-wide (D3), offline disables only assignment-submission buttons (D4), report retry via 4.5's server-first-fetch + client wrapper with a throw-safe action (D5), builder retry already exists — verify only (D6), keyboard nav is a sweep not a rebuild (D7). Zero schema changes, zero new dependencies. Status: ready-for-dev.
