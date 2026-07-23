---
baseline_commit: 51921c2461b54bdcfc06bed5750168a80cf7e340
---

# Story 5.3: Teacher Portal Shell & Class Management

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an approved teacher,
I want to create and manage Classes with join codes so parents can enroll their children,
so that I have a roster of students to assign practice sets to.

## Acceptance Criteria

1. **Given** I am an APPROVED Teacher and log in, **when** I reach `/(teacher)/`, **then** the teacher portal shell renders with sidebar navigation (collapsed icon-only at ≤ md, expanded at ≥ lg, per UX-DR12). **And** every `/(teacher)/` layout and server action verifies both `session.user.role === 'TEACHER'` AND `TeacherAccount.status === 'APPROVED'` server-side — the JWT role alone is insufficient (AD-6).
2. **Given** I have no Classes yet, **when** the portal home renders, **then** an empty state shows: "Tạo lớp học đầu tiên để bắt đầu." with a single primary CTA (UX-DR15).
3. **Given** I create a Class (name + grade), **when** creation succeeds, **then** a `Class` record is created with a unique system-generated join code; a `class-card` appears on the portal home.
4. **Given** I view a Class detail with no students enrolled, **when** the detail renders, **then** the `join-code-display` shows the join code prominently with a copy-to-clipboard button; "Lớp chưa có học sinh. Chia sẻ mã tham gia để thêm học sinh." is shown (UX-DR15). **And** clicking the copy button copies the code to clipboard and changes the button label to "Đã sao chép ✓" for 2 seconds (UX-DR19).
5. **Given** a Parent Account uses a valid join code, **when** they submit it via `/(parent)/profiles` (join class flow), **then** a `ClassMembership` record is created linking the `ChildProfile` to the `Class`. **And** a Child Profile can be in at most one Class per Teacher Account (A-5).
6. **And** all Class server actions verify `TeacherAccount.status === 'APPROVED'` server-side (AD-6).

## Tasks / Subtasks

- [x] Task 1: Teacher portal shell — nav chrome in `(teacher)/layout.tsx` (AC: #1)
  - [x] 1.1 **Read `src/app/(teacher)/layout.tsx` first — it already exists** (Story 1.5/5.1). It already does the full AD-6 dual gate: `auth()` → reject non-TEACHER → `getTeacherAccountStatus(session.user.id)` → renders the full-screen `common.teacherPendingApproval` message when status ≠ APPROVED. **Preserve both checks exactly** — this story only adds nav chrome around `{children}` for the APPROVED branch. Do NOT weaken, reorder, or remove the status check.
  - [x] 1.2 Mirror the structure of `src/app/(parent)/layout.tsx` (read it — it is the direct template): server component, `NAV_ITEMS` array from locale constants, desktop sidebar, `<form action={signOutAction}>` sign-out button (reuse `signOutAction` from `src/lib/auth-actions.ts` — it is teacher-safe: deleting a nonexistent child-profile cookie is a no-op), `<main>` content wrapper. Teacher differences per UX-DR12: content wrapper is **`max-w-4xl`** (parent is `max-w-3xl`); responsive behavior is a **collapsed icon-only sidebar below `lg` and an expanded sidebar (icon + label) at `lg:` and up** — NOT the parent's bottom tab bar. Implementation: one `<nav>` that renders icon-only (fixed narrow width, e.g. `w-14`) by default and icon+label (`lg:w-56`) at `lg:`, with each link carrying a visible label wrapped in `hidden lg:inline` plus `aria-label` so the icon-only state stays accessible (UX-DR17: never icon-only without an accessible name; 44×44px minimum touch targets).
  - [x] 1.3 Nav items (use `lucide-react` icons, already a dependency): Lớp học → `/classes`, Bài tập → `/assignments`, Báo cáo → `/reports`. Labels come from new `common.teacherNav*` constants in `src/locales/vi/common.ts` (mirror the existing `parentNav*` naming). Note `src/lib/role-redirect.ts` already maps `TEACHER → '/classes'` — `/classes` IS the portal home; do not create a separate `/(teacher)/page.tsx` index route.
  - [x] 1.4 Adult-surface design tokens: `rounded-brand-sm`/`rounded-brand-md` radii, restrained brand orange `#F97316` only on primary actions/active nav state, Be Vietnam Pro (default), no mascot, no student styling.

- [x] Task 2: Class repository (AC: #3, #4, #5)
  - [x] 2.1 Create `src/infrastructure/repositories/class-repository.ts` following the exact pattern of `src/infrastructure/repositories/child-profile-repository.ts` (read it first): bare exported async functions, `import { db } from '@/lib/db'`, types from `@prisma/client`. **The `Class` and `ClassMembership` models already exist in `prisma/schema.prisma` — NO schema changes and NO migration in this story.** `Class` has `joinCode String @unique`; `ClassMembership` has denormalized `teacherAccountId` and `@@unique([teacherAccountId, childProfileId])` which enforces A-5 at the DB level.
  - [x] 2.2 Functions needed (shape to actual usage, roughly): `listClassesForTeacher(teacherAccountId)` — ordered by `createdAt asc`, include `_count.memberships` (class-card shows student count); `createClass(teacherAccountId, name, gradeBand, joinCode)`; `getClassDetail(classId, teacherAccountId)` — scoped by owner, include memberships with `childProfile` (display name + gradeBand) filtered to `childProfile.deletedAt: null`; `findClassByJoinCode(joinCode)`; `createClassMembership(classId, childProfileId, teacherAccountId)`. Every teacher-side read/write is scoped by `teacherAccountId` in the `where` clause — ownership enforcement lives in the query, not in an afterthought check (same pattern as `updateChildProfile`'s scoped `updateMany`).
  - [x] 2.3 Join code generation: create a pure helper `generateJoinCode()` (put it in `src/lib/join-code.ts` so it's trivially unit-testable). 6 characters from an unambiguous uppercase alphabet (exclude `0/O/1/I/L`), e.g. `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, using Node's `crypto.randomInt` — NOT `Math.random` (predictable codes are guessable enrollment tokens). Do NOT install nanoid — no new dependencies are needed. On create, handle the rare `joinCode` unique collision by retrying generation a few times (catch Prisma `P2002` with `joinCode` in `meta.target`, regenerate, retry; give up after ~5 attempts with an error result). Store and compare codes uppercase; normalize user input with `.trim().toUpperCase()` at the action layer.

- [x] Task 3: Teacher class server actions (AC: #1, #2, #3, #6)
  - [x] 3.1 Create `src/app/(teacher)/classes/actions.ts` mirroring `src/app/(parent)/profiles/actions.ts` (read it first). Export a `requireTeacherAccountId()` guard: `auth()` → `role === 'TEACHER'` check → `db.teacherAccount.findUnique({ where: { userId } })` → **`status === 'APPROVED'` check** (AD-6 / AC #6 — the guard must check status, not just existence) → return `{ teacherAccountId }` or `{ error: { code: 'UNAUTHORIZED', message: ... } }`. Every action in this file starts with this guard. Never throw; always return `{ data: T } | { error: { code, message } }`.
  - [x] 3.2 `createClassAction({ name, gradeBand })`: guard → zod `safeParse` (name: trim, min 1, max ~50; gradeBand: `z.enum(['GRADE_1','GRADE_2','GRADE_3'])` — zod v4 is installed, same enum usage as profiles) → generate join code → `createClass` with collision retry → `revalidatePath('/classes')` → `{ data: { class } }`.
  - [x] 3.3 `getClassesAction()` / `getClassDetailAction({ classId })` for the pages (or fetch directly in the Server Component pages via the repository — but per layer rules Presentation must not import Infrastructure, so pages being Server Components should call the actions or a server-only data function in the actions file; follow the dashboard precedent: `src/app/(parent)/dashboard/actions.ts` exposes a data-fetch action the page awaits). Class detail returns class + join code + enrolled students (child profile display names); non-owned/unknown `classId` returns `{ error: { code: 'NOT_FOUND' } }` (ownership scoped in the repository query — a teacher must never be able to read another teacher's class by guessing an id).

- [x] Task 4: Portal home `/classes` — class list + empty state (AC: #2, #3)
  - [x] 4.1 Replace the stub `src/app/(teacher)/classes/page.tsx` (currently "Teacher Portal — coming soon"). Server Component: fetch classes for the teacher; if none, render the empty state "Tạo lớp học đầu tiên để bắt đầu." with a **single primary CTA** that opens the create-class dialog (UX-DR15 — nothing else on the page in this state).
  - [x] 4.2 `class-card` component (`src/components/teacher/class-card.tsx`, per UX-DR11 / DESIGN.md): shadcn `Card`, `rounded-brand-md` (12px), showing class name, grade (reuse `profiles.gradeBandLabels` for "Lớp 1/2/3" strings — do not duplicate them), student count, and assignment status pill — for this story the assignment pill always renders "Chưa có bài tập" (AssignmentSets arrive in 5.4; keep the pill text in the locale file so 5.4 only swaps the data source). Whole card links to `/classes/[classId]`.
  - [x] 4.3 Create-class form: client component (`src/components/teacher/create-class-dialog.tsx` or similar) using the shadcn `Dialog` + `Input` + `Select` primitives already in `src/components/ui/` — mirror `src/components/parent/child-profile-form.tsx` (name + GradeBand select is literally the same form shape). Every input has an associated `<label>`; errors wired via `aria-describedby` (UX-DR17). On success close dialog; new card appears via `revalidatePath`.

- [x] Task 5: Class detail `/classes/[classId]` — join code + roster (AC: #4)
  - [x] 5.1 New route `src/app/(teacher)/classes/[classId]/page.tsx`. Server Component: fetch class detail (ownership-scoped); `notFound()` or redirect to `/classes` on `NOT_FOUND`. Shows class name + grade, the `join-code-display`, and the student roster (display names from enrolled `ChildProfile`s). With zero students: "Lớp chưa có học sinh. Chia sẻ mã tham gia để thêm học sinh." with the join code prominent (UX-DR15).
  - [x] 5.2 `join-code-display` component (`src/components/teacher/join-code-display.tsx`, UX-DR11 / DESIGN.md): shadcn `Card`, `rounded-brand-sm` (8px), **large monospace join code** + copy button. Copy button: client component; `navigator.clipboard.writeText(code)` on click; label switches to "Đã sao chép ✓" for exactly 2 seconds then reverts (UX-DR19 / AC #4). Extract the label-state logic into a pure helper (e.g. `join-code-copy-state.ts`) following the `dashboard-content-state.ts` / `answer-button-state.ts` pure-function-plus-test convention, so the 2s revert is unit-testable without a DOM. Guard for clipboard API absence (non-secure context): wrap in try/catch and no-op gracefully. Button label text lives in the locale file.
  - [x] 5.3 Do NOT build join-code regeneration. EXPERIENCE.md floats "Teacher can regenerate (invalidates old code)" as an assumption, but it is not in this story's ACs — flag it in Completion Notes as a candidate follow-up rather than silently adding scope.

- [x] Task 6: Parent-side join-class flow on `/(parent)/profiles` (AC: #5)
  - [x] 6.1 Add a `joinClassAction({ childProfileId, joinCode })` server action. Location: `src/app/(parent)/profiles/actions.ts` (it is a parent action operating on the parent's child profile — reuse the existing `requireParentAccountId()` guard in that file). Flow: guard → zod validate → verify the `childProfileId` belongs to this parent and is not soft-deleted (`deletedAt: null`) → normalize code (`trim().toUpperCase()`) → `findClassByJoinCode` → if none: `{ error: { code: 'INVALID_JOIN_CODE', message: <locale> } }` → `createClassMembership(class.id, childProfileId, class.teacherAccountId)` — **the denormalized `teacherAccountId` MUST be copied from the found class**, that's what makes the `@@unique([teacherAccountId, childProfileId])` constraint enforce A-5 → catch Prisma `P2002` on that constraint and return `{ error: { code: 'ALREADY_IN_CLASS', message: <locale> } }` (a child already in one of this teacher's classes cannot join another) → `revalidatePath('/profiles', 'layout')` → `{ data: { className } }`.
  - [x] 6.2 UI: add a "Tham gia lớp học" affordance per child profile on the `/profiles` page (read `src/app/(parent)/profiles/page.tsx` and `src/components/parent/child-profile-list.tsx` first to see where it fits — a small button/link per profile row opening a `Dialog` with a single join-code `Input` is the minimal consistent shape). Show success ("Đã tham gia lớp [name]") and the two error cases with distinct messages. `<label>` + `aria-describedby` per UX-DR17. Optionally show the child's current class membership(s) on the profile row if trivially available — but the AC only requires the join flow; don't gold-plate.
  - [x] 6.3 Note: the epic AC says the parent joins "on behalf of a Child Profile" — the join is parent-initiated from the parent surface. Nothing is added to the student surface in this story (assignment cards on student home are Story 5.5).

- [x] Task 7: Locale strings (all ACs)
  - [x] 7.1 Create `src/locales/vi/classes.ts` (new file, per-surface split precedent: `dashboard.ts`/`profiles.ts`/`emails.ts`) exporting a `classes` object: portal/page titles, empty state "Tạo lớp học đầu tiên để bắt đầu.", create-class dialog labels/CTAs, class-card strings ("X học sinh" count function, "Chưa có bài tập" pill), no-students message "Lớp chưa có học sinh. Chia sẻ mã tham gia để thêm học sinh.", join-code label, copy CTA + "Đã sao chép ✓", parent join-flow strings (dialog title, input label, success/invalid-code/already-in-class messages). Follow the flat-constants-plus-function style of `dashboard.ts`.
  - [x] 7.2 Add `teacherNavClasses` / `teacherNavAssignments` / `teacherNavReports` to `src/locales/vi/common.ts` next to the `parentNav*` block. NO inline Vietnamese anywhere in components (UX-DR18).

- [x] Task 8: Tests (all ACs)
  - [x] 8.1 `src/lib/join-code.test.ts`: format (length 6, alphabet-only, uppercase), no ambiguous characters, reasonable uniqueness across a batch.
  - [x] 8.2 `src/components/teacher/join-code-copy-state.test.ts`: label state transitions incl. the 2s revert (fake timers or pure-function time injection).
  - [x] 8.3 `src/infrastructure/repositories/class-repository.test.ts`: mock `@/lib/db` inline (`vi.mock('@/lib/db', () => ({ db: { class: {...}, classMembership: {...} } }))` — copy the established pattern from `dashboard-repository.test.ts`; there is no shared test-utils file, keep it inline). Cover: teacher scoping in queries, collision-retry on create (first `create` rejects with a P2002-shaped error carrying `code: 'P2002'`, second succeeds), membership creation.
  - [x] 8.4 `src/app/(teacher)/classes/actions.test.ts`: `requireTeacherAccountId` rejects — no session, wrong role, no TeacherAccount row, and **status PENDING/REJECTED** (the AD-6 case — this test is non-negotiable); createClass validation errors; happy path. Mock `@/lib/auth` and `@/lib/db` the way `src/app/register/teacher/actions.test.ts` and `dashboard/actions.test.ts` do.
  - [x] 8.5 Parent `joinClassAction` tests (extend `src/app/(parent)/profiles/` test coverage): invalid code, code case-insensitivity (lowercase input finds uppercase-stored code), child not owned by parent, P2002 → `ALREADY_IN_CLASS`, happy path with denormalized `teacherAccountId` asserted in the create call.
  - [x] 8.6 Full gate before marking done: `npx vitest run` (all pre-existing 104 tests must still pass), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build` (verify `/classes` and `/classes/[classId]` appear in the route manifest).
  - [x] 8.7 Live browser verification if possible; otherwise use the established fallback (build success + full unit coverage + explicit code-trace of the join flow end-to-end) and state so plainly in Completion Notes, per the standing sprint-status action item.

## Dev Notes

- **The schema is already done — resist any urge to migrate.** `Class` (with `joinCode String @unique`) and `ClassMembership` (with denormalized `teacherAccountId` and `@@unique([teacherAccountId, childProfileId])`) shipped in Story 1.2. A schema comment on `ClassMembership` raises "one Class per teacher vs one Class, period" — the PRD's A-5 explicitly says **at most one Class per Teacher Account**, which is exactly what the existing constraint encodes. Build to the existing constraint; do not change it.
- **The approval gate already exists in three places** — sign-in (`src/lib/credentials-authorize.ts`), the `(teacher)/layout.tsx` status check, and `src/lib/teacher-status.ts` helpers. This story's net-new gate work is ONLY the `requireTeacherAccountId()` guard inside the new actions file (AC #6). Reuse `getTeacherAccountStatus` semantics; compare status as string literal `'APPROVED'` (the codebase convention — no `TeacherStatus` enum import in app code).
- **Layer rules (AD-2):** pages/components (Presentation) never import `@/lib/db`, `@prisma/client`, or repository files. Server Components fetch via the actions file; actions call the repository; the repository is the only Prisma toucher for class data. `src/domain/` is untouched by this story (class CRUD has no domain algorithm).
- **Every action returns `{ data } | { error: { code, message } }`, never throws** — including the P2002 paths (wrap in try/catch and map).
- **Security posture for join codes:** a join code is an enrollment credential. `crypto.randomInt` over an unambiguous alphabet, uppercase-normalized, unique-constrained. 6 chars over a 31-char alphabet ≈ 887M combinations — fine for v1 (note: rate limiting on the join action is a known open action item from the Epic 1 retro; do NOT add it speculatively here).
- **Ownership scoping in queries, not post-checks:** teacher reads/writes are `where: { id, teacherAccountId }`-scoped (mirror `child-profile-repository.ts`). Cross-teacher access must be structurally impossible, not just unlikely.
- **Roster privacy:** show ChildProfile display `name` only (EXPERIENCE.md assumption: display name, not personal name, for privacy). Exclude soft-deleted profiles (`deletedAt: null`).
- **`/classes` is the teacher landing route** — `src/lib/role-redirect.ts` already sends TEACHER logins there. There is no `/(teacher)/page.tsx` and none should be created.
- **What NOT to build (scope walls):** assignment sets or the "Tạo bộ bài tập" CTA (5.4); assignment cards on student home (5.5); class report (5.6); offline toast / keyboard-nav hardening / status-revocation e2e patterns (5.7 — but basic a11y labels and the AD-6 guard ARE in scope now); join-code regenerate (unscoped assumption — flag, don't build); admin approval queue (7.2). Until 7.2 ships, the only way to get an APPROVED teacher for manual testing is direct DB manipulation (`UPDATE "TeacherAccount" SET status='APPROVED'`) — that's expected, note it rather than building a workaround.
- **Testing standards:** vitest 4 (`npx vitest run`), colocated `*.test.ts(x)`, `environment: 'node'`, inline `vi.mock('@/lib/db', ...)` pattern, `vi.mock('@/lib/auth', ...)` for session. 104 tests green at baseline (Story 5.2). Four-command gate (vitest / tsc / eslint / next build) is the done-bar.
- **UI primitives available:** `src/components/ui/` has `button`, `card`, `dialog`, `input`, `label`, `select`, `sheet`, `skeleton`, `sonner`, `alert-dialog`, `popover` (built on `@base-ui/react`). `lucide-react` for nav icons. There is NO shadcn `Sidebar` component installed and no shared shell component — inline the nav in the layout like the parent shell does; do not install new shadcn components or dependencies for this.

### Project Structure Notes

- Files to **create**:
  - `src/lib/join-code.ts` (+ `join-code.test.ts`)
  - `src/infrastructure/repositories/class-repository.ts` (+ `.test.ts`)
  - `src/app/(teacher)/classes/actions.ts` (+ `actions.test.ts`)
  - `src/app/(teacher)/classes/[classId]/page.tsx`
  - `src/components/teacher/class-card.tsx`
  - `src/components/teacher/create-class-dialog.tsx` (name per convention; kebab-case)
  - `src/components/teacher/join-code-display.tsx` (+ pure state helper `join-code-copy-state.ts` + `.test.ts`)
  - `src/locales/vi/classes.ts`
  - Parent join-class dialog component under `src/components/parent/`
- Files to **modify**:
  - `src/app/(teacher)/layout.tsx` — add sidebar nav chrome; PRESERVE the existing role + APPROVED gate untouched
  - `src/app/(teacher)/classes/page.tsx` — replace stub with portal home (class list / empty state)
  - `src/app/(parent)/profiles/actions.ts` — add `joinClassAction`
  - `src/app/(parent)/profiles/page.tsx` and/or `src/components/parent/child-profile-list.tsx` — join-class entry point
  - `src/locales/vi/common.ts` — `teacherNav*` labels
- **No Prisma schema changes. No new dependencies. No env var changes. No middleware changes** (auth gating is layout-based; `src/middleware.ts` only handles the child-profile cookie and does not need to match teacher routes).
- Naming: kebab-case files, PascalCase components, camelCase functions — no deviation.

## Previous Story Intelligence

- **Story 5.1 (done):** teacher registration + pending/rejected sign-in UX. Key carryovers: teacher `name` is validated at registration but NOT persisted (no name column — known gap, owned by pre-7.2 follow-up; nothing in this story needs the teacher's name); `src/lib/auth.ts` is untestable under vitest (calls `NextAuth()` at import) — keep testable logic OUT of framework-loading modules (the guard lives in the actions file and is tested by mocking `@/lib/auth`); 5.1 explicitly predicted "Story 5.3 introduces Class/teacher CRUD, which is closer to needing a repository" — that prediction lands here: create `class-repository.ts`.
- **Story 5.2 (review):** Resend adapter + teacher emails; nothing in it blocks or is touched by this story (no emails are sent on class creation or join — email triggers are approval/rejection, wired in 7.2). It bumped the test baseline to **104** and added the `oxc: { jsx: ... }` vitest fix — `.tsx` test files now compile fine if you need one.
- **Env-at-import-time trap (recurring):** `src/lib/env.ts` parses `process.env` on import. Anything transitively importing it in tests needs `vi.mock('@/lib/env', ...)` — copy the pattern from existing test files rather than inventing one. The new class code shouldn't need `env` at all, but `@/lib/auth` mocks are mandatory in action tests.
- **Verification convention (since Epic 2):** live browser verification hasn't been possible in this sandbox; accepted fallback is full `next build` + complete unit coverage + explicit code-trace, stated plainly in Completion Notes.
- **Git pattern (last 5 commits):** one commit per story, conventional-commit style (`feat(scope): ...`), story file + sprint-status updated alongside code.

## Latest Tech Notes (checked 2026-07-23)

- **No new packages needed.** Join codes: Node built-in `node:crypto` `randomInt` (available in the server runtime; the repository/action layer is Node, not Edge). Clipboard: browser-native `navigator.clipboard.writeText` (secure-context only — fine on localhost and production HTTPS; still try/catch it).
- **Zod v4** (`^4.4.3`) is what's installed — `z.enum([...])` and `safeParse` work as used in `profiles/actions.ts`; copy that file's idioms rather than v3 patterns from memory.
- **Prisma is v5** (`^5.22.0`) despite the architecture spine saying 6 — match what's installed. P2002 unique-violation errors are `Prisma.PrismaClientKnownRequestError` with `error.code === 'P2002'` and the constraint fields in `error.meta.target`.
- **shadcn/ui has an official Sidebar component, but it is NOT installed here** and the established convention is inline layout nav (parent shell) — do not add it.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.3] (lines 911–942) — the ACs verbatim
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR11, UX-DR12, UX-DR15, UX-DR17, UX-DR18, UX-DR19] (lines 174–190) — named components (`class-card`, `join-code-display`), teacher responsive layout (collapsed/expanded sidebar, `max-w-4xl`), teacher empty states, a11y floor, locale rule, copy-button interaction
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-19, A-5] — class management requirement (≥5 classes per teacher, unique join code, parent joins on behalf of child, one class per teacher per child)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-2, AD-6] — layer rules; dual approval gate (layout AND every server action)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md] — `class-card` = Card/rounded.md (name + meta + assignment pill); `join-code-display` = Card/rounded.sm (large monospace code + copy button); teacher content `max-w-4xl`
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md] — class detail contents, join-code copy = 2s "Đã sao chép ✓", roster shows display names (privacy assumption), regenerate-code is an unscoped assumption
- [Source: _bmad-output/project-context.md] — layer rules, action return shape, locale rule, cuid ids, adult-surface radii/tokens
- [Source: prisma/schema.prisma] — `Class`, `ClassMembership` (joinCode unique, `@@unique([teacherAccountId, childProfileId])`), `TeacherAccount`, `ChildProfile.deletedAt` — all pre-existing
- [Source: src/app/(teacher)/layout.tsx] — existing dual gate to preserve; the file this story adds chrome to
- [Source: src/app/(parent)/layout.tsx] — shell/nav structural template (NAV_ITEMS, signOutAction form, main wrapper)
- [Source: src/lib/teacher-status.ts, src/lib/role-redirect.ts, src/lib/auth-actions.ts] — status helpers, TEACHER → `/classes` landing, reusable sign-out
- [Source: src/infrastructure/repositories/child-profile-repository.ts] — repository pattern template (bare functions, ownership-scoped queries)
- [Source: src/app/(parent)/profiles/actions.ts] — server-action pattern template (`requireParentAccountId` guard, zod, revalidatePath) and the home of the new `joinClassAction`
- [Source: src/components/parent/child-profile-form.tsx] — name + GradeBand form to mirror for create-class
- [Source: src/components/parent/dashboard-content-state.ts, src/components/student/answer-button-state.ts] — pure-state-helper-plus-test convention for the copy-button 2s revert
- [Source: src/locales/vi/common.ts, dashboard.ts, profiles.ts] — locale conventions; `profiles.gradeBandLabels` to reuse
- [Source: _bmad-output/implementation-artifacts/5-1-teacher-registration-pending-state.md, 5-2-resend-email-adapter-teacher-notification-emails.md] — previous story intelligence (test baseline 104, vitest oxc fix, name-gap, verification fallback)

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5) via Claude Code

### Debug Log References

- Full gate run 2026-07-23: `npx vitest run` → 19 files / **147 tests passed** (104 baseline + 43 new); `npx tsc --noEmit` → clean; `npx eslint <all changed files>` → clean; `npx next build` → success, `/classes` and `/classes/[classId]` both present in the route manifest. The only build warnings are two pre-existing `<img>` warnings in `src/components/student/` (untouched by this story).

### Completion Notes List

- **Teacher shell (Task 1):** `(teacher)/layout.tsx` gained sidebar nav chrome for the APPROVED branch only — the existing AD-6 dual gate (role check + `getTeacherAccountStatus !== 'APPROVED'` full-screen pending message) is preserved byte-for-byte. Nav is one `<nav>`: icon-only `w-14` below `lg`, icon+label `lg:w-56` at `lg:` and up (UX-DR12), each link has `aria-label` + `hidden lg:inline` label and ≥44px touch targets (UX-DR17). Content wrapper is `max-w-4xl`. Sign-out reuses `signOutAction`. Nav links to `/assignments` and `/reports` resolve to pre-existing stub routes.
- **Join codes (Task 2):** `src/lib/join-code.ts` — `crypto.randomInt` over the 31-char unambiguous alphabet (no `0/O/1/I/L`), 6 chars, uppercase. No new dependencies.
- **Repository (Task 2):** `class-repository.ts` follows the child-profile-repository pattern; every teacher read/write is `teacherAccountId`-scoped in the `where` clause; roster query filters `childProfile.deletedAt: null`.
- **Actions (Task 3):** `requireTeacherAccountId()` enforces AD-6 (session → TEACHER role → TeacherAccount row → `status === 'APPROVED'`); every action in the file starts with it. `createClassAction` retries join-code P2002 collisions up to 5 attempts, then returns `CREATE_FAILED`. Nothing throws; all paths return `{ data } | { error }`.
- **Parent join flow (Task 6):** `joinClassAction` in the parent actions file: ownership check → `trim().toUpperCase()` normalize → `findClassByJoinCode` → `createClassMembership` with the **denormalized `teacherAccountId` copied from the found class** so `@@unique([teacherAccountId, childProfileId])` enforces A-5 at the DB level; P2002 → `ALREADY_IN_CLASS`, unknown code → `INVALID_JOIN_CODE`. Entry point: "Tham gia lớp học" button per profile row opening a single-input dialog.
- **Copy button (Task 5):** 2s "Đã sao chép ✓" revert implemented via pure helper `join-code-copy-state.ts` (unit-tested without a DOM, incl. exact-2000ms boundary); clipboard call wrapped in try/catch for non-secure contexts.
- **Verification (8.7):** live browser verification was not possible in this environment; per the established fallback — `next build` success + full unit coverage (43 new tests incl. the non-negotiable AD-6 PENDING/REJECTED guard tests) + explicit code-trace of the join flow end-to-end (parent dialog → `joinClassAction` → normalize → `findClassByJoinCode` → `createClassMembership` with denormalized teacherAccountId → P2002 mapping → revalidate). Manual QA note: until Story 7.2 ships, getting an APPROVED teacher requires direct DB manipulation (`UPDATE "TeacherAccount" SET status='APPROVED'`).
- **Flagged follow-up (not built, per Task 5.3):** join-code regeneration ("Teacher can regenerate, invalidates old code") is an unscoped EXPERIENCE.md assumption — candidate for a future story. Also still open from Epic 1 retro: rate limiting (applies to the join action too; intentionally not added here).
- **Note on test placement:** the join-code collision retry lives in the action layer (where the retry loop is), so it is tested in `classes/actions.test.ts` rather than the repository test; the repository test covers scoping, soft-delete filtering, and membership creation shape.

### File List

Created:
- `src/lib/join-code.ts`
- `src/lib/join-code.test.ts`
- `src/infrastructure/repositories/class-repository.ts`
- `src/infrastructure/repositories/class-repository.test.ts`
- `src/app/(teacher)/classes/actions.ts`
- `src/app/(teacher)/classes/actions.test.ts`
- `src/app/(teacher)/classes/[classId]/page.tsx`
- `src/components/teacher/class-card.tsx`
- `src/components/teacher/create-class-dialog.tsx`
- `src/components/teacher/join-code-display.tsx`
- `src/components/teacher/join-code-copy-state.ts`
- `src/components/teacher/join-code-copy-state.test.ts`
- `src/components/parent/join-class-dialog.tsx`
- `src/app/(parent)/profiles/actions.test.ts`
- `src/locales/vi/classes.ts`

Modified:
- `src/app/(teacher)/layout.tsx` (nav chrome added; AD-6 gate preserved)
- `src/app/(teacher)/classes/page.tsx` (stub replaced with portal home)
- `src/app/(parent)/profiles/actions.ts` (added `joinClassAction`)
- `src/components/parent/child-profile-list.tsx` (join-class entry point per profile row)
- `src/locales/vi/common.ts` (`teacherNav*` labels)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-07-23: Story created via create-story workflow (ultimate context engine analysis: epics + PRD + architecture spine + UX docs + full codebase survey + Stories 5.1/5.2 intelligence). Status: ready-for-dev.
- 2026-07-23: Story implemented — teacher portal shell (sidebar nav, AD-6 gate preserved), class repository + join-code generator, teacher class actions with APPROVED guard, `/classes` portal home + empty state, `/classes/[classId]` detail with join-code display (2s copy confirmation) + roster, parent join-class flow (A-5 via denormalized unique constraint), locale files, 43 new tests. Full gate green (vitest 147/147, tsc, eslint, next build). Status: review.
