---
baseline_commit: 7ece3ae
---

# Story 3.7: Session State Preservation & Offline Resilience

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student (via an active Child Profile),
I want my session preserved if I close the browser or lose connectivity mid-session,
so that I never lose progress and can resume where I left off.

## Acceptance Criteria

1. **Given** I am mid-session and close the browser tab, **when** I return to the student home, **then** the CTA reads "Tiếp tục buổi luyện" with a progress indicator (e.g., "3 / 10 câu") sourced from the in-progress `Session` in the DB (UX-DR13, UX-DR20).
2. **Given** I tap "Tiếp tục buổi luyện", **when** the session screen loads, **then** I am placed at the next unanswered question; already-answered questions are not re-presented.
3. **Given** I lose network connectivity mid-session, **when** I attempt to submit an answer, **then** answer buttons are disabled and a non-blocking inline banner shows "Mất kết nối — kiểm tra lại"; no session data is lost.
4. **Given** connectivity is restored, **when** I try to submit again, **then** the offline banner disappears and answer submission resumes normally.
5. Only one in-progress Session per Child Profile is permitted at a time; starting a new Session while one is in-progress marks the previous as abandoned (not `completedAt`).

## Tasks / Subtasks

- [x] Task 1: Add `abandonedAt` to the `Session` model + migration (AC: #5)
  - [x] **Critical technical decision — read before coding:** neither `epics.md` nor `ARCHITECTURE-SPINE.md`'s ER diagram models "abandoned" as distinct from "in-progress" — both currently collapse onto `completedAt: null` (see the field comment at `prisma/schema.prisma:164`). AC #5 explicitly requires abandoned ≠ completed, so this story must extend the schema. Add exactly one nullable column: `abandonedAt DateTime?` to `model Session` in `prisma/schema.prisma` (alongside `completedAt`), with a comment mirroring the existing style, e.g. `// non-null = superseded by a newer Session for this Child Profile; never counts toward accuracy (completedAt stays null)`.
  - [x] Do NOT add a `status` enum — that would require migrating existing rows and touching every `completedAt`-based query (`getSkillAccuracyHistory`, `countQuestionsAnsweredToday`, the session/summary pages). `abandonedAt` is strictly additive: every existing query that filters or checks `completedAt` is completely unaffected by this new column.
  - [x] Run `prisma migrate dev --name add_session_abandoned_at` (or equivalent) so the column exists in the dev DB. Follow the exact migration workflow already used in this repo (Story 1.2/3.2 precedent — `DATABASE_URL` direct connection for the migration itself, never `DATABASE_URL_POOLED`).
  - [x] The **resumable / "in-progress" session** for a Child Profile is defined from now on as: `completedAt IS NULL AND abandonedAt IS NULL`. Use this exact predicate everywhere a "currently active session" needs to be found or validated in this story (Tasks 2–5).

- [x] Task 2: Repository functions for active-session lookup and abandonment (AC: #1, #2, #5)
  - [x] In `src/infrastructure/repositories/session-repository.ts`, add `findActiveSession(childProfileId: string): Promise<{ id: string; answeredCount: number; questionCount: number } | null>`. Query `db.session.findFirst({ where: { childProfileId, completedAt: null, abandonedAt: null }, include: { answers: { select: { answeredAt: true } } } })`, ordered `orderBy: { startedAt: 'desc' }` (defensive — should be unique by invariant, but never trust it blindly). Return `null` if none; otherwise `{ id, answeredCount: answers.filter(a => a.answeredAt !== null).length, questionCount: session.questionCount }`. No repository business logic beyond this shape-mapping (AD-2 — repositories import domain types only).
  - [x] Add `abandonPreviousSessions(childProfileId: string): Promise<void>` — `db.session.updateMany({ where: { childProfileId, completedAt: null, abandonedAt: null }, data: { abandonedAt: new Date() } })`. `updateMany` is intentional here (not `update`) so this is safe even if the one-in-progress invariant were ever violated by a bug — it cleans up all stragglers, not just one.
  - [x] These two functions follow the exact style of the existing file (plain exported async functions, no classes, `db` singleton import, `toDomainSession` pattern reused where useful) — do not restructure the file.

- [x] Task 3: Wire abandonment into session start (AC: #5)
  - [x] In `src/app/(student)/actions.ts`'s `startSessionAction`, call `abandonPreviousSessions(childProfile.id)` **before** `createSession(...)` (after the allotment check, so an allotment-blocked student never abandons their real in-progress session by accident — the gate already returns early on `ALLOTMENT_EXHAUSTED` before reaching this point). Import `abandonPreviousSessions` from the repository alongside the existing imports.
  - [x] Do not wrap this in the same `$transaction` as `createSession` — they are two independent, idempotent writes (abandon-then-create), and `createSession` is already its own transaction in the repository. Keep `startSessionAction`'s existing try/catch and return shape untouched otherwise.

- [x] Task 4: Resume CTA on student home (AC: #1)
  - [x] Add `getActiveSessionState(childProfileId: string): Promise<{ sessionId: string; progressLabel: string } | null>` to `src/app/(student)/actions.ts` (same file/pattern as `getSessionStartGateState` — a read-only server action for render-time use). Call `findActiveSession`; if `null` return `null`; else return `{ sessionId: session.id, progressLabel: student.resumeProgressLabel(session.answeredCount, session.questionCount) }`.
  - [x] In `src/app/page.tsx` (`RootPage`), call `getActiveSessionState(childProfile.id)` **before** `getSessionStartGateState`. If it returns non-null, render `<StudentHomeCard childName={childProfile.name} activeSession={{ sessionId, progressLabel }} />` directly and skip the gate-card branch entirely — a student resuming an already-started session must never be blocked by the free-tier gate (the gate only applies to *starting new* sessions, and this session already started under whatever allotment state existed then). Only fall through to the existing `gateState.blocked` branch when there is no active session.
  - [x] `StudentHomeCard`'s `activeSession` prop is currently `{ progressLabel: string }` (`src/components/student/student-home-card.tsx:8`) — extend it to `{ sessionId: string; progressLabel: string }`. The dead `<Button>` in the `activeSession` branch has no navigation today; replace it with a `next/link` `<Link href={`/session/${activeSession.sessionId}`}>` styled identically (`className="min-h-16"`, reuse `Button`'s classes via `buttonVariants` or just keep the existing look — match `SessionStartButton`'s visual weight, this component can stay a Server Component since a `Link` needs no client interactivity, unlike `SessionStartButton` which calls a server action).

- [x] Task 5: Locale strings (AC: #1, #3)
  - [x] Add to `src/locales/vi/student.ts`: `resumeProgressLabel: (current: number, total: number) => \`${current} / ${total} câu\`` — note this is a **different string shape** from the existing `sessionProgressLabel` (used only by `session-progress-chip`, format `"3 / 10"` with no "câu" suffix per Story 3.3/EXPERIENCE.md's chip spec) — do not reuse or merge the two formatters, they serve different UI locations with different exact copy.
  - [x] Add `offlineBanner: 'Mất kết nối — kiểm tra lại'` (exact copy from EXPERIENCE.md's Offline state pattern — do not rephrase).

- [x] Task 6: Offline detection hook (AC: #3, #4)
  - [x] Create `src/components/student/use-online-status.ts` — a small client-only hook: `export function useOnlineStatus(): boolean`. Initialize state from `navigator.onLine` (guard for SSR: default `true` before mount, matching the existing repo pattern of client components that read browser APIs only inside `useEffect`), then in a `useEffect` add `window.addEventListener('online', ...)` / `'offline'` listeners that flip the state, with cleanup on unmount. No polling, no external library — `navigator.onLine` + the standard events is sufficient and matches this repo's "no new dependencies" pattern (see 3.6 Dev Notes: Web Speech API, sonner, lucide — all native/already-installed).

- [x] Task 7: Offline banner component (AC: #3, #4)
  - [x] Create `src/components/student/offline-banner.tsx` with `data-slot="offline-banner"` (existing repo convention — every student component carries this attribute). Non-blocking = it renders inline within the question card's flow, never a modal/overlay/Toast (EXPERIENCE.md explicitly distinguishes the student surface's inline banner from the Toast pattern used elsewhere). Use `role="status"` (matches the existing live-region pattern in `question-card.tsx:143`) so screen readers announce it without stealing focus. Text: `student.offlineBanner`. Respect `prefers-reduced-motion` if you add any transition (`motion-reduce:transition-none`, matching `answer-button-grid.tsx:49`) — but a simple show/hide (conditional render) needs no animation at all; don't add one that isn't required.

- [x] Task 8: Wire offline state into `QuestionCard` (AC: #3, #4)
  - [x] In `src/components/student/question-card.tsx`, call `const isOffline = !useOnlineStatus()` and pass `disabled={alreadyAnswered || isSubmitting || isOffline}` to `AnswerButtonGrid` (currently `disabled={alreadyAnswered || isSubmitting}` at line 137) — `AnswerButtonGrid` already accepts and applies a single `disabled` boolean, no prop-shape change needed there.
  - [x] Render `<OfflineBanner />` conditionally when `isOffline` is true, placed near the answer grid (inside the existing `<div className="px-(--card-spacing)">` wrapping the grid, so it shares the card's padding/spacing convention — do not create a new spacing scheme).
  - [x] No data-loss handling is needed beyond this: every answer only ever gets recorded via `recordAnswer`'s atomic `updateMany` (`session-repository.ts:38-48`), which only commits once the request actually reaches the server — if the student is offline, `submitAnswerAction` simply never fires (buttons are disabled), so there is nothing client-side to persist or replay. UX-DR20's "session answer state cached locally" requirement is already satisfied structurally: the DB is the only source of truth, and the session/summary pages already resume from `firstUnanswered` on any reload (`src/app/(student)/session/[sessionId]/page.tsx:38-41`, unchanged by this story). **Do not add `localStorage`/`IndexedDB` — it is unnecessary and out of scope.**
  - [x] Reconnection (AC #4) requires no explicit "retry" logic — `useOnlineStatus()` flipping back to `true` re-enables the grid on its own (React re-render), and the student simply taps the answer again; `handleSelect`'s existing `submitLockRef` guard still protects against double-submission exactly as before. No changes to `handleSelect`, `advance`, or any timer logic.

- [x] Task 9: Reject stale/abandoned sessions server-side (AC: #5, defense in depth)
  - [x] `src/app/(student)/session/[sessionId]/page.tsx`: after the existing `session.childProfileId !== childProfileId` check and before the `completedAt !== null` redirect, add: `if (session.abandonedAt !== null) redirect('/')` — a stale tab/bookmark pointing at a superseded session must never render a question card for it; sending the student home naturally re-renders the *current* active session's resume CTA (Task 4) if one exists.
  - [x] `submitAnswerAction` and `completeSessionAction` in `src/app/(student)/actions.ts` both already `include: { session: true }` or `findUnique` the session — add `session.abandonedAt !== null` to each existing ownership-check condition (same branch that currently returns `UNAUTHORIZED` for `session.childProfileId !== childProfileId`), so a manipulated/stale client can't record an answer or complete an abandoned session. Reuse the existing `UNAUTHORIZED` error code — an abandoned session is not meaningfully different from "not yours" from the client's perspective, and no new error code/locale string is needed.

- [x] Task 10: Layer, convention, and regression check
  - [x] Layer audit (AD-2): `use-online-status.ts` and `offline-banner.tsx` are pure client/presentation — zero imports from `src/domain/` or `src/infrastructure/`. `findActiveSession`/`abandonPreviousSessions` live only in the repository; no business logic beyond shape-mapping.
  - [x] Run `pnpm lint`, `npx tsc --noEmit`, `pnpm test` — all clean; the existing 34 tests must still pass. No new unit tests are mandated by this story's ACs (the new logic is either a thin repository query, a thin browser-event hook, or UI wiring) — if you judge `abandonPreviousSessions`/`findActiveSession` worth a lightweight test, follow the Vitest conventions already in the repo, but this is optional, not blocking.
  - [x] Manual browser verification pass before review (Epic 2 retro action item — mandatory gate, and especially important here since offline/reload behavior cannot be meaningfully asserted by unit tests): (1) start a session, answer 2–3 questions, close the tab, reopen student home → CTA reads "Tiếp tục buổi luyện" + correct "X / N câu" count; (2) tap resume → lands on the next unanswered question, previously-answered ones are not re-shown; (3) start a **second** session while the first is still in-progress (e.g. via `startSessionAction` triggered again) → confirm the first session's `abandonedAt` gets set and only the new session is resumable; (4) navigate directly to the old abandoned session's URL → redirected to `/`; (5) mid-session, use browser devtools to go offline → answer buttons disable, banner "Mất kết nối — kiểm tra lại" appears; (6) go back online → banner disappears, tap an answer → submits normally; (7) full run: start → answer some → close tab → resume → finish → summary, confirming no regression in Stories 3.3–3.6's flows.

## Dev Notes

- **The core schema gap this story must close:** `Session.completedAt: null` today means "in-progress OR abandoned" — genuinely ambiguous, confirmed by reading both the architecture spine's ER diagram and the live `prisma/schema.prisma` (neither models abandonment). This story adds `abandonedAt DateTime?` (Task 1) as the minimal, additive fix. Every existing accuracy/allotment query already filters or checks on `completedAt` alone and is untouched — this is a pure resumability/UI fix, not a scoring change.
- **Resume-vs-gate priority (Task 4):** an in-progress session must always be resumable regardless of the Free Tier allotment. Check `getActiveSessionState` *before* `getSessionStartGateState` in `RootPage` and short-circuit on a hit. This matches the intent of FR-5 (the gate blocks *starting new* sessions) and avoids a confusing dead end where a student who is mid-session suddenly can't get back in because they've technically "used up" today's allotment via the very session they're trying to resume.
- **Only one session is ever resumable by construction, not by query filtering:** `abandonPreviousSessions` runs at the *start* of every new session (Task 3), so at read time (`findActiveSession`) there is at most one row matching `completedAt: null AND abandonedAt: null` for a given `childProfileId` — the `orderBy: startedAt desc` + `findFirst` in Task 2 is defensive, not the primary correctness mechanism.
- **UX-DR20's "cached locally" is already satisfied by the existing server-authoritative design — do not build a client cache.** Every answer commits atomically server-side before the UI advances (`recordAnswer`'s `updateMany({ where: { answeredAt: null } })`), and reload/resume always re-derives state from the DB (`firstUnanswered` lookup in the session page, unchanged since Story 3.4). The offline banner's job is purely to prevent *new* submission attempts while disconnected — it protects against wasted taps, not data loss, because there is no unsent client-held answer state to lose in the first place.
- **Two distinct progress-label formatters — do not conflate them:** `student.sessionProgressLabel` (existing, `"3 / 10"`, no "câu") drives the in-session `session-progress-chip`; the new `student.resumeProgressLabel` (`"3 / 10 câu"`, Task 5) drives only the student-home resume CTA. They read similarly but are separate UI locations with separately-specified copy (EXPERIENCE.md's state-pattern table uses "3 / 10 câu" specifically for the home-screen resume state).
- **No new dependencies:** `navigator.onLine` + `online`/`offline` window events are native Web APIs, no library needed. Matches this repo's established "native-first" pattern (Web Speech API in 3.8-adjacent audio-button work, no animation library in 3.6).
- **Untouched territory:** `session-question-selection.ts` / adaptive difficulty selection logic, `completeSession`/`getSkillAccuracyHistory` internals, `question-card.tsx`'s timer/feedback/advance logic (only the `disabled` prop expression and one new banner render are added), `session-summary-card.tsx`, `free-tier-gate-card.tsx`, the allotment-counting logic in `isAllotmentExhausted`. This story does not touch Story 3.8's scope (TTS, audio-button auto-play, the broader accessibility floor sweep — focus-on-disable is explicitly deferred there per `deferred-work.md`).

### Previous Story Intelligence (Story 3.6)

- **Established component conventions to keep following:** `data-slot` attribute on every new student component (`offline-banner.tsx` needs one); primary CTA styling class string `bg-primary text-primary-foreground rounded-brand-lg text-label-student min-h-11 min-w-11 px-5 py-2 inline-flex items-center justify-center gap-2` (reuse verbatim for the resume `Link`, don't invent new styling); sonner `toast.error(result.error.message)` for action errors (no new pattern needed here — no new error-returning action is added in the offline path); locale functions (not string interpolation) for parameterized copy (`resumeProgressLabel` must be a function, matching `sessionProgressLabel`/`summaryScoreLabel`'s existing shape).
- **Testing precedent from 3.5/3.6:** unit-test pure logic, manually browser-verify the rest. This story's only new "pure" logic is the two repository functions (thin, mostly DB pass-through) — treat unit tests here as optional; the manual pass (Task 10) is the load-bearing verification, exactly as 3.5's timer/race behavior and 3.6's routing/celebration flow were verified.
- **Epic 2 retro gate is still active and non-negotiable:** a manual browser verification pass is mandatory before marking this story done — 3.5's manual pass caught a real bug no static check found, and this story's core behaviors (tab-close resume, offline detection, session abandonment) are exactly the class of thing static analysis and unit tests cannot meaningfully cover.
- **`tailwind-merge` `rounded-brand-*` caveat (Epic 2 retro, still open, still unresolved):** if the resume CTA `Link` reuses `Card`'s `rounded-brand-xl` styling context (it's nested inside `StudentHomeCard`'s existing `Card`), this is the same accepted, pre-existing risk as `question-card`/`free-tier-gate-card`/`session-summary-card` — don't attempt a new workaround here.
- **Idempotent-action pattern from 3.6 is worth mirroring** if you find yourself needing it: `completeSessionAction`'s "already-completed → success, not error" design is the template for handling any race between abandonment and a lingering client tab — but this story's Task 9 handles that case more simply (abandoned sessions are rejected outright, not silently succeeded, since there is no forward progress to be idempotent about once superseded).

### Git Intelligence

- HEAD `7ece3ae` landed Story 3.6 (session summary, per-skill breakdown, `skills.ts` locale, completed-session redirect + dead-end fix). Working tree clean per `git status` — stable baseline for this story.
- Commit pattern: one story per commit (occasionally two when a dependency-only commit precedes, e.g. `e23970c` before `326b00f`), review patches folded in before marking done; message style mixes `feat:`/plain imperative — follow existing style, don't introduce a new convention (e.g. Conventional Commits scopes) unasked.
- `c439863` (Story 3.3) and `326b00f` (Story 3.2) are where `startSessionAction`, `createSession`, and the `SessionAnswer(sessionId, questionId)` unique constraint were built — the exact functions Task 3 extends.

### Project Structure Notes

- New files: `src/components/student/use-online-status.ts`, `src/components/student/offline-banner.tsx`.
- Modified: `prisma/schema.prisma` (+ new migration file under `prisma/migrations/`), `src/infrastructure/repositories/session-repository.ts` (add `findActiveSession`, `abandonPreviousSessions`), `src/app/(student)/actions.ts` (add `getActiveSessionState`; extend `startSessionAction` to call `abandonPreviousSessions`; extend `submitAnswerAction`/`completeSessionAction` ownership checks with the `abandonedAt` guard), `src/app/page.tsx` (call `getActiveSessionState` before the gate check), `src/components/student/student-home-card.tsx` (`activeSession` prop gains `sessionId`; dead Button becomes a real `Link`), `src/app/(student)/session/[sessionId]/page.tsx` (add abandoned-session redirect), `src/components/student/question-card.tsx` (wire `useOnlineStatus` into the existing `disabled` expression + render `OfflineBanner`), `src/locales/vi/student.ts` (2 new strings: `resumeProgressLabel`, `offlineBanner`).
- No new route segments, no new page files. Matches the Architecture Spine's existing capability map entry "Student practice session → `src/app/(student)/session/`" — this story extends that capability's resiliency, it doesn't relocate anything.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.7: Session State Preservation & Offline Resilience] — verbatim AC basis (ACs #1–#5)
- [Source: _bmad-output/planning-artifacts/epics.md#Additional Requirements] — UX-DR20 ("session answer state cached locally... mid-session resume flow... offline mode disables answer submission but preserves displayed content")
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#State Patterns] — exact copy "Tiếp tục buổi luyện" + "3 / 10 câu" (mid-session resume state); exact copy "Mất kết nối — kiểm tra lại" (offline state, student surface — distinct from the Toast-based offline pattern used on parent/teacher/admin surfaces)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md#Components] — `student-home-card`, `session-progress-chip` component specs (no dedicated "offline-banner" entry — newly named in this story per repo kebab-case convention)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#ER Diagram] — confirms `Session` has no status/abandoned modeling today; [#AD-2] layer rules; [#AD-5] cookie-derived `childProfileId`; [#Consistency Conventions] server action return shape
- [Source: prisma/schema.prisma#Session] — current fields (`completedAt`, `questionCount`, `correctCount`), comment establishing `completedAt: null` = "in-progress/abandoned" (the ambiguity this story resolves)
- [Source: src/infrastructure/repositories/session-repository.ts#createSession, #recordAnswer, #completeSession] — existing transaction/idempotency patterns to extend, not duplicate
- [Source: src/app/(student)/actions.ts#startSessionAction, #getSessionStartGateState, #submitAnswerAction, #completeSessionAction] — action structure, ownership-check pattern, and the exact insertion points for Tasks 3/4/9
- [Source: src/app/page.tsx] — `RootPage`'s existing gate-check call site; insertion point for `getActiveSessionState`
- [Source: src/components/student/student-home-card.tsx] — the pre-existing `activeSession` prop stub (currently always `undefined`) this story wires up for real
- [Source: src/app/(student)/session/[sessionId]/page.tsx#firstUnanswered] — existing resume-to-next-unanswered logic (AC #2 already works for any valid, non-abandoned session — no changes needed there beyond the Task 9 redirect)
- [Source: src/components/student/question-card.tsx, src/components/student/answer-button-grid.tsx] — `disabled` prop plumbing Task 8 extends; existing `role="status"` live-region convention `offline-banner.tsx` follows
- [Source: src/locales/vi/student.ts] — existing string shapes/conventions (`sessionProgressLabel` vs. the new `resumeProgressLabel`)
- [Source: _bmad-output/implementation-artifacts/3-6-session-completion-summary-accuracy-update.md] — previous story: conventions, idempotency pattern, manual-verification precedent
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — confirms focus-management-on-disable is Story 3.8 scope, not this story's
- [Source: _bmad-output/project-context.md] — layer rules, server-action return shape, locale rules, migration conventions (`DATABASE_URL` direct for migrations)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- Dev server (`pnpm dev`, port 4200) had to be stopped/restarted once to release a file lock on the Prisma query engine DLL before `prisma generate` could complete (Windows file-lock quirk, user-approved).
- Migration `20260721084608_add_session_abandoned_at` applied via `dotenv -e .env.local -- prisma migrate dev` (direct `DATABASE_URL`, per repo convention).
- Manual verification used a temporary local Playwright install (added then removed as a dev dependency — not part of the shipped story) to drive the dev server directly, since no `chromium-cli`/project run-skill was available in this environment. Verified against the seeded "Thỏ QA 3-6" child profile (pre-existing test sessions cleared before/after the run).

### Completion Notes List

- Added `Session.abandonedAt` (nullable `DateTime`) via an additive migration; the "resumable" predicate is now `completedAt IS NULL AND abandonedAt IS NULL` everywhere an active session is looked up.
- `findActiveSession` / `abandonPreviousSessions` added to the session repository (thin shape-mapping only, no business logic — AD-2 compliant).
- `startSessionAction` now abandons any previous in-progress session before creating a new one; `getActiveSessionState` (new) is checked in `RootPage` before the free-tier gate so an in-progress session is always resumable regardless of allotment state.
- `StudentHomeCard`'s dead resume button is now a real `next/link` `<Link>` to `/session/{sessionId}`.
- `submitAnswerAction`, `completeSessionAction`, and the session detail page all reject/redirect on `abandonedAt !== null` (defense in depth against stale tabs).
- Offline detection (`useOnlineStatus`) and a non-blocking inline `OfflineBanner` (`role="status"`) disable the answer grid while offline and re-enable it automatically on reconnect — no client-side answer caching added (UX-DR20 is already satisfied by the existing server-authoritative design, confirmed in Dev Notes).
- No new unit tests were added per the story's guidance (optional, not blocking) — the new logic is thin repository/hook/wiring code. `pnpm lint`, `npx tsc --noEmit`, and `pnpm test` (34/34 existing tests) all pass clean.
- Manual browser verification pass completed end-to-end: resume CTA + progress count after "closing the tab" (AC1), resume lands on the correct next unanswered question (AC2), offline banner disables submission and reconnect resumes it (AC3/AC4), and starting a second session abandons the first — verified both via UI (stale-tab second start) and directly at the DB layer (`abandonedAt` set, `completedAt` stays null, rejected resubmission, redirect to `/` on direct navigation to the abandoned session URL) (AC5).

### File List

- `prisma/schema.prisma` (modified — added `Session.abandonedAt`)
- `prisma/migrations/20260721084608_add_session_abandoned_at/migration.sql` (new)
- `src/infrastructure/repositories/session-repository.ts` (modified — added `findActiveSession`, `abandonPreviousSessions`)
- `src/app/(student)/actions.ts` (modified — added `getActiveSessionState`; extended `startSessionAction`, `submitAnswerAction`, `completeSessionAction`)
- `src/app/page.tsx` (modified — checks `getActiveSessionState` before the free-tier gate)
- `src/components/student/student-home-card.tsx` (modified — `activeSession` prop gains `sessionId`; resume CTA is now a real `Link`)
- `src/app/(student)/session/[sessionId]/page.tsx` (modified — redirects to `/` for abandoned sessions)
- `src/components/student/question-card.tsx` (modified — wires `useOnlineStatus`/`OfflineBanner` into the disabled expression)
- `src/locales/vi/student.ts` (modified — added `resumeProgressLabel`, `offlineBanner`)
- `src/components/student/use-online-status.ts` (new)
- `src/components/student/offline-banner.tsx` (new)

## Change Log

- 2026-07-21: Story 3.7 implemented — added `Session.abandonedAt` (additive migration), repository `findActiveSession`/`abandonPreviousSessions`, resume CTA wired into `RootPage`/`StudentHomeCard` ahead of the free-tier gate, offline detection hook + inline `OfflineBanner` disabling the answer grid, and defense-in-depth rejection/redirect for abandoned sessions in `submitAnswerAction`/`completeSessionAction`/the session detail page. 34/34 tests, tsc + lint clean, full manual browser pass executed (resume/progress, resume-to-next-unanswered, offline disable/reconnect, second-session abandonment verified via UI + DB). Status → review.
