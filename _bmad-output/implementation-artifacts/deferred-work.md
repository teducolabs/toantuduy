# Deferred Work

## Deferred from: code review of 3-2-question-session-repository-infrastructure (2026-07-18)

- `createSession` doesn't expose per-question `SessionAnswer` ids that `recordAnswer` requires — deferred, pre-existing spec design (AC #2 signatures are locked as specified); Story 3.3 will need a way to look up a `SessionAnswer.id` by `(sessionId, questionId)` before it can call `recordAnswer` — no such lookup exists yet in either repository.
- `completeSession` doesn't verify all stub answers are filled before marking `completedAt` — deferred, pre-existing; whether early/partial completion is allowed is a business-policy decision that belongs in a future use-case/server-action layer (AD-2), not this story's repository.

## Deferred from: code review of 3-1-adaptive-difficulty-domain-use-case (2026-07-18)

- Difficulty target in `selectNextQuestion` is anchored to `DEFAULT_DIFFICULTY_LEVEL ± 1`, never relative to a Skill's last-presented level — Questions can never reach Difficulty Level 4 or 5, and `MIN_DIFFICULTY_LEVEL`/`MAX_DIFFICULTY_LEVEL` are effectively dead code for this reason. Accepted: the [1,3] range is the intended scope for this story; full 1–5 progression (tracking each Skill's last-presented level, likely via `SkillAccuracyWindow` or an added parameter) is deferred to a later story/architecture change.
- `skillAccuracyHistory` entries for Skills entirely absent from `availableQuestions` can still be selected by the weighted pick in `selectNextQuestion`, forcing an untargeted fallback pick — untested; best verified once Story 3.2's repository actually supplies this data end-to-end.
- `SkillAccuracyWindow`'s "oldest first" ordering is a documented convention with no structural enforcement; `SessionAnswer` has no timestamp/sequence field to derive true order from — best addressed once Story 3.2 builds the actual construction path from DB rows.

## Deferred from: code review of 2-3-student-home-screen-shell (2026-07-18)

- `rounded-brand-xl` applied via `className` may not reliably override `Card`'s hardcoded `rounded-xl` — default `tailwind-merge` config doesn't recognize the custom `rounded-brand-*` tokens as conflicting with `rounded-xl`, so final visual precedence depends on compiled CSS rule order, not class order. Same pattern already exists pre-existing in `src/components/parent/child-profile-switcher.tsx:48` (`rounded-brand-sm` on a `Button` with hardcoded `rounded-lg`) — systemic, not introduced by this story.
- `student.greeting` has no guard for an empty or unbounded `name` (pre-existing behavior, unchanged by this diff beyond adding "! 👋").
- No automated test coverage exists for any acceptance criteria in this story (pre-existing, repo-wide — no test framework set up yet).
- `next build` fails in-sandbox on the Prisma-CLI `DATABASE_URL` step for the third story in a row, with `next build` used as a workaround each time instead of fixing the root cause.

## Deferred from: code review of 2-2-child-profile-switch-student-surface-entry (2026-07-18)

- No test coverage added for the new `switchActiveChildProfileAction` ownership check, cookie-signing (`src/lib/child-profile-cookie.ts`), or the `(student)` route group's cookie-gating logic — no test framework exists in this repo yet; the Epic 1 retrospective action item already tracks adding one before Epic 3, not this story.

## Deferred from: code review of 1-4-parent-account-registration-email-verification (2026-07-10)

- `/verify-email` (`src/app/verify-email/page.tsx`) mutates `emailVerified` on a bare GET request with no confirmation step — corporate email link-scanners (Outlook Safe Links, Gmail prefetch) could silently auto-verify accounts before the real user clicks. Accepted as-is for MVP: low risk for this app's audience (Vietnamese consumer/education app targeting parents; enterprise email security gateways unlikely). Revisit if real-world scanning issues surface.
- Verification tokens have no single-use/revocation enforcement (`src/lib/email-verification-token.ts`) — inherent to the deliberate stateless-token architecture (no `VerificationToken` table, per Story 1.2); replayable within the 24h window with no way to invalidate a token early if the user requests a new one.
- No rate limiting on registration/email-send (`src/app/register/actions.ts`) — no server action in the project has rate limiting yet; a project-wide gap, not specific to this story.
- Email uniqueness is case-sensitive at the DB level (`prisma/schema.prisma`) — `User.email @unique` has no citext/case-insensitive collation; this story's diff only normalizes at the application layer (registration write, Credentials `authorize()`, Google `signIn` callback), a Story 1.2 schema decision.

## Deferred from: code review of 1-3-nextauth-v5-authentication-infrastructure (2026-07-10)

- No rate limiting / brute-force protection on the credentials login path (`src/lib/auth.ts`) — not required by this story's ACs, but a real gap on a platform serving minors; revisit when middleware/infra-level throttling is introduced.
- Google-provider email lookup (`db.user.findUnique({ where: { email: user.email } })` in `src/lib/auth.ts`) is case-sensitive with no normalization visible in this diff — depends on how Story 1.4's registration flow stores/normalizes email; revisit once 1.4 lands.

## Deferred from: code review of 1-2-complete-prisma-schema-database-infrastructure (2026-07-10)

- `DATABASE_URL` (direct) resolves to a shared Supavisor session-mode pooler rather than a true direct connection — accepted as a documented workaround for now (real direct host is IPv6-only, unreachable from the dev network); revisit if the Supabase IPv4 add-on is purchased before scaling production traffic
- No unique constraint on `SessionAnswer(sessionId, questionId)` — duplicate stub rows are possible once Story 3.2's `createSession` starts writing; that story owns this write path and should add the constraint alongside its implementation
- `SessionAnswer` partial-state consistency not enforced at the DB level (`answeredCorrectly`/`answeredAt`/`difficultyLevelAtAnswer` can be set independently) — same table/owner as above (Story 3.2)
- `Session.correctCount` has no DB-level check that it stays `<= questionCount` — relies entirely on Story 3.2's application logic; consistent with this schema's existing convention of enforcing invariants in the domain layer, not via DB constraints
- No DB-level UTC enforcement for `DateTime` columns (Postgres `TIMESTAMP` without timezone, enforced by convention only) — matches the story's own Dev Notes caveat; would need `@db.Timestamptz` + a documented convention across the whole schema if this needs strengthening
- `User.role` has no DB-level tie to which account relation (`parentAccount`/`teacherAccount`) actually exists — a `PARENT` user could have a `TeacherAccount` row, or an `ADMIN` neither/both; enforced only in application code, no polymorphic constraint support in Prisma
- `GlobalConfig` ships with no seed/bootstrap step — keys like `FREE_TIER_DAILY_ALLOTMENT`/`SESSION_QUESTION_COUNT`/`SESSION_TIME_LIMIT_MINUTES` will be missing until some future seed step runs; this story's Task 5 scopes seed content to Skill/Question only (Story 3.2/7.5), GlobalConfig seeding isn't owned anywhere yet
- `onDelete: Restrict` on `Question`'s relations (`Skill`, `SessionAnswer`, `AssignmentSetQuestion`) blocks deleting any Question/Skill with historical answers, no archival/soft-delete path — relevant to a future content-moderation story (Epic 7)
- `TeacherAccount` records `rejectedReason` for the rejection path but has no `approvedAt`/`approvedBy` for the approval path — asymmetric audit trail for the admin-reviewed teacher approval workflow (Epic 5/7)
- `Class.joinCode` is unique but has no length/format constraint at the DB level, and no visibility into collision-handling for code generation — deferred to whichever future story implements join-code generation/redemption (Epic 5)
- `PrismaClient` singleton (`src/lib/db.ts`) is unsupported on the Edge runtime — not reachable today (zero `runtime = 'edge'` routes exist in the repo), but worth a note for whoever adds an edge route later that they can't import `db` directly from there
- Running `prisma migrate deploy` inside `next build` means any local `pnpm build` run will attempt real migrations against whatever `DATABASE_URL`/`DATABASE_URL_POOLED` are configured locally — a documented, deliberate tradeoff (one unified `build` script instead of a separate `vercel-build`), not an unreviewed defect, but worth keeping in mind as a real operational risk

## Deferred from: code review of 1-1-initialize-nextjs-monorepo-design-system-foundation (2026-07-09)

- `next-auth` package not in `package.json` — intentionally deferred to Story 1.3 which implements the full NextAuth v5 configuration
- Supabase, Resend, PayOS SDK packages absent from `package.json` — intentionally deferred to respective implementation stories (Resend: Story 5.2, PayOS: Story 6.1, Supabase: Story 7.4)
- Prisma schema missing `directUrl` for PgBouncer pooling pattern — the full schema and `db.ts` singleton with `DATABASE_URL_POOLED` are Story 1.2 scope; schema stub is correct for now
- No HTTP security headers in `next.config.ts` — no real route implementations yet; add `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` etc. in a dedicated security hardening task before first production deploy
- Route group layouts absent for `(parent)`, `(student)`, `(teacher)` — per-role layouts (including auth guards) added in per-role stories, not this foundation story
- Stub pages render inline English strings instead of `src/locales/vi/` keys — stubs only; locale keys added in each feature story when actual content is implemented
- `NEXTAUTH_SECRET` Zod validator checks character count not entropy — low operational risk; enforce strong secret generation (e.g., `openssl rand -base64 32`) in deployment runbook

## Deferred from: code review of spec-login-password-visibility-toggle (2026-07-14)

- source_spec: `_bmad-output/implementation-artifacts/spec-login-password-visibility-toggle.md`
  summary: `src/app/register/page.tsx`'s two password fields (`password`, `confirmPassword`) have no show/hide toggle, unlike the login form.
  evidence: Pre-existing gap not touched by this change; adding parity would be a separate UI change to a different page/form.
