---
baseline_commit: c70e7cb509d5a0cd0ca0095abe82c828e5e03588
---

# Story 5.2: Resend Email Adapter & Teacher Notification Emails

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a single Resend email adapter and teacher approval/rejection email templates,
so that all outbound teacher notification email goes through one place with no direct SDK calls from surfaces.

## Acceptance Criteria

1. **Given** `src/infrastructure/email/resend.ts` exists, **when** any server action needs to send email, **then** it calls the adapter — no `src/app/` or `src/domain/` code imports from the Resend SDK directly (AD-14).
2. **And** `sendTeacherApprovalEmail(to, name)` sends a confirmation email informing the teacher their account is approved and they can log in.
3. **And** `sendTeacherRejectionEmail(to, name, reason)` sends a rejection email with the provided reason.
4. **And** email functions return `{ data: { id: string } } | { error: { code: string } }`; failures are logged but do not throw to callers.
5. **And** email templates are React Email components in `src/infrastructure/email/templates/`; all Vietnamese copy is sourced from `src/locales/vi/`.

## Tasks / Subtasks

- [x] Task 1: Install React Email rendering packages (AC: #5)
  - [x] 1.1 `npm install @react-email/components @react-email/render` — these are NOT installed yet (verified in `package.json`; only `resend@^6.17.2` is present). Keep the two `@react-email/*` packages at their latest versions and in sync with each other (React Email 5.x supports React 19 / Next.js 15+, which matches this project's `react@^19` / `next@15.3.9`).
  - [x] 1.2 Do NOT install the `react-email` CLI/preview-server package — it is a dev-preview tool this project does not need; only the component library and renderer are required. Do not add a preview `dev` script.
  - [x] 1.3 Verify `npx next build` and `npx vitest run` still pass after install before writing any code (React Email packages have had `@types/react` peer friction historically — catch it early).

- [x] Task 2: Rework the adapter to the non-throwing result shape (AC: #1, #4)
  - [x] 2.1 **Read `src/infrastructure/email/resend.ts` first — it already exists** (built in Story 1.4). Current state: exports `sendEmail({ to, subject, html }): Promise<void>` that **throws** on Resend error. Its ONLY caller is `src/app/register/actions.ts` (`sendVerificationEmail`, lines 67–79), which wraps it in try/catch and `console.error`s. Nothing else in `src/` imports the Resend SDK or this module (verified by grep).
  - [x] 2.2 Define the shared result type in the adapter: `type SendEmailResult = { data: { id: string } } | { error: { code: string } }`. Resend's `resend.emails.send()` already returns `{ data: { id }, error }` — map it directly: success → `{ data: { id: data.id } }`; Resend error → log via `console.error` and return `{ error: { code: 'EMAIL_SEND_FAILED' } }`. Also wrap the whole send in try/catch so a thrown SDK/network error is caught, logged, and returned as the same error shape — the adapter must NEVER throw (AC #4).
  - [x] 2.3 Refactor the existing `sendEmail` to this non-throwing shape (change return type from `Promise<void>` to `Promise<SendEmailResult>`), then update its one caller: in `src/app/register/actions.ts`'s `sendVerificationEmail`, replace the try/catch-around-throw with a plain result check (the existing behavior — log and continue, never block registration — is preserved; only the mechanism changes). Do NOT change any other behavior of `registerParent`/`resendVerificationEmail`.
  - [x] 2.4 Keep the existing `FROM_ADDRESS` constant and its sandbox-sender comment as-is (`onboarding@resend.dev` — delivery restricted to the Resend account owner's address until a domain is verified; this is a known, documented limitation, not this story's problem to fix).
  - [x] 2.5 Extend the send options to accept a React element: `sendEmail({ to, subject, react })` (or add `react` alongside `html` as a union). Recommended: render explicitly in the adapter with `const html = await render(reactElement)` from `@react-email/render`, then pass `html` to `resend.emails.send()` — this keeps the adapter in control of rendering rather than relying on the Resend SDK's internal `react:` handling, and makes the rendered HTML directly assertable in unit tests. (`render()` is async in `@react-email/render` v1+ — `await` it.)

- [x] Task 3: Teacher notification email functions (AC: #2, #3, #4)
  - [x] 3.1 In `src/infrastructure/email/resend.ts`, add and export:
    - `sendTeacherApprovalEmail(to: string, name: string): Promise<SendEmailResult>`
    - `sendTeacherRejectionEmail(to: string, name: string, reason: string): Promise<SendEmailResult>`
    Each builds its React Email template element with the given props and delegates to the non-throwing core send. Subjects come from the locale file (Task 4), not inline strings.
  - [x] 3.2 **`name` parameter caveat (known spec gap from Story 5.1):** the teacher's name is collected on the registration form but NOT persisted — neither `User` nor `TeacherAccount` has a name column (flagged in Story 5.1's Completion Notes). This story still implements the `(to, name)` signature exactly as the AC specifies — the caller (Epic 7 Story 7.2's approval action) will resolve what to pass when the schema gap is closed. Templates must render gracefully if `name` is an empty string (e.g. greeting falls back to "Chào thầy/cô" without a trailing name). Do NOT add a schema migration here.
  - [x] 3.3 **No caller is wired in this story.** There is currently no approval/rejection flow — `src/app/admin/teachers/page.tsx` is a stub; Epic 7 Story 7.2 builds the admin approval queue and is the trigger for these emails (AD-14: "teacher account approved/rejected" triggers). Do not invent a trigger, admin action, or registration-time email. This story delivers the adapter functions, templates, and tests only.

- [x] Task 4: Locale strings for email copy (AC: #5)
  - [x] 4.1 Create `src/locales/vi/emails.ts` (new file — email copy doesn't belong in `auth.ts`, which is `/login`+`/register` page copy; a dedicated file mirrors the per-surface split of `dashboard.ts`/`profiles.ts`/`student.ts`). Export an `emails` object with ALL Vietnamese strings for both templates: subjects, greeting, approval body (account approved, you can log in now, link text to `/login`), rejection body (account rejected), rejection reason label (reuse the phrasing pattern of `auth.teacherRejectedReason` — `Lý do: ...`), and sign-off. Follow the existing flat-constants-plus-function style of `src/locales/vi/auth.ts` (e.g. `teacherRejectedReason: (reason: string) => ...`).
  - [x] 4.2 No Vietnamese text may be inline in the `.tsx` templates — every user-visible string comes from `src/locales/vi/emails.ts` (UX-DR18 / project-context rule). The login URL may be built from `env.NEXTAUTH_URL` + `/login` in the template or passed as a prop from the adapter (prefer passing as a prop so the template stays a pure component and is trivially testable).

- [x] Task 5: React Email templates (AC: #5)
  - [x] 5.1 Create `src/infrastructure/email/templates/teacher-approval-email.tsx` and `src/infrastructure/email/templates/teacher-rejection-email.tsx` (kebab-case files, PascalCase component names: `TeacherApprovalEmail`, `TeacherRejectionEmail`). Props: approval — `{ name: string; loginUrl: string }`; rejection — `{ name: string; reason: string }`.
  - [x] 5.2 Build with `@react-email/components` primitives (`Html`, `Head`, `Preview`, `Body`, `Container`, `Section`, `Text`, `Button`/`Link`) — table-based output is what survives real email clients; do not hand-write raw `<div>` HTML and do not use Tailwind classes (the project's Tailwind v4 setup is for the app, not for email — use React Email's inline `style` objects). Keep styling minimal and brand-aligned: primary `#F97316` for the CTA button, `Be Vietnam Pro`-first font stack with system fallbacks (email clients won't load the webfont — the fallback stack is what matters).
  - [x] 5.3 These are plain server-rendered components — no `'use client'` directive, no hooks, no Next.js imports (they live in the Infrastructure layer; importing `@react-email/components` and the locale constants is fine — the AC itself mandates locale-sourced copy in these templates, so the locale import is the sanctioned exception to "infrastructure imports Domain + SDKs only").

- [x] Task 6: Tests (AC: #1–#5)
  - [x] 6.1 Template tests (`src/infrastructure/email/templates/*.test.tsx` or a single `templates.test.tsx`): use `render()` from `@react-email/render` to render each template to an HTML string and assert (a) the locale strings appear (approval: approved-copy + login link href; rejection: reason text appears verbatim), (b) empty-`name` renders the fallback greeting without a dangling name.
  - [x] 6.2 Adapter tests (`src/infrastructure/email/resend.test.ts`): mock the `resend` package with `vi.mock` (mock `Resend` class → `emails.send` spy). Cover: success returns `{ data: { id } }`; Resend-returned error → `{ error: { code: 'EMAIL_SEND_FAILED' } }` and `console.error` called, nothing thrown; thrown/network error → same non-throwing error shape; `sendTeacherApprovalEmail`/`sendTeacherRejectionEmail` call through with the right `to`/subject and rendered content. Note: `src/lib/env.ts` parses `process.env` at import time — mock `@/lib/env` (`vi.mock('@/lib/env', ...)`) so tests don't need a real `RESEND_API_KEY` (check how existing tests that transitively touch `env` handle this, e.g. `src/app/register/teacher/actions.test.ts`, and copy that pattern).
  - [x] 6.3 Regression: `src/app/register/actions.ts`'s verification-email path still compiles and behaves (send failure logged, registration still returns `{ data: { success: true } }`). If `register/actions.test.ts` doesn't exist, cover this via the adapter tests + code-trace; do not build a new test suite for Story 1.4 code beyond the changed call site.
  - [x] 6.4 Full gate before marking done: `npx vitest run` (all pre-existing 92+ tests must still pass), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build`.
  - [x] 6.5 Manual/live verification: actually sending an email requires a real `RESEND_API_KEY` and (with the sandbox sender) delivers only to the Resend account owner's own address. If live sending isn't possible in this environment, use the established fallback (build + full unit coverage + code-trace) and say so explicitly in Completion Notes, per the standing sprint-status action item.

## Dev Notes

- **The adapter file already exists — this story reshapes it, it does not create it.** `src/infrastructure/email/resend.ts` (Story 1.4) currently throws on failure and only accepts pre-built `html`. The net-new work is: (1) non-throwing `{ data: { id } } | { error: { code } }` result shape, (2) React Email template support, (3) the two teacher notification functions, (4) locale-sourced Vietnamese email copy. Its single existing caller (`src/app/register/actions.ts:71`) must be updated in the same change.
- **AC #1 is already true today** (grep-verified: no `src/app/` or `src/domain/` file imports `resend` directly — only the adapter does). Your job is to keep it true: the new teacher functions and template rendering all live inside `src/infrastructure/email/`.
- **Nothing sends these emails yet, by design.** The triggers are the admin approval/rejection actions in Epic 7 Story 7.2 (AD-14 lists the triggers; the epics explicitly scope 5.2 to adapter + templates). Registration (5.1) deliberately sends no email. Do not wire any caller.
- **Layer rules:** templates and adapter are Infrastructure. They may import `resend`, `@react-email/*`, `@/lib/env`, and `src/locales/vi/emails.ts` (AC-sanctioned). They must NOT import from `src/app/` or Prisma. No server action changes beyond the one call-site update in `register/actions.ts`.
- **Non-throwing is the contract** (AC #4): callers (current and future 7.2 approval action) must be able to treat email delivery as best-effort — an email failure must never roll back or fail an approval DB write. `console.error` the failure inside the adapter; return the error shape.
- **Resend result mapping:** `resend.emails.send()` (v6) resolves to `{ data: { id: string } | null, error: { message, name } | null }` — it does not throw on API-level errors, but network/SDK errors can still throw, hence both the error-field check and the try/catch.
- **React Email rendering:** `@react-email/render` v1+ `render()` is **async** — `await` it. Rendering happens server-side in the adapter (recommended, Task 2.5) so tests can assert the produced HTML without touching the Resend SDK's internal react handling.
- **Known spec gap carried forward (do not fix here):** teacher `name` is validated at registration but not persisted (no name column; flagged in Story 5.1 Completion Notes with a recommendation to migrate before Story 7.2). Implement the `(to, name)` signatures as specified and make templates tolerate empty `name`.
- **Sandbox sender limitation stands:** `onboarding@resend.dev` can only deliver to the Resend account owner's address. Keep the existing comment; switching to a verified `toantuduy.vn` sender is an ops task outside this story.
- **Testing standards:** vitest (`npx vitest run`), tests colocated next to source (`*.test.ts`/`*.test.tsx`), `vi.mock` for the SDK and `@/lib/env`. 92 tests passing at baseline (Story 5.1). The four-command gate (vitest / tsc / eslint / next build) is the project's established done-bar.

### Project Structure Notes

- Files to **create**:
  - `src/infrastructure/email/templates/teacher-approval-email.tsx`
  - `src/infrastructure/email/templates/teacher-rejection-email.tsx`
  - `src/locales/vi/emails.ts`
  - `src/infrastructure/email/resend.test.ts`
  - Template test file(s) alongside the templates
- Files to **modify**:
  - `src/infrastructure/email/resend.ts` — non-throwing result shape, react-element support, two teacher functions
  - `src/app/register/actions.ts` — adapt `sendVerificationEmail` to the new non-throwing return (behavior unchanged: log failure, don't block registration)
  - `package.json` — add `@react-email/components`, `@react-email/render`
- **No Prisma schema changes. No env var changes** (`RESEND_API_KEY` already validated in `src/lib/env.ts`).
- Naming: kebab-case files, PascalCase components — no deviation.

## Previous Story Intelligence

- **Story 5.1 (done, same epic):** established that teacher registration sends NO email and that 5.2 owns approval/rejection notifications only. Its Completion Notes flag the unpersisted-`name` gap (see Task 3.2) — carry it forward, don't fix it. It also extracted `authorizeCredentials` into `src/lib/credentials-authorize.ts` specifically because `src/lib/auth.ts` is untestable under vitest (calls `NextAuth()` at module load) — the same "keep testable logic out of framework-loading modules" instinct applies here: the adapter is already framework-free, keep it that way.
- **Env-at-import-time trap:** `src/lib/env.ts` runs `envSchema.parse(process.env)` on import, and `resend.ts` imports it at module top-level. Unit tests must `vi.mock('@/lib/env')` (or the test setup must provide the vars) — check how `src/app/register/teacher/actions.test.ts` and `src/lib/credentials-authorize.test.ts` already handle transitive env/db imports and copy the established mocking pattern rather than inventing a new one.
- **Verification convention (recurring since Epic 2):** live browser/email verification has not been possible in this sandbox; the accepted fallback is full `next build` success + complete unit coverage + explicit code-trace, stated plainly in Completion Notes. Story 6.5 encodes this.
- **Tooling baseline as of 5.1:** vitest 92/92, tsc clean, eslint clean, next build green — regressions against any of these block done.

## Latest Tech Notes (researched 2026-07-23)

- **React Email 5.x** is current and supports React 19 / Next.js 15+ (this project: `react@^19`, `next@15.3.9`, Tailwind 4 — all compatible). Keep `@react-email/components` and `@react-email/render` on latest and in sync; mismatched versions are the historical source of "cannot be used as a JSX component" type errors with React 19.
- **`render()` is async** in `@react-email/render` v1+ — `await render(<Template {...props} />)`.
- **Resend Node SDK v6** (installed: `^6.17.2`): `emails.send()` returns `{ data, error }` without throwing on API errors; supports a `react:` payload field, but this story renders explicitly via `@react-email/render` for testability (Task 2.5).

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2] (lines 891–909) — the five ACs verbatim
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-14] — single Resend adapter rule; v1 triggers: subscription activated, teacher approved, teacher rejected
- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1, Story 7.2] — 5.1 sends no email; 7.2 is the approval/rejection trigger that will call these functions
- [Source: _bmad-output/project-context.md] — layer rules, email-through-adapter-only rule, Vietnamese-strings-in-locales rule, brand token `#F97316`, Be Vietnam Pro
- [Source: src/infrastructure/email/resend.ts] — existing adapter this story reworks (throwing `sendEmail`, sandbox `FROM_ADDRESS`)
- [Source: src/app/register/actions.ts#sendVerificationEmail] (lines 67–79) — the adapter's only current caller; must be adapted to the new return shape
- [Source: src/lib/env.ts] — `RESEND_API_KEY` already validated; parses env at import time (test-mocking implication)
- [Source: src/locales/vi/auth.ts] — locale file style to mirror in new `emails.ts` (flat constants + `(reason) =>` function pattern, e.g. `teacherRejectedReason`)
- [Source: _bmad-output/implementation-artifacts/5-1-teacher-registration-pending-state.md] — previous story: name-not-persisted gap, env/test-mocking patterns, verification-fallback convention, 92-test baseline
- [Source: package.json] — `resend@^6.17.2` present; `@react-email/*` NOT yet installed
- React Email 5 / React 19 compatibility: [React Email 5.0 announcement](https://resend.com/blog/react-email-5), [React 19 JSX-component issue](https://github.com/resend/react-email/issues/1743), [Resend Next.js guide](https://resend.com/nextjs)

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5) via Claude Code

### Debug Log References

- Initial `npm install` failed with an npm arborist error (`Cannot read properties of null (reading 'edgesOut')`) — the project uses **pnpm** (`pnpm-lock.yaml` present); reinstalled with `pnpm add`, no package.json corruption.
- `@react-email/components@1.0.12` (registry `latest`) carries a generic npm deprecation flag, but it is the newest published version and pairs with `@react-email/render@2.1.0` (also `latest`); both installed in sync per Task 1.1. Post-install baseline verified: 92/92 tests, `next build` green.
- Vitest 4 (rolldown-vite/oxc) inherited tsconfig `jsx: preserve` and refused to compile `.tsx` tests — fixed by adding `oxc: { jsx: { runtime: 'automatic' } }` to `vitest.config.ts` (the `esbuild` override is ignored under rolldown-vite).
- `vi.mock('resend')` needed a constructible class (arrow-fn `vi.fn` can't be `new`ed) and `vi.hoisted` for the send spy.

### Completion Notes List

- Reworked `src/infrastructure/email/resend.ts` to the non-throwing `SendEmailResult` shape (`{ data: { id } } | { error: { code: 'EMAIL_SEND_FAILED' } }`); both Resend-returned errors and thrown SDK/network errors are caught, `console.error`ed, and returned as the error shape — the adapter never throws (AC #4).
- `sendEmail` now accepts `{ html }` or `{ react }` (exclusive union); react elements are rendered in the adapter via `await render()` from `@react-email/render`, keeping rendered HTML directly assertable in tests (Task 2.5).
- Added `sendTeacherApprovalEmail(to, name)` and `sendTeacherRejectionEmail(to, name, reason)` (AC #2, #3); subjects come from `src/locales/vi/emails.ts`; login URL built from `env.NEXTAUTH_URL + '/login'` and passed to the template as a prop. No caller wired, by design (trigger is Epic 7 Story 7.2).
- Templates `TeacherApprovalEmail` / `TeacherRejectionEmail` built with `@react-email/components` primitives, inline styles only, brand `#F97316` CTA, Be Vietnam Pro-first font stack; all Vietnamese copy sourced from the new `src/locales/vi/emails.ts` (AC #5). Empty/whitespace `name` falls back to "Chào thầy/cô," with no dangling name (known Story 5.1 name-persistence gap carried forward — no schema change made).
- Updated the adapter's single caller `src/app/register/actions.ts#sendVerificationEmail` from try/catch-around-throw to a plain result check; behavior unchanged (failure logged, registration never blocked) — verified by code-trace since no register/actions.test.ts exists (Task 6.3).
- AC #1 holds: grep confirms no `src/app/` or `src/domain/` file imports the Resend SDK; all new email code lives in `src/infrastructure/email/`.
- Tests: 12 new (5 template rendering incl. empty-name fallback; 7 adapter incl. success, Resend-error, thrown-error, and both teacher functions' payload/subject/content assertions). Full gate green: `npx vitest run` 104/104 (92 baseline + 12 new), `npx tsc --noEmit` clean, `npx eslint` on all changed files clean, `npx next build` succeeds.
- **Live-send verification not possible in this environment** (requires real `RESEND_API_KEY`; sandbox sender only delivers to the Resend account owner). Per the standing convention (Task 6.5), verification is via full build success + complete unit coverage + code-trace.

### File List

- `src/infrastructure/email/resend.ts` (modified — non-throwing result shape, react support, teacher functions)
- `src/infrastructure/email/resend.test.ts` (new)
- `src/infrastructure/email/templates/teacher-approval-email.tsx` (new)
- `src/infrastructure/email/templates/teacher-rejection-email.tsx` (new)
- `src/infrastructure/email/templates/templates.test.tsx` (new)
- `src/locales/vi/emails.ts` (new)
- `src/app/register/actions.ts` (modified — adapt sendVerificationEmail to non-throwing result)
- `vitest.config.ts` (modified — oxc JSX transform for .tsx tests)
- `package.json` (modified — add @react-email/components, @react-email/render)
- `pnpm-lock.yaml` (modified — lockfile for new packages)

## Change Log

- 2026-07-23: Implemented Story 5.2 — non-throwing Resend adapter, teacher approval/rejection React Email templates with locale-sourced Vietnamese copy, adapter/template unit tests (12), single-caller update in register actions. Full gate green (vitest 104/104, tsc, eslint, next build). Status → review.
