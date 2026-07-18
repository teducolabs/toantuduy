---
baseline_commit: c439863
---

# Story 3.4: Question Display & Answer Submission

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student,
I want each Question displayed in a clear card with answer buttons I tap to submit immediately,
so that I can answer questions quickly without confirmation friction.

## Acceptance Criteria

1. **Given** a Session is active and a Question is loaded, **when** the session screen renders, **then** a `question-card` (white, `rounded-brand-xl`, `shadow-sm`, on warm-cream canvas) shows: an illustration slot (loaded from CDN if `Question.imageUrl` is non-null), the question prompt in `typography.question` (Be Vietnam Pro 600/22px — use the existing `.text-question` utility class), and an `audio-button` top-right.
2. 2–4 `answer-button` components render in a 2-column grid on tablet (`sm:` breakpoint and up) and single column on phone; each is min-height 64px (`min-h-16`), `rounded-brand-lg`, `label-student` typography (18px — use the existing `.text-label-student` utility class); no answer is pre-selected on load.
3. Tapping an answer button submits it immediately — a server action that wraps `recordAnswer()` is called; no separate confirm step (FR-2).
4. On new question load, focus is explicitly moved to the first answer button (UX-DR17).
5. The `question-card` shows a `Skeleton` pulse in illustration and text areas while loading; questions render within 2 seconds on a 4G connection (NFR-4).
6. All answer buttons meet 44×44px minimum touch target; CSS safe-area insets are respected (NFR-1).
7. No hover-only affordances, drag, long-press, keyboard shortcuts, right-click menus, or external links exist in the student surface (UX-DR19).

## Tasks / Subtasks

- [x] Task 1: Add the `Skeleton` shadcn primitive (AC: #5)
  - [x] Create `src/components/ui/skeleton.tsx` — this repo has never used `Skeleton` before (current `src/components/ui/` only has `alert-dialog`, `button`, `card`, `dialog`, `input`, `label`, `select`, `sheet`, `sonner`). Standard shadcn implementation: a `div` with `data-slot="skeleton"`, `className={cn("bg-muted animate-pulse rounded-md", className)}`. Do not restyle it beyond that (DESIGN.md: "Inherit shadcn defaults for all non-brand components").

- [x] Task 2: Sanitize server-side question data before it reaches the client (AC: #1, #2, #3 — security-critical)
  - [x] In `src/app/(student)/session/[sessionId]/page.tsx`, the existing `db.session.findUnique` query already includes the full `question` row (via `include: { answers: { include: { question: true } } }`), which contains `question.correctAnswer`. **Never pass the raw question row into any Client Component** — the RSC payload serializes props to the browser, which would leak the answer key into the page source/devtools for every question up front. Build a sanitized view model before rendering: `{ id, prompt, imageUrl, choices }` only (drop `correctAnswer`, `skillId`, `gradeBand`, `difficultyLevel`).
  - [x] `Question.choices` is a Prisma `Json` column (typed `unknown` on the domain `Question` entity per `src/domain/entities/question.ts`). Fixture data (`prisma/fixtures/questions.json`) shows it's always a flat `string[]` (e.g. `["8", "9", "10", "7"]`), but there's no compile-time guarantee — narrow it defensively: `Array.isArray(choices) ? (choices as string[]) : []`.
  - [x] Also fetch the active Child Profile's `gradeBand` in this page (needed for the audio-button autoplay rule in Task 5) — call `findChildProfileById(childProfileId)` (`src/infrastructure/repositories/child-profile-repository.ts`, already used the same way in `src/app/(student)/actions.ts`). Don't reuse `resolveActiveChildProfile()` from `src/lib/active-child-profile.ts` here — that helper reads the cookie a second time; you already have `childProfileId` from the existing `getChildProfileId` call on this page.

- [x] Task 3: `submitAnswerAction` server action (AC: #3)
  - [x] Add to `src/app/(student)/actions.ts` (existing file, `'use server'` already at top): `submitAnswerAction(sessionAnswerId: string, selectedChoice: string): Promise<ActionResult<{ correct: boolean }>>`.
  - [x] Session check first, same pattern as `startSessionAction`: read `childProfileId` via `getChildProfileId(await headers())`; if `null`, return `{ error: { code: 'UNAUTHORIZED', ... } }` before touching the DB. **Do not use `auth()`** — no NextAuth session exists in the student surface (AD-5), exactly as Story 3.3's Dev Notes flagged.
  - [x] Look up the `SessionAnswer` by `sessionAnswerId` including its `session` and `question` relations (a `db.sessionAnswer.findUnique({ where: { id }, include: { session: true, question: true } })` is sufficient — no new repository abstraction needed for this single lookup). If not found, or `sessionAnswer.session.childProfileId !== childProfileId`, return `{ error: { code: 'UNAUTHORIZED', ... } }` (ownership check, same shape as the existing check in `session/[sessionId]/page.tsx`).
  - [x] If `sessionAnswer.answeredAt !== null`, return `{ error: { code: 'ALREADY_ANSWERED', message: ... } }` without re-writing — guards against a double-tap or a stale/retried request re-scoring an already-answered question (there is no confirm step per AC #3, so a fast double-tap is a real scenario, not a hypothetical).
  - [x] Compute `answeredCorrectly = selectedChoice === sessionAnswer.question.correctAnswer` **server-side** (the client never receives `correctAnswer`, so this comparison cannot happen anywhere else). Call `recordAnswer(sessionAnswerId, answeredCorrectly, sessionAnswer.question.difficultyLevel)` (`src/infrastructure/repositories/session-repository.ts`, Story 3.2 contract — do not modify its signature).
  - [x] Return `{ data: { correct: answeredCorrectly } }`. This is the minimum viable return shape for this story (AC #3 doesn't require showing feedback — that's Story 3.5) but avoids Story 3.5 having to redesign this action's contract, since correctness is inherent to the write this action already performs.
  - [x] Wrap the whole body in try/catch returning `{ error: { code: 'INTERNAL_ERROR', ... } }` on any thrown error — Story 3.3's code review flagged a missing try/catch as an AC violation ("server actions never throw"); do not repeat that gap here.

- [x] Task 4: `question-card` component (AC: #1, #5)
  - [x] Create `src/components/student/question-card.tsx`. Server component (no interactivity of its own — the illustration/prompt are static per render). Use the base `Card` (`src/components/ui/card.tsx`) with `className="rounded-brand-xl shadow-sm bg-white"` (DESIGN.md: white float on `student-bg` canvas — the canvas color already comes from the `(student)` layout's `bg-student-bg`, this card stays literal white).
  - [x] Illustration slot: when `imageUrl` is non-null, render a plain `<img src={imageUrl} alt="" loading="lazy" />` — **not** `next/image`. AD-13 requires the CDN URL to be rendered "with no proxying through the Next.js server"; `next/image`'s optimizer is itself a proxy step, and `next.config.ts` has no `images.remotePatterns` configured for the Supabase Storage host today — adding one would be solving a problem this story doesn't have. `alt=""` because the prompt text already conveys the content (decorative image); don't invent alt text that isn't in the data.
  - [x] Question prompt: render in a `<p className="text-question">` (existing utility class in `src/app/globals.css`, already Be Vietnam Pro 600/22px — do not hand-roll font-size/weight here).
  - [x] Slot the `audio-button` (Task 6) top-right of the card and the answer grid (Task 5) below — both are separate components this one composes, it does not implement their behavior.

- [x] Task 5: `answer-button` grid — client component (AC: #2, #3, #4, #6, #7)
  - [x] Create `src/components/student/answer-button-grid.tsx`, `'use client'`. Props: `sessionAnswerId: string`, `choices: string[]`. **Do not build this on top of the shadcn `Button` component** — DESIGN.md is explicit: "Custom component (not a shadcn `Button` variant)." Use plain `<button>` elements styled directly with Tailwind.
  - [x] Layout: `grid grid-cols-1 sm:grid-cols-2 gap-*` (single column on phone, 2-column from the tablet breakpoint up, per AC #2 and the Responsive table in `EXPERIENCE.md`).
  - [x] Each button: `min-h-16` (64px, matches the precedent already set in `student-home-card.tsx`), `rounded-brand-lg`, `className="text-label-student"` (existing utility, Be Vietnam Pro 600/18px), and an explicit `min-w-11` / adequate padding so the 44×44px touch-target floor (AC #6) holds even for a short one-character choice like "8".
  - [x] On tap: call `submitAnswerAction(sessionAnswerId, choice)`. While the call is pending, disable all buttons in the grid (via local `useState`) — this is the double-tap guard on the client side, complementing the server-side `ALREADY_ANSWERED` check in Task 3. On success, call `router.refresh()` (`next/navigation`'s `useRouter`) — this re-runs the server component, which will naturally render the next unanswered question via the existing `currentIndex` logic in `session/[sessionId]/page.tsx`. On error, show a `sonner` toast (already a project dependency, same pattern as `session-start-button.tsx`).
  - [x] **Do not build feedback visuals (green/rose fill, checkmark/×, "Đáp án đúng là...") or auto-advance timing here** — that is Story 3.5's scope in full. This story's tap→submit→refresh flow intentionally shows no transitional feedback state; resist the urge to add it now, it would duplicate Story 3.5's work.
  - [x] Focus management (AC #4): `useRef` array (or a single ref to the first button) + `useEffect` keyed on `sessionAnswerId` (which changes every time a new question loads) that calls `.focus()` on the first answer button. This must fire on the *initial* render of every question, not just after a client-side interaction — `router.refresh()` remounts this component with a new `sessionAnswerId` prop, so a `useEffect` dependency on that prop is sufficient; no manual "is this the first question" branching needed.
  - [x] No pre-selected state: don't apply any "selected" className on initial render (AC #2 is explicit about this).
  - [x] AC #7 is satisfied by construction as long as you don't add anything extra: plain tap-to-click `<button>` elements have no hover-only affordance, drag, long-press, keyboard shortcut, or right-click menu by default. Don't add a `title` tooltip (hover-only) or a keyboard shortcut hint.

- [x] Task 6: `audio-button` component — client component (AC: #1)
  - [x] Create `src/components/student/audio-button.tsx`, `'use client'`. Props: `text: string` (the question prompt), `autoPlay: boolean` (true only for `GRADE_1` profiles, computed by the caller from `childProfile.gradeBand === 'GRADE_1'` — this component doesn't know about grade bands, it just does what it's told).
  - [x] Use the browser's native Web Speech API (`window.speechSynthesis` + `SpeechSynthesisUtterance`) — no SDK, no package to add. Architecture explicitly left the TTS provider as an open assumption (`DESIGN.md` audio-button: "[ASSUMPTION: TTS uses a Vietnamese voice via Web Speech API or a managed TTS service; exact provider is architecture's decision]"); Web Speech API is the correct default because it's free, needs no server round-trip, and matches AD-1's "no separate backend service" posture. Set `utterance.lang = 'vi-VN'`.
  - [x] Guard every call with `typeof window !== 'undefined' && 'speechSynthesis' in window` — this component can be imported into a tree that renders during SSR, and not every browser implements the API.
  - [x] Tap behavior: call `window.speechSynthesis.cancel()` then `.speak(utterance)` — cancelling first makes a tap during playback restart from the beginning, per `EXPERIENCE.md`: "Tapping during playback restarts."
  - [x] Auto-play: `useEffect` keyed on the prompt `text` (i.e., fires on every new question) that speaks automatically only when `autoPlay` is true.
  - [x] Render: speaker icon (`lucide-react`, already a dependency — e.g. `Volume2`) **and** the visible text label "Nghe lại" — DESIGN.md/`EXPERIENCE.md` are explicit that icon-only is inaccessible; both must always be visible, not icon-only-with-aria-label.
  - [x] Add the `"Nghe lại"` string to `src/locales/vi/student.ts` (no inline Vietnamese in component code, per project-context.md) rather than hardcoding it in the component.

- [x] Task 7: Loading state via Next.js route convention (AC: #5)
  - [x] Create `src/app/(student)/session/[sessionId]/loading.tsx` — Next.js App Router automatically renders this while the server component in `page.tsx` is still resolving its data fetch, which is the idiomatic mechanism for AC #5's "Skeleton pulse ... while loading" (no manual `Suspense`/client-fetch machinery needed).
  - [x] Render a `question-card`-shaped skeleton: same `Card` wrapper/classes as `question-card.tsx`, with `Skeleton` blocks standing in for the illustration area and the prompt text line, so there's no layout shift when the real content replaces it.

- [x] Task 8: Safe-area insets (AC: #6)
  - [x] `src/app/(student)/layout.tsx` currently renders `<div data-mode="student" className="bg-student-bg min-h-screen">` with no safe-area handling — this is a cross-cutting concern for the whole `(student)` route group (not session-screen-specific), and it hasn't been addressed by any prior story (2.3, 3.3). Add it once here: `style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}` on that wrapping div (Tailwind arbitrary-value classes also work, e.g. `p-[env(safe-area-inset-top)]`, but a single `style` object covering all four sides is clearer here than four separate bracket classes).

- [x] Task 9: Wire the session page together (AC: #1, #2, #3, #4)
  - [x] In `src/app/(student)/session/[sessionId]/page.tsx`, replace the current plain-text `<p>{currentQuestion.prompt}</p>` rendering with `<QuestionCard>` composing `<AudioButton>` and `<AnswerButtonGrid>`, passing the sanitized view model (Task 2), the current `sessionAnswerId` (`session.answers[currentIndex].id` — already available from the existing query, no new repository lookup needed), and `autoPlay={childProfile.gradeBand === 'GRADE_1'}`.
  - [x] Keep `SessionProgressChip` exactly where Story 3.3 placed it — top-right of the *session screen*, not the question card. This is a different top-right than the `audio-button`'s (which is top-right of the *card itself*, per AC #1) — don't collapse the two into one corner.
  - [x] Keep the existing empty-answers guard (`student.noQuestionsAvailableError`) and the session-ownership `notFound()` check exactly as Story 3.3 built them — this story only replaces the question-rendering portion, not the surrounding scaffold.

- [x] Task 10: Layer + convention check
  - [x] Confirm no repository file (`session-repository.ts`, `question-repository.ts`) gained any business logic — the correctness check and `recordAnswer` call belong in `submitAnswerAction` (Application layer, AD-2), not in a repository.
  - [x] Confirm no Client Component ever receives a `Question`/`SessionAnswer` object containing `correctAnswer` as a prop — grep the diff for `correctAnswer` and verify every reference is server-side only (inside `page.tsx`'s data-fetch or `actions.ts`).
  - [x] Run `pnpm lint` and `npx tsc --noEmit`; both must be clean.

## Review Findings

- [x] [Review][Patch] Interactive answer grid renders a dead-end on the final/already-answered question — On the render after the last question is answered, `firstUnanswered` is undefined so `page.tsx` falls back to `session.answers[session.answers.length - 1]` (the last, *already-answered* answer) and still renders a fully-enabled `QuestionCard`/`AnswerButtonGrid`. Any tap on any button now always returns `ALREADY_ANSWERED` — a guaranteed dead-end interaction the prior plain-`<p>` rendering didn't have. **Decision (user, 2026-07-18):** apply a minimal guard now — disable/hide the answer grid when the current answer is already answered; full completion UX (`completeSession()`, summary screen) remains out of scope, owned by story 3-6-session-completion-summary-accuracy-update. [src/app/(student)/session/[sessionId]/page.tsx:32-52]

- [x] [Review][Patch] `recordAnswer` write is not atomic against concurrent double-tap/retry — `submitAnswerAction` checks `sessionAnswer.answeredAt !== null` via a separate `findUnique`, then `recordAnswer` performs an unconditional `db.sessionAnswer.update({ where: { id } })`. Two concurrent requests for the same `sessionAnswerId` (racing past the client-side `isSubmitting` guard, or a retried request) can both pass the check before either write commits, letting the same answer be scored/overwritten twice — the Dev Notes call double-tap "a real scenario, not defensive over-engineering" requiring both a client and server guard, but the server guard as written isn't atomic. Fix: make the write conditional (e.g. `updateMany({ where: { id, answeredAt: null }, data })`) and treat a 0-count result as already-answered. [src/app/(student)/actions.ts:99-104, src/infrastructure/repositories/session-repository.ts:36-45]

- [x] [Review][Patch] Duplicate React keys possible in `AnswerButtonGrid` — `key={choice}` uses the choice text itself; `Question.choices` is untyped `Json` narrowed only by `Array.isArray`, with nothing guaranteeing the 2-4 strings are unique. Duplicate distractor text would produce duplicate keys, silently breaking reconciliation/focus. Fix: key on `${choice}-${index}`. [src/components/student/answer-button-grid.tsx:33]

- [x] [Review][Patch] `audio-button` has no enforced 44×44px touch target — `EXPERIENCE.md`'s Accessibility Floor states "All interactive elements meet 44×44px touch target minimum," but `audio-button.tsx`'s `<button>` has no `min-h`/`min-w` sizing, unlike `answer-button-grid.tsx` which explicitly sets `min-h-16 min-w-11` for this exact reason. Fix: add `min-h-11 min-w-11` (or equivalent) to the button's className. [src/components/student/audio-button.tsx:24-30]

- [x] [Review][Patch] Web Speech playback not cancelled on unmount — neither `speak()` nor the autoplay `useEffect` in `audio-button.tsx` cleans up `speechSynthesis` when the component unmounts. If the component unmounts mid-utterance (navigating away, `router.refresh()` remounting the tree), playback can keep running under a screen the user has already left. Fix: return a cleanup function from the effect calling `window.speechSynthesis.cancel()`. [src/components/student/audio-button.tsx:18-21]

- [x] [Review][Patch] Sequential DB reads in the session page could be parallelized — `db.session.findUnique(...)` and `findChildProfileById(childProfileId)` are independent reads currently awaited sequentially, adding avoidable round-trip latency against this story's own NFR-4 2-second render budget. Fix: `Promise.all([...])`. [src/app/(student)/session/[sessionId]/page.tsx:16-30]

- [x] [Review][Patch] Question illustration `<img>` has no explicit dimensions, risking layout shift — no `width`/`height`/`aspect-ratio` is set on the `<img>` in `question-card.tsx`, and its size doesn't match the `loading.tsx` skeleton's fixed `h-40`, so content can still shift once the real image loads at its intrinsic size, undercutting Task 7's "no layout shift" goal. Fix: constrain the image with a fixed aspect-ratio/height class matching the skeleton. [src/components/student/question-card.tsx:19-23]

- [x] [Review][Defer] Session completion (`completeSession`) is never invoked — deferred, pre-existing scope boundary. Story `3-6-session-completion-summary-accuracy-update` (sprint-status.yaml, currently `backlog`) owns session-completion behavior; this story only implements question display/answer submission. [src/app/(student)/actions.ts]

- [x] [Review][Defer] No server-side validation that `selectedChoice` is a member of the question's actual choices — deferred, low risk. Once the atomic-update patch above lands, only the first successful write for a `sessionAnswerId` can ever record an answer, which substantially limits the impact of an unvalidated/tampered `selectedChoice`. Worth hardening later but not required by this story's spec. [src/app/(student)/actions.ts:99]

## Dev Notes

- **The single most important rule in this story: never let `Question.correctAnswer` reach the browser.** Every prior repository/entity in this codebase (`question-repository.ts`, the `Question` domain type) carries `correctAnswer` because the *server* needs it to grade answers — but this story is the first time a `Question` is rendered client-side, and it would be trivial to accidentally spread the whole Prisma row into a Client Component's props. Build and pass an explicit sanitized view model (Task 2); do the correctness comparison only inside `submitAnswerAction` (Task 3).
- **`answer-button` is explicitly NOT a shadcn `Button` variant** (`DESIGN.md` Components section) — build it as a bespoke styled `<button>`. This is a documented brand-layer decision, not an oversight to "fix" by importing `Button`.
- **Scope boundary vs. Story 3.5:** this story ends at "tap → record → `router.refresh()` shows the next question." No feedback color/icon, no mascot, no "Tiếp theo →" button, no auto-advance timer — all of that is Story 3.5 (`Immediate Feedback & Mascot Reactions`). Building any of it now duplicates that story's work and risks two components fighting over the same UI state.
- **`Skeleton` and `next/image` are both first uses in this codebase.** `Skeleton` doesn't exist yet under `src/components/ui/` — add the standard shadcn primitive (Task 1). `next/image` is deliberately *not* used for question illustrations — AD-13 requires the CDN URL to render with no Next.js-server proxying, and a plain `<img>` is simpler and correct; don't add `images.remotePatterns` to `next.config.ts` to enable `next/image` here, that would be unnecessary scope.
- **Web Speech API, not a TTS SDK or package.** `DESIGN.md` left the TTS provider as an open assumption; Web Speech API (`window.speechSynthesis`) is free, client-only, and consistent with AD-1 (no separate backend service). Guard every call for `'speechSynthesis' in window` — SSR and unsupported-browser safety.
- **Grade-based audio autoplay** (`EXPERIENCE.md` audio-button behavior: "Auto-plays on question load for Grade 1 profiles; tap-to-play on Grades 2–3") is not itself a numbered AC in epics.md for this story, but it's a documented UX component-pattern rule directly tied to the `audio-button` this AC #1 requires — implement it, don't skip it because it lacks its own AC number.
- **Double-tap / re-answer guard is a real scenario, not defensive over-engineering:** AC #3 explicitly forbids a confirm step, which means a fast double-tap on a touchscreen is expected input, not an edge case. Task 5's client-side "disable while pending" and Task 3's server-side `ALREADY_ANSWERED` check are both required — the client guard alone isn't sufficient (nothing stops two rapid taps both firing before the first `useState` update commits, or a retried request after a flaky connection).
- **`choices` is untyped `Json` at the Prisma/domain boundary** (`Question.choices: unknown`). Fixture data is a flat `string[]`, but nothing enforces that at compile time — narrow defensively (`Array.isArray(choices) ? choices as string[] : []`) rather than casting blindly.
- **Existing repository contracts are locked, additive-only:** `recordAnswer(sessionAnswerId, answeredCorrectly, difficultyLevelAtAnswer)` (Story 3.2/`session-repository.ts`) is called as-is from `submitAnswerAction` — no repository-file changes are needed for this story; the one new DB read (`db.sessionAnswer.findUnique` with `session`/`question` includes, for the ownership + correctness check) lives inline in the server action, matching the same "minimal inline read" precedent Story 3.3 set for the session page's own `db.session.findUnique`.
- **Naming/style (project-context.md):** kebab-case files, camelCase functions, no inline Vietnamese strings (add `"Nghe lại"` and any new error copy to `src/locales/vi/student.ts`), server action return shape always `{ data: T } | { error: { code, message } }`.
- **Testing:** No test framework gap remains (Vitest, per Story 3.1/3.2/3.3 precedent). Nothing in this story is "pure enough" to warrant dedicated unit tests the way Story 3.3's VN-timezone arithmetic was — `submitAnswerAction` is DB- and cookie-coupled, and the UI components are interaction-driven. Use judgment; no story AC mandates a specific test count here. If you extract any pure helper (e.g., a `choices` narrowing function), a quick unit test for it is reasonable but not required.

### Previous Story Intelligence (Story 3.3)

- Story 3.3 built `src/app/(student)/session/[sessionId]/page.tsx` as a deliberately minimal scaffold — its Dev Notes explicitly called out that the plain-text prompt rendering was Story 3.4's job to replace ("Scope discipline for the session page... Story 3.4 is the story that builds the actual `question-card`/`answer-button` UI"). This story is that build-out.
- Story 3.3's code review found and fixed a missing try/catch in `startSessionAction` (a server action that could throw despite AC requiring it never does) — replicate the try/catch pattern in the new `submitAnswerAction` from the start (Task 3 already accounts for this).
- Story 3.3 also extracted `SessionProgressChip` into its own component with `data-slot="session-progress-chip"` after a review finding that a bare `<span>` wasn't an identifiable component boundary — follow the same `data-slot` convention for the new `question-card`/`answer-button-grid`/`audio-button` components (e.g. `data-slot="question-card"`).
- The session page's existing `db.session.findUnique` query already orders `answers` by `id` (`orderBy: { id: 'asc' }`) for deterministic reads — don't re-derive ordering, reuse it.
- Deferred-work.md's "no way to look up a `SessionAnswer.id` by `(sessionId, questionId)`" gap (flagged since Story 3.2) turns out to be a non-issue for this story: the session page's existing query already returns each `SessionAnswer`'s own `id` directly (`session.answers[currentIndex].id`), so no new repository function is needed — this gap can be considered closed by this story rather than deferred further.

### Git Intelligence

- Most recent commit (`c439863`) landed Story 3.3 in full: session-start server action, `session/[sessionId]/page.tsx` scaffold, `session-progress-chip`, `free-tier-gate-card`, `session-start-button`, `global-config-repository`, `subscription-repository`. Treat all of it as a stable, already-reviewed baseline — this story only extends `actions.ts` and `session/[sessionId]/page.tsx`, it doesn't modify their existing exports.
- No prior story has touched `src/components/ui/` beyond the initial shadcn scaffold (`alert-dialog`, `button`, `card`, `dialog`, `input`, `label`, `select`, `sheet`, `sonner`) — this story is the first to add a new shadcn primitive (`skeleton.tsx`).
- No prior story has used `next/image`, the Web Speech API, or safe-area CSS insets anywhere in the repo — all three are first introductions in this story; there's no existing pattern to match beyond what's specified above.

### Project Structure Notes

- New files: `src/components/ui/skeleton.tsx`, `src/components/student/question-card.tsx`, `src/components/student/answer-button-grid.tsx`, `src/components/student/audio-button.tsx`, `src/app/(student)/session/[sessionId]/loading.tsx`.
- Modified files: `src/app/(student)/actions.ts` (add `submitAnswerAction`), `src/app/(student)/session/[sessionId]/page.tsx` (sanitized question view model, child-profile gradeBand fetch, wire in the new components), `src/app/(student)/layout.tsx` (safe-area insets), `src/locales/vi/student.ts` (add "Nghe lại" label, `ALREADY_ANSWERED`/submit-error copy).
- No changes needed to `src/infrastructure/repositories/*` — `recordAnswer` is used as-is; the one new DB read is inline in the server action, matching the precedent Story 3.3 set.
- Do not touch `src/domain/` — nothing in this story changes the adaptive-difficulty use case or its constants.
- Matches the Architecture Spine's Structural Seed: `src/components/student/` is exactly where "question card, feedback, etc." are named to live.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4: Question Display & Answer Submission] — full AC text (verbatim basis for ACs #1–#7 above)
- [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-07-08.md] — FR-2, NFR-ACC-1, NFR-PERF-1 coverage table entries confirming this story owns touch-target and render-time NFRs
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-2] — layer boundary rule (server actions vs. components vs. repositories)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-5] — child-profile cookie trust boundary (no NextAuth session in student surface)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-13] — Question images via Supabase Storage CDN URL, no Next.js-server proxying
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md#Components] — `question-card`, `answer-button` (custom, not shadcn `Button`), `audio-button` visual specs and states
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#Component Patterns / Student Mode Components] — audio-button autoplay-by-grade rule, answer-button tap-to-submit behavior
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#Accessibility Floor] — 44×44px touch target floor, focus management to first answer button, `aria-live` precedent
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#Responsive & Platform] — 1-col phone / 2-col tablet answer grid breakpoints
- [Source: src/app/globals.css] — existing `.text-question`, `.text-label-student` typography utilities and `rounded-brand-*` radius tokens — reuse, don't redeclare
- [Source: src/infrastructure/repositories/session-repository.ts] — `recordAnswer` contract (Story 3.2), called as-is
- [Source: src/domain/entities/question.ts] — `Question` entity shape, including the `correctAnswer` field that must never reach the client
- [Source: src/app/(student)/session/[sessionId]/page.tsx, src/app/(student)/actions.ts] — current Story 3.3 scaffold this story extends
- [Source: src/components/student/session-progress-chip.tsx] — `data-slot` component convention to follow for new components
- [Source: prisma/fixtures/questions.json] — real shape of `choices` (flat `string[]`)
- [Source: _bmad-output/implementation-artifacts/3-3-session-start-free-tier-daily-gate.md] — previous story, scaffold this story builds on and its review-fix precedents (try/catch, `data-slot` extraction)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — the `SessionAnswer.id` lookup gap this story closes (see Previous Story Intelligence)
- [Source: _bmad-output/project-context.md] — naming/style conventions, layer rules restated for AI agents

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `pnpm lint` — clean (one expected `no-img-element` warning on `question-card.tsx`, intentional per AD-13, no `next/image` proxying).
- `npx tsc --noEmit` — clean, no errors.
- `pnpm test` — 23/23 existing tests pass, no regressions.

### Completion Notes List

- Added `Skeleton` shadcn primitive (first use in repo) and wired it into a new `loading.tsx` matching the `question-card` shape for AC #5.
- Built the sanitized question view model directly in `session/[sessionId]/page.tsx` — only `{ id, prompt, imageUrl, choices }` crosses into the `QuestionCard` Client Component tree; `correctAnswer`, `skillId`, `gradeBand`, `difficultyLevel` never leave the server. Verified via `grep -rn correctAnswer src/` — every hit is server-side (`actions.ts`, repositories, domain entity, tests).
- `submitAnswerAction` added to `src/app/(student)/actions.ts`: cookie-based auth check (no `auth()`, per AD-5), ownership check via `SessionAnswer.session.childProfileId`, `ALREADY_ANSWERED` short-circuit, server-side correctness comparison, wrapped in try/catch. No repository files changed — `recordAnswer` used as-is.
- `question-card`, `answer-button-grid`, `audio-button` all added under `src/components/student/` with `data-slot` attributes following the `session-progress-chip` precedent. `answer-button-grid` is a bespoke `<button>` grid (not shadcn `Button`, per DESIGN.md), disables all buttons while a submission is pending (client-side double-tap guard complementing the server-side `ALREADY_ANSWERED` check), and moves focus to the first button on every `sessionAnswerId` change.
- `audio-button` uses the native Web Speech API (`window.speechSynthesis`), guarded for SSR/unsupported browsers, auto-plays only when the caller passes `autoPlay` (computed from `childProfile.gradeBand === 'GRADE_1'` in the page), cancels-then-speaks on tap, and always shows both the speaker icon and the "Nghe lại" label (added to `src/locales/vi/student.ts`).
- Safe-area insets added once to `src/app/(student)/layout.tsx` (cross-cutting for the whole `(student)` route group, not session-specific).
- No test framework gap and nothing pure enough to warrant new unit tests per this story's Dev Notes guidance (`submitAnswerAction` is DB/cookie-coupled; UI components are interaction-driven); full existing suite re-run to confirm no regressions.

### File List

**New files:**
- `src/components/ui/skeleton.tsx`
- `src/components/student/question-card.tsx`
- `src/components/student/answer-button-grid.tsx`
- `src/components/student/audio-button.tsx`
- `src/app/(student)/session/[sessionId]/loading.tsx`

**Modified files:**
- `src/app/(student)/actions.ts` (added `submitAnswerAction`)
- `src/app/(student)/session/[sessionId]/page.tsx` (sanitized question view model, child-profile `gradeBand` fetch, wired in `QuestionCard`)
- `src/app/(student)/layout.tsx` (safe-area insets)
- `src/locales/vi/student.ts` (added `listenAgain`, `alreadyAnsweredError`, `genericSubmitAnswerError`)

## Change Log

- 2026-07-18: Implemented Question Display & Answer Submission — sanitized question view model, `submitAnswerAction`, `question-card`/`answer-button-grid`/`audio-button` components, `Skeleton` primitive, session `loading.tsx`, and safe-area insets on the `(student)` layout. All 10 tasks complete; full test suite, lint, and typecheck clean.
