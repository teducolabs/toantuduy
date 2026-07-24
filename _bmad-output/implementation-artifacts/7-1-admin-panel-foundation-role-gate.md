---
baseline_commit: 803ad525962f9e353b8d2e2be0b071a3c5a52731
---

# Story 7.1: Admin Panel Foundation & Role Gate

Status: review

## Story

As a developer,
I want the `/admin/` route group fully secured with a server-side ADMIN role gate and a working shell,
So that no non-admin user can ever access admin functionality regardless of URL knowledge.

## Acceptance Criteria

1. **Given** I am authenticated as an ADMIN and navigate to `/admin/`, **when** the admin shell loads, **then** I see the admin panel with top navigation bar and links to: Teacher Approvals, Session Config, Question Library.
2. **Given** any request reaches any `/admin/` route or server action, **when** the layout or action runs server-side, **then** `session.user.role === 'ADMIN'` is verified; any other role returns a 403 redirect to `/login` (AD-10).
3. The admin shell renders as a single-column `max-w-2xl` layout (UX-DR12).
4. All admin server actions return `{ data: T } | { error: { code: string; message: string } }` — never throw.

## Tasks / Subtasks

- [x] Task 1: Upgrade `src/app/admin/layout.tsx` into the admin shell (AC: #1, #2, #3)
  - [x] Keep the existing server-side gate exactly as-is: `const session = await auth(); if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')` — it already satisfies AC #2 for routes. Do NOT weaken it and do NOT move it to middleware (route protection in this project is per-layout, never middleware — `src/middleware.ts` only validates the child-profile cookie).
  - [x] Add a **top navigation bar** (horizontal header, NOT a sidebar — this differs from teacher/parent shells) containing: brand/heading, the three nav links, and sign-out. Nav items (hrefs are absolute — `admin/` is a plain segment, not a route group):
    - `/admin/teachers` → `admin.navTeachers` ("Duyệt giáo viên")
    - `/admin/config` → `admin.navConfig` ("Cấu hình buổi học")
    - `/admin/questions` → `admin.navQuestions` ("Thư viện câu hỏi")
  - [x] Use lucide-react icons `size-5 shrink-0` with `aria-hidden="true"`, link classes following the established idiom: `rounded-brand-md px-3 py-2 text-body hover:bg-accent`, min touch target `min-h-11`.
  - [x] Sign-out: reuse `signOutAction` from `@/lib/auth-actions` via `<form action={signOutAction}>` with `common.signOut` label — copy the teacher layout pattern verbatim.
  - [x] Content container: `<main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>` — single column, `max-w-2xl` (AC #3, UX-DR12). Header bar border idiom: `border-b border-gray-200 px-4 py-3`.
- [x] Task 2: Create `src/locales/vi/admin.ts` (AC: #1)
  - [x] New locale file exporting `export const admin = { ... }` following the exact pattern of `src/locales/vi/common.ts`. Keys needed now: `navTeachers`, `navConfig`, `navQuestions`, `title` ("Bảng quản trị"), plus a landing-page heading/description. NO inline Vietnamese in any component code.
- [x] Task 3: Replace the `/admin` landing page stub (AC: #1, #3)
  - [x] Rewrite `src/app/admin/page.tsx` (currently `<main>Admin Panel — coming soon</main>` with English text — must go): render an admin home with heading from `admin.title` and card/link entries to the three sections (these can duplicate the nav links as larger tap targets). Adult-surface styling: `rounded-brand-md` cards, `shadow-sm` optional, `text-heading` for section headers. Leave `admin/teachers/page.tsx`, `admin/config/page.tsx`, `admin/questions/page.tsx` stubs in place (Stories 7.2–7.4 replace them) — but if their placeholder text is user-visible English, switch those single lines to locale strings via `admin.ts` placeholders.
- [x] Task 4: Establish the `requireAdmin()` server-action guard (AC: #2, #4)
  - [x] Create `src/app/admin/actions.ts` (`'use server'`) exporting `requireAdmin(): Promise<{ userId: string } | { error: { code: string; message: string } }>` — mirrors `requireTeacherAccountId` in `src/app/(teacher)/classes/actions.ts`: `auth()` → if `!session?.user || session.user.role !== 'ADMIN'` return `{ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }` else `{ data: ... }`-compatible shape. Stories 7.2/7.3/7.4 will import this guard — it is the single admin authorization entry point for actions. Note: files with `'use server'` may only export async functions — if you prefer, place the guard in `src/app/admin/require-admin.ts` WITHOUT the directive and import it from future actions files; pick whichever matches how `requireTeacherAccountId` is housed today (it lives inside an actions file — follow that precedent).
  - [x] Server actions never redirect and never throw — errors are returned (AC #4). Redirects are for layouts/pages only.
- [x] Task 5: Tests (co-located Vitest, follow `src/app/(teacher)/classes/actions.test.ts` mocking pattern)
  - [x] `requireAdmin` guard tests: no session → UNAUTHORIZED; role PARENT → UNAUTHORIZED; role TEACHER → UNAUTHORIZED; role ADMIN → success. Mock `@/lib/auth` with `vi.mock` and `authMock.mockResolvedValue({ user: { id, role } })`.
  - [x] Optional but preferred: a small pure helper for nav items if extracted; otherwise layout gate behavior is covered by the guard tests + existing convention (layouts are not unit-tested in this repo).
- [x] Task 6: Full gate before marking review
  - [x] `npx vitest run` (all existing 351+ tests must stay green), `npx tsc --noEmit`, `npx eslint` on changed files, `npx next build`.
  - [x] Manual verification note for Toan: log in as seeded admin (`admin@example.test` / `Password123!`, seed via `npm run db:seed`), confirm `/admin` shows the shell; log in as parent/teacher and confirm `/admin` redirects to `/login`. (Epic 2 retro action item: manual browser pass before done.)

## Dev Notes

### CRITICAL — current state of files being modified

- **`src/app/admin/layout.tsx` ALREADY EXISTS** with a correct ADMIN gate (session check + `redirect('/login')`). This story does NOT create the gate from scratch — it adds the shell around it. Preserve the gate logic byte-for-byte in behavior.
- **`src/app/admin/page.tsx`, `admin/teachers/page.tsx`, `admin/config/page.tsx`, `admin/questions/page.tsx` ALREADY EXIST** as "coming soon" stubs. `/admin` is a plain route segment (URL prefix `/admin`), NOT a `(admin)` route group. Do not restructure it into a route group — sibling stories 7.2–7.4 assume `/admin/*` URLs.
- There is no `AdminAccount` model. ADMIN is just `User.role = 'ADMIN'` (Prisma `enum Role { PARENT TEACHER ADMIN }`). Unlike the teacher gate (AD-6 dual check with fresh DB status read), the admin gate needs ONLY the role check — there is no admin "status" to re-verify. Do not invent one.

### Architecture compliance (AD-10 + conventions)

- Every `/admin/*` layout and server action verifies `session.user.role === 'ADMIN'` server-side; other roles → `redirect('/login')` in layouts, `{ error: { code: 'UNAUTHORIZED' } }` in actions. Client-side session data is display-only — never gate on it. [Source: ARCHITECTURE-SPINE.md#AD-10, AD-4]
- Layer rules: presentation (`src/app/admin/**`, components) must not import from `src/domain/` or `src/infrastructure/` directly; server actions are the only entry into business logic. This story needs no domain/infrastructure code at all.
- Server action return shape (no exceptions): `{ data: T } | { error: { code: string; message: string } }`. Never throw, never redirect from an action.
- `src/lib/role-redirect.ts` already maps `ADMIN → /admin` for post-login routing — no change needed there; do not duplicate that mapping.

### Reuse — do NOT reinvent

- Gate + redirect pattern: copy `src/app/(teacher)/layout.tsx` and `src/app/(parent)/layout.tsx` idioms (they are the canonical shells). Key difference: admin uses a **top nav bar** (single column), not a sidebar.
- `signOutAction` exists in `@/lib/auth-actions` — reuse.
- `auth()` from `@/lib/auth` is the only session accessor.
- Locale consumption: `import { admin } from '@/locales/vi/admin'` — same as `common.ts` pattern.
- Guard precedent: `requireTeacherAccountId` in `src/app/(teacher)/classes/actions.ts`.

### UX requirements

- Admin Panel: single-column `max-w-2xl` (UX-DR12). Adult surface = shadcn vocabulary, orange as accent only; no mascot, no student tokens. [Source: DESIGN.md "Adult surface layout rules"]
- Admin form fields (future stories) use `rounded-brand-sm` (8px); cards `rounded-brand-md` (12px); `shadow-sm` for active content cards only.
- Fonts: `text-heading` (Be Vietnam Pro 700/20px) for section headers, `text-body` for links/labels — tokens already configured.
- UX-DR16 state patterns (empty queue, offline toast, save error) belong to Stories 7.2/7.3 — do not build them here, but don't preclude them (e.g., keep the shell free of assumptions that pages are always online/success).

### Testing

- Vitest 4.x, co-located `*.test.ts` next to source, `npm run test` / `npx vitest run`. Mock `@/lib/auth` and (if needed) `next/navigation` with `vi.mock`. Environment `node`; `@` alias → `./src`.
- Baseline: 351 tests green as of Story 6.4 — zero regressions allowed.

### Previous story intelligence (Story 6.4, 2026-07-24)

- Full-gate discipline (vitest + tsc + eslint + next build) is the accepted definition of done; record results in Debug Log.
- `text-subheading` is NOT a project utility class — use `font-semibold` idiom for sub-headings.
- Locale keys are appended to locale files verbatim from the story; components never inline Vietnamese.
- Manual QA gap flagging convention: anything requiring a live browser (login flows, redirects as experienced by a user) gets an explicit "needs manual pass by Toan" note instead of a false "verified" claim.

### Project structure notes

- New files: `src/locales/vi/admin.ts`; admin guard (in `src/app/admin/actions.ts` or alongside per Task 4). Modified: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx` (+ possibly the three stub pages' text). Everything kebab-case.
- No schema changes, no migrations, no new dependencies, no env vars. If you find yourself adding any of these, stop — you've exceeded scope.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1] — story + ACs
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-10, #AD-4, #AD-2, Consistency Conventions]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md#Adult surface layout rules, #Radius tokens]
- [Source: _bmad-output/project-context.md — layer rules, auth rules, code style]
- [Source: _bmad-output/implementation-artifacts/6-4-subscription-management.md#Dev Agent Record]
- Existing code: `src/app/admin/layout.tsx`, `src/app/(teacher)/layout.tsx`, `src/app/(parent)/layout.tsx`, `src/app/(teacher)/classes/actions.ts`, `src/lib/auth.ts`, `src/lib/role-redirect.ts`, `prisma/seed.ts` (seedAdmin)

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5)

### Debug Log References

- RED: `npx vitest run src/app/admin/actions.test.ts` failed with "Cannot find module './actions'" before implementation (5 tests written first).
- GREEN: same command → 5/5 passed after creating `src/app/admin/actions.ts`.
- Full suite: `npx vitest run` → 35 files, 356 tests passed (baseline 351 + 5 new, zero regressions).
- `npx tsc --noEmit` → clean, no output.
- `npx eslint` on all 8 changed files → exit 0, no errors or warnings.
- `npx next build` → exit 0, compiled successfully; `/admin`, `/admin/teachers`, `/admin/config`, `/admin/questions` all present as dynamic routes. Only pre-existing warnings: `no-img-element` in `src/components/student/mascot.tsx` and `question-card.tsx` (untouched by this story).
- Note: vitest/tsc/eslint/build must run outside the CLI sandbox on this machine (sandboxed runs hang with no output).

### Completion Notes List

- Task 1: `src/app/admin/layout.tsx` upgraded to the admin shell. The existing ADMIN gate (`auth()` → role check → `redirect('/login')`) preserved byte-for-byte in behavior; added a horizontal top nav header (brand link to `/admin`, three nav links with lucide icons `UserCheck`/`Settings`/`Library` at `size-5 shrink-0 aria-hidden`, sign-out via `<form action={signOutAction}>` copied from the teacher layout). Content container is `mx-auto w-full max-w-2xl flex-1 px-4 py-6` (UX-DR12), header border `border-b border-gray-200 px-4 py-3`, links `rounded-brand-md px-3 py-2 text-body hover:bg-accent min-h-11`.
- Task 2: `src/locales/vi/admin.ts` created following the `common.ts` pattern — nav labels, title "Bảng quản trị", home description, per-section card descriptions, and coming-soon placeholders for the three stub pages. No inline Vietnamese anywhere in components.
- Task 3: `/admin` landing page rewritten — heading from `admin.title`, description, and three `rounded-brand-md` card links (larger tap targets duplicating the nav). The three sibling stubs (`teachers`, `config`, `questions`) kept as stubs but their user-visible English replaced with locale strings; their `<main>` wrappers removed since the layout now owns `<main>`.
- Task 4: `requireAdmin()` created in `src/app/admin/actions.ts` (`'use server'`, matching the `requireTeacherAccountId` precedent of living inside an actions file). Returns `{ userId }` or `{ error: { code: 'UNAUTHORIZED', message } }` — never throws, never redirects. Role-only check per AD-10 (no admin status re-read — none exists).
- Task 5: 5 co-located Vitest tests in `src/app/admin/actions.test.ts` (mock `@/lib/auth` via `vi.mock`): ADMIN → `{ userId }`; no session, empty session, PARENT, TEACHER → UNAUTHORIZED. Layouts are not unit-tested per repo convention; no nav helper extraction was needed.
- NEEDS MANUAL PASS BY TOAN (Epic 2 retro convention — not claiming browser verification): seed via `npm run db:seed`, log in as `admin@example.test` / `Password123!` → `/admin` shows shell with top nav; log in as parent/teacher → `/admin` redirects to `/login`.

### File List

- src/app/admin/layout.tsx (modified)
- src/app/admin/page.tsx (modified)
- src/app/admin/teachers/page.tsx (modified)
- src/app/admin/config/page.tsx (modified)
- src/app/admin/questions/page.tsx (modified)
- src/app/admin/actions.ts (new)
- src/app/admin/actions.test.ts (new)
- src/locales/vi/admin.ts (new)
- _bmad-output/implementation-artifacts/7-1-admin-panel-foundation-role-gate.md (modified — story tracking)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified — status tracking)

## Change Log

- 2026-07-24: Implemented via dev-story workflow (Claude Fable 5). Admin shell with top nav bar + preserved role gate in `layout.tsx`; new `admin.ts` locale; landing page with section cards; localized the three stub pages; `requireAdmin()` guard in `src/app/admin/actions.ts` with 5 co-located Vitest tests (TDD red→green). Full gate green: 356/356 tests, tsc clean, eslint clean, next build success. Manual browser pass (admin login → shell; parent/teacher → redirect) flagged for Toan. Status: review.
- 2026-07-24: Story created via create-story workflow (ultimate context engine analysis: epics Epic 7 + ARCHITECTURE-SPINE AD-10/AD-4 + DESIGN.md admin layout rules + project-context + full codebase survey + Story 6.4 intelligence + git history). Key findings baked in: `/admin` skeleton with gate already exists (story adds shell/locale/guard, not the gate); admin gate is role-only (no status re-check unlike teacher); top nav bar not sidebar; `max-w-2xl`; `requireAdmin()` guard to be the shared entry point for 7.2–7.4. Status: ready-for-dev.
