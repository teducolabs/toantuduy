---
baseline_commit: e23970c
---

# Story 3.3: Session Start & Free Tier Daily Gate

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student (via an active Child Profile),
I want to start a Session when I tap "Luyện tập hôm nay" — and see a friendly message if my Free Tier allotment is exhausted,
so that I can practice up to my daily limit with a clear, non-commercial experience when it's reached.

## Acceptance Criteria

1. **Given** the active Child Profile is on the Free Tier with remaining daily allotment, **when** I tap "Luyện tập hôm nay", **then** a `Session` is created server-side; I am routed to `/(student)/session/[sessionId]` and the first question loads.
   **And** the `session-progress-chip` ("1 / 10") renders top-right with `aria-live="polite"` (UX-DR17).
2. **Given** the active Child Profile holds an active Subscription, **when** I tap the CTA at any point in the day, **then** a new Session always starts with no allotment check.
3. **Given** a Free Tier Child Profile has answered ≥ the admin-configured daily allotment Questions today (default: 5), **when** the student home loads, **then** the primary CTA is hidden and a `free-tier-gate-card` shows: "Hôm nay [Tên] đã luyện đủ rồi 🌟" with tomorrow's date.
   **And** the gate card contains no pricing, subscription CTA, or commercial content (FR-5).
4. The daily allotment value is read from `GlobalConfig` (key: `FREE_TIER_DAILY_ALLOTMENT`, default `"5"`).
5. The Session's total question count is read from `GlobalConfig` (key: `SESSION_QUESTION_COUNT`, default `"10"`) — this is independent of the Free Tier allotment (AC #4); a Free Tier profile that is allowed to start (< allotment answered today) still gets a full-length Session even if that Session's length would exceed the profile's remaining allotment for the day. The allotment gate is checked only at session-start time, never mid-session.
6. The start-session server action returns `{ data: { sessionId: string } } | { error: { code: 'ALLOTMENT_EXHAUSTED' | 'UNAUTHORIZED' | string; message: string } }` — it never throws.
7. "Today" for the allotment check (AC #3, #4) is a calendar day in the **Asia/Ho_Chi_Minh** timezone (UTC+7, no DST) — not UTC and not server-local time. A Question counts toward "answered today" when its `SessionAnswer.answeredAt` falls within that Asia/Ho_Chi_Minh calendar day, regardless of which Session it belongs to (completed or still in-progress).
8. Selecting the Session's Questions reuses Story 3.1's `selectNextQuestion` domain use case, called once per slot, each call excluding Questions already chosen earlier in the same Session so no Question repeats within one Session. If fewer eligible Questions exist for the Child Profile's Grade Band than `SESSION_QUESTION_COUNT`, the Session is created with as many Questions as are available (never throws, never blocks the student from starting).
9. No third-party analytics, advertising, or tracking SDK script is loaded on any `/(student)/` route or on the student-home render path in `src/app/page.tsx` (NFR-PRIV-2 gap flagged in the implementation-readiness report against this story) — verified by confirming no such package is imported anywhere in that render path (none exist in `package.json` today; keep it that way).

## Tasks / Subtasks

- [x] Task 1: `GlobalConfig` repository (AC: #4, #5)
  - [x] Create `src/infrastructure/repositories/global-config-repository.ts` (new file, per the Architecture Spine's structural seed — this file was never created in Story 3.2/3.1)
  - [x] Export `getFreeTierDailyAllotment(): Promise<number>` — reads `GlobalConfig` row keyed `FREE_TIER_DAILY_ALLOTMENT`, `parseInt`s the string `value`; if the row is missing, return `5` (do not throw — the row should exist after Story 3.2's seed, but never let a missing config row 500 the student surface)
  - [x] Export `getSessionQuestionCount(): Promise<number>` — same pattern for `SESSION_QUESTION_COUNT`, default `10`
  - [x] Do not add a getter for `SESSION_TIME_LIMIT_MINUTES` — nothing in this story (or any story before Epic 7) consumes it; adding it now would be inventing an unused key (see Story 3.2 Dev Notes precedent)
- [x] Task 2: `Subscription` repository (AC: #2)
  - [x] Create `src/infrastructure/repositories/subscription-repository.ts` (new file, also named in the Architecture Spine's structural seed and not yet created)
  - [x] Export `hasActiveSubscription(parentAccountId: string): Promise<boolean>` — `db.subscription.findUnique({ where: { parentAccountId } })`, returns `true` only if the row exists and `status === 'ACTIVE'`
  - [x] `ChildProfile` has no direct `parentAccountId` shortcut issue here — the domain `ChildProfile` type already carries `parentAccountId` (see `src/domain/entities/child-profile.ts`), so no join is needed beyond the one Prisma call
- [x] Task 3: "answered today" count (AC #3, #7)
  - [x] Add a helper (co-locate in `src/infrastructure/repositories/session-repository.ts`, alongside the other Session/SessionAnswer queries) `countQuestionsAnsweredToday(childProfileId: string): Promise<number>` — counts `SessionAnswer` rows where `session.childProfileId = childProfileId` and `answeredAt` falls within "today" in Asia/Ho_Chi_Minh
  - [x] Compute the Asia/Ho_Chi_Minh day boundary in UTC before querying: Asia/Ho_Chi_Minh is a fixed UTC+7 offset (no DST, so this is simple arithmetic — do not use `Intl.DateTimeFormat` timezone conversion tricks here, they're unnecessary for a fixed offset). Given the current instant, the boundary is: `todayStartUtc = <UTC midnight of (nowUtc + 7h), then shifted back 7h>`. Concretely: `const nowVn = new Date(Date.now() + 7 * 3600_000); const vnMidnightUtcMs = Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate()) - 7 * 3600_000; const todayStartUtc = new Date(vnMidnightUtcMs); const todayEndUtc = new Date(vnMidnightUtcMs + 24 * 3600_000)`. Query `answeredAt: { gte: todayStartUtc, lt: todayEndUtc }`.
  - [x] This intentionally counts answers from **any** Session (completed or still in-progress) for that Child Profile today — the Free Tier gate is about Questions actually answered, not Sessions completed. Do not filter on `session.completedAt`.
- [x] Task 4: Question selection for a new Session (AC #8)
  - [x] In the new server action (Task 5), after confirming the student may start: call `getQuestionsForSession({ gradeBand: childProfile.gradeBand })` (Story 3.2) once to get the full eligible pool
  - [x] Derive the distinct `skillId`s present in that pool; call `getSkillAccuracyHistory(childProfileId, skillId)` (Story 3.2) for each to build the `skillAccuracyHistory: SkillAccuracyWindow[]` array `selectNextQuestion` expects
  - [x] Loop `sessionQuestionCount` times: **before each call** (including the first — a Grade Band can have zero eligible Questions), check `if (remainingPool.length === 0) break` — `selectNextQuestion` throws `Error('no available questions')` on an empty array (see `src/domain/use-cases/adaptive-difficulty.ts`), and AC #8 requires this loop to never throw, so the guard must run every iteration, not only after removal. Otherwise call `selectNextQuestion(skillAccuracyHistory, remainingPool)`, push the result's `id` to `questionIds`, then remove that Question from `remainingPool` before the next iteration (by `id`, not by object identity) so it can't be picked twice
  - [x] Call `createSession(childProfileId, questionIds)` (Story 3.2) with the accumulated list
- [x] Task 5: `startSessionAction` server action (AC: #1, #2, #3, #4, #6)
  - [x] Create `src/app/(student)/actions.ts` (new file) with `'use server'` at the top
  - [x] **Do not copy `requireParentAccountId` from `src/app/(parent)/profiles/actions.ts`** — the student surface has no NextAuth session at all (children never authenticate; AD-5). The "session check" here is: read `childProfileId` via `getChildProfileId(await headers())` (`src/lib/child-profile-cookie.ts`); if `null`, return `{ error: { code: 'UNAUTHORIZED', message: 'No active child profile' } }` immediately, before touching the DB
  - [x] Resolve the `ChildProfile` via `findChildProfileById(childProfileId)` (`src/infrastructure/repositories/child-profile-repository.ts`, already exists); if `null` (deleted/invalid), also return `{ error: { code: 'UNAUTHORIZED', ... } }`
  - [x] Call `hasActiveSubscription(childProfile.parentAccountId)`. If `true`, skip the allotment check entirely (AC #2) and go straight to Task 4's question selection
  - [x] If not subscribed: call `getFreeTierDailyAllotment()` and `countQuestionsAnsweredToday(childProfile.id)`; if `answeredToday >= allotment`, return `{ error: { code: 'ALLOTMENT_EXHAUSTED', message: '...' } }` without creating a Session
  - [x] Otherwise proceed to Task 4, then return `{ data: { sessionId: session.id } }`
- [x] Task 6: Student home wiring — CTA and gate card (AC: #1, #3)
  - [x] The student home render lives in `src/app/page.tsx` (`RootPage`), **not** under `src/app/(student)/` — Story 2.3 put it there because it's reachable from an authenticated PARENT session with an active child-profile cookie, not from a standalone student route. Do the allotment pre-check (Task 3's helper + subscription check) **server-side in `RootPage`** so it can decide, at render time, whether to show the primary CTA or the `free-tier-gate-card` — this is a read-only pre-check for rendering, distinct from the authoritative check `startSessionAction` repeats on click (a TOCTOU gap is expected and fine: worst case the button click re-checks and returns `ALLOTMENT_EXHAUSTED`, which the client button must handle, see below)
  - [x] Create `src/components/student/free-tier-gate-card.tsx` — server component, `Card`/`rounded-brand-xl`, no CTA/link/pricing of any kind (AC #3). Needs tomorrow's date in Asia/Ho_Chi_Minh — compute it the same fixed-offset way as Task 3 (`todayStartUtc + 24h`, formatted for display), do not add a date library
  - [x] `StudentHomeCard` (`src/components/student/student-home-card.tsx`) currently renders a plain `Button` with no click behavior. Convert the CTA into a new client component `src/components/student/session-start-button.tsx` (`'use client'`) that calls `startSessionAction()` on click, and on `{ data }` does `router.push(`/session/${sessionId}`)` (from `next/navigation`'s `useRouter`); on `{ error }` shows a `sonner` toast (already a project dependency) with the error message — if the error code is `ALLOTMENT_EXHAUSTED`, the toast is the only feedback needed for this story (a full re-render into the gate card is Story 3.6/3.7 territory, not required here)
  - [x] `StudentHomeCard`'s `activeSession` prop stays as-is (mid-session resume is Story 3.7 scope) — only replace the plain `Button` with `SessionStartButton` for the "no active session" branch
- [x] Task 7: Session route scaffold (AC: #1)
  - [x] The epics AC requires routing to `/(student)/session/[sessionId]` — today `src/app/(student)/session/page.tsx` is a static stub with no dynamic segment. Replace it: delete `src/app/(student)/session/page.tsx`, create `src/app/(student)/session/[sessionId]/page.tsx`
  - [x] Scope boundary: this story only needs to prove routing + "first question loads" at a minimal level — fetch the Session's first unanswered `SessionAnswer`/`Question` server-side and render its `prompt` in plain text plus the `session-progress-chip` (`"1 / N"`, `aria-live="polite"`, per AC #1). The full `question-card`, `answer-button` grid, audio button, and interaction wiring are Story 3.4's scope — do not build them here. A minimal, correctly-labelled placeholder is the right amount of work; a fully-styled question screen is scope creep
  - [x] You will need a way to look up a Session's questions in order — Story 3.2 deferred this exact gap ("`createSession` doesn't expose per-question `SessionAnswer` ids that `recordAnswer` requires"). For this story, a simple `db.session.findUnique({ where: { id }, include: { answers: { include: { question: true } } } })` read (ordered by `SessionAnswer.id` creation order, since `createMany` preserves array order but Prisma doesn't guarnatee a stable read order — add an explicit `orderBy` if you need determinism, e.g. include a sequence or rely on `id` collation) is sufficient to render the first question here; do not build a full `getSessionWithQuestions` repository abstraction beyond what this minimal page needs — Story 3.4 will formalize the real data-loading contract for the session screen
- [x] Task 8: No-tracking verification (AC #9)
  - [x] Confirm no analytics/ads SDK package exists in `package.json` and none is imported in `src/app/page.tsx`, `src/app/(student)/**`, or `src/components/student/**` — this should already be true; the task is to verify and keep it true, not to add anything
- [x] Task 9: Layer + convention check
  - [x] Confirm `src/app/(student)/actions.ts` is the only place the allotment/subscription/question-selection logic is composed — `global-config-repository.ts`, `subscription-repository.ts`, and the `session-repository.ts` addition stay pure data access (AD-2), no `selectNextQuestion` calls inside repository files
  - [x] Run `pnpm lint` and `npx tsc --noEmit`; both must be clean

## Dev Notes

- **This story's server action is the first place three repositories' worth of logic gets composed together** (`global-config-repository`, `subscription-repository`, `session-repository`, `question-repository`, plus the Story 3.1 domain use case). This composition is Application-layer work per AD-2 — it belongs in `src/app/(student)/actions.ts`, not in any repository file.
- **The student surface has no NextAuth session — do not use `auth()` or copy `requireParentAccountId`.** Every existing server action in this repo (`src/app/(parent)/profiles/actions.ts`, `src/app/register/actions.ts`) checks a NextAuth session because those surfaces require PARENT/TEACHER/ADMIN login. The `(student)` surface is different: per AD-5, a child never authenticates — the only trust boundary is the signed `childProfileId` cookie, verified via `getChildProfileId()`. This is the single most likely copy-paste mistake for this story.
- **Free Tier allotment (5) and Session length (10) are two independent `GlobalConfig` numbers — do not conflate them.** The gate only blocks *starting* a new Session once today's answered-Question count reaches the allotment; a Session that's allowed to start is always full-length (`SESSION_QUESTION_COUNT`), even if that would carry a Free Tier profile past its allotment mid-session. This is spec-accurate (re-read epics.md Story 3.3 AC carefully) — it is not a bug to "fix" by truncating Session length to the remaining allotment.
- **Timezone:** Asia/Ho_Chi_Minh is a fixed UTC+7 offset with no DST — do not reach for a timezone library (none is installed; don't add one) or `Intl.DateTimeFormat({ timeZone: ... })` gymnastics. Plain millisecond arithmetic (`+7 * 3600_000` and back) is correct and is what Epic 4's weekly-activity-strip story will also need — establishing the pattern here matters for consistency.
- **Existing repository precedent, and where this story diverges:** `question-repository.ts`/`session-repository.ts` (Story 3.2) map every Prisma row to a domain type before returning. Follow that same pattern for anything new you add to `session-repository.ts` in this story. `global-config-repository.ts` and `subscription-repository.ts` are simple enough (a number, a boolean) that no dedicated domain entity is needed for them — return primitives directly, don't invent a `GlobalConfig` domain type for two getters.
- **`selectNextQuestion` (Story 3.1) has a documented, accepted limitation** (see `_bmad-output/implementation-artifacts/deferred-work.md`): it never reaches Difficulty Level 4–5, and duplicate-Question-avoidance across multiple calls is the caller's job, not the use case's. This story is the first real caller — you must strip already-picked Questions from the pool between calls yourself (Task 4); the use case will happily pick the same Question twice if you let it.
- **`getSkillAccuracyHistory` was ordered oldest-first by Story 3.2** specifically so `selectNextQuestion` receives correctly-ordered windows — trust it, don't re-sort.
- **Route restructure:** moving `src/app/(student)/session/page.tsx` → `src/app/(student)/session/[sessionId]/page.tsx` is a rename+param addition, not a new independent route — check nothing else references the old static path (nothing does today; it was a Story-1.1-era stub).
- **Scope discipline for the session page:** the epics AC text says "the first question loads" for this story, but Story 3.4 ("Question Display & Answer Submission") is the story that builds the actual `question-card`/`answer-button` UI. Build only enough here to prove the routing + data-loading contract works (plain text prompt + progress chip) — resist the urge to build the full interactive question screen now; that duplicates Story 3.4's work and risks inconsistent component ownership.
- **NFR-PRIV-2 gap (AC #9):** the implementation-readiness report (`_bmad-output/planning-artifacts/implementation-readiness-report-2026-07-08.md`, MINOR-4) explicitly recommended adding a no-tracking-SDK AC to this story. Today this is trivially true (nothing in `package.json` does this) — the task is a verification checkbox, not new code.
- **Testing:** No test framework gap remains (Vitest installed since Story 3.1). The Asia/Ho_Chi_Minh boundary arithmetic (Task 3) and the duplicate-avoidance question-selection loop (Task 4) are the two places most likely to have an off-by-one bug — both are pure-enough logic that they *could* be extracted into small testable functions (e.g. a standalone `computeVnDayBoundaryUtc(now: Date)` helper) if you want unit-test coverage, but no story AC mandates a specific test count here (unlike Story 3.1's 10-unit-test AC). Use judgment; don't skip testing the timezone math by hand at minimum.
- **Naming/style (project-context.md):** kebab-case files, camelCase functions, `cuid2` IDs, ISO 8601 UTC at domain boundaries, no inline Vietnamese strings — add any new UI copy to `src/locales/vi/student.ts`.

### Previous Story Intelligence (Story 3.2)

- Story 3.2 built `question-repository.ts` and `session-repository.ts` exactly to the signatures this story now calls (`getQuestionsForSession`, `createSession`, `getSkillAccuracyHistory`) — treat those signatures as a fixed, already-reviewed contract; do not modify them beyond the additive `countQuestionsAnsweredToday` helper this story adds to `session-repository.ts`.
- Story 3.2 explicitly deferred two gaps to this story (see `deferred-work.md`): (1) no way to look up a `SessionAnswer.id` by `(sessionId, questionId)` for `recordAnswer` — **still not needed by this story** (this story only creates Sessions and reads the first question for display; `recordAnswer` isn't called until Story 3.4/3.5), so this gap remains open for whichever story wires up answer submission; (2) whether `completeSession` should verify all stubs are filled — also not this story's concern.
- `prisma/seed.ts` already bootstraps `GlobalConfig` with `FREE_TIER_DAILY_ALLOTMENT="5"` and `SESSION_QUESTION_COUNT="10"` (Story 3.2 Task 5) — the two getters this story adds read real, already-seeded data in dev; the `?? default` fallback in your getters is a defensive floor, not something exercised in normal dev flow.
- Vitest, pnpm, and the layer-purity conventions are unchanged from Story 3.2 — see that story file for the full rundown if needed.

### Git Intelligence

- Most recent commits (`e23970c`, `326b00f`) landed Story 3.2's repositories, fixtures, and seed extensions, plus a minor `db:seed`/dotenv tooling fix — both are stable; treat `question-repository.ts` and `session-repository.ts` as-is (only additive changes in this story).
- `src/infrastructure/repositories/child-profile-repository.ts` (Epic 2) remains the only repository returning raw Prisma types instead of domain types — irrelevant to this story except as a reminder of the established file-per-aggregate convention (`db.$transaction` for compound writes, one file per aggregate root).
- No `subscription-repository.ts` or `global-config-repository.ts` exists yet anywhere in the repo — both are net-new in this story, not modifications.

### Project Structure Notes

- New files: `src/infrastructure/repositories/global-config-repository.ts`, `src/infrastructure/repositories/subscription-repository.ts`, `src/app/(student)/actions.ts`, `src/app/(student)/session/[sessionId]/page.tsx`, `src/components/student/free-tier-gate-card.tsx`, `src/components/student/session-start-button.tsx`.
- Modified files: `src/infrastructure/repositories/session-repository.ts` (add `countQuestionsAnsweredToday`), `src/components/student/student-home-card.tsx` (swap plain `Button` for `SessionStartButton`), `src/app/page.tsx` (server-side allotment/subscription pre-check to choose CTA vs. gate card), `src/locales/vi/student.ts` (add gate-card and error-toast strings).
- Deleted files: `src/app/(student)/session/page.tsx` (replaced by the `[sessionId]` dynamic route).
- Matches the Architecture Spine's Structural Seed exactly for `subscription-repository.ts` (explicitly named in the source tree listing, never created before now).
- Do not touch `src/domain/` in this story — the domain use case (`selectNextQuestion`) and constants are a fixed Story 3.1 contract; this story is a consumer only.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3: Session Start & Free Tier Daily Gate] — full AC text (verbatim basis for ACs #1–#6 above)
- [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-07-08.md#MINOR-4] — NFR-PRIV-2 gap → AC #9
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-2] — layer boundary rule (repositories vs. server actions)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-5] — child-profile cookie trust boundary (no NextAuth session in student surface)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-11] — adaptive difficulty use case contract
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#Structural Seed] — `subscription-repository.ts` named in source tree, not yet created
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md] — `session-progress-chip`, `free-tier-gate-card` component specs
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md] — Free Tier gate copy ("Hôm nay [tên] đã luyện đủ rồi 🌟"), state-pattern table
- [Source: prisma/schema.prisma] — `GlobalConfig`, `Subscription`, `Session`, `SessionAnswer`, `ChildProfile` models
- [Source: src/domain/use-cases/adaptive-difficulty.ts, src/domain/constants.ts] — `selectNextQuestion` contract and its documented duplicate-avoidance gap (Story 3.1)
- [Source: src/infrastructure/repositories/question-repository.ts, session-repository.ts] — existing Story 3.2 repository contracts this story calls
- [Source: src/lib/child-profile-cookie.ts, src/lib/active-child-profile.ts] — cookie-based trust boundary for the student surface
- [Source: src/app/page.tsx, src/components/student/student-home-card.tsx] — current student-home render path (Story 2.3) this story wires the CTA into
- [Source: src/app/(parent)/profiles/actions.ts] — existing server-action conventions (`ActionResult<T>` shape) to follow, and the NextAuth session-check pattern to explicitly NOT copy here
- [Source: _bmad-output/implementation-artifacts/3-2-question-session-repository-infrastructure.md] — previous story, repository contracts and deferred findings
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — accumulated deferred findings referenced above (selectNextQuestion duplicate-avoidance, SessionAnswer id lookup gap)
- [Source: _bmad-output/project-context.md] — naming/style conventions, layer rules restated for AI agents

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `pnpm test` → 3 test files, 23 tests passed.
- `pnpm lint` → no ESLint warnings or errors.
- `npx tsc --noEmit` → clean (one initial failure traced to a stale `.next/types` cache entry for the deleted `session/page.tsx` route, not a code error; cleared by removing the stale generated file).

### Completion Notes List

- Implemented `global-config-repository.ts` and `subscription-repository.ts` exactly per the Architecture Spine's structural seed — both were net-new, as Story 3.2's Git Intelligence flagged.
- Added `countQuestionsAnsweredToday`, `computeVnDayBoundaryUtc`, and `formatVnDateLabel` to `session-repository.ts`. The VN day-boundary arithmetic is fixed-offset (UTC+7, no DST) as instructed — no timezone library added. `formatVnDateLabel` reuses the same offset constant to render the gate card's tomorrow-date label without a date library.
- Extracted the duplicate-avoidance question-selection loop into a pure, injectable-picker function (`buildSessionQuestionIds` in the new `src/app/(student)/session-question-selection.ts`) so it's unit-testable without touching the DB; `selectSessionQuestionIds` wraps it with the real repository/domain calls. This module is Application-layer (lives under `src/app/(student)/`, not `src/infrastructure/`), so it doesn't violate AD-2 — only `actions.ts`'s own exports needed to stay async for Next.js's `'use server'` file constraint, which is why the pure loop lives in its own non-`'use server'` file rather than inline in `actions.ts`.
- `startSessionAction` in `src/app/(student)/actions.ts` follows the cookie-based trust boundary (AD-5) exactly as flagged in Dev Notes — no `auth()`, no `requireParentAccountId` copy-paste.
- Added `getSessionStartGateState` (also in `actions.ts`) as the read-only pre-check `RootPage` calls server-side to choose between the CTA and the gate card, keeping Presentation from importing Infrastructure directly (AD-2's layer-direction rule). `startSessionAction` still repeats the authoritative check on click, per the story's accepted TOCTOU gap.
- `session-start-button.tsx` (new client component) replaces the plain `Button` in `StudentHomeCard`'s "no active session" branch; on `ALLOTMENT_EXHAUSTED` or other errors it shows a `sonner` toast per Task 6 — no gate-card re-render on the client, as scoped.
- `free-tier-gate-card.tsx` (new server component) contains no CTA, link, or pricing content (AC #3) — just the title/subtitle copy plus tomorrow's date.
- Session route restructured from the static `src/app/(student)/session/page.tsx` stub to `src/app/(student)/session/[sessionId]/page.tsx`; added a Session-ownership check (session's `childProfileId` must match the cookie's) before rendering, since Story 3.2 didn't build a dedicated lookup for this and the minimal inline `db.session.findUnique` read needed an explicit `orderBy` on `answers` for deterministic ordering. Renders only plain-text prompt + progress chip markup per the Story 3.4 scope boundary — no `question-card`/`answer-button` UI built here.
- Verified no analytics/ads/tracking SDK exists in `package.json` or is imported anywhere under `src/app/page.tsx`, `src/app/(student)/**`, or `src/components/student/**` (AC #9) — confirmed via grep, nothing found.
- Added Vietnamese copy for the new gate card, CTA error toasts, and progress label to `src/locales/vi/student.ts` — no inline Vietnamese strings in components.
- Unit tests added: `session-repository.test.ts` (VN day-boundary arithmetic and date-label formatting — the off-by-one-risk area flagged in Dev Notes, including a UTC month-rollover case) and `session-question-selection.test.ts` (duplicate-avoidance loop: no repeats, stops early without throwing on pool exhaustion, never calls the picker on an empty starting pool, requests exactly `sessionQuestionCount` when the pool allows it).
- Did not touch `src/domain/` (per Dev Notes) and did not modify Story 3.2's `question-repository.ts`/`session-repository.ts` signatures beyond the additive helpers this story specifies.

### File List

**New files:**
- `src/infrastructure/repositories/global-config-repository.ts`
- `src/infrastructure/repositories/subscription-repository.ts`
- `src/app/(student)/actions.ts`
- `src/app/(student)/session-question-selection.ts`
- `src/app/(student)/session-question-selection.test.ts`
- `src/app/(student)/session/[sessionId]/page.tsx`
- `src/components/student/free-tier-gate-card.tsx`
- `src/components/student/session-start-button.tsx`
- `src/infrastructure/repositories/session-repository.test.ts`

**Modified files:**
- `src/infrastructure/repositories/session-repository.ts` (added `countQuestionsAnsweredToday`, `computeVnDayBoundaryUtc`, `formatVnDateLabel`)
- `src/components/student/student-home-card.tsx` (swapped plain `Button` for `SessionStartButton` in the no-active-session branch)
- `src/app/page.tsx` (server-side allotment/subscription pre-check via `getSessionStartGateState` to choose CTA vs. gate card)
- `src/locales/vi/student.ts` (added gate-card copy, error-toast strings, progress label)

**Deleted files:**
- `src/app/(student)/session/page.tsx` (replaced by the `[sessionId]` dynamic route)

## Change Log

- 2026-07-18: Implemented Session Start & Free Tier Daily Gate — GlobalConfig/Subscription repositories, session-start server action with allotment/subscription/question-selection composition, student-home CTA/gate-card wiring, and the minimal session route scaffold. All 9 tasks complete; full test suite, lint, and typecheck clean.

### Review Findings

- [x] [Review][Patch] `startSessionAction` violates AC #6 ("never throws") — no try/catch wraps any DB/repository call; an unhandled exception would propagate instead of returning `{ error }`. Also explains why `student.genericStartError` is dead code. [src/app/(student)/actions.ts:14] — fixed: wrapped body in try/catch, returns `{ error: { code: 'INTERNAL_ERROR', ... } }` on catch.
- [x] [Review][Patch] `getConfigInt` fails open on malformed `GlobalConfig.value` — `parseInt` returning `NaN` silently disables the free-tier gate and the question-selection loop. [src/infrastructure/repositories/global-config-repository.ts:6-9] — fixed: validates `Number.isFinite` and falls back to the default on parse failure.
- [x] [Review][Patch] AC #1/UX-DR17 names a `session-progress-chip`; the session page renders an unlabeled bare `<span>` with no identifiable component boundary. [src/app/(student)/session/[sessionId]/page.tsx:18] — fixed: extracted `src/components/student/session-progress-chip.tsx` (`SessionProgressChip`, `data-slot="session-progress-chip"`).
- [x] [Review][Patch] A Grade Band with zero eligible Questions produces a blank "0 / 0" session screen with no question or message. [src/app/(student)/session/[sessionId]/page.tsx] — fixed: added an empty-answers guard rendering `student.noQuestionsAvailableError`.
- [x] [Review][Patch] `getSessionStartGateState` duplicates the subscription+allotment branch already in `startSessionAction` — extract a shared helper. [src/app/(student)/actions.ts] — fixed: extracted shared `isAllotmentExhausted` helper used by both.
- [x] [Review][Defer] `hasActiveSubscription` has no expiry/grace-period check beyond `status === 'ACTIVE'` [src/infrastructure/repositories/subscription-repository.ts] — deferred, matches Task 2's spec exactly; billing lifecycle correctness is Epic 6 territory.
- [x] [Review][Defer] Per-skill `getSkillAccuracyHistory` fan-out is N+1-shaped [src/app/(student)/session-question-selection.ts] — deferred, mandated by Task 4's spec instructions verbatim; a perf concern for a future pass.
- [x] [Review][Defer] Zero test coverage on `startSessionAction`/`getSessionStartGateState` (the gate itself) [src/app/(student)/actions.ts] — deferred, story's Dev Notes only mandated testing the timezone math, which was done.
