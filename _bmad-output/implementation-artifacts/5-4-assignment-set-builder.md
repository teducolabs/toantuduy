---
baseline_commit: ddd7b68207e438499a1e07a506ee3258182ba31a
---

# Story 5.4: Assignment Set Builder

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an approved teacher,
I want to build an Assignment Set by selecting Questions from the library filtered by Grade Band and Skill,
so that I can create targeted practice for my class.

## Acceptance Criteria

1. **Given** I tap "Tạo bộ bài tập", **when** the `assignment-set-builder` Sheet opens, **then** Step 1 renders fields: name (required), Grade Band selector, optional due date.
2. **Given** I advance to Step 2, **when** the question browser loads, **then** Questions render as `question-library-row` components (text truncated to one line, Skill tag, Difficulty Level, checkbox); filterable by Skill and Grade Band; selected count shown in a sticky footer (UX-DR11). **And** I can select between 1 and the admin-configured maximum (`GlobalConfig.SESSION_QUESTION_COUNT`) Questions (FR-20).
3. **Given** I advance to Step 3 and save as draft, **when** the draft is saved, **then** an `AssignmentSet` record is created with no assigned Class; it appears on the portal home as a draft `assignment-set-card` (FR-20).
4. **And** if a network error occurs mid-step, the partially filled form is preserved on retry (UX-DR15).
5. **And** all builder server actions verify `TeacherAccount.status === 'APPROVED'` server-side (AD-6).

## Tasks / Subtasks

- [x] Task 1: Prisma schema migration — draft support on `AssignmentSet` (AC: #3)
  - [x] 1.1 **This is the only story-driven schema change since Story 1.2, and it is required.** AC #3 says a draft is "created with no assigned Class", but `AssignmentSet.classId` is currently `String` (required) in `prisma/schema.prisma` (lines ~186–199). Change `classId String` → `classId String?` and `class Class` → `class Class?` (keep `onDelete: Cascade`). The existing `assignedAt DateTime? // null = draft` comment already encodes draft semantics — a 5.4 draft has BOTH `classId: null` AND `assignedAt: null`. Story 5.5 sets both when assigning.
  - [x] 1.2 Add `gradeBand GradeBand` (required) to `AssignmentSet`. Step 1 collects it, the Step-2 question browser defaults its filter to it, and the `assignment-set-card` must display it (EXPERIENCE.md line 148: "Set name + question count + grade band + status"). Without a column it cannot survive the draft round-trip. The table is empty in every environment (nothing creates AssignmentSets yet — verified: only `prisma/seed.ts` touches the table, and only to delete rows), so a required column with no default is safe.
  - [x] 1.3 Run `npx prisma migrate dev --name assignment_set_draft_support` (uses direct `DATABASE_URL`, never the pooled URL) and `npx prisma generate`. Do NOT touch any other model. `prisma/seed.ts` already deletes `assignmentSetQuestion` rows during reseed — no seed changes needed.

- [x] Task 2: Repository — assignment sets + question library (AC: #2, #3)
  - [x] 2.1 Create `src/infrastructure/repositories/assignment-set-repository.ts` following the `class-repository.ts` pattern (bare exported async functions, `import { db } from '@/lib/db'`, types from `@prisma/client`). Functions:
    - `createAssignmentSetDraft(teacherAccountId, { title, gradeBand, dueAt, questionIds }): Promise<AssignmentSet>` — single `db.assignmentSet.create` with nested `questions: { create: questionIds.map((questionId) => ({ questionId })) }` (atomic — no separate transaction needed; `@@unique([assignmentSetId, questionId])` makes duplicate ids a P2002, but dedupe in the action first so it never fires). `classId` and `assignedAt` are omitted (null = draft).
    - `listAssignmentSetsForTeacher(teacherAccountId): Promise<AssignmentSetWithMeta[]>` — `where: { teacherAccountId }`, `orderBy: { createdAt: 'desc' }`, `include: { _count: { select: { questions: true } }, class: { select: { name: true } } }` (class is null for drafts; the include future-proofs the card for 5.5).
  - [x] 2.2 Extend `src/infrastructure/repositories/question-repository.ts` (one file per aggregate — do NOT create a second question repo). Add:
    - `listQuestionsForLibrary({ gradeBand, skillId? }): Promise<QuestionLibraryItem[]>` — `where: { gradeBand, ...(skillId ? { skillId } : {}) }`, `include: { skill: { select: { id: true, code: true, name: true } } }`, `orderBy: [{ skillId: 'asc' }, { difficultyLevel: 'asc' }]`. Return a lean teacher-facing type `QuestionLibraryItem { id, prompt, skillCode, skillName, difficultyLevel }` — do NOT reuse `toDomainQuestion` (the browser must not ship `correctAnswer`/`choices` to the teacher client; it only needs the preview fields). The query rides the existing `@@index([gradeBand, skillId, difficultyLevel])`.
    - `listSkills(): Promise<{ id: string; code: string; name: string }[]>` — `db.skill.findMany({ orderBy: { name: 'asc' }, select: { id, code, name } })` for the Skill filter options. Skills and ~180 questions are already seeded (`prisma/seed.ts`, `prisma/fixtures/questions.json` — 4 skills × 3 grade bands × difficulty 1–5).

- [x] Task 3: Server actions — `src/app/(teacher)/assignments/actions.ts` (AC: #2, #3, #5)
  - [x] 3.1 New `'use server'` file. Every action starts with `requireTeacherAccountId()` — **import it from `../classes/actions`** (it is already exported there and is the tested AD-6 dual gate: session → TEACHER role → TeacherAccount row → `status === 'APPROVED'`). Do NOT duplicate the guard and do NOT relocate it (moving it would churn `classes/actions.test.ts` for zero benefit). All actions return `{ data: T } | { error: { code: string; message: string } }` — never throw.
  - [x] 3.2 `getAssignmentBuilderContextAction()`: guard → return `{ data: { skills, maxQuestions } }` where `skills = listSkills()` and `maxQuestions = getSessionQuestionCount()` from `src/infrastructure/repositories/global-config-repository.ts` (already exists; reads `GlobalConfig 'SESSION_QUESTION_COUNT'`, default 10 — do NOT re-implement config reading).
  - [x] 3.3 `getQuestionLibraryAction({ gradeBand, skillId? })`: guard → zod `safeParse` (gradeBand: `z.enum(['GRADE_1','GRADE_2','GRADE_3'])`; skillId: optional non-empty string) → `listQuestionsForLibrary` → `{ data: { questions } }`.
  - [x] 3.4 `createAssignmentSetDraftAction({ title, gradeBand, dueDate?, questionIds })`: guard → zod (title: trim, min 1, max ~100; gradeBand enum; dueDate: optional `YYYY-MM-DD` string; questionIds: array of non-empty strings, min 1) → **dedupe** `questionIds` (`[...new Set(...)]`) → **re-read `getSessionQuestionCount()` server-side and reject if `questionIds.length > maxQuestions`** (never trust the client-enforced cap; error code e.g. `TOO_MANY_QUESTIONS`) → integrity check: `db.question.count({ where: { id: { in: questionIds }, gradeBand } })` via a small repo helper must equal `questionIds.length`, else `INVALID_QUESTIONS` (prevents cross-grade or fabricated ids) → convert `dueDate` to `Date` (`new Date(\`${dueDate}T00:00:00.000Z\`)` — stored as UTC `DateTime` per convention) → `createAssignmentSetDraft` → `revalidatePath('/classes')` + `revalidatePath('/assignments')` → `{ data: { assignmentSet: { id } } }`.
  - [x] 3.5 The form field is called "name" in the UX; the schema column is **`title`** — map at the action boundary, don't rename either side.

- [x] Task 4: UI primitive — checkbox (AC: #2)
  - [x] 4.1 There is NO `src/components/ui/checkbox.tsx`. Add one wrapping `@base-ui/react/checkbox` (already installed — **no new dependencies**), styled to match the existing ui-file conventions (`cn()` from `@/lib/utils`, data-attribute states, `size-4`-ish box with primary fill + check icon from `lucide-react` when checked). Follow the structure of `src/components/ui/select.tsx`/`sheet.tsx` (all local primitives wrap `@base-ui/react`, NOT Radix). Keep it minimal — only what the question rows need.

- [x] Task 5: Assignment set builder — 3-step Sheet (AC: #1, #2, #3, #4)
  - [x] 5.1 `src/components/teacher/assignment-set-builder.tsx` — `'use client'`, controlled `<Sheet>` (per DESIGN.md: base = multi-step Sheet, `rounded-brand-md`). Copy the controlled-Sheet mechanics from `src/components/parent/skill-detail-panel.tsx` (open/onOpenChange, `SheetContent`/`SheetHeader`/`SheetTitle`) and the form-state/reset-on-close/isSubmitting shape from `src/components/teacher/create-class-dialog.tsx`. Trigger button label: `"Tạo bộ bài tập"`. Props from the server page: `skills`, `maxQuestions` (fetched once server-side — no client fetch needed for context).
  - [x] 5.2 **All step state lives in the mounted client component** — `step`, `title`, `gradeBand`, `dueDate`, `skillFilter`, `selectedIds`. That alone satisfies AC #4: a failed fetch or failed save renders an inline error + retry button *inside the Sheet without closing it or clearing state*. Do NOT build localStorage draft persistence (EXPERIENCE.md only requires "builder preserves draft if fetch fails mid-step" — component state suffices; there is no precedent for form-draft localStorage in this codebase). Only reset state when the Sheet is explicitly closed (mirroring `create-class-dialog`'s `handleOpenChange`).
  - [x] 5.3 Extract the pure step logic into `src/components/teacher/assignment-builder-state.ts` (+ test) per the established pure-helper convention (`join-code-copy-state.ts`, `answer-button-state.ts`): `canAdvanceFromStep1(title)`, `toggleQuestionSelection(selectedIds, id, max)` (adding beyond `max` is a no-op), `canSaveDraft(selectedCount)` (≥ 1), `selectionCountLabel(count, max)` → `"{count} / {max} câu"`.
  - [x] 5.4 **Step 1 (config):** name `Input` (required, shows locale error), Grade Band `Select` (reuse `profiles.gradeBandLabels` for "Lớp 1/2/3" — do not duplicate), optional due date as a native `<input type="date">` rendered through the existing `Input` component — **there is no date-picker/calendar library and none may be added**. "Tiếp tục" advances only when name is non-empty and gradeBand chosen.
  - [x] 5.5 **Step 2 (question browser):** on entering, fetch via `getQuestionLibraryAction({ gradeBand, skillId? })` in a `useEffect` with the `cancelled`-flag cleanup guard (copy from `skill-detail-panel.tsx`). Skill filter: `Select` over `skills` props plus an "all skills" option; changing it refetches. Grade Band filter: the Step-1 grade band is the default; per AC the browser is "filterable by Skill and Grade Band", so render a Grade Band `Select` here too (changing it refetches **and clears selections whose questions are no longer listed — simplest correct rule: clear all selections on grade-band change**, since a set's questions must match its `gradeBand` per the server integrity check; keep the Step-1 value in sync). Rows: `question-library-row` (see Task 6). Loading: `Skeleton` rows. Fetch failure: inline error + "Thử lại" retry button, list area only — Sheet stays open, selections preserved (AC #4).
  - [x] 5.6 **Sticky footer (Step 2):** use `SheetFooter` (`mt-auto` — already sticky-to-bottom in the Sheet's flex column): selected count `"X / {max} câu"` + "Tiếp tục" CTA (disabled until ≥ 1 selected). Selecting beyond `max` is prevented by the toggle helper — when at cap, unchecked rows' checkboxes are disabled.
  - [x] 5.7 **Step 3 (save as draft):** summary (name, grade band label, due date if set — display as `"Giao ngày: {d/M}"` format, e.g. "Giao ngày: 9/7", never English dates — plus question count) and a primary "Lưu nháp" CTA calling `createAssignmentSetDraftAction`. **Assign-to-class is Story 5.5 — do NOT build class selection here**; structure Step 3 so 5.5 adds the class picker alongside "Lưu nháp" (the locale file already gets a `step3Title` neutral enough for both). On success: close Sheet, reset state (new cards appear via `revalidatePath`). On failure: inline error + retry, state preserved (AC #4). A back control ("Quay lại") on Steps 2–3 must not lose state.
  - [x] 5.8 A11y (UX-DR17/19): every input has an associated `<label>` (use `useId()` like `create-class-dialog`); errors wired via `aria-describedby`; checkboxes labelled by the question preview text; 44×44px minimum touch targets on rows/checkboxes; Esc closes the Sheet (Base UI default — don't fight it, closing via Esc is an explicit close and may reset state); full keyboard navigation (Tab/Enter) works because everything is native buttons/inputs/Base-UI primitives.

- [x] Task 6: `question-library-row` component (AC: #2)
  - [x] 6.1 `src/components/teacher/question-library-row.tsx` — per DESIGN.md/EXPERIENCE.md: checkbox + question preview (`prompt` truncated to ONE line — Tailwind `truncate`) + Skill tag + Difficulty Level. Skill tag shows the Vietnamese name via `skillDisplayName(code, name)` from `src/locales/vi/skills.ts` (canonical mapping — do not re-map). Difficulty as a compact label (e.g. "Độ khó 3" from a locale function). Row is a `<label>`/button wrapping the checkbox so the whole row toggles (44px min height). No question-preview modal — not specced, don't build it. No drag-to-reorder — explicitly rejected for v1 (DESIGN.md).

- [x] Task 7: `assignment-set-card` + surfacing on portal home and `/assignments` (AC: #3)
  - [x] 7.1 `src/components/teacher/assignment-set-card.tsx` — shadcn `Card`, **`rounded-brand-sm`** (DESIGN.md — note: sm, not md like class-card): set name (`title`), question count (`_count.questions`), grade band label, status pill. In 5.4 the pill is always "Bản nháp" (Draft) since only drafts can exist; derive status from data (`assignedAt === null` → draft) rather than hardcoding, so 5.5 only extends the derivation. Card is **display-only in this story** — EXPERIENCE.md says tapping a draft reopens the builder, but draft *editing* is not in any 5.4 AC; flag it in Completion Notes as a follow-up rather than building it.
  - [x] 7.2 Portal home `src/app/(teacher)/classes/page.tsx`: add an assignment-sets section — fetch via a new `getAssignmentSetsAction()` (guard → `listAssignmentSetsForTeacher`) in the assignments actions file; render the builder trigger ("Tạo bộ bài tập") and the `assignment-set-card` list (section hidden or minimal when empty — the class empty-state AC from 5.3 must remain intact: **when the teacher has no classes AND no sets, the page must still show exactly the 5.3 empty state with its single primary CTA**; only render the assignments section when the teacher has ≥ 1 class or ≥ 1 set). Pass `skills`/`maxQuestions` from `getAssignmentBuilderContextAction()` into the builder.
  - [x] 7.3 Replace the stub `src/app/(teacher)/assignments/page.tsx` ("Teacher assignments — coming soon") with a real Server Component: page title, the same builder trigger, and the full assignment-set-card list (empty state: "Chưa có bộ bài tập nào. Tạo bộ bài tập đầu tiên." single primary CTA per UX-DR15). The architecture feature map places Assignment Sets in `src/app/(teacher)/assignments/` and the sidebar "Bài tập" nav item already points here — leaving a "coming soon" stub after this story would be wrong.
  - [x] 7.4 **Do NOT touch `class-card.tsx`.** Its "Chưa có bài tập" pill reflects a class's *active assignment* — drafts have no class, so the pill's data source only changes in 5.5 when assignment happens.

- [x] Task 8: Locale strings (all ACs)
  - [x] 8.1 New `src/locales/vi/assignments.ts` (per-surface split precedent: `classes.ts`, `dashboard.ts`) exporting an `assignments` object, flat constants + functions like `classes.ts`. Needed strings: page title ("Bộ bài tập"), builder trigger "Tạo bộ bài tập", Sheet/step titles, Step-1 labels (name/grade band/due date + placeholders + name-required error), Step-2 strings (skill filter label, all-skills option, difficulty label function, loading, fetch-error + "Thử lại", count function `(count, max) => \`${count} / ${max} câu\``, "Tiếp tục", "Quay lại"), Step-3 strings (summary labels, due-date display function `(d, m) => \`Giao ngày: ${d}/${m}\``, "Lưu nháp", save-error), card strings (status pill "Bản nháp", question-count function), assignments-page empty state, generic error messages for action error codes (`TOO_MANY_QUESTIONS`, `INVALID_QUESTIONS`, `CREATE_FAILED`). **NO inline Vietnamese in any component** (UX-DR18).

- [x] Task 9: Tests (all ACs)
  - [x] 9.1 `src/components/teacher/assignment-builder-state.test.ts` — pure helpers: step-1 gating, toggle add/remove, **cap enforcement (toggle at max is a no-op)**, min-1 save gating, count label format.
  - [x] 9.2 `src/infrastructure/repositories/assignment-set-repository.test.ts` — inline `vi.mock('@/lib/db', ...)` (copy the `class-repository.test.ts` pattern): draft create passes nested `questions.create` with the right shape and NO `classId`/`assignedAt`; list is `teacherAccountId`-scoped with `_count` include.
  - [x] 9.3 Extend `src/infrastructure/repositories/` coverage for the new question-repository functions if trivial (library query shape: gradeBand + optional skillId in `where`, no `correctAnswer` in the returned items).
  - [x] 9.4 `src/app/(teacher)/assignments/actions.test.ts` — mock `@/lib/auth`, `@/lib/db`, `next/cache` exactly like `src/app/(teacher)/classes/actions.test.ts` (the guard is imported from `../classes/actions`, which reads the same mocked `db`/`auth` — the existing mock pattern covers it). **Non-negotiable AD-6 cases: no session, wrong role, no TeacherAccount row, status PENDING, status REJECTED — all rejected for `createAssignmentSetDraftAction`.** Plus: validation errors (empty title, empty questionIds), duplicate ids deduped, **count > mocked `SESSION_QUESTION_COUNT` → `TOO_MANY_QUESTIONS`** (mock `db.globalConfig.findUnique` to return e.g. `{ value: '10' }`), gradeBand-mismatch ids → `INVALID_QUESTIONS` (mock `db.question.count` short), happy path (assert created payload: title mapping, gradeBand, dueAt conversion, nested questions).
  - [x] 9.5 Full gate before marking done: `npx vitest run` (**147 tests green at baseline** — all must still pass), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build` (verify `/assignments` renders as a real route). Migration check: `npx prisma migrate dev` ran cleanly and `prisma/migrations/` contains the new folder.
  - [x] 9.6 Live browser verification if possible; otherwise the established fallback (build success + full unit coverage + explicit code-trace of builder → actions → repository end-to-end) stated plainly in Completion Notes. Manual QA still requires an APPROVED teacher via direct DB update (`UPDATE "TeacherAccount" SET status='APPROVED'`) until Story 7.2.

## Dev Notes

### Critical schema facts (read before writing any code)

- `AssignmentSet` (prisma/schema.prisma ~186–199): `id`, `teacherAccountId` (FK, Cascade), `classId` (FK, Cascade — **currently required; Task 1 makes it optional**), `title` (**not `name`**), `dueAt DateTime?` (**not `dueDate`**), `assignedAt DateTime?` (`null` = draft — comment already in schema), `createdAt`, `updatedAt`, `questions AssignmentSetQuestion[]`. **No `gradeBand` column yet — Task 1 adds it.** No status enum exists or should be added — status is derived (`assignedAt === null` → Draft).
- `AssignmentSetQuestion`: join table, `@@unique([assignmentSetId, questionId])`, `onDelete: Cascade` from set, `Restrict` from question.
- `Question`: `prompt`, `imageUrl?`, `choices Json`, `correctAnswer`, `skillId` → `Skill` (a **model**, not an enum: `id`/`code`/`name`), `gradeBand GradeBand` (`GRADE_1|GRADE_2|GRADE_3`), `difficultyLevel Int` (1–5). Hot-path index `@@index([gradeBand, skillId, difficultyLevel])`.
- `GlobalConfig`: key/value strings. `SESSION_QUESTION_COUNT` seeded = `'10'`. Read ONLY via `getSessionQuestionCount()` in `global-config-repository.ts` (default 10).
- Seed data exists: 4 skills (`pattern-recognition`, `spatial-reasoning`, `classification`, `word-problem`) and ~180 questions across all grade bands/difficulties (`prisma/fixtures/questions.json`) — the browser will have real data in dev.

### Architecture guardrails

- **Layers (AD-2):** pages/components never import `@/lib/db`, `@prisma/client`, or repositories. Server Components fetch via the actions file; actions call repositories; repositories are the only Prisma touchers. No domain code needed (the builder has no algorithm — `src/domain/` untouched).
- **AD-6 dual gate:** every new server action starts with `requireTeacherAccountId()` (imported from `../classes/actions` — already exported, already tested). Status compared as string literal `'APPROVED'` per codebase convention.
- **Action contract:** `{ data: T } | { error: { code, message } }`, never throw — including Prisma error paths (try/catch and map to `CREATE_FAILED`).
- **Server-side enforcement is the real cap:** the client cap (disabled checkboxes at max) is UX; the action MUST re-read `getSessionQuestionCount()` and re-validate count, dedupe ids, and verify all ids exist with the submitted `gradeBand`. Never ship `correctAnswer` or `choices` to the teacher client in library rows.
- **AD-8:** all page data via Server Components on navigation; the only client fetch is the Step-2 question list through a server action. No polling/SSE/websockets.
- **Dates:** `dueAt` stored as UTC `DateTime`; the form uses a plain date string; display format is Vietnamese short form ("Giao ngày: 9/7"), never English.

### UX guardrails

- Adult surface: Be Vietnam Pro only, no mascot, restrained orange `#F97316` on primary actions only. Radii: builder Sheet content `rounded-brand-md`; `assignment-set-card` **`rounded-brand-sm`**; inputs `rounded-brand-sm`. Content already constrained by the teacher layout's `max-w-4xl`.
- Teacher microcopy is dense and action-forward: "8 / 10 câu", "Tiếp tục", "Lưu nháp", short labels. All strings in `src/locales/vi/assignments.ts`.
- Sticky footer = `SheetFooter` (`mt-auto` in the Sheet flex column) — no custom sticky CSS needed.
- Loading skeletons via existing `Skeleton` primitive; inline retry (not toast) for mid-builder fetch failure, preserving state (UX-DR15).

### What NOT to build (scope walls)

- **Step-3 class assignment, replace-active-set confirmation, student assignment card** → Story 5.5. Step 3 here is summary + "Lưu nháp" only.
- **Class Report** → 5.6. **Offline toast / keyboard-nav hardening pass** → 5.7 (basic a11y labels + Esc/Tab behavior ARE in scope now).
- **Draft editing/deleting, tap-card-to-reopen-builder** — not in any AC; flag as follow-up.
- **Question preview modal, drag-to-reorder** — not specced / explicitly rejected for v1.
- **localStorage draft persistence** — component state satisfies AC #4; don't gold-plate.
- **class-card pill change** — stays "Chưa có bài tập" until 5.5.
- **No new dependencies** (no date-picker, no nanoid, nothing) and no admin config UI (7.3 owns editing `SESSION_QUESTION_COUNT`).

### Project Structure Notes

- Files to **create**:
  - `prisma/migrations/<ts>_assignment_set_draft_support/` (generated)
  - `src/infrastructure/repositories/assignment-set-repository.ts` (+ `.test.ts`)
  - `src/app/(teacher)/assignments/actions.ts` (+ `actions.test.ts`)
  - `src/components/ui/checkbox.tsx`
  - `src/components/teacher/assignment-set-builder.tsx`
  - `src/components/teacher/assignment-builder-state.ts` (+ `.test.ts`)
  - `src/components/teacher/question-library-row.tsx`
  - `src/components/teacher/assignment-set-card.tsx`
  - `src/locales/vi/assignments.ts`
- Files to **modify**:
  - `prisma/schema.prisma` — `AssignmentSet.classId`/`class` optional + `gradeBand` column ONLY
  - `src/infrastructure/repositories/question-repository.ts` — add `listQuestionsForLibrary`, `listSkills` (existing `getQuestionsForSession` untouched)
  - `src/app/(teacher)/classes/page.tsx` — assignment-sets section + builder trigger; **preserve the 5.3 no-classes empty state exactly**
  - `src/app/(teacher)/assignments/page.tsx` — replace stub
- Naming: kebab-case files, PascalCase types, camelCase functions. IDs are cuid via `@default(cuid())`.
- No env var changes, no middleware changes, no domain changes.

## Previous Story Intelligence

- **Story 5.3 (done, commit `ddd7b68`):** established the whole teacher surface this story builds on — `(teacher)/layout.tsx` sidebar (nav "Bài tập" → `/assignments` already live), `requireTeacherAccountId()` guard in `classes/actions.ts`, `class-repository` pattern, `create-class-dialog` form pattern, `classes.ts` locale pattern, pure-state-helper convention (`join-code-copy-state.ts`). It deliberately left the class-card pill hardcoded ("Chưa có bài tập") noting "5.4 only swaps the data source" — but since drafts don't attach to classes, that swap actually lands in 5.5; leave the pill alone.
- **Test baseline is 147** (19 files) after 5.3. Mock pattern: inline `vi.mock('@/lib/auth')`, `vi.mock('@/lib/db')`, `vi.mock('next/cache')`; `environment: 'node'`; the `oxc: { jsx }` vitest config fix from 5.2 means `.tsx` tests compile.
- **`src/lib/auth.ts` is untestable under vitest** (calls `NextAuth()` at import) — never import it into pure helpers; only actions touch it, and tests mock `@/lib/auth`.
- **Env-at-import trap:** `src/lib/env.ts` parses `process.env` on import; nothing in this story should need it, but if a transitive import appears in tests, `vi.mock('@/lib/env', ...)` per existing patterns.
- **Verification convention (since Epic 2):** live browser QA usually impossible in this sandbox; accepted fallback = `next build` + full unit coverage + explicit end-to-end code-trace, stated plainly in Completion Notes.
- **Git pattern:** one commit per story, conventional-commit style, story file + sprint-status updated alongside code.
- **Open action items that touch this story:** rate limiting is a known open item (Epic 1 retro) — do NOT add it speculatively here.

## Latest Tech Notes (checked 2026-07-23)

- **No new packages.** Stack pinned by what's installed: Next `15.3.9` (params are `Promise` — `await params` in `[id]` pages, see `classes/[classId]/page.tsx`), React 19, Prisma `^5.22.0` (P2002 errors: `error.code === 'P2002'`, fields in `error.meta.target`), zod `^4.4.3` (v4 idioms — copy `classes/actions.ts`, not v3 memory), `@base-ui/react ^1.6.0` (all ui primitives wrap Base UI, NOT Radix — the new checkbox must too), Tailwind v4, lucide-react for icons, vitest `^4.1.10`.
- **Native `<input type="date">`** is the correct due-date control — no calendar lib exists and adding one is out of bounds. It returns `YYYY-MM-DD` or `''`; validate with a zod regex and convert to UTC `Date` in the action.
- **Nested create** (`create` with `questions: { create: [...] }`) is atomic in Prisma — no explicit `$transaction` needed for draft + join rows.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.4] (lines 944–967) — ACs verbatim
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR11, UX-DR12, UX-DR15, UX-DR17, UX-DR18, UX-DR19] (lines 174–190) — named components (`assignment-set-builder`, `question-library-row`, `assignment-set-card`), teacher layout, empty/error states incl. "builder preserves draft on failed fetch", a11y floor, locale rule
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-20] — min 1 / max admin-configured count; drafts don't appear for students; filter by Grade Band and Skill. #FR-27 — count range 5–30, default 10. #FR-21/A-6 — assignment semantics (5.5, informs Step-3 shape)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-2, AD-6, AD-8] — layer rules, dual approval gate, load-on-visit; feature map: Assignment Sets → `src/app/(teacher)/assignments/`
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md] — `assignment-set-builder` = multi-step Sheet/`rounded.md`; `assignment-set-card` = Card/`rounded.sm` (name + status pill); `question-library-row` = table row (checkbox + preview + skill tag); drag-to-reorder rejected for v1
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md] — 3-step behavior spec (Step 1 name/grade/due date; Step 2 filterable browser, min 1/max admin count, sticky footer "8 / 10 câu" + "Tiếp tục"; Step 3 assign or save draft); card shows name + question count + grade band + status; builder preserves draft on failed fetch; teacher microcopy voice; "Giao ngày: 9/7" date format
- [Source: _bmad-output/project-context.md] — layer rules, action return shape, locale rule, cuid ids, adult-surface tokens, two-connection-string rule (migrate = direct URL)
- [Source: prisma/schema.prisma] — `AssignmentSet` (title/dueAt/assignedAt, classId currently required), `AssignmentSetQuestion`, `Question`, `Skill` (model), `GlobalConfig`
- [Source: prisma/seed.ts, prisma/fixtures/questions.json] — seeded skills + question corpus + `SESSION_QUESTION_COUNT=10`
- [Source: src/app/(teacher)/classes/actions.ts] — `requireTeacherAccountId()` guard to import; action/zod/revalidate idioms
- [Source: src/infrastructure/repositories/global-config-repository.ts] — `getSessionQuestionCount()` (default 10) — reuse, don't reimplement
- [Source: src/infrastructure/repositories/question-repository.ts] — existing `getQuestionsForSession` (untouched); file to extend
- [Source: src/infrastructure/repositories/class-repository.ts] — repository pattern template (scoped queries, `_count` include)
- [Source: src/components/parent/skill-detail-panel.tsx] — controlled Sheet + useEffect-fetch-with-cancelled-guard template
- [Source: src/components/teacher/create-class-dialog.tsx] — client form state/validation/reset-on-close template
- [Source: src/components/ui/sheet.tsx] — `SheetFooter` (`mt-auto`) = the sticky footer; Base UI dialog underneath
- [Source: src/locales/vi/skills.ts] — `skillDisplayName(code, fallback)` canonical Skill→VN mapping; src/locales/vi/profiles.ts — `gradeBandLabels`
- [Source: src/app/(teacher)/classes/actions.test.ts, src/infrastructure/repositories/class-repository.test.ts] — exemplar mock patterns for the new tests
- [Source: _bmad-output/implementation-artifacts/5-3-teacher-portal-shell-class-management.md] — previous story intelligence (147-test baseline, guard placement, verification fallback, class-card pill note)

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5) via Claude Code / BMAD dev-story workflow

### Debug Log References

- Prisma CLI does not auto-load `.env.local` — migration run with env sourced from `.env.local` (`set -a; . ./.env.local`). Migration `20260723072306_assignment_set_draft_support` created and applied cleanly.
- Full gate: `npx vitest run` → 185/185 pass (147 baseline + 38 new across 4 new test files); `npx tsc --noEmit` → clean; `npx eslint <15 changed files>` → clean; `npx next build` → success, `/assignments` renders as a real dynamic route (854 B page).

### Completion Notes List

- **Task 1 (schema):** `AssignmentSet.classId`/`class` made optional (`onDelete: Cascade` kept), required `gradeBand GradeBand` added. Table was empty in all environments, so the required column needed no default. No other model touched; no seed changes needed.
- **Task 2 (repositories):** `assignment-set-repository.ts` — `createAssignmentSetDraft` (single atomic nested create, no `classId`/`assignedAt` → draft) and `listAssignmentSetsForTeacher` (`_count.questions` + `class.name` include, future-proofed for 5.5). `question-repository.ts` extended with `listQuestionsForLibrary` (lean `QuestionLibraryItem` — `correctAnswer`/`choices` never leave the server), `listSkills`, and `countQuestionsInGradeBand` (integrity helper). `getQuestionsForSession` untouched.
- **Task 3 (actions):** `assignments/actions.ts` with `getAssignmentBuilderContextAction`, `getQuestionLibraryAction`, `createAssignmentSetDraftAction`, `getAssignmentSetsAction`. Guard imported from `../classes/actions` (AD-6 dual gate reused, not duplicated). Draft creation: zod validation → dedupe ids → server-side re-read of `SESSION_QUESTION_COUNT` (`TOO_MANY_QUESTIONS`) → grade-band integrity count (`INVALID_QUESTIONS`) → UTC `dueAt` conversion → create → `revalidatePath('/classes')` + `revalidatePath('/assignments')`. "name" (UX) ↔ `title` (schema) mapped at the action boundary.
- **Task 4 (checkbox):** new `src/components/ui/checkbox.tsx` wrapping `@base-ui/react/checkbox` (Root + Indicator, data-attribute states, lucide `CheckIcon`). No new dependencies.
- **Tasks 5–6 (builder + row):** `assignment-set-builder.tsx` — controlled 3-step Sheet (`rounded-brand-md`); all step state lives in the mounted client component, so mid-step fetch/save failures render inline error + "Thử lại" without closing the Sheet or losing state (AC #4); state resets only on explicit close. Pure helpers in `assignment-builder-state.ts` (`canAdvanceFromStep1`, `toggleQuestionSelection` with at-cap no-op, `canSaveDraft`, `selectionCountLabel` delegating to the locale function to avoid string duplication). Step 2: skill + grade-band filters (grade-band change clears all selections per the server integrity rule and stays in sync with Step 1), skeleton loading, `SheetFooter` sticky count + CTA, unchecked rows disabled at cap. Step 3: summary + "Lưu nháp" only (class assignment is 5.5). `question-library-row.tsx`: whole-row `<label>` toggle, one-line truncated prompt, skill tag via `skillDisplayName`, difficulty label, 44px min height. A11y: `useId` labels, `aria-describedby` on errors, `role="alert"`, checkbox `aria-label` from prompt, Esc/Tab native behavior.
- **Task 7 (card + pages):** `assignment-set-card.tsx` (`rounded-brand-sm`, status derived: `assignedAt === null` → "Bản nháp"; derivation already handles the 5.5 assigned case). `/assignments` stub replaced with a real Server Component (empty state + builder + card list). `/classes` gains an assignment-sets section; the 5.3 no-classes empty state is preserved exactly when the teacher has no classes AND no sets. `class-card.tsx` untouched per scope wall.
- **Task 8 (locale):** `src/locales/vi/assignments.ts` — all builder/card/page strings incl. error-code messages; no inline Vietnamese in any component.
- **Task 9 (tests):** 38 new tests — pure helpers (9), assignment-set repo (3), question repo additions (5), actions (21 incl. the non-negotiable AD-6 matrix for `createAssignmentSetDraftAction`: no session / wrong role / no row / PENDING / REJECTED; dedupe; `TOO_MANY_QUESTIONS` with mocked config; `INVALID_QUESTIONS` on short count; happy-path payload assertions incl. UTC dueAt and no classId/assignedAt).
- **Verification:** live browser QA not possible in this sandbox (and manual QA still requires an APPROVED teacher via direct DB update until Story 7.2). Established fallback applied: production build success + full unit coverage + end-to-end code trace (builder → `createAssignmentSetDraftAction` → `createAssignmentSetDraft` → Prisma nested create; list path `page.tsx` → `getAssignmentSetsAction` → `listAssignmentSetsForTeacher` → card).
- **Follow-ups flagged (not in 5.4 ACs):** draft editing/deleting and tap-card-to-reopen-builder (EXPERIENCE.md mentions reopening a draft); class assignment + status-pill extension land in Story 5.5.

### File List

- `prisma/schema.prisma` (modified — AssignmentSet: classId/class optional, gradeBand added)
- `prisma/migrations/20260723072306_assignment_set_draft_support/migration.sql` (new, generated)
- `src/infrastructure/repositories/assignment-set-repository.ts` (new)
- `src/infrastructure/repositories/assignment-set-repository.test.ts` (new)
- `src/infrastructure/repositories/question-repository.ts` (modified — listQuestionsForLibrary, listSkills, countQuestionsInGradeBand)
- `src/infrastructure/repositories/question-repository.test.ts` (new)
- `src/app/(teacher)/assignments/actions.ts` (new)
- `src/app/(teacher)/assignments/actions.test.ts` (new)
- `src/app/(teacher)/assignments/page.tsx` (modified — stub replaced with real page)
- `src/app/(teacher)/classes/page.tsx` (modified — assignment-sets section added, 5.3 empty state preserved)
- `src/components/ui/checkbox.tsx` (new)
- `src/components/teacher/assignment-set-builder.tsx` (new)
- `src/components/teacher/assignment-builder-state.ts` (new)
- `src/components/teacher/assignment-builder-state.test.ts` (new)
- `src/components/teacher/question-library-row.tsx` (new)
- `src/components/teacher/assignment-set-card.tsx` (new)
- `src/locales/vi/assignments.ts` (new)

## Change Log

- 2026-07-23: Story 5.4 implemented (all 9 tasks). Schema migration `assignment_set_draft_support`; assignment-set + question-library repositories; guarded server actions with server-side cap + grade-band integrity checks; Base UI checkbox primitive; 3-step builder Sheet with state-preserving inline retry; question-library-row; assignment-set-card on `/classes` and a real `/assignments` page; `assignments.ts` locale; 38 new tests (185 total green), tsc/eslint/next build clean. Status: review.
- 2026-07-23: Story created via create-story workflow (ultimate context engine analysis: epics + PRD + architecture spine + UX docs + full codebase survey + Story 5.3 intelligence). Key decisions baked in: schema migration making `AssignmentSet.classId` optional + adding `gradeBand` (required by AC #3 draft semantics and the card spec); draft status derived from `assignedAt === null`, no status enum; guard reused from `classes/actions.ts`; new `checkbox` ui primitive on Base UI; `/assignments` stub replaced. Status: ready-for-dev.
