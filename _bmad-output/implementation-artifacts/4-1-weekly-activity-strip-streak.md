---
baseline_commit: 5ce6dbe
---

# Story 4.1: Weekly Activity Strip & Streak

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to see which days this week my child practiced and their current streak,
so that I can track consistency at a glance.

## Acceptance Criteria

1. **Given** I open the Parent Dashboard for a Child Profile with completed Sessions, **when** the dashboard renders, **then** a `weekly-activity-strip` shows 7 circles (Mon–Sun) for the current week in Asia/Ho_Chi_Minh timezone; days with ≥ 1 completed Session are filled orange (`primary`); days without are empty muted circles (FR-13).
2. The current Streak (consecutive calendar days with ≥ 1 completed Session, Asia/Ho_Chi_Minh timezone) is displayed (e.g., "4 ngày") (FR-13).
3. The weekly summary updates within 60 seconds of a Session completion (NFR-7) — satisfied by always computing fresh from `Session.completedAt` with no caching layer.
4. For a Child Profile with no Sessions ever, the activity strip shows all empty circles and **no streak count** is rendered at all (UX-DR14).
5. The dashboard renders via a Next.js Server Component; `Skeleton` placeholders show in the activity strip and streak positions while loading (UX-DR14).
6. All dashboard server actions verify `session.user.role === 'PARENT'` and that the requested `ChildProfile.parentAccountId` matches the session's `parentAccountId`; mismatches return `{ error: { code: 'FORBIDDEN' } }` (NFR-8, NFR-10).

## Tasks / Subtasks

- [x] Task 1: Extend the VN-timezone day-boundary utility to support arbitrary day offsets (AC: #1, #2)
  - [x] In `src/infrastructure/repositories/session-repository.ts`, change `computeVnDayBoundaryUtc(now: Date)` to `computeVnDayBoundaryUtc(now: Date, dayOffset = 0)`. Add `dayOffset` (in whole days, may be negative) to the `Date.UTC(...)` call: `Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate() + dayOffset)`. This is a backward-compatible signature change (default `0` preserves every existing call site: `countQuestionsAnsweredToday`, and any Story 3.x callers) — do not touch any other line of this function.
  - [x] Do not create a second VN-timezone utility. `VN_OFFSET_MS = 7 * 3600_000` and the "fixed UTC+7, no DST, pure millisecond arithmetic" approach already solved in this file is the one and only timezone primitive for this story — reuse `computeVnDayBoundaryUtc` and `formatVnDateLabel` (already exported) for both the weekly strip and the streak walk-back below.

- [x] Task 2: Create `src/infrastructure/repositories/dashboard-repository.ts` (AC: #1, #2, #4)
  - [x] Export an interface (no domain entity needed — this is a view-model, not a persisted concept):
    ```ts
    export interface WeeklyActivity {
      days: boolean[] // index 0 = Monday ... 6 = Sunday, true if ≥1 completed Session that VN calendar day
      weeklySessionCount: number // total completed Sessions this VN week (not distinct days — a child can complete >1 Session/day)
      streak: number
      hasAnyCompletedSession: boolean // false ⇒ AC #4: caller must render zero streak text at all
    }
    ```
  - [x] `getWeeklyActivity(childProfileId: string, now: Date = new Date()): Promise<Pick<WeeklyActivity, 'days' | 'weeklySessionCount'>>` — one query, week-scoped:
    - Compute `daysSinceMonday` from the VN weekday of `now`: `nowVn.getUTCDay()` is 0=Sun..6=Sat; `const daysSinceMonday = (nowVn.getUTCDay() + 6) % 7` maps Mon→0 ... Sun→6.
    - Week range: `weekStartUtc = computeVnDayBoundaryUtc(now, -daysSinceMonday).todayStartUtc`; `weekEndUtc = computeVnDayBoundaryUtc(now, -daysSinceMonday + 6).todayEndUtc`.
    - `db.session.findMany({ where: { childProfileId, completedAt: { gte: weekStartUtc, lt: weekEndUtc } }, select: { completedAt: true } })`.
    - `weeklySessionCount = rows.length`.
    - For each `i` in 0..6: compute that day's `[todayStartUtc, todayEndUtc)` via `computeVnDayBoundaryUtc(now, -daysSinceMonday + i)` and set `days[i] = rows.some(r => r.completedAt! >= start && r.completedAt! < end)`.
  - [x] `getCurrentStreak(childProfileId: string, now: Date = new Date()): Promise<{ streak: number; hasAnyCompletedSession: boolean }>` — one all-time query (no pagination/date-window needed: per `project-context.md` the intended cadence is one Session/day, so per-child completed-Session volume stays small for the foreseeable v1 lifetime — do not add artificial `take`/date-range limits here, they would silently truncate a long streak):
    - `const rows = await db.session.findMany({ where: { childProfileId, completedAt: { not: null } }, select: { completedAt: true } })`.
    - If `rows.length === 0`, return `{ streak: 0, hasAnyCompletedSession: false }`.
    - Build `const activeDays = new Set(rows.map(r => formatVnDateLabel(r.completedAt!)))` (reuse the already-exported `formatVnDateLabel` purely as a stable VN-calendar-day key — its `dd/MM/yyyy` format is incidental, just needs to be a unique-per-VN-day string).
    - Walk-back algorithm (streak is "alive" through the current day until it fully passes with no Session — do not reset it to 0 just because *today* has no Session yet):
      ```
      function activeOnOffset(offset) {
        const { todayStartUtc } = computeVnDayBoundaryUtc(now, offset)
        return activeDays.has(formatVnDateLabel(todayStartUtc))
      }
      let offset = 0
      if (!activeOnOffset(0)) {
        offset = -1
        if (!activeOnOffset(-1)) return { streak: 0, hasAnyCompletedSession: true }
      }
      let streak = 0
      while (activeOnOffset(offset)) { streak++; offset-- }
      return { streak, hasAnyCompletedSession: true }
      ```
      i.e.: if today already has a completed Session, count backward from today; else if yesterday has one, count backward from yesterday (today just hasn't happened yet, streak isn't broken); else the streak is 0.
  - [x] No repository function may contain business/presentation logic beyond this date-bucketing (AD-2) — no Vietnamese strings, no JSX, no formatting for display beyond the boolean/number view-model above.

- [x] Task 3: Add the dashboard server action (AC: #6)
  - [x] Create `src/app/(parent)/dashboard/actions.ts` (`'use server'`). Reuse `requireParentAccountId` — **already exported** from `src/app/(parent)/profiles/actions.ts` (`import { requireParentAccountId } from '@/app/(parent)/profiles/actions'`) — do not duplicate this function; it already returns `{ error: { code: 'UNAUTHORIZED', ... } }` for "no session" / "not a PARENT", which is exactly the AC #6 role check.
  - [x] For the ownership check, reuse `findChildProfileByIdForParent(id, parentAccountId)` — **already exported** from `src/infrastructure/repositories/child-profile-repository.ts` (returns `null` if the profile doesn't exist *or* belongs to a different parent — do not add a second lookup to distinguish those two cases; per AC #6 both must produce the same `FORBIDDEN` response, so a single null-check is correct and intentionally does not leak which case occurred).
  - [x] Implement:
    ```ts
    export async function getDashboardDataAction(
      childProfileId: string,
    ): Promise<{ data: { weeklyActivity: WeeklyActivity } } | { error: { code: string; message: string } }> {
      const resolved = await requireParentAccountId()
      if ('error' in resolved) return resolved

      const childProfile = await findChildProfileByIdForParent(childProfileId, resolved.parentAccountId)
      if (!childProfile) {
        return { error: { code: 'FORBIDDEN', message: 'Child profile does not belong to this account' } }
      }

      const [weekly, streakResult] = await Promise.all([
        getWeeklyActivity(childProfileId),
        getCurrentStreak(childProfileId),
      ])

      return { data: { weeklyActivity: { ...weekly, ...streakResult } } }
    }
    ```
  - [x] `FORBIDDEN` is a **new** error code, introduced by this story specifically for the ownership-mismatch case (NFR-8/NFR-10). It does not exist anywhere else in the codebase today — the closest precedent, `switchActiveChildProfileAction` in `profiles/actions.ts`, deliberately returns `NOT_FOUND` for this same mismatch (to avoid leaking profile existence in a user-facing rename/delete flow). Follow this story's explicit AC (`FORBIDDEN`) rather than copying that `NOT_FOUND` precedent — the two flows have different UX needs (this one is cookie-driven, not a user-supplied ID form).

- [x] Task 4: Build the `weekly-activity-strip` component (AC: #1, #2, #4)
  - [x] Create `src/components/parent/weekly-activity-strip.tsx` — a plain presentational component, no `'use client'` needed (no hooks/interactivity; the DESIGN.md/EXPERIENCE.md spec's "tap a day to see that day's sessions" interaction is **explicitly out of scope for this story** — it is not in this story's ACs or in `epics.md`'s Story 4.1 section; do not implement it, and do not build the strip in a way that blocks adding it later, e.g. keep `days` as a clean prop rather than baking non-interactive markup that would need a rewrite).
  - [x] Props: `{ days: boolean[]; weeklySessionCount: number; streak: number; hasAnyCompletedSession: boolean }`.
  - [x] Render 7 `rounded-full` circles in a row, Mon→Sun left-to-right, matching `DESIGN.md`'s component spec ("custom row, `rounded-full` dots; filled = `colors.primary`, empty = muted") — filled dot uses the `primary` design token (`bg-primary` if already mapped in Tailwind config; verify against the token names used elsewhere, e.g. `child-profile-switcher.tsx`), empty dot uses a muted/neutral fill (e.g. `bg-muted`) — never convey the state by color alone here since there's no accompanying icon/text per dot; this is acceptable per UX-DR17 because the strip is decorative-summary data (not a required-action control) and is always paired with the adjacent weekly-count/streak text that states the same information in words.
  - [x] Above or beside the strip, render `dashboard.weeklySummary(weeklySessionCount)` (e.g. "4 buổi tuần này").
  - [x] If `hasAnyCompletedSession` is `true`, render `dashboard.streakLabel(streak)` (e.g. "4 ngày"). If `hasAnyCompletedSession` is `false`, render **no streak text at all** (AC #4) — not "0 ngày", not a placeholder, nothing.
  - [x] Component uses `data-slot="weekly-activity-strip"` following the existing `data-slot` convention seen on `question-card.tsx` / `loading.tsx`.

- [x] Task 5: Wire the dashboard page (AC: #1, #2, #4, #5)
  - [x] Convert `src/app/(parent)/dashboard/page.tsx` from its current stub (`export default function ParentDashboardPage() { return <main>Parent dashboard — coming soon</main> }`) to an `async` Server Component.
  - [x] Read the active Child Profile the same way `(parent)/layout.tsx` already does: `const activeProfileId = await getChildProfileId(await headers())` (`@/lib/child-profile-cookie`). The layout computes this independently for its own header UI — Next.js does not let a layout pass props to its page, so the page must call this again itself; this is expected, not a duplication bug.
  - [x] If `activeProfileId` is `null` (parent has no Child Profiles yet, or none selected), render a minimal prompt directing to `/profiles` — this is a necessary guard against a crash, not a new feature; keep it to one or two lines, no new locale section needed beyond a single string.
  - [x] Otherwise call `getDashboardDataAction(activeProfileId)`. On `{ error }`, render a simple inline message (reuse the pattern anywhere else in the codebase renders action errors, or a plain paragraph — there is no dedicated error-card component yet in this codebase to reuse, so keep this minimal and do not build a generic error-card system as a side effect of this story).
  - [x] On success, render `<WeeklyActivityStrip {...result.data.weeklyActivity} />` inside a `Card` (matching `rounded-brand-lg`/`rounded-brand-xl` adult-surface convention — adult surfaces use `sm`/`md` per `project-context.md`, so use `rounded-brand-sm` or `rounded-brand-md`, not the student-surface `lg`/`xl` tokens).
  - [x] Create `src/app/(parent)/dashboard/loading.tsx` following the exact shape of `src/app/(student)/session/[sessionId]/loading.tsx` (shadcn `Skeleton` inside a `Card`) — this satisfies AC #5's "Skeleton placeholders" automatically via Next.js's file-convention Suspense boundary; do not add manual client-side loading state to the page component itself.

- [x] Task 6: Add Vietnamese locale strings (AC: #2, #4)
  - [x] Create `src/locales/vi/dashboard.ts` (no `dashboard.ts` exists yet — `src/locales/vi/` currently has `auth.ts`, `common.ts`, `profiles.ts`, `skills.ts`, `student.ts`; this is the correct new per-surface file, following that existing convention):
    ```ts
    export const dashboard = {
      weeklySummary: (n: number) => `${n} buổi tuần này`,
      streakLabel: (n: number) => `${n} ngày`,
      noActiveProfile: '...', // guard string for Task 5's null-activeProfileId case — pick concise, non-committal copy
    }
    ```
  - [x] `weeklySummary`/`streakLabel` copy is taken verbatim from `EXPERIENCE.md`'s Flow 2 (UJ-2) worked example: *"4 buổi tuần này" with activity strip ... Streak: "4 ngày"* — do not invent alternate phrasing.
  - [x] `common.parentNavDashboard` (`'Tổng quan'`) already exists in `common.ts` and stays there — it's nav-scoped, not dashboard-content-scoped; do not move it.

- [ ] Task 7: Tests and manual verification (all ACs) — automated portion complete; manual browser pass still outstanding, see subtask below
  - [x] Unit-test the pure/near-pure logic in `dashboard-repository.ts` following the existing precedent (`session-repository.test.ts` already tests this file's sibling functions) — specifically the Monday-boundary math and the streak walk-back algorithm. Cover: no completed Sessions (streak 0, `hasAnyCompletedSession` false), Session today only (streak 1), consecutive-day streak of N, streak broken by a gap day, Session yesterday but not today (streak still counts, not reset), week boundary crossing (a Session late Sunday VN / a Session early Monday VN land in the correct week bucket), and a Session exactly at a VN day boundary instant.
  - [x] No unit tests are meaningful for `weekly-activity-strip.tsx` or `dashboard/page.tsx` beyond type-checking — per the 3.5/3.6/3.7/3.8 precedent, thin presentational/DOM composition is manually browser-verified, not unit-tested.
  - [ ] Manual verification pass (mandatory — the Epic 2 retro gate requiring a live browser check before marking any story done is still active): **NOT performed in this session — no browser/live-DB tooling was available to this dev agent.** Automated coverage (unit tests + `tsc` + `lint`) is complete and green, and the following checks were reasoned through against the code but still need a real human/browser pass before this story is marked `done`:
    - A Child Profile with no completed Sessions ever: dashboard shows 7 empty circles, no streak text at all, no crash.
    - A Child Profile with Sessions on some days this week: correct days filled, correct `weeklySessionCount`.
    - A Child Profile with a Session completed today: streak includes today.
    - A Child Profile with a Session completed yesterday but not yet today: streak still shows the pre-today count (not reset to 0).
    - Complete a new Session and reload the dashboard: activity strip and streak reflect it immediately (no manual cache-bust needed, since every load queries fresh — confirms AC #3 with no additional revalidation code required).
    - Attempt to load the dashboard for a `childProfileId` belonging to a different parent (e.g. via direct action invocation in dev tools, since the cookie itself is signed and can't be forged normally) — confirm `FORBIDDEN` is returned and no data leaks.
    - Confirm the `loading.tsx` Skeleton renders during a simulated slow network (devtools throttling) before the real content appears.
  - [x] Run `pnpm lint`, `npx tsc --noEmit`, `pnpm test` — all clean; existing tests still pass (43/43).

## Dev Notes

- **This story is new-build, not gap-closing** (unlike 3.8) — Epic 4 has no prior story, so there is no "Previous Story Intelligence" section below; this is the first story in the epic (the workflow already flipped `epic-4` to `in-progress` in `sprint-status.yaml` as a result).
- **The hard part is already solved — reuse, don't reinvent:** `computeVnDayBoundaryUtc` and `formatVnDateLabel` in `session-repository.ts` already correctly implement Asia/Ho_Chi_Minh (fixed UTC+7, no DST) day-boundary math as plain millisecond arithmetic — no `Intl.DateTimeFormat`, no date-fns-tz, no new timezone library. This story only needs to generalize that one function with an optional `dayOffset` parameter (Task 1) and build on top of it. Do not write a second, parallel timezone utility.
- **Streak is computed on read, always — there is no `Streak` field or cache anywhere in `prisma/schema.prisma`.** This is deliberate: it trivially satisfies NFR-7 ("updates within 60 seconds of a Session completion") since there is nothing to invalidate — every dashboard load queries `Session.completedAt` fresh. Do not add a cached/denormalized streak column as an "optimization" — it is unnecessary at this data volume and would introduce a staleness/invalidation problem this design doesn't have.
- **Streak semantics — a subtle point, get this exact:** the Streak "survives" the current calendar day until that day fully passes with no completed Session (per the PRD glossary: *"resets to 0 if a calendar day passes with no completed Session"*). Concretely: if today has no Session yet but yesterday did, the streak still counts through yesterday (today just hasn't happened yet) — it does **not** reset to 0 merely because today is incomplete. Only when a full day passes with zero Sessions does the chain break. See Task 2's walk-back pseudocode for the exact algorithm; do not simplify this to "count consecutive days ending today" as that would incorrectly zero the streak every morning before the child has practiced.
- **`hasAnyCompletedSession` vs. `streak === 0` are different things and must not be conflated:** a Child Profile that has practiced before but broke its streak still has `hasAnyCompletedSession: true` and should show "0 ngày" (informational, not hidden). Only a Child Profile with **zero completed Sessions ever** suppresses the streak text entirely (AC #4). Get this wrong and either a legitimately-broken streak silently disappears, or a brand-new profile shows a confusing "0 ngày".
- **`weeklySessionCount` counts Sessions, not distinct days** — a child can complete more than one Session in a day; the "N buổi tuần này" copy (verbatim from `EXPERIENCE.md`'s worked example) refers to total Sessions, while the 7-circle strip is a distinct per-day boolean. Do not conflate the two into a single number.
- **Streak is parent-facing and informational only — never gamified, never shown to students.** `DESIGN.md`'s rejected-patterns note is explicit: *"Streaks displayed to students: Streaks create anxiety for young children when broken."* Keep the streak display plain text (no fire emoji, no celebration animation, no badge styling) — this is a deliberate product-philosophy constraint, not an oversight to "improve."
- **New `FORBIDDEN` error code is intentional, not an inconsistency to "fix" toward the existing `NOT_FOUND`/`UNAUTHORIZED` codes** — see Task 3 for why this story's AC calls for a distinct code from the `profiles/actions.ts` precedent.
- **UX spec detail intentionally deferred:** `EXPERIENCE.md`'s Parent Mode Components table describes an additional interaction — *"Tap on a day shows session(s) from that day"* — that is **not** in this story's ACs (nor in `epics.md`'s Story 4.1 section, which is the authoritative AC source). Do not implement it as a side effect of this story; Story 4.3 ("Session History") is the more natural home for session-level drill-down if/when it's prioritized. Building `weekly-activity-strip.tsx` with a clean `days: boolean[]` prop (Task 4) keeps this addable later without rework.
- **Layer compliance (AD-2):** `dashboard-repository.ts` (Infrastructure) does date-bucketing only, no Vietnamese strings/JSX; `actions.ts` (Application) is the only entry point from Presentation, begins with the session check, never throws; `weekly-activity-strip.tsx` and `dashboard/page.tsx` (Presentation) import only from the action and component props — never reach into the repository directly.
- **No schema changes.** `Session.completedAt` (nullable `DateTime`) and its existing `@@index([childProfileId, completedAt])` are exactly what both queries need — no migration required.

### Project Structure Notes

- New files: `src/infrastructure/repositories/dashboard-repository.ts`, `src/infrastructure/repositories/dashboard-repository.test.ts`, `src/app/(parent)/dashboard/actions.ts`, `src/app/(parent)/dashboard/loading.tsx`, `src/components/parent/weekly-activity-strip.tsx`, `src/locales/vi/dashboard.ts`.
- Modified files: `src/infrastructure/repositories/session-repository.ts` (add `dayOffset` param to `computeVnDayBoundaryUtc` — backward-compatible default), `src/app/(parent)/dashboard/page.tsx` (stub → async Server Component).
- Matches the Architecture Spine's capability map row "Parent Dashboard — Skill breakdown (FR-9–FR-14) → `src/app/(parent)/dashboard/`" and the anticipated `src/components/parent/` location for dashboard-specific components.
- No conflicts detected between this story's file plan and the existing structure — `dashboard/page.tsx` and `dashboard/actions.ts` follow the same colocation pattern already used by `(parent)/profiles/`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1: Weekly Activity Strip & Streak] — verbatim AC basis (ACs #1–#6)
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-13, #Glossary (Streak), #NFR Performance, #NFR Privacy/Security] — FR-13 consequences, Streak definition, NFR-7/NFR-8/NFR-10 basis
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md#Components (weekly-activity-strip row), #Rejected Patterns (streaks not shown to students)] — component visual spec, token usage, product-philosophy constraint on streak display
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#Parent Mode Components, #Parent Mode States, #Flow 2/UJ-2] — tap-on-day interaction (deferred, see Dev Notes), no-sessions/first-week/loading state treatments, verbatim Vietnamese copy example
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-2, #AD-3, #AD-4, #AD-5, #Consistency Conventions, #Capability Map] — layering rules, DB connection convention (already abstracted via `src/lib/db.ts`), auth/role convention, child-profile-cookie convention, server-action return shape, dashboard capability map entry
- [Source: _bmad-output/project-context.md] — layer rules, DB rules, code style/naming, "one Session per day intended cadence" (informs the no-pagination decision on the streak query)
- [Source: src/infrastructure/repositories/session-repository.ts] — `computeVnDayBoundaryUtc`, `formatVnDateLabel`, `VN_OFFSET_MS`; repository/`toDomain*` conventions to mirror
- [Source: src/infrastructure/repositories/session-repository.test.ts] — existing test conventions/precedent for this repository file
- [Source: src/infrastructure/repositories/child-profile-repository.ts, lines 11-21] — `findChildProfileById` and `findChildProfileByIdForParent` (reused directly for the FORBIDDEN ownership check, Task 3)
- [Source: src/app/(parent)/profiles/actions.ts] — `requireParentAccountId` (reused directly, Task 3); `switchActiveChildProfileAction`'s `NOT_FOUND` precedent (explicitly not followed, see Task 3 rationale)
- [Source: src/app/(parent)/layout.tsx] — confirms `session.user.role === 'PARENT'` gate already applied before `dashboard/page.tsx` runs, and the `getChildProfileId(await headers())` read pattern to mirror in the page
- [Source: src/app/(parent)/dashboard/page.tsx] — current stub being replaced
- [Source: src/lib/child-profile-cookie.ts] — `getChildProfileId` signature
- [Source: src/app/(student)/session/[sessionId]/loading.tsx] — `loading.tsx` Skeleton pattern to mirror (Task 5)
- [Source: src/components/parent/child-profile-switcher.tsx] — existing `src/components/parent/` component conventions (shadcn imports, `rounded-brand-*` tokens, locale-string usage, `data-slot`)
- [Source: src/locales/vi/common.ts] — confirms `parentNavDashboard` stays put; establishes the per-surface locale file convention followed by the new `dashboard.ts`
- [Source: prisma/schema.prisma#Session, #ChildProfile, #ParentAccount] — `completedAt` nullable `DateTime`, existing `@@index([childProfileId, completedAt])`, ownership relation fields

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

None — no failures encountered during implementation.

### Completion Notes List

- Extended `computeVnDayBoundaryUtc` with a backward-compatible `dayOffset` parameter (default `0`); existing callers (`countQuestionsAnsweredToday`, all Story 3.x sites) unaffected — confirmed by the existing `session-repository.test.ts` suite still passing unmodified.
- Implemented `dashboard-repository.ts` with `getWeeklyActivity` and `getCurrentStreak`, both pure date-bucketing over `db.session`, no business/presentation logic (AD-2 compliant).
- Implemented `getDashboardDataAction` in `(parent)/dashboard/actions.ts`, reusing `requireParentAccountId` and `findChildProfileByIdForParent` with no new auth/ownership logic duplicated; returns the new `FORBIDDEN` code on ownership mismatch per AC #6.
- Built `WeeklyActivityStrip` (presentational, no `'use client'`) and wired `(parent)/dashboard/page.tsx` as an async Server Component with a `loading.tsx` Skeleton fallback and a `/profiles` redirect prompt when no Child Profile is active.
- Added `src/locales/vi/dashboard.ts` with the verbatim `EXPERIENCE.md` copy for `weeklySummary`/`streakLabel`.
- Unit tests added in `dashboard-repository.test.ts` covering: no completed Sessions, streak of 1 (today only), consecutive streak of N, streak broken by a gap day, streak alive through today when only yesterday has a Session, week-boundary bucketing (Monday/Sunday edges), and a Session landing exactly at a VN day-boundary instant. All 43 project tests pass (`pnpm test`); `npx tsc --noEmit` and `pnpm lint` are clean (only pre-existing, unrelated `<img>` warnings in `mascot.tsx`/`question-card.tsx`).
- **Outstanding: the mandatory manual/live-browser verification pass (Task 7) was NOT performed.** This dev-agent session had no browser or live-database tool available, so the checklist items in Task 7 (empty-state rendering, week-fill correctness, streak-today/streak-yesterday behavior, live reload after completing a Session, cross-parent `FORBIDDEN` check, Skeleton-under-throttling) are unverified beyond code reasoning and unit tests. Per the standing Epic 2 retro gate, this story should not be marked `done` until a human (or an agent with real browser access) completes that pass. Story left at `in-progress` rather than `review` for this reason — see final chat message to the user.

### File List

- `src/infrastructure/repositories/session-repository.ts` (modified — `computeVnDayBoundaryUtc` gained optional `dayOffset` param)
- `src/infrastructure/repositories/dashboard-repository.ts` (new)
- `src/infrastructure/repositories/dashboard-repository.test.ts` (new)
- `src/app/(parent)/dashboard/actions.ts` (new)
- `src/app/(parent)/dashboard/page.tsx` (modified — stub → async Server Component)
- `src/app/(parent)/dashboard/loading.tsx` (new)
- `src/components/parent/weekly-activity-strip.tsx` (new)
- `src/locales/vi/dashboard.ts` (new)

## Change Log

- 2026-07-23: Implemented Tasks 1–6 (VN day-boundary offset utility, `dashboard-repository.ts`, dashboard server action, `WeeklyActivityStrip` component, dashboard page + loading skeleton, Vietnamese locale strings) and the automated portion of Task 7 (unit tests, lint, tsc, full test suite — all green). Manual/live-browser verification (Task 7's mandatory checklist) not performed — no browser tool available in this session. Status kept at `in-progress` pending that pass.
