# Deferred Work

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
