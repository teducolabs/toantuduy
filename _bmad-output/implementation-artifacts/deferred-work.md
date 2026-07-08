# Deferred Work

## Deferred from: code review of 1-1-initialize-nextjs-monorepo-design-system-foundation (2026-07-09)

- `next-auth` package not in `package.json` — intentionally deferred to Story 1.3 which implements the full NextAuth v5 configuration
- Supabase, Resend, PayOS SDK packages absent from `package.json` — intentionally deferred to respective implementation stories (Resend: Story 5.2, PayOS: Story 6.1, Supabase: Story 7.4)
- Prisma schema missing `directUrl` for PgBouncer pooling pattern — the full schema and `db.ts` singleton with `DATABASE_URL_POOLED` are Story 1.2 scope; schema stub is correct for now
- No HTTP security headers in `next.config.ts` — no real route implementations yet; add `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` etc. in a dedicated security hardening task before first production deploy
- Route group layouts absent for `(parent)`, `(student)`, `(teacher)` — per-role layouts (including auth guards) added in per-role stories, not this foundation story
- Stub pages render inline English strings instead of `src/locales/vi/` keys — stubs only; locale keys added in each feature story when actual content is implemented
- `NEXTAUTH_SECRET` Zod validator checks character count not entropy — low operational risk; enforce strong secret generation (e.g., `openssl rand -base64 32`) in deployment runbook
