---
baseline_commit: 0ddb533
---

# Story 1.4: Parent Account Registration & Email Verification

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to register with my email and password and verify my email,
So that I have a secure, verified account before accessing the application.

## Acceptance Criteria

1. **Given** I am on `/register`, **When** I submit a valid email, password (≥8 characters), and matching confirm-password, **Then** a `User` (role: `PARENT`) and `ParentAccount` record are created with `emailVerified: null`; a verification email is sent via `src/infrastructure/email/resend.ts` containing a signed one-time link valid for 24 hours.
2. **Given** I click the valid, non-expired verification link, **When** the link is processed, **Then** `User.emailVerified` is set to the current timestamp and I am redirected to `/login` with a "Email verified — please log in" success message.
3. **Given** I try to register with an email address already in use, **When** I submit the form, **Then** I see the error "Email address already registered" (no leakage of verification status).
4. **Given** I submit with mismatched password and confirm-password, **When** the form validates, **Then** an inline validation error appears before submission; the form is not submitted to the server.
5. **Given** an unverified Parent Account tries to log in, **When** they submit valid credentials, **Then** sign-in is rejected with "Please verify your email before logging in."
6. **And** the registration server action returns `{ data: { success: true } } | { error: { code: string; message: string } }` — it never throws.
7. **And** all form inputs have associated `<label>` elements; error messages are linked via `aria-describedby`.

## Tasks / Subtasks

- [x] **Task 1: Build the stateless email-verification token utility** (AC: #1, #2)
  - [x] 1.1 — Create `src/lib/email-verification-token.ts`. **The Prisma schema has no `VerificationToken` table** (Story 1.2 deliberately created no NextAuth-adapter tables — see [1-2-complete-prisma-schema-database-infrastructure.md](./1-2-complete-prisma-schema-database-infrastructure.md)). Do NOT add a migration for this. Instead follow the exact stateless HMAC pattern already established in `src/lib/child-profile-cookie.ts`: sign `${userId}.${expiresAtEpochMs}` with `crypto.createHmac('sha256', env.NEXTAUTH_SECRET)`, producing a token string `${userId}.${expiresAtEpochMs}.${signature}`.
  - [x] 1.2 — Export `generateVerificationToken(userId: string): string` — sets `expiresAtEpochMs = Date.now() + 24 * 60 * 60 * 1000` (24h per AC #1).
  - [x] 1.3 — Export `verifyVerificationToken(token: string): { userId: string } | null` — split on `.`, recompute the HMAC over `userId.expiresAtEpochMs`, compare with `crypto.timingSafeEqual` (never plain `===` on a signature — same requirement as the cookie utility), and return `null` if the signature is invalid, malformed, OR `Date.now() > expiresAtEpochMs`. Never throw.
  - [x] 1.4 — cuid2 IDs (`userId`) contain no `.` character, so splitting the token on `.` is unambiguous — same assumption `child-profile-cookie.ts` already relies on.

- [x] **Task 2: Implement the real Resend integration** (AC: #1)
  - [x] 2.1 — `src/infrastructure/email/resend.ts` currently throws `Not yet implemented — Story 5.2`. **This story is the first real consumer** — the "deferred to Story 5.2" note in `deferred-work.md` predates this story's AC requiring an actual verification email; implement it for real now (Story 5.2 will reuse the same module for its own trigger events, not re-implement it).
  - [x] 2.2 — Add the `resend` npm package (`pnpm add resend`) — not yet in `package.json`.
  - [x] 2.3 — Implement `sendEmail({ to, subject, html })` using `new Resend(env.RESEND_API_KEY)` (already Zod-validated in `src/lib/env.ts`, format `re_*`) and `resend.emails.send({...})`. Never throw for control flow — if the Resend SDK response has an `error` field, throw a plain `Error` (the caller — the registration action — is responsible for catching it and mapping to the server-action error contract; do not let it propagate raw past the action).
  - [x] 2.4 — Use a placeholder `from` address (e.g. `ToanTuDuy <no-reply@toantuduy.vn>`) — a verified sending domain in the Resend dashboard is an operational/deployment concern outside this story's scope; note the placeholder explicitly in Completion Notes (same judgment-call discipline as Story 1.3's `.env.local` placeholders).

- [x] **Task 3: Implement the registration server action** (AC: #1, #3, #6)
  - [x] 3.1 — Create `src/app/register/actions.ts` (`'use server'`). **Do NOT add a session check** — every other server action in this project begins with a session check per [project-context.md](../project-context.md), but registration is the one deliberate exception (there is no session yet); adding one would make sign-up impossible.
  - [x] 3.2 — Validate input server-side with `zod` (already a dependency): email format, password `min(8)`, `confirmPassword === password`. Return `{ error: { code: 'VALIDATION_ERROR', message } }` on failure — never throw.
  - [x] 3.3 — **Normalize email** (`.trim().toLowerCase()`) before any lookup or write. This closes the deferred item from Story 1.3's review ("Google-provider email lookup is case-sensitive with no normalization... depends on how Story 1.4's registration flow stores/normalizes email" — [1-3-nextauth-v5-authentication-infrastructure.md](./1-3-nextauth-v5-authentication-infrastructure.md) Review Findings). Store the normalized form in `User.email`.
  - [x] 3.4 — Check `db.user.findUnique({ where: { email } })` (normalized). If a row exists — regardless of its `emailVerified` state — return `{ error: { code: 'EMAIL_IN_USE', message: 'Email address already registered' } }` (AC #3 explicitly forbids leaking verification status; do not vary the message based on `emailVerified`).
  - [x] 3.5 — Hash the password with `bcryptjs` (`bcrypt.hash(password, 10)` — reuse the same cost factor as the dummy-hash constant already established in `src/lib/auth.ts`).
  - [x] 3.6 — Create `User` (`role: 'PARENT'`, `emailVerified: null`) and `ParentAccount` (`userId`) atomically in one `db.$transaction`.
  - [x] 3.7 — Generate a verification token via `generateVerificationToken(user.id)` (Task 1) and call `sendEmail` (Task 2) with a link `${env.NEXTAUTH_URL}/verify-email?token=${token}`. If `sendEmail` throws, catch it and return `{ error: { code: 'EMAIL_SEND_FAILED', message: ... } }` — **the `User`/`ParentAccount` rows created in 3.6 are NOT rolled back** on email failure (the account exists but stays unverified; a retry/resend path is out of this story's scope — note as a deferred follow-up, do not build a resend-email feature here).
  - [x] 3.8 — On full success, return `{ data: { success: true } }` (AC #6).

- [x] **Task 4: Add the `emailVerified` rejection check to `authorize()`** (AC: #5)
  - [x] 4.1 — This closes the gap Story 1.3 deliberately left open (see [1-3-nextauth-v5-authentication-infrastructure.md](./1-3-nextauth-v5-authentication-infrastructure.md) Task 5.4 / Completion Notes: *"Story 1.4's dev agent must revisit `src/lib/auth.ts`'s `authorize()` to add the rejection check."*). Edit `src/lib/auth.ts`'s `Credentials.authorize()` — after password validation succeeds but before returning the user object, check `user.emailVerified === null` and reject distinctly from "wrong password" (AC #5's message is specific, unlike the generic invalid-credentials message).
  - [x] 4.2 — Auth.js v5 (`next-auth@5.0.0-beta.31`) supports subclassing `CredentialsSignin` with a custom `code` to surface a distinguishable error to the client (verified via web research; may behave slightly differently across beta point-releases — confirm empirically via a manual `pnpm dev` smoke test, same as Story 1.3's JWT-augmentation surprise). Suggested pattern:
    ```ts
    import { CredentialsSignin } from 'next-auth'
    class EmailNotVerifiedError extends CredentialsSignin {
      code = 'email_not_verified'
    }
    // in authorize():
    if (!user.emailVerified) throw new EmailNotVerifiedError()
    ```
  - [x] 4.3 — **Fallback if the custom-code plumbing doesn't reliably surface to the client** with `redirect: false` in this exact beta version: it is acceptable (and must be noted explicitly in Completion Notes as a known limitation) to fall back to returning `null` from `authorize()` for the unverified case too, IF distinguishing it turns out infeasible — but attempt the distinguishable-error path first, since AC #5 requires a specific message, not the generic one.
  - [x] 4.4 — **Also normalize email in the Credentials `authorize()` lookup** (`.trim().toLowerCase()` on `credentials.email` before the `db.user.findUnique` call) — this is the other half of the Story 1.3 deferred item: if registration normalizes on write but login doesn't normalize on read, a user who types different casing at login fails to find their own account. Apply the same normalization to the Google-provider `signIn` callback's `user.email` lookup for consistency.
  - [x] 4.5 — Do NOT touch the `signIn` callback's Google-only-for-Parent / Teacher-approval logic (Story 1.3 scope) beyond the email-normalization change in 4.4 — this story only adds the `emailVerified` gate to the Credentials path.

- [x] **Task 5: Build the `/register` page** (AC: #4, #7)
  - [x] 5.1 — Create `src/app/register/page.tsx`, following the existing `src/app/login/page.tsx` structure/conventions exactly (client component, controlled inputs, `useState` for form fields + error + submitting state).
  - [x] 5.2 — Fields: email, password, confirm-password — each with an associated `<label htmlFor=...>` (never placeholder-as-label, per AC #7 and existing `/login` precedent).
  - [x] 5.3 — Client-side check BEFORE calling the server action: if `password !== confirmPassword`, set an inline error and `return` without submitting (AC #4 — "the form is not submitted to the server"). Also enforce `password.length >= 8` client-side as a first-line check (server-side Zod validation in Task 3.2 is still the authority — this is UX, not the security boundary).
  - [x] 5.4 — Link every error message to its field via `aria-describedby` (AC #7) — the existing `/login` page does NOT do this today (it renders one page-level `role="alert"` paragraph, not field-linked) — do not copy that part of the pattern; implement `aria-describedby` fresh for `/register`.
  - [x] 5.5 — On successful submit (`{ data: { success: true } }`), show a confirmation state on the same page (e.g. "Kiểm tra email để xác thực tài khoản") — do NOT auto-redirect to `/login`, since the account isn't usable until the user completes email verification (distinct from Story 1.3's login page, which does redirect on success).
  - [x] 5.6 — Map each server-action error `code` (`VALIDATION_ERROR`, `EMAIL_IN_USE`, `EMAIL_SEND_FAILED`) to a Vietnamese message from `src/locales/vi/auth.ts` (Task 6) — never render the raw `message` string from the action result directly (that field is for logs/debugging, not guaranteed to be Vietnamese or user-appropriate).

- [x] **Task 6: Build the `/verify-email` route** (AC: #2)
  - [x] 6.1 — Create `src/app/verify-email/page.tsx` as a Server Component reading `token` from `searchParams`.
  - [x] 6.2 — Call `verifyVerificationToken(token)` (Task 1). If `null` (missing, malformed, tampered, or expired), render an inline error state on this page (e.g. "Liên kết xác thực không hợp lệ hoặc đã hết hạn.") — do NOT redirect silently; the user needs to know verification failed (this case isn't covered by an explicit AC — use judgment, keep it minimal, do not build a "resend verification" flow here).
  - [x] 6.3 — If valid, call `db.user.update({ where: { id: userId }, data: { emailVerified: new Date() } })`, then `redirect('/login?verified=true')` (Next.js `redirect()` from `next/navigation`).
  - [x] 6.4 — On `/login` (Task 7), read the `verified` search param and show a success banner "Email verified — please log in" (AC #2's exact wording, translated) when present — do not persist this as a toast/session flag, a query param is sufficient and matches the AC's phrasing ("redirected to `/login` with a ... success message").

- [x] **Task 7: Wire the login-page success banner** (AC: #2, #5)
  - [x] 7.1 — Edit `src/app/login/page.tsx` (already a client component) to read `useSearchParams().get('verified')` and conditionally render a success message using a new locale key (Task 8) — additive change, do not restructure the existing form logic.
  - [x] 7.2 — Add handling for the `email_not_verified` error code (Task 4) from `signIn('credentials', { redirect: false })`'s result, showing `auth.emailNotVerified` (Task 8) instead of the existing generic `auth.invalidCredentials`/`auth.signInFailed` fallback. If Task 4.3's fallback path was taken instead (code not distinguishable), this task reduces to: no change needed beyond what already exists — note which path was taken in Completion Notes.

- [x] **Task 8: Vietnamese locale strings** (AC: all)
  - [x] 8.1 — Extend `src/locales/vi/auth.ts` (existing file from Story 1.3 — do not create a second locale file for auth-related strings) with new keys: registration form labels (`registerTitle`, `confirmPasswordLabel`, `submit`/`submitting` variants or reuse existing generic ones where the copy matches), `passwordMismatch`, `passwordTooShort`, `emailInUse`, `emailSendFailed`, `registrationSuccess` (the "check your email" message), `verifyLinkInvalid`, `emailVerifiedSuccess`, `emailNotVerified`.
  - [x] 8.2 — No inline Vietnamese strings in any `.tsx` file (project-wide rule, [project-context.md](../project-context.md) Code Style).

- [x] **Task 9: Build & lint verification**
  - [x] 9.1 — Run `pnpm build` — zero TypeScript strict-mode errors.
  - [x] 9.2 — Confirm all new file names are kebab-case.
  - [x] 9.3 — Manual smoke test via `pnpm dev`: register a new account → confirm placeholder-email-send path doesn't crash the action (real Resend delivery requires a real `RESEND_API_KEY`/verified domain — not available locally per Story 1.3's placeholder `.env.local` values; verify the action still returns `{ data: { success: true } }` or a clean `EMAIL_SEND_FAILED` error, not an unhandled exception) → manually construct/verify a token via the utility functions (e.g. a scratch script or by temporarily logging the generated token) → hit `/verify-email?token=...` → confirm redirect to `/login?verified=true` and the success banner renders → attempt login before verifying a second test account and confirm the unverified-rejection message appears.

### Review Findings

- [x] [Review][Defer] Email verification triggers on a bare GET, vulnerable to email-scanner auto-verification — `/verify-email` mutates `emailVerified` on Server Component render for any GET request; corporate email link-scanners (Outlook Safe Links, Gmail prefetch) routinely pre-fetch links inside emails, which would silently verify accounts before the real user ever clicks. **Decision:** accepted as-is for MVP — deferred, reason: low risk for this app's audience (Vietnamese consumer/education app targeting parents; enterprise email security gateways are unlikely in this user base). Revisit if real-world scanning issues surface.
- [x] [Review][Patch] `registerParent` can throw on a concurrent duplicate-email race [src/app/register/actions.ts] — fixed: `$transaction` call is now wrapped in try/catch, returning `EMAIL_IN_USE` on a unique-constraint violation instead of throwing.
- [x] [Review][Patch] `VALIDATION_ERROR` always maps to "password too short" [src/app/register/page.tsx] — fixed: server now returns field-specific codes (`PASSWORD_MISMATCH`, `PASSWORD_TOO_SHORT`, `INVALID_EMAIL`); client maps each to the correct field-specific message.
- [x] [Review][Patch] `aria-describedby` only wired for the confirmPassword field [src/app/register/page.tsx] — fixed: email and password fields now have their own error state, id, and `aria-describedby` linkage, matching the confirmPassword pattern.
- [x] [Review][Patch] `/verify-email` crashes if the user row no longer exists [src/app/verify-email/page.tsx] — fixed: `db.user.update` wrapped in try/catch, falling back to the inline invalid-link message on failure.
- [x] [Review][Patch] Google `signIn` callback can crash on a missing `user.email` [src/lib/auth.ts] — verified as a false positive: the `if (!user.email) return false` guard already existed pre-diff (confirmed against baseline commit `0ddb533`), so no change was needed.
- [x] [Review][Patch] `/verify-email`'s `token` search param can arrive as `string[]` [src/app/verify-email/page.tsx] — fixed: `searchParams` type widened to `string | string[]`, taking the first value when duplicated.
- [x] [Review][Patch] Login page's `Suspense` has no fallback [src/app/login/page.tsx] — fixed: added a `LoginFormSkeleton` fallback matching the page shell instead of a blank flash.
- [x] [Review][Patch] Verification email subject/HTML hardcoded in `actions.ts` instead of the locale file [src/app/register/actions.ts] — fixed: moved to `auth.verificationEmailSubject`/`auth.verificationEmailBody` in `src/locales/vi/auth.ts`.
- [x] [Review][Defer] Verification tokens have no single-use/revocation enforcement [src/lib/email-verification-token.ts] — deferred, pre-existing: inherent to the deliberate stateless-token architecture (no `VerificationToken` table, per Story 1.2); replayable within the 24h window with no way to invalidate on resend.
- [x] [Review][Defer] No rate limiting on registration/email-send [src/app/register/actions.ts] — deferred, pre-existing: no server action in the project has rate limiting yet; a project-wide gap, not specific to this story.
- [x] [Review][Defer] Email uniqueness is case-sensitive at the DB level [prisma/schema.prisma] — deferred, pre-existing: `User.email @unique` has no citext/case-insensitive collation; this diff only normalizes at the application layer, a Story 1.2 schema decision.

## Dev Notes

### Critical architectural decision: stateless verification tokens (no new DB table)

The Prisma schema (Story 1.2) has exactly 13 entities and deliberately no NextAuth-adapter tables (`VerificationToken`, `Session`-as-adapter-table, etc. — see [1-2-complete-prisma-schema-database-infrastructure.md](./1-2-complete-prisma-schema-database-infrastructure.md) and [1-3-nextauth-v5-authentication-infrastructure.md](./1-3-nextauth-v5-authentication-infrastructure.md) Task 2.7 explaining why `Session` in `schema.prisma` is the practice-session entity, not an adapter table). **Do not add a migration for a verification-token table.** The correct, already-established pattern in this codebase is a stateless signed token (see `src/lib/child-profile-cookie.ts`): HMAC-SHA256 over a payload, keyed by `NEXTAUTH_SECRET`, verified with `crypto.timingSafeEqual`. This story's token additionally embeds an expiry timestamp in the signed payload (the cookie utility doesn't need this since cookies have their own expiry).

### Registration is the one server action WITHOUT a session check

[project-context.md](../project-context.md) states every server action must begin with a session check. Registration is a deliberate, sole exception — there is no session before an account exists. Do not "fix" this by adding one.

### `resend.ts` is now live, not a Story 5.2 stub

`deferred-work.md`'s note that Resend is "intentionally deferred to Story 5.2" predates this story's AC (which explicitly requires sending a real verification email through this exact module). This story implements the real integration; Story 5.2 will reuse it for its own three trigger events (subscription activated, teacher approved/rejected) without needing to build the module from scratch.

### Email normalization closes a Story 1.3 deferred item

Story 1.3's Review Findings flagged the Google-provider email lookup as case-sensitive with no normalization, explicitly deferred pending this story ("depends on how Story 1.4's registration flow stores/normalizes email"). Normalize (`trim().toLowerCase()`) at three points: registration write, Credentials `authorize()` read, and the Google `signIn` callback's lookup — missing any one of these reintroduces the same case-mismatch bug from the other direction.

### `authorize()` custom error code — verify empirically

`next-auth@5.0.0-beta.31`'s `CredentialsSignin` subclassing (custom `code` property) is the documented Auth.js v5 mechanism to surface a distinguishable client-side error without a generic message, but beta-to-beta behavior has been reported as inconsistent in community issues. Story 1.3 already hit one beta-API surprise (JWT module augmentation didn't merge as documented — resolved with a type cast instead). Treat this the same way: try the documented pattern first, confirm via manual smoke test whether `signIn(..., { redirect: false })`'s returned `result.error`/`result.code` actually carries `'email_not_verified'`, and document whatever the actual observed behavior was in Completion Notes — including if the fallback (generic message for both invalid-credentials and unverified) had to be used.

### Architecture Compliance

- **Layer rules**: `src/app/register/actions.ts` is the Application-layer entry point (server action) — it may call Infrastructure (`resend.ts`) and `src/lib/db.ts` directly. No repository layer exists yet for `User` (only `question-repository.ts`/`session-repository.ts` are scoped, in Epic 3) — direct `db` access from a server action/lib file matches the existing Story 1.3 precedent (`auth.ts` also queries `db` directly), so this is consistent, not a new deviation.
- Server action return shape `{ data: T } | { error: { code, message } }`, never throws — applies to `registerParent` in `actions.ts`.
- No changes to `prisma/schema.prisma` in this story.
- Vietnamese strings: all in `src/locales/vi/auth.ts`, no inline strings in `.tsx` files.

### Previous Story Intelligence (Story 1.3)

- `src/lib/auth.ts`'s current `Credentials.authorize()` already has the dummy-hash timing-safety pattern (`DUMMY_HASH`) and a `typeof` guard on `credentials.email`/`credentials.password` — preserve both when adding the `emailVerified` check; do not regress the timing-safety fix by restructuring the early-return flow.
- `src/lib/auth.ts`'s `signIn` callback does a single `db.user.findUnique({ where: { email }, include: { teacherAccount: true } })` serving both the Google-Parent-only and Teacher-approval checks — when adding email normalization here (Task 4.4), normalize the `where: { email }` value only; don't otherwise restructure this callback (Epic 5/Story 1.3 scope, not this story's).
- `src/types/next-auth.d.ts` already augments `Session.user` with `id`/`role`/`email` — no changes needed here; this story doesn't touch session/JWT shape, only the `authorize()` rejection path.
- Story 1.3's Dev Notes documented that `declare module 'next-auth/jwt'` augmentation doesn't merge in this dependency setup (pnpm doesn't hoist `@auth/core`) — irrelevant to this story directly, but a reminder that this codebase's `next-auth` beta has had more than one doc-vs-reality gap; verify rather than assume for the `CredentialsSignin` subclassing too.
- `src/app/login/page.tsx` and `src/locales/vi/auth.ts` are the direct precedent to extend/follow for `/register`'s structure and locale-file conventions.

### Git Intelligence Summary

- Last commit (`0ddb533`, "feat(auth): Implement NextAuth v5 authentication infrastructure") is Story 1.3's full implementation — `auth.ts`, `child-profile-cookie.ts`, `route.ts`, `login/page.tsx`, `locales/vi/auth.ts`, `types/next-auth.d.ts` are all real (not stubs) as of this story's start.
- No `resend` package in `package.json`/`pnpm-lock.yaml` yet — this story is the first to add it.
- No test framework exists in this repo (consistent across Stories 1.1–1.3) — this story has no unit-test AC; verification is build-clean + manual smoke check, same pattern.

### Latest Technical Notes

- **Resend SDK**: `pnpm add resend` — no pinned version precedent in this repo; use whatever resolves as latest at install time and record the exact version in Completion Notes (same discipline as Story 1.3's `next-auth@beta` version pinning).
- **Auth.js v5 custom `CredentialsSignin` codes**: documented mechanism is subclassing `CredentialsSignin` (imported from `next-auth`) with an overridden `code` property; the code surfaces via the sign-in error/query-param flow. With `redirect: false` client-side, confirm empirically which field on the `signIn()` result actually carries it in `5.0.0-beta.31` — do not assume without checking.

### Project Structure Notes

- Files touched: `package.json`/`pnpm-lock.yaml` (add `resend`), `src/infrastructure/email/resend.ts` (rewrite), `src/lib/email-verification-token.ts` (new), `src/lib/auth.ts` (edit — `authorize()` verified-email check + email normalization in Credentials and Google paths), `src/app/register/page.tsx` (new), `src/app/register/actions.ts` (new), `src/app/verify-email/page.tsx` (new), `src/app/login/page.tsx` (edit — success banner + unverified-error handling), `src/locales/vi/auth.ts` (edit — new keys).
- No changes to `prisma/schema.prisma`.
- No route-group layouts (`(parent)/`, etc.) touched — `/register`, `/verify-email` sit outside all route groups, same precedent as `/login` (Story 1.3).

### Testing Standards

- No test framework exists in this repo (consistent with Stories 1.1–1.3) — do not introduce one as a side effect of this story. Verification is: `pnpm build` clean, and the manual smoke sequence in Task 9.3.

### References

- Story requirements: [epics.md](../planning-artifacts/epics.md) — "Story 1.4: Parent Account Registration & Email Verification"
- Project context (auth rules, layer rules, code style): [project-context.md](../project-context.md)
- Previous story (auth infra, deferred `emailVerified`/normalization items): [1-3-nextauth-v5-authentication-infrastructure.md](./1-3-nextauth-v5-authentication-infrastructure.md)
- Schema precedent (no VerificationToken table, why): [1-2-complete-prisma-schema-database-infrastructure.md](./1-2-complete-prisma-schema-database-infrastructure.md)
- Deferred work log: [deferred-work.md](./deferred-work.md)
- Downstream consumers of this story's output: Story 1.5 (post-login redirect logic for a verified Parent — does not itself depend on the verification mechanics, just `session.user.role`), Story 5.2 (reuses `src/infrastructure/email/resend.ts` for its own trigger events, built by this story)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Manual smoke test via a scratch script (`npx tsx --env-file=.env.local`) calling `registerParent` directly, plus `curl` against a running `pnpm dev` instance for the HTTP-level flows. Confirmed: successful registration (User + ParentAccount created, `emailVerified: null`), clean `EMAIL_SEND_FAILED` on the placeholder-domain send failure, `EMAIL_IN_USE` on duplicate email, `VALIDATION_ERROR` on password mismatch, valid/expired/tampered token verification, `/verify-email` redirect to `/login?verified=true`, invalid-token error rendering, and the verified-success banner on `/login`.
- **Empirical finding on `CredentialsSignin` custom code (Task 4.2/4.3):** confirmed via `curl` against `/api/auth/callback/credentials` that `next-auth@5.0.0-beta.31` surfaces the custom `EmailNotVerifiedError`'s `code` on a **separate `code` field**, not on `error` (which stays the generic `"CredentialsSignin"`). The client-side `signIn(..., { redirect: false })` result type (`SignInResponse`) also declares both `error` and `code` as distinct fields. The distinguishable-error path (not the 4.3 fallback) works as intended; `src/app/login/page.tsx` checks `result.code === 'email_not_verified'` (initially miswritten as `result.error`, caught and fixed during the manual smoke test).
- Encountered an unrelated environment quirk while smoke-testing: rapid successive short-lived Prisma Client connections against `DATABASE_URL_POOLED` (Supabase PgBouncer, transaction-mode, port 6543) intermittently collided on a stale prepared statement (`"s0" already exists`, Postgres code `42P05`). Worked around it for testing only by appending `?pgbouncer=true` to a locally-overridden `DATABASE_URL_POOLED` env var (not committed anywhere). This is a pre-existing infra characteristic of the pooled connection string, not a regression introduced by this story — flagging here in case a future story hits it under real request concurrency.

### Completion Notes List

- Resend integration (`src/infrastructure/email/resend.ts`) uses a placeholder `from` address `ToanTuDuy <no-reply@toantuduy.vn>` — the `toantuduy.vn` domain is not verified in the Resend dashboard, so every send currently fails with a domain-verification error, which `registerParent` catches and maps to `EMAIL_SEND_FAILED` (verified in the manual smoke test). Verifying a real sending domain is an operational/deployment task outside this story's scope.
- `resend` npm package installed at `6.17.2` (latest at install time; no pinned-version precedent in this repo, per Story 1.3's discipline of recording the exact resolved version).
- Task 4.2's documented `CredentialsSignin` subclassing approach works empirically in this beta version — no fallback to 4.3 was needed. See Debug Log for the `error` vs. `code` field detail; Task 7.2 was implemented against the correct field after the smoke test surfaced the initial mismatch.
- Per AC #3, `registerParent` returns the identical `EMAIL_IN_USE` error regardless of the existing account's `emailVerified` state — no verification-status leakage.
- No test framework exists in this repo (consistent with Stories 1.1–1.3); verification is `pnpm build` (zero TypeScript strict-mode errors), `next lint` (clean), and the manual smoke sequence described above — no automated tests were added, per the story's Testing Standards.
- No changes to `prisma/schema.prisma`, consistent with the story's Dev Notes.

### File List

- `src/lib/email-verification-token.ts` (new)
- `src/infrastructure/email/resend.ts` (modified — real Resend integration, replacing the Story-5.2 stub)
- `src/app/register/actions.ts` (new)
- `src/app/register/page.tsx` (new)
- `src/app/verify-email/page.tsx` (new)
- `src/lib/auth.ts` (modified — `emailVerified` rejection check + email normalization in `authorize()` and the `signIn` callback)
- `src/app/login/page.tsx` (modified — verified-success banner, `email_not_verified` error handling, wrapped in `Suspense` for `useSearchParams`)
- `src/locales/vi/auth.ts` (modified — new registration/verification locale keys)
- `package.json` / `pnpm-lock.yaml` (modified — added `resend` dependency)

## Change Log

- 2026-07-10 — Story created via create-story workflow.
- 2026-07-10 — Implemented Tasks 1–9: stateless email-verification tokens, real Resend integration, registration server action, `authorize()` email-verified gate + normalization, `/register` and `/verify-email` pages, login-page banner/error wiring, Vietnamese locale strings. Build and lint clean; manual smoke test passed. Status moved to review.
