---
baseline_commit: 1c512a7
---

# Story 3.6: Session Completion, Summary & Accuracy Update

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student,
I want to see a summary screen after my final question showing my score and per-Skill results,
so that I have a sense of accomplishment and know which Skills I practiced.

## Acceptance Criteria

1. **Given** I tap "Tiếp theo →" after the final question's feedback, **when** `completeSession()` is called, **then** `Session.completedAt` is set; `Session.correctCount` is computed from `SessionAnswer` records; per-Skill accuracy is updated for all Skills answered in this Session (FR-7).
2. I am routed to `/(student)/summary/[sessionId]`; the `session-summary-card` renders within 1 second of session completion (NFR-5) showing:
   - Large score in `typography.display` (e.g., "8 / 10")
   - Per-Skill rows (correct/total per Skill encountered in the Session) (FR-4)
   - `cu-happy.svg` mascot in celebration state
3. If the Session contained only one Skill, the summary shows that Skill's accuracy (e.g., "6/8 Nhận diện quy luật").
4. Two exit buttons: "Về trang chủ" (always); and "Xong cho hôm nay" replaces it only if the Free Tier allotment is now exhausted.
5. Questions from sessions without a `completedAt` (abandoned/in-progress) are excluded from all accuracy calculations (FR-7).
6. Accuracy updates are scoped to the owning `ChildProfile` only; no cross-profile reads (NFR-8).

## Tasks / Subtasks

- [x] Task 1: Pure domain use case `session-scoring.ts` + unit tests (AC: #2, #3)
  - [x] Create `src/domain/use-cases/session-scoring.ts` — this exact file is named in the Architecture Spine's Structural Seed ("session-scoring.ts — Session summary computation"); do not invent a different location or name. Zero imports from `@prisma/client`, Next.js, or any external SDK (AD-2/AD-11 discipline).
  - [x] Export a pure function, e.g. `computePerSkillBreakdown(answers: { skillId: string; answeredCorrectly: boolean | null }[]): { skillId: string; correct: number; total: number }[]`. Rules: group by `skillId`; count only answered rows (`answeredCorrectly !== null`) — unanswered stubs contribute to neither `correct` nor `total`; preserve first-encounter order of Skills within the session (stable, deterministic — no alphabetical resort).
  - [x] Vitest unit tests alongside (`session-scoring.test.ts`, matching `adaptive-difficulty.test.ts` precedent): multi-skill grouping, single-skill session (AC #3 shape), unanswered rows excluded, empty input → empty array, first-encounter ordering, all-incorrect skill (0/n row still present).

- [x] Task 2: `completeSessionAction` server action (AC: #1)
  - [x] Add to `src/app/(student)/actions.ts`: `completeSessionAction(sessionId: string): Promise<ActionResult<{ sessionId: string }>>`, following the exact structure of `submitAnswerAction` (cookie check first, try/catch, never throw).
  - [x] Guards in order: (1) `getChildProfileId(await headers())` — missing → `{ error: { code: 'UNAUTHORIZED', message: student.unauthorizedError } }`; (2) `db.session.findUnique({ where: { id: sessionId }, include: { answers: { select: { answeredAt: true } } } })` — missing or `session.childProfileId !== childProfileId` → `UNAUTHORIZED` (same shape as submitAnswerAction's ownership check); (3) **already completed (`completedAt !== null`) → idempotent SUCCESS** `{ data: { sessionId } }`, NOT an error — a double-tap, refresh, or stale tab must still land on the summary; (4) any answer with `answeredAt === null` → `{ error: { code: 'SESSION_NOT_FINISHED', message: student.sessionNotFinishedError } }` — this closes the Story 3.2 deferred item "completeSession doesn't verify all stub answers are filled" at the application layer, which is exactly where deferred-work.md said the policy belongs (AD-2).
  - [x] Then call the existing repository `completeSession(sessionId)` from `src/infrastructure/repositories/session-repository.ts` — it already sets `completedAt` and computes `correctCount` in one transaction. **Do NOT modify the repository**; it was built for this in Story 3.2.
  - [x] Catch-all → `{ error: { code: 'INTERNAL_ERROR', message: student.genericCompleteSessionError } }`.

- [x] Task 3: Rewire the final-question seam in `question-card.tsx` (AC: #1, #2)
  - [x] This is the exact seam Story 3.5 left on purpose (see its `advance()` comment: "Story 3.6 rewires this call site"). Add a `sessionId: string` prop to `QuestionCard` (the card currently only knows `sessionAnswerId`) and pass it from `src/app/(student)/session/[sessionId]/page.tsx`.
  - [x] In `advance()`: keep the non-final branch exactly as-is (`startAdvancing(() => router.refresh())`). For the final branch: `startAdvancing(async () => { const result = await completeSessionAction(sessionId); ... })` — on success `router.push(\`/summary/${sessionId}\`)`; on error `toast.error(result.error.message)`, and if `result.error.code === 'SESSION_NOT_FINISHED'` also `router.refresh()` to resync (mirrors the existing `ALREADY_ANSWERED` resync pattern). React 19 transitions support async functions — `useTransition` is already imported and in use here.
  - [x] Do NOT weaken any 3.5 review fix: the `hasAdvancedRef` re-entry guard still wraps `advance()`; the `isAdvancing`-settles re-arm effect gives the error path its retry automatically (transition settles → guard resets) — verify the async action runs inside the transition so this holds. Keep the `isMountedRef` check before calling `router.push` after the await. Keep timers, `submitLockRef`, `displayFeedback` server-wins rule, and the persistent `role="status"` live region untouched.
  - [x] Auto-advance never fires on the final question (3.5 AC), so `completeSessionAction` is only ever triggered by an explicit tap — matching AC #1's "Given".

- [x] Task 4: Completed/orphaned session handling in the session page (AC: #2, end-to-end coherence)
  - [x] In `src/app/(student)/session/[sessionId]/page.tsx`, after the existing ownership checks: `if (session.completedAt !== null) redirect(\`/summary/${sessionId}\`)` (`redirect` from `next/navigation`). This makes back-button/deep-link into a finished session land on the summary instead of 3.5's temporary "quiet end state", and retires 3.5's cosmetic note about the mascot overlapping the last answer button in that state.
  - [x] Dead-end fix (required for the feature to work end-to-end): if the student answered the final question but closed the tab before tapping "Tiếp theo →", the session is fully answered yet `completedAt` is null — with 3.5's quiet state there is NO affordance to ever reach the summary. When `firstUnanswered` is undefined AND `completedAt === null`, render a small new client component `src/components/student/complete-session-button.tsx` with `data-slot="complete-session-button"` (below the existing already-answered card, inside `<main>`): a primary CTA labeled `student.viewResultsCta` ("Xem kết quả") + lucide `ArrowRight` (`aria-hidden="true"`), styled like the card's "Tiếp theo" CTA (`bg-primary text-primary-foreground rounded-brand-lg text-label-student min-h-11 min-w-11 px-5 py-2 inline-flex items-center justify-center gap-2`), that calls `completeSessionAction(sessionId)` then `router.push` to the summary on success / `toast.error` on error (copy the `SessionStartButton` transition + disabled pattern). Icon + text, 44×44 floor, tap-only (NFR-2, UX-DR19).
  - [x] Touch nothing else in this page: `Promise.all` reads, sanitized view model (no `correctAnswer` in RSC props), `notFound()` checks, empty-answers guard, `key={currentAnswer.id}`, `SessionProgressChip` — all locked behavior from 3.3/3.4/3.5.

- [x] Task 5: Skills locale file (AC: #2, #3)
  - [x] Create `src/locales/vi/skills.ts` — it does not exist yet, and both epics.md ("Skill `name` values are stored in `src/locales/vi/skills.ts` — never inline in component code") and the schema comment on `Skill.name` ("duplicated into src/locales/vi/skills.ts per epics.md, DB copy is for joins/admin only") mandate it. Export a `Record<string, string>` keyed by the canonical Skill `code`: `'pattern-recognition': 'Nhận diện quy luật'`, `'spatial-reasoning': 'Suy luận không gian'`, `'classification': 'Phân loại'`, `'word-problem': 'Đọc hiểu bài toán'`, plus a helper `skillDisplayName(code: string, fallback: string): string` that returns the locale name or the DB-provided fallback for unknown codes (future skills must not render blank).

- [x] Task 6: Summary route (AC: #2, #5, #6)
  - [x] Delete the stub `src/app/(student)/summary/page.tsx` (inline English placeholder from Story 1.1 — a bare `/summary` URL has no meaning; after deletion it 404s naturally). Create `src/app/(student)/summary/[sessionId]/page.tsx` — the epics/spine route is `/(student)/summary/[sessionId]`, NOT a query param and NOT the stub's static route.
  - [x] Server Component, mirroring the session page's exact guard sequence: `const { sessionId } = await params` (Next 15 Promise params, same as session page); `getChildProfileId(await headers())` → missing → `notFound()`; `Promise.all([db.session.findUnique({ where: { id: sessionId }, include: { answers: { select: { answeredCorrectly: true, question: { select: { skillId: true, skill: { select: { code: true, name: true } } } } }, orderBy: { id: 'asc' } } } }), findChildProfileById(childProfileId)])`; not found or `session.childProfileId !== childProfileId` → `notFound()` (NFR-8/AC #6 — no cross-profile reads).
  - [x] `if (session.completedAt === null) redirect(\`/session/${sessionId}\`)` — an in-progress/abandoned session has no summary; URL-guessing lands back in the session (AC #5's spirit: incomplete sessions expose nothing).
  - [x] Exit-button state: `await getSessionStartGateState(childProfile.id, childProfile.parentAccountId)` — the exported read-only gate check from `src/app/(student)/actions.ts` that `src/app/page.tsx` already uses. `blocked: true` = allotment now exhausted. Do NOT re-implement subscription/allotment logic here (it was deliberately centralized in `isAllotmentExhausted` so callers can't drift).
  - [x] Compute per-Skill rows: map `session.answers` to `{ skillId: answer.question.skillId, answeredCorrectly: answer.answeredCorrectly }`, feed `computePerSkillBreakdown`, then resolve each row's display name via `skillDisplayName(code, dbName)`. Pass ONLY computed display data to the card: `score={session.correctCount}`, `total={session.questionCount}`, `skillRows=[{ name, correct, total }]`, `allotmentExhausted`. Never pass raw question/answer objects into component props — keeps the RSC payload minimal (and `correctAnswer` is not even selected in the query above; keep it that way).
  - [x] NFR-5 (renders ≤ 1s of completion): the budget is one `findUnique` + one profile read in `Promise.all`, plus the gate check — add no further queries. The gate check needs `childProfile`, so run it after `Promise.all` resolves (it is itself two small parallel reads internally).

- [x] Task 7: `session-summary-card` component (AC: #2, #3, #4)
  - [x] Create `src/components/student/session-summary-card.tsx` with `data-slot="session-summary-card"` (3.4/3.5 convention). Server-component-compatible — no hooks, no `'use client'`; exit navigation is a `next/link` `<Link>`. Props: `{ score: number; total: number; skillRows: { name: string; correct: number; total: number }[]; allotmentExhausted: boolean }`.
  - [x] Card: shadcn `Card` with `relative rounded-brand-xl shadow-sm bg-white` (DESIGN.md: `session-summary-card` = `Card`, `{rounded.xl}`, celebration state) — same tailwind-merge `rounded-brand-xl` caveat as `question-card` (known, accepted risk; don't add new shadcn-wrapper styling that depends on override order).
  - [x] Celebration headline + score: `<h1 className="text-display">` with `student.summaryHeadline` ("Tuyệt vời!" — approved voice, DESIGN.md's own example "Tuyệt vời! 8/10 câu đúng" in Baloo 2/36px), then the score `student.summaryScoreLabel(score, total)` ("8 / 10" — spaces around the slash per the voice table) also in `text-display`. `text-display` already resolves to Baloo 2 700/36px via `src/app/globals.css` — reuse the utility, never redeclare fonts.
  - [x] Per-Skill rows (AC #2/#3): one row per entry in `skillRows`, `text-label-student`, formatted via `student.skillRowLabel(name, correct, total)` ("Nhận diện quy luật: 4/4" — Flow 1 step 7 format) with a lucide `Check` icon (`aria-hidden="true"`) per row. A single-skill session naturally renders one row — AC #3 needs no special casing. Render rows as a semantic list (`<ul>`/`<li>`).
  - [x] Mascot celebration (AC #2): reuse `<Mascot state="happy" />` from `src/components/student/mascot.tsx` — 3.5 built it explicitly anticipating this reuse; the `Card` root's `relative` anchors its absolute positioning. Apply `MASCOT_CLEARANCE_CLASS` (exported from mascot.tsx) to the bottom content block (skill rows / exit button area) so text never runs under the 72px owl — the exact overlap class 3.5's review already solved once.
  - [x] Exit button (AC #4): ONE primary exit CTA — label `student.doneForTodayCta` ("Xong cho hôm nay") when `allotmentExhausted`, else `student.backToHomeCta` ("Về trang chủ"). The epics AC says "replaces it", and epics wins over EXPERIENCE.md's looser "two buttons" phrasing (both would navigate to the same place anyway). Implement as `<Link href="/">` styled as the surface's primary CTA (`bg-primary text-primary-foreground rounded-brand-lg text-label-student min-h-11 min-w-11 px-5 py-2 inline-flex items-center justify-center gap-2`) with lucide `Home` icon + text label (never text-only navigation — NFR-2/UX-DR17). Landing on `/` re-runs the gate check, so an exhausted profile sees the `free-tier-gate-card` — already-working behavior, don't duplicate it.
  - [x] Celebration animation (EXPERIENCE.md "Session complete" state): keep it minimal and dependency-free — at most a one-shot CSS transition/keyframe (~200ms) on the score/headline with `motion-reduce:` disabling the animated frames while content still renders (UX-DR17). NO animation library (framer-motion etc.) — mascot-happy + Baloo score IS the celebration; the animation is garnish, not a requirement.
  - [x] Student-surface constraints hold: no hover-only affordances, drag, long-press, keyboard shortcuts, or external links (UX-DR19); every interactive element ≥ 44×44px (NFR-1); mascot images already carry Vietnamese alt text from 3.5.

- [x] Task 8: Locale strings (all Vietnamese copy — never inline in components)
  - [x] Add to `src/locales/vi/student.ts`: `summaryHeadline: 'Tuyệt vời!'`, `summaryScoreLabel: (correct: number, total: number) => \`${correct} / ${total}\``, `skillRowLabel: (name: string, correct: number, total: number) => \`${name}: ${correct}/${total}\``, `backToHomeCta: 'Về trang chủ'`, `doneForTodayCta: 'Xong cho hôm nay'`, `viewResultsCta: 'Xem kết quả'`, `sessionNotFinishedError` (e.g. 'Buổi luyện chưa xong, hãy trả lời hết các câu hỏi nhé.'), `genericCompleteSessionError` (e.g. 'Không thể hoàn thành buổi luyện, vui lòng thử lại.').
  - [x] Voice rules (EXPERIENCE.md): never the word "Sai"; short, warm, icon-supported; scores as bare "8 / 10", not narrated sentences.

- [x] Task 9: Layer, convention, and regression check
  - [x] Layer audit (AD-2): `session-scoring.ts` imports nothing external; `session-summary-card.tsx` imports no `src/domain/` use cases and no `src/infrastructure/` (it receives computed props); components never import Prisma. Note on the summary *page* importing `computePerSkillBreakdown` + repositories: server-side `src/app/` pages already do exactly this (`session/[sessionId]/page.tsx` imports `db` and `findChildProfileById`; `session-question-selection.ts` composes domain + infrastructure) — Server Components act as the Application layer here, an established, reviewed repo pattern. The prohibition is on *client* components and shared `src/components/` UI.
  - [x] Grep the diff for `correctAnswer`: it must appear NOWHERE new — the summary flow never needs it (the summary query must not even select it).
  - [x] Run `pnpm lint`, `npx tsc --noEmit`, `pnpm test` — all clean; 28 existing tests must still pass plus the new `session-scoring` tests.
  - [x] Manual browser verification pass before review (Epic 2 retro action item — mandatory gate): (1) full 10-question session → final "Tiếp theo →" tap → summary appears fast (~≤1s), score matches, per-skill rows correct with Vietnamese names, cu-happy visible; (2) non-exhausted profile → "Về trang chủ" → student home with CTA; (3) exhausted Free Tier profile (answer past the daily 5) → "Xong cho hôm nay" → home shows `free-tier-gate-card`; (4) refresh the summary URL → renders again (idempotent); (5) browser-back from summary into the session URL → redirected to summary; (6) summary URL of an in-progress session → redirected into the session; (7) summary URL with another profile's sessionId → 404; (8) answer final question, close tab before "Tiếp theo", reopen session URL → "Xem kết quả" button → summary; (9) start the NEXT session and confirm question selection now reflects the completed session's history (accuracy pipeline live end-to-end, AC #1/#5).

## Dev Notes

- **There is no accuracy table — do NOT invent one.** AC #1's "per-Skill accuracy is updated" is satisfied *structurally*: `getSkillAccuracyHistory` (session-repository.ts) filters `session: { completedAt: { not: null } }`, so the moment `completeSession()` stamps `completedAt`, every answer in this session enters the accuracy window that drives adaptive difficulty. Setting `completedAt` IS the accuracy update. Likewise AC #5 (incomplete sessions excluded) and AC #6 (queries scoped by `childProfileId`) are already enforced by that repository query — this story's job is only to make completion actually happen and prove it end-to-end (manual check #9).
- **Everything server-side already exists.** `completeSession(sessionId)` (transactional `correctCount` + `completedAt`) shipped in Story 3.2 and has never been called — deferred-work.md explicitly notes "story 3-6 owns session-completion behavior". The new work is: one server action, one domain scoring function, one route, one component, one client seam rewire, one dead-end fix.
- **The 3.5 seam is a single call site.** `advance()` in `question-card.tsx` carries the comment "Story 3.6 rewires this call site to complete-and-redirect to the summary route." Only the final-question branch changes; `router.refresh()` for questions 1..N−1 stays byte-identical. The card needs a new `sessionId` prop because it currently only holds `sessionAnswerId`.
- **Idempotent completion is the load-bearing design decision.** `completeSessionAction` on an already-completed session returns success with the sessionId. This makes every re-entry path safe: double-tap racing the transition guard, refresh mid-navigation, the "Xem kết quả" button on a stale tab. An error here would strand students; there is nothing to protect (`completeSession` re-running would only recompute the same `correctCount`, and the idempotent-success path doesn't even reach the repository).
- **`SESSION_NOT_FINISHED` guard = deferred-work closure.** Story 3.2's review deferred "completeSession doesn't verify all stub answers are filled" to "a future use-case/server-action layer (AD-2)". That future is now: the action refuses to complete a session with unanswered stubs. Reachable only via manipulated/stale clients (the UI can't tap "Tiếp theo →" before the final answer) — on that error the client resyncs with `router.refresh()`.
- **The fully-answered-but-unconfirmed dead end is in scope (Task 4).** After 3.5, a student who answers question N and closes the tab has NO path to the summary: session page renders the quiet already-answered state with no button, forever. "A story must leave the system working end-to-end" — the `complete-session-button.tsx` affordance ("Xem kết quả") closes it. Until tapped, that session correctly stays out of accuracy (no `completedAt`) per FR-7.
- **Exit-button conflict resolved: epics AC wins.** epics.md says "Xong cho hôm nay" *replaces* "Về trang chủ" when the allotment is exhausted; EXPERIENCE.md's component table reads like two simultaneous buttons. Both navigate to `/`. Implement the epics version (one CTA, conditional label). Exhaustion state comes from the existing `getSessionStartGateState` — never re-derive subscription/allotment logic (the shared `isAllotmentExhausted` exists specifically so callers can't drift; a subscribed profile is never "exhausted" and always gets "Về trang chủ").
- **`src/locales/vi/skills.ts` does not exist yet — this story creates it.** The schema comment on `Skill.name` and epics.md's v1 Skill Enumeration both mandate skill display names in the locale file, keyed by `code` (`pattern-recognition`, `spatial-reasoning`, `classification`, `word-problem`), with the DB `name` as fallback for unknown codes. The summary query therefore selects `question.skill.code` and `question.skill.name`.
- **Score source of truth:** display `session.correctCount` / `session.questionCount` (both authoritative after `completeSession`'s transaction). Per-skill rows come from `computePerSkillBreakdown` over the answers. Don't compute the headline score client-side from answers — one source each, no drift.
- **`typography.display` already exists as the `text-display` utility** (Baloo 2 700/36px, `src/app/globals.css`) — reuse it (`app/page.tsx` greeting and `free-tier-gate-card` already do). Baloo 2 is legal here — the session summary headline is one of its only three sanctioned uses (DESIGN.md).
- **Route inheritance:** `/(student)/summary/[sessionId]` sits inside the `(student)` route group → inherits `layout.tsx`'s warm-cream `data-mode="student"` canvas, safe-area insets, and the resolve-profile redirect. The page still does its own cookie + ownership `notFound()` checks (defense in depth — the session page sets this exact precedent).
- **NFR-5 (≤1s):** the completion path is action (1 findUnique + 1 transaction) → `router.push` → summary page (1 findUnique + profile read in `Promise.all` + gate check). Keep the answer include lean (`select` only `answeredCorrectly` + skill fields) and add no extra queries. No `loading.tsx` is required for the summary (fast single query; add one only if you observe jank).
- **Untouched territory:** `src/infrastructure/repositories/**` (zero changes), `src/domain/use-cases/adaptive-difficulty.ts`, `answer-button-grid.tsx`, `answer-button-state.ts`, `mascot.tsx` (reused as-is), `audio-button.tsx`, `submitAnswerAction`, all timers/feedback behavior for questions 1..N−1. No offline handling (3.7), no resume-CTA on student home (3.7), no TTS/alt-text sweep (3.8), no streak/weekly-activity computation (4.1 — Flow 1's "activity indicator updated" note is parent-dashboard scope).
- **tailwind-merge caveat (Epic 2 retro, still open):** `rounded-brand-xl` via `className` on shadcn `Card` may not reliably override the built-in `rounded-xl` through `cn()`. `question-card` and `free-tier-gate-card` already carry this accepted risk — match their pattern; don't attempt a new workaround in this story.
- **No new dependencies and no web research required:** `redirect`/`notFound`/`router.push`/`useTransition` (React 19 async transitions), lucide-react (`Check`, `Home`, `ArrowRight`), sonner, Vitest, Next 15 Promise-`params` are all already in use in this codebase. Do not add an animation or state library.

### Previous Story Intelligence (Story 3.5)

- **The seam is documented at both ends:** 3.5's completion notes say "3.6 replaces exactly this call site with `completeSession()` + redirect to `/summary/[sessionId]`", and the code comment in `advance()` says the same. Everything else in `question-card.tsx` is review-hardened — treat it as load-bearing.
- **3.5's review fixes you must not regress while editing `question-card.tsx`:** synchronous `submitLockRef` re-entry lock; `ALREADY_ANSWERED` → `router.refresh()` resync; `hasAdvancedRef` re-armed via the `isAdvancing`-settles effect (this is what gives YOUR new error path a free retry — keep the async work inside `startAdvancing`); `isMountedRef` post-await guard; persistent (always-mounted) `role="status"` live region; `MASCOT_CLEARANCE_CLASS` for content near the owl.
- **3.5's cosmetic handoff note:** in the temporary quiet end state the mascot overlaps the last answer button — "state disappears once 3.6 redirects to the summary." Task 4's completed→summary redirect is that fix; verify the overlap is gone in the manual pass.
- **Established component conventions (3.4/3.5):** `data-slot` attribute on every student component; primary CTA styling `bg-primary text-primary-foreground rounded-brand-lg text-label-student min-h-11 min-w-11 px-5 py-2 inline-flex items-center justify-center gap-2`; lucide icons always `aria-hidden="true"` beside text; sonner `toast.error(result.error.message)` for action errors; locale functions (not string interpolation) for parameterized copy.
- **Testing precedent:** extract pure logic, unit-test it, manually verify the visual/timing composition. 3.5 unit-tested `computeAnswerButtonState` (5 tests) and browser-verified the rest — this story mirrors that: `computePerSkillBreakdown` gets real tests; routing/celebration gets the manual pass. 28 tests currently green.
- **Epic 2 retro gate still active:** a manual browser verification pass is mandatory before review — two UI bugs shipped as "done" in Epic 2 without one, and 3.5's browser pass caught a real bug (stale feedback surviving a same-key refresh) that no static check found.

### Git Intelligence

- HEAD `1c512a7` landed Story 3.5 complete (feedback controller, mascot system, answer-button states, review patches folded in). Working tree clean — everything above is a stable baseline.
- Pattern: one story per commit, review patches folded in before done; commit message style mixes `feat:`/plain — follow the repo's existing style.
- `c439863`/`326b00f` (Stories 3.3/3.2) are where the pieces this story assembles were built: `completeSession`, `getSkillAccuracyHistory`, the VN-day allotment counting, `getSessionStartGateState`, and the `SessionAnswer(sessionId, questionId)` unique constraint.

### Project Structure Notes

- New files: `src/domain/use-cases/session-scoring.ts`, `src/domain/use-cases/session-scoring.test.ts`, `src/app/(student)/summary/[sessionId]/page.tsx`, `src/components/student/session-summary-card.tsx`, `src/components/student/complete-session-button.tsx`, `src/locales/vi/skills.ts`.
- Modified: `src/app/(student)/actions.ts` (add `completeSessionAction`), `src/components/student/question-card.tsx` (`sessionId` prop + final-branch rewire only), `src/app/(student)/session/[sessionId]/page.tsx` (completed→redirect, dead-end button, pass `sessionId`), `src/locales/vi/student.ts` (new strings).
- Deleted: `src/app/(student)/summary/page.tsx` (Story 1.1 English-stub placeholder superseded by the dynamic route).
- Matches the Architecture Spine Structural Seed exactly: "summary/ — Post-session summary" under `(student)`, `session-scoring.ts` under `domain/use-cases/`, summary capability mapped to `src/app/(student)/summary/` governed by AD-1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6: Session Completion, Summary & Accuracy Update] — verbatim AC basis (ACs #1–#6)
- [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory] — FR-4 (summary content), FR-7 (accuracy over completed Sessions only), NFR-5 (≤1s render), NFR-8 (owning-profile scoping), NFR-1/NFR-2 (touch targets, icon+text nav), UX-DR13 (final-question manual advance → summary), UX-DR17 (a11y floor), UX-DR19 (tap-only)
- [Source: _bmad-output/planning-artifacts/epics.md#v1 Skill Enumeration] — four canonical Skill codes/names; locale-file rule for Skill names
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-4, #FR-7] — summary contract; accuracy = correct/total across completed Sessions
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md#Components] — `session-summary-card` = `Card`/`rounded.xl`/celebration state/score in `typography.display`; mascot positioned in session summary; Baloo 2 sanctioned for summary headlines ("Tuyệt vời! 8/10 câu đúng")
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#Component Patterns] — summary card behavioral row (score display, per-skill rows, exit buttons); State Patterns "Session complete"; Flow 1 steps 7–8 (row format "Nhận diện quy luật: 4/4 ✓", exit to home); Voice ("8 / 10" bare, never "Sai")
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#Structural Seed] — `summary/` route location; `session-scoring.ts` domain use case; [#AD-2] layer rules; [#Capability → Architecture Map] "Session summary (FR-4) → src/app/(student)/summary/"
- [Source: src/infrastructure/repositories/session-repository.ts#completeSession, #getSkillAccuracyHistory, #countQuestionsAnsweredToday] — existing transaction to invoke; completedAt-filtered accuracy query; allotment counting
- [Source: src/app/(student)/actions.ts#submitAnswerAction, #getSessionStartGateState, #isAllotmentExhausted] — action structure template; exported gate check to reuse; centralized allotment logic (do not duplicate)
- [Source: src/components/student/question-card.tsx#advance] — the seam call site + review-hardened guards to preserve
- [Source: src/app/(student)/session/[sessionId]/page.tsx] — guard sequence to mirror in the summary page; where the redirect + dead-end button land
- [Source: src/components/student/mascot.tsx] — `Mascot` + `MASCOT_CLEARANCE_CLASS` to reuse
- [Source: src/components/student/session-start-button.tsx] — client action→push→toast pattern for `complete-session-button.tsx`
- [Source: src/app/page.tsx, src/components/student/free-tier-gate-card.tsx] — gate-state consumption precedent; `text-display` usage
- [Source: prisma/schema.prisma#Session, #SessionAnswer, #Skill] — `completedAt` semantics comment ("only completed Sessions count toward accuracy (FR-7)"); `Skill.name` locale-duplication comment
- [Source: _bmad-output/implementation-artifacts/3-5-immediate-feedback-mascot-reactions.md] — previous story: seam definition, review fixes, conventions, cosmetic handoff note
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — 3.2 deferral closed by Task 2 (`SESSION_NOT_FINISHED`); 3.4 deferral note "3-6 owns session-completion"; tailwind-merge `rounded-brand-*` risk
- [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-07-18.md] — manual browser verification gate enforced in Task 9
- [Source: _bmad-output/project-context.md] — layer rules, server-action return shape, locale rules, ID/date conventions, student-surface design tokens

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5) via Claude Code

### Debug Log References

- RED→GREEN: `session-scoring.test.ts` written first (module-not-found fail), then implementation; one test expectation typo fixed (skill-b 1/1, not 1/2). 6/6 pass.
- Full suite: 34/34 tests pass (28 pre-existing + 6 new). `npx tsc --noEmit` clean. `pnpm lint` clean (only the two pre-existing `<img>` warnings in mascot.tsx / question-card.tsx).
- Browser verification hit HTTP 500s on `/dashboard`/`/profiles` mid-pass — root-caused to a Turbopack HMR staleness artifact in the long-running dev server ("Module child-profile-switcher.tsx … deleted in an HMR update", triggered by deleting the `summary/page.tsx` stub route). A dev-server restart cleared it; both pages 200 after restart. Not a code defect.

### Completion Notes List

- **All 9 manual browser checks executed via headless Chromium (Playwright, scratchpad-only install — no project dependency added) against the live dev server + dev DB:**
  1. ✅ Full 10-question session → final "Tiếp theo →" → summary: score 10/10 correct, 4 per-skill rows with Vietnamese names ("Suy luận không gian: 3/3" etc.), cu-happy mascot visible.
  2. ⚠️ Code-verified only: "Về trang chủ" (non-exhausted) branch — a 10-question session always exhausts the 5/day free tier, so observing it live needs a subscribed profile or raised allotment. Conditional is a single ternary on `gateState.blocked`, whose exhausted side is live-verified.
  3. ✅ Exhausted profile → "Xong cho hôm nay" → home shows `free-tier-gate-card` (exit label consistent with gate state).
  4. ✅ Summary URL refresh renders again (idempotent).
  5. ✅ Browser-back/deep-link into finished session URL → redirected to summary (3.5's quiet-state mascot-overlap note retired for completed sessions).
  6. ✅ Summary URL of in-progress session → redirected into session.
  7. ✅ Unknown/foreign sessionId → 404.
  8. ✅ Fully-answered-but-unconfirmed session (tab closed before "Tiếp theo") → "Xem kết quả" button → summary.
  9. ✅ Accuracy pipeline live end-to-end (data layer): `getSkillAccuracyHistory` window now fed by the completed sessions' answers, scoped to owning profile only, in-progress/abandoned rows excluded (AC #1/#5/#6).
- NFR-5 note: click→summary measured 2894ms in dev mode — dominated by first-hit Turbopack route compilation; the query budget is per spec (1 findUnique + profile read in `Promise.all` + gate check). Re-render (refresh) was fast. Recommend a production-build spot check if NFR-5 must be certified numerically.
- Residual cosmetic (pre-existing from 3.5, narrower now): mascot overlaps the last answer button ONLY in the rare dead-end state (fully answered, uncompleted). The prominent "Xem kết quả" CTA is the path out; state is transient.
- Idempotent completion implemented as designed: already-completed → `{ data: { sessionId } }` success, never reaches the repository. `SESSION_NOT_FINISHED` guard closes the Story 3.2 deferral at the application layer; client resyncs via `router.refresh()` mirroring the `ALREADY_ANSWERED` pattern.
- All 3.5 review-hardened guards preserved in `question-card.tsx`: `submitLockRef`, `hasAdvancedRef` + `isAdvancing`-settles re-arm (async completion runs inside `startAdvancing`, so the error path re-arms for retry), `isMountedRef` post-await check, persistent `role="status"` live region, timers, `displayFeedback` server-wins rule. Non-final branch byte-identical.
- Celebration animation: one-shot 200ms CSS keyframe (`animate-summary-pop` in globals.css) with `motion-reduce:animate-none` — no animation library.
- Verification side effects on dev DB: new child profile "Thỏ QA 3-6" (grade 1) created under parent@example.test; three sessions completed today (Sóc 6/10 — appears to be a concurrent manual test, Voi 10/10, Thỏ QA 10/10). Dev server on :4200 was restarted (fresh instance left running).

### File List

- `src/domain/use-cases/session-scoring.ts` (new)
- `src/domain/use-cases/session-scoring.test.ts` (new)
- `src/app/(student)/summary/[sessionId]/page.tsx` (new)
- `src/components/student/session-summary-card.tsx` (new)
- `src/components/student/complete-session-button.tsx` (new)
- `src/locales/vi/skills.ts` (new)
- `src/app/(student)/actions.ts` (modified — added `completeSessionAction`)
- `src/components/student/question-card.tsx` (modified — `sessionId` prop + final-branch rewire only)
- `src/app/(student)/session/[sessionId]/page.tsx` (modified — completed→summary redirect, dead-end button, `sessionId` prop pass)
- `src/locales/vi/student.ts` (modified — 8 new strings)
- `src/app/globals.css` (modified — `animate-summary-pop` keyframe utility)
- `src/app/(student)/summary/page.tsx` (deleted — Story 1.1 English-stub placeholder superseded by dynamic route)

## Change Log

- 2026-07-21: Story 3.6 implemented — session completion (`completeSessionAction`, idempotent, `SESSION_NOT_FINISHED` guard), pure `computePerSkillBreakdown` domain use case (+6 unit tests), `/summary/[sessionId]` route with `session-summary-card` (celebration, per-skill rows, conditional exit CTA), final-question seam rewire in `question-card.tsx`, completed-session redirect + dead-end "Xem kết quả" affordance, `skills.ts` locale file. 34/34 tests, tsc + lint clean, 9-point manual browser pass executed. Status → review.
