---
baseline_commit: db65fb0
---

# Story 3.5: Immediate Feedback & Mascot Reactions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student,
I want to see immediately whether I was right or wrong — with a clear visual reaction and the correct answer shown if I was wrong,
so that I learn from each question without interruption.

## Acceptance Criteria

1. **Given** I tap an answer button, **when** the answer is submitted, **then** feedback state resolves within 200ms (within FR-3's 500ms requirement):
   - **Correct:** tapped button fills `feedback-correct` + checkmark icon; mascot swaps to `cu-happy.svg`.
   - **Incorrect:** tapped button fills `feedback-incorrect` + × icon; correct sibling button fills `feedback-correct`; text "Đáp án đúng là [X]" appears below card; mascot swaps to `cu-gentle.svg`.
2. All button state transitions animate at 200ms ease-in-out (UX-DR4).
3. Feedback state uses color + icon + mascot — never color alone (UX-DR17).
4. "Tiếp theo →" appears 500ms after feedback renders (UX-DR6).
5. For questions 1 to N−1: auto-advance fires after 1.5 seconds; tapping "Tiếp theo →" before 1.5s cancels the timer and navigates immediately (UX-DR13).
6. For the final question (question N): auto-advance is disabled; the student must tap "Tiếp theo →" explicitly to reach the summary (UX-DR13).
7. The mascot `Cú` (72px SVG, bottom-right of question card, absolutely positioned) is CSS class-swapped on feedback state; absent from all parent/teacher/admin surfaces (UX-DR7).
8. `prefers-reduced-motion: reduce` skips CSS transition frames; state changes (color fills, mascot swap) still occur (UX-DR17).

## Tasks / Subtasks

- [x] Task 1: Extend `submitAnswerAction` to return the correct answer (AC: #1)
  - [x] In `src/app/(student)/actions.ts`, change the return type of `submitAnswerAction` from `ActionResult<{ correct: boolean }>` to `ActionResult<{ correct: boolean; correctAnswer: string }>` and include `correctAnswer: sessionAnswer.question.correctAnswer` in the success payload. This is **additive** — Story 3.4 deliberately designed this action's contract so 3.5 wouldn't have to restructure it.
  - [x] Security note: revealing `correctAnswer` *in the response of a successful, already-recorded submission* is safe and required by AC #1 (the incorrect path must fill the correct sibling green and show "Đáp án đúng là [X]"). The invariant from Story 3.4 still holds — `correctAnswer` never reaches the client *before* the answer is scored: the RSC payload stays sanitized, the atomic `recordAnswer` (`updateMany where answeredAt: null`) has already committed by the time this value is returned, and the `ALREADY_ANSWERED` error path returns no answer data. Do NOT add `correctAnswer` to the page's sanitized view model or to the error branches.
  - [x] Change nothing else in this action: the cookie auth check, ownership check, `ALREADY_ANSWERED` guards (both pre-check and atomic 0-count check), and try/catch all stay exactly as they are.

- [x] Task 2: Create the three mascot SVG assets (AC: #1, #7)
  - [x] **`public/` does not exist in this repo yet — no prior story has shipped a static asset.** Create `public/mascot/cu-neutral.svg`, `public/mascot/cu-happy.svg`, `public/mascot/cu-gentle.svg`. Next.js serves `public/` at the URL root, so these resolve as `/mascot/cu-neutral.svg` etc. with zero config.
  - [x] Author them as simple placeholder owls within DESIGN.md's stated constraint: "simple, flat, 3-color maximum per state" (DESIGN.md flags final illustration style as an illustrator deliverable — placeholders that respect the constraint are correct for this story, not a shortcut). Same owl silhouette across all three; only the face changes: neutral (round eyes, flat beak-line mouth), happy (arched/closed joyful eyes, open smile), gentle (soft eyes, small encouraging smile — **not sad**; DESIGN.md: "soft smile, not sad").
  - [x] Each SVG: `viewBox="0 0 72 72"`, no fixed width/height attributes (the component sizes them), no external refs, no embedded raster. Keep each file well under 2KB.

- [x] Task 3: `mascot.tsx` component (AC: #1, #7, #8)
  - [x] Create `src/components/student/mascot.tsx` with `data-slot="mascot"`. Props: `state: 'neutral' | 'happy' | 'gentle'`. Server-component-compatible (no hooks) — it just renders based on props; the client parent re-renders it on state change.
  - [x] Render **all three** `<img>` elements (`/mascot/cu-neutral.svg`, `/mascot/cu-happy.svg`, `/mascot/cu-gentle.svg`) stacked in the same 72×72 box, and toggle visibility by CSS class on `state` — e.g. active: `opacity-100`, inactive: `opacity-0`, with `transition-opacity duration-200 ease-in-out motion-reduce:transition-none`. This is literally the "CSS class-swapped" mechanism UX-DR7 names, and it pre-loads all three assets so the first correct/incorrect swap never flickers on a cold cache (a `src=` swap would fetch the new SVG at the moment of feedback — exactly when the student is looking).
  - [x] Container: `absolute bottom-*-right-*` positioning classes on the component root, sized `h-[72px] w-[72px]` (72px per UX-DR7/DESIGN.md). The parent card provides `relative` (Task 5).
  - [x] Accessibility: give the active image a descriptive Vietnamese `alt` from the locale file (Task 7) — e.g. neutral "Cú đang chờ", happy "Cú vui mừng", gentle "Cú động viên" — and `alt=""` + `aria-hidden="true"` on the two inactive images. Story 3.8 owns the full alt-text sweep, but shipping a brand-new image with no alt would create the exact gap 3.8 then has to hunt down.

- [x] Task 4: Refactor `answer-button-grid.tsx` into a controlled, presentational grid (AC: #1, #2, #3, #8)
  - [x] `src/components/student/answer-button-grid.tsx` currently owns submission (`submitAnswerAction` + `router.refresh()`). Move that ownership up to `question-card.tsx` (Task 5). New props: `{ choices: string[]; disabled: boolean; feedback: { selectedChoice: string; correctAnswer: string; correct: boolean } | null; onSelect: (choice: string) => void }`. Keep the `useEffect` focus-to-first-button behavior and the `${choice}-${index}` keys exactly as they are.
  - [x] Per-button rendering when `feedback` is non-null (match by choice string; if duplicate choice text ever occurs, `indexOf`-style first-match is acceptable — flag nothing, Story 3.4 already documented duplicates as a data-quality edge):
    - Tapped + correct → `bg-feedback-correct text-feedback-correct-foreground` + `Check` icon (lucide-react, `aria-hidden="true"`).
    - Tapped + incorrect → `bg-feedback-incorrect text-feedback-incorrect-foreground` + `X` icon (lucide-react, `aria-hidden="true"`).
    - Correct sibling (incorrect case only) → `bg-feedback-correct text-feedback-correct-foreground` (no icon required by spec; adding the checkmark here too is acceptable and consistent).
    - All other siblings → fade to `opacity-50` (DESIGN.md answer-button spec: "sibling buttons fade").
  - [x] Transitions: add `transition-[background-color,color,opacity] duration-200 ease-in-out motion-reduce:transition-none` to every button. `motion-reduce:transition-none` is the whole of AC #8 for buttons — the class/state changes themselves must always apply, only the animated frames are skipped. Do not gate any `setState` behind a motion query.
  - [x] While `feedback` is non-null or `disabled` is true, all buttons are disabled (answers are locked once feedback shows — the only affordances after feedback are "Tiếp theo →" and auto-advance).
  - [x] These are still plain `<button>` elements, NOT shadcn `Button` (DESIGN.md: answer-button is explicitly a custom component). Keep `min-h-16 min-w-11 rounded-brand-lg text-label-student`.

- [x] Task 5: Convert `question-card.tsx` to a client feedback controller (AC: #1, #4, #5, #6)
  - [x] Add `'use client'` to `src/components/student/question-card.tsx`. Its props are already fully serializable (`sessionAnswerId`, `prompt`, `imageUrl`, `choices`, `audioAutoPlay`, `alreadyAnswered`) and nothing in it is server-only; the page (a Server Component) keeps rendering it as before. Add one new prop: `isFinalQuestion: boolean`.
  - [x] Own the feedback state machine here: `idle → submitting → feedback` (React state: `feedback: { selectedChoice, correctAnswer, correct } | null` + `isSubmitting: boolean`).
  - [x] `onSelect(choice)`: set submitting → `await submitAnswerAction(sessionAnswerId, choice)` → on `error`, `toast.error(result.error.message)` + clear submitting (same sonner pattern the grid used before); on success, set `feedback` **immediately** — the 200ms in AC #1 is the CSS transition duration (UX-DR6: "full state resolution in ≤ 200ms"), not a delay to add; the network round-trip is bounded by FR-3's 500ms envelope, so never wrap the state update in a timer.
  - [x] When `feedback` renders, start two timers (store ids in refs; clear both in a `useEffect` cleanup on unmount):
    - **+500ms:** show the "Tiếp theo →" button (AC #4). Before that it must not be visible; reserve its layout space (e.g. `invisible` → `visible`, or fixed-height container) so its appearance doesn't shift the card.
    - **+1500ms:** auto-advance — but **only when `isFinalQuestion` is false** (AC #5/#6). Guard advancing with a ref (`hasAdvancedRef`) so the timer and a manual tap can never both fire `advance()`.
  - [x] `advance()`: clear the auto-advance timer, then `router.refresh()` (`next/navigation` `useRouter`). The page's existing `firstUnanswered` logic then renders the next question. **Final question:** tapping "Tiếp theo →" also calls `router.refresh()` for now — the page's existing already-answered guard renders (a visually quiet end state). This is a deliberate seam: Story 3.6 owns `completeSession()` + the `/summary/[sessionId]` route and will rewire exactly this one call site to complete-and-redirect. Do NOT call `completeSession` or create a summary route in this story, and do NOT push to a route that doesn't exist yet (a 404 is worse than the quiet state).
  - [x] Incorrect-case reveal text (AC #1): when `feedback && !feedback.correct`, render `student.correctAnswerReveal(feedback.correctAnswer)` ("Đáp án đúng là [X]") below the answer grid inside the card footprint, in a `role="status"` element so screen readers announce it (visual users get color + icon + mascot; SR users need the text channel — this is the "never color alone" floor applied to non-sighted users). For the correct case, render an `sr-only` `role="status"` "Đúng rồi!" (approved microcopy from EXPERIENCE.md's voice table) — no visible text is specified for correct, don't add any.
  - [x] Mascot wiring (AC #1, #7): add `relative` to the `Card` className and render `<Mascot state={...} />` bottom-right: `'neutral'` when idle/submitting/`alreadyAnswered`, `'happy'` on correct feedback, `'gentle'` on incorrect feedback.
  - [x] "Tiếp theo →" button: icon + text (student-surface rule — never text-only navigation): label `student.nextCta` ("Tiếp theo") + lucide `ArrowRight` (`aria-hidden="true"`). Style as a primary CTA consistent with the surface: `bg-primary text-primary-foreground rounded-brand-lg text-label-student min-h-11 min-w-11` with adequate padding (44×44 floor). Plain `<button>` or shadcn `Button` both acceptable here — this is a nav CTA, not an answer-button, so the DESIGN.md "not a shadcn Button" rule does not apply to it.
  - [x] `alreadyAnswered === true` (resume/final-state render from the server): keep today's behavior — grid disabled, no feedback UI, no timers, mascot neutral, no "Tiếp theo →". Feedback state only ever exists client-side within the question that was just answered.

- [x] Task 6: Key the card per question in the session page (AC: #5)
  - [x] In `src/app/(student)/session/[sessionId]/page.tsx`, pass `key={currentAnswer.id}` and `isFinalQuestion={currentIndex === session.answers.length - 1}` to `<QuestionCard>`. The `key` forces a full remount when `router.refresh()` advances to the next question, guaranteeing feedback state, timers, and refs reset to `idle` — without it, stale feedback state could bleed across questions. (The focus-to-first-button effect keyed on `sessionAnswerId` keeps working under remount.)
  - [x] Touch nothing else in this page: the sanitized view model (no `correctAnswer` in RSC props), `Promise.all` reads, ownership `notFound()` checks, empty-answers guard, and `SessionProgressChip` placement are all locked Story 3.3/3.4 behavior.

- [x] Task 7: Locale strings (all Vietnamese copy)
  - [x] Add to `src/locales/vi/student.ts` (never inline Vietnamese in components): `nextCta: 'Tiếp theo'`, `correctAnswerReveal: (answer: string) => \`Đáp án đúng là ${answer}\``, `correctFeedbackSr: 'Đúng rồi!'`, `mascotNeutralAlt`, `mascotHappyAlt`, `mascotGentleAlt` (short descriptive phrases, e.g. 'Cú đang chờ', 'Cú vui mừng', 'Cú động viên').
  - [x] Voice rule (EXPERIENCE.md): never use the word "Sai" anywhere in feedback copy — the reveal text and any incorrect-state copy must stay encouraging ("Đáp án đúng là...", "chưa đúng" if ever needed).

- [x] Task 8: Layer, convention, and regression check
  - [x] No changes to `src/domain/` or `src/infrastructure/repositories/` — this story is Presentation + one additive Application-layer change (AD-2). The atomic `recordAnswer` contract from 3.4's review fix is untouched.
  - [x] Grep the diff for `correctAnswer`: the only *new* client-side occurrence must be the post-submission value returned by `submitAnswerAction` and held in `question-card.tsx` state. The RSC payload (page props) must still never contain it.
  - [x] Confirm no hover-only affordances, long-press, drag, keyboard shortcuts, or external links were introduced (UX-DR19) — timers + tap only.
  - [x] Run `pnpm lint`, `npx tsc --noEmit`, `pnpm test` — all clean / no regressions (23 existing tests must still pass).
  - [x] Manual browser verification pass before marking review-ready (Epic 2 retrospective action item — two UI bugs shipped as "done" in Epic 2 without one): answer a question correctly (green fill + check + cu-happy + next button at ~0.5s + auto-advance at ~1.5s), answer one incorrectly (rose fill + × + green sibling + "Đáp án đúng là" text + cu-gentle), tap "Tiếp theo →" early (cancels timer, advances once), final question (no auto-advance, explicit tap → quiet end state), and OS reduced-motion enabled (instant state changes, no transitions).

### Review Findings

- [x] [Review][Patch] No synchronous re-entry guard in `handleSelect` — a rapid double-tap fires two submissions; the loser returns `ALREADY_ANSWERED` and surfaces a spurious error toast over legitimate feedback [src/components/student/question-card.tsx:53]
- [x] [Review][Patch] `ALREADY_ANSWERED` error path leaves the student stuck — no `router.refresh()` resync, so a raced/stale client shows a toast, never sets feedback, and every retry re-errors [src/components/student/question-card.tsx:56]
- [x] [Review][Patch] `hasAdvancedRef` is a one-shot latch set before an unverified `router.refresh()` — if the refresh fails or no-ops (transient network), every later "Tiếp theo" tap early-returns forever with no retry path [src/components/student/question-card.tsx:43]
- [x] [Review][Patch] `role="status"` live regions are conditionally mounted with their text already present — screen readers often don't announce a live region created with content; render a persistent region and swap its text [src/components/student/question-card.tsx:97]
- [x] [Review][Patch] Submit resolving after unmount schedules timers no cleanup will ever clear — the leaked auto-advance timer fires a stray `router.refresh()` on whatever page the student is on [src/components/student/question-card.tsx:53]
- [x] [Review][Patch] Submit-error path toggles `disabled` true→false, re-running the grid focus effect and yanking focus to the first answer button regardless of which was tapped [src/components/student/answer-button-grid.tsx:31]
- [x] [Review][Patch] Incorrect-answer reveal text has no right clearance and can run under the 72px mascot on narrow single-column cards; the `pr-[88px]` magic number silently couples card layout to mascot geometry [src/components/student/question-card.tsx:104]
- [x] [Review][Patch] Dead `choice` parameter on `computeAnswerButtonState` — accepted but never read; classification is purely index-based [src/components/student/answer-button-state.ts:14]
- [x] [Review][Defer] Keyboard focus is dropped to `<body>` the moment feedback disables the grid; "Tiếp theo" appears 500ms later but is never focused [src/components/student/answer-button-grid.tsx] — deferred to Story 3.8 (accessibility floor sweep)
- [x] [Review][Defer] The story's headline timer/race behavior (500ms/1.5s interplay, double-advance guard, final-question gate, `displayFeedback` server-wins rule) has zero automated coverage; only the pure classifier is unit-tested — deferred, manual browser verification is this story's accepted quality gate
- [x] [Review][Defer] `correctAnswer` reveal now composes with the still-deferred `selectedChoice` membership validation (any garbage string gets scored incorrect and harvests the answer in one call) — deferred, pre-existing; already tracked in deferred-work.md, atomic-commit-first argument holds

## Dev Notes

- **The one contract change in this story is additive:** `submitAnswerAction` gains `correctAnswer` in its success payload. Everything else is client-side presentation. Story 3.4 explicitly returned `{ correct }` "so Story 3.5 wouldn't have to redesign this action's contract" — honor that by only extending it.
- **Security invariant carried from 3.4, restated precisely:** `correctAnswer` must never be in the RSC payload (page → component props) — but returning it from a successful submission is *by design* here: the answer is already atomically recorded (`updateMany where answeredAt: null` — 3.4's race fix), so the reveal cannot be used to answer. Error paths (`UNAUTHORIZED`, `ALREADY_ANSWERED`, `INTERNAL_ERROR`) return no answer data.
- **200ms vs 500ms vs 1.5s — three different clocks, don't conflate them:** (1) 200ms is the CSS transition duration on button fills and mascot opacity (UX-DR4/UX-DR6) — apply feedback state immediately when the server action resolves, never behind a timer; (2) 500ms after feedback renders, "Tiếp theo →" becomes visible (UX-DR6); (3) 1500ms after feedback renders, auto-advance fires on non-final questions (UX-DR13). Timers (2) and (3) start together when feedback state is set.
- **Mockup vs DESIGN.md conflict — DESIGN.md wins:** `mockups/key-session-question.html` shows feedback as light-tint backgrounds (`#DCFCE7`/`#FFF1F2`) with colored borders. EXPERIENCE.md states "Spines win on conflict with any mock." DESIGN.md/epics AC require **full fills**: `feedback-correct` (#16A34A) with white foreground on the tapped-correct and revealed-sibling buttons, `feedback-incorrect` (#F87171) with white foreground on the tapped-incorrect button. The Tailwind tokens already exist in `src/app/globals.css` (`--color-feedback-correct`, `--color-feedback-incorrect`, plus `-foreground` pairs with dark-mode overrides) — use `bg-feedback-correct text-feedback-correct-foreground` etc.; do not hand-roll hex values.
- **Mascot assets do not exist — this story creates them.** There is no `public/` directory in the repo at all. Task 2 creates placeholder SVGs honoring DESIGN.md's "simple, flat, 3-color maximum per state" constraint; DESIGN.md marks final illustration style as an illustrator deliverable, so placeholders are the correct scope. `cu-gentle` must read as encouraging, never sad — "the mascot's gentle expression carries the encouragement; the color does not punish."
- **Mascot is student-surface-only (UX-DR7):** `mascot.tsx` lives in `src/components/student/` and is imported only by `question-card.tsx` in this story — never import it from parent/teacher/admin components. (Story 3.6 will reuse it on the summary screen.)
- **State reset strategy is `key`-based remount, not effect-based cleanup:** the page passes `key={currentAnswer.id}` so each question gets a fresh `QuestionCard` instance. This kills an entire class of stale-state bugs (feedback bleeding into the next question, timers surviving advance). Still clear timers in the unmount cleanup — remount is exactly when unmount cleanup runs.
- **Auto-advance double-fire is the main race in this story:** the 1.5s timer and a manual "Tiếp theo →" tap can both try to advance. Guard with a `hasAdvancedRef` checked-and-set inside `advance()`, and clear the timer on manual tap. `router.refresh()` firing twice is not catastrophic (idempotent render) but causes visible jank.
- **Final-question seam (AC #6) — intentionally incomplete UX:** tapping "Tiếp theo →" on question N calls `router.refresh()`, which re-renders the page in its existing already-answered guard state (disabled grid, neutral mascot). Story 3.6 (`3-6-session-completion-summary-accuracy-update`, next in the sprint) owns `completeSession()`, the `/summary/[sessionId]` route, and will replace this one call site. Do not reach into 3.6's scope; do not link to a nonexistent route. Note the seam in your completion notes so 3.6's context picks it up.
- **`prefers-reduced-motion` = Tailwind `motion-reduce:transition-none` on every transitioning element** (buttons, mascot opacity). Nothing else: the 500ms/1.5s behavioral timers and all state changes run identically regardless of motion preference (UX-DR17: "states still change, animation frame is skipped").
- **Scope boundaries with neighboring stories:** no offline banner / answer-button-disable-on-disconnect (Story 3.7), no TTS changes or alt-text sweep beyond the new mascot images (Story 3.8), no session completion or summary (Story 3.6). The `audio-button` is untouched by this story.
- **tailwind-merge caveat (Epic 2 retro, still open):** custom `rounded-brand-*` classes passed into shadcn components via `className` may not reliably override built-in `rounded-*` classes through `cn()`/tailwind-merge. The new feedback classes go on **plain `<button>` elements** (no `cn` merge conflict possible), and `question-card.tsx` already carries this known risk on `Card` — don't add new shadcn-wrapper styling that depends on override order.
- **Vitest exists** (23 passing tests; `pnpm test`). Nothing here is mandated for unit tests by the ACs. The feedback state machine is timer- and router-coupled; if you extract a pure helper (e.g. a `computeButtonState(choice, feedback)` classifier for the four button states), a small unit test for it is cheap and worthwhile — use judgment, matching 3.4's precedent. The Epic 2 retro's **manual browser verification** requirement (Task 8) is the real quality gate for this visually-driven story.
- **No new dependencies and no web research required:** lucide-react (`Check`, `X`, `ArrowRight`), sonner, Tailwind v4 `motion-reduce:` variant, and `router.refresh()` are all already in use in this codebase. Do not add an animation library (framer-motion etc.) — 200ms CSS transitions are the entire animation budget.

### Previous Story Intelligence (Story 3.4)

- 3.4's review already fixed the two things 3.5 depends on most: (1) `recordAnswer` is **atomic** (`updateMany` guarded on `answeredAt: null`, 0-count → `ALREADY_ANSWERED`), so the feedback flow can trust "first write wins"; (2) the already-answered final-state render passes `alreadyAnswered` into `QuestionCard`, which disables the grid — preserve that prop's behavior through the refactor.
- 3.4 established the component conventions to keep: `data-slot` attributes on every student component (`question-card`, `answer-button-grid`, `audio-button` — add `mascot`), plain `<button>` (not shadcn) for answer buttons, `${choice}-${index}` React keys (duplicate choice text is possible in `Json` choices), `min-h-16 min-w-11` touch targets, sonner toasts for action errors.
- 3.4's review also patched: audio cleanup on unmount, 44px floor on the audio button, `Promise.all` for the page's two DB reads, fixed image height (`h-40`) matching the `loading.tsx` skeleton. Don't undo any of these while editing the page/card.
- The focus-management pattern (`useEffect` keyed on `sessionAnswerId`, ref on first button) survives this refactor unchanged — with `key`-based remount it fires per question exactly as before.
- 3.4 deferred "no server-side validation that `selectedChoice` is a member of the question's choices" (deferred-work.md) — still deferred; the atomic write limits impact. Don't fix it here unless trivially convenient; it's not this story's scope.

### Git Intelligence

- `db65fb0` (HEAD) landed Story 3.4 in full: `question-card.tsx`, `answer-button-grid.tsx`, `audio-button.tsx`, `skeleton.tsx`, `loading.tsx`, `submitAnswerAction`, safe-area insets. This story refactors two of those files (`question-card.tsx`, `answer-button-grid.tsx`) and extends `submitAnswerAction` — everything else from that commit is a stable baseline.
- Commit history shows the established pattern: one story per commit, `feat:` prefix, review patches folded in before done.
- No commit has ever added a `public/` directory or static asset — Task 2 is a first for the repo, hence the explicit path guidance.

### Project Structure Notes

- New files: `public/mascot/cu-neutral.svg`, `public/mascot/cu-happy.svg`, `public/mascot/cu-gentle.svg`, `src/components/student/mascot.tsx`.
- Modified files: `src/app/(student)/actions.ts` (additive return-shape change), `src/components/student/question-card.tsx` (client conversion + feedback controller), `src/components/student/answer-button-grid.tsx` (controlled/presentational refactor), `src/app/(student)/session/[sessionId]/page.tsx` (`key` + `isFinalQuestion` props only), `src/locales/vi/student.ts` (new strings).
- Untouched: `src/domain/**`, `src/infrastructure/**`, `audio-button.tsx`, `loading.tsx`, `skeleton.tsx`, `(student)/layout.tsx`, `session-progress-chip.tsx`.
- Matches the Architecture Spine's Structural Seed: feedback/mascot components live in `src/components/student/`; the Capability Map places "Immediate post-answer feedback" in `src/app/(student)/session/` as a client component — which is exactly what `question-card.tsx` becomes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5: Immediate Feedback & Mascot Reactions] — verbatim AC basis (ACs #1–#8 above)
- [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements] — UX-DR4 (200ms transitions), UX-DR6 (feedback-overlay behavior + 500ms next-button), UX-DR7 (mascot SVG system), UX-DR13 (auto-advance 1.5s, disabled on final), UX-DR17 (reduced-motion, color-never-alone), UX-DR19 (tap-only)
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-3] — feedback ≤500ms, correct/incorrect visually distinct, correct answer shown before advance when wrong
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md#Components] — feedback-overlay (in-place transform, ≤200ms resolution), answer-button four states + sibling fade, mascot (3 assets, 72px, class-swap, student-only, "soft smile, not sad")
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md#Colors] — feedback-correct green exclusive to correct feedback; warm rose never alarm red
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#State Patterns] — Feedback correct/incorrect rows, auto-advance row, final-question manual-advance row
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#Voice and Tone] — never "Sai"; "Đúng rồi!" approved; "Đáp án đúng là [X]" pattern (Flow 1 step 6)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#Accessibility Floor] — color + icon + mascot, reduced-motion behavior, 44×44 floor
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/mockups/key-session-question.html] — feedback-state composition reference ONLY; its light-tint fills conflict with DESIGN.md and lose ("Spine wins on conflict")
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-2] — layer boundaries; feedback logic is Presentation + server action, never repository
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#Capability → Architecture Map] — "Immediate post-answer feedback → src/app/(student)/session/ (client component)"
- [Source: src/app/(student)/actions.ts#submitAnswerAction] — action to extend (atomic recordAnswer, error codes locked)
- [Source: src/components/student/question-card.tsx, src/components/student/answer-button-grid.tsx] — components refactored by this story (current props/behavior)
- [Source: src/app/(student)/session/[sessionId]/page.tsx] — page providing sanitized props; gains `key` + `isFinalQuestion` only
- [Source: src/app/globals.css#@theme] — existing `--color-feedback-*` tokens + dark variants and `rounded-brand-*`/`.text-label-student` utilities — reuse, never redeclare
- [Source: _bmad-output/implementation-artifacts/3-4-question-display-answer-submission.md] — previous story: contract intent for `submitAnswerAction`, review patches to preserve, component conventions
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — open deferrals relevant here (selectedChoice membership validation; tailwind-merge rounded-brand override risk)
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-07-18.md] — manual browser verification action item enforced in Task 8
- [Source: _bmad-output/project-context.md] — layer rules, naming, locale, feedback token values restated for AI agents

## Dev Agent Record

### Agent Model Used

claude-fable-5 (Claude Fable 5)

### Debug Log References

- RED→GREEN cycle for `computeAnswerButtonState`: test written first (import failure = red), classifier implemented, 5/5 pass.
- Full validation: `npx tsc --noEmit` clean, `pnpm test` 28/28 (23 existing + 5 new, no regressions), `pnpm lint` passes with only two `@next/next/no-img-element` warnings (pre-existing pattern; `<img>` is deliberate for <2KB local SVGs and matches the question-image precedent from 3.4).
- Manual browser verification (Epic 2 retro gate) executed with Playwright headless Chromium against the live dev server (port 4200), logged in as seeded `parent@example.test` with signed child-profile cookie: 26/27 automated checks + precise in-page timing pass. Verified: correct path (green fill + Check + cu-happy + sr-only "Đúng rồi!"), incorrect path (rose fill + X + green sibling + "Đáp án đúng là [X]" + cu-gentle), next-button hidden→visible at 498ms measured via in-page MutationObserver (spec 500ms), auto-advance ~1.5s on non-final questions, early "Tiếp theo" tap cancels timer and advances once, final question never auto-advances (3s watch) and explicit tap lands in the quiet already-answered end state (disabled grid, neutral mascot, no next button), `prefers-reduced-motion: reduce` → `transition-property: none` on buttons and mascot while fills/mascot swaps still occur. Zero console errors. Screenshots captured for correct/incorrect/final states.

### Completion Notes List

- **Task 1:** `submitAnswerAction` success payload extended additively to `{ correct, correctAnswer }`. Auth/ownership/`ALREADY_ANSWERED` guards and error branches untouched — no error path returns answer data; RSC payload stays sanitized.
- **Task 2:** First `public/` assets in the repo: three flat placeholder owls (`cu-neutral/happy/gentle.svg`), `viewBox="0 0 72 72"`, no width/height, 3 colors each (brand orange #F97316 body, cream #FFF7ED face, dark brown #431407 features), each well under 1KB. `cu-gentle` reads encouraging (soft eyes + small smile), not sad.
- **Task 3:** `mascot.tsx` (`data-slot="mascot"`) renders all three `<img>`s stacked in one 72×72 absolutely-positioned box and toggles `opacity-100`/`opacity-0` with `transition-opacity duration-200 motion-reduce:transition-none` — true class-swap, pre-loads all states. Active image gets a Vietnamese alt from the locale file; inactive images are `alt=""` + `aria-hidden`.
- **Task 4:** `answer-button-grid.tsx` is now fully controlled/presentational (`choices/disabled/feedback/onSelect`). Four feedback states classified by a new pure helper `computeAnswerButtonState` in `answer-button-state.ts` (unit-tested, incl. duplicate-choice first-match and correct-answer-not-in-choices edges). Full fills per DESIGN.md (`bg-feedback-correct`/`-incorrect` + white foreground), lucide `Check`/`X` icons `aria-hidden`, siblings fade to `opacity-50`, 200ms `transition-[background-color,color,opacity]` with `motion-reduce:transition-none`. Buttons stay plain `<button>` with `min-h-16 min-w-11 rounded-brand-lg text-label-student`; focus-to-first-button effect and `${choice}-${index}` keys preserved.
- **Task 5:** `question-card.tsx` is now a `'use client'` feedback controller: `idle → submitting → feedback` state, feedback set immediately on action success (200ms is CSS-only), 500ms next-button timer + 1.5s auto-advance timer (non-final only) started together, both cleared on unmount, `hasAdvancedRef` guards double-advance, next button reserves layout space via `invisible→visible`. Incorrect reveal in `role="status"`; correct case gets `sr-only` "Đúng rồi!". Mascot wired neutral/happy/gentle.
- **Fix found by browser verification (final-question end state):** after the final "Tiếp theo →" tap, `router.refresh()` re-renders with the SAME `key` (same `sessionAnswerId`), so the client instance survives and stale feedback state would keep the feedback UI on screen. Added `displayFeedback = alreadyAnswered ? null : feedback` so the server's already-answered signal always wins → quiet end state renders as specified. This is exactly the class of bug the Epic 2 retro's manual-verification gate exists to catch.
- **Task 6:** page passes `key={currentAnswer.id}` (fresh card instance per question — state/timer/ref reset by remount) and `isFinalQuestion`; nothing else in the page changed.
- **Task 7:** all new copy in `src/locales/vi/student.ts` (`nextCta`, `correctAnswerReveal`, `correctFeedbackSr`, three mascot alts); no "Sai" anywhere.
- **Seam for Story 3.6 (intentional):** the final-question "Tiếp theo →" call site in `question-card.tsx` `advance()` currently does `router.refresh()` → quiet already-answered state. 3.6 replaces exactly this call site with `completeSession()` + redirect to `/summary/[sessionId]`. No summary route or completeSession exists yet by design.
- **Minor cosmetic note for 3.6:** in the temporary quiet end state the mascot overlaps the last answer button (card content is shorter without the feedback row). `pointer-events-none` so nothing is blocked; state disappears once 3.6 redirects to the summary.
- Deferred items untouched per story scope: no server-side `selectedChoice` membership validation (still deferred), no offline handling (3.7), no TTS/alt-text sweep (3.8).

### Change Log

- 2026-07-21: Code review — 8 patch findings applied (synchronous submit re-entry lock, `ALREADY_ANSWERED` resync via `router.refresh()`, transition-based re-arm of the advance guard, post-unmount timer guard, persistent `role="status"` live region, one-shot focus effect in the grid, mascot clearance on reveal text via shared `MASCOT_CLEARANCE_CLASS`, dead `choice` param removed from `computeAnswerButtonState`); 3 deferred to deferred-work.md; tsc/lint/28 tests green. Status → done.
- 2026-07-21: Story 3.5 implemented — immediate feedback (full-fill button states + icons), mascot Cú system (3 new SVG assets + class-swap component), "Tiếp theo →" at 500ms, auto-advance at 1.5s with final-question manual gate, reduced-motion support, additive `correctAnswer` in `submitAnswerAction` payload. Browser-verified end to end; 5 new unit tests; 28/28 tests green.

### File List

- `src/app/(student)/actions.ts` (modified — additive `correctAnswer` in submitAnswerAction success payload)
- `src/app/(student)/session/[sessionId]/page.tsx` (modified — `key` + `isFinalQuestion` props only)
- `src/components/student/question-card.tsx` (modified — client feedback controller)
- `src/components/student/answer-button-grid.tsx` (modified — controlled/presentational refactor)
- `src/components/student/answer-button-state.ts` (new — pure button-state classifier)
- `src/components/student/answer-button-state.test.ts` (new — 5 unit tests)
- `src/components/student/mascot.tsx` (new — class-swapped mascot component)
- `src/locales/vi/student.ts` (modified — new feedback/mascot strings)
- `public/mascot/cu-neutral.svg` (new)
- `public/mascot/cu-happy.svg` (new)
- `public/mascot/cu-gentle.svg` (new)
