---
baseline_commit: 7453696
---

# Story 4.3: Grade Progress Indicator & Session History

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to see my child's grade progress level and browse their complete Session history,
so that I have a full picture of where they stand and how they've been doing over time.

## Acceptance Criteria

1. **Given** the active Child Profile has completed Sessions, **when** the dashboard renders, **then** a `grade-progress-indicator` shows: "Đang ở: Lớp [N], [label]" where `[N]` is the Child Profile's current `gradeBand` and `[label]` maps the average `difficultyLevelAtAnswer` across all completed-Session answers to: "đầu kỳ" (avg 1.0–2.0), "giữa kỳ" (avg 2.1–3.5), "cuối kỳ" (avg 3.6–5.0) (FR-15).
2. Tapping the indicator opens a `Popover` tooltip explaining the metric (plain-language: "Dựa trên độ khó trung bình các câu hỏi đã làm").
3. **Given** the active Child Profile has zero completed Sessions, **when** the dashboard renders, **then** the grade-progress-indicator is not rendered (no average exists to show — consistent with the Story 4.2 precedent of using `hasAnyCompletedSession` to suppress data-dependent sections).
4. **Given** I navigate to the session history surface, **when** the `session-history-list` renders, **then** the most recent 30 completed Sessions are shown by default; each row displays date + day-of-week, score chip (e.g., "8/10"), and Skill tags (FR-17).
5. A "Xem thêm" pagination control loads the next 30 entries on tap (appends to the list; does not navigate to a new page).
6. **Given** the active Child Profile has zero completed Sessions, **when** the session history renders, **then** it shows "0 buổi đã hoàn thành." instead of an empty list (EXPERIENCE.md "First week" state).
7. Session history is sorted newest-first and is accessible only to the owning Parent Account server-side (NFR-8) — every server action verifies `session.user.role === 'PARENT'` and Child Profile ownership, returning `{ error: { code: 'FORBIDDEN', ... } }` on mismatch (same pattern Stories 4.1/4.2 established).

## Tasks / Subtasks

- [x] Task 1: Add grade progress + session history queries to `dashboard-repository.ts` (AC: #1, #3, #4, #6)
  - [x] Extend the existing `src/infrastructure/repositories/dashboard-repository.ts` (do not create a new repository file — same "one file per Parent Dashboard data need" pattern `getWeeklyActivity`/`getCurrentStreak`/`getSkillBreakdown` already follow).
  - [x] Add dashboard-view constants alongside the existing `SKILL_STRONG_THRESHOLD`/`SKILL_MIN_ATTEMPTS` (same file, same "not `src/domain/constants.ts`" rule — these are FR-15/FR-17 view constants, not AD-11 adaptive-difficulty constants):
    ```ts
    const GRADE_PROGRESS_EARLY_MAX = 2.0 // avg ≤ 2.0 → 'early' ("đầu kỳ")
    const GRADE_PROGRESS_MID_MAX = 3.5 // avg ≤ 3.5 (and > 2.0) → 'mid' ("giữa kỳ"); above → 'late' ("cuối kỳ")
    const SESSION_HISTORY_PAGE_SIZE = 30
    ```
  - [x] `getGradeProgress(childProfileId: string): Promise<'early' | 'mid' | 'late' | null>` — `null` when there is no completed-Session data yet (AC #3). Compute via `db.sessionAnswer.aggregate({ where: { session: { childProfileId, completedAt: { not: null } }, difficultyLevelAtAnswer: { not: null } }, _avg: { difficultyLevelAtAnswer: true } })`. If `_avg.difficultyLevelAtAnswer` is `null`, return `null`; otherwise map the average against `GRADE_PROGRESS_EARLY_MAX`/`GRADE_PROGRESS_MID_MAX` to `'early' | 'mid' | 'late'`. **Do not put the Vietnamese label ("đầu kỳ" etc.) in the repository** — same AD-2/Story-4.2-established split: repository returns a data-only status enum, the component/locale renders Vietnamese text. This mirrors exactly how `getSkillBreakdown` returns `'strong' | 'weak' | 'insufficient'` rather than "Tốt"/"Cần luyện" strings.
  - [x] **Do not reuse `getSkillAccuracyHistory`** (session-repository.ts's `WINDOW_SIZE=10` sliding window for AD-11 adaptive difficulty) for this average — same "two different accuracy/difficulty concepts" trap Story 4.2's Dev Notes flagged for Skill accuracy. FR-15's grade progress average is **all-time, all-Skills, no window** — a fresh aggregate query, not a reuse.
  - [x] Add `SessionHistoryRow` interface and `getSessionHistory`:
    ```ts
    export interface SessionHistoryRow {
      sessionId: string
      completedAt: string // ISO
      correct: number
      total: number
      skillCodes: string[] // distinct Skill.code values covered in this Session, for skillDisplayName() lookup in the component
    }

    export async function getSessionHistory(
      childProfileId: string,
      { skip, take = SESSION_HISTORY_PAGE_SIZE }: { skip: number; take?: number },
    ): Promise<SessionHistoryRow[]>
    ```
    Query `db.session.findMany({ where: { childProfileId, completedAt: { not: null } }, orderBy: { completedAt: 'desc' }, skip, take, select: { id: true, completedAt: true, correctCount: true, questionCount: true, answers: { select: { question: { select: { skill: { select: { code: true } } } } } } } })`. **Use `Session.correctCount`/`Session.questionCount` directly for the score** (these fields already exist on the `Session` model precisely for this — do not recompute the score by reducing over `SessionAnswer` rows the way `getSkillBreakdown`/`getSkillSessionDetail` had to, since those needed a *per-Skill* score and `Session.correctCount` is a *whole-session* score). Derive `skillCodes` as the distinct set of `answers[].question.skill.code` (dedupe with `Array.from(new Set(...))`).
  - [x] No repository function may contain Vietnamese strings or presentation logic (AD-2) — same rule as every prior dashboard-repository function.

- [x] Task 2: Extend the dashboard server action (AC: #1, #3, #4, #6, #7)
  - [x] In the existing `src/app/(parent)/dashboard/actions.ts`, extend `getDashboardDataAction`'s `Promise.all` with `getGradeProgress` and the **first page** of `getSessionHistory` (both are page-load data, same reasoning Story 4.2 used to fold `getSkillBreakdown` into this action rather than adding a third top-level call):
    ```ts
    const [weekly, streakResult, skillBreakdown, gradeProgress, sessionHistory] = await Promise.all([
      getWeeklyActivity(childProfileId),
      getCurrentStreak(childProfileId),
      getSkillBreakdown(childProfileId),
      getGradeProgress(childProfileId),
      getSessionHistory(childProfileId, { skip: 0 }),
    ])
    ```
    Return shape gains `gradeProgress: 'early' | 'mid' | 'late' | null` and `sessionHistory: SessionHistoryRow[]`.
  - [x] Add a new on-demand action for "Xem thêm" pagination (client-invoked, following the exact convention `getSkillDetailAction` established in Story 4.2 — `'use server'` action awaited directly from a `'use client'` component's click handler, no fetch/API route):
    ```ts
    export async function getMoreSessionHistoryAction(
      childProfileId: string,
      skip: number,
    ): Promise<{ data: { sessions: SessionHistoryRow[] } } | { error: { code: string; message: string } }>
    ```
    Same `requireParentAccountId()` + `findChildProfileByIdForParent()` ownership-check pair, no new auth logic.

- [x] Task 3: Add Vietnamese locale strings (AC: #1, #2, #4, #6)
  - [x] Extend `src/locales/vi/dashboard.ts` (do not create a new locale file):
    ```ts
    export const dashboard = {
      // ...existing entries unchanged...
      gradeProgressSectionTitle: 'Tiến độ lớp',
      gradeProgressLabel: (gradeLabel: string, periodLabel: string) => `Đang ở: ${gradeLabel}, ${periodLabel}`,
      gradeProgressPeriodLabels: {
        early: 'đầu kỳ',
        mid: 'giữa kỳ',
        late: 'cuối kỳ',
      } as const,
      gradeProgressTooltip: 'Dựa trên độ khó trung bình các câu hỏi đã làm.',
      sessionHistorySectionTitle: 'Lịch sử buổi luyện',
      sessionHistoryEmpty: '0 buổi đã hoàn thành.',
      sessionHistoryScoreChip: (correct: number, total: number) => `${correct}/${total}`,
      sessionHistoryLoadMoreCta: 'Xem thêm →',
      weekdayLabels: ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'] as const,
    }
    ```
  - [x] "Lớp N" for the `[N]` part of `gradeProgressLabel` — **reuse `profiles.gradeBandLabels` from `src/locales/vi/profiles.ts`** (`GRADE_1: 'Lớp 1'`, etc. — already established in Story 2.1). Do not duplicate this mapping in `dashboard.ts`.
  - [x] `dashboard.gradeProgressTooltip` copy is a reasonable plain-language paraphrase (epics.md and DESIGN.md do not specify exact tooltip copy — DESIGN.md's `grade-progress-indicator` row only says "info tooltip (`Popover`)"). Not a verbatim-copy requirement like Story 4.2's empty-state strings were.
  - [x] `weekdayLabels` index convention: index 0 = Monday, matching the existing `WeeklyActivity.days` array convention (`index 0 = Monday ... 6 = Sunday`) already established in `dashboard-repository.ts` — keep this consistent so the same day-index math works across both components.

- [x] Task 4: Add the day-of-week formatting helper (AC: #4)
  - [x] In `src/infrastructure/repositories/session-repository.ts`, add `export function computeVnWeekdayIndex(instantUtc: Date): number` returning `0`–`6` (Monday=0…Sunday=6) using the exact same `VN_OFFSET_MS` arithmetic `computeVnDayBoundaryUtc`/`formatVnDateLabel` already use: `const vnInstant = new Date(instantUtc.getTime() + VN_OFFSET_MS); return (vnInstant.getUTCDay() + 6) % 7`. This is the same `(getUTCDay() + 6) % 7` Monday-indexing formula `getWeeklyActivity` already uses in `dashboard-repository.ts` — do not write a second, differently-indexed formula.
  - [x] The component looks up `dashboard.weekdayLabels[computeVnWeekdayIndex(new Date(row.completedAt))]` for the Vietnamese weekday string, and reuses the existing `formatVnDateLabel` (`dd/MM/yyyy`) for the date part. **This project's established date format is `dd/MM/yyyy`** (used by `session-repository.ts` and inherited by every prior story) — use it here too rather than the prose `"7 tháng 7"` style shown in `mockups/key-parent-dashboard.html`; the mockup predates this convention (same category of "stale mockup detail" Story 4.2's Dev Notes already flagged and told developers to ignore for the skill-badge glyphs).

- [x] Task 5: Build the `Popover` UI primitive (AC: #2)
  - [x] **No `Popover` component exists in `src/components/ui/` yet** (only `alert-dialog`, `button`, `card`, `dialog`, `input`, `label`, `select`, `sheet`, `skeleton`, `sonner`). Create `src/components/ui/popover.tsx` following the exact wrapper pattern `src/components/ui/sheet.tsx` established for `@base-ui/react/dialog` — but importing `{ Popover as PopoverPrimitive } from '@base-ui/react/popover'` instead. That package's `popover/` submodule exports `root`, `trigger`, `portal`, `positioner`, `popup`, `arrow`, `backdrop`, `close`, `description`, `title`, `viewport` (confirmed present in `node_modules/@base-ui/react/popover/`) — mirror `Sheet`/`SheetTrigger`/`SheetPortal`/`SheetContent`'s structure (`Root`, `Trigger`, `Portal`, `Popup`) but you will additionally need `Positioner` (Popover, unlike Dialog, is anchored to its trigger and needs a `Positioner` for placement — Dialog's `Popup` alone was sufficient because it's a full-screen/side overlay, not an anchored tooltip).
  - [x] Export `Popover`, `PopoverTrigger`, `PopoverContent` (wrapping `Portal` + `Positioner` + `Popup` internally, similar to how `SheetContent` wraps `Portal` + `Overlay` + `Popup`) as the minimal surface this story needs — no `PopoverArrow`/`PopoverClose` required by any AC here, but add them only if trivial; do not over-build.
  - [x] Small popup — no backdrop/overlay needed for a tooltip-style popover (unlike `Sheet`, which needs a `Backdrop` for its modal behavior). Style `PopoverContent` similarly to `SheetContent`'s `bg-popover text-popover-foreground` tokens, `rounded-brand-sm`, `shadow-sm`, small max-width (this is a short explanatory sentence, not a full panel).

- [x] Task 6: Build the `grade-progress-indicator` component (AC: #1, #2, #3)
  - [x] Create `src/components/parent/grade-progress-indicator.tsx` — presentational, receives `{ gradeBand: GradeBand; gradeProgress: 'early' | 'mid' | 'late' | null }` as props. If `gradeProgress` is `null`, render nothing (`return null`) — satisfies AC #3.
  - [x] Otherwise render `dashboard.gradeProgressLabel(profiles.gradeBandLabels[gradeBand], dashboard.gradeProgressPeriodLabels[gradeProgress])` as the visible text, plus a small info-icon trigger (`Popover`/`PopoverTrigger`) that opens a `PopoverContent` showing `dashboard.gradeProgressTooltip`.
  - [x] `data-slot="grade-progress-indicator"` per the existing `data-slot` convention.
  - [x] Import `GradeBand` type from `@prisma/client` (same import path `child-profile-form.tsx`/`child-profile-repository.ts` already use) and `profiles` from `@/locales/vi/profiles` (for `gradeBandLabels`).

- [x] Task 7: Build the `session-history-list` component (AC: #4, #5, #6)
  - [x] Create `src/components/parent/session-history-list.tsx` as a `'use client'` component (owns the "Xem thêm" pagination state — this is this story's second client-invoked server action + client-side data fetch, following the exact precedent `SkillDetailPanel` established in Story 4.2 for `getSkillDetailAction`).
  - [x] Props: `{ childProfileId: string; initialSessions: SessionHistoryRow[] }`. Internal `useState` holds the accumulated session list (seeded from `initialSessions`) and a `skip` cursor (seeded at `initialSessions.length`). Tapping "Xem thêm" calls `getMoreSessionHistoryAction(childProfileId, skip)` and appends the result, advancing `skip`. Hide the "Xem thêm" button once a fetch returns fewer than `SESSION_HISTORY_PAGE_SIZE` rows (no more pages) — mirror this client-side page-end detection since there's no separate "total count" query in this story's scope.
  - [x] If the accumulated list is empty, render `dashboard.sessionHistoryEmpty` (AC #6) instead of rows/pagination.
  - [x] Each row: date (`formatVnDateLabel`) + weekday (`dashboard.weekdayLabels[computeVnWeekdayIndex(...)]`), a score chip (`dashboard.sessionHistoryScoreChip(correct, total)`), and Skill tags — one small tag per `skillCodes` entry, text via `skillDisplayName(code, code)` (reuse from `src/locales/vi/skills.ts`, same as `SkillDashboardSection`/`SkillDetailPanel` already do; there's no DB-fallback `name` available here since `getSessionHistory` only selects `skill.code`, so pass the `code` itself as the fallback argument — acceptable because `skillDisplayName` only falls back to its second argument when the code isn't found in the canonical map, which won't happen for the 4 seeded Skills).
  - [x] `data-slot="session-history-list"`.

- [x] Task 8: Wire the dashboard page (AC: #1–#7)
  - [x] In `src/app/(parent)/dashboard/page.tsx`, add a `GradeProgressIndicator` `Card` and a `SessionHistoryList` `Card` **after** the existing `skill-card`, matching `mockups/key-parent-dashboard.html`'s layout order (activity strip → skill summary → grade progress → session history, lines 429–504).
  - [x] `GradeProgressIndicator` needs `childProfile.gradeBand` — `getDashboardDataAction` currently only returns dashboard-metric data, not the `ChildProfile` record itself. The page already resolves `activeProfileId` from the cookie but not the full `ChildProfile`; either (a) extend `getDashboardDataAction`'s return with `gradeBand: GradeBand` (simplest — the action already calls `findChildProfileByIdForParent`, which returns the full `ChildProfile` including `gradeBand`, so this is a zero-extra-query addition), or (b) have the page call a separate profile lookup. **Prefer (a)** — it's free (data already fetched for the ownership check) and keeps the page's single `getDashboardDataAction` call as the one source of page-load data, consistent with how `hasAnyCompletedSession`/`skillBreakdown` were folded in.
  - [x] `SessionHistoryList` receives `initialSessions={result.data.sessionHistory}` and `childProfileId={activeProfileId}`.
  - [x] Update `src/app/(parent)/dashboard/loading.tsx` to add Skeleton placeholders for both new sections (a text-line skeleton for grade progress; a few row-shaped skeletons for session history), matching the existing Skeleton pattern already in that file.

- [x] Task 9: Tests and manual verification (all ACs)
  - [x] Unit-test `getGradeProgress` and `getSessionHistory` in `dashboard-repository.test.ts` (extend the existing file, same `vi.mock('@/lib/db', ...)` pattern as `getSkillBreakdown`/`getSkillSessionDetail`). Cover: zero completed Sessions (`getGradeProgress` returns `null`), average exactly `2.0` (boundary → `'early'`), average exactly `2.1` (boundary → `'mid'`), average exactly `3.5` (boundary → `'mid'`), average exactly `3.6` (boundary → `'late'`), a Session spanning two Skills (`skillCodes` contains both, deduped), more than `SESSION_HISTORY_PAGE_SIZE` completed Sessions (pagination `skip`/`take` returns the correct slice, newest-first), and an in-progress (`completedAt: null`) Session excluded from both queries (same FR-7 exclusion rule Story 4.1/4.2 already established).
  - [x] No unit tests needed for `grade-progress-indicator.tsx`, `session-history-list.tsx`, or `popover.tsx` beyond type-checking — per the established Story 3.5/3.6/4.1/4.2 precedent, thin presentational/DOM composition is manually browser-verified, not unit-tested.
  - [ ] Manual verification pass (mandatory — the Epic 2 retro gate requiring a live browser check before marking any story done is still active; **Story 4.1 shipped without it and Story 4.2 also left it outstanding** — if this dev-agent session also has no browser/DB tool available, leave this story at `review` rather than `done` and say so explicitly, exactly as both prior stories' Dev Agent Records did):
    - A Child Profile with 0 completed Sessions: no grade-progress-indicator rendered at all; session history shows "0 buổi đã hoàn thành."
    - A Child Profile with completed Sessions averaging near each boundary (2.0/2.1, 3.5/3.6): correct "đầu kỳ"/"giữa kỳ"/"cuối kỳ" label shown.
    - Tap the grade-progress info icon: Popover opens with the tooltip text, closes on outside click/Esc.
    - A Child Profile with > 30 completed Sessions: first 30 shown newest-first; tapping "Xem thêm" appends the next 30; button disappears once no more remain.
    - Confirm a parent cannot fetch another parent's Child Profile's grade progress or session history via `getMoreSessionHistoryAction` with a foreign `childProfileId` (returns `FORBIDDEN`) — same cross-parent check pattern as Stories 4.1/4.2.
  - [x] Run `pnpm lint`, `npx tsc --noEmit`, `pnpm test` — all must stay clean; all pre-existing tests must still pass.

## Dev Notes

- **This is an additive extension of Story 4.1/4.2's Parent Dashboard foundation, not a new subsystem.** `dashboard-repository.ts`, `dashboard/actions.ts`, `dashboard/page.tsx`, `dashboard/loading.tsx`, and `src/locales/vi/dashboard.ts` all already exist and follow an established pattern — extend them in place. Net-new files: `src/components/ui/popover.tsx`, `src/components/parent/grade-progress-indicator.tsx`, `src/components/parent/session-history-list.tsx`.
- **FR-15's average Difficulty Level is a fourth distinct "history window" concept in this codebase — do not conflate it with the other three:**
  1. `getSkillAccuracyHistory` (session-repository.ts) — `WINDOW_SIZE=10` sliding window, feeds `selectNextQuestion` (AD-11). Not used here.
  2. `getSkillBreakdown`'s all-time per-Skill accuracy (Story 4.2, FR-7). Not used here — that's *accuracy*, this story needs *difficulty level*.
  3. `getSkillSessionDetail`'s per-Session-per-Skill accuracy (Story 4.2, FR-14). Not used here.
  4. **This story's `getGradeProgress`** — all-time average of `SessionAnswer.difficultyLevelAtAnswer` across **all Skills combined** (not per-Skill), from completed Sessions only. A fresh aggregate query.
- **`Session.completedAt: null` sessions (in-progress/abandoned) must be excluded from every query in this story** — identical FR-7 rule Stories 4.1/4.2 already applied. Filter `session: { completedAt: { not: null } }` on both `getGradeProgress` (via the `SessionAnswer.session` relation) and `getSessionHistory` (directly on `Session.completedAt`).
- **Layer compliance (AD-2), same as Stories 4.1/4.2:** `dashboard-repository.ts` (Infrastructure) does data aggregation only — no Vietnamese strings, no "đầu kỳ"/"giữa kỳ"/"cuối kỳ" text, just the `'early' | 'mid' | 'late'` enum. `actions.ts` (Application) is the only entry point from Presentation, begins with the session check, never throws.
- **`Session.correctCount`/`Session.questionCount` already store the whole-session score** (set by `completeSession()` in `session-repository.ts`, Story 3.6) — use them directly for `getSessionHistory`'s score chip. Do not re-derive the score by reducing over `SessionAnswer` rows the way Story 4.2's per-Skill queries had to; that reduction was only necessary there because the score needed was *Skill-scoped*, not whole-session.
- **The `Popover` primitive is genuinely new to this codebase** (Task 5) — every prior story's info/detail affordance used `Sheet` (`child-profile-switcher.tsx`, `skill-detail-panel.tsx`). `@base-ui/react` (already a dependency, v1.6.0) ships a `popover` submodule with the same family of parts as its `dialog` submodule (`root`/`trigger`/`portal`/`positioner`/`popup`/`arrow`/`backdrop`) — confirmed present in `node_modules/@base-ui/react/popover/`. Do not reach for a different popover library; wrap this one, following `sheet.tsx`'s exact wrapping convention.
- **This story does not introduce a new route.** Despite EXPERIENCE.md's surface table listing "Session history" as reached via a "Xem thêm" link (implying a distinct page), `mockups/key-parent-dashboard.html` (lines 479–504) shows the session history list rendered directly on the dashboard, and epics.md's own AC for this story says "Xem thêm" "loads the next 30 entries on tap" (in-place pagination, not navigation). Building a separate `/dashboard/history` route for a same-page paginated list would be disproportionate scope, the same category of call Story 4.2's Dev Notes made for the Sheet-vs-parallel-route question. If a genuinely separate route turns out to be wanted, that's a product/code-review-time discussion, not a blocker to implementing this story as scoped.
- **No schema changes.** `Session.completedAt/correctCount/questionCount`, `SessionAnswer.difficultyLevelAtAnswer`, and `Question.skillId`/`Skill.code` are all that's needed — no migration required.
- **Boundary precision matters for the unit tests:** FR-15 says "1.0–2.0" → "đầu kỳ", "2.1–3.5" → "giữa kỳ", "3.6–5.0" → "cuối kỳ" — treat these as closed intervals on the upper bound (`<= 2.0`, `<= 3.5`, `> 3.5`), matching the epics.md AC text exactly (do not use `< 2.0`/`< 3.5`, which would misclassify an exact `2.0` or `3.5` average).

### Project Structure Notes

- New files: `src/components/ui/popover.tsx`, `src/components/parent/grade-progress-indicator.tsx`, `src/components/parent/session-history-list.tsx`.
- Modified files: `src/infrastructure/repositories/dashboard-repository.ts` (add `getGradeProgress`, `getSessionHistory`, `SessionHistoryRow`, new constants), `src/infrastructure/repositories/dashboard-repository.test.ts` (add coverage), `src/infrastructure/repositories/session-repository.ts` (add `computeVnWeekdayIndex`), `src/app/(parent)/dashboard/actions.ts` (extend `getDashboardDataAction`, add `getMoreSessionHistoryAction`), `src/app/(parent)/dashboard/page.tsx` (render both new sections), `src/app/(parent)/dashboard/loading.tsx` (add skeletons), `src/locales/vi/dashboard.ts` (add strings).
- Matches the Architecture Spine's capability map row "Parent Dashboard — Skill breakdown (FR-9–FR-14) → `src/app/(parent)/dashboard/`" (FR-15/FR-17 live in the same directory per the epic's own scoping) and Stories 4.1/4.2's already-established `src/components/parent/` location convention.
- No conflicts detected — this story's file plan extends Stories 4.1/4.2's files in place rather than creating a parallel/competing structure. **Caveat:** Story 4.2 is currently at `review` status (not yet merged/committed at time of this story's creation — see Previous Story Intelligence below) with its manual-verification pass still outstanding; this story builds directly on top of those uncommitted 4.2 changes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3: Grade Progress Indicator & Session History] — verbatim AC basis
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-15, #FR-17, #Glossary "Difficulty Level"] — average-to-label mapping, all-time Session history scope, Difficulty Level definition (1–5 scale)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md#line 250 (grade-progress-indicator token), #line 252 (session-history-list token)] — component visual spec, `Popover` requirement
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#line 137 (Grade progress indicator behavior), #line 139 (Session history list behavior), #line 185 ("First week" empty-state copy), #line 239 (session row is read-only in v1)] — interaction spec, verbatim empty-state copy
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/mockups/key-parent-dashboard.html#lines 429-504] — real layout order (activity strip → skill summary → grade progress → session history) and visual structure to match; ignore its prose date format ("7 tháng 7") as stale relative to this codebase's `dd/MM/yyyy` convention
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-2, #Consistency Conventions, #Capability Map] — layering rules, server action return shape
- [Source: _bmad-output/project-context.md] — layer rules, code style/naming, UX tokens
- [Source: _bmad-output/implementation-artifacts/4-2-skill-breakdown-view-skill-detail.md] — established `dashboard-repository.ts`/`actions.ts`/locale-file/client-invoked-action conventions, the "repo returns enum, component renders Vietnamese text" split, Epic 2 retro manual-verification gate (still unresolved from Stories 4.1 and 4.2)
- [Source: _bmad-output/implementation-artifacts/4-1-weekly-activity-strip-streak.md] — `WeeklyActivity.days` Monday-indexed convention (reused by `weekdayLabels`/`computeVnWeekdayIndex` in this story)
- [Source: src/infrastructure/repositories/dashboard-repository.ts] — existing `getWeeklyActivity`/`getCurrentStreak`/`getSkillBreakdown`/`getSkillSessionDetail` to extend; constants pattern to follow
- [Source: src/infrastructure/repositories/session-repository.ts#VN_OFFSET_MS, #computeVnDayBoundaryUtc, #formatVnDateLabel] — VN-timezone date/weekday utilities to extend (add `computeVnWeekdayIndex`), `Session.correctCount`/`questionCount` set by `completeSession()`
- [Source: src/app/(parent)/dashboard/actions.ts, page.tsx, loading.tsx] — files to extend
- [Source: src/locales/vi/dashboard.ts, src/locales/vi/profiles.ts#gradeBandLabels, src/locales/vi/skills.ts#skillDisplayName] — locale objects to extend/reuse; do not duplicate `gradeBandLabels`
- [Source: src/components/parent/skill-dashboard-section.tsx, skill-detail-panel.tsx] — client-invoked-server-action + client-side `useEffect` data-fetch precedent to follow for `SessionHistoryList`'s "Xem thêm" pagination
- [Source: src/components/ui/sheet.tsx] — `@base-ui/react` wrapper pattern to mirror for the new `popover.tsx`
- [Source: prisma/schema.prisma#Session, #SessionAnswer, #Question, #Skill] — `correctCount`/`questionCount` on `Session`; `difficultyLevelAtAnswer` nullable on `SessionAnswer`; `skillId`/`skill` relation on `Question`
- [Source: node_modules/@base-ui/react/popover/] — confirms `root`/`trigger`/`portal`/`positioner`/`popup`/`arrow`/`backdrop`/`close`/`description`/`title`/`viewport` submodules exist at the installed `@base-ui/react@1.6.0` version

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (bmad-dev-story workflow)

### Debug Log References

### Completion Notes List

- Extended `dashboard-repository.ts` with `getGradeProgress` (all-time avg `difficultyLevelAtAnswer`, mapped to `'early'|'mid'|'late'|null`) and `getSessionHistory` (paginated, newest-first, `skip`/`take = 30`), following the AD-2 data-only / no-Vietnamese-strings rule.
- Added `computeVnWeekdayIndex` to `session-repository.ts`, reusing the exact `(getUTCDay() + 6) % 7` Monday-indexed formula already used by `getWeeklyActivity`.
- Extended `getDashboardDataAction` to fold in `gradeProgress`, `gradeBand` (from the already-fetched `ChildProfile`), and the first page of `sessionHistory`; added `getMoreSessionHistoryAction` for "Xem thêm" client-invoked pagination, mirroring `getSkillDetailAction`'s established pattern.
- Added Vietnamese locale strings to `src/locales/vi/dashboard.ts` (grade progress + session history), reusing `profiles.gradeBandLabels` for the "Lớp N" portion rather than duplicating it.
- Built `src/components/ui/popover.tsx` — new `@base-ui/react/popover` wrapper (`Popover`, `PopoverTrigger`, `PopoverContent`), following `sheet.tsx`'s wrapping convention, sans backdrop since it's a small anchored tooltip.
- Built `GradeProgressIndicator` (renders `null` on `gradeProgress === null`, AC #3) and `SessionHistoryList` (client component, owns pagination `useState`, empty-state copy, and per-row Skill tags).
- Wired both new sections into `dashboard/page.tsx` (after `skill-card`, matching mockup order) and added matching `Skeleton` placeholders to `dashboard/loading.tsx`.
- Added unit test coverage for `getGradeProgress` (null case + all four boundary averages: 2.0/2.1/3.5/3.6) and `getSessionHistory` (Skill dedup, `correctCount`/`questionCount` reuse, skip/take pass-through, `completedAt: not null` exclusion) in `dashboard-repository.test.ts`. All 59 tests pass; `npx tsc --noEmit` and `pnpm lint` are clean.
- **Manual browser verification was not performed** — no browser/DB tool available in this session, same limitation Stories 4.1 and 4.2 recorded. Leaving Status at `review` rather than `done` per the story's own Task 9 instruction and the Epic 2 retro gate. A human should verify: zero-Session empty states, the four grade-progress boundary labels rendering correctly in the UI, Popover open/close behavior, >30-Session pagination end-of-list behavior, and the cross-parent `FORBIDDEN` check on `getMoreSessionHistoryAction`.

### File List

- `src/infrastructure/repositories/dashboard-repository.ts` (modified — `getGradeProgress`, `getSessionHistory`, `SessionHistoryRow`, new constants)
- `src/infrastructure/repositories/dashboard-repository.test.ts` (modified — added coverage)
- `src/infrastructure/repositories/session-repository.ts` (modified — `computeVnWeekdayIndex`)
- `src/app/(parent)/dashboard/actions.ts` (modified — extended `getDashboardDataAction`, added `getMoreSessionHistoryAction`)
- `src/app/(parent)/dashboard/page.tsx` (modified — render `GradeProgressIndicator` + `SessionHistoryList`)
- `src/app/(parent)/dashboard/loading.tsx` (modified — added skeletons)
- `src/locales/vi/dashboard.ts` (modified — grade progress + session history strings)
- `src/components/ui/popover.tsx` (new)
- `src/components/parent/grade-progress-indicator.tsx` (new)
- `src/components/parent/session-history-list.tsx` (new)

## Change Log

- 2026-07-23: Story created via bmad-create-story workflow.
- 2026-07-23: Implemented Story 4.3 (grade progress indicator, session history list, Popover primitive); all 9 tasks complete, 59 tests passing, lint/tsc clean. Manual browser verification outstanding — status set to `review`, not `done`.
