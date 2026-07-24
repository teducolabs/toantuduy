---
baseline_commit: 34d3a0c
---

# Story 5.6: Class Report

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an approved teacher,
I want to view a Class Report for any assigned Assignment Set showing completion and class-average Skill accuracy,
so that I can identify struggling students and weak Skills without manual aggregation.

## Acceptance Criteria

1. **Given** at least one student has completed the assigned Assignment Set, **when** I open the Class Report, **then** a `class-report-table` shows one row per enrolled student: display name, completion status (checkmark or "—"), and per-Skill accuracy cells for Skills in the assignment (FR-22).
2. **Given** a student has not completed the Assignment Set, **when** their row renders, **then** all Skill accuracy cells show "—"; completion status shows "—".
3. **Given** 0 students have completed, **when** the report renders, **then** all rows show "—"; the class average row shows "Chưa có dữ liệu" (UX-DR15).
4. **And** a class average row is pinned at the bottom showing average Skill accuracy across completing students.
5. **And** individual student scores are never surfaced — only completion status and class-level aggregates (FR-22, NFR-11). See D1 for the binding interpretation.
6. **And** the Class Report updates within 60 seconds of a student Session completion via Server Component re-render on navigation; no WebSocket or SSE in v1 (AD-8, NFR-7).
7. **And** column headers are sortable client-side: completion (complete-first / incomplete-first), Skill accuracy columns (low-first) (UX-DR19).
8. **And** the report is accessible only to the owning Teacher Account server-side (NFR-11).

## Design Decisions (resolved during story creation — do not re-litigate)

These close gaps between the ACs and the current schema/spine. Implement exactly as stated.

- **D1 — "Individual student scores" = the session total, not per-Skill cells:** AC #1 explicitly specs per-Skill accuracy cells in each student row, and AC #7's skill-column sorting requires per-row values — EXPERIENCE.md line 151 designed the table the same way. The thing that is NEVER rendered anywhere in the report is a student's session score ("8/10", `correctCount`, `questionCount`) or any total-accuracy figure per student. Per-Skill cells per student ARE rendered (e.g. "75%"). This is the only reading under which AC #1, #5 and #7 can all hold. (A PRD consequence line reads stricter — flagged to the PM in the story-creation summary; if product later rules per-student skill cells out, only `class-report-table.tsx` and the use case output change.)
- **D2 — Completion predicate (uses 5.5's `Session.assignmentSetId`):** a student "completed" the set ⇔ a `Session` exists with `{ assignmentSetId, childProfileId, completedAt: { not: null } }`. Abandoned/in-progress sessions (`completedAt: null`) count for nothing. This column was added in 5.5 (D3) precisely for this story.
- **D3 — Re-takes: most recent completed session wins:** 5.5 (D7) allows re-taking a completed assignment, so a student can have several completed sessions for one set. Per-student per-Skill accuracy is computed from the MOST RECENT completed session only (`completedAt desc`, first per child). Do not average across attempts.
- **D4 — Class average = unweighted mean of per-student skill accuracies over completing students** (PRD FR-22: "class-average accuracy per Skill for students who completed"). Not a pooled correct/total across all answers — each completing student contributes equally. Display as whole percent (`Math.round(x * 100)`), e.g. "65%". A completed assignment session always answers every question in the set, so every completing student has answers for every Skill column — no per-cell missing-data case for completers.
- **D5 — Routes & entry points:** report page = `/(teacher)/reports/[assignmentSetId]/page.tsx`. The existing `/reports` placeholder page becomes an index: all sets with `assignedAt != null` (assigned + replaced), newest first, each linking to its report. `assignment-set-card` gains a report link for assigned/replaced sets (the 5.5 comment "report link is 5.6" marks the spot). Class detail page (`/classes/[classId]`) shows the class's active set title + a report link (EXPERIENCE.md line 65). Draft sets have no report — `notFound()`.
- **D6 — Replaced sets keep their reports:** 5.5's D2 kept replaced sets precisely for report history. Report is available for ANY set with `assignedAt != null` owned by the teacher, including `replacedAt != null`. The report page shows the status pill (Đã giao / Đã thay thế) so a teacher knows they're viewing a superseded set.
- **D7 — Aggregation is a pure domain use case:** `src/domain/use-cases/class-report.ts` exports `computeClassReport(input)` — zero framework/Prisma imports, mirroring `session-scoring.ts`. The repository returns raw rows; the use case produces the full table model (student rows + class-average row). This is where the unit tests live (AD-2, AD-11 precedent).
- **D8 — Table is a plain semantic `<table>` in a client component:** no `src/components/ui/table.tsx` exists and none is needed — `class-report-table.tsx` renders a semantic table (`<th scope>`, `aria-sort`, `<tfoot>` for the pinned average row) styled with Tailwind: `rounded-brand-md` wrapper (DESIGN.md line 215/259), sticky header (`sticky top-0` on `thead` cells inside an `overflow-auto` wrapper), generous row height + subtle dividers (EXPERIENCE.md line 301, Linear-style density). Sorting is pure client state — extract comparator logic to `class-report-sort.ts` with unit tests (same pattern as `assignment-builder-state.ts`).
- **D9 — Roster = current memberships with live profiles:** enrolled students = `ClassMembership` rows of the set's `classId` where `childProfile.deletedAt: null`, ordered `createdAt asc` (identical filter/order to `getClassDetail`). A soft-deleted profile drops out of the report; sessions from non-roster children are ignored by the use case. Zero enrolled students → table renders with no student rows, a muted `reports.noStudents` line, and the average row shows "Chưa có dữ liệu".
- **D10 — Sort semantics:** default order = roster order (D9). Completion header click toggles complete-first ⇄ incomplete-first (stable within groups, roster order preserved). Skill header click sorts that column low-first; second click toggles high-first. Students without data (incomplete) always sort AFTER students with data in skill sorts. Only one active sort key at a time.

## Tasks / Subtasks

- [x] Task 1: Repository — class report read (AC: #1, #2, #3, #8; D2, D6, D9)
  - [x] 1.1 Extend `src/infrastructure/repositories/assignment-set-repository.ts` with `getClassReportData(assignmentSetId: string, teacherAccountId: string)`: `db.assignmentSet.findFirst` where `{ id, teacherAccountId, assignedAt: { not: null } }` (ownership + assigned check in one query — foreign, draft, and missing sets all resolve to `null`, one NOT_FOUND code, no information leak — same convention as `findDraftSetForTeacher`), include:
    - `class: { select: { id, name, memberships: { where: { childProfile: { deletedAt: null } }, orderBy: { createdAt: 'asc' }, select: { childProfile: { select: { id, name } } } } } }`
    - `questions: { select: { question: { select: { skillId: true, skill: { select: { id, code, name } } } } } }` (Skills in the assignment = distinct skills of these rows)
    - `sessions: { where: { completedAt: { not: null } }, orderBy: { completedAt: 'desc' }, select: { childProfileId, completedAt, answers: { where: { answeredCorrectly: { not: null } }, select: { answeredCorrectly, question: { select: { skillId: true } } } } } }`
    - Export a `ClassReportData` type for the return shape. NO aggregation math here — repositories carry no business logic (AD-2).
  - [x] 1.2 Note: a replaced set is intentionally includable (D6) — the `where` must NOT filter on `replacedAt`. Select `replacedAt`, `title`, `dueAt`, `assignedAt` for the page header.
- [x] Task 2: Domain — pure report computation (AC: #1, #2, #3, #4; D1, D3, D4, D9)
  - [x] 2.1 New `src/domain/use-cases/class-report.ts` (mirror `session-scoring.ts` header comment style; zero external imports). Input (plain types defined in the file or `src/domain/entities/`): `{ students: { id, name }[], skills: { id, code, name }[], completedSessions: { childProfileId, completedAt (ISO string or epoch — NOT a Date-typed Prisma import), answers: { skillId, answeredCorrectly }[] }[] }`. Output: `{ skills, rows: { childProfileId, name, completed: boolean, accuracyBySkillId: Record<string, number> | null }[], classAverage: Record<string, number> | null }`.
  - [x] 2.2 Logic: dedupe skills by id preserving first-encounter order; for each roster student pick their FIRST session in the (already `completedAt desc`-ordered) list (D3); ignore sessions whose `childProfileId` is not in the roster (D9); per-student per-skill accuracy = correct/total of that session's answers grouped by skillId; `classAverage` per skill = unweighted mean of completing students' accuracies (D4), `null` when zero completers (AC #3). Values are 0..1 fractions — formatting to "65%" happens in the component/locale layer.
  - [x] 2.3 `src/domain/use-cases/class-report.test.ts` — at least: zero completers (average null, all rows incomplete); one completer (average equals their accuracies); multiple completers (unweighted mean, e.g. 100% and 50% → 75% even with different question counts); re-take uses most recent session only; non-roster session ignored; skill list dedupe + order; student with 0/N correct (accuracy 0 is distinct from "no data").
- [x] Task 3: Server action — report fetch (AC: #6, #8)
  - [x] 3.1 In `src/app/(teacher)/reports/actions.ts` (new file, `'use server'`): `getClassReportAction(input: { assignmentSetId: string })` → `requireTeacherAccountId()` (import from `../classes/actions` — do NOT duplicate the AD-6 gate) → zod `safeParse` (`assignmentSetId: z.string().min(1)`) → `getClassReportData` → `null` → `{ error: { code: 'NOT_FOUND', message: ... } }` → map raw data through `computeClassReport` → `{ data: { report } }` where `report` also carries header fields (`title`, `className`, `status: 'assigned' | 'replaced'`, `dueAt`, `questionCount`). Return shape `{ data: T } | { error: { code, message } }`, never throws.
  - [x] 3.2 No `revalidatePath`, no polling, no cache directives: the teacher layout calls `auth()` so every `/(teacher)/` page is already dynamic — a fresh visit/navigation re-runs the query, which satisfies the ≤ 60s freshness AC (AD-8). Do not add `export const revalidate` or client refresh timers.
- [x] Task 4: Report page + reports index (AC: #1, #3, #6; D5, D6)
  - [x] 4.1 New `src/app/(teacher)/reports/[assignmentSetId]/page.tsx` (Server Component, `params: Promise<{ assignmentSetId: string }>` — `await params`, Next 15): call `getClassReportAction`; on error → `notFound()` (mirror `classes/[classId]/page.tsx`). Render: `h1` set title, subline class name + question count + due date (reuse `assignments.dueDateDisplay` style), status pill for replaced sets (D6, `assignments.replacedPill`), then `<ClassReportTable>`.
  - [x] 4.2 Replace the `/reports` placeholder page (`src/app/(teacher)/reports/page.tsx`, currently 3-line "coming soon"): fetch via `getAssignmentSetsAction()`, filter `assignedAt !== null`, sort newest-assigned first, render `AssignmentSetCard` list with `reportHref` (Task 6.1); empty state `reports.emptyState` when the teacher has no assigned sets.
- [x] Task 5: `class-report-table` component + sort helper (AC: #1, #2, #3, #4, #7; D1, D8, D10)
  - [x] 5.1 New `src/components/teacher/class-report-sort.ts` — pure, testable: `type SortState = { key: 'completion' | { skillId: string }, direction: 'asc' | 'desc' } | null`, `nextSortState(current, clickedKey)` (completion default complete-first; skill default low-first; same-key click toggles, D10), `sortRows(rows, sortState)` (stable; no-data rows last on skill sorts; null state = input order). Unit tests in `class-report-sort.test.ts`.
  - [x] 5.2 New `src/components/teacher/class-report-table.tsx` — `'use client'`, `useState<SortState>`. Semantic table in an `overflow-auto rounded-brand-md border` wrapper: `thead` sticky (`sticky top-0 bg-background`), columns = student name, completion, one per Skill (header via `skillDisplayName(code, name)` from `src/locales/vi/skills.ts`). Body rows: name; completion checkmark (lucide `Check` + `sr-only` text, never color/icon alone — UX-DR17) or "—"; skill cells `formatPercent` or "—" (AC #2). NEVER render a per-student total or score column (D1, AC #5). `tfoot` pinned average row: label `reports.classAverageLabel`, per-skill percents, or single "Chưa có dữ liệu" cell spanning skill columns when `classAverage === null` (AC #3, EXACT string per AC). Zero-roster: muted `reports.noStudents` line above the table (D9).
  - [x] 5.3 Sortable headers: `<button>` inside `<th>` (min 44px touch target, keyboard-activatable — UX-DR17/19), `aria-sort="ascending" | "descending"` on the active `<th>` only, visual direction indicator (lucide `ChevronUp`/`ChevronDown`) + text label. Sorting never mutates props — derive with `sortRows` in render.
- [x] Task 6: Entry links — set card + class detail (D5)
  - [x] 6.1 `src/components/teacher/assignment-set-card.tsx`: add prop `reportHref: string | null`; when status is `assigned` or `replaced` and `reportHref` is set, render a `Link` (styled like the existing "Giao bài" button slot) labeled `reports.viewReportCta` next to the status pill. Drafts keep the `AssignSetDialog` exactly as-is. Wire `reportHref={'/reports/' + assignmentSet.id}` in `src/app/(teacher)/assignments/page.tsx` and the new `/reports` index; pass `reportHref={null}` nowhere — make the prop required to force both call sites to decide (update the existing `/assignments` call site).
  - [x] 6.2 `src/infrastructure/repositories/class-repository.ts` `getClassDetail`: extend include with `assignmentSets: { where: { assignedAt: { not: null }, replacedAt: null }, select: { id: true, title: true }, take: 1 }`; extend `ClassDetail` type. In `src/app/(teacher)/classes/[classId]/page.tsx` render, between `JoinCodeDisplay` and the roster: active set title + `Link` to its report when present, else muted `classes.noAssignmentPill` (EXPERIENCE.md line 65: "active Assignment Set, link to report"). Update `class-repository.test.ts` include-shape assertion (same deliberate-change note as 5.5's pill data).
- [x] Task 7: Locale strings (all ACs)
  - [x] 7.1 New `src/locales/vi/reports.ts` (locale-file-per-surface convention): `pageTitle` ('Báo cáo lớp học'), `emptyState` (no assigned sets yet), `studentColumnLabel` ('Học sinh'), `completionColumnLabel` ('Hoàn thành'), `completedSrLabel` (screen-reader text for the checkmark), `notCompletedCell: '—'`, `classAverageLabel` ('Trung bình lớp'), `noDataCell: 'Chưa có dữ liệu'` (EXACT — AC #3), `noStudents` (reuse tone of `classes.noStudents`), `viewReportCta` ('Xem báo cáo'), `formatPercent: (value: number) => \`${Math.round(value * 100)}%\``, sort-direction `aria`/tooltip labels if needed. NO inline Vietnamese in components (UX-DR18).
  - [x] 7.2 The `/reports` nav label already exists (`common.teacherNavReports`) — do not duplicate it.
- [x] Task 8: Tests & gate (all ACs)
  - [x] 8.1 `src/app/(teacher)/reports/actions.test.ts` (new; copy the mock setup from `src/app/(teacher)/assignments/actions.test.ts` — inline `vi.mock('@/lib/auth')`, `vi.mock('@/lib/db')`, `vi.mock('next/cache')`): **non-negotiable AD-6 matrix (no session / wrong role / no TeacherAccount row / PENDING / REJECTED — all rejected)**; validation (empty assignmentSetId); `NOT_FOUND` for foreign/draft/missing set (repo returns null); happy path returns computed report with header fields.
  - [x] 8.2 `src/infrastructure/repositories/assignment-set-repository.test.ts` — extend: `getClassReportData` where-shape (id + teacherAccountId + assignedAt not-null; NO replacedAt filter), include shape (roster deletedAt filter + order, sessions completedAt filter + desc order, answers answeredCorrectly filter).
  - [x] 8.3 Domain tests per Task 2.3; sort-helper tests per Task 5.1.
  - [x] 8.4 Full gate before done: `npx vitest run` (**217 green at baseline — all must pass plus new**), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build`.
  - [x] 8.5 Live browser verification if possible; otherwise the established fallback (build + full unit coverage + explicit end-to-end code trace: student completes assignment session → `Session{assignmentSetId, completedAt}` → teacher navigates to report → repo query → `computeClassReport` → table rows/average) stated plainly in Completion Notes. Manual QA still needs an APPROVED teacher via direct DB update until 7.2.

## Dev Notes

### Current state of files being modified (read them before editing)

- `src/app/(teacher)/reports/page.tsx` — 3-line placeholder ("Teacher reports — coming soon"). Fully replaced by Task 4.2. The nav item already points here (`src/app/(teacher)/layout.tsx` line 13, `BarChart3` icon).
- `src/infrastructure/repositories/assignment-set-repository.ts` — all 5.5 helpers live here; follow `findDraftSetForTeacher`'s "ownership + state check in one query → null" convention for `getClassReportData`. `listAssignmentSetsForTeacher` already returns `assignedAt`, `replacedAt`, `class.name`, `_count.questions` — the `/reports` index needs no new query.
- `src/components/teacher/assignment-set-card.tsx` — status derivation `draft | replaced | assigned` (line 30); the header comment literally says "report link is 5.6". Card is a Server-Component-compatible component that renders the client `AssignSetDialog` for drafts — the report link is a plain `next/link`, no client boundary needed.
- `src/app/(teacher)/assignments/page.tsx` — builds `assignableClasses` and renders the card list; add `reportHref` at the card call site (line ~46).
- `src/infrastructure/repositories/class-repository.ts` `getClassDetail` (lines 35–49) — roster filter `childProfile: { deletedAt: null }`, order `createdAt asc`: D9 copies this exactly. Task 6.2 extends its include.
- `src/app/(teacher)/classes/[classId]/page.tsx` — `notFound()` on action error is the established pattern for the report page too.
- `src/app/(teacher)/classes/actions.ts` — `requireTeacherAccountId()` (lines 31–43) is THE teacher gate; import it, never re-implement (AD-6). Action idioms: zod v4 `safeParse` + `parsed.error.issues[0]?.message` fallback.
- `src/domain/use-cases/session-scoring.ts` — the pure-use-case template (header comment, plain input types, Map-based grouping with insertion order). `computePerSkillBreakdown` groups one session's answers by skill — `computeClassReport` can reuse the same grouping shape internally but do NOT import Prisma types into domain.
- `prisma/schema.prisma` — everything needed already exists (5.5 migration): `Session.assignmentSetId` (line 167, `onDelete: SetNull`), `AssignmentSet.replacedAt` (199), `AssignmentSet.sessions` back-relation (204), `@@index([classId, assignedAt])` (206), `SessionAnswer.answeredCorrectly Boolean?` null = unanswered stub (181). **NO migration in this story — zero schema changes.**
- `src/locales/vi/skills.ts` — `skillDisplayName(code, fallback)` for column headers (DB `Skill.name` is the fallback, per that file's documented convention).
- `src/locales/vi/assignments.ts` — `replacedPill`, `assignedPill`, `questionCount`, `dueDateDisplay` reused on the report header and index.

### Architecture guardrails

- **Layers (AD-2):** page → server action → repository → domain use case. `class-report-table.tsx` receives the computed report as props — it never imports repositories or `@/lib/db`. Type-only `@prisma/client` imports in components are the established exception, but this story shouldn't even need that (report types come from the action/domain).
- **AD-6:** `requireTeacherAccountId()` first line of the action, AND the repo query is scoped by `teacherAccountId` (AC #8) — belt and suspenders, same as every 5.x action.
- **AD-8 (explicit):** load-on-visit ONLY. The ≤ 60s AC is satisfied by dynamic Server Component rendering (teacher layout calls `auth()`). EXPERIENCE.md line 203 mentions "rows update live… no full page refresh" — the epics AC overrides this for v1: "via Server Component re-render on navigation; no WebSocket or SSE". Do not add polling, `router.refresh()` timers, SSE, or websockets.
- **Action contract:** `{ data: T } | { error: { code, message } }`, never throw.
- **Aggregation lives in domain** (D7): the repository returns rows, the component renders props — all math in `computeClassReport` where it's unit-testable.
- **Privacy (NFR-8/NFR-11, D1):** no per-student session totals anywhere in the payload or UI. Keep `correctCount`/`questionCount` OUT of the sessions select in Task 1.1 so the temptation never reaches the component.
- **Dates:** `dueAt` display via existing day/month locale formatters; no English date strings.

### UX guardrails

- Teacher surface: `max-w-4xl` content (layout provides), `rounded-brand-md` table wrapper, `rounded-brand-sm` chips/pills — adult radii only (DESIGN.md 215, 259).
- Table style (EXPERIENCE.md 301, Linear reference): generous row height (min ~44px), subtle row dividers (`border-b border-gray-200` style like the roster list), bold completion indicators. Sticky header per DESIGN.md 259.
- "Chưa có dữ liệu" and "—" strings are EXACT (AC #2, #3).
- Color is never the sole conveyor: completion checkmark = icon + `sr-only` text; percents are text (UX-DR17).
- Full keyboard navigation: sort buttons are real `<button>`s, Tab-reachable, Enter-activatable (UX-DR19). Deep keyboard-nav hardening across the whole portal remains 5.7.
- Dense teacher microcopy: short column labels ("Học sinh", "Hoàn thành"), skill names as-is from `skills.ts`.

### What NOT to build (scope walls)

- **Offline toast, load-error inline retry card, portal-wide keyboard-nav hardening, approval-gate E2E hardening** → Story 5.7 (basic semantics/a11y IS in scope here). If the action errors, `notFound()` is this story's behavior; the retry card is 5.7.
- **Real-time updates** (SSE/WebSocket/polling/`router.refresh` timers) → deferred by AD-8; navigation freshness is the v1 contract.
- **Per-student session scores, per-student totals, export/CSV, drill-down into a student's answers** — never (D1, NFR-11) / not specced.
- **"Completed" status pill on assignment-set-card** (EXPERIENCE.md 148 mentions Draft|Assigned|Completed) — completion-derived card status is not in any AC; card status stays draft/assigned/replaced from 5.5. Only the report link is added.
- **No schema changes, no migration, no new dependencies, no `src/components/ui/table.tsx` primitive** (D8).
- **No changes to student flow, assign flow, or any 5.5 behavior** — this story is read-only over data 5.5 writes.
- **Filtering/pagination of the report** — v1 class sizes (~tens) need neither.

### Project Structure Notes

- Files to **create**: `src/app/(teacher)/reports/actions.ts` (+ `actions.test.ts`); `src/app/(teacher)/reports/[assignmentSetId]/page.tsx`; `src/domain/use-cases/class-report.ts` (+ test); `src/components/teacher/class-report-table.tsx`; `src/components/teacher/class-report-sort.ts` (+ test); `src/locales/vi/reports.ts`.
- Files to **modify**: `src/app/(teacher)/reports/page.tsx` (replace placeholder); `src/infrastructure/repositories/assignment-set-repository.ts` (+ test); `src/infrastructure/repositories/class-repository.ts` (+ test); `src/app/(teacher)/classes/[classId]/page.tsx`; `src/components/teacher/assignment-set-card.tsx`; `src/app/(teacher)/assignments/page.tsx`.
- Naming: kebab-case files, PascalCase types, camelCase functions.

## Previous Story Intelligence

- **Story 5.5 (commit `34d3a0c`, status: review):** built ALL the data plumbing this story reads — `Session.assignmentSetId` (D3 there was explicitly "without this column 5.6 is unimplementable"), `AssignmentSet.replacedAt` (replaced sets kept for report history), assign transaction (one assigned set row ↔ exactly one class, which makes this report per-set = per-class with no join ambiguity). Its scope walls hand this story: report route, report links from cards, completion aggregates. 5.5 sits in review — if review feedback lands mid-implementation, re-check `assignment-set-card.tsx` and the repository before editing.
- **Clone-per-class consequence (5.5 D1):** assigning to N classes creates N set rows. Each report is inherently single-class — never join across clones; `set.classId` is the one class.
- **Test baseline is 217** (24 files) after 5.5. Mock pattern: inline `vi.mock('@/lib/auth')`, `vi.mock('@/lib/db')`, `vi.mock('next/cache')`; `environment: 'node'`; `.tsx` tests compile (oxc jsx config since 5.2).
- **`src/lib/auth.ts` is untestable under vitest** (calls `NextAuth()` at import) — tests mock `@/lib/auth`; never import it into pure helpers.
- **Verification convention:** live browser QA usually impossible in this sandbox; accepted fallback = `next build` + full unit coverage + explicit end-to-end code trace in Completion Notes. Manual QA needs an APPROVED teacher via direct DB update until 7.2.
- **Git pattern:** one commit per story, conventional-commit style, story file + sprint-status updated alongside code.
- **Epic 2 retro open item:** `rounded-brand-*` classes can be merged away by `cn()`/tailwind-merge — the table wrapper uses `rounded-brand-md`; apply it last in the class list or verify the rendered output.
- **Do NOT speculatively add rate limiting** (open action item is scoped to auth paths, not this story).

## Latest Tech Notes (verified against 5.5, 2026-07-24)

- **No new packages.** Next `15.3.9` (App Router; `await params` in dynamic routes, `await headers()`), React 19, Prisma `^5.22.0`, zod `^4.4.3` (v4 idioms — copy `assignments/actions.ts`, not v3 memory), `@base-ui/react ^1.6.0` (existing ui primitives wrap Base UI, NOT Radix — irrelevant here since the table is plain HTML), Tailwind v4, lucide-react, vitest `^4.1.10`.
- React 19 Server Components: the report page is async, awaits the action, passes a plain serializable object to the client table component — `Date` fields must be formatted server-side or passed as ISO strings (the domain input already avoids `Date`, D7/Task 2.1).
- `aria-sort` belongs on the `<th>`, not the button, and only on the currently-sorted column (WAI-ARIA sortable-table pattern).

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.6] (lines 993–1021) — ACs verbatim; Epic 5 overview (863–865); FR-22 (line 63); NFR-7 (89), NFR-8 (91), NFR-11 (97)
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-22] (lines 340–347) — "class-average accuracy per Skill for students who completed"; consequence line 346 is the stricter privacy reading resolved by D1; Class Report glossary (104); perf NFR (421); privacy (424)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-8] — load-on-visit, no persistent connections; #AD-6 dual gate; #AD-2 layers; Capability map: Class Reports → `src/app/(teacher)/reports/` (line 375)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md] — line 65 (class detail → link to report), 67 (report entry), 148 (set card tap → report when assigned), 151 (table: name rows, completion + per-Skill accuracy cells, incomplete "—", average pinned), 202 (0 completions state), 203 (update ≤ 60s), 249 (client-side column sort semantics), 273 (aria on updating rows), 301 (Linear-style table density), 355 (teacher journey: 22 checkmarks, 6 "—", "Đọc hiểu: 65%")
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md] — line 215 (`rounded.md` teacher report rows), 259 (`class-report-table`: Table base, `rounded.md` wrapper, sticky header, pinned average row)
- [Source: prisma/schema.prisma] — Session (158–173, `assignmentSetId` 167), SessionAnswer (175–187), AssignmentSet (189–207, `replacedAt` 199), ClassMembership (116–128), Skill (130–137)
- [Source: src/infrastructure/repositories/assignment-set-repository.ts] — 5.5 helpers + conventions to extend
- [Source: src/infrastructure/repositories/class-repository.ts#getClassDetail] (35–49) — roster filter/order copied by D9; Task 6.2 extends
- [Source: src/infrastructure/repositories/dashboard-repository.ts] — existing skill-accuracy aggregation precedent (Epic 4; per-child all-time — deliberately NOT reused: report scope is per-set most-recent-session, D3)
- [Source: src/domain/use-cases/session-scoring.ts] — pure use-case template for `class-report.ts`
- [Source: src/app/(teacher)/classes/actions.ts#requireTeacherAccountId] (31–43) — the AD-6 gate to import
- [Source: src/app/(teacher)/assignments/actions.ts] — action idioms (zod v4, error codes, `AssignmentSetWithMeta` for the index)
- [Source: src/app/(teacher)/classes/[classId]/page.tsx] — `notFound()` pattern + roster render style
- [Source: src/components/teacher/assignment-set-card.tsx] — "report link is 5.6" comment; status derivation to reuse
- [Source: src/app/(teacher)/layout.tsx] — nav already links `/reports` (line 13); layout `auth()` makes all teacher pages dynamic (Task 3.2 rationale)
- [Source: src/locales/vi/skills.ts#skillDisplayName] — column-header names; assignments.ts / classes.ts strings reused
- [Source: _bmad-output/implementation-artifacts/5-5-assign-to-class-student-assignment-card.md] — previous story intelligence (D1–D8 there; baseline 217; mock patterns; scope handoffs)
- [Source: _bmad-output/project-context.md] — layer rules, action shape, locale rule, tokens, two-connection-string rule

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. All epics/PRD/UX/architecture artifacts, full Story 5.5 intelligence (whose schema additions were built as 5.6 prep), git history, and the live codebase (teacher surface, repositories, domain layer, schema) were analyzed; the ten design decisions above resolve every gap between the ACs and the current system, including the AC-internal privacy tension (D1).

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5) via Claude Code

### Debug Log References

- Full gate: `npx vitest run` → 27 files, 249 tests green (baseline 217 + 32 new); `npx tsc --noEmit` clean; `npx eslint <changed files>` clean; `npx next build` succeeds — `/reports` and `/reports/[assignmentSetId]` both build as dynamic (ƒ) routes, which is the AC #6 freshness mechanism.
- One tsc-caught integration miss during implementation: `AssignmentSetCard` has a THIRD call site (`/classes` page, not just `/assignments` + the new `/reports` index). The required `reportHref` prop forced the fix exactly as D5/Task 6.1 intended.

### Completion Notes List

- **Implementation plan followed the story layering exactly (D7/AD-2):** repository returns raw rows (`getClassReportData`, ownership + `assignedAt: { not: null }` in one query, NO `replacedAt` filter per D6, and `correctCount`/`questionCount` deliberately absent from the select per D1/NFR-11) → server action (`getClassReportAction`, gated by the imported `requireTeacherAccountId`, zod-validated, maps Prisma `Date` → ISO strings at the domain boundary) → pure `computeClassReport` (all math: most-recent-session-per-student D3, unweighted class average D4, roster-only sessions D9) → client `ClassReportTable` renders props only.
- **Sort semantics (D10)** live in pure `class-report-sort.ts`: first click on any header = 'asc' (completion → complete-first, skill → low-first), same-key click toggles, different key resets; no-data rows always last on skill sorts; stable via index tiebreak; `sortRows` never mutates.
- **Privacy (AC #5/D1):** per-student per-Skill cells render; no per-student session total/score exists anywhere in the payload or UI — asserted by an action test that inspects the serialized report.
- **A11y (UX-DR17/19):** semantic `<table>` with `<th scope>`, `aria-sort` on the active `<th>` only, sort buttons are real ≥44px `<button>`s, completion checkmark = lucide `Check` + `sr-only` text, "Chưa có dữ liệu" / "—" exact strings from `reports.ts` locale.
- **Entry points (D5/D6):** `/reports` index lists all ever-assigned sets (incl. replaced) newest-first via existing `listAssignmentSetsForTeacher`; `assignment-set-card` gained required `reportHref` prop (link shown for assigned/replaced, drafts keep `AssignSetDialog` untouched); class detail shows active set title + report link or `classes.noAssignmentPill`; report page shows `assignments.replacedPill` for superseded sets.
- **Tests added (32):** 8 domain (`class-report.test.ts` — zero/one/multiple completers, re-take D3, non-roster D9, skill dedupe, 0-accuracy≠no-data, roster order), 11 sort (`class-report-sort.test.ts`), 10 action (`actions.test.ts` — full AD-6 matrix, validation, NOT_FOUND, happy path incl. replaced status + privacy assertion), 2 repo shape (`assignment-set-repository.test.ts`), 1 repo shape (`class-repository.test.ts`).
- **Live browser verification not possible in this sandbox** (established fallback applies): `next build` + full unit coverage + end-to-end code trace — student completes an assignment session → `Session{assignmentSetId, completedAt}` written (5.5 flow, untouched) → teacher navigates to `/reports/[assignmentSetId]` (dynamic route, fresh render ≤60s per AD-8) → `getClassReportAction` → `getClassReportData` (teacher-scoped, completed sessions `completedAt desc`, answered rows only) → `computeClassReport` picks each roster student's most recent session, computes per-skill fractions and the unweighted average → `ClassReportTable` renders rows (checkmark/"—", percent cells) and the pinned `tfoot` average row ("Chưa có dữ liệu" when zero completers). Manual QA still requires an APPROVED teacher via direct DB update until 7.2.
- No schema changes, no migrations, no new dependencies, no real-time machinery — scope walls respected.

### File List

**Created:**
- src/app/(teacher)/reports/actions.ts
- src/app/(teacher)/reports/actions.test.ts
- src/app/(teacher)/reports/[assignmentSetId]/page.tsx
- src/domain/use-cases/class-report.ts
- src/domain/use-cases/class-report.test.ts
- src/components/teacher/class-report-table.tsx
- src/components/teacher/class-report-sort.ts
- src/components/teacher/class-report-sort.test.ts
- src/locales/vi/reports.ts

**Modified:**
- src/app/(teacher)/reports/page.tsx (placeholder → reports index)
- src/infrastructure/repositories/assignment-set-repository.ts (+ getClassReportData, ClassReportData)
- src/infrastructure/repositories/assignment-set-repository.test.ts
- src/infrastructure/repositories/class-repository.ts (getClassDetail + active set for report link)
- src/infrastructure/repositories/class-repository.test.ts
- src/app/(teacher)/classes/[classId]/page.tsx (active set title + report link)
- src/app/(teacher)/classes/page.tsx (reportHref at card call site)
- src/app/(teacher)/assignments/page.tsx (reportHref at card call site)
- src/components/teacher/assignment-set-card.tsx (required reportHref prop + report Link)
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-07-24: Implemented all 8 tasks (repository read, pure domain computeClassReport, gated server action, report page + index, sortable table + pure sort helper, entry links, reports locale). 32 new tests; full gate green (249 vitest, tsc, eslint, next build). Status → review.
- 2026-07-24: Story created via create-story workflow (ultimate context engine analysis: epics + PRD + architecture spine + UX docs + full codebase survey + Story 5.5 intelligence). Key decisions: per-student per-Skill cells with session totals never surfaced (D1), completion via `Session.assignmentSetId` (D2), most-recent-session accuracy (D3), unweighted class average (D4), `/reports/[assignmentSetId]` route + index + card/class-detail entry links (D5), replaced sets keep reports (D6), pure domain `computeClassReport` (D7), plain semantic table + tested sort helper (D8), roster = live memberships (D9), pinned sort semantics (D10). Zero schema changes. Status: ready-for-dev.
