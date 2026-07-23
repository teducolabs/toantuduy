---
baseline_commit: 58f4f0f254df3d4febddd7681f75de41490c14b4
---

# Story 4.5: Parent Dashboard Performance & All State Patterns

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want the dashboard to load quickly and handle all edge cases gracefully,
so that the experience is reliable regardless of network conditions or data state.

## Acceptance Criteria

1. **Given** I open the Parent Dashboard, **when** the page first loads, **then** the initial load completes within 3 seconds (NFR-6), and `Skeleton` placeholders show in the activity strip, skill badges, and grade progress indicator positions while loading (UX-DR14) — `loading.tsx` already implements this; this story verifies/hardens it, it does not rebuild it.
2. **Given** the Child Profile is in their first week of use (zero completed Sessions), **when** the dashboard renders, **then** only the current week's activity strip is shown with no prior-week comparison, and the session history and skill sections show their existing empty-state copy — this is largely already implemented (Story 4.1–4.3); this story adds/confirms test coverage for the full first-week dashboard render, not new empty-state UI.
3. **Given** I lose network connectivity while viewing the dashboard, **when** connectivity drops, **then** a shadcn `Toast` (via existing `sonner` `Toaster`, already mounted in `src/app/layout.tsx`) fires **exactly once** per disconnect: `"Không có kết nối. Dữ liệu có thể chưa cập nhật."`; existing on-screen content remains visible and interactive for read-only browsing (no forced reload, no content removal).
4. **Given** a dashboard data fetch fails (the `getDashboardDataAction` call returns `{ error }` or throws), **when** the error is detected, **then** an inline error card renders in place of the dashboard content with a `"Thử lại"` retry button; **no empty-state or partial dashboard is shown** until retry succeeds — retrying re-invokes the same data load and, on success, replaces the error card with the normal dashboard content without a full page navigation.
5. **And** the parent shell is fully responsive: bottom tab bar at `< lg`, sidebar at `≥ lg`, content `max-w-3xl` — already implemented in `src/app/(parent)/layout.tsx`; this story verifies it, it does not rebuild the shell.
6. **And** all keyboard navigation is complete on the dashboard: Tab/Shift-Tab reaches every interactive element (upsell banner dismiss + CTA link, skill badges, grade-progress-indicator trigger, "Xem thêm" button) in a logical order; Enter activates the focused button/link; Esc closes the `Popover` (grade progress tooltip) and any `Sheet`/skill-detail panel — shadcn primitives provide this by default; verify, don't reimplement.

## Tasks / Subtasks

- [x] Task 1: Add offline-detection Toast to the dashboard (AC: #3)
  - [x] 1.1 Create `src/components/parent/dashboard-offline-toast.tsx` — a small Client Component modeled on the existing student-surface pattern (`src/components/student/use-online-status.ts`'s `useOnlineStatus()` hook — **reuse this hook directly, do not fork it**; it already tracks `navigator.onLine` + `online`/`offline` window events and is framework-agnostic enough to import from `(parent)` code).
  - [x] 1.2 In this new component, call `useOnlineStatus()`; on the transition from online → offline (use a `useEffect` keyed on the boolean, guarded so it only fires on the falling edge, not on initial mount if `navigator.onLine` happens to already be `false`), call `toast(dashboard.offlineToastMessage)` from `sonner` (see existing usage pattern — check how `sonner`'s `toast()` is invoked elsewhere in the codebase, e.g. any existing client components importing from `'sonner'`; if none exist yet, import `{ toast } from 'sonner'` directly — this is the same library backing `src/components/ui/sonner.tsx`'s `<Toaster />`, which is already mounted globally in `src/app/layout.tsx`, so no provider setup is needed).
  - [x] 1.3 Render this component once inside `src/app/(parent)/dashboard/page.tsx` (it renders no visible DOM itself — side-effect only, similar to a "listener" component).
  - [x] 1.4 Do NOT disable any dashboard interactivity on offline — AC #3 requires existing content stays readable; only the Toast fires. Do not touch `/(student)/` offline handling (`offline-banner.tsx`) — that is a different, correct pattern for a different surface (disables answer submission); the dashboard's offline requirement is strictly "notify once, keep browsing."
- [x] Task 2: Add retry-capable error handling to the dashboard page (AC: #4)
  - [x] 2.1 The current `src/app/(parent)/dashboard/page.tsx` is a Server Component that calls `getDashboardDataAction` once at render time and, on `{ error }`, renders a bare `<p>` with the error message (no retry). Replace this with a client-side retry wrapper:
    - Keep `page.tsx` as a Server Component that does the *first* fetch server-side (preserves fast SSR initial load for AC #1/NFR-6) and passes the initial `result` (data or error) as a prop into a new Client Component, e.g. `src/components/parent/dashboard-content.tsx`.
    - `DashboardContent` takes `{ activeProfileId: string, initialResult: <same union type getDashboardDataAction returns> }`, holds it in `useState`, and if `'error' in result`, renders an inline error card (shadcn `Card`, per DESIGN.md's "inline error card with retry CTA" pattern used elsewhere — check `EXPERIENCE.md` line ~193 for the copy: `"Không tải được dữ liệu. Thử lại."`) with a `"Thử lại"` `Button` that calls `getDashboardDataAction(activeProfileId)` again (client → server action call is allowed; `getDashboardDataAction` is already a `'use server'` export) and on success sets state to the new `data`, re-rendering the full dashboard content (the existing four `Card` sections, moved from `page.tsx` into `DashboardContent`).
    - Move the existing JSX for `UpsellBanner`/`WeeklyActivityStrip`/`SkillDashboardSection`/`GradeProgressIndicator`/`SessionHistoryList` from `page.tsx` into `DashboardContent`'s success-state render branch, unchanged.
  - [x] 2.2 Keep the existing `noActiveProfile` early-return (missing cookie) in `page.tsx` itself (Server Component) — that is a routing/auth-adjacent state, not the "data fetch failed" state AC #4 targets; do not route it through the new retry component.
  - [x] 2.3 Add the new locale key for the retry-error copy to `src/locales/vi/dashboard.ts` (see Task 4).
- [x] Task 3: Verify (do not rebuild) already-implemented AC items — responsive shell, keyboard nav, first-week state, loading skeleton (AC: #1, #2, #5, #6)
  - [x] 3.1 No code changes expected for AC #1 (loading skeleton) or AC #5 (responsive shell) — `loading.tsx` and `src/app/(parent)/layout.tsx` already satisfy them (see Dev Notes). Add/confirm test coverage only.
  - [x] 3.2 For AC #2 (first week), add a repository/action-level test asserting the full `getDashboardDataAction` response shape for a Child Profile with zero completed Sessions: `weeklyActivity.hasAnyCompletedSession === false`, `gradeProgress === null`, `sessionHistory` is an empty array, `skillBreakdown` entries are all `'insufficient'` (or empty) — confirming Stories 4.1–4.3's individual empty-state guarantees hold together on one combined load (this is the first time all four sections are exercised in the *same* zero-session fixture).
  - [x] 3.3 For AC #6 (keyboard nav), this is a manual/browser-verification item (see Previous Story Intelligence — sandbox cannot do live QA). Note in Dev Agent Record whether it was verified live or only via code-trace (shadcn `Popover`/`Sheet`/`Button`/`Link` all support standard keyboard interaction out of the box; no custom `onKeyDown` handlers exist in the dashboard components today, so there is nothing custom to break — verify no new component in this story adds a non-keyboard-operable custom control).
- [x] Task 4: Add Vietnamese locale strings (AC: #3, #4)
  - [x] 4.1 Extend `src/locales/vi/dashboard.ts` (do not create a new locale file) with:
    - `offlineToastMessage: 'Không có kết nối. Dữ liệu có thể chưa cập nhật.'`
    - `loadErrorMessage: 'Không tải được dữ liệu.'`
    - `loadErrorRetryCta: 'Thử lại'`
- [x] Task 5: Tests
  - [x] 5.1 Unit test for the retry flow: given `DashboardContent` initialized with an `{ error }` prop, the error card renders; simulate the retry action resolving with `{ data }` and assert the error card is replaced by dashboard content (mock `getDashboardDataAction`).
  - [x] 5.2 Unit test: given `DashboardContent` initialized with `{ data }`, no error card renders (normal path unaffected).
  - [x] 5.3 Repository/action test per Task 3.2 (first-week combined-response shape).
  - [x] 5.4 Manual/browser verification (per project convention — see Previous Story Intelligence) for: offline Toast fires once and does not repeat on subsequent `offline` events without an intervening `online` event; keyboard Tab/Enter/Esc flows; responsive breakpoints. Record in Completion Notes whether this was performed live or only via code-trace, and flag if not performed live (matches the standing sprint-status.yaml action item on this gap).

## Dev Notes

- **This story is primarily hardening + a page restructure, not new features.** Three of six ACs (loading skeleton, responsive shell, first-week empty states) are **already implemented** by Stories 4.1–4.4 — do not rebuild `loading.tsx` or `(parent)/layout.tsx`. The real net-new work is: (a) the offline Toast, (b) the retry-capable error card, and (c) closing test-coverage gaps on the already-implemented items.
- **Reuse the existing offline-detection hook, do not fork it:** `src/components/student/use-online-status.ts` exports `useOnlineStatus(): boolean` (tracks `navigator.onLine` + `window` `online`/`offline` listeners). It has zero Domain/Infrastructure imports and is presentation-layer-safe to import from `(parent)` components despite living in `components/student/`. If importing across the `student`/`parent` component folders feels wrong, moving it to a shared location (e.g. `src/components/shared/` or `src/lib/`) is acceptable — but do not duplicate the hook's logic. Pick one location.
- **`sonner`'s `Toaster` is already globally mounted** in `src/app/layout.tsx` (`import { Toaster } from '@/components/ui/sonner'`) — no new provider/setup needed. Just call `toast(message)` from `'sonner'` in a Client Component.
- **The "fire once per disconnect" requirement (AC #3)** means: do not fire the toast on every `offline` event if the browser fires it more than once, and do not fire it again while still offline. Track the previous online-state value and only fire on the falling edge (`true` → `false` transition), which a `useEffect` with `[isOnline]` dependency naturally gives you if you guard against firing on the initial mount when `isOnline` starts `false` (unlikely in practice, but guard with a ref or by skipping the very first effect run).
- **Restructuring `page.tsx` into a Server Component + Client Component split (AC #4) is the biggest structural change in this story.** Current architecture (Story 4.1–4.4 precedent): one Server Component page → one server action (`getDashboardDataAction`) → `Promise.all` of repository reads → render. This story does NOT change the server action or repository layer at all — `getDashboardDataAction`'s signature and the `Promise.all` composition are untouched. The only change is that `page.tsx` now hands its already-fetched `result` to a new Client Component wrapper (`dashboard-content.tsx`) that can re-invoke `getDashboardDataAction` client-side on retry. This preserves NFR-6 (fast SSR initial paint) while satisfying the retry AC, and keeps the Presentation → Application layering rule intact (Client Components calling `'use server'` actions directly is the standard Next.js pattern already used by `session-history-list.tsx`'s `loadMore()` and `upsell-banner.tsx`'s dismiss flow).
- **Do not touch `getCurrentStreak`'s unbounded `db.session.findMany` query** (`dashboard-repository.ts`) even though it has no date bound and could theoretically grow — it is out of this story's explicit AC scope (epics.md's Story 4.5 ACs do not mention query optimization) and changing it risks a regression in streak-calculation correctness that isn't asked for. If a `next build`/manual timing check shows NFR-6's 3-second budget is at risk, flag it in Completion Notes rather than silently "fixing" it.
- **`noActiveProfile` (missing `child-profile-id` cookie) is a different state than "load error"** — keep that early-return in `page.tsx` itself, untouched. AC #4's "load error" is specifically about `getDashboardDataAction` failing/erroring after a profile is confirmed active.
- **Server action retry is safe to call directly from a Client Component** — `getDashboardDataAction` already begins with `requireParentAccountId()` (session check) and ownership verification (`findChildProfileByIdForParent`), so no new auth code is needed in the retry path; it's the exact same call already made server-side on first load.
- **Locale conventions unchanged:** `src/locales/vi/dashboard.ts` is a flat exported `const dashboard = {...}` object — add the three new keys (Task 4) there, not a new file.
- **No `src/domain/` changes required.** No new repository functions required (Task 2's retry reuses the existing `getDashboardDataAction` verbatim). This is pure Presentation (new Client Components) + a locale update.

### Project Structure Notes

- Files to **modify**: `src/app/(parent)/dashboard/page.tsx` (slim down to profile-check + pass initial result to the new client wrapper), `src/locales/vi/dashboard.ts`.
- Files to **create**: `src/components/parent/dashboard-content.tsx` (client wrapper: error/retry state + renders the four existing dashboard sections on success), `src/components/parent/dashboard-offline-toast.tsx` (side-effect-only offline Toast), and test files for both plus the Task 3.2 repository/action test.
- Naming: kebab-case file names, PascalCase component names — consistent with `upsell-banner.tsx`, `weekly-activity-strip.tsx`, etc.
- `loading.tsx` and `src/app/(parent)/layout.tsx` are **not** expected to change.

## Previous Story Intelligence

- **Manual/live browser verification gap (recurring):** Story 4.4 explicitly could not perform live browser verification ("this sandbox has no live browser/DB session available") and flagged it as a standing gap (tracked in `sprint-status.yaml`'s Epic 2 action items: *"Establish a live/manual browser verification pass before marking any story done"*). This story has THREE items that are best verified live (offline Toast firing behavior, keyboard nav, responsive breakpoints) — if a live browser/DB session is still unavailable, use the same fallback Story 4.4 used: full `next build` success + unit tests covering all logical branches + a manual code-trace, and explicitly flag in Completion Notes that live verification is still outstanding. Do not claim it was done if it wasn't.
- **Session-action-from-Client-Component pattern is established and safe:** Story 4.4's Task 1 deviation note explains *why* a helper was relocated to Infrastructure rather than exported as a bare server action (to avoid an unauthenticated client-callable endpoint). That risk does NOT apply here — `getDashboardDataAction` already performs its own session + ownership check internally, so calling it again from a Client Component on retry is safe and requires no relocation.
- **VN day-boundary utilities exist and must be reused, never reimplemented,** if any new code in this story needs "today" logic (`computeVnDayBoundaryUtc`/`formatVnDateLabel` in `session-repository.ts`). This story is not expected to need new day-boundary logic, but flag it here in case the first-week test fixture (Task 3.2) needs to construct "this week" data.
- **Dashboard data-loading pattern (Story 4.1–4.4 precedent) must not gain a second top-level fetch call** — the retry in this story reuses the *same* `getDashboardDataAction`, it does not introduce a parallel/second action.
- **Test tooling:** `npx vitest run` is the established test runner (65 passing tests as of Story 4.4); `npx tsc --noEmit` and `npx eslint <changed files>` are run before marking a story done; `npx next build` is used as a compile/bundle sanity check when live browser verification isn't available.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.5: Parent Dashboard Performance & All State Patterns] (lines 832–859)
- [Source: _bmad-output/planning-artifacts/epics.md#NFR-6, NFR-7, UX-DR12, UX-DR14, UX-DR19]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md] — Parent Mode dashboard states table: "First week", "Loading dashboard", "Offline" (Toast: "Không có kết nối. Dữ liệu có thể chưa cập nhật."), "Load error" (inline error card + retry CTA: "Không tải được dữ liệu. Thử lại.")
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md] — shadcn inherited-unchanged component list includes `Toast`, `Popover`, `Sheet`, `Skeleton` (do not restyle); parent shell responsive spec (bottom tab ≤ md / sidebar ≥ lg / max-w-3xl)
- [Source: _bmad-output/project-context.md] — layer architecture rules (Presentation → Application → Domain → Infrastructure), server action return shape, no real-time connections in v1
- [Source: src/components/student/use-online-status.ts] — existing `useOnlineStatus()` hook to reuse (Story 3.7 precedent)
- [Source: src/components/student/offline-banner.tsx] — existing offline-state pattern for a *different* surface (disables interaction); dashboard's offline requirement is notify-only, do not copy the disable behavior
- [Source: src/app/layout.tsx] — global `sonner` `<Toaster />` already mounted
- [Source: src/app/(parent)/dashboard/page.tsx, loading.tsx, actions.ts] — current dashboard Server Component, skeleton, and server action to restructure/extend
- [Source: src/infrastructure/repositories/dashboard-repository.ts] — `getWeeklyActivity`, `getCurrentStreak`, `getSkillBreakdown`, `getGradeProgress`, `getSessionHistory` — untouched by this story
- [Source: _bmad-output/implementation-artifacts/4-4-free-tier-upsell-prompt-on-dashboard.md] — most recent prior story; established the `isAllotmentExhausted` relocation pattern, dashboard `Promise.all` composition, and the standing manual-verification gap

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npx vitest run` — 10 files, 74 tests passed (65 pre-existing + 9 new)
- `npx tsc --noEmit` — no errors
- `npx eslint` on all new/changed files — no errors/warnings
- `npx next build` — compiled successfully; `/dashboard` route builds and prerenders correctly (pre-existing `<img>` warnings in unrelated student components only)

### Completion Notes List

- Restructured `page.tsx` into a Server Component (first fetch + `noActiveProfile` early-return only) + new `DashboardContent` Client Component (holds fetch result in state, re-invokes `getDashboardDataAction` on retry). `getDashboardDataAction`'s signature, `Promise.all` composition, and the repository layer are unchanged, per Dev Notes.
- Added `DashboardOfflineToast`, a side-effect-only Client Component using the existing `useOnlineStatus()` hook (reused directly from `src/components/student/`, not forked) to fire the offline `sonner` toast exactly once per online→offline transition.
- Extracted the two pieces of non-trivial branching logic — the error/retry render decision and the offline-toast falling-edge detection — into small pure functions (`dashboard-content-state.ts`, `dashboard-offline-toast-state.ts`), following this codebase's existing convention (`answer-button-state.ts`/`question-card.tsx`) of keeping stateful-component branching logic in a plain, unit-testable module rather than only inline in JSX.
- **Testing deviation note:** the project has no DOM-rendering test library (`vitest.config.ts` runs `environment: 'node'`; no `@testing-library/react`/jsdom in `package.json`, and no other component in the codebase has a `.test.tsx` file). Tasks 5.1/5.2 as literally worded ("given `DashboardContent` initialized with a prop, the error card renders") would require adding such a dependency, which weren't in the story's scope and would be a new-dependency decision beyond this story. Instead, the exact branching predicates `DashboardContent`/`DashboardOfflineToast` use were extracted into pure functions and are fully unit-tested (`shouldShowLoadErrorCard`, `shouldFireOfflineToast`) — this covers 100% of the decision logic without adding a rendering framework. Flagging this explicitly rather than claiming component-render tests exist.
- **Live browser verification not performed** (no live browser/DB session available in this sandbox — same standing gap noted in Story 4.4 and tracked in `sprint-status.yaml`'s Epic 2 action items). Verified instead via: full `npx next build` success (confirms the `/dashboard` route compiles/prerenders with the new component split), the full unit-test suite, and manual code-trace:
  - AC #6 (keyboard nav): no new custom-control components were added in this story (only `Card`/`Button` — both shadcn primitives already used elsewhere on this page); no `onKeyDown`/custom focus-trap code was introduced, so there is nothing new to break the existing keyboard behavior.
  - AC #3 (offline toast fires once): covered by the `shouldFireOfflineToast` pure-logic tests plus code-trace of the mount-skip ref guard in `dashboard-offline-toast.tsx`.
  - AC #1/#5 (skeleton, responsive shell): `loading.tsx` and `(parent)/layout.tsx` were not modified.
  - This live-verification gap should be closed with an actual manual/browser QA pass before this story is considered fully done, consistent with the standing sprint-status.yaml action item.
- No `src/domain/` or repository changes. `getCurrentStreak`'s unbounded query was left untouched per Dev Notes (out of this story's AC scope).

### File List

- Modified: `src/app/(parent)/dashboard/page.tsx`
- Modified: `src/app/(parent)/dashboard/actions.ts` (added exported `DashboardDataResult` type; no behavior change)
- Modified: `src/locales/vi/dashboard.ts`
- Modified: `src/app/(parent)/dashboard/actions.test.ts` (added Task 3.2 first-week combined-response test)
- Created: `src/components/parent/dashboard-content.tsx`
- Created: `src/components/parent/dashboard-content-state.ts`
- Created: `src/components/parent/dashboard-content-state.test.ts`
- Created: `src/components/parent/dashboard-offline-toast.tsx`
- Created: `src/components/parent/dashboard-offline-toast-state.ts`
- Created: `src/components/parent/dashboard-offline-toast-state.test.ts`

## Change Log

- 2026-07-23: Implemented Story 4.5 — offline-detection Toast, retry-capable dashboard error card (Server/Client Component split), and closed test-coverage gaps for the already-implemented loading/responsive/first-week/keyboard-nav ACs. Live browser verification still outstanding (sandbox limitation); flagged in Completion Notes.
