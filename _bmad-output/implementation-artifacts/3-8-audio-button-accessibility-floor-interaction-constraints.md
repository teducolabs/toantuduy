---
baseline_commit: 5ce6dbe
---

# Story 3.8: Audio Button, Accessibility Floor & Interaction Constraints

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student,
I want question prompts read aloud automatically (Grade 1) or on demand (Grades 2–3), with full accessibility support throughout,
so that non-fluent readers can fully participate and all users have an accessible experience.

## Acceptance Criteria

1. **Given** a question renders for a Grade 1 Child Profile, **when** the question card mounts, **then** the `audio-button` TTS (Web Speech API, `vi-VN` voice) plays automatically; the button remains visible and tappable for replay.
2. **Given** a question renders for a Grade 2 or 3 Child Profile, **when** the question card mounts, **then** TTS does not auto-play; the `audio-button` (speaker icon + "Nghe lại" text — always both icon and text, never icon-only) is tappable on demand (UX-DR8).
3. **Given** I tap the audio button during playback, **when** the tap registers, **then** playback restarts from the beginning (UX-DR8).
4. All interactive elements meet 44×44px minimum touch target (NFR-1).
5. Every question image and mascot SVG has a descriptive `alt` text or `aria-label` (UX-DR17).
6. Every navigation element in the student surface uses icon + text label; no text-only navigation (NFR-2, NFR-3).
7. `prefers-reduced-motion: reduce` is respected — transition frames are skipped but state changes always apply (UX-DR17).
8. The student surface enforces: no swipe, long-press, drag, hover-only affordances, keyboard shortcuts, right-click menus, or external links of any kind (UX-DR19).

## Tasks / Subtasks

- [x] **Task 0 — Read this before touching anything: most of this story is already built.** Stories 3.4–3.7 already shipped a working `AudioButton` (`src/components/student/audio-button.tsx`), wired with the correct Grade-1-only auto-play prop (`src/app/(student)/session/[sessionId]/page.tsx:62`: `audioAutoPlay={childProfile.gradeBand === 'GRADE_1'}`). **Do not rewrite, replace, or "improve" `AudioButton` or the auto-play wiring** — AC #1–#3 are already satisfied end-to-end. This story's real scope is the four remaining accessibility-floor gaps below (Tasks 1–4) plus a full-surface verification pass (Task 5). Confirm AC #1–#3 by manual test only (Task 5); do not write new code for them.

- [x] Task 1: Descriptive alt text for question images (AC #5)
  - [x] In `src/components/student/question-card.tsx:132`, the question illustration currently renders `<img src={imageUrl} alt="" loading="lazy" .../>` — empty `alt` marks it decorative, which fails AC #5 for a content-bearing illustration. Change to `alt={prompt}`. Rationale: `Question` (`prisma/schema.prisma:138-155`) has no dedicated alt-text/description field, and adding one is a schema change out of this story's scope (AD-13 only governs `imageUrl`, not a caption field) — reusing the question `prompt` (already passed into `QuestionCard`) is the correct pragmatic fix, not a placeholder to revisit.
  - [x] Do not touch `mascot.tsx` — its three `<img>` elements already do this correctly (`alt={active ? asset.alt : ''}` plus `aria-hidden` on the inactive/stacked ones, using `student.mascotNeutralAlt`/`mascotHappyAlt`/`mascotGentleAlt`). This is the reference pattern for "active element gets real alt, inactive stacked elements get empty alt + `aria-hidden`" — already correct, no change needed.

- [x] Task 2: Icon + text on the two text-only navigation CTAs (AC #6)
  - [x] `src/components/student/session-start-button.tsx` renders `<Button className="min-h-16" ...>{student.startSessionCta}</Button>` — text only. Add a leading icon: import `Play` from `lucide-react`, render `<Play aria-hidden="true" className="size-5 shrink-0" />` before the text (shadcn's `Button` already applies `gap-1.5` from `buttonVariants`, so no extra spacing class is needed).
  - [x] `src/components/student/student-home-card.tsx`'s resume `<Link>` (lines 15–20) also renders text only (`` `${student.resumeSessionCta} ${activeSession.progressLabel}` ``). Add a leading `ArrowRight` icon (same one already used by `CompleteSessionButton` and the "Tiếp theo" button in `question-card.tsx` for forward/continue actions — reuse for consistency, not a new icon choice): `<ArrowRight aria-hidden="true" className="size-5 shrink-0" />` before the CTA text (currently a bare template-literal string child of `<Link>`, not a `<span>` — no wrapper element needs to be introduced, just place the icon before it as a sibling).
  - [x] Every other student-surface navigation element already complies — do not modify `complete-session-button.tsx` (`ArrowRight` + text), `session-summary-card.tsx`'s home link (`Home` + text), or `audio-button.tsx` (`Volume2` + "Nghe lại"). Confirm this by inspection, don't add icons where they already exist.

- [x] Task 3: Fix dropped keyboard focus on the "Tiếp theo →" button (AC #4/#6 support + explicit deferred item)
  - [x] **Context:** the Story 3.5 code review explicitly deferred this to Story 3.8: *"Keyboard focus is dropped to `<body>` when feedback disables all answer buttons; the 'Tiếp theo' button appears 500ms later but never receives focus"* (`_bmad-output/implementation-artifacts/deferred-work.md`, "Deferred from: code review of 3-5…"). This story owns closing that gap.
  - [x] In `src/components/student/question-card.tsx`, add a `useRef<HTMLButtonElement>(null)` for the "Tiếp theo →" button (currently an unref'd `<button>` at lines 165–172) and a `useEffect` keyed on `showNextButton` that calls `.focus()` on it once `showNextButton` becomes `true`. The button already exists in the DOM at all times once `displayFeedback !== null` (only its `visible`/`invisible` class toggles), so there is no mount-timing race to handle — the effect firing on the `showNextButton` state flip is sufficient.
  - [x] Do not change `AnswerButtonGrid`'s existing first-answer-button focus effect (`answer-button-grid.tsx:33-38`) — that behavior (focus the first answer button on new-question mount) is Story 3.4/UX-DR17 scope and stays as-is. This task only adds the next-button focus target for the *outgoing* focus point once feedback disables the grid.

- [x] Task 4: Verification-only items — confirm compliance, do not add new code unless a real gap is found
  - [x] **44×44 touch targets (AC #4):** every interactive element in `src/components/student/` already meets this — `audio-button` (`min-h-11 min-w-11`), answer buttons (`min-h-16 min-w-11`), "Tiếp theo"/`complete-session-button`/summary home link/resume link (`min-h-11 min-w-11`), `SessionStartButton` (`min-h-16`). After Task 2's icon additions, re-check that adding an icon doesn't shrink `SessionStartButton`/the resume `Link` below 44px (it won't — icons only add width, and both already set an explicit `min-h`/height). No new CSS needed; this is a confirmation pass.
  - [x] **Reduced motion (AC #7):** already respected everywhere a transition exists — `answer-button-grid.tsx:49` (`motion-reduce:transition-none`), `mascot.tsx:28` (`motion-reduce:transition-none`), `session-summary-card.tsx:18` (`motion-reduce:animate-none`). `audio-button.tsx` and the new icon additions in Task 2 introduce no animation, so nothing to add there. Confirm by inspection; do not add `motion-reduce` classes to elements that have no transition/animation in the first place.
  - [x] **Interaction constraints (AC #8):** a repo-wide search of `src/components/student/` and `src/app/(student)/` for `onKeyDown`, `onContextMenu`, `draggable`, hover-only handlers (`onMouseEnter`/`onMouseOver` with no touch equivalent), and `target="_blank"`/external `href="http…"` links found zero matches — the student surface already has no swipe/drag/hover-only/keyboard-shortcut/right-click/external-link affordances. This task is a regression check to re-run after Tasks 1–3, not new implementation: re-run the same search after your edits and confirm it's still clean (the icon/focus additions in Tasks 2–3 must not introduce any of these).

- [x] Task 5: Manual browser verification pass (mandatory — Epic 2 retro gate, still active; this story's core behaviors are exactly the class of thing static analysis can't cover)
  - [x] Grade 1 Child Profile: start a session, confirm the question is read aloud automatically on question-card mount without tapping anything; confirm the audio button is still visible and tapping it restarts playback from the beginning.
  - [x] Grade 2 or 3 Child Profile: start a session, confirm no auto-play occurs; confirm tapping "Nghe lại" plays the prompt, and tapping again mid-playback restarts it (not queues a second utterance — `window.speechSynthesis.cancel()` in `speak()` already guarantees this, just verify it audibly).
  - [x] Confirm the question illustration's `alt` now reads the question prompt (inspect via screen reader or devtools accessibility tree, not just visually).
  - [x] Confirm `SessionStartButton` and the resume CTA now render icon + text (visually) and both remain ≥44×44px.
  - [x] Tab to an answer button via keyboard, answer the question, and confirm focus lands on the "Tiếp theo →" button once it becomes visible (500ms after feedback) instead of falling back to `<body>`. Verify with `prefers-reduced-motion: reduce` enabled in devtools that state changes still apply instantly with no transition frames.
  - [x] Full regression: run through a complete session (start → answer several questions including at least one wrong answer → final question → summary) confirming no regression in Stories 3.4–3.7's flows (answer submission, feedback, auto-advance, offline banner, session summary).
  - [x] Run `pnpm lint`, `npx tsc --noEmit`, `pnpm test` — all clean; existing tests must still pass (no unit tests are mandated by this story's ACs — the changes are a JSX attribute, two icon additions, and a focus-effect; per repo precedent from 3.5/3.6/3.7, thin UI/DOM behavior like focus management is manually verified, not unit tested).

## Dev Notes

- **This is primarily a gap-closing story, not a build-from-scratch story.** The `audio-button`, its Grade-1 auto-play wiring, the mascot's alt-text pattern, and the vast majority of touch-target/reduced-motion/interaction-constraint requirements were already satisfied as side effects of Stories 3.4–3.7. Re-implementing any of `audio-button.tsx`, `mascot.tsx`, or the Grade-Band auto-play prop plumbing would be pure wheel-reinvention — verify, don't rebuild.
- **Four concrete gaps, and only four:** empty `alt` on the question illustration (Task 1), two text-only navigation CTAs (Task 2), and dropped keyboard focus on the next-button (Task 3, an explicit carryover from the 3.5 code review). Everything else in the epic's AC list is a verification pass (Task 4).
- **No schema, repository, server-action, or domain changes.** This story is scoped entirely to `src/components/student/` presentation-layer files — layer rules (AD-2) are trivially satisfied since nothing here touches Domain or Infrastructure.
- **No new dependencies.** `lucide-react` (already a dependency, already used for every other icon in this surface) supplies `Play` and the already-imported-elsewhere `ArrowRight`.
- **Icon choice for Task 2 is a judgment call, not a spec'd requirement** — neither `epics.md` nor `DESIGN.md` names an icon for `session-start-button`/the resume CTA (searched, no hits). `Play` for "start a new session" and `ArrowRight` for "resume/continue" (matching the semantic already established for `complete-session-button`/the in-card "Tiếp theo" button) are the recommended choices for consistency; if you have a strong reason to deviate, any icon is acceptable as long as icon + text are both present per AC #6 — the hard requirement is "not text-only," not a specific icon.
- **Alt-text decision is deliberate, not deferred:** `Question` has no caption/description field, and adding one would be an unscoped schema change. Reusing `prompt` as the illustration's `alt` is correct because the illustration typically depicts what the prompt describes (e.g., counting/pattern questions) — this is the same tradeoff already accepted implicitly by the story's own AC wording ("descriptive alt text **or** aria-label" — either satisfies WCAG here).
- **Expect the prompt to be announced twice by a screen reader once Task 1 lands** — once via the image's new `alt`, once via the adjacent `<p>{prompt}</p>` (`question-card.tsx:135`) in the same card. This is expected and acceptable (WCAG permits it; nothing in the ACs forbids it), not a bug to "fix" during Task 5's manual verification — don't second-guess or suppress it.
- **Testing precedent (3.5/3.6/3.7): unit-test pure logic, manually browser-verify DOM/timing/focus behavior.** This story adds zero pure logic (no new domain function, no new pure classifier) — it's a JSX attribute change, two icon insertions, and one `useEffect`-driven focus call. Treat Task 5's manual pass as the load-bearing verification, not optional.
- **Epic 2 retro gate is still active and non-negotiable:** a manual browser verification pass is mandatory before marking this story done (same gate 3.5/3.6/3.7 already exercised) — accessibility/focus/audio behavior is exactly the class of thing unit tests and static analysis cannot meaningfully cover.

### Project Structure Notes

- Modified only: `src/components/student/question-card.tsx` (image `alt`, next-button ref + focus effect), `src/components/student/session-start-button.tsx` (add `Play` icon), `src/components/student/student-home-card.tsx` (add `ArrowRight` icon to resume link).
- No new files, no new routes, no locale string changes (all existing copy — `startSessionCta`, `resumeSessionCta`, `listenAgain` — is reused as-is; icons are visual-only additions with `aria-hidden="true"`, so no new screen-reader-facing text is introduced).
- Matches the Architecture Spine's existing capability map entry "Student practice session → `src/app/(student)/session/`" — this story polishes that capability's accessibility floor, it doesn't relocate or restructure anything.

### Previous Story Intelligence (Story 3.7)

- **Established component conventions to keep following:** `data-slot` attribute already present on every touched component (no new components added by this story, so nothing new to add); reuse existing icon-sizing convention `size-5 shrink-0` and `aria-hidden="true"` on all decorative icons (exact pattern already used by `Home`/`ArrowRight`/`Check`/`X` throughout `src/components/student/`).
- **Testing precedent confirmed again by 3.7:** unit-test pure logic only (this story has none), manual browser pass is the mandatory gate for DOM/timing/accessibility behavior.
- **`tailwind-merge` `rounded-brand-*` caveat (Epic 2 retro, still open):** not relevant here — this story doesn't touch any `rounded-brand-*` element.
- **Git baseline:** HEAD `5ce6dbe` landed Story 3.7 (session resume, offline banner, abandoned-session handling). Working tree clean — stable baseline for this story. Commit pattern remains one story per commit, `feat:`/plain-imperative message style — follow existing convention, don't introduce Conventional Commit scopes unasked.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.8: Audio Button, Accessibility Floor & Interaction Constraints] — verbatim AC basis (ACs #1–#8)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#Accessibility Floor] — 44×44 touch target, icon+text navigation, audio-button auto-play-on-Grade-1 rule, alt-text requirement, reduced-motion rule — all verbatim source of ACs #4–#7
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md#Components, line 237] — "Audio button — Speaker icon + 'Nghe lại' text label. Both icon and text always visible" and the interaction-constraints table (line 276) — confirms icon-only audio affordance is the explicitly named anti-pattern this story's existing implementation already avoids
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#Deferred from: code review of 3-5-immediate-feedback-mascot-reactions] — verbatim source of the focus-management gap this story's Task 3 closes
- [Source: src/components/student/audio-button.tsx] — existing, correct implementation of AC #1–#3 (Web Speech API `vi-VN`, `cancel()`-then-`speak()` restart pattern, icon+text button) — reference, do not modify
- [Source: src/components/student/mascot.tsx] — existing, correct alt-text pattern for AC #5 (active element gets real alt, inactive stacked elements get empty alt + `aria-hidden`) — reference, do not modify
- [Source: src/components/student/question-card.tsx] — Task 1 (image alt) and Task 3 (next-button focus) edit sites
- [Source: src/components/student/session-start-button.tsx, src/components/student/student-home-card.tsx] — Task 2 edit sites
- [Source: src/components/student/answer-button-grid.tsx] — existing first-answer-button focus effect (reference pattern for Task 3's new effect; do not modify this file)
- [Source: src/app/(student)/session/[sessionId]/page.tsx, line 62] — confirms `audioAutoPlay={childProfile.gradeBand === 'GRADE_1'}` is already correctly wired
- [Source: prisma/schema.prisma#Question, lines 138-155] — confirms no alt-text/caption field exists on `Question`, informing the Task 1 design decision
- [Source: _bmad-output/project-context.md] — layer rules (not implicated — presentation-only story), code style/naming conventions
- [Source: _bmad-output/implementation-artifacts/3-7-session-state-preservation-offline-resilience.md] — previous story: conventions, manual-verification precedent, git baseline

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

### Completion Notes List

- Verified AC #1–#3 (Grade 1 auto-play TTS, Grade 2/3 on-demand "Nghe lại", tap-to-restart) already satisfied by existing `audio-button.tsx` and Grade-Band auto-play wiring in `src/app/(student)/session/[sessionId]/page.tsx:62` — no code changes made, per Task 0 scope.
- Task 1: Changed the question illustration's `alt=""` to `alt={prompt}` in `question-card.tsx` so the content-bearing image is announced by assistive tech (AC #5). `mascot.tsx` confirmed already correct, left unmodified.
- Task 2: Added leading icons to the two text-only navigation CTAs — `Play` on `SessionStartButton`, `ArrowRight` on the resume `Link` in `StudentHomeCard` (AC #6). All other navigation elements confirmed already icon+text, left unmodified.
- Task 3: Added `nextButtonRef` and a `useEffect` keyed on `showNextButton` in `question-card.tsx` that calls `.focus()` on the "Tiếp theo →" button once it becomes visible, closing the keyboard-focus-drop gap deferred from the Story 3.5 code review (AC #4/#6 support).
- Task 4: Verification-only pass confirmed 44×44 touch targets, `motion-reduce` handling, and zero swipe/drag/hover-only/keyboard-shortcut/right-click/external-link affordances across `src/components/student/` and `src/app/(student)/` — no gaps found beyond Tasks 1–3.
- Task 5: Manual browser verification pass completed for both Grade 1 (auto-play + replay) and Grade 2/3 (on-demand + restart) flows, alt-text via accessibility tree, icon+text CTAs at ≥44×44px, keyboard focus landing on "Tiếp theo →", `prefers-reduced-motion` behavior, and full-session regression (start → answer → summary) with no regressions in Stories 3.4–3.7 flows.
- Validation: `pnpm lint` clean (pre-existing `no-img-element` warnings only, unrelated to this story), `npx tsc --noEmit` clean, `pnpm test` 34/34 passing.

### File List

- src/components/student/question-card.tsx (modified — image `alt`, next-button ref + focus effect)
- src/components/student/session-start-button.tsx (modified — added `Play` icon)
- src/components/student/student-home-card.tsx (modified — added `ArrowRight` icon)

## Change Log

- 2026-07-22: Closed the four accessibility-floor gaps (image `alt`, icon+text on two nav CTAs, next-button keyboard focus); verified AC #1–#3, #4, #7, #8 via inspection and manual browser pass. Status → review.
