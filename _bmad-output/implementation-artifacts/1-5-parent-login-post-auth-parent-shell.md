---
baseline_commit: 4937ab1
---

# Story 1.5: Parent Login & Post-Auth Parent Shell

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to log in and land on a working parent shell,
so that I can access the application after authentication.

## Acceptance Criteria

1. **Given** I am on `/login` with a verified Parent Account, **When** I submit valid email and password, **Then** I am authenticated via NextAuth and redirected to `/dashboard` (the `(parent)` route group).
2. **Given** I sign in with Google with an email matching an existing PARENT account, **When** the OAuth flow completes, **Then** I am authenticated and redirected to `/dashboard`.
3. **Given** I am already authenticated (any role) and navigate to `/login`, **When** the page loads, **Then** I am redirected to my role's home path without re-authenticating (PARENT → `/dashboard`).
4. **And** the `(parent)` layout (`src/app/(parent)/layout.tsx`) verifies `session.user.role === 'PARENT'` server-side; unauthenticated or wrong-role requests redirect to `/login`.
5. **And** the parent shell renders with bottom tab bar navigation at `< lg` breakpoint and sidebar navigation at `≥ lg` breakpoint, with four navigation items: Dashboard, Profiles, Subscription, Account. Items other than Dashboard show a "coming soon" placeholder until implemented in later epics. _(Reworded during code review to match the shipped `lg:hidden`/`hidden lg:flex` markup — see Review Findings.)_
6. **And** an `APPROVED` Teacher logging in is redirected to `/classes` (teacher stub shell, "Teacher Portal — coming soon").
7. **And** a `PENDING` or `REJECTED` Teacher logging in sees a full-screen message: "Tài khoản đang chờ xét duyệt. Chúng tôi sẽ thông báo qua email." with no portal content accessible — enforced at the `(teacher)` layout level (not just at the redirect step), re-checked on every request since `TeacherAccount.status` is not in the JWT.
8. **And** an ADMIN logging in is redirected to `/admin` (stub shell, "Admin Panel — coming soon"), gated by a new `src/app/admin/layout.tsx` that verifies `session.user.role === 'ADMIN'` server-side.
9. **And** all server actions in auth flows return `{ data: T } | { error: { code: string; message: string } }`; no unhandled exceptions propagate to the client.

## Tasks / Subtasks

- [x] **Task 1: Shared role→home-path helper** (AC: #1, #2, #3, #6, #8)
  - [x] 1.1 — Create `src/lib/role-redirect.ts` exporting `getHomePathForRole(role: string): string`: `'PARENT'` → `/dashboard`, `'TEACHER'` → `/classes`, `'ADMIN'` → `/admin`, any other value → `/login`. Pure function — no Next.js or Prisma imports — so it's safe to call from any Server Component.
  - [x] 1.2 — This is the single source of truth for "where does an authenticated user of role X land." Both Task 2 and Task 3 must import it rather than re-deriving the mapping.

- [x] **Task 2: Root page becomes a role-based redirector** (AC: #1, #2, #6, #8)
  - [x] 2.1 — Rewrite `src/app/page.tsx` (currently an unconditional `redirect('/dashboard')` placeholder from Story 1.1 scaffolding) as an `async` Server Component: `const session = await auth()`. If `!session?.user`, `redirect('/login')`. Otherwise `redirect(getHomePathForRole(session.user.role))`.
  - [x] 2.2 — `auth()` is imported from `@/lib/auth` (already exported there, per Story 1.3). Do not create a new auth helper.

- [x] **Task 3: `/login` — redirect already-authenticated users, keep the existing form working** (AC: #3)
  - [x] 3.1 — Move the current client-side contents of `src/app/login/page.tsx` (the `LoginForm` and `LoginFormSkeleton` functions, lines 16–147 as of baseline commit `4937ab1`) verbatim into a new file `src/app/login/login-form.tsx` with `'use client'` at the top. Do not change any of the existing submit/Google-sign-in/error-handling logic — it already works (Story 1.3/1.4) and AC #1/#2 depend on it continuing to.
  - [x] 3.2 — Rewrite `src/app/login/page.tsx` as an `async` Server Component (no `'use client'`): `const session = await auth()`. If `session?.user`, `redirect(getHomePathForRole(session.user.role))` (Task 1's helper — reused here, not reimplemented). Otherwise render `<Suspense fallback={<LoginFormSkeleton />}><LoginForm /></Suspense>`, importing both from `./login-form`.
  - [x] 3.3 — `login-form.tsx`'s existing `window.location.href = '/'` on successful sign-in is still correct and needs no change — it now lands on the rewritten root page (Task 2), which performs the role-based redirect. Do not hardcode `/dashboard` inside the form component; keep the single redirect decision point in `src/app/page.tsx`.

- [x] **Task 4: Parent shell layout + navigation** (AC: #4, #5)
  - [x] 4.1 — Create `src/app/(parent)/layout.tsx`: `async` Server Component. `const session = await auth()`. If `!session?.user || session.user.role !== 'PARENT'`, `redirect('/login')`. Otherwise render the shell (nav + `{children}`).
  - [x] 4.2 — Nav: 4 items — Dashboard (`/dashboard`), Profiles (`/profiles`), Subscription (`/subscription`), Account (`/account`, new — see 4.3). Render as a bottom tab bar below `md` and a sidebar at `≥ lg` (Tailwind: e.g. `<nav className="fixed inset-x-0 bottom-0 lg:hidden ...">` for the tab bar, `<nav className="hidden lg:flex ...">` for the sidebar) — two nav markups sharing the same 4 links, toggled by breakpoint classes, matching UX-DR12's stated pattern (bottom tab bar ≤ md, sidebar ≥ lg, content `max-w-3xl` on desktop). Do not install a new shadcn nav component for this — plain semantic `<nav>`/`<Link>` markup is sufficient at this stage; `lucide-react` icons are optional polish, not required by any AC.
  - [x] 4.3 — Create `src/app/(parent)/account/page.tsx` (new stub, matching the existing `profiles`/`subscription` stub pattern exactly: `export default function ParentAccountPage() { return <main>...</main> }`).
  - [x] 4.4 — Nav item labels must come from `src/locales/vi/common.ts` (Task 8), not be inline strings in the layout — this file is currently an empty placeholder (`export const common = {} as Record<string, string>`), populate it with typed keys instead of the placeholder cast.

- [x] **Task 5: Teacher shell gating** (AC: #6, #7)
  - [x] 5.1 — Create `src/lib/teacher-status.ts` exporting `async function getTeacherAccountStatus(userId: string): Promise<'PENDING' | 'APPROVED' | 'REJECTED' | null>` — `db.teacherAccount.findUnique({ where: { userId } })`, return `null` if no row (never throw). `TeacherAccount.userId` is the unique FK field (confirmed in `prisma/schema.prisma`).
  - [x] 5.2 — Create `src/app/(teacher)/layout.tsx`: `async` Server Component. `const session = await auth()`. If `!session?.user || session.user.role !== 'TEACHER'`, `redirect('/login')`. Else `const status = await getTeacherAccountStatus(session.user.id)`. If `status !== 'APPROVED'`, render the full-screen blocking message (Task 8 locale key) **instead of** `{children}` — do not render the teacher route content at all. If `status === 'APPROVED'`, render `{children}`.
  - [x] 5.3 — This check is deliberately independent of Task 2's root-page redirect — a PENDING/REJECTED teacher who bookmarks `/classes` (or any `(teacher)/*` route) directly must still be blocked, per the project's dual-gate rule (status can change after JWT issuance, so the JWT role claim alone is insufficient — see [project-context.md](../project-context.md) Auth & Authorization Rules).
  - [x] 5.4 — Update the existing stub text in `src/app/(teacher)/classes/page.tsx` from `"Teacher classes — coming soon"` to `"Teacher Portal — coming soon"` (AC #6's exact wording) — `/classes` is the chosen interim landing route for an approved teacher, since `(teacher)` is a route group (no URL segment of its own) and cannot host a bare `/` page alongside the existing root `src/app/page.tsx`. Story 5.3 ("Teacher Portal Shell & Class Management") will replace this stub with the real teacher portal home; this story only needs a reachable, correctly-worded landing target.

- [x] **Task 6: Admin shell gating** (AC: #8)
  - [x] 6.1 — Create `src/app/admin/layout.tsx`: `async` Server Component. `const session = await auth()`. If `!session?.user || session.user.role !== 'ADMIN'`, `redirect('/login')` (consistent with the parent/teacher gates in Tasks 4–5; the project-context "403/redirect" rule leaves the choice open and there is no 403 page in the app yet, so redirect is the consistent choice across all three surfaces).
  - [x] 6.2 — Create `src/app/admin/page.tsx` (new — no admin index page exists yet; `admin/config`, `admin/questions`, `admin/teachers` already exist as sibling stub pages): `export default function AdminHomePage() { return <main>Admin Panel — coming soon</main> }` (AC #8's exact wording).

- [x] **Task 7: Vietnamese locale strings** (AC: #5, #7, #8)
  - [x] 7.1 — Populate `src/locales/vi/common.ts` (replacing the empty placeholder) with: parent nav labels (`parentNavDashboard: 'Tổng quan'`, `parentNavProfiles: 'Hồ sơ'`, `parentNavSubscription: 'Gói cước'`, `parentNavAccount: 'Tài khoản'`) and the teacher pending/rejected message (`teacherPendingApproval: 'Tài khoản đang chờ xét duyệt. Chúng tôi sẽ thông báo qua email.'`, exact AC #7 wording). These are judgment-call label choices (neither the PRD nor the UX spine names exact copy for the Profiles/Subscription/Account nav items) — keep them short, consistent with the UX spine's parent-surface voice/tone table (concise, non-narrating Vietnamese).
  - [x] 7.2 — No inline Vietnamese strings in any `.tsx` file (project-wide rule) — the layouts (Task 4, Task 5) and the two new stub pages (Task 4.3, Task 6.2) must import from locale files, not hardcode Vietnamese text. (Task 6.2's "Admin Panel — coming soon" and Task 5.4's "Teacher Portal — coming soon" are English placeholder scaffolding text, matching the existing convention set by the other stub pages from Story 1.1 — leave these as inline English to stay consistent with sibling stubs like `(parent)/dashboard/page.tsx`; only genuinely Vietnamese user-facing copy — nav labels, the teacher-pending message — must go through locale files.)

- [x] **Task 8: Server action / error-handling audit** (AC: #9)
  - [x] 8.1 — This story adds no new server actions (`'use server'` files) — all new logic is Server Component redirects/layouts plus the two `src/lib/` helpers (Task 1, Task 5.1). Confirm `getTeacherAccountStatus` never throws (returns `null` on a missing row, matching the `email-verification-token.ts` precedent of "never throw, return null on invalid/missing state").
  - [x] 8.2 — Confirm no regression to the existing server-action contract in `src/app/register/actions.ts` or `src/lib/auth.ts` — this story does not touch either file's logic, only reads `auth()`'s session output.

- [x] **Task 9: Build & lint verification**
  - [x] 9.1 — Run `pnpm build` — zero TypeScript strict-mode errors. No test framework exists in this repo (consistent with Stories 1.1–1.4); this remains the verification bar.
  - [x] 9.2 — Manual smoke test via `pnpm dev`: (a) log in as a verified Parent (email/password) → land on `/dashboard` with the shell nav visible; (b) navigate to `/login` while already authenticated as that Parent → redirected back to `/dashboard`, no form flash; (c) resize/inspect at `< md` and `≥ lg` to confirm bottom-tab-bar vs. sidebar nav swap; (d) click each of the 4 nav items, confirm Profiles/Subscription/Account render their stub pages; (e) if a Teacher test account exists in APPROVED state, confirm login → `/classes` shows "Teacher Portal — coming soon"; (f) with a PENDING or REJECTED teacher, confirm the full-screen blocking message renders and no `(teacher)/*` content is reachable even via direct URL; (g) with an Admin test account, confirm login → `/admin` shows "Admin Panel — coming soon"; (h) confirm an unauthenticated visit to `/dashboard`, `/classes`, or `/admin` redirects to `/login`.

### Review Findings

- [x] [Review][Decision] Undisclosed scope creep in `prisma/seed.ts` / `package.json` — **Resolved: keep seed.ts changes in this story** (needed to smoke-test all 4 role states). Converted to patch below.
- [x] [Review][Decision] AC #5 breakpoint wording vs. implemented markup — **Resolved: keep the code as-is** (Task 4.2's `lg:hidden`/`hidden lg:flex` markup is authoritative). Converted to patch below.
- [x] [Review][Patch] File List and Debug Log don't reflect the permanent `prisma/seed.ts` / `package.json` changes — File List updated to include both files; Debug Log reworded to note seed accounts are permanent dev fixtures, not deleted after verification.
- [x] [Review][Patch] AC #5 wording doesn't match the implemented breakpoint — reworded AC #5 to `< lg` to match the shipped `lg:hidden`/`hidden lg:flex` markup.
- [x] [Review][Patch] Unmapped role can cause infinite redirect loop [src/app/login/page.tsx:9] — fixed: `/login` now only redirects when the computed home path isn't `/login` itself, breaking the potential loop.
- [x] [Review][Patch] Seed script has no environment guard [prisma/seed.ts] — `main()` now refuses to run when `NODE_ENV === 'production'`.
- [~] [Review][Patch] `getHomePathForRole(role: string)` should use the Prisma `Role` enum type [src/lib/role-redirect.ts:1] — **skipped**: the project's own Dev Notes state `session.user.role` is deliberately a plain `string`, matching `auth.ts`'s existing literal-string comparisons; typing this param as the `Role` enum would require an unsafe cast at every call site instead of fixing anything. The actual risk (redirect loop) is addressed by the patch above.
- [x] [Review][Patch] Seed script's console-summary `accounts` array duplicated seed call data [prisma/seed.ts:72] — fixed: `seedParent`/`seedTeacher`/`seedAdmin` now return `{ email, role, user }`, and `main()` builds the summary from those return values instead of a separate hardcoded array.
- [x] [Review][Patch] Reseeding an email under a different role left a stale `parentAccount`/`teacherAccount` row [prisma/seed.ts] — fixed: each seed function now deletes the other role-specific row(s) for that `userId` before upserting its own.

## Dev Notes

### Discrepancy resolved: Google OAuth scope (PRD vs. epics/architecture/actual code)

The PRD (`prds/prd-toantuduy-2026-07-08/prd.md`, §6 Non-Goals) explicitly lists "Third-party SSO (Google, Facebook)" as **out of scope for v1** with a note to reconsider in v1.1. This is stale relative to what was actually built: `epics.md`'s Story 1.5 ACs, the architecture spine's AD-4 ("Google OAuth is enabled for Parent accounts only"), and `src/lib/auth.ts` / `src/app/login/page.tsx` (both already implemented in Story 1.3, live in `main` as of commit `0ddb533`) all treat Google OAuth as in-scope and already functional. **Follow the epics/architecture/code — Google OAuth for Parent accounts is in scope and already works.** Do not attempt to remove or gate it; this story only adds the *destination* redirect logic on top of an already-working sign-in flow. If this discrepancy needs formal PRD reconciliation, that's a documentation follow-up, not a blocker for this story.

### What this story does NOT touch

- `src/lib/auth.ts` (NextAuth config, callbacks, session shape) — untouched. Story 1.3/1.4 already built and hardened this; this story only *consumes* `auth()` and `session.user.{id,role,email}`.
- `src/app/register/actions.ts`, `src/app/verify-email/page.tsx`, `src/lib/email-verification-token.ts` — untouched.
- `prisma/schema.prisma` — no migration. `TeacherAccount.status`/`userId` already exist (confirmed in schema) and are read-only for this story's purposes.
- The actual *content* of `/dashboard`, `/profiles`, `/subscription` — they stay as Story 1.1's "coming soon" stub pages; only the shell wrapping them (the new `(parent)/layout.tsx`) and reachability (via login/root redirect + role gate) are new. Real dashboard content is Epic 4's scope.

### Why `(teacher)` can't get a bare `/` landing page

`(teacher)` is a Next.js **route group** (parenthesized folder name) — it contributes no URL segment. `src/app/(teacher)/page.tsx` would resolve to the exact same path (`/`) as the existing `src/app/page.tsx`, which Next.js rejects as two parallel pages resolving to one route. `admin/` has no parentheses, so `src/app/admin/page.tsx` (Task 6.2) is a legitimate new literal route at `/admin` with no such conflict. This is why the Teacher landing target is the existing named segment `/classes`, not a group-level index — see Task 5.4.

### Architecture Compliance

- **Layer rules**: All new/changed files in this story are Presentation (`src/app/(parent)/layout.tsx`, `src/app/(teacher)/layout.tsx`, `src/app/admin/layout.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`, the new stub pages) or cross-cutting `src/lib/` helpers (`role-redirect.ts`, `teacher-status.ts`) — the same bucket `src/lib/auth.ts` and `src/lib/db.ts` already occupy. No Domain code is implicated (auth/session/nav is not business logic). Direct `db` access from a `src/lib/` helper consumed by a layout follows the same precedent Story 1.3/1.4 already established for `src/lib/auth.ts` calling `db` directly — do not create a repository layer for this (none exists yet for `User`/`TeacherAccount`).
- **Server action return shape** `{ data: T } | { error: { code, message } }` — unaffected by this story since no new server actions are added (Task 8).
- **Session vs. cookie separation** (AD-5): this story only reads `session.user.{id, role, email}` from the NextAuth JWT/session. It does not read or write the `childProfileId` cookie (`src/lib/child-profile-cookie.ts`) — that belongs to the future Child Profile selection story (Epic 2), which is out of scope here.
- **Dual-gate pattern for Teacher status** (project-context.md Auth & Authorization Rules, item 3): this story is the *first* place in the codebase that implements this pattern in code (Stories 1.3/1.4 only implemented the `signIn`-callback half of the analogous logic, for authentication; Task 5 here implements the route/layout half, for authorization on every subsequent request).

### Previous Story Intelligence (Story 1.4)

- `src/app/login/page.tsx` as of baseline `4937ab1` is a client component with a `Suspense`-wrapped `LoginForm` (needs `useSearchParams` for the `verified=true` banner and `email_not_verified`/`CredentialsSignin` error handling) — Task 3 preserves this exact logic, just relocates it so the outer `page.tsx` can become a Server Component for the new redirect check. Do not alter the `signIn('credentials', ...)` / `signIn('google', ...)` call sites or their error-code handling.
- Session shape confirmed via `src/types/next-auth.d.ts`: `session.user: { id: string; role: string; email: string }`. `role` is a plain `string`, not a typed union — compare against the literal string values `'PARENT'` / `'TEACHER'` / `'ADMIN'` (matching the Prisma `Role` enum's serialized values), same as `src/lib/auth.ts`'s existing `dbUser.role !== 'PARENT'` check.
- No repository layer exists yet for `User`/`TeacherAccount` — direct `db` access from a `src/lib/` file (Task 5.1) matches the established precedent, not a new deviation.
- No test framework exists in this repo (consistent across Stories 1.1–1.4) — `pnpm build` + manual smoke test remains the verification bar (Task 9).

### Git Intelligence Summary

- HEAD is `4937ab1` (Story 1.4). `src/app/login/page.tsx`, `src/lib/auth.ts`, `src/locales/vi/auth.ts`, `src/types/next-auth.d.ts` are all in their final Story-1.4 state and are the direct build-on point.
- Route-group placeholder pages from Story 1.1 (`(parent)/dashboard`, `(parent)/profiles`, `(parent)/subscription`, `(teacher)/assignments`, `(teacher)/classes`, `(teacher)/reports`, `admin/config`, `admin/questions`, `admin/teachers`) are all one-line "coming soon" stubs with no layout wrapping them yet — confirmed by reading each file directly. This story is the first to add `layout.tsx` files to any of these groups.
- `src/app/page.tsx` currently does an unconditional `redirect('/dashboard')` (Story 1.1 placeholder) — this only "worked" for the parent flow by coincidence, since no other role could reach it via a working login before this story.

### Project Structure Notes

- Files to create: `src/lib/role-redirect.ts`, `src/lib/teacher-status.ts`, `src/app/login/login-form.tsx`, `src/app/(parent)/layout.tsx`, `src/app/(parent)/account/page.tsx`, `src/app/(teacher)/layout.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`.
- Files to modify: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/(teacher)/classes/page.tsx` (stub text only), `src/locales/vi/common.ts`.
- File/directory naming: kebab-case, matching `role-redirect.ts` / `teacher-status.ts` / `login-form.tsx`.
- No changes to `prisma/schema.prisma`, `src/lib/auth.ts`, `src/lib/db.ts`, `src/lib/env.ts`, or any `register`/`verify-email` files.

### Testing Standards

- No test framework exists in this repo (consistent with Stories 1.1–1.4) — do not introduce one as a side effect of this story. Verification is `pnpm build` clean + the manual smoke sequence in Task 9.2, covering all 4 roles/states (verified Parent via credentials, Parent via Google, APPROVED Teacher, PENDING/REJECTED Teacher, Admin, and unauthenticated direct-URL access).

### References

- Story requirements: [epics.md](../planning-artifacts/epics.md) — "Story 1.5: Parent Login & Post-Auth Parent Shell"
- Project context (auth rules, layer rules, code style): [project-context.md](../project-context.md)
- Architecture spine (AD-4 auth/roles, AD-5 cookie/session separation, AD-6 teacher dual-gate pattern, Consistency Conventions): `architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md`
- UX spine (UX-DR12 responsive parent layout: bottom tab bar ≤ md, sidebar ≥ lg, content max-w-3xl): `ux-designs/ux-toantuduy-2026-07-08/DESIGN.md`, `EXPERIENCE.md`
- Previous story (auth infra + login page baseline this story builds on): [1-4-parent-account-registration-email-verification.md](./1-4-parent-account-registration-email-verification.md)
- Downstream consumers of this story's output: Story 2.x (Child Profile management — will read/write the `childProfileId` cookie inside the `(parent)` shell this story builds), Story 5.3 (Teacher Portal Shell — replaces the `/classes` stub landing text this story sets)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `pnpm build`: clean (zero TypeScript strict-mode errors), all 21 routes compiled.
- Manual smoke test via `pnpm dev` (port 3001) using seeded test accounts (parent, teacher-approved, teacher-pending, admin) from `prisma/seed.ts` — these are permanent dev fixtures (`db:seed` script), not deleted after verification:
  - Unauthenticated `/`, `/dashboard`, `/classes`, `/admin` all → 307 redirect to `/login`.
  - Credentials login as Parent → root redirects to `/dashboard`; shell renders with all 4 Vietnamese nav labels (Tổng quan, Hồ sơ, Gói cước, Tài khoản) and the dashboard stub content.
  - Already-authenticated Parent visiting `/login` → 307 redirect straight to `/dashboard`, no form render.
  - Credentials login as APPROVED Teacher → root redirects to `/classes`, stub renders "Teacher Portal — coming soon".
  - Dual-gate verification: flipped an already-signed-in APPROVED teacher's `TeacherAccount.status` to `PENDING` in the DB (simulating post-issuance revocation) and re-requested `/classes` with the existing session cookie — the `(teacher)` layout rendered the full-screen Vietnamese blocking message instead of the route's `{children}`, confirmed via the RSC payload (stub text never entered the render tree).
  - Credentials login as Admin → root redirects to `/admin`, stub renders "Admin Panel — coming soon".

### Completion Notes List

- Implemented all 9 tasks as specified; no deviations from the story's Dev Notes.
- Confirmed a pre-existing architectural point while smoke-testing AC #7: `src/lib/auth.ts`'s `signIn` callback (untouched, from Story 1.3) already rejects credential sign-in for a PENDING/REJECTED teacher before this story's code runs — so the Task 5 full-screen blocking message is reached via the "status revoked after JWT issuance" path, not via a fresh login attempt by a never-approved teacher. This matches the project's documented dual-gate rationale (project-context.md: "status can change post token issuance") and required no change to `auth.ts`; verified by flipping status on an already-authenticated session rather than via a fresh PENDING login.
- `getTeacherAccountStatus` confirmed to never throw (returns `null` on missing row via `findUnique`, no try/catch needed).
- No regressions to `src/app/register/actions.ts` or `src/lib/auth.ts` — neither file was modified.

### File List

- `src/lib/role-redirect.ts` (new)
- `src/lib/teacher-status.ts` (new)
- `src/app/page.tsx` (modified)
- `src/app/login/page.tsx` (modified)
- `src/app/login/login-form.tsx` (new)
- `src/app/(parent)/layout.tsx` (new)
- `src/app/(parent)/account/page.tsx` (new)
- `src/app/(teacher)/layout.tsx` (new)
- `src/app/(teacher)/classes/page.tsx` (modified — stub text only)
- `src/app/admin/layout.tsx` (new)
- `src/app/admin/page.tsx` (new)
- `src/locales/vi/common.ts` (modified — populated from empty placeholder)
- `prisma/seed.ts` (modified — added dev-only Parent/Teacher/Admin sample account fixtures for role smoke-testing)
- `package.json` (modified — added `db:seed` script)

## Change Log

- 2026-07-10 — Story created via create-story workflow.
- 2026-07-10 — Story implemented: all 9 tasks complete, `pnpm build` clean, manual smoke test passed across all 4 roles/states. Status → review.
- 2026-07-10 — Code review complete: 2 decision-needed resolved, 6 patches applied, 1 patch skipped (documented rationale), 7 findings dismissed as noise/spec-compliant. `pnpm build` clean after fixes. Status → done.
