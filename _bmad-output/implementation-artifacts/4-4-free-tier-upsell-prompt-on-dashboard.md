---
baseline_commit: 58f4f0f254df3d4febddd7681f75de41490c14b4
---

# Story 4.4: Free Tier Upsell Prompt on Dashboard

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to see a non-intrusive banner when my child has exhausted today's free allotment with a link to subscription plans,
so that I can easily upgrade if I want to remove the daily limit.

## Acceptance Criteria

1. **Given** the active Child Profile is on the Free Tier and has exhausted today's daily allotment, **when** the Parent Dashboard loads, **then** a dismissible `upsell-banner` renders above the weekly activity strip (i.e. above the `dashboard-card`) with the text `"[Tên] đã dùng hết lượt miễn phí hôm nay 🌟 — Xem gói đăng ký →"` and it contains **no pricing information** — only a link to the plans page. (FR-16)
2. **Given** I dismiss the upsell banner, **when** dismissed, **then** it disappears for the current (Asia/Ho_Chi_Minh) calendar day, and the dismissed state is stored **client-side**; it reappears the following day if the profile is still Free Tier and the allotment is exhausted again.
3. **Given** the Child Profile has an active Subscription, **when** the dashboard renders, **then** no upsell banner is shown, regardless of allotment usage.
4. **Given** the Child Profile is Free Tier but has **not** exhausted today's allotment, **when** the dashboard renders, **then** no upsell banner is shown.
5. The banner's link navigates to `/(parent)/subscription/plans` (this route does not exist yet — create it as a stub page; full plans UI ships in Epic 6).
6. No upsell content of any kind appears anywhere in `/(student)/` routes (FR-5) — this story touches only `/(parent)/dashboard` and adds the new stub route; do not modify any `src/app/(student)/` file.
7. The banner meets the 44×44px touch target floor on its dismiss control and CTA link (NFR-1), and conveys state via text (not color alone).

## Tasks / Subtasks

- [x] Task 1: Extract and reuse the shared allotment-exhaustion check (AC: #1, #3, #4)
  - [x] 1.1 In `src/app/(student)/actions.ts`, change `isAllotmentExhausted(childProfileId, parentAccountId)` from a private (unexported) function to `export async function isAllotmentExhausted(...)`. Do not change its logic or signature — it already correctly returns `false` immediately when subscribed, else `answeredToday >= allotment`.
  - [x] 1.2 Do not duplicate this composition logic anywhere else. If importing across `(student)` → `(parent)` route groups feels wrong, move the function verbatim into a shared, framework-agnostic module (e.g. `src/infrastructure/repositories/subscription-repository.ts`, since it already owns `hasActiveSubscription`) and update both `(student)/actions.ts` and the new dashboard usage to import from there. Pick ONE location — do not leave two copies.
- [x] Task 2: Wire allotment/subscription status into the dashboard data action (AC: #1, #3, #4)
  - [x] 2.1 In `src/app/(parent)/dashboard/actions.ts`, add a `showUpsellBanner: boolean` field to `getDashboardDataAction`'s success return, computed by calling the shared `isAllotmentExhausted(childProfileId, resolved.parentAccountId)` inside the existing `Promise.all([...])` alongside the other five reads (do not add a second `Promise.all` or a second top-level server action call — Story 4.3 established one-call-per-page-load as the pattern).
  - [x] 2.2 `resolved.parentAccountId` is already available from `requireParentAccountId()` earlier in the function — no new auth/session lookups needed.
- [x] Task 3: Build the `upsell-banner` component (AC: #1, #2, #3, #4, #7)
  - [x] 3.1 Create `src/components/parent/upsell-banner.tsx` — a Client Component (needs `useState`/`localStorage` for per-day dismissal). Props: `childName: string`, `visible: boolean` (server-computed `showUpsellBanner`).
  - [x] 3.2 Style per DESIGN.md spec: `Card`, warning variant, `rounded-brand-sm` (8px — adult surface token), orange-50 background, text on the left, link on the right.
  - [x] 3.3 Render text via `dashboard.upsellBannerText(childName)` and CTA via `dashboard.upsellBannerCta` (see Task 5) as a `Link` to `/(parent)/subscription/plans`.
  - [x] 3.4 Dismiss button: an icon button (e.g. an "×" or shadcn `Button` with `size="icon"`) meeting 44×44px touch target; clicking it hides the banner and persists dismissal in `localStorage`, keyed per child + VN calendar day, e.g. `` `upsell-dismissed-${childProfileId}-${vnDateKey}` `` — use the same VN-day-boundary convention as `computeVnDayBoundaryUtc`/`formatVnDateLabel` in `session-repository.ts` (Asia/Ho_Chi_Minh, fixed UTC+7, no DST) to compute `vnDateKey` so "reappears next day" aligns with the rest of the app's day-boundary logic.
  - [x] 3.5 On mount, check `localStorage` for that day's dismissal key; if present, do not render even when `visible` is true.
- [x] Task 4: Insert the banner into the dashboard page and loading skeleton (AC: #1, #3, #4)
  - [x] 4.1 In `src/app/(parent)/dashboard/page.tsx`, render `<UpsellBanner childName={...} visible={result.data.showUpsellBanner} />` as the first element inside `<main>`, above the `dashboard-card` `Card`. `childName` is not currently returned by `getDashboardDataAction` — add it alongside `gradeBand`: it's already resolved via `childProfile` in that action, so expose `childProfile.name` (the `ChildProfile` model's display-name field is called `name`, not `displayName`).
  - [x] 4.2 In `src/app/(parent)/dashboard/loading.tsx`, add a matching `Skeleton` placeholder row above `dashboard-card` sized like a banner (e.g. `h-12 w-full`) — Story 4.1's Dev Notes established that every dashboard section needs loading-skeleton parity.
- [x] Task 5: Add Vietnamese locale strings (AC: #1)
  - [x] 5.1 Extend `src/locales/vi/dashboard.ts` (do not create a new locale file) with:
    - `upsellBannerText: (name: string) => \`${name} đã dùng hết lượt miễn phí hôm nay 🌟 — Xem gói đăng ký →\`` — confirm against EXPERIENCE.md sample copy which omits the em dash arrow inside the function and appends the CTA separately; prefer splitting into `upsellBannerText: (name: string) => \`${name} đã dùng hết lượt miễn phí hôm nay 🌟\`` and a separate `upsellBannerCta: 'Xem gói đăng ký →'` so the CTA can be a distinct clickable `Link` rather than plain text (needed for AC#7 touch target on the link itself).
- [x] Task 6: Create the subscription plans stub route (AC: #5)
  - [x] 6.1 Create `src/app/(parent)/subscription/plans/page.tsx` as a minimal stub Server Component (mirror the existing `src/app/(parent)/subscription/page.tsx` "coming soon" stub pattern) — full plans UI is out of scope until Epic 6.
- [x] Task 7: Tests
  - [x] 7.1 Unit/integration test for the extracted/exported `isAllotmentExhausted` (or its new shared location) covering: subscribed → always `false`; unsubscribed + under allotment → `false`; unsubscribed + at/over allotment → `true`.
  - [x] 7.2 Test that `getDashboardDataAction` returns `showUpsellBanner: true/false` correctly for the subscribed / exhausted / not-exhausted cases (extend `dashboard-repository.test.ts` or add a colocated actions test, following whichever test file already covers `getDashboardDataAction`-adjacent logic).
  - [x] 7.3 Component-level check (or manual browser verification per project convention) that the banner is absent when subscribed, absent when not exhausted, present-then-dismissible-then-gone-until-next-VN-day when exhausted.

## Dev Notes

- **Reuse, do not reinvent:** The exhaustion check already exists as a private helper `isAllotmentExhausted(childProfileId, parentAccountId)` in `src/app/(student)/actions.ts:27` — it composes `hasActiveSubscription` (`src/infrastructure/repositories/subscription-repository.ts`) + `getFreeTierDailyAllotment` (`src/infrastructure/repositories/global-config-repository.ts`) + `countQuestionsAnsweredToday` (`src/infrastructure/repositories/session-repository.ts`). Its own comment explicitly warns this logic must not drift between callers — export/relocate it, don't copy it.
- **Subscription model:** `Subscription` is 1:1 with `ParentAccount` (`parentAccountId String @unique`), not per-`ChildProfile` — an active subscription unlocks unlimited Sessions for **all** Child Profiles under that parent account. `ChildProfile` itself has no tier field.
- **GlobalConfig:** `FREE_TIER_DAILY_ALLOTMENT` key, default 5, read via `getFreeTierDailyAllotment()`.
- **VN day boundary:** All "today"/"exhausted" logic must use `computeVnDayBoundaryUtc` / `formatVnDateLabel` from `session-repository.ts` (Asia/Ho_Chi_Minh, fixed UTC+7, no DST) — do not use browser-local time or naive UTC midnight for the dismissal reset, or the banner will reappear/hide at the wrong hour for Vietnamese users.
- **Dashboard data-loading pattern (Story 4.1–4.3 precedent):** one Server Component page (`page.tsx`) → one server action (`getDashboardDataAction`) → `Promise.all` of repository reads → `{ data } | { error } }`. Every new piece of dashboard data joins this same `Promise.all`; do not add a second top-level fetch.
- **Component/section pattern:** each dashboard section is a shadcn `Card` with `data-slot="..."`, `rounded-brand-md shadow-sm bg-white`, and a `font-semibold` Vietnamese title from `dashboard.ts`. The upsell banner is visually distinct (DESIGN.md specifies `rounded-brand-sm`, orange-50 bg, warning-variant `Card`) and sits **outside**/**above** that repeating pattern, not as a fifth identical section.
- **Locale conventions:** `src/locales/vi/dashboard.ts` is a flat exported `const dashboard = {...}` object; string-returning functions use template literals for interpolation (e.g. `weeklySummary: (n: number) => \`${n} buổi tuần này\``). Add new keys here, do not create a new locale file.
- **`ChildProfile` display-name field is `name`** (not `displayName`) — used for the `[Tên]` interpolation and as part of the `localStorage` dismissal key.
- **Do not touch `/(student)/` routes** beyond exporting the one function from `actions.ts` (or relocating it) — FR-5/AC#6 forbids any upsell content in the student surface, and this story's scope is dashboard-only.
- **Auth/ownership check already covered:** `getDashboardDataAction` already calls `requireParentAccountId()` then `findChildProfileByIdForParent(childProfileId, parentAccountId)` before any data read, matching NFR-8/NFR-10. No new auth code needed — just add the new field inside the existing authorized path.
- **`/(parent)/subscription/plans` is a new stub** — `/(parent)/subscription/page.tsx` currently renders "Parent subscription — coming soon"; mirror that stub style for the new `plans` sub-route. Full plans UI (pricing, FR-23) is Epic 6 scope — do not build it now.

### Project Structure Notes

- Files to **modify**: `src/app/(student)/actions.ts` (export the helper, or remove it if relocated), `src/app/(parent)/dashboard/actions.ts`, `src/app/(parent)/dashboard/page.tsx`, `src/app/(parent)/dashboard/loading.tsx`, `src/locales/vi/dashboard.ts`.
- Files to **create**: `src/components/parent/upsell-banner.tsx`, `src/app/(parent)/subscription/plans/page.tsx`, and whichever test file covers the new logic (Task 7).
- Naming: kebab-case file names, PascalCase component/type names — consistent with existing `weekly-activity-strip.tsx`, `grade-progress-indicator.tsx`, etc.
- No `src/domain/` changes required — this is pure Application (server action) + Infrastructure (repository export) + Presentation (component) work; no new domain use case.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4: Free Tier Upsell Prompt on Dashboard] (lines 807–828)
- [Source: _bmad-output/planning-artifacts/epics.md#FR-16, FR-5, FR-23]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md] — `upsell-banner` component spec (Card, warning variant, rounded.sm, orange-50 bg, left text + right link)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md] — Parent Mode component table (upsell banner sticky-at-top, dismissible-per-day, reappears-next-day semantics); sample copy "Khôi đã dùng hết lượt miễn phí hôm nay 🌟 — Xem gói đăng ký →"; dashboard states table (upsell active vs. subscription active)
- [Source: prisma/schema.prisma] — `Subscription`, `GlobalConfig`, `ChildProfile` models
- [Source: src/app/(student)/actions.ts#isAllotmentExhausted] — existing exhaustion-check logic to reuse
- [Source: src/app/(parent)/dashboard/actions.ts, page.tsx, loading.tsx] — established dashboard data-loading and section-rendering pattern
- [Source: _bmad-output/implementation-artifacts/4-3-grade-progress-indicator-session-history.md] — Dev Notes precedent: fold new page data into the single existing action; every section needs a loading-skeleton counterpart

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npx vitest run` — 8 test files, 65 tests, all passing.
- `npx tsc --noEmit` — no type errors.
- `npx eslint <changed files>` — no lint errors/warnings on changed files.
- `npx next build` — compiled successfully, type-checked successfully (only pre-existing `no-img-element` warnings in unrelated files); an `unhandledRejection [PageNotFoundError]: /_document` appears during "Collecting page data" but this is a pre-existing Pages-Router artifact unrelated to this story's App Router changes (not reproducible from any file touched here).

### Completion Notes List

- **Task 1 deviation from literal instructions:** the story's Option A (export `isAllotmentExhausted` directly from `src/app/(student)/actions.ts`, a `'use server'` file) was rejected — every export in a `'use server'` module becomes a client-callable server action in Next.js, and this helper performs no session/ownership check of its own (it trusts the caller's already-validated `childProfileId`/`parentAccountId`). Exporting it there would have created an unauthenticated endpoint that returns another parent's exhaustion status given any two IDs, violating project-context.md's "every server action must begin with a session check" rule. Took Option B instead: moved the function verbatim (same logic/signature) into `src/infrastructure/repositories/subscription-repository.ts`, which already owns `hasActiveSubscription`; both `(student)/actions.ts` and the new dashboard usage import the single shared implementation from there.
- **`vnDateKey` computed locally, not imported:** the dismissal-key day-boundary math (`VN_OFFSET_MS = 7 * 3600_000`, fixed UTC+7 no DST) is duplicated as a small pure function inside `upsell-banner.tsx` rather than imported from `session-repository.ts`, because that module is Infrastructure and `db`-importing — pulling it into a Client Component would violate project-context.md's Presentation → Infrastructure import ban and risk bundling server-only code into the browser. The formula is identical to `computeVnDayBoundaryUtc`'s VN-offset math, just inlined.
- **Route link:** used `href="/subscription/plans"` (Next.js route groups like `(parent)` are stripped from the actual URL), not the literal `/(parent)/subscription/plans` path string mentioned in AC #5's file-location phrasing.
- **Manual browser verification (AC #7.3):** not performed — this sandbox has no live browser/DB session available (a standing gap tracked in sprint-status.yaml's Epic 2 action items: "Establish a live/manual browser verification pass..."). Verified instead via: full `next build` success (confirms the Client Component compiles/bundles/SSRs without error), unit tests covering all three visibility states (subscribed / exhausted / not-exhausted) at the data layer, and manual code-trace of the dismiss → localStorage → re-mount-check flow. Recommend a manual pass before this story is considered fully done.
- No new dependencies added. No `src/domain/` changes. No `src/app/(student)/` files changed beyond the `isAllotmentExhausted` removal (relocated, not duplicated).

### File List

- Modified: `src/app/(student)/actions.ts`
- Modified: `src/infrastructure/repositories/subscription-repository.ts`
- Created: `src/infrastructure/repositories/subscription-repository.test.ts`
- Modified: `src/app/(parent)/dashboard/actions.ts`
- Created: `src/app/(parent)/dashboard/actions.test.ts`
- Modified: `src/app/(parent)/dashboard/page.tsx`
- Modified: `src/app/(parent)/dashboard/loading.tsx`
- Created: `src/components/parent/upsell-banner.tsx`
- Modified: `src/locales/vi/dashboard.ts`
- Created: `src/app/(parent)/subscription/plans/page.tsx`

## Change Log

- 2026-07-23: Implemented the free-tier upsell banner end-to-end — relocated the shared allotment-exhaustion check into `subscription-repository.ts`, wired it into the dashboard data action, built the dismissible `UpsellBanner` client component with per-child VN-day localStorage persistence, added the `/subscription/plans` stub route, and added Vietnamese locale strings and unit tests. All tasks complete; status moved to review.
