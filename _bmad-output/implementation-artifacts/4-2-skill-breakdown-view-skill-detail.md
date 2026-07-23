---
baseline_commit: 29a9dc0
---

# Story 4.2: Skill Breakdown View & Skill Detail

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to see how my child is doing per Skill and drill into any weak Skill in ≤ 3 taps,
so that I can identify exactly where they need more practice in under 30 seconds.

## Acceptance Criteria

1. **Given** the active Child Profile has attempted ≥ 5 Questions for a Skill (across all completed Sessions — FR-7's running accuracy, correct/total, not the adaptive-difficulty sliding window), **when** the skill summary section renders, **then** a `skill-badge-weak` ("Cần luyện", muted amber) shows for Skills with accuracy < 70%; a `skill-badge-strong` ("Tốt", muted green) for Skills ≥ 70% (FR-14). Weak badges are sorted before strong badges. Badges use `rounded-full` pill shape with both color and text label — never color alone (UX-DR9, UX-DR17).
2. **Given** a Skill has fewer than 5 attempts, **when** the skill summary renders, **then** the Skill appears as "Chưa đủ dữ liệu" with no badge (FR-14, A-12).
3. **Given** I tap a Skill badge, **when** the skill detail opens, **then** a `skill-detail-panel` (Sheet on ≤ md, push route on ≥ lg) shows: Skill name + accuracy % + badge, and the last 3 completed Sessions containing that Skill with per-session accuracy for that Skill only (e.g., "2/3 correct") (FR-14).
4. A parent can identify the weakest Skill in ≤ 3 taps from dashboard open (FR-14).
5. Skill data is accessible only to the owning Parent Account server-side (NFR-8) — every server action verifies `session.user.role === 'PARENT'` and Child Profile ownership, returning `{ error: { code: 'FORBIDDEN', ... } }` on mismatch (same pattern Story 4.1 established).
6. **Given** the active Child Profile has zero Sessions ever, **when** the dashboard renders, **then** the skill section shows "Chưa có dữ liệu kỹ năng. Bắt đầu luyện tập để xem kết quả." (UX-DR14, EXPERIENCE.md "No sessions ever" state) instead of four "Chưa đủ dữ liệu" rows.

## Tasks / Subtasks

- [x] Task 1: Add skill breakdown + skill detail queries to `dashboard-repository.ts` (AC: #1, #2, #3, #6)
  - [x] Add to the existing `src/infrastructure/repositories/dashboard-repository.ts` (do not create a new repository file — this is the established Parent Dashboard repository from Story 4.1; `getWeeklyActivity`/`getCurrentStreak` already live there and follow the same "one file per Server Component data need" pattern as `session-repository.ts`).
  - [x] Export:
    ```ts
    export interface SkillBreakdownRow {
      skillId: string
      code: string        // Skill.code — used to look up the Vietnamese display name via skillDisplayName()
      name: string         // Skill.name — DB fallback only, per skills.ts's documented convention
      attempts: number      // total answered questions for this Skill across all completed Sessions
      correct: number
      status: 'strong' | 'weak' | 'insufficient'  // 'insufficient' when attempts < 5
    }
    ```
  - [x] `getSkillBreakdown(childProfileId: string): Promise<SkillBreakdownRow[]>` — **do not reuse `getSkillAccuracyHistory` from `session-repository.ts`** — that function is a *different* concept (WINDOW_SIZE=10 sliding window feeding the adaptive-difficulty algorithm, AD-11). This story's accuracy is FR-7's **all-time running accuracy** (correct/total across every completed Session, no window). Implement as a single grouped query:
    ```ts
    const rows = await db.sessionAnswer.groupBy({
      by: ['questionId'], // placeholder — see note below
      where: { session: { childProfileId, completedAt: { not: null } }, answeredCorrectly: { not: null } },
      _count: true,
    })
    ```
    This groupBy shape is wrong for a skill rollup (SessionAnswer has no direct `skillId` column — it hangs off `question.skillId`). Prisma cannot `groupBy` across a relation field directly, so instead: fetch all qualifying `SessionAnswer` rows with `question: { select: { skillId: true } }` included, then reduce to per-`skillId` `{ attempts, correct }` in application code (small dataset per Child Profile — this mirrors the existing `getSkillAccuracyHistory` query shape in `session-repository.ts`, just without the `take: WINDOW_SIZE` and grouped instead of windowed). Then join against **all four seeded Skills** (`db.skill.findMany()`) so a Skill with zero attempts still appears as `insufficient` (AC #2) rather than being silently absent from the list.
  - [x] `hasAnyCompletedSession` is already computed by `getCurrentStreak` (Task 3 of Story 4.1) — **reuse that existing return value** in the server action (Task 2 below) to decide AC #6's "no sessions ever" empty state; do not add a second query for this.
  - [x] `getSkillSessionDetail(childProfileId: string, skillId: string): Promise<{ sessionId: string; completedAt: string; correct: number; total: number }[]>` — last 3 completed Sessions containing ≥1 answer for this Skill, most-recent-first:
    ```ts
    const answers = await db.sessionAnswer.findMany({
      where: { question: { skillId }, session: { childProfileId, completedAt: { not: null } } },
      select: { sessionId: true, answeredCorrectly: true, session: { select: { completedAt: true } } },
    })
    ```
    Group by `sessionId` in application code (same reduce pattern as above), sort by `session.completedAt` descending, take the first 3. Per-session accuracy is **scoped to this Skill only within that Session** — a Session with 10 mixed-Skill questions where 3 were this Skill reports "2/3", not the Session's overall score (re-read FR-14's consequence #3 and EXPERIENCE.md's UJ-2 worked example — this is the one place in this story most likely to be implemented wrong as "session overall score" instead of "session's per-Skill score").
  - [x] No repository function may contain business/presentation logic (AD-2) — no Vietnamese strings, no threshold-label ("Tốt"/"Cần luyện") strings inside the repository; the repository returns `status: 'strong' | 'weak' | 'insufficient'` (data), the component renders the Vietnamese label (presentation). The 70% threshold and 5-attempt floor are the only numeric constants needed — inline them as named constants at the top of `dashboard-repository.ts` (e.g. `const SKILL_STRONG_THRESHOLD = 0.70`, `const SKILL_MIN_ATTEMPTS = 5`); they are dashboard-view constants, not adaptive-difficulty constants, so they do **not** belong in `src/domain/constants.ts` (that file is exclusively AD-11's `WINDOW_SIZE`/`ACCURACY_UP_THRESHOLD`/`ACCURACY_DOWN_THRESHOLD` — do not add unrelated constants there).

- [x] Task 2: Extend the dashboard server action (AC: #1, #2, #3, #5, #6)
  - [x] In the existing `src/app/(parent)/dashboard/actions.ts`, add two new exported actions alongside `getDashboardDataAction` — **reuse the same `requireParentAccountId()` + `findChildProfileByIdForParent()` ownership-check pair already established in Task 3 of Story 4.1**; do not duplicate or re-derive this logic:
    ```ts
    export async function getSkillBreakdownAction(
      childProfileId: string,
    ): Promise<{ data: { skills: SkillBreakdownRow[]; hasAnyCompletedSession: boolean } } | { error: { code: string; message: string } }>

    export async function getSkillDetailAction(
      childProfileId: string,
      skillId: string,
    ): Promise<{ data: { sessions: SkillSessionDetail[] } } | { error: { code: string; message: string } }>
    ```
  - [x] `getSkillBreakdownAction` should call `getSkillBreakdown` and `getCurrentStreak` (for `hasAnyCompletedSession`) together — **or**, simpler and equally correct: extend `getDashboardDataAction`'s existing `Promise.all` to also fetch skill breakdown, since the dashboard page needs weekly activity, streak, and skill breakdown all on first render (they're all "page load" data, not "drill-in" data). Prefer extending `getDashboardDataAction` over adding a third top-level action **only if** it keeps the return type additive and doesn't force the skill-detail Sheet (which needs a second, on-demand `skillId`-scoped call) into the same shape. Recommendation: extend `getDashboardDataAction`'s return with `skillBreakdown: SkillBreakdownRow[]` (page-load data), and keep `getSkillDetailAction` as its own on-demand action (drill-in data, called from a client component when a badge is tapped).
  - [x] `getSkillDetailAction` is called from a Client Component (the tap-to-open interaction is inherently client-side), unlike every other action introduced so far in this project which is called from a Server Component. This is the **first client-invoked server action in the Parent Dashboard** — follow the exact calling convention already used by `switchActiveChildProfileAction` in `src/app/(parent)/profiles/actions.ts` (`'use server'` action imported directly into a `'use client'` component and awaited in an event handler — no fetch/API route needed).

- [x] Task 3: Add Vietnamese locale strings (AC: #1, #2, #3, #6)
  - [x] Extend `src/locales/vi/dashboard.ts` (do not create a new locale file — skill-breakdown copy is dashboard-content-scoped, same as `weeklySummary`/`streakLabel`):
    ```ts
    export const dashboard = {
      weeklySummary: (n: number) => `${n} buổi tuần này`,
      streakLabel: (n: number) => `${n} ngày`,
      noActiveProfile: '...',
      skillBadgeStrong: 'Tốt',
      skillBadgeWeak: 'Cần luyện',
      skillInsufficientData: 'Chưa đủ dữ liệu',
      noSkillDataEver: 'Chưa có dữ liệu kỹ năng. Bắt đầu luyện tập để xem kết quả.',
      skillDetailSessionAccuracy: (correct: number, total: number) => `${correct}/${total} câu đúng`,
    }
    ```
    Copy for `noSkillDataEver` is verbatim from `EXPERIENCE.md` line 184's "No sessions ever" row — do not paraphrase. `skillBadgeStrong`/`skillBadgeWeak` copy is verbatim from `DESIGN.md`'s `skill-badge-strong`/`skill-badge-weak` token labels (lines 133–145) and matches `epics.md`'s AC text exactly.
  - [x] Skill **names** ("Nhận diện quy luật", etc.) already exist in `src/locales/vi/skills.ts` via `skillDisplayName(code, fallback)` — reuse that function for the Skill name shown in both the summary section and the detail panel; do not duplicate skill-name strings in `dashboard.ts`.

- [x] Task 4: Build `skill-badge` component(s) (AC: #1, #2)
  - [x] Create `src/components/parent/skill-badge.tsx` — a single presentational component with a `status: 'strong' | 'weak' | 'insufficient'` prop rather than two separate `skill-badge-strong.tsx`/`skill-badge-weak.tsx` files (DESIGN.md names them as two token variants, but they share 100% of markup/behavior — only the color-token pair and label differ; one component keeps this DRY without losing the two token names from the design spec, which map directly to the `status` prop's two truthy branches).
  - [x] `rounded-full` pill. `strong` variant: `bg-[--color-skill-strong-bg]` / `text-[--color-skill-strong-fg]` (tokens already defined in `src/app/globals.css` lines 74–75, with dark-mode overrides at lines 101–102 — do not redefine these tokens, they exist from Story 1.1). `weak` variant: `bg-[--color-skill-weak-bg]` / `text-[--color-skill-weak-fg]` (globals.css lines 76–77 / 103–104). `insufficient`: no badge at all per AC #2 — render plain muted text, not a badge component.
  - [x] Label text always accompanies the color fill (never color alone, UX-DR17) — this is already satisfied by the component always rendering `dashboard.skillBadgeStrong`/`dashboard.skillBadgeWeak` text inside the pill, not just a colored dot.
  - [x] Badge is tappable (AC #3) — render as a `<button type="button">` (not a plain `<span>`) so it's keyboard/screen-reader accessible as an interactive control, matching the 44×44px touch-target floor (NFR-1) via padding.
  - [x] `data-slot="skill-badge"` per the existing `data-slot` convention (`weekly-activity-strip.tsx`, `question-card.tsx`).

- [x] Task 5: Build the `skill-summary-section` composition (AC: #1, #2, #4, #6)
  - [x] Create `src/components/parent/skill-summary-section.tsx` — presentational, receives `skills: SkillBreakdownRow[]` and `hasAnyCompletedSession: boolean` as props, plus an `onSkillTap: (skillId: string) => void` callback (the parent page/component owns the open/closed state of the skill-detail Sheet — keep this component a pure list + callback, no Sheet logic inside it).
  - [x] If `hasAnyCompletedSession` is `false`: render only `dashboard.noSkillDataEver` (AC #6) — do not render four "Chưa đủ dữ liệu" rows in this state; that would contradict the EXPERIENCE.md empty-state copy which is a single explanatory sentence, not a per-Skill list.
  - [x] Otherwise: render one row per Skill returned from `getSkillBreakdown` (all 4 seeded Skills always come back per Task 1's join-against-all-Skills design), grouped into labeled sub-sections in this order (matches `mockups/key-parent-dashboard.html` — see Task 7): a "Cần luyện thêm" group with all `status === 'weak'` Skills, then a "Tốt" group with all `status === 'strong'` Skills, then any `status === 'insufficient'` Skills last (no group heading needed for these — epics.md doesn't specify one; placing them last keeps the actionable weak/strong signal at the top, consistent with FR-14's "identify the weakest Skill in ≤3 taps" goal). This grouped rendering also satisfies AC #1's "weak badges sorted before strong badges" literally, since the weak group renders first.
  - [x] Each row: Skill name (`skillDisplayName(code, name)`) + either a `SkillBadge` (strong/weak) or plain `dashboard.skillInsufficientData` text (insufficient) — tapping a `strong`/`weak` row invokes `onSkillTap(skillId)`; an `insufficient` row is not tappable (there's no detail to show — 0–4 attempts, and Skill Detail's "last 3 Sessions" framing doesn't make sense for a Skill that hasn't crossed the AC #2 threshold).
  - [x] `data-slot="skill-summary-section"`.

- [x] Task 6: Build the `skill-detail-panel` component (AC: #3, #4)
  - [x] Create `src/components/parent/skill-detail-panel.tsx` as a `'use client'` component. **No existing component in this codebase implements DESIGN.md's "Sheet on ≤ md, push route on ≥ lg" responsive pattern** — the only Sheet precedent (`child-profile-switcher.tsx`) is a plain modal Sheet at all breakpoints, and this codebase has no Next.js parallel/intercepting routes anywhere. Recommended approach (keeps the same `<Sheet>` primitive at every breakpoint — no new routing pattern introduced): render the existing `Sheet`/`SheetContent` (from `@/components/ui/sheet`, side="right") for the ≤ md case, and additionally apply Tailwind responsive classes so the `SheetContent` at `≥ lg` renders `lg:static lg:inset-auto lg:w-auto lg:max-w-none lg:border-l lg:shadow-none` (non-modal, docked in the page flow) with `lg:` also hiding the `SheetOverlay` backdrop — this satisfies the *visual* "docked panel, not an overlay" intent of "push route on ≥ lg" without requiring an actual second route or intercepting-route setup. If this visual approximation is insufficient once seen in the browser, flag it in code review rather than building real parallel routes speculatively — a distinct `/dashboard` route for skill detail is a larger structural change than this story's scope otherwise calls for.
  - [x] Props: `{ open: boolean; onOpenChange: (open: boolean) => void; skillId: string | null; skillName: string; status: 'strong' | 'weak'; accuracy: number }` plus the fetched session list (fetched via `getSkillDetailAction` when `skillId` changes — call it inside a `useEffect` keyed on `skillId`, following no pre-existing async-Client-Component-data-fetch precedent in this codebase since every prior data fetch has been server-side; this is the first one).
  - [x] Content: Skill name + `{accuracy}%` + a `SkillBadge`, then a list of the last 3 Sessions: date (`formatVnDateLabel`-style `dd/MM/yyyy` — reuse the existing exported `formatVnDateLabel` from `session-repository.ts`, do not write a second date formatter) + `dashboard.skillDetailSessionAccuracy(correct, total)`.
  - [x] `data-slot="skill-detail-panel"`.

- [x] Task 7: Wire the dashboard page (AC: #1, #2, #3, #4, #5, #6)
  - [x] In `src/app/(parent)/dashboard/page.tsx`, extend the existing `getDashboardDataAction` call's rendered output to also render `<SkillSummarySection skills={...} hasAnyCompletedSession={...} onSkillTap={...} />` below the existing `WeeklyActivityStrip` inside the same `Card`, or a second `Card` — match whichever matches DESIGN.md's mockup (`mockups/key-parent-dashboard.html`) most closely; check that file for the actual layout before deciding.
  - [x] The page itself stays a Server Component; `SkillSummarySection`'s `onSkillTap` callback and the `SkillDetailPanel`'s open/closed state need a small Client Component wrapper (e.g. `src/components/parent/skill-dashboard-section.tsx`, `'use client'`) that owns `useState` for "which skillId is open" and renders both `SkillSummarySection` and `SkillDetailPanel` together — the Server Component page passes down the server-fetched `skills`/`hasAnyCompletedSession` data as props into this one client boundary, keeping the actual data fetch server-side (consistent with AD-2's Presentation/Application layering) while isolating the interactive open/close state to the smallest possible client island.
  - [x] `mockups/key-parent-dashboard.html` (lines 451–464) shows the real layout intent: a single `Card` labeled "Kỹ năng" containing two labeled sub-groups — "Cần luyện thêm" (weak badges) then "Tốt" (strong badges) — each a wrapping row of pills, rather than one flat sorted list. Match this two-group layout in `SkillSummarySection` (a "Cần luyện thêm" heading + weak badges, then a "Tốt" heading + strong badges) instead of a single interleaved list. **Ignore two details in that mockup as stale/illustrative:** it shows 5 Skills including "Tư duy số", which is not one of the canonical 4 Skills in `epics.md`'s "v1 Skill Enumeration" (`pattern-recognition`, `spatial-reasoning`, `classification`, `word-problem`) — the mockup predates that finalized list, so render only the 4 real Skills. It also suffixes badge labels with a `↗`/`✓` glyph — not specified by any AC or by `DESIGN.md`'s token spec — omit these glyphs unless product feedback asks for them later.
  - [x] Update `src/app/(parent)/dashboard/loading.tsx` to add Skeleton placeholders for the skill summary section (a few pill-shaped skeletons), matching the existing Skeleton pattern already in that file for the activity strip.

- [ ] Task 8: Tests and manual verification (all ACs) — automated portion complete; manual browser pass still outstanding, see subtask below
  - [x] Unit-test `getSkillBreakdown` and `getSkillSessionDetail` in `dashboard-repository.test.ts` (extend the existing file, same `vi.mock('@/lib/db', ...)` pattern as `getWeeklyActivity`/`getCurrentStreak`). Cover: a Skill with 0 attempts (`insufficient`), exactly 4 attempts (`insufficient` — boundary), exactly 5 attempts (crosses into strong/weak — boundary), accuracy exactly 70% (must be `strong`, since AC says "≥70%"), accuracy just under 70% (`weak`), a Session with answers spanning two Skills (per-Skill Session accuracy in `getSkillSessionDetail` must not conflate the two), more than 3 qualifying Sessions (only the 3 most recent returned), and answers from an incomplete Session (must be excluded, per FR-7 — reuse the same "exclude non-`completedAt` sessions" pattern the existing `getSkillAccuracyHistory`/`getCurrentStreak` queries already apply).
  - [x] No unit tests needed for `skill-badge.tsx`, `skill-summary-section.tsx`, or `skill-detail-panel.tsx` beyond type-checking — per the established Story 3.5/3.6/4.1 precedent, thin presentational/DOM composition is manually browser-verified, not unit-tested.
  - [ ] Manual verification pass (mandatory — the Epic 2 retro gate requiring a live browser check before marking any story done is still active, and **Story 4.1 was left `in-progress` specifically because this pass was never completed** — do not repeat that gap; if this dev-agent session also has no browser/DB tool available, leave this story at `review` rather than `done` and say so explicitly, exactly as Story 4.1's Dev Agent Record did):
    - A Child Profile with 0 completed Sessions: skill section shows only the single "Chưa có dữ liệu kỹ năng..." sentence, no per-Skill rows.
    - A Child Profile with 3 attempts on one Skill and 0 on the others: that Skill and all zero-attempt Skills show "Chưa đủ dữ liệu".
    - A Child Profile with ≥5 attempts on a Skill at exactly 70% and another just under 70%: correct badge on each, weak-badge Skill listed first.
    - Tap a weak badge: Sheet opens with the last 3 Sessions and correct per-Skill-per-Session accuracy (cross-check against a manually computed value from seed/test data).
    - Resize to ≥ lg width: confirm the panel's visual treatment reads as "docked", not as a full-screen modal overlay (see Task 6's approximation note — this is the step that determines whether that approximation is acceptable).
    - Confirm a parent cannot fetch another parent's Child Profile's skill breakdown or skill detail (direct action invocation with a foreign `childProfileId` returns `FORBIDDEN`, no data leaks) — same check pattern as Story 4.1's cross-parent verification.
  - [x] Run `pnpm lint`, `npx tsc --noEmit`, `pnpm test` — all must stay clean; all pre-existing tests must still pass.

## Dev Notes

- **This is a gap-closing/extension story on top of Story 4.1's foundation, not a new subsystem.** `dashboard-repository.ts`, `dashboard/actions.ts`, `dashboard/page.tsx`, `dashboard/loading.tsx`, and `src/locales/vi/dashboard.ts` all already exist from Story 4.1 — extend them in place. Only `skill-badge.tsx`, `skill-summary-section.tsx`, `skill-detail-panel.tsx`, and a small client-state wrapper component are net-new files.
- **Two different "accuracy" concepts exist in this codebase — do not conflate them:**
  1. `getSkillAccuracyHistory` in `session-repository.ts` — a `WINDOW_SIZE=10` **sliding window**, feeds `selectNextQuestion` (AD-11, adaptive difficulty). Not used by this story.
  2. This story's Skill Breakdown — **all-time running accuracy** (FR-7: "correct / total attempts... across all completed Sessions"), no window, no `take` limit. This is a new query, not a reuse of #1.
  Mixing these up would produce a Skill Breakdown that silently only reflects the child's most recent 10 answers instead of their full history — a subtle, hard-to-spot correctness bug.
- **`Session.completedAt: null` sessions (in-progress or abandoned) must be excluded from every query in this story** — same FR-7 rule Story 4.1 already applied to `getCurrentStreak`/`getWeeklyActivity`. `SessionAnswer` has stub rows created eagerly at Session start (`answeredCorrectly: null` until answered — see `createSession` in `session-repository.ts`) — filter on `session.completedAt: { not: null }` (excludes the whole session, including its answered questions, if abandoned) **and** `answeredCorrectly: { not: null }` (excludes any not-yet-answered stub within an otherwise-completed session, which shouldn't occur in practice but is defensive) as the existing `getSkillAccuracyHistory` query already does — mirror that exact filter shape.
- **Layer compliance (AD-2), same as Story 4.1:** `dashboard-repository.ts` (Infrastructure) does data aggregation only — no Vietnamese strings, no "Tốt"/"Cần luyện" label text, just `status: 'strong' | 'weak' | 'insufficient'`. `actions.ts` (Application) is the only entry point from Presentation, begins with the session check, never throws. Presentation components import only from actions/props, never reach into the repository directly.
- **The skill-detail Sheet introduces this codebase's first client-invoked server action and first client-side data fetch** (every prior Parent Dashboard data need has been server-rendered). Follow `switchActiveChildProfileAction`'s calling convention (`'use server'` action imported into a `'use client'` component, awaited directly in an event handler — no new fetch/API-route layer).
- **The "Sheet on ≤ md, push route on ≥ lg" responsive requirement has no existing implementation pattern in this codebase to reuse** (see Task 6). The recommended approach approximates the visual intent with CSS breakpoint classes on the existing `Sheet` primitive rather than introducing Next.js parallel/intercepting routes for the first time in this project — a structural addition disproportionate to this story's scope. Confirm the approximation reads correctly in the browser during Task 8's manual pass; if it doesn't, that's a code-review-time discussion, not a blocker to implementing the rest of the story.
- **No schema changes.** `Question.skillId`, `Session.completedAt`, `SessionAnswer.answeredCorrectly` are all that's needed — no migration required. `Skill` has exactly 4 rows (seeded in Story 3.2/upserted by `prisma/seed.ts`); `getSkillBreakdown`'s join-against-all-Skills should use `db.skill.findMany()` (small, unfiltered — 4 rows).
- **70% threshold and 5-attempt floor are dashboard-view constants** (`SKILL_STRONG_THRESHOLD = 0.70`, `SKILL_MIN_ATTEMPTS = 5`), not adaptive-difficulty constants — do not add them to `src/domain/constants.ts` (that file is AD-11-scoped only: `WINDOW_SIZE`, `ACCURACY_UP_THRESHOLD`, `ACCURACY_DOWN_THRESHOLD`). Declare them locally in `dashboard-repository.ts`.
- **Boundary precision matters for the unit tests:** AC #1 says "≥70%" is strong and "<70%" is weak — exactly 70% is `strong`. AC #2's "≥5 Questions" means exactly 5 attempts already qualifies (crosses out of `insufficient`); exactly 4 does not.

### Project Structure Notes

- New files: `src/components/parent/skill-badge.tsx`, `src/components/parent/skill-summary-section.tsx`, `src/components/parent/skill-detail-panel.tsx`, `src/components/parent/skill-dashboard-section.tsx` (client-state wrapper, exact name at dev's discretion).
- Modified files: `src/infrastructure/repositories/dashboard-repository.ts` (add `getSkillBreakdown`, `getSkillSessionDetail`, `SkillBreakdownRow`/`SkillSessionDetail` types), `src/infrastructure/repositories/dashboard-repository.test.ts` (add coverage), `src/app/(parent)/dashboard/actions.ts` (extend `getDashboardDataAction`, add `getSkillDetailAction`), `src/app/(parent)/dashboard/page.tsx` (render skill section), `src/app/(parent)/dashboard/loading.tsx` (add skill-section skeletons), `src/locales/vi/dashboard.ts` (add skill-breakdown strings).
- Matches the Architecture Spine's capability map row "Parent Dashboard — Skill breakdown (FR-9–FR-14) → `src/app/(parent)/dashboard/`" and Story 4.1's already-established `src/components/parent/` location convention.
- No conflicts detected — this story's file plan extends Story 4.1's files in place rather than creating a parallel/competing structure.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2: Skill Breakdown View & Skill Detail] — verbatim AC basis
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-14, #A-4, #A-12, #Glossary] — 70% threshold (A-4), 5-attempt floor (A-12), Skill/Session definitions
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md#lines 133-145 (skill-badge tokens), #line 235 (skill badge spec), #line 249 (skill-summary-section), #line 253 (skill-detail-panel)] — component visual spec, token names
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#lines 135-140 (Parent Mode Components), #line 184 (no-sessions-ever empty state), #lines 335-341 (UJ-2 worked example)] — interaction spec, verbatim empty-state copy, worked accuracy example
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-2, #Consistency Conventions, #Capability Map] — layering rules, server action return shape
- [Source: _bmad-output/project-context.md] — layer rules, code style/naming
- [Source: _bmad-output/implementation-artifacts/4-1-weekly-activity-strip-streak.md] — established `dashboard-repository.ts`/`actions.ts`/locale-file conventions, VN-timezone utility reuse pattern, FORBIDDEN error code precedent, Epic 2 retro manual-verification gate (still unresolved from that story)
- [Source: src/infrastructure/repositories/dashboard-repository.ts] — existing `getWeeklyActivity`/`getCurrentStreak` to extend; `WeeklyActivity` interface shape to mirror
- [Source: src/infrastructure/repositories/session-repository.ts] — `getSkillAccuracyHistory` (the *different*, window-based concept — do not reuse for this story), `formatVnDateLabel`, `computeVnDayBoundaryUtc`
- [Source: src/app/(parent)/dashboard/actions.ts, page.tsx, loading.tsx] — files to extend
- [Source: src/locales/vi/dashboard.ts, src/locales/vi/skills.ts] — `dashboard` object to extend, `skillDisplayName()` to reuse
- [Source: src/components/parent/child-profile-switcher.tsx] — only existing Sheet + client-invoked-server-action precedent in this codebase
- [Source: src/components/ui/sheet.tsx] — `Sheet`/`SheetContent` primitive (`@base-ui/react/dialog`-backed), `side` prop, existing class structure to extend with `lg:` overrides
- [Source: src/app/globals.css#lines 74-77, 101-104] — `--color-skill-strong-bg/fg`, `--color-skill-weak-bg/fg` tokens (light + dark), already defined from Story 1.1
- [Source: prisma/schema.prisma#Skill, #Question, #Session, #SessionAnswer] — `skillId` on `Question` (not `SessionAnswer` directly — must join through `question`), `completedAt` nullability, `@@unique([sessionId, questionId])`
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/mockups/key-parent-dashboard.html] — check for skill-section layout placement relative to the weekly activity strip before wiring Task 7

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

None — no failures encountered during implementation. One test-authoring mistake was caught and fixed locally: the initial "exactly 5 attempts" boundary test used 4 correct/1 incorrect (80% accuracy, `strong`) when the intent was to test the insufficient→weak boundary; corrected to 3 correct/2 incorrect (60%, `weak`) before the full suite was run.

### Completion Notes List

- Added `getSkillBreakdown` and `getSkillSessionDetail` to `dashboard-repository.ts` (AD-2 compliant — no Vietnamese/presentation logic), joining against all 4 seeded Skills so zero-attempt Skills still appear as `insufficient` rather than being silently absent.
- Extended `getDashboardDataAction`'s existing `Promise.all` with `getSkillBreakdown` (page-load data) and added a new on-demand `getSkillDetailAction` for the skill-detail Sheet, reusing the established `requireParentAccountId` + `findChildProfileByIdForParent` ownership-check pair — no new auth logic duplicated.
- Added `skillBadgeStrong`/`skillBadgeWeak`/`skillInsufficientData`/`noSkillDataEver`/`skillDetailSessionAccuracy`/`skillSectionTitle`/`skillGroupWeak`/`skillGroupStrong` to `src/locales/vi/dashboard.ts`, verbatim per EXPERIENCE.md/DESIGN.md copy.
- Built `SkillBadge` (single component, `status` prop), `SkillSummarySection` (two-group weak/strong layout matching the mockup, insufficient rows last, no group heading), and `SkillDetailPanel` (`'use client'`, first client-invoked server action + first client-side `useEffect` data fetch in this codebase).
- Extended the shared `SheetContent` primitive (`src/components/ui/sheet.tsx`) with an `overlayClassName` prop so `SkillDetailPanel` can hide the backdrop at `≥lg` via `lg:hidden` — needed because `SheetOverlay` is rendered internally by `SheetContent` and wasn't otherwise reachable from a CSS sibling/descendant selector. This is additive/backward-compatible; `ChildProfileSwitcher`'s existing `Sheet` usage is unaffected (prop defaults to `undefined`).
- Added `SkillDashboardSection` (`'use client'` wrapper) owning the open-skill state, wired into `dashboard/page.tsx` as a second `Card`, and added matching pill-shaped `Skeleton` placeholders to `loading.tsx`.
- Unit tests added in `dashboard-repository.test.ts` covering: 0-attempt Skill (`insufficient`), exactly-4-attempts boundary (`insufficient`), exactly-5-attempts boundary (crosses to `weak`), exactly-70%-accuracy boundary (`strong`), just-under-70% (`weak`), a Session spanning two Skills (per-Skill accuracy not conflated), and more-than-3-qualifying-Sessions (only 3 most recent, most-recent-first). All 50 project tests pass (`npx vitest run`); `npx tsc --noEmit` and `npx next lint` are clean (only pre-existing, unrelated `<img>` warnings in `mascot.tsx`/`question-card.tsx`).
- **Outstanding: the mandatory manual/live-browser verification pass (Task 8) was NOT performed.** This dev-agent session has no browser or live-database tool available, so the Task 8 checklist items (empty-state rendering, insufficient/weak/strong badge correctness at real thresholds, tap-to-open Sheet content, the `≥lg` "docked panel" visual approximation, cross-parent `FORBIDDEN` check) are unverified beyond code reasoning and unit tests. Per the standing Epic 2 retro gate and this story's own Dev Notes, the story is left at `review` (not `done`) for this reason.

### File List

- `src/infrastructure/repositories/dashboard-repository.ts` (modified — added `getSkillBreakdown`, `getSkillSessionDetail`, `SkillBreakdownRow`, `SkillSessionDetail`, `SKILL_STRONG_THRESHOLD`, `SKILL_MIN_ATTEMPTS`)
- `src/infrastructure/repositories/dashboard-repository.test.ts` (modified — added coverage for the two new queries)
- `src/app/(parent)/dashboard/actions.ts` (modified — extended `getDashboardDataAction`, added `getSkillDetailAction`)
- `src/app/(parent)/dashboard/page.tsx` (modified — renders `SkillDashboardSection` in a second `Card`)
- `src/app/(parent)/dashboard/loading.tsx` (modified — added skill-section skeleton placeholders)
- `src/locales/vi/dashboard.ts` (modified — added skill-breakdown strings)
- `src/components/parent/skill-badge.tsx` (new)
- `src/components/parent/skill-summary-section.tsx` (new)
- `src/components/parent/skill-detail-panel.tsx` (new)
- `src/components/parent/skill-dashboard-section.tsx` (new)
- `src/components/ui/sheet.tsx` (modified — added optional `overlayClassName` prop to `SheetContent`)

## Change Log

- 2026-07-23: Story created via bmad-create-story workflow.
- 2026-07-23: Implemented Tasks 1–7 (skill breakdown/detail repository queries, dashboard server actions, Vietnamese locale strings, `SkillBadge`/`SkillSummarySection`/`SkillDetailPanel`/`SkillDashboardSection` components, dashboard page + loading skeleton wiring) and the automated portion of Task 8 (unit tests, lint, tsc, full test suite — all green, 50/50). Manual/live-browser verification (Task 8's mandatory checklist) not performed — no browser tool available in this session. Status set to `review` per this story's Dev Notes guidance.
