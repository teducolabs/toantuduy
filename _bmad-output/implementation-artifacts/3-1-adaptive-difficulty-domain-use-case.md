---
baseline_commit: 02f319d03bd3d6ecf396b36ca9f9e072a52d6680
---

# Story 3.1: Adaptive Difficulty Domain Use Case

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the adaptive difficulty use case implemented as a pure domain function with unit tests,
so that question selection logic is testable in isolation and never contaminated by framework or DB dependencies.

## Acceptance Criteria

1. **Given** `src/domain/use-cases/adaptive-difficulty.ts` exists, **when** `selectNextQuestion(skillAccuracyHistory, availableQuestions)` is called, **then** it returns one `Question` from `availableQuestions` with zero imports from `@prisma/client`, Next.js, or any external SDK. (AD-11)
2. `src/domain/constants.ts` exports `WINDOW_SIZE = 10`, `ACCURACY_UP_THRESHOLD = 0.80`, `ACCURACY_DOWN_THRESHOLD = 0.50` as named constants. (already stubbed — verify/finalize, see Dev Notes)
3. The algorithm computes, per Skill, accuracy over the last `WINDOW_SIZE` answered questions for that Skill:
   - accuracy > `ACCURACY_UP_THRESHOLD` → prefer a higher Difficulty Level for that Skill
   - accuracy < `ACCURACY_DOWN_THRESHOLD` → prefer a lower Difficulty Level for that Skill
   - no history for a Skill → start at Difficulty Level 2
4. Question selection weights toward Skills with lower accuracy — over any 5-question window, a Skill with accuracy <50% receives proportionally more Questions than a Skill with accuracy >80%. (FR-9)
5. The function never returns a `Question` outside the Child Profile's current `GradeBand`.
6. At least 10 unit tests cover: no history, high accuracy, low accuracy, mixed Skills, boundary thresholds (exactly 0.80, exactly 0.50), and a fallback random pick when `availableQuestions` is empty.
7. `src/domain/entities/` defines pure TypeScript types with zero framework imports: `Question`, `Skill`, `SkillAccuracyWindow`, `Session`, `SessionAnswer`, `ChildProfile`.

## Tasks / Subtasks

- [x] Task 1: Define domain entity types (AC: #7)
  - [x] Create `src/domain/entities/question.ts` — `Question { id: string; prompt: string; imageUrl: string | null; choices: unknown; correctAnswer: string; skillId: string; gradeBand: GradeBand; difficultyLevel: number }` (1–5)
  - [x] Create `src/domain/entities/skill.ts` — `Skill { id: string; code: string; name: string }`
  - [x] Create `src/domain/entities/child-profile.ts` — `ChildProfile { id: string; parentAccountId: string; name: string; gradeBand: GradeBand }`, plus shared `GradeBand = 'GRADE_1' | 'GRADE_2' | 'GRADE_3'` type
  - [x] Create `src/domain/entities/session.ts` — `Session { id: string; childProfileId: string; completedAt: string | null; questionCount: number; correctCount: number }`
  - [x] Create `src/domain/entities/session-answer.ts` — `SessionAnswer { id: string; sessionId: string; questionId: string; answeredCorrectly: boolean; difficultyLevelAtAnswer: number }`
  - [x] Create `src/domain/entities/skill-accuracy-window.ts` — `SkillAccuracyWindow { skillId: string; answers: boolean[] }` (or equivalent shape holding the last `WINDOW_SIZE` correct/incorrect outcomes per Skill — choose the shape that makes the sliding-window accuracy calc and the 5-question weighting calc in Task 3 straightforward, then keep it consistent with what Story 3.2's `getSkillAccuracyHistory` will need to produce)
  - [x] Add barrel export `src/domain/entities/index.ts` if that matches existing conventions (check for a similar barrel pattern elsewhere in `src/` before adding one) — **skipped:** no barrel-export pattern exists anywhere else in `src/` (confirmed via search), so none was added
- [x] Task 2: Finalize domain constants (AC: #2)
  - [x] Update `src/domain/constants.ts` — remove the `// TODO: Full constants defined in Story 3.1` comment; keep `WINDOW_SIZE`, `ACCURACY_UP_THRESHOLD`, `ACCURACY_DOWN_THRESHOLD` as-is (values already correct); add any additional named constant the algorithm needs (e.g. default starting Difficulty Level of 2) rather than hardcoding magic numbers in the use case
- [x] Task 3: Implement `selectNextQuestion` (AC: #1, #3, #4, #5)
  - [x] Create `src/domain/use-cases/adaptive-difficulty.ts` with signature `selectNextQuestion(skillAccuracyHistory: SkillAccuracyWindow[], availableQuestions: Question[]): Question`
  - [x] Compute per-Skill accuracy from `skillAccuracyHistory` (last `WINDOW_SIZE` answers) and derive a target Difficulty Level per Skill per the up/down thresholds and the no-history default of 2
  - [x] Filter `availableQuestions` to the Child Profile's Grade Band — **note:** the function signature only takes `availableQuestions` and `skillAccuracyHistory`, no explicit `childProfile`/`gradeBand` parameter; assume the caller (Story 3.2's repository, or the future session-start flow) pre-filters `availableQuestions` to the correct Grade Band before calling this function, and enforce as a defensive invariant/assertion that every returned Question's `gradeBand` matches — do not invent a new parameter not specified by AD-11's signature
  - [x] Implement weighting so Skills with lower accuracy get proportionally more picks over any 5-question window (e.g. inverse-accuracy weighted random selection among Questions matching each Skill's target Difficulty Level)
  - [x] Implement the fallback: if `availableQuestions` is empty... — re-read AC #6: "fallback random pick when `availableQuestions` is empty" is a listed test case, but a function returning a single `Question` cannot fabricate one from an empty array. Resolve this by treating "empty `availableQuestions`" as scoped to a single Skill/Difficulty-Level combination having no matching Questions (in which case fall back to a random pick from all remaining `availableQuestions`, ignoring Skill/Difficulty targeting) — if `availableQuestions` truly has zero Questions overall, `throw new Error('selectNextQuestion: no available questions')` (plain `Error`, no custom exception type exists yet in the domain layer — don't introduce one for this single case). Document the chosen interpretation in code comments and the Completion Notes.
  - [x] Zero imports from `@prisma/client`, `next`, `next-auth`, or any other external SDK/framework — only relative imports from `src/domain/`
- [x] Task 4: Install test framework (blocking — none exists yet)
  - [x] Add `vitest` as a devDependency (no test runner is currently installed in `package.json` — confirm this before starting; see Dev Notes) — **note:** repo is pnpm-managed (`pnpm-lock.yaml`/`pnpm-workspace.yaml`), not npm; installed via `pnpm add -D vitest`
  - [x] Add minimal `vitest.config.ts` (or reuse `tsconfig.json` paths for `@/*` alias) and an `npm test` script in `package.json`
  - [x] Do not install `jest` — Vitest is the lighter-weight, ESM/TS-native choice and avoids Next.js/Jest config friction; keep this scoped to test tooling only, no other package.json script changes
- [x] Task 5: Write unit tests (AC: #6)
  - [x] Create `src/domain/use-cases/adaptive-difficulty.test.ts` with ≥10 tests: no history (defaults to Difficulty Level 2), high accuracy (>0.80 → higher level), low accuracy (<0.50 → lower level), mixed Skills (multiple Skills at different accuracy tiers selected together), boundary exactly 0.80 (must NOT trigger the up-shift — confirm whether spec means strictly greater-than), boundary exactly 0.50 (must NOT trigger the down-shift), Grade Band containment (never returns a Question outside the profile's Grade Band), 5-question weighting proportion for a weak Skill, 5-question weighting proportion for a strong Skill, and the empty/fallback case as resolved in Task 3
  - [x] For the two weighting tests (proportional selection over a 5-question window), the algorithm is probabilistic — don't assert exact call-by-call output. Instead call `selectNextQuestion` many times (e.g. 200+ trials) with a fixed input and assert the observed selection *proportions* land within a tolerance band around the expected weighting, or inject a seeded/deterministic RNG into the implementation so trials are reproducible — pick whichever is simpler given how you implemented the weighted random pick in Task 3
- [x] Task 6: Verify layer purity and finalize
  - [x] Run `npm run lint` and a `tsc --noEmit` check to confirm no accidental Prisma/Next.js imports crept into `src/domain/`
  - [x] Run the new test suite and confirm all pass

### Review Findings

- [x] [Review][Defer] Difficulty target is anchored to a fixed baseline, not the Skill's prior level — Questions can never reach Difficulty Level 4 or 5 — `computeSkillTarget` always computes `targetLevel` as `DEFAULT_DIFFICULTY_LEVEL ± 1` (never 4 or 5), so `MIN_DIFFICULTY_LEVEL`/`MAX_DIFFICULTY_LEVEL` and `clampDifficultyLevel`'s outer bounds are effectively dead code — a consistently high-performing child is capped at level 3 forever [src/domain/use-cases/adaptive-difficulty.ts:39-44, src/domain/entities/skill-accuracy-window.ts] — deferred: the [1,3] range is accepted as the intended scope for this story; full 1–5 progression (tracking each Skill's last-presented level) is deferred to a later story/architecture change
- [x] [Review][Patch] Duplicate skillId entries in `skillAccuracyHistory` are silently deduped, discarding earlier data [src/domain/use-cases/adaptive-difficulty.ts:93] — fixed: throws on duplicate skillId entries, with a covering test
- [x] [Review][Patch] Probabilistic tests use unseeded `Math.random()` with no way to guarantee determinism — the 400-trial weighting test's `weakCount > strongCount` assertion could theoretically flake [src/domain/use-cases/adaptive-difficulty.test.ts, src/domain/use-cases/adaptive-difficulty.ts:53-65] — fixed: weighting test now mocks `Math.random` with a seeded PRNG (mulberry32), fully deterministic
- [x] [Review][Patch] No test covers a partial (< WINDOW_SIZE) answer window, where a single answer can swing accuracy to 0%/100% and trigger a level shift off a statistically tiny sample [src/domain/use-cases/adaptive-difficulty.test.ts, src/domain/use-cases/adaptive-difficulty.ts:35-37] — fixed: added a test documenting the current (no minimum-sample-size gate) behavior explicitly
- [x] [Review][Defer] `skillAccuracyHistory` entries for Skills entirely absent from `availableQuestions` can still be selected by the weighted pick, forcing an untargeted fallback — untested; best verified once Story 3.2's repository actually supplies this data [src/domain/use-cases/adaptive-difficulty.ts:93-106] — deferred, pre-existing gap in data-shape contract not yet exercised by a real caller
- [x] [Review][Defer] `SkillAccuracyWindow`'s "oldest first" ordering is a documented convention with no structural enforcement; `SessionAnswer` has no timestamp/sequence field to derive true order from — best addressed once Story 3.2 builds the actual construction path from DB rows [src/domain/entities/skill-accuracy-window.ts, src/domain/entities/session-answer.ts] — deferred, pre-existing gap, not exercised until 3.2

## Dev Notes

- **This is the first story of Epic 3 and the first story to touch `src/domain/`.** There is no previous story in this epic to inherit patterns from. `src/domain/use-cases/.gitkeep` and `src/domain/entities/.gitkeep` currently exist as empty placeholders — you are populating these directories for the first time.
- **`src/domain/constants.ts` already exists** with the three required constants pre-stubbed (`WINDOW_SIZE`, `ACCURACY_UP_THRESHOLD`, `ACCURACY_DOWN_THRESHOLD`) and a `// TODO: Full constants defined in Story 3.1` comment — read it before writing new code, don't recreate it from scratch.
- **No test framework is installed in this repo yet.** `package.json` has zero test-related dependencies or scripts. This was flagged as an open action item from Epic 2's retrospective ("Install a test framework (e.g. Vitest) so Story 3.1's 10+ unit-test AC has somewhere to land" — owner: Toan/Project Lead). Installing Vitest is now in scope for this story (Task 4) since the AC cannot otherwise be satisfied.
- **Architecture layer boundary (AD-2, AD-11 — non-negotiable):** `src/domain/` code must have zero imports from `@prisma/client`, `next`, `next-auth`, or any external SDK. It is the dependency sink of the architecture — nothing from Presentation, Application, or Infrastructure may leak in. This is enforced conceptually, not by a lint rule today, so self-check imports carefully.
- **Algorithm spec (AD-11, verbatim):** "Pure domain use case in `src/domain/use-cases/adaptive-difficulty.ts`. Signature: `selectNextQuestion(skillAccuracyHistory: SkillAccuracyWindow[], availableQuestions: Question[]): Question`. Zero external imports. Sliding window over last N=10 answered questions. `ACCURACY_UP_THRESHOLD=0.80`, `ACCURACY_DOWN_THRESHOLD=0.50`. Constants exported from `src/domain/constants.ts`."
- **Known spec ambiguity — flagged, not silently resolved:** PRD FR-7 describes the accuracy signal as *all-time cumulative* accuracy per Skill ("running accuracy (correct/total attempts) across all completed Sessions"), while AD-11 (architecture) specifies a *sliding window of the last N=10 answered questions*. These conflict. **AD-11 governs the code** per architecture precedence — implement the sliding-window version. Do not implement cumulative accuracy.
- **Downstream consumers depend on your interfaces:** Story 3.2 (Question & Session Repository Infrastructure) will implement `getSkillAccuracyHistory(childProfileId, skillId): Promise<SkillAccuracyWindow>` returning "the last `WINDOW_SIZE` completed answers for that Skill" — your `SkillAccuracyWindow` entity shape is the contract 3.2 must produce. Keep it simple and serializable (no class instances, no methods) since it will be constructed from DB rows in 3.2.
- **Grade Band containment:** Grade Band is one of `GRADE_1 | GRADE_2 | GRADE_3` (matches the Prisma `GradeBand` enum from Story 1.2 — mirror the same three values in the domain type, do not invent different casing/naming). `selectNextQuestion` must never return a Question whose `gradeBand` differs from what the caller passed in via `availableQuestions` — since Grade Band isn't an explicit parameter, this is enforced by only ever selecting from the given `availableQuestions` array (trust the caller pre-filtered it) plus a defensive check in tests.
- **Skill enumeration (context only, not required by this story):** four Skills exist in the domain — `pattern-recognition`, `spatial-reasoning`, `classification`, `word-problem` — every Question has exactly one `skillId`, never null. You don't need to hardcode these in the domain use case (Skills are data, seeded via Prisma in Story 7.5), just make sure the `Skill`/`SkillAccuracyWindow` types can represent any Skill by id.
- **Naming/style conventions (project-context.md):** kebab-case file names (`adaptive-difficulty.ts`, `skill-accuracy-window.ts`), PascalCase types/interfaces (`ChildProfile`, `SessionAnswer`), camelCase functions/variables, `cuid2` string IDs (never numeric/UUID — type all `id` fields as `string`), dates as ISO 8601 UTC strings in domain types (not `Date` objects, to stay serialization-agnostic and framework-free).
- **No real UI or DB work in this story** — this is 100% domain-layer, framework-free TypeScript plus unit tests. Do not add Prisma models, server actions, or components.

### Project Structure Notes

- Target files (new): `src/domain/entities/question.ts`, `skill.ts`, `child-profile.ts`, `session.ts`, `session-answer.ts`, `skill-accuracy-window.ts`, `src/domain/use-cases/adaptive-difficulty.ts`, `src/domain/use-cases/adaptive-difficulty.test.ts`
- Target files (modify): `src/domain/constants.ts` (remove stale TODO comment, add any new constants needed), `package.json` (add vitest + test script)
- New file (test config): `vitest.config.ts` at project root, reusing the `@/*` path alias already defined in `tsconfig.json`
- This story does not touch `src/app/`, `src/components/`, or `src/infrastructure/` — if your implementation needs to touch any of those, stop and reconsider; it's a sign the logic has leaked out of the domain layer.

### References

- [Source: _bmad-output/planning-artifacts/epics.md] — Epic 3 overview, Story 3.1 full AC text, cross-references from Stories 3.2, 1.2, 4.3, 7.4/7.5
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-11] — pure domain use case + sliding-window algorithm spec
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-2] — layer boundary rule (domain has zero external imports)
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-8] — difficulty-adjusted question selection
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-9] — skill weighting toward weak areas
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md] — Glossary: Grade Band, Difficulty Level, Skill, Question definitions
- [Source: _bmad-output/project-context.md#Domain Layer & Business Logic Rules] — algorithm constants and layer rules restated for AI agents
- [Source: src/domain/constants.ts] — existing constants stub to build on
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — Epic 2 retrospective action item on missing test framework

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `pnpm test` — 11/11 tests passed (`src/domain/use-cases/adaptive-difficulty.test.ts`)
- `pnpm lint` — no ESLint warnings or errors
- `npx tsc --noEmit` — no type errors

### Completion Notes List

- Implemented all 6 domain entity types plus `GradeBand` in `src/domain/entities/`; no barrel export added since no existing `index.ts` barrel pattern was found elsewhere in `src/`.
- Finalized `src/domain/constants.ts`: removed the stale TODO, kept the three pre-stubbed constants, added `DEFAULT_DIFFICULTY_LEVEL = 2`, `MIN_DIFFICULTY_LEVEL = 1`, `MAX_DIFFICULTY_LEVEL = 5`.
- `selectNextQuestion` derives, per Skill, a target Difficulty Level from `DEFAULT_DIFFICULTY_LEVEL` (2) shifted +1/-1 by the up/down accuracy thresholds (strict `>`/`<`, so exact 0.80/0.50 do not shift), clamped to [1, 5]. Skill selection is weighted by `(1 - accuracy) + 0.1` so weaker Skills are picked more often; a Skill with no history gets a neutral weight of 1.
- Grade Band containment is enforced defensively: the function asserts all of `availableQuestions` share one `gradeBand` (throwing if not) and only ever returns Questions drawn from that array — it does not filter by Grade Band itself, per the note in Task 3 that the caller is responsible for pre-filtering.
- Fallback interpretation (documented in code comments): "empty availableQuestions" in AC #6 is scoped to a single Skill/Difficulty-Level combination having zero matches, which falls back to a random pick across all of `availableQuestions`. A truly empty `availableQuestions` array throws `Error('selectNextQuestion: no available questions')`.
- **Deviation from story instructions:** the repo is pnpm-managed (`pnpm-lock.yaml`, `pnpm-workspace.yaml` present), not npm as the story tasks assumed. Installed vitest via `pnpm add -D vitest` instead of `npm install`; `package.json` still exposes an `npm test`-style script (`"test": "vitest run"`), runnable via `pnpm test`.
- Weighting tests use 400 trials and assert observed proportions (weak Skill count > strong Skill count) rather than a seeded RNG, per the Dev Notes' "pick whichever is simpler" guidance.
- Removed the now-obsolete `.gitkeep` placeholders from both `src/domain/entities/` and `src/domain/use-cases/` now that both directories are populated.

### File List

- `src/domain/entities/question.ts` (new)
- `src/domain/entities/skill.ts` (new)
- `src/domain/entities/child-profile.ts` (new)
- `src/domain/entities/session.ts` (new)
- `src/domain/entities/session-answer.ts` (new)
- `src/domain/entities/skill-accuracy-window.ts` (new)
- `src/domain/entities/.gitkeep` (deleted)
- `src/domain/use-cases/.gitkeep` (deleted)
- `src/domain/use-cases/adaptive-difficulty.ts` (new)
- `src/domain/use-cases/adaptive-difficulty.test.ts` (new)
- `src/domain/constants.ts` (modified)
- `vitest.config.ts` (new)
- `package.json` (modified — added `vitest` devDependency, `test` script)
- `pnpm-lock.yaml` (modified — vitest install)

## Change Log

- 2026-07-18: Implemented `selectNextQuestion` domain use case, domain entity types, finalized domain constants, installed Vitest via pnpm, and added 11 unit tests (all passing). Status moved to review.
- 2026-07-18: Code review complete. Decision-needed finding (difficulty capped at level 3) resolved: [1,3] range accepted for this story, full 1–5 progression deferred. 3 patch findings fixed (duplicate-skillId guard, seeded RNG for probabilistic tests, partial-window test coverage) — 13 tests passing, lint and `tsc --noEmit` clean. 2 findings deferred to Story 3.2. Status moved to done.
