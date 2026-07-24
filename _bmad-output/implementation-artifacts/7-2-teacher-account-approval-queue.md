---
baseline_commit: 9d0e8fa6515ead82f82e1ea8e21d164068d039b3
---

# Story 7.2: Teacher Account Approval Queue

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to view pending teacher registrations and approve or reject each one,
So that only verified teachers get access to the Teacher Portal.

## Acceptance Criteria

1. **Given** I am on `/admin/teachers`, **when** pending Teacher Account requests exist, **then** a list of `teacher-application-row` components renders, each showing: teacher name, school, grade taught, submitted date; with "Duyệt" and "Từ chối" action buttons (FR-26, UX-DR11).
2. **Given** no pending applications exist, **when** the page renders, **then** an empty state shows: "Không có đơn đăng ký nào đang chờ." (UX-DR16).
3. **Given** I tap "Duyệt" and confirm, **when** the action runs, **then** `TeacherAccount.status` is set to `APPROVED` immediately; `sendTeacherApprovalEmail()` is called; the row disappears from the queue (FR-26).
4. **Given** I tap "Từ chối", enter an optional rejection reason, and confirm, **when** the action runs, **then** `TeacherAccount.status` is set to `REJECTED`; `sendTeacherRejectionEmail(reason)` is called; the row disappears (FR-26).
5. Approve/reject actions are idempotent — acting on an already-processed account returns `{ error: { code: 'ALREADY_PROCESSED' } }`.
6. If offline, approve/reject buttons are disabled; a Toast fires once: "Không có kết nối." (UX-DR16).

## Design Decisions (resolved during story creation — do not re-litigate)

- **D1 — Idempotency via atomic status-guarded update, not read-then-write.** Use `db.teacherAccount.updateMany({ where: { id, status: 'PENDING' }, data: ... })` and inspect `count`. `count === 1` → processed. `count === 0` → do a `findUnique` to disambiguate: row missing → `{ error: { code: 'NOT_FOUND' } }`; row exists (status already APPROVED/REJECTED) → `{ error: { code: 'ALREADY_PROCESSED' } }` (AC #5). This is race-safe with two admin tabs — no transaction needed.
- **D2 — Email is best-effort, AFTER the DB write, result checked but never blocking.** `sendTeacherApprovalEmail` / `sendTeacherRejectionEmail` already exist in `src/infrastructure/email/resend.ts` (built in 5.2, deliberately unwired — this story is their designed trigger) and NEVER throw. Call after the successful status update; if the result is `{ error }`, `console.error` and still return success — a failed email must not roll back or fail an approval (same convention as the PayOS webhook's `sendSubscriptionActivatedEmail` call at `src/app/api/payments/payos/webhook/route.ts:50`). Do NOT wrap the email in the idempotency guard's error paths — no email on NOT_FOUND/ALREADY_PROCESSED.
- **D3 — Teacher email comes from `TeacherAccount.user.email`** (no email field on TeacherAccount). Fetch the application row with `select: { ..., user: { select: { email: true } } }` — copy the relation-select idiom from `subscription-repository.ts` `getParentEmailByOrderCode`. Fetch it BEFORE the updateMany (one findUnique serves both the email payload and the D1 disambiguation — order: findUnique → missing? NOT_FOUND → updateMany guard → count 0? ALREADY_PROCESSED → email → revalidate → success).
- **D4 — `fullName` is nullable** (pre-5.5 rows never stored it). Email functions take `name: string` and their templates already fall back to "Chào thầy/cô," on empty string — pass `teacher.fullName ?? ''`. In the UI row, render `admin.applicantNameFallback` ("Giáo viên") when `fullName` is null — never render an empty name slot.
- **D5 — Rejection reason is OPTIONAL (per AC #4 + EXPERIENCE.md line 158: "Reject → inline free-text reason field + confirm").** Zod: `reason: z.string().trim().max(500).optional()`. Persist to the existing `TeacherAccount.rejectedReason` column (`null` when blank — the column already exists, no migration). Template gap: `TeacherRejectionEmail` currently ALWAYS renders `emails.teacherRejectionReason(reason)` → "Lý do: " with a dangling colon on empty reason. Fix the template: render the reason `<Text>` line only when `props.reason.trim() !== ''` (update `src/infrastructure/email/templates/teacher-rejection-email.tsx` + its test in `templates.test.tsx`). Keep the `sendTeacherRejectionEmail(to, name, reason)` signature — pass `''` when no reason given.
- **D6 — Reason input = existing `Input` + `Label`, inside the reject confirm `AlertDialog`.** There is NO `Textarea` component in `src/components/ui/` — do not add one; a single-line reason field satisfies "inline free-text reason field". Approve also gets an `AlertDialog` confirm (AC #3 says "tap Duyệt **and confirm**").
- **D7 — No separate GET action; the page fetches via the repository is WRONG — use a server action.** Layer rule: presentation must not import from `src/infrastructure/` directly. Follow the reports-page precedent: `page.tsx` (Server Component) calls `getPendingTeachersAction()` from the actions file server-side and renders the result. Rows disappear after approve/reject via `revalidatePath('/admin/teachers')` inside the mutating actions (Next re-renders the server page automatically after a server action that revalidates).
- **D8 — Offline toast: new `src/components/admin/admin-offline-toast.tsx`, near-copy of `teacher-offline-toast.tsx`, mounted ONCE in `src/app/admin/teachers/page.tsx`** (UX scope: approval queue — EXPERIENCE.md line 213; do not mount portal-wide in the admin layout, Story 7.3 owns config-page states). REUSE `useOnlineStatus()` from `src/components/student/use-online-status.ts` and `shouldFireOfflineToast` from `src/components/parent/dashboard-offline-toast-state.ts` — never fork either (binding note from 4.5/5.7). Toast copy via new `admin.offlineToast: 'Không có kết nối.'` (exact string; surface-scoped key per convention — do not reuse `common.teacherOfflineToast` from another surface).
- **D9 — Submitted date rendered with `createdAt.toLocaleDateString('vi-VN')`** — the established idiom (`(parent)/account/page.tsx:38`). Grade taught rendered via a `gradeBandLabels` map (`GRADE_1: 'Lớp 1'`, …) added to `admin.ts` — mirror the `as const` map shape in `src/locales/vi/profiles.ts:22-26` (that one is surface-scoped to profiles; add admin's own).
- **D10 — No schema changes, no migrations, no new dependencies, no new shadcn components, no middleware.** Everything this story needs already exists except the queue UI, the actions, the repository, and locale keys.

## Tasks / Subtasks

- [x] Task 1: Teacher-account repository (AC: #1, #3, #4, #5)
  - [x] 1.1 New `src/infrastructure/repositories/teacher-account-repository.ts` (import `db` from `@/lib/db`, thin functions only — copy `class-repository.ts` style):
    - `listPendingTeacherApplications()` → `db.teacherAccount.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, select: { id, fullName, schoolName, gradeTaught, createdAt, user: { select: { email: true } } } })`. Export the row type (e.g. `PendingTeacherApplication`).
    - `getTeacherApplicationById(id)` → `findUnique` with the same select + `status`.
    - `markTeacherApplicationApproved(id)` → `updateMany({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED', rejectedReason: null } })` → returns `count`.
    - `markTeacherApplicationRejected(id, reason: string | null)` → `updateMany({ where: { id, status: 'PENDING' }, data: { status: 'REJECTED', rejectedReason: reason } })` → returns `count`.
  - [x] 1.2 Co-located `teacher-account-repository.test.ts` mocking `@/lib/db` (follow `class-repository.test.ts`): asserts the exact where/select/orderBy/data shapes.
- [x] Task 2: Server actions (AC: #3, #4, #5)
  - [x] 2.1 New `src/app/admin/teachers/actions.ts` (`'use server'`). Import `requireAdmin` from `@/app/admin/actions` (the single admin gate — do NOT re-implement), repository functions from Task 1, `sendTeacherApprovalEmail`/`sendTeacherRejectionEmail` from `@/infrastructure/email/resend`, `revalidatePath` from `next/cache`, `z` from zod. Local `type ActionResult<T> = { data: T } | { error: { code: string; message: string } }` (match `classes/actions.ts:17`).
  - [x] 2.2 `getPendingTeachersAction(): Promise<ActionResult<{ applications: PendingTeacherApplication[] }>>` — `requireAdmin()` → repo list wrapped in try/catch → `{ error: { code: 'LOAD_FAILED', ... } }` on throw.
  - [x] 2.3 `approveTeacherAction(input: { teacherAccountId: string })` — gate → zod (`teacherAccountId: z.string().min(1)`) → flow per D1/D2/D3: `getTeacherApplicationById` (missing → `NOT_FOUND`) → `markTeacherApplicationApproved` (count 0 → `ALREADY_PROCESSED`) → best-effort `sendTeacherApprovalEmail(user.email, fullName ?? '')` (D4) → `revalidatePath('/admin/teachers')` → `{ data: { teacherAccountId } }`. DB errors caught → `{ error: { code: 'UPDATE_FAILED', ... } }`. Never throw, never redirect.
  - [x] 2.4 `rejectTeacherAction(input: { teacherAccountId: string; reason?: string })` — same flow; zod `reason: z.string().trim().max(500).optional()`; persist `reason || null`; email `sendTeacherRejectionEmail(user.email, fullName ?? '', reason ?? '')` (D5).
  - [x] 2.5 Co-located `actions.test.ts` — follow `classes/actions.test.ts` idiom exactly: `vi.mock('@/lib/auth')`, `vi.mock('@/infrastructure/repositories/teacher-account-repository')`, `vi.mock('@/infrastructure/email/resend', () => ({ sendTeacherApprovalEmail: vi.fn(), sendTeacherRejectionEmail: vi.fn() }))` (template: `payos/webhook/route.test.ts:11-13`), `vi.mock('next/cache')`. Matrix per action: no session / PARENT / TEACHER → UNAUTHORIZED (use `it.each`); ADMIN happy path (status update + email called with `user.email` + revalidatePath `/admin/teachers`); NOT_FOUND; ALREADY_PROCESSED (count 0, row exists); email failure `{ error }` → action STILL returns `{ data }`; reject with reason → reason persisted + passed to email; reject without reason → `null` persisted + `''` to email; validation error on bad input.
- [x] Task 3: Rejection email template — conditional reason line (AC: #4; D5)
  - [x] 3.1 `src/infrastructure/email/templates/teacher-rejection-email.tsx`: render the `emails.teacherRejectionReason(...)` `<Text>` only when `props.reason.trim() !== ''`.
  - [x] 3.2 Update `templates.test.tsx`: reason present → "Lý do: …" in HTML; reason `''` → no "Lý do:" substring. Keep all existing assertions green.
- [x] Task 4: Locale keys (AC: #1, #2, #3, #4, #6)
  - [x] 4.1 Append to `src/locales/vi/admin.ts` (component code NEVER inlines Vietnamese): `teachersHeading` ('Duyệt giáo viên'), `teachersEmptyState: 'Không có đơn đăng ký nào đang chờ.'` (EXACT — EXPERIENCE.md line 211), `applicantNameFallback: 'Giáo viên'`, `submittedOn` label or `(date: string) =>` fn, `gradeBandLabels` map (`Lớp 1/2/3`, D9), `approveCta: 'Duyệt'`, `rejectCta: 'Từ chối'` (EXACT — epics AC), approve-confirm title/body + confirm CTA, reject-confirm title/body + confirm CTA, `rejectReasonLabel` + optional-hint placeholder, `cancelCta`, `submitting`, `approveSuccessToast`, `rejectSuccessToast`, `actionFailedToast`, `alreadyProcessedToast`, `offlineToast: 'Không có kết nối.'` (EXACT, D8). Remove `teachersComingSoon` only if unused after Task 6.
- [x] Task 5: `teacher-application-row` client component (AC: #1, #3, #4, #6)
  - [x] 5.1 New `src/components/admin/teacher-application-row.tsx` (`'use client'`, new `admin` components dir — kebab-case). Props: one `PendingTeacherApplication` (serialized — pass `createdAt` pre-formatted or as ISO string from the page; Server→Client boundary). Renders a `Card` with `rounded-brand-sm` (UX spec: `teacher-application-row` = Card, `{rounded.sm}`, "Name + school + actions inline"): name (D4 fallback), schoolName, grade label (D9), submitted date (D9), and two buttons ≥44px touch target: "Duyệt" (default variant) and "Từ chối" (`variant="outline"` — do not use alarm-red destructive styling as primary; adult surface, shadcn defaults).
  - [x] 5.2 Approve flow: `AlertDialog` confirm (copy `delete-child-profile-dialog.tsx` shape: `useState` open + `isSubmitting`, `AlertDialogAction disabled={isSubmitting || !isOnline}`). On confirm → `approveTeacherAction` → `'error' in result` ? (`ALREADY_PROCESSED` → `toast(admin.alreadyProcessedToast)`, else `toast.error(admin.actionFailedToast)`) : `toast.success(admin.approveSuccessToast)`; close dialog; `finally` reset submitting. Row removal comes from `revalidatePath` re-render — do NOT hand-roll optimistic list state.
  - [x] 5.3 Reject flow: second `AlertDialog` containing `Label` + `Input` for the optional reason (D6), controlled `useState('')`; confirm → `rejectTeacherAction({ teacherAccountId, reason: reason.trim() || undefined })`; same result handling.
  - [x] 5.4 Offline (AC #6): `const isOnline = useOnlineStatus()`; add `|| !isOnline` to BOTH trigger buttons' and both `AlertDialogAction`s' `disabled` (pattern: `assign-set-dialog.tsx`). Browsing/reading stays available.
  - [x] 5.5 If any pure decision logic emerges (e.g. toast-code mapping), extract to a colocated pure module with unit tests; otherwise skip — client components are not unit-tested in this repo (layout/page convention).
- [x] Task 6: Queue page (AC: #1, #2, #6)
  - [x] 6.1 Rewrite `src/app/admin/teachers/page.tsx` (currently a one-line coming-soon stub; layout already gates ADMIN + owns `<main>` `max-w-2xl` — do NOT add another `<main>` or re-gate). Server Component: heading `admin.teachersHeading` (`text-heading`), `await getPendingTeachersAction()`; `'error' in result` → inline error `<p>` (reuse the muted `text-body text-muted-foreground` idiom); empty list → `admin.teachersEmptyState` `<p>` (AC #2); else `<ul>` of `<li><TeacherApplicationRow …/></li>` (list idiom: `(teacher)/classes/page.tsx:51-63`).
  - [x] 6.2 New `src/components/admin/admin-offline-toast.tsx` per D8 (near-copy of `teacher-offline-toast.tsx`: `'use client'`, `useOnlineStatus`, `useRef` guard, `shouldFireOfflineToast`, `toast(admin.offlineToast)`, returns `null`). Mount once in the teachers page.
- [x] Task 7: Full gate before marking review
  - [x] 7.1 `npx vitest run` (baseline 356 green as of 7.1 — zero regressions), `npx tsc --noEmit`, `npx eslint` on changed files, `npx next build`. Note: run these OUTSIDE the CLI sandbox (sandboxed runs hang on this machine — 7.1 Debug Log).
  - [x] 7.2 Manual pass note for Toan (Epic 2 retro convention — flag, don't fake): seed (`npm run db:seed`), register a teacher (pending), log in as `admin@example.test` / `Password123!` → `/admin/teachers` shows the row; approve → row gone + teacher can enter portal; reject another with reason → row gone + `rejectedReason` stored; DevTools offline → buttons disabled + single toast. Live email delivery needs a real `RESEND_API_KEY` (sandbox sender delivers only to the Resend account owner — 5.2 note).

## Dev Notes

### CRITICAL — current state of files being modified

- **`src/app/admin/teachers/page.tsx`** is a 5-line stub rendering `admin.teachersComingSoon`. The admin layout (7.1) already provides the ADMIN gate (`redirect('/login')`), top nav, and the `max-w-2xl` `<main>` wrapper — pages render content only.
- **`src/infrastructure/email/resend.ts`** — `sendTeacherApprovalEmail(to, name)` (line 48) and `sendTeacherRejectionEmail(to, name, reason)` (line 56) exist, tested, and are called by NOTHING. They return `SendEmailResult = { data: { id } } | { error: { code } }` and never throw. Do not modify the adapter; only the rejection template changes (Task 3).
- **`src/app/admin/actions.ts`** — `requireAdmin()` returns `{ userId } | { error: { code: 'UNAUTHORIZED', ... } }`. Role-only check (AD-10) — there is NO admin status to re-read (unlike the teacher AD-6 dual gate). Import it; never duplicate it.
- **Prisma `TeacherAccount`** (schema lines 86–101): `fullName String?`, `schoolName String`, `gradeTaught GradeBand`, `status TeacherStatus @default(PENDING)`, `rejectedReason String?`, `createdAt`, `user` relation (email at `user.email`). `TeacherStatus`: `PENDING | APPROVED | REJECTED`. Everything needed already exists — NO migration.
- **Approval side-effects on the teacher side are already built — do not touch them.** Once status flips to `APPROVED`, sign-in (`credentials-authorize`) and the `(teacher)/layout.tsx` per-request status read (AD-6) grant portal access automatically; on `REJECTED`, the same mechanisms keep them out and 5.1's sign-in flow surfaces `rejectedReason`. This story's whole teacher-facing effect is the status write + email.

### Architecture compliance

- AD-10: gate via `requireAdmin()` in every action; the layout covers routes. AD-6: approval status is read fresh by teacher surfaces — your write is immediately effective. AD-14: email ONLY via `src/infrastructure/email/resend.ts` — no Resend SDK import anywhere near `src/app/`. [Source: ARCHITECTURE-SPINE.md#AD-6, #AD-10, #AD-14]
- Layer rules: page → server actions → repository → `db`. Page/components never import `src/infrastructure/` directly (D7). Actions return `{ data: T } | { error: { code, message } }` — never throw, never redirect.
- `revalidatePath('/admin/teachers')` after each successful mutation, before returning (convention: `classes/actions.ts:66`).

### Reuse — do NOT reinvent

| Need | Reuse | Where |
|---|---|---|
| Admin action gate | `requireAdmin()` | `src/app/admin/actions.ts` |
| Approval/rejection emails | `sendTeacherApprovalEmail` / `sendTeacherRejectionEmail` | `src/infrastructure/email/resend.ts:48,56` |
| Online status hook | `useOnlineStatus()` | `src/components/student/use-online-status.ts` |
| One-time toast predicate | `shouldFireOfflineToast` | `src/components/parent/dashboard-offline-toast-state.ts` |
| Offline toast component shape | `TeacherOfflineToast` | `src/components/teacher/teacher-offline-toast.tsx` |
| Confirm dialog + submit flow | `DeleteChildProfileDialog` | `src/components/parent/delete-child-profile-dialog.tsx` |
| Offline-disabled submit buttons | assign dialog | `src/components/teacher/assign-set-dialog.tsx:93,112` |
| Relation email select | `getParentEmailByOrderCode` | `src/infrastructure/repositories/subscription-repository.ts:81-86` |
| Best-effort email call-site | webhook handler | `src/app/api/payments/payos/webhook/route.ts:50` |
| Repository style | `class-repository.ts` | `src/infrastructure/repositories/` |
| Empty state + list idiom | classes page | `src/app/(teacher)/classes/page.tsx:32-63` |
| Toasts | `sonner` `toast` / `toast.success` / `toast.error` | `<Toaster />` already in root layout — zero setup |
| Date display | `.toLocaleDateString('vi-VN')` | `(parent)/account/page.tsx:38` |

### UX requirements

- `teacher-application-row` = shadcn `Card`, radius `rounded-brand-sm` (8px), name + school + actions inline. Adult surface: shadcn defaults, orange accent only, no mascot, Be Vietnam Pro, `text-heading` for the page heading, `text-body` for content. [Source: DESIGN.md line 261, adult surface rules]
- Behavioral spec: "Teacher name, school, grade, submitted date. Two actions: Approve | Reject. Reject → inline free-text reason field + confirm." [Source: EXPERIENCE.md line 158]
- States (EXPERIENCE.md lines 209–213): empty queue → "Không có đơn đăng ký nào đang chờ."; offline → Toast once "Không có kết nối." + approve/reject disabled.
- Buttons ≥44×44px touch target (`min-h-11` idiom from the admin nav).

### Testing

- Vitest 4.x, co-located `*.test.ts`, `npx vitest run`. Mock `@/lib/auth`, `@/lib/db` (repo tests), repository + email modules (action tests), `next/cache`. Canonical files: `src/app/(teacher)/classes/actions.test.ts` (action matrix, `it.each`), `src/app/api/payments/payos/webhook/route.test.ts` (email mock), `src/app/admin/actions.test.ts` (requireAdmin). Baseline: **356 tests green** (post-7.1) — zero regressions.
- `.tsx` tests work (vitest oxc JSX config landed in 5.2) — `templates.test.tsx` updates are safe.

### Previous story intelligence (7.1, 2026-07-24)

- `requireAdmin()` was placed in `src/app/admin/actions.ts` (`'use server'`) precisely so 7.2–7.4 import it — this story is the first consumer.
- The admin layout owns `<main>`; the 7.1 dev removed `<main>` wrappers from stub pages — keep pages wrapper-free.
- Full-gate discipline (vitest + tsc + eslint + next build) = definition of done; record results in Debug Log. Vitest/tsc/eslint/build hang inside the CLI sandbox on this machine — run outside.
- `text-subheading` is NOT a real utility — use `font-semibold`.
- Locale keys appended verbatim from the story; no inline Vietnamese ever.
- Manual-QA convention: browser-only verifications get an explicit "needs manual pass by Toan" note — never claimed as verified.

### Project structure notes

- New: `src/infrastructure/repositories/teacher-account-repository.ts` (+ test), `src/app/admin/teachers/actions.ts` (+ test), `src/components/admin/teacher-application-row.tsx`, `src/components/admin/admin-offline-toast.tsx`.
- Modified: `src/app/admin/teachers/page.tsx`, `src/locales/vi/admin.ts`, `src/infrastructure/email/templates/teacher-rejection-email.tsx` (+ `templates.test.tsx`).
- All kebab-case. No schema changes, no migrations, no new dependencies, no env vars. If you're adding any of these, stop — you've exceeded scope.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.2] (lines 1162–1188) — ACs verbatim
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-26]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-6, #AD-10, #AD-14, Consistency Conventions]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md line 261 — teacher-application-row spec]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md lines 154–158, 207–213 — admin components + states]
- [Source: _bmad-output/project-context.md — layer rules, auth rules, action return shape, locale rules]
- [Source: _bmad-output/implementation-artifacts/7-1-admin-panel-foundation-role-gate.md — admin shell, requireAdmin, conventions]
- [Source: _bmad-output/implementation-artifacts/5-2-resend-email-adapter-teacher-notification-emails.md — email adapter contract, unwired-by-design note]
- [Source: _bmad-output/implementation-artifacts/5-7-teacher-portal-state-patterns-approval-gate-hardening.md — offline toast/disable patterns, AD-6 flow]
- Existing code: `prisma/schema.prisma` (TeacherAccount 86–101), `src/infrastructure/email/resend.ts`, `src/app/admin/actions.ts`, `src/app/(teacher)/classes/actions.ts`, `src/components/parent/delete-child-profile-dialog.tsx`, `src/components/teacher/assign-set-dialog.tsx`, `src/components/teacher/teacher-offline-toast.tsx`

## Dev Agent Record

### Agent Model Used

claude-fable-5 (Claude Fable 5)

### Debug Log References

- Full gate (2026-07-24, run outside CLI sandbox per 7.1 note): `npx vitest run` → 37 files / **390 passed, 0 failed** (baseline 356 + 34 new); `npx tsc --noEmit` → exit 0; `npx eslint` on all 10 changed files → exit 0; `npx next build` → exit 0 (`/admin/teachers` builds as dynamic route, 6.92 kB).

### Completion Notes List

- Task 1: `teacher-account-repository.ts` — `listPendingTeacherApplications` (PENDING only, `createdAt asc`, select incl. `user.email` relation per D3), `getTeacherApplicationById` (same select + `status`), and atomic status-guarded `markTeacherApplicationApproved`/`markTeacherApplicationRejected` via `updateMany` returning `count` (D1). Approve clears `rejectedReason`. 6 unit tests asserting exact where/select/orderBy/data shapes.
- Task 2: `admin/teachers/actions.ts` — `getPendingTeachersAction`, `approveTeacherAction`, `rejectTeacherAction`. All gate via `requireAdmin()` first; flow per D1–D5: findUnique → NOT_FOUND → guarded updateMany → count 0 → ALREADY_PROCESSED → best-effort email (failure logged, action still succeeds) → `revalidatePath('/admin/teachers')`. Reject persists `reason || null` and passes `reason ?? ''` to the email. Never throws. 26 tests incl. UNAUTHORIZED matrix (no session/PARENT/TEACHER via `it.each`), NOT_FOUND, ALREADY_PROCESSED (no email/no revalidate), email-failure-still-succeeds, reason persisted/null, whitespace-only reason → null, 500-char zod cap, DB-throw → UPDATE_FAILED/LOAD_FAILED.
- Task 3: `TeacherRejectionEmail` renders the "Lý do:" line only when `reason.trim() !== ''` (D5). 2 new template tests (empty + whitespace-only reason → no "Lý do:"); all existing assertions kept green.
- Task 4: 22 new keys appended to `src/locales/vi/admin.ts` (heading, exact empty-state/offline-toast strings, name fallback, `submittedOn(date)`, `gradeBandLabels` map, CTAs, confirm dialog copy, reason label/placeholder, toasts). Removed `teachersComingSoon` (sole usage was the rewritten stub page).
- Task 5: `teacher-application-row.tsx` — Card `rounded-brand-sm`, name (fallback "Giáo viên" when `fullName` null, D4), school · grade label, submitted date; "Duyệt" (default) + "Từ chối" (outline) buttons `min-h-11` (≥44px). Approve/reject each in an `AlertDialog` confirm; reject dialog carries `Label` + `Input` (max 500) for the optional reason (D6). `ALREADY_PROCESSED` → neutral toast, other errors → `toast.error`, success → `toast.success`. `disabled={isSubmitting || !isOnline}` on both triggers AND both `AlertDialogAction`s (AC #6). Row removal relies on `revalidatePath` re-render — no local list state. Subtask 5.5: no pure module extracted — the only decision logic is a two-branch toast mapping with a direct `toast` side effect; client components are not unit-tested per repo convention.
- Task 6: `page.tsx` rewritten as a Server Component (no `<main>`, layout owns it): heading, error → `admin.teachersLoadFailed`, empty → exact `admin.teachersEmptyState`, else `<ul>/<li>` of rows with `createdAt.toLocaleDateString('vi-VN')` pre-formatted at the Server→Client boundary (D9). `admin-offline-toast.tsx` mounted once on this page only (D8), reusing `useOnlineStatus` + `shouldFireOfflineToast`.
- ⚠️ NEEDS MANUAL PASS BY TOAN (browser-only, Epic 2 retro convention — not claimed as verified): seed → register a teacher (pending) → log in `admin@example.test` / `Password123!` → `/admin/teachers` shows the row; approve → row gone + teacher can enter portal; reject another with reason → row gone + `rejectedReason` stored; DevTools offline → buttons disabled + single "Không có kết nối." toast. Live email delivery needs a real `RESEND_API_KEY` (sandbox sender delivers only to the Resend account owner).

### File List

- `src/infrastructure/repositories/teacher-account-repository.ts` (new)
- `src/infrastructure/repositories/teacher-account-repository.test.ts` (new)
- `src/app/admin/teachers/actions.ts` (new)
- `src/app/admin/teachers/actions.test.ts` (new)
- `src/components/admin/teacher-application-row.tsx` (new)
- `src/components/admin/admin-offline-toast.tsx` (new)
- `src/app/admin/teachers/page.tsx` (modified — stub → queue page)
- `src/locales/vi/admin.ts` (modified — 7.2 keys added, `teachersComingSoon` removed)
- `src/infrastructure/email/templates/teacher-rejection-email.tsx` (modified — conditional reason line)
- `src/infrastructure/email/templates/templates.test.tsx` (modified — 2 new reason-omission tests)

## Change Log

- 2026-07-24: Story 7.2 implemented (all 7 tasks): teacher-account repository with atomic status-guarded approve/reject, admin server actions wiring the 5.2 approval/rejection emails (best-effort, post-write), rejection template dangling-"Lý do:" fix, approval queue UI (`teacher-application-row` + confirm dialogs + optional reason input), empty/error/offline states, 22 admin locale keys. Full gate green: 390 vitest (34 new) / tsc / eslint / next build. Status → review; browser manual pass flagged for Toan.
- 2026-07-24: Story created via create-story workflow (ultimate context engine analysis: epics Story 7.2 + ARCHITECTURE-SPINE AD-6/AD-10/AD-14 + DESIGN.md/EXPERIENCE.md admin specs + project-context + full codebase survey + 7.1/5.2/5.7 story intelligence). Key findings baked in: email functions exist unwired (5.2) — this story is their trigger; idempotency via atomic `updateMany` status guard; `fullName` nullable + email via `user.email` relation; rejection template dangling-"Lý do:" fix; offline pattern reuse chain (`useOnlineStatus` + `shouldFireOfflineToast` + sonner); no schema changes needed (`rejectedReason` column exists). Status: ready-for-dev.
