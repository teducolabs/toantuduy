---
baseline_commit: 7a6d6a4
---

# Story 3.2: Question & Session Repository Infrastructure

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Prisma-backed repositories for Questions and Sessions plus a minimal question seed,
so that the practice flow has data to work with from the first dev run.

## Acceptance Criteria

1. **Given** `src/infrastructure/repositories/question-repository.ts` exists, **when** `getQuestionsForSession({ gradeBand, skillIds?, difficultyLevel? })` is called, **then** it returns `Question[]` (the domain type from `src/domain/entities/question.ts`, not the raw Prisma model) filtered by Grade Band (and optionally Skill and Difficulty Level) using `DATABASE_URL_POOLED`.
2. `src/infrastructure/repositories/session-repository.ts` exports:
   - `createSession(childProfileId: string, questionIds: string[]): Promise<Session>` — creates a `Session` record and one `SessionAnswer` stub row per question ID (in a single transaction), returns the domain `Session` type
   - `recordAnswer(sessionAnswerId: string, answeredCorrectly: boolean, difficultyLevelAtAnswer: number): Promise<void>` — updates one `SessionAnswer` (sets `answeredCorrectly`, `difficultyLevelAtAnswer`, `answeredAt`)
   - `completeSession(sessionId: string): Promise<Session>` — sets `Session.completedAt`, computes `correctCount` from the session's answered `SessionAnswer` rows, returns the domain `Session` type
   - `getSkillAccuracyHistory(childProfileId: string, skillId: string): Promise<SkillAccuracyWindow>` — returns the last `WINDOW_SIZE` (from `src/domain/constants.ts`) completed answers for that Skill, **oldest first**, sourced only from `SessionAnswer` rows belonging to completed Sessions (`Session.completedAt IS NOT NULL`) for the given Child Profile
3. `prisma/fixtures/` contains at least one JSON fixture file with ≥ 3 Questions per `GradeBand × Skill × difficultyLevel` combination (3 Grade Bands × 4 Skills × 5 Difficulty Levels = 60 cells → **≥ 180 Questions minimum**; this is the dev/test seed only — the full corpus ships in Epic 7 Story 7.5).
4. `prisma/seed.ts` loads all fixture JSON files and upserts `Skill` records (by `code`, per the v1 Skill Enumeration) and `Question` records; running `pnpm db:seed` (or `prisma db seed`) twice in a row completes without errors and without duplicating Question rows.
5. `GlobalConfig` is bootstrapped by the seed with default keys `FREE_TIER_DAILY_ALLOTMENT` = `"5"` and `SESSION_QUESTION_COUNT` = `"10"` (upserted by `key`, idempotent) — these are the two keys Story 3.3 reads at runtime; do not invent additional keys not yet consumed by any story.
6. `SessionAnswer` gains a `@@unique([sessionId, questionId])` constraint in `prisma/schema.prisma`, applied via a new Prisma migration — this was an open action item from the Epic 2 retrospective, explicitly assigned to this story.
7. No repository file contains business logic; repositories accept/return domain types only (`Question`, `Session`, `SessionAnswer`, `SkillAccuracyWindow` from `src/domain/entities/`) — no domain use cases are imported into infrastructure, and no `@prisma/client` types leak out of the repository files (AD-2).

## Tasks / Subtasks

- [x] Task 1: Schema change — SessionAnswer unique constraint (AC: #6)
  - [x] Add `@@unique([sessionId, questionId])` to the `SessionAnswer` model in `prisma/schema.prisma`
  - [x] Run `prisma migrate dev --name session_answer_unique_constraint` (or similarly descriptive name) against the dev DB; confirm it applies cleanly given existing data (table is currently empty in all envs, so no backfill/conflict handling needed)
- [x] Task 2: Question repository (AC: #1, #7)
  - [x] Create `src/infrastructure/repositories/question-repository.ts` exporting `getQuestionsForSession({ gradeBand, skillIds, difficultyLevel }: { gradeBand: GradeBand; skillIds?: string[]; difficultyLevel?: number })`
  - [x] Query via `db.question.findMany` using `@@index([gradeBand, skillId, difficultyLevel])` (already defined in schema for this hot path) — filter by `gradeBand` always, `skillId: { in: skillIds }` when provided, `difficultyLevel` when provided
  - [x] Map each Prisma `Question` row to the domain `Question` type (`id, prompt, imageUrl, choices, correctAnswer, skillId, gradeBand, difficultyLevel`) before returning — do not return the raw Prisma row
- [x] Task 3: Session repository (AC: #2, #7)
  - [x] Create `src/infrastructure/repositories/session-repository.ts`
  - [x] `createSession`: use `db.$transaction` to create one `Session` (with `questionCount: questionIds.length`) and one `SessionAnswer` stub (`answeredCorrectly: null`, `difficultyLevelAtAnswer: null`, `answeredAt: null`) per `questionId`, then map and return the domain `Session`
  - [x] `recordAnswer`: `db.sessionAnswer.update` setting `answeredCorrectly`, `difficultyLevelAtAnswer`, and `answeredAt: new Date()`
  - [x] `completeSession`: in a transaction, count `SessionAnswer` rows for the session where `answeredCorrectly: true`, then update `Session.completedAt = new Date()` and `Session.correctCount` to that count; return the mapped domain `Session`
  - [x] `getSkillAccuracyHistory`: query `SessionAnswer` joined through `Session` and `Question`, filtered to `session.childProfileId`, `session.completedAt: { not: null }`, `question.skillId`, `answeredCorrectly: { not: null }`; order by `answeredAt: 'asc'`; take the last `WINDOW_SIZE` (i.e. order ascending and slice the tail, or order descending-take-then-reverse — either is fine as long as the returned `answers: boolean[]` ends up oldest-first per the `SkillAccuracyWindow` doc comment); map to `{ skillId, answers: boolean[] }`
  - [x] Write small private mapping helpers (e.g. `toDomainSession`, `toDomainSessionAnswer`) rather than inlining `{...prismaRow, completedAt: prismaRow.completedAt?.toISOString() ?? null}` repeatedly — domain `Session.completedAt` is `string | null` (ISO 8601), while Prisma's is a `Date | null`; the mapping must convert this
- [x] Task 4: Question fixtures + seed extension (AC: #3, #4)
  - [x] Design a fixture JSON shape (e.g. `{ skillCode, gradeBand, difficultyLevel, prompt, imageUrl, choices, correctAnswer }[]`) and write ≥180 Question entries across all 60 `GradeBand × Skill × difficultyLevel` cells (≥3 each) into one or more files under `prisma/fixtures/` (`.gitkeep` currently the only file there — remove it once real fixtures exist)
  - [x] **Resolve the idempotency gap yourself and document your choice in Completion Notes:** `Question.id` is a generated `cuid()` with no natural business key in the schema, so a plain `upsert` isn't directly possible. Pick one approach: (a) add a stable fixture-only marker field you can safely match on before deciding it's out of scope, or (b) scope seeding to delete-then-recreate only the Questions previously inserted by this seed script (e.g. tag them, or simply `deleteMany` all Questions before recreating — acceptable here since this is dev/test-only fixture data, not production content per AD-12). Do not silently accumulate duplicate Questions on repeated seed runs.
  - [x] Extend the existing `prisma/seed.ts` (do not replace the existing dev-account seeding logic added in Epic 1/2) — add a `seedSkills()` step that upserts the 4 v1 Skills by `code` (`pattern-recognition`, `spatial-reasoning`, `classification`, `word-problem` — Vietnamese names per epics.md's "v1 Skill Enumeration" table) before questions, and a `seedQuestions()` step reading the fixture files
  - [x] Keep the existing `NODE_ENV === 'production'` guard covering the whole `main()` — do not scope it to only the account-seeding part
- [x] Task 5: GlobalConfig bootstrap (AC: #5)
  - [x] In `prisma/seed.ts`, upsert `GlobalConfig` rows by `key`: `FREE_TIER_DAILY_ALLOTMENT` → `"5"`, `SESSION_QUESTION_COUNT` → `"10"`
- [x] Task 6: Layer purity verification (AC: #7)
  - [x] Confirm neither repository file imports from `src/domain/use-cases/` — only from `src/domain/entities/` (types) and `@prisma/client` / `@/lib/db` (Prisma access)
  - [x] Run `pnpm lint` and `npx tsc --noEmit`; both must be clean

### Review Findings

- [x] [Review][Patch] Reseed `deleteMany` on Question conflicts with FK Restrict [prisma/seed.ts:seedQuestions] — fixed: `seedQuestions()` now deletes dependent `SessionAnswer` and `AssignmentSetQuestion` rows before `db.question.deleteMany({})`, so reseeding wipes dev/test session data instead of throwing a Postgres FK-restrict violation (P2003).
- [x] [Review][Patch] `getQuestionsForSession` treats an empty `skillIds` array as a real filter [src/infrastructure/repositories/question-repository.ts:31] — fixed: condition changed to `skillIds && skillIds.length > 0`, so an empty array no longer silently filters to zero results.
- [x] [Review][Patch] Stale schema comment contradicts this story's own seeding [prisma/schema.prisma:131] — fixed: comment updated to reflect that Skills are seeded in this story (Story 7.5 seeds the full Question corpus, not Skills).
- [x] [Review][Defer] `createSession` doesn't expose per-question `SessionAnswer` ids that `recordAnswer` requires [src/infrastructure/repositories/session-repository.ts:17-34] — deferred, pre-existing spec design (AC #2 signatures are locked as specified); Story 3.3 will need a way to look up a `SessionAnswer.id` by `(sessionId, questionId)` before it can call `recordAnswer` — no such lookup exists yet in either repository.
- [x] [Review][Defer] `completeSession` doesn't verify all stub answers are filled before marking `completedAt` [src/infrastructure/repositories/session-repository.ts:47-58] — deferred, pre-existing; whether early/partial completion is allowed is a business-policy decision that belongs in a future use-case/server-action layer (AD-2), not this story's repository.

## Dev Notes

- **Architecture layer boundary (AD-2):** Infrastructure repositories may import `@prisma/client` and domain **entity types** — they must never import a domain **use case** (e.g. `adaptive-difficulty.ts`). Business logic (the adaptive selection algorithm) stays in Story 3.1's use case; this story is pure data access + mapping.
- **Existing repository precedent does NOT fully apply here — read before copying:** `src/infrastructure/repositories/child-profile-repository.ts` (from Epic 2) returns raw Prisma types (`import type { ChildProfile } from '@prisma/client'`) directly to callers. **Do not copy that pattern for this story.** AC #7 and the epics.md text ("repositories import domain types only") require `question-repository.ts` and `session-repository.ts` to map Prisma rows into the `Question`/`Session`/`SessionAnswer`/`SkillAccuracyWindow` shapes defined in `src/domain/entities/` (created in Story 3.1). This is a deliberate divergence for the entities that Story 3.1's domain use case consumes directly — it needs framework-free shapes, and `ChildProfile`'s repository has no such consumer.
- **Type mapping gotchas (Prisma → domain):**
  - Domain `Session.completedAt` is `string | null` (ISO 8601); Prisma's is `Date | null`. Convert with `.toISOString()`.
  - Domain `SessionAnswer.answeredCorrectly` is a non-nullable `boolean`; the Prisma column is nullable (`Boolean?`) because `createSession` pre-creates unanswered stub rows. Only map rows where `answeredCorrectly !== null` into the domain shape — an unanswered stub is not a valid domain `SessionAnswer` yet.
  - Domain `Question.choices` is typed `unknown` (matches Prisma `Json` — no cast needed beyond that).
- **`getSkillAccuracyHistory` resolves a gap Story 3.1 explicitly deferred to you:** Story 3.1's review findings flagged that `SkillAccuracyWindow`'s "oldest first" ordering had no structural enforcement and no field to derive true order from. The schema already has `SessionAnswer.answeredAt` (added when the schema was written) — use it to order rows before slicing to `WINDOW_SIZE`. Get the ordering right; Story 3.1's `selectNextQuestion` trusts the array order it's given.
- **Two open action items from the Epic 1/2 retrospectives are explicitly assigned to this story** (see `_bmad-output/implementation-artifacts/sprint-status.yaml` → `action_items`): the `SessionAnswer(sessionId, questionId)` unique constraint (Task 1 / AC #6) and owning the `GlobalConfig` bootstrap (Task 5 / AC #5). Both are folded into this story's AC above — they are not optional extras.
- **GlobalConfig scope is deliberately narrow:** only seed `FREE_TIER_DAILY_ALLOTMENT` and `SESSION_QUESTION_COUNT` — these are the two keys Story 3.3 (Session Start & Free Tier Daily Gate) reads. `SESSION_TIME_LIMIT_MINUTES` (FR-27) has no consumer until Epic 7's admin config story (7.3); don't invent a representation for "disabled" on a key nothing reads yet.
- **No repository-level business logic:** `question-repository.ts` and `session-repository.ts` are pure data access + type mapping. The adaptive difficulty *selection* itself (which Question to pick) is Story 3.1's `selectNextQuestion` — this story only supplies the data (`availableQuestions` via `getQuestionsForSession`, `skillAccuracyHistory` via `getSkillAccuracyHistory`) that a future story (3.3+) will wire together in a server action. Do not call `selectNextQuestion` from within these repository files.
- **No UI, server actions, or session-start flow in this story.** `src/app/`, `src/components/` are out of scope — Story 3.3 wires these repositories into the actual session-start server action.
- **Testing:** no automated-test AC is specified for this story (unlike 3.1). Vitest is now installed (Story 3.1) if you want to unit-test pure mapping helpers (e.g. extract `toDomainSession(row)` and test it with a plain object, no DB needed) — optional, not required to mark this story done. Full DB integration tests are out of scope.
- **Naming/style conventions (project-context.md):** kebab-case files, PascalCase types, camelCase functions, `cuid2` string IDs, ISO 8601 UTC date strings at domain boundaries.
- **Seed script name is already wired:** `package.json` has `"db:seed": "tsx prisma/seed.ts"` and a `"prisma": { "seed": "tsx prisma/seed.ts" }` block — running `pnpm db:seed` or `npx prisma db seed` both work already; don't add a new script.
- **Installed Prisma version is `^5.22.0`**, not the `6` listed in the Architecture Spine's Stack table — this is a pre-existing Epic 1 discrepancy, not something to fix in this story; nothing in this story's scope depends on Prisma-6-only features.

### Previous Story Intelligence (Story 3.1)

- Story 3.1 created `src/domain/entities/` (all six domain types) and `src/domain/constants.ts` — this story consumes those types and constants, it does not redefine them.
- Story 3.1 deferred two findings specifically pending this story's work: (1) whether Skills present in `skillAccuracyHistory` but absent from `availableQuestions` cause an untargeted fallback — worth keeping in mind once you wire real data through, but not an AC here; (2) the `SkillAccuracyWindow` ordering gap, resolved above via `answeredAt`.
- Vitest is installed and configured (`vitest.config.ts`, `pnpm test` runs `vitest run`) — reuse it, don't install another test runner.
- Repo is **pnpm-managed** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) — use `pnpm`, not `npm`, for installs; existing scripts are still named `test`/etc. in `package.json` for convention compatibility.

### Git Intelligence

- Most recent commit (`7a6d6a4`) implemented Story 3.1's domain layer — `src/domain/entities/*.ts`, `src/domain/use-cases/adaptive-difficulty.ts`, and `src/domain/constants.ts` now exist and are stable; treat them as a fixed contract for this story.
- `src/infrastructure/repositories/child-profile-repository.ts` (Epic 2) is the only existing repository file — it establishes the file-per-aggregate convention and the `db.$transaction` pattern for compound updates (see `updateChildProfile`, `softDeleteChildProfile`), but returns raw Prisma types (see Dev Notes above for why this story diverges).
- `prisma/seed.ts` currently only seeds five dev/test auth accounts (parent, 3 teacher states, admin) behind a `NODE_ENV === 'production'` guard — extend it, don't replace its existing behavior.
- The most recent migration is `20260710072848_class_membership_teacher_scope`; your new migration for the `SessionAnswer` unique constraint will be the next one chronologically.

### Project Structure Notes

- New files: `src/infrastructure/repositories/question-repository.ts`, `src/infrastructure/repositories/session-repository.ts`, `prisma/fixtures/*.json` (replacing the `.gitkeep` placeholder), one new file under `prisma/migrations/`.
- Modified files: `prisma/schema.prisma` (unique constraint), `prisma/seed.ts` (Skill/Question/GlobalConfig seeding added).
- Matches the Architecture Spine's `src/infrastructure/repositories/` structural seed exactly (`question-repository.ts`, `session-repository.ts` are named entries in the source tree listing).
- Do not touch `src/app/`, `src/components/`, or `src/domain/` in this story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2: Question & Session Repository Infrastructure] — full AC text
- [Source: _bmad-output/planning-artifacts/epics.md#v1 Skill Enumeration] — Skill code/name/category table, seeding rules
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-2] — layer boundary rule
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-11] — adaptive difficulty consumer contract (SkillAccuracyWindow, Question shapes)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-12] — seed script + fixtures rule
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#Structural Seed] — repositories/, fixtures/ directory listing
- [Source: prisma/schema.prisma] — `Question`, `Session`, `SessionAnswer`, `GlobalConfig` models; `@@index([gradeBand, skillId, difficultyLevel])` hot-path index already in place
- [Source: src/domain/entities/*.ts, src/domain/constants.ts] — domain type contracts this story must produce/consume (Story 3.1)
- [Source: src/infrastructure/repositories/child-profile-repository.ts] — existing repository pattern (transaction usage; return-type divergence noted in Dev Notes)
- [Source: prisma/seed.ts] — existing seed script to extend
- [Source: _bmad-output/implementation-artifacts/3-1-adaptive-difficulty-domain-use-case.md] — previous story, deferred findings, domain contract rationale
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml#action_items] — SessionAnswer unique constraint + GlobalConfig bootstrap action items assigned to this story
- [Source: _bmad-output/project-context.md] — naming/style conventions, layer rules restated for AI agents

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npx prisma migrate dev` refused to run non-interactively in this environment ("Prisma Migrate has detected that the environment is non-interactive"), including with `--create-only`. Worked around by generating the exact SQL diff via `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script`, hand-creating the timestamped migration folder (`20260718144244_session_answer_unique_constraint`) with that SQL, then applying it with `prisma migrate deploy` (non-interactive-safe). Verified with `prisma migrate status` → "Database schema is up to date!".
- `npx prisma generate` fails with `EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp... -> query_engine-windows.dll.node` — some other running process on this machine holds the query engine binary locked. Retried 3x, same result. Not schema-blocking: the `@@unique` addition adds no new fields/types the existing generated client would need, and the seed script + full test suite both ran successfully against the live DB with the currently-generated client, confirming no functional impact. Flagged for the user to re-run `npx prisma generate` after closing any stray `next dev`/node processes.

### Completion Notes List

- **Idempotency approach (Task 4 gap, AC #4):** chose option (b) from the story's guidance — `seedQuestions()` calls `db.question.deleteMany({})` before recreating all fixture rows on every seed run, since `Question.id` (cuid) has no natural business key to upsert on and this is dev/test-only fixture data (not production content, per AD-12). Verified idempotent by running `pnpm db:seed` twice in a row: both runs succeeded with no errors, and a direct DB count after both runs showed exactly 180 Questions, 4 Skills, 2 GlobalConfig rows (no duplication).
- Generated 180 Question fixtures (60 `GradeBand × Skill × difficultyLevel` cells × 3 each) programmatically via a one-off script (not committed) into `prisma/fixtures/questions.json`, matching the fixture shape specified in the story (`skillCode, gradeBand, difficultyLevel, prompt, imageUrl, choices, correctAnswer`). Verified no duplicate choices and every `correctAnswer` present in its `choices` array before seeding.
- Both repository files return only domain types (`Question`, `Session`, `SkillAccuracyWindow`) via private `toDomainQuestion`/`toDomainSession` mapping helpers; Prisma types (`@prisma/client`) are imported only as the raw-row input to those mappers, never re-exported. Confirmed neither file imports from `src/domain/use-cases/`.
- `getSkillAccuracyHistory` orders by `answeredAt: 'desc'` with `take: WINDOW_SIZE` then `.reverse()`s the slice, so the returned `answers` array is oldest-first as required — this is more efficient than an ascending order without a bound, since it lets the DB do the "last N" trim rather than fetching the whole history.
- `pnpm lint`, `npx tsc --noEmit`, and `pnpm test` (13 tests, all passing, Story 3.1's domain suite) all ran clean with no regressions.
- No UI, server actions, or use-case wiring were touched, per the story's explicit scope boundary — Story 3.3 will wire these repositories together.

### File List

- `prisma/schema.prisma` (modified — `@@unique([sessionId, questionId])` on `SessionAnswer`)
- `prisma/migrations/20260718144244_session_answer_unique_constraint/migration.sql` (new)
- `prisma/seed.ts` (modified — added `seedSkills()`, `seedQuestions()`, `seedGlobalConfig()`, wired into `main()`)
- `prisma/fixtures/questions.json` (new — 180 Question fixtures)
- `prisma/fixtures/.gitkeep` (deleted — replaced by real fixture data)
- `src/infrastructure/repositories/question-repository.ts` (new)
- `src/infrastructure/repositories/session-repository.ts` (new)

## Change Log

- 2026-07-18: Implemented Question & Session repository infrastructure — `SessionAnswer` unique constraint + migration, `question-repository.ts`, `session-repository.ts`, 180-row question fixture corpus, extended `prisma/seed.ts` (Skills, Questions, GlobalConfig). All tasks complete, lint/tsc/tests clean.
