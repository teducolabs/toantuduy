---
baseline_commit: 7729613
---

# Story 7.3: Session Configuration Panel

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to set the global session question count and optional time limit,
So that I can tune the practice experience without a code deploy.

## Acceptance Criteria

1. **Given** I am on `/admin/config`, **when** the `session-config-form` renders, **then** it shows: a number input for question count (current value from `GlobalConfig.SESSION_QUESTION_COUNT`, valid range 5–30) and a toggle + minutes input for the optional per-session time limit (FR-27, UX-DR11).
2. **Given** I submit a valid question count (5–30), **when** the save action runs, **then** `GlobalConfig.SESSION_QUESTION_COUNT` is updated; a Toast confirms: "Đã lưu. Cài đặt mới áp dụng cho buổi tiếp theo." (FR-27, UX-DR16). **And** in-progress Sessions are not affected — only newly started Sessions use the new value (FR-27).
3. **Given** I submit a question count outside 5–30, **when** the form validates, **then** an inline validation error appears before submission; the form is not submitted.
4. **Given** save fails due to a server error, **when** the error occurs, **then** an inline error shows: "Lưu không thành công. Thử lại."; form values are preserved (UX-DR16).
5. All form inputs have associated `<label>` elements; errors linked via `aria-describedby`.

## Design Decisions (resolved during story creation — do not re-litigate)

- **D1 — "Disabled time limit" representation: value `'0'`.** `SESSION_TIME_LIMIT_MINUTES` exists only as a schema comment today — no getter, no consumer, no row (Story 3.2/3.3 deliberately deferred inventing a "disabled" representation to this story). Decide it now: store `'0'` when the toggle is off, a positive integer string when on. The new getter `getSessionTimeLimitMinutes(): Promise<number | null>` returns `null` when the row is missing, unparsable, or `<= 0` — so "never configured" and "explicitly disabled" both read as `null` (disabled), which is the correct default. Always upsert (never delete the row) — one write path, no delete semantics.
- **D2 — Writes are `db.globalConfig.upsert` keyed on `key`.** `GlobalConfig` rows are NOT seeded anywhere (open action item from Epic 1; `deferred-work.md`) — a plain `update` would crash on a fresh database. `upsert({ where: { key }, update: { value }, create: { key, value } })`, value always `String(n)` (the `value` column is `String`, parsed by consumers — schema line 223). This is the repo's first `upsert`; there is no existing idiom to copy.
- **D3 — "Applies to next session" requires ZERO extra code.** `getSessionQuestionCount()` is read fresh from the DB at every session start (`src/app/(student)/session-question-selection.ts:37`) and at assignment-set validation (`src/app/(teacher)/assignments/actions.ts:31,84`). In-progress sessions already hold their question list. Do NOT build any cache-busting, event, or session-migration logic for AC #2's second sentence — it is already true by construction. `revalidatePath('/admin/config')` after save is still required so the admin page itself re-renders fresh values.
- **D4 — Nothing consumes the time limit yet — do NOT build a session timer.** FR-27 scope is the *configuration ability only*. No student-surface countdown, no session-expiry logic, no timer UI anywhere. This story writes the key and exposes the getter; a future story wires a consumer. Adding a timer is scope creep — stop if you find yourself in `src/app/(student)/`.
- **D5 — Toggle = existing `Checkbox` + `Label`, NOT a new shadcn Switch.** There is no `switch.tsx` in `src/components/ui/` and stories must not add shadcn components/dependencies without cause (7.2 D10 precedent). The existing `Checkbox` (`src/components/ui/checkbox.tsx`, used in `assignment-set-builder.tsx`) with a proper `<Label htmlFor>` satisfies "toggle + minutes field" (EXPERIENCE.md line 159) behaviorally and is accessible. Minutes `Input` is `disabled` when the checkbox is unchecked; when re-enabled it keeps its last value (form values preserved — UX-DR16 spirit).
- **D6 — Client validation BEFORE submit (AC #3) + zod on the server (defense in depth).** Follow the `child-profile-form.tsx` idiom exactly: `useState` fields, validate in `handleSubmit` before calling the action, single error `<p role="alert" id={errorId}>` linked via `aria-describedby`/`aria-invalid` (AC #5). Server action re-validates with zod: `questionCount: z.number().int().min(5).max(30)`, `timeLimitMinutes: z.number().int().min(1).max(180).nullable()`. Cap 180 is a sanity bound (PRD says only "positive integer"; 3 hours is beyond any plausible session).
- **D7 — Save = one server action writing both keys; success → Toast, failure → inline error.** `saveSessionConfigAction({ questionCount, timeLimitMinutes })` gates via `requireAdmin()` (import from `@/app/admin/actions` — never re-implement), zod-parses, upserts both keys, `revalidatePath('/admin/config')`, returns `{ data: { questionCount, timeLimitMinutes } }`. DB throw → `{ error: { code: 'SAVE_FAILED', ... } }`. Client: `'error' in result` → set inline error `admin.configSaveFailed` ("Lưu không thành công. Thử lại." — EXACT, EXPERIENCE.md line 214), keep all field state (AC #4 — do NOT reset the form); success → `toast.success(admin.configSavedToast)` ("Đã lưu. Cài đặt mới áp dụng cho buổi tiếp theo." — EXACT, EXPERIENCE.md line 212).
- **D8 — Initial values fetched server-side via a GET action (layer rule — D7 of Story 7.2).** `page.tsx` (Server Component) calls `getSessionConfigAction()` from the actions file; presentation never imports `src/infrastructure/` directly. Returns `{ questionCount: number, timeLimitMinutes: number | null }` (question count falls back to 10 via the existing getter when no row exists). Load failure → inline muted `<p>` with `admin.configLoadFailed`, no form (same shape as `teachersLoadFailed` on the queue page).
- **D9 — Offline: reuse `AdminOfflineToast` + disable Save when offline.** 7.2's D8 explicitly left config-page states to this story. Mount the existing `src/components/admin/admin-offline-toast.tsx` once on the config page and add `|| !isOnline` (`useOnlineStatus()`) to the Save button's `disabled` — same pattern as the queue. Reading the form stays available offline. Do NOT fork the toast component or mount it in the admin layout.
- **D10 — Scope fence: no schema changes, no migrations, no new dependencies, no new shadcn components, no middleware, no student/teacher surface changes.** New code = repository getter/setters, one actions file, one form component, one page rewrite, locale keys, tests. If you're adding anything else, you've exceeded scope.

## Tasks / Subtasks

- [x] Task 1: GlobalConfig repository — time-limit getter + setters (AC: #1, #2)
  - [x] 1.1 Extend `src/infrastructure/repositories/global-config-repository.ts` (keep existing style — thin functions over `db`):
    - `getSessionTimeLimitMinutes(): Promise<number | null>` — `findUnique({ where: { key: 'SESSION_TIME_LIMIT_MINUTES' } })`; return `null` when row missing, `parseInt` non-finite, or parsed `<= 0`; else the positive int (D1). (Note: the private `getConfigIntOrNull` helper is close but returns `0` for `'0'` — either extend it with a positives-only variant or write the mapping inline; do not change `getSubscriptionPlanPricing` behavior.)
    - `setSessionQuestionCount(count: number): Promise<void>` — `upsert` on key `SESSION_QUESTION_COUNT`, value `String(count)` (D2).
    - `setSessionTimeLimitMinutes(minutes: number | null): Promise<void>` — `upsert` on key `SESSION_TIME_LIMIT_MINUTES`, value `minutes === null ? '0' : String(minutes)` (D1, D2).
  - [x] 1.2 Extend `global-config-repository.test.ts` (mock `@/lib/db` — add `upsert: vi.fn()` to the existing `globalConfig` mock): getter → null on missing row / `'0'` / `'-5'` / `'garbage'`, returns `20` for `'20'`; setters → assert exact upsert shapes (`where.key`, `update.value`, `create.{key,value}`), disabled → `'0'`. Keep all 12 existing tests green.
- [x] Task 2: Server actions (AC: #1, #2, #4)
  - [x] 2.1 New `src/app/admin/config/actions.ts` (`'use server'`). Imports: `requireAdmin` from `@/app/admin/actions`, repository functions from Task 1 (`getSessionQuestionCount` too), `revalidatePath` from `next/cache`, `z` from zod. Local `type ActionResult<T> = { data: T } | { error: { code: string; message: string } }` (match `admin/teachers/actions.ts`).
  - [x] 2.2 `getSessionConfigAction(): Promise<ActionResult<{ questionCount: number; timeLimitMinutes: number | null }>>` — `requireAdmin()` → `Promise.all([getSessionQuestionCount(), getSessionTimeLimitMinutes()])` in try/catch → throw → `{ error: { code: 'LOAD_FAILED', ... } }`.
  - [x] 2.3 `saveSessionConfigAction(input: { questionCount: number; timeLimitMinutes: number | null })` — gate → zod (`questionCount` int 5–30, `timeLimitMinutes` int 1–180 nullable, D6) → invalid → `{ error: { code: 'VALIDATION_ERROR', ... } }` → `setSessionQuestionCount` + `setSessionTimeLimitMinutes` (both, always — D7) → `revalidatePath('/admin/config')` → `{ data: input }`. DB throw → `SAVE_FAILED`. Never throws, never redirects.
  - [x] 2.4 Co-located `actions.test.ts` — follow `admin/teachers/actions.test.ts` idiom exactly: `vi.mock('@/lib/auth')`, `vi.mock('@/infrastructure/repositories/global-config-repository')`, `vi.mock('next/cache')`. Matrix per action: no session / PARENT / TEACHER → UNAUTHORIZED (`it.each`); ADMIN happy path (both setters called with right args + `revalidatePath('/admin/config')`); disabled time limit → `setSessionTimeLimitMinutes(null)`; zod rejects 4, 31, non-int 7.5, `timeLimitMinutes: 0`, 181 → `VALIDATION_ERROR` and NO setter/revalidate calls; setter throw → `SAVE_FAILED`; getter throw → `LOAD_FAILED`; get happy path returns both values.
- [x] Task 3: Locale keys (AC: #1, #2, #3, #4)
  - [x] 3.1 Append to `src/locales/vi/admin.ts` (NEVER inline Vietnamese in components): `configHeading: 'Cấu hình buổi học'`, `questionCountLabel: 'Số câu hỏi mỗi buổi'`, `questionCountHint: 'Từ 5 đến 30 câu.'`, `questionCountInvalid: 'Số câu hỏi phải từ 5 đến 30.'`, `timeLimitToggleLabel: 'Giới hạn thời gian mỗi buổi'`, `timeLimitMinutesLabel: 'Thời gian (phút)'`, `timeLimitInvalid: 'Thời gian phải từ 1 đến 180 phút.'`, `saveCta: 'Lưu'` (EXPERIENCE.md line 159: "Lưu" saves), `configSavedToast: 'Đã lưu. Cài đặt mới áp dụng cho buổi tiếp theo.'` (EXACT), `configSaveFailed: 'Lưu không thành công. Thử lại.'` (EXACT), `configLoadFailed: 'Không thể tải cấu hình. Vui lòng thử lại.'`. Remove `configComingSoon` (sole usage is the stub page rewritten in Task 5). Reuse existing `submitting`.
- [x] Task 4: `session-config-form` client component (AC: #1, #2, #3, #4, #5)
  - [x] 4.1 New `src/components/admin/session-config-form.tsx` (`'use client'`). Props: `{ initialQuestionCount: number; initialTimeLimitMinutes: number | null }` (plain serializable values across the Server→Client boundary). UX spec: `session-config-form` = `Card` + form, `rounded-brand-sm`, number input + toggle + save CTA (DESIGN.md line 262). Adult surface: shadcn defaults, Be Vietnam Pro, `text-body`; Save button `min-h-11` (≥44px touch target).
  - [x] 4.2 State (copy `child-profile-form.tsx` shape): `questionCount` as string (`useState(String(initialQuestionCount))` — string state avoids NaN churn while typing), `timeLimitEnabled` (`initialTimeLimitMinutes !== null`), `timeLimitMinutes` string (`initial ?? 25` as prefill when null), `error: string | null`, `isSubmitting`. `useId()` for the error id.
  - [x] 4.3 Markup: `<Label htmlFor>` on question-count `Input` (`type="number"`, `min={5}` `max={30}` `inputMode="numeric"`), muted hint `<p>` with `questionCountHint`; `Checkbox` + `Label` for the toggle (D5); minutes `Input` (`type="number"`, `min={1}` `max={180}`) with its own `Label`, `disabled={!timeLimitEnabled}`; single error `<p role="alert" id={errorId} className="text-sm text-feedback-incorrect">`; every input gets `aria-describedby={error ? errorId : undefined}` + `aria-invalid` (AC #5, idiom `child-profile-form.tsx:97-98,118-122`).
  - [x] 4.4 `handleSubmit`: `preventDefault`, clear error; parse `questionCount` → not an integer or outside 5–30 → `setError(admin.questionCountInvalid)`, return (AC #3 — form NOT submitted); if enabled, parse minutes → not an integer in 1–180 → `setError(admin.timeLimitInvalid)`, return; call `saveSessionConfigAction({ questionCount: n, timeLimitMinutes: enabled ? m : null })`; `'error' in result` → `setError(admin.configSaveFailed)` and PRESERVE all field state (AC #4 — no resets); else `toast.success(admin.configSavedToast)` (sonner, `<Toaster />` already in root layout); `finally` reset `isSubmitting`.
  - [x] 4.5 Offline (D9): `const isOnline = useOnlineStatus()` (from `@/components/student/use-online-status`); Save button `disabled={isSubmitting || !isOnline}`; label swaps to `admin.submitting` while submitting.
  - [x] 4.6 No unit test for the component (client components are not unit-tested in this repo — layout/page convention). If any pure decision logic grows beyond the two inline range checks, extract it to a colocated pure module with tests; otherwise skip.
- [x] Task 5: Config page (AC: #1)
  - [x] 5.1 Rewrite `src/app/admin/config/page.tsx` (currently a one-line coming-soon stub; the admin layout already gates ADMIN and owns the `max-w-2xl` `<main>` — do NOT add `<main>` or re-gate). Server Component: heading `admin.configHeading` (`text-heading`), `await getSessionConfigAction()`; `'error' in result` → `<p className="text-body text-muted-foreground">{admin.configLoadFailed}</p>`; else `<SessionConfigForm initialQuestionCount={...} initialTimeLimitMinutes={...} />`. Mount `<AdminOfflineToast />` once (D9).
- [x] Task 6: Full gate before marking review
  - [x] 6.1 `npx vitest run` (baseline **390 green** post-7.2 — zero regressions), `npx tsc --noEmit`, `npx eslint` on changed files, `npx next build`. Run OUTSIDE the CLI sandbox (sandboxed runs hang on this machine — 7.1 Debug Log).
  - [x] 6.2 Manual pass note for Toan (Epic 2 retro convention — flag, don't fake): log in `admin@example.test` / `Password123!` → `/admin/config` shows form with count 10 (fresh DB, no row); save 15 + time limit on 20′ → success toast, `GlobalConfig` rows `SESSION_QUESTION_COUNT='15'`, `SESSION_TIME_LIMIT_MINUTES='20'`; start a student session → 15 questions; toggle time limit off + save → row value `'0'`; enter 4 or 31 → inline error, no request; DevTools offline → Save disabled + single "Không có kết nối." toast.

## Dev Notes

### CRITICAL — current state of files being modified

- **`src/app/admin/config/page.tsx`** is a 5-line stub rendering `admin.configComingSoon`. The admin layout (7.1) provides the ADMIN gate (`redirect('/login')`), top nav (Session Config item already links here), and the `max-w-2xl` `<main>` wrapper — pages render content only.
- **`src/infrastructure/repositories/global-config-repository.ts`** — read-only today: `getConfigInt` (fallback-based), `getConfigIntOrNull`, exported getters for allotment/question-count/pricing. `SESSION_QUESTION_COUNT` default is **10**. There are NO write functions and NO `SESSION_TIME_LIMIT_MINUTES` getter — this story adds all three functions (Task 1). Do not alter existing getter behavior: `session-question-selection.ts`, `assignments/actions.ts`, and subscription actions depend on it.
- **Prisma `GlobalConfig`** (schema lines 220–225): `id` cuid, `key String @unique`, `value String` (string-typed by design — parsed by consumer), `updatedAt`. `SESSION_TIME_LIMIT_MINUTES` is named only in the schema comment. NO migration needed.
- **Rows may not exist.** GlobalConfig is never seeded (open Epic 1 action item). All writes MUST be upserts (D2); the read path already falls back (10 for count, `null` for time limit).
- **Downstream consumers of `SESSION_QUESTION_COUNT` — do not touch them:** session start builds the question list once at creation (`session-question-selection.ts:37`), so in-progress sessions are naturally unaffected; the teacher assignment-set builder uses the same value as its max-questions cap (`assignments/actions.ts:31,84`) — an admin lowering the count also lowers the assignment cap for *new* validation; that is by design (FR-20).

### Architecture compliance

- AD-10: gate every action via `requireAdmin()` (`src/app/admin/actions.ts` — role-only check, no DB status re-read); the layout covers routes. FR-27 maps to `src/app/admin/config/` (SPINE Requirements→Structure table, line 378). [Source: ARCHITECTURE-SPINE.md#AD-10]
- Layer rules: page → server actions → repository → `db`. Page/components never import `src/infrastructure/` directly (D8). Actions return `{ data: T } | { error: { code, message } }` — never throw, never redirect.
- `revalidatePath('/admin/config')` after successful save, before returning (convention: `teachers/actions.ts`).
- GlobalConfig `value` stays a string; all typing/parsing lives in the repository (schema line 223 comment is the contract).

### Reuse — do NOT reinvent

| Need | Reuse | Where |
|---|---|---|
| Admin action gate | `requireAdmin()` | `src/app/admin/actions.ts` |
| Config read fns + repo style | `getConfigInt` / `getSessionQuestionCount` | `src/infrastructure/repositories/global-config-repository.ts` |
| Inline-validated client form shape | `ChildProfileForm` | `src/components/parent/child-profile-form.tsx` (state, `useId`, `aria-describedby`, error `<p role="alert">`) |
| Checkbox toggle | `Checkbox` | `src/components/ui/checkbox.tsx` (usage: `assignment-set-builder.tsx`) |
| Inputs/labels/buttons/card | `Input`, `Label`, `Button`, `Card` | `src/components/ui/` |
| Offline toast (mount as-is) | `AdminOfflineToast` | `src/components/admin/admin-offline-toast.tsx` (7.2) |
| Online status hook | `useOnlineStatus()` | `src/components/student/use-online-status.ts` |
| Toasts | sonner `toast.success` | `<Toaster />` already in root layout — zero setup |
| Action-test matrix idiom | teachers actions tests | `src/app/admin/teachers/actions.test.ts` (`it.each` UNAUTHORIZED matrix) |
| Config repo test harness | `mockConfigRows` helper | `src/infrastructure/repositories/global-config-repository.test.ts` |

### UX requirements

- `session-config-form` = `Card` + `Form`, radius `rounded-brand-sm` (8px), "Number input + toggle + save CTA". [Source: DESIGN.md line 262]
- Behavioral spec: "Question count field (number input, 5–30 validation), time limit toggle + minutes field. 'Lưu' saves; confirms 'Áp dụng cho buổi tiếp theo.'" [Source: EXPERIENCE.md line 159]
- Admin Mode States (EXPERIENCE.md lines 212, 214): saved → Toast "Đã lưu. Cài đặt mới áp dụng cho buổi tiếp theo."; save error → inline "Lưu không thành công. Thử lại." with form values preserved. Both strings EXACT.
- Adult surface: shadcn defaults, orange accent only, no mascot, Be Vietnam Pro, `text-heading` heading, `text-body` content, buttons ≥44×44px (`min-h-11`). `text-subheading` is NOT a real utility — use `font-semibold`.

### Testing

- Vitest 4.x, co-located `*.test.ts`, `npx vitest run`. Mock `@/lib/db` (repo tests) / `@/lib/auth` + repository + `next/cache` (action tests). Canonical files: `admin/teachers/actions.test.ts`, `global-config-repository.test.ts`. Baseline: **390 tests green** (post-7.2) — zero regressions.
- Repo test gotcha: the existing db mock only stubs `findUnique` — add `upsert: vi.fn()` to the mock factory and reset it in `beforeEach`.

### Previous story intelligence (7.2, 2026-07-24)

- `requireAdmin()` import (never re-implement); actions-file `ActionResult<T>` local type; `revalidatePath` inside the mutating action — all established, copy them.
- `AdminOfflineToast` was deliberately mounted per-page (not layout-wide) with config-page states reserved for this story (7.2 D8) — mount it here too, don't move it to the layout.
- Full-gate discipline (vitest + tsc + eslint + next build, run outside the sandbox) = definition of done; record results in Debug Log.
- Locale keys appended verbatim from the story; no inline Vietnamese ever; remove a `*ComingSoon` key only when its stub usage is rewritten.
- Manual-QA convention: browser-only verifications get an explicit "needs manual pass by Toan" note — never claimed as verified.

### Project structure notes

- New: `src/app/admin/config/actions.ts` (+ `actions.test.ts`), `src/components/admin/session-config-form.tsx`.
- Modified: `src/app/admin/config/page.tsx` (stub → config page), `src/infrastructure/repositories/global-config-repository.ts` (+ test), `src/locales/vi/admin.ts` (7.3 keys added, `configComingSoon` removed).
- All kebab-case. No schema changes, no migrations, no new dependencies, no new shadcn components, no env vars (D10).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.3] (lines 1190–1215) — ACs verbatim
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-27] (lines 399–406) — 5–30 inclusive; time limit positive int or disabled; next-session semantics
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-10, GlobalConfig entity (line 318), Requirements→Structure line 378]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md line 262 — session-config-form spec]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md lines 74, 159, 207–214 — surface, component behavior, admin states]
- [Source: _bmad-output/project-context.md — layer rules, action return shape, locale rules, session-count 5–30 admin-configurable]
- [Source: _bmad-output/implementation-artifacts/7-2-teacher-account-approval-queue.md — admin action/test idioms, AdminOfflineToast, conventions]
- [Source: _bmad-output/implementation-artifacts/3-2-question-session-repository-infrastructure.md, 3-3-session-start-free-tier-daily-gate.md — SESSION_TIME_LIMIT_MINUTES deliberately deferred to this story]
- Existing code: `prisma/schema.prisma` (GlobalConfig 220–225), `src/infrastructure/repositories/global-config-repository.ts`, `src/app/admin/actions.ts`, `src/app/(student)/session-question-selection.ts:37`, `src/app/(teacher)/assignments/actions.ts:31,84`, `src/components/parent/child-profile-form.tsx`

## Dev Agent Record

### Agent Model Used

claude-fable-5 (Claude Fable 5)

### Debug Log References

- Full gate (2026-07-24, run outside CLI sandbox per 7.1 note):
  - `npx vitest run` — 38 files, **414 tests passed** (baseline 390 + 24 new: 8 repository + 16 actions), zero regressions
  - `npx tsc --noEmit` — exit 0
  - `npx eslint` on all 7 changed files — exit 0
  - `npx next build` — exit 0, `/admin/config` builds as dynamic route

### Completion Notes List

- Task 1: Added `getSessionTimeLimitMinutes()` (returns `null` for missing row, `'0'`, negative, or non-numeric values — D1), plus `setSessionQuestionCount` / `setSessionTimeLimitMinutes` via a shared `upsertConfig` helper (D2 — repo's first upsert; rows are never seeded). Existing getters untouched. 8 new repo tests assert exact upsert shapes and all null-mapping branches; all pre-existing tests green.
- Task 2: New `src/app/admin/config/actions.ts` with `getSessionConfigAction` (Promise.all over both getters → `LOAD_FAILED` on throw) and `saveSessionConfigAction` (requireAdmin → zod 5–30 / 1–180-nullable → both setters always → `revalidatePath('/admin/config')`; `SAVE_FAILED` on throw). Never throws, never redirects. 16 tests including the `it.each` UNAUTHORIZED matrix, invalid-input matrix (4, 31, 7.5, 0, 181) asserting no writes/revalidate, and disabled-time-limit passthrough.
- Task 3: 11 locale keys appended to `admin.ts` (exact EXPERIENCE.md strings for toast/save-failure); `configComingSoon` removed with its sole stub usage.
- Task 4: `SessionConfigForm` client component following `child-profile-form.tsx` idiom — string state, `useId` error id, single `<p role="alert">` with `aria-describedby`/`aria-invalid` on all inputs (AC #5), client validation before submit (AC #3), field state preserved on save failure (AC #4), sonner success toast, Checkbox toggle (D5) with minutes input disabled-but-value-kept, Save `disabled={isSubmitting || !isOnline}` (D9). No component unit test (repo convention); validation logic is two inline range checks via a small pure helper.
- Task 5: `/admin/config/page.tsx` rewritten as Server Component: heading, `getSessionConfigAction()`, load-failure muted `<p>`, else form with initial values; `AdminOfflineToast` mounted once (same shape as teachers page).
- D3/D4 honored: zero cache-busting/session-migration code (count already read fresh at session start), zero timer code, no changes under `src/app/(student)/` or `src/app/(teacher)/`.
- ⚠️ **Needs manual pass by Toan** (browser-only, per Epic 2 retro convention — not claimed as verified): login `admin@example.test` / `Password123!` → `/admin/config` shows count 10 on fresh DB; save 15 + limit 20′ → toast + rows `'15'`/`'20'`; student session picks up 15; toggle off → row `'0'`; 4/31 → inline error with no request; DevTools offline → Save disabled + single "Không có kết nối." toast.

### File List

- src/infrastructure/repositories/global-config-repository.ts (modified — getter + 2 setters)
- src/infrastructure/repositories/global-config-repository.test.ts (modified — upsert mock + 8 tests)
- src/app/admin/config/actions.ts (new)
- src/app/admin/config/actions.test.ts (new)
- src/components/admin/session-config-form.tsx (new)
- src/app/admin/config/page.tsx (modified — stub → config page)
- src/locales/vi/admin.ts (modified — 7.3 keys added, configComingSoon removed)

## Change Log

- 2026-07-24: Story 7.3 implemented (all 6 tasks): GlobalConfig time-limit getter + upsert setters, session-config server actions, `SessionConfigForm` with client+server validation and offline handling, `/admin/config` page rewrite, locale keys. Full gate green (414 tests, tsc, eslint, next build). Status: review.
- 2026-07-24: Story created via create-story workflow (ultimate context engine analysis: epics Story 7.3 + FR-27 + ARCHITECTURE-SPINE AD-10 + DESIGN.md/EXPERIENCE.md session-config specs + project-context + codebase survey + 7.1/7.2/3.2/3.3 story intelligence). Key findings baked in: GlobalConfig never seeded → writes must be upserts; `SESSION_TIME_LIMIT_MINUTES` has no getter/consumer — '0' = disabled representation decided here, getter returns `number | null`, NO session timer in scope; "applies to next session" already true by construction (count read fresh at session start); no shadcn Switch exists → Checkbox toggle; exact Vietnamese state strings from EXPERIENCE.md; offline pattern reuses 7.2's AdminOfflineToast. Status: ready-for-dev.
