---
baseline_commit: 8f413793883da75e17df4b85140e4f426c5fbd66
---

# Story 5.1: Teacher Registration & Pending State

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a teacher,
I want to register an account and see a clear pending-approval screen while I wait,
so that I know my application was received and what to expect next.

## Acceptance Criteria

1. **Given** I am on `/register/teacher`, **when** I submit name, school name, grade taught, and email, **then** a `User` (role: `TEACHER`) and `TeacherAccount` (status: `PENDING`) are created; I am redirected to a pending-state screen (FR-18).
2. **Given** I submit registration with an email address already in use, **when** I submit the form, **then** I see the error "Email đã được đăng ký." (no leakage of whether the existing account is Parent or Teacher).
3. **Given** I attempt to sign in (via `/login`, Credentials provider) with an account whose `TeacherAccount.status === 'PENDING'`, **when** the sign-in is processed, **then** sign-in is rejected and I am shown the full-screen message "Tài khoản đang chờ xét duyệt. Chúng tôi sẽ thông báo qua email." — not a generic inline login error (UX-DR15).
4. **Given** I attempt to sign in with an account whose `TeacherAccount.status === 'REJECTED'`, **when** the sign-in is processed, **then** sign-in is rejected and I am shown a full-screen message indicating rejection, including the admin-provided `rejectedReason` if one is set.
5. **And** all form inputs on `/register/teacher` have associated `<label>` elements; validation errors are linked via `aria-describedby`.
6. **And** the registration server action returns `{ data: { success: true } } | { error: { code: string; message: string } }` — it never throws.
7. **And** the `/register/teacher` page is reachable from a link on `/login` (mirroring the existing parent-registration link), and does not remove or alter the existing parent registration flow at `/register`.

## Tasks / Subtasks

- [x] Task 1: Teacher registration server action (AC: #1, #2, #6)
  - [x] 1.1 Create `src/app/register/teacher/actions.ts` with a `'use server'` `registerTeacher(input)` function, modeled directly on `src/app/register/actions.ts`'s `registerParent` (same "no session check — account doesn't exist yet" comment convention, same `db.$transaction` pattern).
  - [x] 1.2 Zod schema: `name: z.string().trim().min(1).max(100)`, `schoolName: z.string().trim().min(1).max(150)`, `gradeTaught: z.enum(['GRADE_1', 'GRADE_2', 'GRADE_3'])` (reuse the exact enum values already used by `gradeBandSchema` in `src/app/(parent)/profiles/actions.ts` — `TeacherAccount.gradeTaught` is the same `GradeBand` Prisma enum, not a new type), `email: z.string().email()`.
  - [x] 1.3 Inside a `db.$transaction`: create `User` with `role: 'TEACHER'`, `passwordHash: null`, `emailVerified: null` (teachers have no password/credentials flow yet — sign-in for v1 is gated entirely by the approval status; do not invent a password field, none exists in the AC or PRD for teacher registration), then create `TeacherAccount` with `userId`, `schoolName`, `gradeTaught`, `status: 'PENDING'` (the schema default — set it explicitly anyway for clarity, matching how `registerParent` explicitly sets `emailVerified: null`).
  - [x] 1.4 Duplicate-email check: `db.user.findUnique({ where: { email } })` before the transaction, plus a catch-block fallback on the transaction (race-condition case) — copy the exact two-layer pattern from `registerParent` (lines 37–57 of `src/app/register/actions.ts`). Return `{ error: { code: 'EMAIL_IN_USE', message: 'Email address already registered' } }` in both cases — do not reveal whether the existing account is a parent or teacher.
  - [x] 1.5 Return type: `type RegisterTeacherResult = { data: { success: true } } | { error: { code: string; message: string } }`.
  - [x] 1.6 **No verification email is sent for teacher registration** — unlike parent registration, there's no `emailVerified` gate for teachers in this story (approval, not email verification, is the gate — see AC #1 and Story 5.2 which owns the *approval/rejection* notification emails, not a registration confirmation). Do not wire up `sendEmail`/Resend here.

- [x] Task 2: Pending-state screen after registration (AC: #1)
  - [x] 2.1 Create `src/app/register/teacher/pending/page.tsx` — a simple, unauthenticated Server Component (no session exists yet post-registration) rendering the same message used by the existing `(teacher)/layout.tsx` pending branch: reuse `common.teacherPendingApproval` from `src/locales/vi/common.ts` — do not duplicate the string in a new locale file.
  - [x] 2.2 On successful `registerTeacher()` call, the `/register/teacher` client form redirects (`window.location.href` or `router.push`, matching the existing `isSuccess` inline-render pattern in `register/page.tsx` — either approach is acceptable, but prefer a route redirect to `/register/teacher/pending` since this page has no further action available, unlike the parent flow's resend-verification-email affordance).

- [x] Task 3: Teacher registration page & form (AC: #1, #2, #5, #7)
  - [x] 3.1 Create `src/app/register/teacher/page.tsx` + a client form component (e.g. `src/app/register/teacher/teacher-register-form.tsx`), structurally modeled on `src/app/register/page.tsx`: controlled inputs, per-field error state, `aria-describedby` wiring identical to the parent register form's pattern (see lines 106–170 of `src/app/register/page.tsx`).
  - [x] 3.2 Fields: `name` (text input), `schoolName` (text input), `gradeTaught` (use the existing shadcn `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` components from `src/components/ui/select.tsx`, exactly as `child-profile-form.tsx` does for `gradeBand` — do not build a native `<select>`), `email` (email input). No password field.
  - [x] 3.3 On submit, call `registerTeacher()`; map `{ error }` codes to inline field errors (`VALIDATION_ERROR`/`EMAIL_IN_USE`) the same way `register/page.tsx` maps `PASSWORD_MISMATCH`/`EMAIL_IN_USE` today; on success, navigate to `/register/teacher/pending`.
  - [x] 3.4 Add a "Đăng ký là giáo viên" (or similar) link from `/login` to `/register/teacher`, next to (not replacing) the existing parent-registration link/flow. Check `src/app/login/login-form.tsx` — if there is currently no visible parent-register link there, add both links consistently rather than only the teacher one (confirm actual current state before assuming; do not remove any existing link).

- [x] Task 4: Distinguishable sign-in rejection for PENDING/REJECTED teachers (AC: #3, #4)
  - [x] 4.1 **Critical existing-code finding — read before touching `src/lib/auth.ts`:** the current `signIn` callback (line 53) does `if (dbUser.role === 'TEACHER' && dbUser.teacherAccount?.status !== 'APPROVED') return false`. Because this runs inside the shared `signIn` callback (used by both Credentials and Google providers), a non-approved teacher's credentials sign-in is rejected with a **bare `false`** — NextAuth surfaces this to the client as `result.error === 'AccessDenied'` (or similar generic string), which `login-form.tsx` currently falls through to `auth.signInFailed` ("Đăng nhập không thành công."), a generic message — **not** the full-screen pending/rejected message ACs #3/#4 require. The `(teacher)/layout.tsx` pending-screen branch (reading `getTeacherAccountStatus`) is unreachable for this case today because no session is ever established for a non-approved teacher — that layout branch exists for a *different* scenario: an already-approved teacher whose status is revoked *after* their JWT was issued (see Story 5.7's AC, which is the intended purpose of that check — defense-in-depth against a live session outliving an approval change, not the initial-login case this story covers). Do not remove or "fix" that layout check; it is correct for its own scenario.
  - [x] 4.2 Move the PENDING/REJECTED teacher check out of the shared `signIn` callback and into the Credentials provider's `authorize()` function instead, following the exact pattern already established by `EmailNotVerifiedError` (a `CredentialsSignin` subclass with a distinguishable `code`) in `src/lib/auth.ts` lines 14–16. Add two new subclasses, e.g. `TeacherPendingError` (`code = 'teacher_pending'`) and `TeacherRejectedError` (`code = 'teacher_rejected'`). In `authorize()`, after the existing password/email-verified checks succeed and the user is resolved, if `user.role === 'TEACHER'`, look up `TeacherAccount` (join or a follow-up query) and throw the matching error when `status === 'PENDING'` or `status === 'REJECTED'` — before returning the session user object.
  - [x] 4.3 For `REJECTED`, the rejection reason must reach the client (AC #4). `CredentialsSignin` subclasses only carry a `code`, not arbitrary payload, and the reason is per-account (dynamic), so it cannot be embedded in a fixed locale string alone. Recommended approach: have `login-form.tsx`, on receiving `code === 'teacher_rejected'`, make a small follow-up **unauthenticated** lookup — but there is no existing public endpoint for this. Simpler and safer: keep the `signIn` callback's existing shared checks for Google (Parent-only) untouched, and for the Credentials-specific teacher-status case, have the client redirect to a dedicated route (e.g. `/teacher-status?email=...`) that server-side re-reads `TeacherAccount` by email (a Server Component, not exposing anything not already implied by "this email tried to log in") and renders the full pending/rejected message including `rejectedReason`. This avoids inventing a new client-exposed data-fetching server action just to surface one string. Pick one clean approach and document the choice in Completion Notes — the binding requirement is only the AC's user-visible outcome (full-screen message, reason shown for rejected), not a specific implementation shape.
  - [x] 4.4 Update `src/locales/vi/common.ts` (or `auth.ts`) with a `teacherRejected: (reason?: string) => string`-style helper or two flat strings — follow whichever pattern reads more naturally against the existing `teacherPendingApproval` constant string; do not scatter Vietnamese copy inline in components (UX-DR18).
  - [x] 4.5 Confirm the Google OAuth path is unaffected: Google sign-in is already restricted to `role === 'PARENT'` by a separate, earlier check in the same `signIn` callback (line 52) — teachers never reach Google sign-in, so removing the teacher-status check from `signIn` and relocating it into Credentials-only `authorize()` does not weaken any Google-path protection.

- [x] Task 5: Tests
  - [x] 5.1 Unit tests for `registerTeacher()`: valid input creates `User` + `TeacherAccount` (status `PENDING`); duplicate email returns `EMAIL_IN_USE`; invalid `gradeTaught`/missing `name`/`schoolName`/malformed `email` return validation errors; return shape never throws (mirror `register/actions.ts`'s existing test style if one exists — check for `src/app/register/actions.test.ts` first).
  - [x] 5.2 Unit tests for the new `authorize()` branch: PENDING teacher throws `TeacherPendingError` with `code === 'teacher_pending'`; REJECTED teacher throws `TeacherRejectedError` with `code === 'teacher_rejected'`; APPROVED teacher passes through unaffected; PARENT accounts are unaffected by the new branch entirely.
  - [x] 5.3 Manual/browser verification (per project convention — see Previous Story Intelligence below): full registration → pending screen → attempted login → full-screen pending message flow, end to end. Record in Completion Notes whether this was performed live or only via code-trace/build, per the standing sprint-status.yaml action item on this gap.

## Dev Notes

- **This is the first story of Epic 5** — there is no Epic-5 predecessor to build on; the closest precedent is Epic 1's parent registration (Story 1.4) and auth infrastructure (Story 1.3), which this story deliberately mirrors for consistency (same server action shape, same form/locale conventions).
- **Reuse, don't reinvent:** `TeacherAccount` (with `status: TeacherStatus @default(PENDING)` and `rejectedReason String?`) already exists in `prisma/schema.prisma` (Story 1.2) — no migration needed. `getTeacherAccountStatus()` (`src/lib/teacher-status.ts`) and the `(teacher)/layout.tsx` pending-check already exist (Story 1.5) — do not duplicate this logic; only the *initial sign-in* rejection path (Task 4) is new work.
- **Critical architectural finding (see Task 4.1 for full detail):** the current `signIn` callback in `src/lib/auth.ts` blocks non-approved-teacher sign-in with a bare `return false`, which today surfaces only a generic "Đăng nhập không thành công." to the user — not the AC-required full-screen pending/rejected message. This is the central piece of net-new work in this story: relocate the teacher-status check into the Credentials `authorize()` function using the exact `CredentialsSignin`-subclass pattern already proven by `EmailNotVerifiedError`, so the client can distinguish `email_not_verified` / `teacher_pending` / `teacher_rejected` / generic-invalid-credentials and route to the correct full-screen UI.
- **Registration itself never requires a session check** — `registerParent`'s file-level comment ("Registration is the one server action WITHOUT a session check — there is no session before an account exists") applies identically to `registerTeacher`.
- **No password field for teacher registration.** Re-read the AC carefully: it lists name, school name, grade taught, email — no password. `TeacherAccount`/`User.passwordHash` should be left `null` at registration time. (How a teacher eventually authenticates with a password is out of this story's scope per the epics — do not invent a password-setup step; if this seems like a gap, flag it in Completion Notes rather than silently adding a password field not in the AC.)
- **No email is sent in this story.** Story 5.2 ("Resend Email Adapter & Teacher Notification Emails") is explicitly the story that builds `sendTeacherApprovalEmail`/`sendTeacherRejectionEmail` — do not build any Resend integration here; the "notified by email" part of FR-18 is delivered later, by Story 5.2 (triggered from the *admin approval/rejection* action in Epic 7, not from registration).
- **Approval itself is out of scope.** There is currently no working approval UI — `src/app/admin/teachers/page.tsx` is a stub ("Admin — teacher management — coming soon"), built in full by Epic 7 Story 7.2. This story only creates the `PENDING` record and the pending/rejected sign-in experience; there is no way to move a `TeacherAccount` to `APPROVED`/`REJECTED` except direct DB manipulation until Epic 7 ships. Don't build an approval flow here.
- **Server action / locale conventions to follow exactly** (established across the whole codebase, verified in `src/app/register/actions.ts`, `src/app/(parent)/profiles/actions.ts`): `{ data: T } | { error: { code: string; message: string } }` return shape, never throw; kebab-case files; Vietnamese strings only in `src/locales/vi/*.ts`, never inline in components; shadcn `Select` (not a native `<select>`) for the `GradeBand` picker, matching `child-profile-form.tsx`.
- **Layer rules apply as usual:** the registration form (Presentation) must only call the new server action (Application); the server action is the only thing touching `db` directly for this story — no new repository file is needed for a single insert-only flow this small (existing precedent: `register/actions.ts` calls `db` directly rather than going through a repository file, since it's a simple auth-adjacent write, not a domain aggregate). Follow that precedent; do not create `src/infrastructure/repositories/teacher-repository.ts` in this story unless a later Epic 5 story needs it (Story 5.3 introduces `Class`/teacher CRUD, which is closer to needing one).

### Project Structure Notes

- Files to **create**:
  - `src/app/register/teacher/page.tsx`
  - `src/app/register/teacher/teacher-register-form.tsx` (or inline in `page.tsx` as a client component, following whichever split `src/app/register/page.tsx` uses — that file is a single client component with no separate form file, so a single-file approach is equally acceptable and arguably more consistent)
  - `src/app/register/teacher/actions.ts`
  - `src/app/register/teacher/pending/page.tsx`
  - Test files alongside each (`.test.ts`), per `vitest` convention already in use (e.g. `src/domain/use-cases/adaptive-difficulty.test.ts`, `src/app/(parent)/dashboard/actions.test.ts`).
- Files to **modify**:
  - `src/lib/auth.ts` — relocate the teacher-status check per Task 4.
  - `src/app/login/login-form.tsx` — handle new `teacher_pending`/`teacher_rejected` codes from `signIn()`'s result and route to the full-screen experience (Task 4.3).
  - `src/locales/vi/common.ts` and/or `src/locales/vi/auth.ts` — new copy for teacher registration form + rejected message (do not create a parallel `teachers.ts` locale file unless the volume of new strings genuinely warrants it — check size against `profiles.ts`/`auth.ts` as a judgment reference).
- **No Prisma schema changes** — `TeacherAccount` already has every field this story needs.
- Naming: kebab-case files, PascalCase components — no deviation from established convention.

## Previous Story Intelligence

- **No same-epic predecessor** (this is Story 5.1). The most relevant "previous story" context comes from Epic 1 (auth infrastructure) and Epic 4's most recent story (4.5), whose closing notes are still directly relevant:
- **Standing manual/live-verification gap (recurring across every recent story):** Story 4.4 and 4.5 both explicitly could not perform live browser verification in this sandbox and flagged it in `sprint-status.yaml`'s Epic 2 action items ("Establish a live/manual browser verification pass before marking any story done"). This story's core new behavior — the sign-in rejection UX for pending/rejected teachers — is exactly the kind of cross-cutting auth-flow change that most benefits from a real browser check (NextAuth error surfaces can behave subtly differently between `redirect: false` client calls and actual navigation). If live verification remains unavailable, use the Story 4.5 fallback: full `npx next build` success + complete unit-test coverage of the new `authorize()` branches + explicit code-trace, and say so plainly in Completion Notes rather than asserting it was verified live.
- **Test tooling, confirmed current:** `npx vitest run` (74+ passing tests as of Story 4.5), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build` — run all four before marking this story done, per established project convention.
- **The `CredentialsSignin`-subclass pattern (`EmailNotVerifiedError`) is the load-bearing precedent for Task 4** — it already proves the "throw a distinguishable, coded error from `authorize()`, catch the code client-side in `login-form.tsx`'s `signIn()` result" mechanism works in this codebase. Extend it; do not invent a different mechanism (e.g. do not try to pass extra data through NextAuth's session/JWT for an unauthenticated rejected user — there is no session to attach it to).
- **Two known open action items from earlier retros remain relevant context** (not blocking this story, but worth being aware of if touched incidentally): rate limiting is not yet added to any registration/login path (open action item from Epic 1 retro) — do not add it speculatively here, it's out of scope; and the PRD's stale "SSO out of scope for v1" note (Google OAuth for Parents is already shipped) is unrelated to teacher registration and should not be touched.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1: Teacher Registration & Pending State] (lines 867–889)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5, Story 5.7] — pending-teacher full-screen message precedent (Story 1.5) and the status-revocation-after-session-issued scenario that `(teacher)/layout.tsx`'s check actually protects (Story 5.7)
- [Source: _bmad-output/planning-artifacts/epics.md#FR-18, NFR-2, NFR-3] — teacher registration/approval requirement; accessibility floor for form labels
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-6] — teacher approval gate enforced at sign-in AND route level; JWT role alone is insufficient
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md] — "Teacher register" entry point from Login page; "Pending teacher" full-screen state: "Tài khoản đang chờ xét duyệt. Chúng tôi sẽ thông báo qua email." (no portal access)
- [Source: _bmad-output/project-context.md] — server action return shape, layer rules, Vietnamese-locale-only-strings convention, Teacher approval dual-check rule
- [Source: prisma/schema.prisma] — `TeacherAccount` model (status, rejectedReason, gradeTaught), `TeacherStatus` enum, `User.role` enum — no schema changes needed
- [Source: src/lib/auth.ts] — current `signIn` callback (the file this story's Task 4 modifies) and the existing `EmailNotVerifiedError` `CredentialsSignin`-subclass pattern to extend
- [Source: src/lib/teacher-status.ts, src/app/(teacher)/layout.tsx] — existing post-session pending-check (Story 1.5) — reused, not rebuilt
- [Source: src/app/register/actions.ts, src/app/register/page.tsx] — direct structural template for the new teacher registration action + form
- [Source: src/app/login/login-form.tsx, src/lib/role-redirect.ts] — existing sign-in error-handling pattern and role-based redirect map to extend
- [Source: src/components/parent/child-profile-form.tsx, src/app/(parent)/profiles/actions.ts] — existing shadcn `Select` + `GradeBand` enum usage pattern to reuse verbatim for `gradeTaught`
- [Source: src/locales/vi/auth.ts, src/locales/vi/common.ts, src/locales/vi/profiles.ts] — locale-file conventions to extend
- [Source: _bmad-output/implementation-artifacts/4-5-parent-dashboard-performance-all-state-patterns.md] — most recent prior story; confirms current test tooling and the standing live-verification gap

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5)

### Debug Log References

- `npx vitest run` — 92/92 passing (74 pre-existing + 18 new)
- `npx tsc --noEmit` — clean
- `npx eslint <changed files>` — clean
- `npx next build` — success; new routes `/register/teacher` (static), `/register/teacher/pending` (static), `/teacher-status` (dynamic) all present in the route manifest

### Completion Notes List

- **Task 1:** `registerTeacher()` server action mirrors `registerParent` exactly: no session check (pre-account), two-layer duplicate-email guard (findUnique + transaction catch), `db.$transaction` creating `User` (role `TEACHER`, `passwordHash: null`, `emailVerified: null`) then `TeacherAccount` (`status: 'PENDING'` explicit). No email sent (Story 5.2 owns notification emails). Went one step further than the parent precedent on AC #6 ("never throws"): the pre-transaction `findUnique` is also wrapped, resolving to `{ error: { code: 'REGISTRATION_FAILED' } }` on infrastructure failure.
- **Task 4 implementation choice (per 4.3's "pick one clean approach"):** the entire Credentials `authorize()` was extracted to a new module `src/lib/credentials-authorize.ts` (exporting `authorizeCredentials`, `EmailNotVerifiedError`, `TeacherPendingError`, `TeacherRejectedError`). Reason: `src/lib/auth.ts` calls `NextAuth()` at module load (pulls in `next/server`), making the authorize branches untestable under vitest; the extracted module is pure and fully unit-tested, and `auth.ts` passes it as `authorize: authorizeCredentials`. The teacher-status check was removed from the shared `signIn` callback (its `include: { teacherAccount: true }` lookup slimmed accordingly); Google path unaffected — still Parent-only (that check remains in place).
- **Rejected-reason surfacing (4.3):** chose the dedicated-route approach. `login-form.tsx` on `code === 'teacher_pending' | 'teacher_rejected'` redirects to `/teacher-status?email=...`, a Server Component that re-reads `TeacherAccount` by email via new `getTeacherStatusByEmail()` in `src/lib/teacher-status.ts` and renders the full-screen pending message (reusing `common.teacherPendingApproval`) or rejected message + `rejectedReason`. Unknown/approved/missing email redirects to `/login`. No new client-exposed server action was created.
- **Deliberate ordering deviation from Task 4.2's letter, to satisfy AC #3's spirit:** the teacher-status check runs INSTEAD OF the `emailVerified` check for `role === 'TEACHER'` (not after it). Teachers register with `emailVerified: null` and have no verification flow — checking `emailVerified` first would make the pending message unreachable (every pending teacher would see "verify your email" instead). Approval, not email verification, is the teacher gate (consistent with Task 1.6's own note). A `TEACHER` user with no `TeacherAccount` row is defensively treated as pending.
- **Login page links (3.4):** confirmed `/login` previously had NO registration link at all — added both parent (`/register`) and teacher (`/register/teacher`) links per the task's instruction to add both consistently.
- **⚠️ Spec gap flagged (not silently fixed):** AC #1 collects `name` on the form and it is validated by the action's zod schema, but NEITHER `User` NOR `TeacherAccount` has a name column in `prisma/schema.prisma`, and the story mandates "No Prisma schema changes." The name is therefore validated but NOT persisted. Epic 7's approval queue (Story 7.2) will likely want the applicant's name — recommend adding a `name` field (schema migration) in a follow-up story before 7.2.
- **Task 5.3 verification mode:** live browser verification was NOT performed (sandbox limitation, per the standing sprint-status action item). Fallback per Story 4.5 precedent: full `npx next build` success + 18 new unit tests covering every `registerTeacher` and `authorizeCredentials` branch + explicit code-trace of login-form → teacher-status redirect flow. The NextAuth `redirect: false` + `result.code` mechanism is the same proven path `email_not_verified` already uses in production code.
- Grade labels reuse `profiles.gradeBandLabels` (identical "Lớp 1/2/3" strings) rather than duplicating them in `auth.ts`; all new Vietnamese copy lives in `src/locales/vi/auth.ts`.

### File List

- `src/app/register/teacher/actions.ts` (new)
- `src/app/register/teacher/actions.test.ts` (new)
- `src/app/register/teacher/page.tsx` (new)
- `src/app/register/teacher/pending/page.tsx` (new)
- `src/app/teacher-status/page.tsx` (new)
- `src/lib/credentials-authorize.ts` (new)
- `src/lib/credentials-authorize.test.ts` (new)
- `src/lib/auth.ts` (modified — authorize delegated to credentials-authorize; teacher check removed from shared signIn callback)
- `src/lib/teacher-status.ts` (modified — added `getTeacherStatusByEmail`)
- `src/app/login/login-form.tsx` (modified — teacher_pending/teacher_rejected redirect + register links)
- `src/locales/vi/auth.ts` (modified — teacher registration/rejection strings)

## Change Log

- 2026-07-23: Story 5.1 implemented — teacher registration (`/register/teacher`) with pending screen, distinguishable PENDING/REJECTED credentials sign-in rejection via `CredentialsSignin` subclasses relocated from the `signIn` callback into an extracted, unit-tested `authorizeCredentials()`, full-screen `/teacher-status` route surfacing `rejectedReason`, and login-page registration links. 18 new unit tests; vitest 92/92, tsc/eslint clean, next build green. Status → review.
