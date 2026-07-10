---
baseline_commit: 6d09c1b
---

# Story 1.3: NextAuth v5 Authentication Infrastructure

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want NextAuth v5 configured with all providers, the signIn callback, and the child-profile cookie utility,
So that the full authentication contract for all three user types is in place before any user-facing features are built.

## Acceptance Criteria

1. **Given** NextAuth v5 dependencies are installed, **When** a request hits `/api/auth/[...nextauth]`, **Then** the NextAuth route handler responds without errors.
2. **And** `src/lib/auth.ts` configures a Credentials provider (email + bcrypt-hashed password validated against the `User` table) and a Google OAuth provider.
3. **And** the NextAuth `signIn` callback rejects Google OAuth sign-in if the resolved user's `role !== 'PARENT'` (returns `false`).
4. **And** the `signIn` callback rejects any sign-in if the user is a Teacher with `status !== 'APPROVED'` (returns `false`).
5. **And** the session JWT shape includes `user.id`, `user.role`, and `user.email`; client-side session contains the same fields for display only.
6. **And** `src/lib/child-profile-cookie.ts` exports:
   - `setChildProfileCookie(profileId: string, response: NextResponse): void` — sets a signed, httpOnly, SameSite=Strict cookie named `child-profile-id`
   - `getChildProfileId(headers: ReadonlyHeaders): string | null` — reads and verifies the HMAC signature using `NEXTAUTH_SECRET`; returns `null` on missing or invalid signature
7. **And** there is a `/login` page with email/password fields and a Google sign-in button; all inputs have associated `<label>` elements.
8. **And** authentication errors (invalid credentials, unverified email, pending teacher) display user-facing messages without leaking system internals.

## Tasks / Subtasks

- [x] **Task 1: Install auth dependencies** (AC: #1, #2)
  - [x] 1.1 — Add `next-auth` (v5 — currently distributed under the `beta` dist-tag, e.g. `pnpm add next-auth@beta`) to `dependencies`. Confirm the installed version actually resolves to a `5.x` release before proceeding — v4 has an incompatible config shape (no `auth()` helper, different route handler export).
  - [x] 1.2 — Add `bcryptjs` (pure-JS, no native build step — avoids Vercel serverless native-binary issues that plain `bcrypt` can hit) as a dependency, for hashing/comparing `User.passwordHash`. `bcryptjs` ships its own types since v2.4.x — do NOT also add `@types/bcryptjs` (a dead stub package on npm).
  - [x] 1.3 — Do NOT touch the pinned `prisma`/`@prisma/client` versions (`^5.22.0`) — unrelated to this story, see [1-2-complete-prisma-schema-database-infrastructure.md](./1-2-complete-prisma-schema-database-infrastructure.md) Dev Notes for why they're pinned.

- [x] **Task 2: Implement `src/lib/auth.ts` — NextAuth v5 config** (AC: #2, #3, #4, #5)
  - [x] 2.1 — Replace the Story 1.1 stub (currently `export const authConfig: Record<string, any> = {}`) with a real NextAuth v5 config object passed to `NextAuth(...)`, exporting `{ handlers, auth, signIn, signOut }` per the v5 pattern (see Dev Notes → "NextAuth v5 config shape").
  - [x] 2.2 — Configure a `Credentials` provider: `authorize(credentials)` looks up `User` by `email` via `db` (from `src/lib/db.ts`), and if `passwordHash` is non-null, compares it with `bcryptjs.compare(credentials.password, user.passwordHash)`. Return `null` (never throw) on any lookup/compare failure — NextAuth's Credentials provider treats a thrown error as a 500, not a rejected login.
  - [x] 2.3 — Configure a `Google` provider using `env.GOOGLE_CLIENT_ID` / `env.GOOGLE_CLIENT_SECRET` from `src/lib/env.ts` (already Zod-validated in Story 1.1 — do not re-validate or read `process.env` directly).
  - [x] 2.4 — Implement the `signIn` callback:
    - If `account?.provider === 'google'`: look up the `User` by email; if no `User` exists OR `user.role !== 'PARENT'`, return `false`. (Per AC #3 — Google OAuth is Parent-only; this also naturally blocks Google sign-up creating new accounts, since v1 has no self-serve Parent registration via Google — registration is email/password only per Story 1.4.)
    - If the resolved user has `role === 'TEACHER'`: load the `TeacherAccount` and return `false` unless `status === 'APPROVED'`. This runs for BOTH providers — a Teacher could theoretically hit the Credentials provider — check status regardless of `account.provider`.
    - Otherwise return `true`.
  - [x] 2.5 — Implement the `jwt` callback to persist `user.id`, `user.role`, `user.email` onto the token on first sign-in (the `user` param is only present on the initial `authorize`/OAuth call, not on subsequent calls — merge into `token`, don't overwrite).
  - [x] 2.6 — Implement the `session` callback to copy `token.id`/`token.role`/`token.email` onto `session.user` so `session.user.role` is readable server-side (this is the field every later story's authorization check reads — see [project-context.md](../project-context.md) Auth & Authorization Rules).
  - [x] 2.7 — Set `session: { strategy: 'jwt' }` explicitly — this app has no session table in the Prisma schema (no `Session`/`VerificationToken` NextAuth-adapter models exist; the `Session` model in `schema.prisma` is the practice-session entity, NOT a NextAuth adapter table) — do NOT wire a Prisma adapter, JWT-only strategy is required.
  - [x] 2.8 — Set `secret: env.NEXTAUTH_SECRET` explicitly (don't rely on the `NEXTAUTH_SECRET` env var auto-detection alone — being explicit keeps this in one auditable place alongside the Zod validation).

- [x] **Task 3: Wire the route handler** (AC: #1)
  - [x] 3.1 — Replace the Story 1.1 stub in `src/app/api/auth/[...nextauth]/route.ts` (currently hand-rolled `GET`/`POST` returning 501) with `export const { GET, POST } = handlers` re-exported from `src/lib/auth.ts`'s `NextAuth(...)` result.
  - [x] 3.2 — Verify `pnpm dev` then a request to `/api/auth/providers` (or `/api/auth/session`) returns a JSON response, not a 501 or 500.

- [x] **Task 4: Implement `src/lib/child-profile-cookie.ts`** (AC: #6)
  - [x] 4.1 — Replace the Story 1.1 stub (currently both functions `throw new Error('Not yet implemented')`) with real implementations.
  - [x] 4.2 — `setChildProfileCookie(profileId, response)`: sign `profileId` with an HMAC-SHA256 keyed by `env.NEXTAUTH_SECRET` (e.g. `crypto.createHmac('sha256', env.NEXTAUTH_SECRET).update(profileId).digest('hex')`), store as `${profileId}.${signature}` in a cookie named `child-profile-id` via `response.cookies.set(...)` with `{ httpOnly: true, sameSite: 'strict', secure: true, path: '/' }`. Reuse this same signing scheme in `getChildProfileId` — do not invent a second format.
  - [x] 4.3 — `getChildProfileId(headers)`: read the `child-profile-id` cookie value from the given `ReadonlyHeaders`/cookie store, split on the last `.`, recompute the HMAC over the profile-id portion, and compare against the stored signature using a timing-safe comparison (`crypto.timingSafeEqual`) — never a plain `===` string compare on a signature. Return `null` on missing cookie, malformed value, or signature mismatch — never throw.
  - [x] 4.4 — Match the exact signatures documented in AC #6 — the Story 1.1 stub's parameter types (`CookieStore` for `setChildProfileCookie`'s first arg) predate the epics.md AC wording (`(profileId, response: NextResponse)`); reconcile in favor of the **epics.md AC #6 signature** (`response: NextResponse` — this function is called from a server action / route handler that needs to attach a `Set-Cookie` header to its own response, not the ambient request's cookie store). Update the stub's types accordingly; this is a deliberate correction, not a deviation.
  - [x] 4.4a — **Do not import `ReadonlyHeaders` directly** for `getChildProfileId`'s parameter type — it is a private Next.js internal (only reachable via `next/dist/server/...`, not re-exported by the public `next/headers` entry point). Story 1.1's review already found and fixed a stray private-Next.js-type import in this exact file (see Previous Story Intelligence below) — do not reintroduce that mistake. Instead derive the type from a public API, e.g. `type HeadersLike = Awaited<ReturnType<typeof headers>>` (from `next/headers`), matching the existing `CookieStore` derivation pattern already used in this file's stub.
  - [x] 4.5 — This story only builds and exports these two functions — wiring them into the actual "select child profile" server action and the `/(student)/` layout guard is Epic 2 scope (Story 2.2), not this story.

- [x] **Task 5: Build the `/login` page** (AC: #7, #8)
  - [x] 5.1 — Create `src/app/login/page.tsx` (outside all route groups — this is the shared entry point for all three roles, per Story 1.5's later redirect logic).
  - [x] 5.2 — Render an email + password form (each input with an associated `<label>`, per NFR/UX-DR17 accessibility conventions already established) plus a "Sign in with Google" button that calls `signIn('google')`.
  - [x] 5.3 — On Credentials submit, call `signIn('credentials', { email, password, redirect: false })` client-side (or a server action wrapping it) and branch on the result: NextAuth v5's `signIn` with `redirect: false` throws/returns an error indicator on failed auth — surface a generic user-facing message ("Email hoặc mật khẩu không đúng.") without distinguishing "wrong password" from "email not found" (prevents user enumeration).
  - [x] 5.4 — **AC #8 is only partially implementable in this story.** This story's `authorize()` (Task 2.2) has no `emailVerified` check yet — Story 1.4 (which creates the registration flow that sets `emailVerified`) is the one that adds "reject unverified email" logic to `authorize()`/the credentials flow. For THIS story, it is sufficient that: (a) invalid credentials and (b) a rejected `signIn` callback (pending teacher, non-Parent Google account — Task 2.4) each surface as a generic user-facing error ("Email hoặc mật khẩu không đúng." / "Đăng nhập không thành công.") rather than a crash or silent no-op. Do not attempt to build unverified-email rejection in this story — there's no `emailVerified` check to hook it to yet; note this gap explicitly in Completion Notes so Story 1.4's dev agent knows it must revisit `src/lib/auth.ts`.
  - [x] 5.5 — No redirect-on-success routing logic in this story (role-based redirect to `/(parent)/dashboard` / `/(teacher)/` / `/admin/` is Story 1.5 scope) — a bare redirect to `/` on success is sufficient here.
  - [x] 5.6 — Vietnamese strings for this page may be added directly to `src/locales/vi/` (e.g. a new `auth.ts` file) rather than left inline — follow the existing `src/locales/vi/common.ts` pattern (a plain exported object); do not block this story on filling out `common.ts`'s placeholder content.

- [x] **Task 6: Build & lint verification**
  - [x] 6.1 — Run `pnpm build` — zero TypeScript strict-mode errors.
  - [x] 6.2 — Confirm all new file names are kebab-case.
  - [x] 6.3 — Grep `src/` for any remaining `Not yet implemented — Story 1.3` stub markers — must return zero matches (all three Story 1.1 stubs — `auth.ts`, `child-profile-cookie.ts`, `route.ts` — are replaced).

## Review Findings

- [x] [Review][Patch] No email-verified check on Google OAuth account linking — the `signIn` callback matches an existing `User` by `user.email` from the Google profile without checking Google's `email_verified` claim, so account-linking trust is based on an unverified email match. Decision: add the `email_verified` check. [src/lib/auth.ts:26-38]
- [x] [Review][Patch] Google-authenticated sessions get `undefined` role and a non-DB `id` — the `jwt` callback casts `(user as { role: string }).role`, but for the Google provider `user` is the raw OAuth profile (no `role` field, `id` is Google's subject id, not the app's `User.id`). Only the Credentials `authorize()` return value carries the real DB id/role. Every Google-authenticated Parent — the only production Google flow per AC #3 — ends up with `session.user.role === undefined` and a mismatched `session.user.id`, breaking every downstream server-side role/id check. [src/lib/auth.ts:26-46]
- [x] [Review][Patch] Credentials `authorize()` allows email-enumeration via bcrypt timing side-channel — when no `User` row matches, the function returns immediately without a dummy `bcrypt.compare`, so response latency reveals whether an email is registered. [src/lib/auth.ts:14-21]
- [x] [Review][Patch] Child-profile cookie hardcodes `secure: true` — not gated by `NODE_ENV`, so the cookie silently fails to set/send over plain `http://localhost`, breaking local dev/test unless HTTPS is configured. [src/lib/child-profile-cookie.ts:19-23]
- [x] [Review][Patch] Login page shows generic "invalid credentials" for every `signIn` rejection — `auth.signInFailed` (meant for a rejected `signIn` callback, e.g. pending-teacher or non-Parent Google account per Task 5.4) is defined but never used; only `invalidCredentials` is shown, so a rejected-but-not-wrong-password case is mislabeled. [src/app/login/page.tsx:22-25]
- [x] [Review][Patch] Google sign-in button has no error-handling path — it calls `signIn('google')` without `redirect: false`, so a `signIn` callback rejection (e.g. non-Parent or pending-Teacher account) routes to NextAuth's default error page instead of this page's localized error UI. [src/app/login/page.tsx:88-94]
- [x] [Review][Patch] `handleSubmit` doesn't catch a rejected `signIn()` promise — a network/DNS failure throws past the `await`, leaving `isSubmitting` stuck `true` and the submit button permanently disabled with no error shown. [src/app/login/page.tsx:13-28]
- [x] [Review][Patch] `authorize()` doesn't validate credential types before use — `credentials.email`/`credentials.password` are cast to `string` without a `typeof` check; a malformed submission (e.g. array value) can throw past the cast into Prisma/bcrypt instead of failing the login gracefully. [src/lib/auth.ts:14-21]
- [x] [Review][Patch] `getChildProfileId`'s `headers` parameter shadows the imported `headers` type — no runtime collision today (it's a type-only import), but fragile if a later edit imports the runtime `headers()` function under the same name. [src/lib/child-profile-cookie.ts:26]
- [x] [Review][Defer] No rate limiting / brute-force protection on the credentials login path — deferred, pre-existing; not required by this story's ACs, but a real gap on a platform serving minors. [src/lib/auth.ts]
- [x] [Review][Defer] Google-provider email lookup (`db.user.findUnique({ where: { email: user.email } })`) is case-sensitive with no normalization visible in this diff — deferred, pre-existing; depends on how Story 1.4's registration flow stores/normalizes email. [src/lib/auth.ts:30-31]

## Dev Notes

### NextAuth v5 config shape (exact pattern)

NextAuth v5 (still beta-distributed as of this codebase's dependency snapshot) uses a single config object exported once, unlike v4's per-route `authOptions`:

```ts
// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({ where: { email: credentials.email as string } })
        if (!user?.passwordHash) return null
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, role: user.role }
      },
    }),
    Google({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const dbUser = await db.user.findUnique({ where: { email: user.email! } })
        if (!dbUser || dbUser.role !== 'PARENT') return false
      }
      const roleCheckUser = await db.user.findUnique({
        where: { email: user.email! },
        include: { teacherAccount: true },
      })
      if (roleCheckUser?.role === 'TEACHER' && roleCheckUser.teacherAccount?.status !== 'APPROVED') {
        return false
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})
```

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

Two DB lookups in the `signIn` callback above (one for the Google-provider check, one for the Teacher-status check) is intentional redundancy for clarity in this draft — collapsing to a single lookup that serves both branches is a reasonable simplification during implementation, as long as both AC #3 and AC #4 conditions are still checked.

**Module augmentation:** NextAuth v5's default `Session`/`JWT`/`User` types don't have `role`/`id` fields — add a `src/types/next-auth.d.ts` (or inline module augmentation in `auth.ts`) declaring:
```ts
declare module 'next-auth' {
  interface Session {
    user: { id: string; role: string; email: string } & DefaultSession['user']
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
  }
}
```
Without this, `session.user.role` and `token.role` are TypeScript errors under strict mode (AC's build-clean requirement).

### `child-profile-cookie.ts` signature reconciliation — read before implementing

The Story 1.1 stub's `setChildProfileCookie` takes `(_cookies: CookieStore, _childProfileId: string)`, but epics.md's AC #6 (authoritative — see Story doc AC #6 above) specifies `setChildProfileCookie(profileId: string, response: NextResponse): void`. These are genuinely different designs: the stub assumes a mutable cookie store is available (Next.js Server Actions can mutate `cookies()` directly in some contexts), while the AC assumes the caller has a `NextResponse` to attach `Set-Cookie` to (needed when setting a cookie from a Route Handler or when a Server Action returns a redirect response). **Follow the AC signature** — it's what Story 2.2 (the actual caller, in Epic 2) expects per its own acceptance criteria wording ("`setChildProfileCookie` is called server-side... setting a signed httpOnly `child-profile-id` cookie"). Flag this reconciliation in Completion Notes; don't silently pick one without noting it.

### Architecture Compliance

- **AD-4** (NextAuth v5, three roles, Google Parent-only, server-side role reads): this story implements AD-4 in full — see [project-context.md](../project-context.md) Auth & Authorization Rules.
- **AD-5** (child-profile cookie, separate claim from JWT): this story only builds the cookie utility functions; it does NOT wire them into any route yet (that's Epic 2). Do not add `childProfileId` to the JWT `token` object in this story's `jwt` callback — the two claims must never coexist per AD-5, and this story's session JWT only carries `user.id`/`user.role`/`user.email`.
- **AD-6** (teacher approval gate, dual check): this story implements only the FIRST of the two required checks (`signIn` callback). The SECOND check (every `/teacher/*` layout and server action re-verifying `status === 'APPROVED'`) is Epic 5 scope — do not build teacher route guards in this story, there are no `/teacher/*` routes with real content yet (Story 1.5 adds only a stub shell).
- **Layer rules**: `src/lib/auth.ts` and `src/lib/child-profile-cookie.ts` live in `src/lib/` per the existing Story 1.1/1.2 precedent (matches `src/lib/db.ts`, `src/lib/env.ts`) — this is Infrastructure-adjacent code, not `src/infrastructure/`, consistent with prior stories. Do not relocate.
- Server actions in this story (the `/login` form submission, if implemented as a server action rather than client-side `signIn()`) must still return `{ data: T } | { error: { code, message } }` per the project-wide convention — but note `next-auth`'s own `signIn()` function has its own throw/return contract; wrap it, don't let a NextAuth error propagate raw to the client.

### Previous Story Intelligence (Story 1.2)

- `src/lib/db.ts` singleton already exists and exports `db` — import it directly in `auth.ts`'s `authorize` callback; do not instantiate a second `PrismaClient`.
- Prisma is pinned at `^5.22.0` — unrelated to this story but do not let `pnpm add next-auth@beta` accidentally bump Prisma as a side effect of a lockfile resolution; verify `package.json`'s prisma versions are unchanged after `pnpm install`.
- `User.passwordHash` is nullable (`String?`) specifically because Google-OAuth-only Parent accounts never set one — Task 2.2's `authorize` must treat a `null` `passwordHash` as "this account can't use Credentials login" (return `null`, not a crash) rather than assuming every `User` row has a hash.
- `TeacherAccount.status` defaults to `PENDING` (`@default(PENDING)`) — a freshly-created Teacher (once Epic 5 registration exists) will fail the Task 2.4 signIn check by default, which is correct behavior, not a bug to work around.
- Story 1.2's review process was strict about flagging judgment calls explicitly in Completion Notes rather than silently resolving them (see its Review Findings list) — follow the same discipline here, especially for the cookie-signature reconciliation in Task 4.4.

### Git Intelligence Summary

- Last 3 commits (`6d09c1b`, `d04f690`, `86e62b8`) are the Epic 1 foundation build-out: schema/db infra, env var hardening, initial scaffold. No auth-related code has been touched yet — `src/lib/auth.ts`, `child-profile-cookie.ts`, and the NextAuth route handler are all still their original Story 1.1 stubs (confirmed by reading each file directly): `route.ts` and `child-profile-cookie.ts` throw/return literal `Not yet implemented — Story 1.3` errors; `auth.ts`'s stub is `export const authConfig: Record<string, any> = {}` with only a `// TODO: Implemented in Story 1.3` comment (no throw). Task 6.3's grep for the stub marker only reliably confirms `route.ts`/`child-profile-cookie.ts` were replaced — separately confirm `auth.ts` was rewritten by checking it no longer exports `authConfig`.
- No `next-auth`, `bcrypt`, or `bcryptjs` package currently in `package.json` — this story is the first to introduce them.
- No test framework exists in this repo (confirmed again in Story 1.2) — this story has no unit-test AC; verification is build-clean + manual `/api/auth/*` smoke check, same pattern as Story 1.2.

### Latest Technical Notes

- **NextAuth v5** is still distributed under the `beta` npm dist-tag (`next-auth@beta`, e.g. resolving to a `5.0.0-beta.x` release) — there is no stable `5.0.0` GA release as of this codebase's last dependency check. This is expected and matches the Architecture Spine's intent (AD-4 names "NextAuth v5" specifically, which only exists as beta). Pin to whatever exact `5.0.0-beta.x` resolves at install time and record it in Completion Notes — do not silently fall back to `next-auth@4` due to a "stable" preference; v4's config shape is incompatible with this story's ACs (no `auth()` helper export, different callback signatures).
- **bcryptjs vs bcrypt**: `bcryptjs` (pure JS) is recommended over native `bcrypt` for Vercel serverless — native `bcrypt` requires a compiled binary that can mismatch the Vercel build environment's Node/glibc version, causing intermittent deploy failures. This is a judgment call for this codebase (no prior precedent in `package.json`) — flag the choice in Completion Notes if a different library is used instead.
- Google OAuth credentials (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`) are already Zod-validated in `src/lib/env.ts` (Story 1.1) — this story is the first to actually consume them.

### Project Structure Notes

- Files touched: `src/lib/auth.ts` (rewrite), `src/app/api/auth/[...nextauth]/route.ts` (rewrite), `src/lib/child-profile-cookie.ts` (rewrite), `src/app/login/page.tsx` (new), possibly `src/types/next-auth.d.ts` (new, for module augmentation), `src/locales/vi/auth.ts` (new, optional), `package.json` (add `next-auth`, `bcryptjs`, `@types/bcryptjs`).
- No changes to `prisma/schema.prisma` in this story — the `User`/`TeacherAccount` models this story reads already exist in full from Story 1.2.
- No route-group layouts (`(parent)/layout.tsx`, `(teacher)/layout.tsx`, etc.) are created or modified in this story — those (and their server-side role guards) are Story 1.5 scope. Do not add auth guards to existing stub pages under `(parent)/`, `(teacher)/`, `(student)/`, or `admin/` in this story.

### Testing Standards

- No test framework exists in this repo (consistent with Stories 1.1/1.2) — do not introduce one as a side effect of this story. Verification is: `pnpm build` passing with zero TypeScript errors, a manual request to `/api/auth/providers` (or equivalent) returning valid JSON instead of a 501/500, and a grep confirming zero remaining "Story 1.3" stub markers.

### References

- Story requirements: [epics.md](../planning-artifacts/epics.md) — "Story 1.3: NextAuth v5 Authentication Infrastructure"
- Project context (auth rules, layer rules): [project-context.md](../project-context.md)
- Previous story (Prisma schema, `db.ts` singleton): [1-2-complete-prisma-schema-database-infrastructure.md](./1-2-complete-prisma-schema-database-infrastructure.md)
- Deferred work log (no open items block this story): [deferred-work.md](./deferred-work.md)
- Downstream consumers of this story's output: Story 1.4 (registration writes `User.passwordHash` this story's `authorize` reads, AND must add the `emailVerified` rejection check into `authorize()`/`signIn` that this story deliberately leaves unimplemented — see Task 5.4), Story 1.5 (role-based post-login redirect using `session.user.role`), Story 2.2 (wires `setChildProfileCookie`/`getChildProfileId` into the profile-switch flow), Epic 5 (adds the second teacher-approval gate check at the route level)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `pnpm build` — first attempt failed TS strict-mode check on `session.user.id = token.id` (`Type 'unknown' is not assignable to type 'string'`); resolved by casting at the read site (see Completion Notes — JWT augmentation judgment call).
- `pnpm build` — second attempt failed at "Collecting page data" for `/api/auth/[...nextauth]` with a Zod validation error: `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`/`SECRET`, `RESEND_API_KEY`, `PAYOS_*`, `SUPABASE_*` were blank in the gitignored local `.env.local`. This story is the first to import `src/lib/env.ts` from a route that's included in the build graph (no prior story exercised this path). Filled schema-valid local-dev placeholder values in `.env.local` (not `.env`, not committed) so the build can validate — see Completion Notes.
- `pnpm build` (third attempt) — compiled clean, 17/17 static pages generated.
- `pnpm lint` — no warnings or errors.
- Manual smoke test via `pnpm dev`: `GET /api/auth/providers` → 200 JSON with `credentials`/`google` provider entries; `GET /login` → 200.

### Completion Notes List

- **next-auth version**: `pnpm add next-auth@beta` resolved to `5.0.0-beta.31` — confirmed a real `5.x` release (has `auth()`/`handlers` export shape). Recorded in `package.json` as an exact version (no `^`), matching how beta dist-tags are typically pinned.
- **bcryptjs**: used as specified (no `@types/bcryptjs` added — ships its own types).
- **`child-profile-cookie.ts` signature reconciliation (Task 4.4)**: followed the epics.md AC #6 signature — `setChildProfileCookie(profileId: string, response: NextResponse): void` — over the Story 1.1 stub's `(cookies, profileId)` shape, per the Dev Notes' explicit instruction. `getChildProfileId` takes a `HeadersLike` (`Awaited<ReturnType<typeof headers>>` from `next/headers`) rather than importing the private `ReadonlyHeaders` type, consistent with Task 4.4a.
- **Two-DB-lookup collapse in `signIn` callback**: collapsed to a single `db.user.findUnique` with `include: { teacherAccount: true }`, used for both the Google-Parent-only check (AC #3) and the Teacher-approval check (AC #4), per the Dev Notes' note that this collapse is an acceptable simplification.
- **JWT module augmentation — deviation from Dev Notes' suggested pattern**: the Dev Notes' example augments `declare module 'next-auth/jwt' { interface JWT {...} }`. This did not work as written: `next-auth/jwt` only re-exports (`export * from '@auth/core/jwt'`) rather than declaring the `JWT` interface itself, so augmenting it doesn't merge. Augmenting `'@auth/core/jwt'` directly also doesn't merge in practice, because pnpm doesn't hoist `@auth/core` (a transitive dependency) into the app's own `node_modules` — TypeScript can't resolve that module specifier from `src/`, so the `declare module` block becomes a disconnected shadow declaration instead of a real augmentation. Resolved by casting at the two call sites in `auth.ts` (`token.id as string`, `token.role as string`) instead of relying on ambient augmentation for the `JWT` type. The `Session` augmentation (`declare module 'next-auth'`) works fine since `next-auth` itself is a direct, hoisted dependency.
- **AC #8 gap (documented per Task 5.4)**: `authorize()` has no `emailVerified` check yet — this is intentionally deferred to Story 1.4, which introduces the registration flow that sets `User.emailVerified`. Story 1.4's dev agent must revisit `src/lib/auth.ts`'s `authorize()` to add the rejection check.
- **Local `.env.local` placeholders**: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY`, `SUPABASE_URL/SERVICE_ROLE_KEY` were blank locally (only the two `DATABASE_URL*` vars had real values). Filled with clearly-named `local-dev-placeholder-*` strings that satisfy the Zod schema shape so `pnpm build`/`pnpm dev` succeed locally without real third-party credentials. `.env.local` is gitignored — real credentials still need to be provisioned (e.g. in Vercel env vars) before OAuth/email/payment features actually work end-to-end; Google sign-in will fail against Google's servers with the placeholder client ID until real credentials are supplied, but this does not block this story's ACs (route responds, page renders, credentials-provider flow is testable independent of real Google creds).
- Verification followed the story's "no test framework" pattern (Stories 1.1/1.2): `pnpm build` clean, `pnpm lint` clean, manual `/api/auth/providers` + `/login` smoke check via `pnpm dev`.

### File List

- `package.json` — added `next-auth@5.0.0-beta.31`, `bcryptjs@^3.0.3`
- `pnpm-lock.yaml` — updated by `pnpm add`
- `src/lib/auth.ts` — rewritten: NextAuth v5 config (Credentials + Google providers, `signIn`/`jwt`/`session` callbacks, JWT session strategy)
- `src/app/api/auth/[...nextauth]/route.ts` — rewritten: re-exports `{ GET, POST }` from `handlers`
- `src/lib/child-profile-cookie.ts` — rewritten: `setChildProfileCookie` / `getChildProfileId` HMAC-signed cookie implementation
- `src/types/next-auth.d.ts` — new: `Session` module augmentation (`user.id`/`role`/`email`)
- `src/app/login/page.tsx` — new: email/password + Google sign-in form
- `src/locales/vi/auth.ts` — new: Vietnamese strings for the login page
- `.env.local` — filled schema-valid local-dev placeholder values for previously-blank secrets (gitignored, not committed)

## Change Log

- 2026-07-10 — Story created via create-story workflow.
- 2026-07-10 — Implemented NextAuth v5 config, route handler, child-profile cookie utility, and `/login` page. All tasks complete, `pnpm build`/`pnpm lint` clean. Status → review.
