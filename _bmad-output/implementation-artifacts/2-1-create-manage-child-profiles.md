---
baseline_commit: cc50fc2
---

# Story 2.1: Create & Manage Child Profiles

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to create Child Profiles with a name and Grade Band and manage them (rename, change grade, delete),
so that I can set up a personalized practice account for each of my children.

## Acceptance Criteria

1. **Given** I am authenticated as a PARENT and on the Profiles page (`/profiles`), **When** I tap "Thêm hồ sơ" and submit a display name and Grade Band (Grade 1, 2, or 3), **Then** a `ChildProfile` record is created linked to my `ParentAccount` and appears in my profile list immediately.
2. **Given** I have an existing Child Profile, **When** I rename it or change its Grade Band, **Then** the change is reflected immediately; historical Session data for the profile is not affected (no Session/SessionAnswer/ClassMembership rows are touched by this story — none exist to touch yet, Epic 3+).
3. **Given** I delete a Child Profile, **When** the deletion is confirmed via a confirmation dialog, **Then** the profile is removed from the list immediately and a toast shows "Hồ sơ đã được xóa. Lịch sử sẽ được giữ 30 ngày." **And** the underlying DB record is soft-deleted (`deletedAt` set — retained for 30 days before hard deletion, per FR-11; hard-delete job is out of scope for this story).
4. **Given** I have 5 or more existing Child Profiles, **When** I attempt to create another, **Then** the system allows it (no cap enforced in v1, per PRD assumption A-2).
5. **And** the `child-profile-switcher` component renders in the parent shell header showing the active profile's name and grade with a chevron; tapping it opens a Sheet listing all profiles plus "Thêm hồ sơ." (Selecting a profile in the Sheet to *switch* the active profile is Story 2.2's scope — this story only needs the Sheet to list profiles and launch profile creation; do not implement cookie-setting here.)
6. **And** all server actions begin with a session check returning `{ error: { code: 'UNAUTHORIZED' } }` if no PARENT session is present (NFR-10).
7. **And** all form inputs have associated `<label>` elements; error messages are linked via `aria-describedby`.

## Tasks / Subtasks

- [x] **Task 1: Install required shadcn/ui components** (AC: #1, #2, #3, #5)
  - [x] 1.1 — `src/components/ui/` is currently empty (only `.gitkeep`) — this is the first story to add any shadcn component. Run `pnpm dlx shadcn@latest add sheet dialog alert-dialog select input label button card sonner` (or the project's configured shadcn CLI — see `components.json`, style `base-nova`, baseColor `neutral`). Do not hand-roll any of these primitives.
  - [x] 1.2 — `sonner` (shadcn's toast component) is needed for AC #3's toast; add a `<Toaster />` to `src/app/layout.tsx` if the CLI doesn't already wire it in — check `src/app/layout.tsx` first before adding, do not duplicate.
  - [x] 1.3 — After install, confirm `pnpm build` still compiles cleanly before writing any feature code — isolates CLI-generated code from your own bugs later.

- [x] **Task 2: Child Profile repository** (AC: #1, #2, #3, #4)
  - [x] 2.1 — Create `src/infrastructure/repositories/child-profile-repository.ts` (first repository file in the project — `src/infrastructure/repositories/` currently only has `.gitkeep`). Export:
    - `listChildProfiles(parentAccountId: string): Promise<ChildProfile[]>` — `db.childProfile.findMany({ where: { parentAccountId, deletedAt: null }, orderBy: { createdAt: 'asc' } })`.
    - `createChildProfile(parentAccountId: string, name: string, gradeBand: GradeBand): Promise<ChildProfile>`.
    - `updateChildProfile(id: string, parentAccountId: string, data: { name?: string; gradeBand?: GradeBand }): Promise<ChildProfile | null>` — scope the `where` to both `id` AND `parentAccountId` so a parent can never update another parent's profile via a guessed ID; return `null` if no matching row (Prisma `updateMany` + re-fetch, or catch the not-found case — do not trust a bare `update` with only `id` in `where`).
    - `softDeleteChildProfile(id: string, parentAccountId: string): Promise<ChildProfile | null>` — same ownership-scoped `where` pattern, sets `deletedAt: new Date()`.
  - [x] 2.2 — Import `GradeBand` and `ChildProfile` types from `@prisma/client` here (Infrastructure layer is allowed to import `@prisma/client` per AD-2) — do not redefine these types elsewhere.
  - [x] 2.3 — No business logic in this file (AD-2) — it's pure Prisma queries scoped by ownership. Rename/grade-change/delete each get exactly one thin query function; do not add validation logic here (that belongs in the server action, Task 3).

- [x] **Task 3: Server actions for Child Profile CRUD** (AC: #1, #2, #3, #4, #6, #7)
  - [x] 3.1 — Create `src/app/(parent)/profiles/actions.ts` with `'use server'` at the top (follows the existing `src/app/register/actions.ts` pattern — Zod schema, typed `{ data: T } | { error: { code, message } }` return, no throws).
  - [x] 3.2 — Every action starts: `const session = await auth(); if (!session?.user || session.user.role !== 'PARENT') return { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }`. Then resolve `parentAccountId` via `db.parentAccount.findUnique({ where: { userId: session.user.id } })` — there is no `parentAccountId` on the session/JWT (confirmed in `src/types/next-auth.d.ts`: only `id`, `role`, `email`), so every action must look it up from `session.user.id`.
  - [x] 3.3 — `createChildProfileAction(input: { name: string; gradeBand: 'GRADE_1' | 'GRADE_2' | 'GRADE_3' })`: Zod-validate `name` (non-empty, reasonable max length e.g. 50) and `gradeBand` (enum). Call `createChildProfile`. Return `{ data: { childProfile } } | { error }`.
  - [x] 3.4 — `updateChildProfileAction(input: { id: string; name?: string; gradeBand?: GradeBand })`: validate at least one field present. Call `updateChildProfile`; if it returns `null` (not found / not owned), return `{ error: { code: 'NOT_FOUND', message: '...' } }`.
  - [x] 3.5 — `deleteChildProfileAction(input: { id: string })`: call `softDeleteChildProfile`; if `null`, return `{ error: { code: 'NOT_FOUND', message: '...' } }`.
  - [x] 3.6 — `listChildProfilesAction()`: resolves `parentAccountId` then calls `listChildProfiles`. Used by the client components (Task 4) that need fresh data after a mutation, and by the `child-profile-switcher` (Task 5).
  - [x] 3.7 — After every mutation (`create`/`update`/`delete`), call Next.js `revalidatePath('/profiles')` (and `revalidatePath('/dashboard')` since the switcher renders in the shared parent layout) so the server-rendered list and the switcher reflect changes without a manual client refetch.

- [x] **Task 4: Profiles page UI** (AC: #1, #2, #3, #4, #7)
  - [x] 4.1 — Rewrite `src/app/(parent)/profiles/page.tsx` (currently a one-line stub `"Parent profiles — coming soon"`) as an `async` Server Component: fetch the profile list server-side (reuse the same resolve-`parentAccountId`-then-`listChildProfiles` logic as Task 3.6 — either call the repository directly here, since Server Components may call repositories/data access directly, or call the server action; be consistent with how `src/app/(parent)/dashboard/page.tsx` currently fetches, if it fetches anything yet — check it first).
  - [x] 4.2 — Render each profile as a row/card: name, grade band label (Vietnamese — "Lớp 1"/"Lớp 2"/"Lớp 3", from locale file per Task 6), rename and delete affordances (icon buttons are acceptable here since this is an adult surface, unlike the student surface's icon+text rule).
  - [x] 4.3 — "Thêm hồ sơ" button opens a `Dialog` (shadcn, from Task 1) with a form: `Input` for name (`<Label htmlFor>` required), `Select` for Grade Band (3 options). On submit, call `createChildProfileAction` (`'use client'` form component calling the server action directly — same pattern as `login-form.tsx`). Show inline validation errors linked via `aria-describedby`; on success, close the dialog (the `revalidatePath` from Task 3.7 refreshes the list — no manual state sync needed since the page is a Server Component).
  - [x] 4.4 — Rename / change-grade-band: same `Dialog` + form pattern, pre-filled with the profile's current `name`/`gradeBand`, calling `updateChildProfileAction`.
  - [x] 4.5 — Delete: `AlertDialog` (shadcn) confirmation — "Xóa hồ sơ [name]? Lịch sử sẽ được giữ 30 ngày." with Cancel/Confirm. On confirm, call `deleteChildProfileAction`; on success, show a `sonner` toast: "Hồ sơ đã được xóa. Lịch sử sẽ được giữ 30 ngày." (AC #3's exact wording).
  - [x] 4.6 — All new client components split into their own `'use client'` files under `src/components/parent/` (currently only `.gitkeep`) — e.g. `child-profile-form.tsx`, `child-profile-list.tsx`, `delete-child-profile-dialog.tsx`. The Server Component page (`page.tsx`) stays a thin data-fetch + composition layer; it must not import from `src/domain/` or `src/infrastructure/` — only from `src/components/parent/` and its own `actions.ts` re-exports if needed (Presentation may only reach Infrastructure via server actions, per AD-2).

- [x] **Task 5: `child-profile-switcher` component in parent shell** (AC: #5)
  - [x] 5.1 — Create `src/components/parent/child-profile-switcher.tsx` (`'use client'`, or a Server Component wrapper + client `Sheet` trigger — the trigger/open-state needs client interactivity, but the initial profile list can be passed as a prop from a server-rendered parent). Renders: active profile's name + grade band + a chevron icon, styled `rounded-brand-sm` (adult-surface radius per UX-DR3 — this is a parent-surface component, do not use `rounded-brand-lg/xl`).
  - [x] 5.2 — Tapping it opens a `Sheet` (shadcn) listing all Child Profiles (name + grade) plus a "Thêm hồ sơ" action at the bottom that opens the same creation `Dialog` from Task 4.3 (reuse the component, don't duplicate the form).
  - [x] 5.3 — **Scope boundary — do not implement in this story:** tapping a profile row in the Sheet to make it the *active* profile (i.e., calling `setChildProfileCookie`) is Story 2.2's job. For this story, profile rows in the Sheet are informational/list-only (or, if you want a natural landing state, treat the first/only profile as "active" for display purposes only — no cookie read/write). Do not import or call `src/lib/child-profile-cookie.ts` from this story's code.
  - [x] 5.4 — Mount `child-profile-switcher` in `src/app/(parent)/layout.tsx`'s header — currently that layout has no header row at all (just the two `<nav>` blocks + `<main>`, confirmed by reading the file). Add a header `<div>` above `<main>` (or inside a shared header region) containing the switcher, without disturbing the existing bottom-tab-bar/sidebar nav markup from Story 1.5. The switcher needs the profile list server-side — fetch it in the layout (`async` Server Component already) and pass as a prop, reusing Task 2's `listChildProfiles` (resolve `parentAccountId` from `session.user.id` the same way Task 3.2 does — the layout already calls `auth()`).
  - [x] 5.5 — If a Parent has zero Child Profiles yet (first-time state), the switcher should show a neutral empty label (e.g. "Chưa có hồ sơ") instead of a name — do not crash on an empty array; there's no AC dictating exact copy for this edge state, use judgment consistent with the parent-surface tone (see project-context.md UX rules).

- [x] **Task 6: Vietnamese locale strings** (AC: #1, #2, #3, #7)
  - [x] 6.1 — Add a new locale file `src/locales/vi/profiles.ts` (do not cram this into `common.ts`, which is reserved for cross-surface strings like nav labels — follow the existing `src/locales/vi/auth.ts` precedent of one file per feature area). Export at minimum: `addProfileCta: 'Thêm hồ sơ'`, `renameCta`, `deleteCta`, `deleteConfirmTitle` (template with name), `deleteConfirmBody: 'Lịch sử sẽ được giữ 30 ngày.'`, `deleteToast: 'Hồ sơ đã được xóa. Lịch sử sẽ được giữ 30 ngày.'` (exact AC #3 wording), `gradeBandLabels: { GRADE_1: 'Lớp 1', GRADE_2: 'Lớp 2', GRADE_3: 'Lớp 3' }`, form labels/placeholders, validation error text.
  - [x] 6.2 — No inline Vietnamese strings in any `.tsx`/`.ts` component file — every string from Task 4/5's UI must import from `src/locales/vi/profiles.ts` (project-wide rule, re-verified as a hard gate in Story 1.5's review).

- [x] **Task 7: Build & manual verification**
  - [x] 7.1 — Run `pnpm build` — zero TypeScript strict-mode errors. No test framework exists in this repo yet (consistent through Stories 1.1–1.5); this remains the verification bar. (Note: a test-framework action item is open from the Epic 1 retrospective, targeted at Epic 3 — not this story's responsibility to resolve.)
  - [x] 7.2 — Manual smoke test via `pnpm dev`: verified `/profiles` unauthenticated correctly 307-redirects to `/login` (session-check gate works, no server error), `/login` renders 200, and the production build (`next build`, task 7.1) statically typechecks and prerenders `/profiles` with zero errors. **Could not complete the full authenticated click-through (create/rename/delete/switcher/cross-account NOT_FOUND)** — this sandbox has no outbound network route to the configured Supabase Postgres instance (`db:seed` fails with `ENOTFOUND` resolving the pooler host), so no authenticated session or DB row could be established here. Flagging this explicitly rather than claiming full verification; a human or an environment with DB connectivity should run the (a)–(h) checklist below before merge.
    - (a) `/profiles` with zero profiles shows an empty state and "Thêm hồ sơ"; (b) create a profile with name + Grade Band → appears in list immediately, no full page reload needed; (c) create a 6th profile (if 5 already exist) → succeeds, no cap error (AC #4); (d) rename a profile and change its Grade Band → reflected immediately; (e) delete a profile → confirmation dialog → confirm → row disappears + toast appears with exact copy; (f) verify in DB (`prisma studio` or a quick query) that the deleted row has `deletedAt` set, not actually removed; (g) confirm the `child-profile-switcher` renders in the parent shell header on every `(parent)/*` page, opens the Sheet, lists profiles, and "Thêm hồ sơ" inside the Sheet opens the same creation dialog; (h) attempt to hit a server action for a `ChildProfile` id belonging to a different Parent Account (if a second seeded parent exists) — confirm `NOT_FOUND`, not a silent cross-account mutation.

### Review Findings

- [x] [Review][Patch] Presentation layer bypasses server actions — `page.tsx`/`layout.tsx` import `db` and the repository directly instead of via `actions.ts`, violating this story's own Architecture Compliance rule and project-context.md's layer rule (AD-2). Fixed: both now call `listChildProfilesAction()`. [src/app/(parent)/profiles/page.tsx, src/app/(parent)/layout.tsx]
- [x] [Review][Patch] Dangling `aria-describedby` on the Grade Band field breaks AC #7 — `gradeBandErrorId` was referenced by the `SelectTrigger` but never rendered as an `id` anywhere in the DOM. Fixed: both inputs and the error `<p>` now share a single `errorId`. [src/components/parent/child-profile-form.tsx]
- [x] [Review][Patch] `revalidatePath` only covered `/profiles` and `/dashboard`, not `/account` or `/subscription`. Fixed: mutations now call `revalidatePath('/profiles', 'layout')`, which revalidates every route sharing the `(parent)` layout. [src/app/(parent)/profiles/actions.ts]
- [x] [Review][Patch] Edit dialog did not reset state on cancel. Fixed: closing in `edit` mode now resets `name`/`gradeBand` back to `props.initialName`/`props.initialGradeBand`. [src/components/parent/child-profile-form.tsx]
- [x] [Review][Patch] TOCTOU race in `updateChildProfile`/`softDeleteChildProfile`. Fixed: both now run inside `db.$transaction(async (tx) => ...)` so the ownership-scoped `updateMany` and the follow-up `findUnique` are atomic. [src/infrastructure/repositories/child-profile-repository.ts]
- [x] [Review][Patch] `layout.tsx` silently fell back to an empty profile list when the `ParentAccount` row was missing, inconsistent with `page.tsx`'s redirect. Fixed: resolved as part of the `listChildProfilesAction()` migration above — both now redirect to `/login` on error. [src/app/(parent)/layout.tsx]

## Dev Notes

### Architecture Compliance

- **Layer rules (AD-2):** `src/app/(parent)/profiles/page.tsx` and `src/components/parent/*` are Presentation — no direct `db`/Prisma imports there. `src/app/(parent)/profiles/actions.ts` is Application (server actions) — the only entry point from Presentation into the repository. `src/infrastructure/repositories/child-profile-repository.ts` is Infrastructure — may import `@prisma/client`, must not contain business logic (there is none needed here; validation lives in the server action via Zod).
- **Server action return shape / session check (NFR-10, Consistency Conventions):** every action in `actions.ts` returns `{ data: T } | { error: { code: string; message: string } }` and never throws; every action starts with the PARENT session check per Task 3.2. This matches `src/app/register/actions.ts` exactly — follow that file's structure (Zod schema → validate → business logic → typed return), not a new pattern.
- **Ownership scoping is the actual security requirement here** (even though this story predates NFR-8's cross-role wording, the same principle applies within one role): every mutation must scope its `where` clause to the requesting Parent's own `parentAccountId`, not just the target `ChildProfile.id`. This is the most likely place for a subtle IDOR-style bug — see Task 2.1's explicit warning.
- **cuid2 IDs, no UUID** — `ChildProfile.id` already uses `@default(cuid())`; nothing to change in the schema for this story. No Prisma migration is needed — `ChildProfile` (with `deletedAt`) already exists in `prisma/schema.prisma` exactly as this story needs it (confirmed by reading the schema — soft-delete field is already present from Story 1.2).

### What this story does NOT touch (scope boundary vs. Story 2.2)

- `src/lib/child-profile-cookie.ts` already exists (built in Story 1.3 as auth infrastructure) but **this story must not call `setChildProfileCookie` or `getChildProfileId`**. Actually *switching* the active profile (writing the cookie) and gating `/(student)/*` routes on it is Story 2.2 ("Child Profile Switch & Student Surface Entry"). This story only builds CRUD + a listing Sheet. Getting this boundary wrong is the single biggest risk of scope creep in this story — see Task 5.3.
- No `(student)/` route changes. No `Session`/`SessionAnswer` reads — those tables have no rows yet (Epic 3 not built) and AC #2's "historical Session data is not affected" is trivially true right now; don't add speculative guards for data that can't exist yet.
- `ClassMembership` is irrelevant here — Epic 5 territory.

### First-of-their-kind additions in this story (no existing pattern to copy for these)

- **First shadcn/ui components installed** (`src/components/ui/` is empty). `components.json` is already configured (`style: base-nova`, `baseColor: neutral`, `rsc: true`) — just run the CLI, don't hand-configure.
- **First repository file** (`src/infrastructure/repositories/` is empty aside from `.gitkeep`). This story's `child-profile-repository.ts` sets the convention for all future repositories (`question-repository.ts`, `session-repository.ts`, etc. in Epic 3) — keep it thin, one file per aggregate, matching the Structural Seed's naming (`child-profile-repository.ts` is the exact filename named in the Architecture Spine's source tree).
- **First components under `src/components/parent/`** (currently only `.gitkeep`).

### Previous Story Intelligence (Story 1.5)

- Session shape: `session.user: { id: string; role: string; email: string }` — no `parentAccountId` field. Every action must derive it via `db.parentAccount.findUnique({ where: { userId: session.user.id } })`, same as how Story 1.3/1.5 code reads `session.user.role` as a plain string (not a typed enum) — compare against literal `'PARENT'`.
- No test framework exists yet — `pnpm build` clean + manual smoke test remains the bar (unchanged since Story 1.1).
- File/directory naming: kebab-case throughout, matching `role-redirect.ts`, `teacher-status.ts`, `login-form.tsx` precedent.
- The `(parent)/layout.tsx` you're modifying (Task 5.4) currently has exactly this structure: a `lg:flex` wrapper, a `hidden lg:flex` sidebar `<nav>`, a `<main className="mx-auto w-full max-w-3xl ...">`, and a `fixed inset-x-0 bottom-0 ... lg:hidden` bottom tab bar — in that order, with no header element. Add the switcher without breaking the existing `lg:hidden`/`hidden lg:flex` breakpoint pattern Story 1.5's review explicitly locked in as authoritative.

### Git Intelligence Summary

- HEAD is `cc50fc2` ("feat(auth): add show/hide password toggle to login form" — a small addendum on top of Story 1.5, unrelated to this story's scope; touches only `login-form.tsx`).
- `src/app/(parent)/profiles/page.tsx` is still the Story 1.1 stub (`"Parent profiles — coming soon"`) — untouched since scaffolding.
- No commits yet add anything under `src/components/parent/`, `src/infrastructure/repositories/`, or `src/components/ui/` — this story is genuinely greenfield for those directories.

### Project Structure Notes

- Files to create: `src/infrastructure/repositories/child-profile-repository.ts`, `src/app/(parent)/profiles/actions.ts`, `src/components/parent/child-profile-form.tsx`, `src/components/parent/child-profile-list.tsx`, `src/components/parent/delete-child-profile-dialog.tsx`, `src/components/parent/child-profile-switcher.tsx`, `src/locales/vi/profiles.ts`, plus whatever `src/components/ui/*.tsx` files the shadcn CLI generates (sheet, dialog, alert-dialog, select, input, label, button, card, sonner, and their transitive deps like `label` → `@radix-ui/react-label`).
- Files to modify: `src/app/(parent)/profiles/page.tsx` (full rewrite from stub), `src/app/(parent)/layout.tsx` (add switcher to header region), `src/app/layout.tsx` (add `<Toaster />` only if not already present — check first), `package.json` (new `@radix-ui/*` deps from the shadcn CLI install).
- No Prisma migration needed — `ChildProfile` schema is already complete for this story's needs.
- No changes to `src/lib/auth.ts`, `src/lib/child-profile-cookie.ts`, `prisma/schema.prisma`, or any `(student)/`, `(teacher)/`, `admin/` route.

### Testing Standards

- No test framework in this repo yet (open action item from Epic 1 retro targets Epic 3, not this story). Verification is `pnpm build` clean + the manual smoke sequence in Task 7.2, explicitly covering the ownership-scoping check (7.2h) since that's the highest-risk correctness gap in CRUD-over-a-single-owner-relation code.

### References

- Story requirements: [epics.md](../planning-artifacts/epics.md) — "Story 2.1: Create & Manage Child Profiles"
- PRD assumptions: `prds/prd-toantuduy-2026-07-08/prd.md` — A-2 (no Child Profile cap), A-12 (5-question minimum before Skill data appears, not used by this story but adjacent)
- Architecture spine (AD-2 layer rules, AD-4 auth, AD-5 cookie — NOT used by this story, Consistency Conventions — server action shape, cuid2, kebab-case): `architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md`
- UX spine (`child-profile-switcher` spec row, UX-DR3 border-radius scoping to adult surfaces): `ux-designs/ux-toantuduy-2026-07-08/DESIGN.md`
- Project context (auth rules, layer rules, code style): [project-context.md](../project-context.md)
- Previous story (parent shell + layout this story extends): [1-5-parent-login-post-auth-parent-shell.md](./1-5-parent-login-post-auth-parent-shell.md)
- Downstream consumer: Story 2.2 (Child Profile Switch & Student Surface Entry) will add the cookie-setting interaction on top of this story's Sheet and repository.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- The shadcn CLI (`base-nova` style) generated components that import from `@base-ui/react/*`, but that package was never added to `package.json`/installed by the CLI — `next build` failed with `Cannot find module '@base-ui/react/alert-dialog'`. Fixed by `pnpm add @base-ui/react` (confirmed it's the real npm package the generated code targets, distinct from `@base-ui-components/react`).
- `pnpm db:seed` / any Prisma query fails in this sandbox with `ENOTFOUND` resolving the Supabase pooler host — no outbound network route to the DB from this environment. This blocked full authenticated manual smoke-testing (see Task 7.2 note). `next build`'s own `prisma migrate deploy` step was skipped for the same reason; `next build` was run directly (schema/migrations are unchanged by this story, so this is safe) and passed with zero TypeScript errors.

### Completion Notes List

- Implemented Child Profile CRUD end-to-end: repository (`child-profile-repository.ts`) → server actions (`actions.ts`, ownership-scoped via `parentAccountId`, session-gated, no-throw `{ data } | { error }` shape) → Presentation (profiles page, create/rename dialog, delete confirmation + toast, and the `child-profile-switcher` mounted in the parent shell header).
- All shadcn/ui primitives (sheet, dialog, alert-dialog, select, input, label, button, card, sonner) installed via CLI; `<Toaster />` wired into the root layout.
- All UI strings sourced from the new `src/locales/vi/profiles.ts` locale file — no inline Vietnamese text.
- Scope boundary respected: the switcher's Sheet lists profiles and launches profile creation only — no cookie read/write, no import of `src/lib/child-profile-cookie.ts` (Story 2.2's responsibility).
- `pnpm build` (`next build`) passes with zero TypeScript strict-mode errors and prerenders `/profiles` successfully.
- **Verification gap (environment limitation, not a code defect):** this sandbox cannot reach the configured Supabase database (DNS resolution fails for the pooler host), so the full authenticated manual smoke sequence (Task 7.2 items a–h: create/rename/delete/cap/switcher/cross-account NOT_FOUND) could not be executed here. What *was* verified: unauthenticated `/profiles` correctly 307-redirects to `/login` (proves the session-check gate runs without throwing), `/login` returns 200, and the production build's static type-checking + prerendering passes clean. Recommend running the full Task 7.2 checklist in an environment with DB connectivity before merging.

### File List

**Created:**
- `src/infrastructure/repositories/child-profile-repository.ts`
- `src/app/(parent)/profiles/actions.ts`
- `src/components/parent/child-profile-form.tsx`
- `src/components/parent/child-profile-list.tsx`
- `src/components/parent/delete-child-profile-dialog.tsx`
- `src/components/parent/child-profile-switcher.tsx`
- `src/locales/vi/profiles.ts`
- `src/components/ui/sheet.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/sonner.tsx`

**Modified:**
- `src/app/(parent)/profiles/page.tsx` (full rewrite from stub)
- `src/app/(parent)/layout.tsx` (added header row mounting `ChildProfileSwitcher`)
- `src/app/layout.tsx` (added `<Toaster />`)
- `package.json` / `pnpm-lock.yaml` (new deps from shadcn CLI install + `@base-ui/react`, `next-themes`, `sonner`, etc.)

## Change Log

- 2026-07-18: Implemented Story 2.1 — Child Profile CRUD (repository, server actions, profiles page, create/rename/delete UI, `child-profile-switcher` in parent shell header), first shadcn/ui components and first `src/components/parent/`/`src/infrastructure/repositories/` files in the project. Status moved to `review`.
