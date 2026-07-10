---
baseline_commit: d04f690
---

# Story 1.2: Complete Prisma Schema & Database Infrastructure

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the full Prisma schema with all entities migrated to Supabase (Singapore),
So that all features have a ready, fully-relational data layer with no schema-blocking surprises in later epics.

> **Note (from epics.md):** All entities are created here because they are fully specified in the Architecture Spine with explicit relations; creating them all at once prevents inter-epic migration conflicts.

## Acceptance Criteria

1. **Given** `DATABASE_URL` and `DATABASE_URL_POOLED` point to a Supabase project in the Singapore region, **When** I run `prisma migrate dev --name init`, **Then** the migration succeeds and all tables exist in the database.
2. **And** `prisma/schema.prisma` defines all entities: `User`, `ParentAccount`, `ChildProfile`, `Subscription`, `TeacherAccount`, `Class`, `ClassMembership`, `Skill`, `Question`, `Session`, `SessionAnswer`, `AssignmentSet`, `AssignmentSetQuestion`, `GlobalConfig`.
3. **And** all primary keys use `@default(cuid())`; no UUID fields anywhere in the schema.
4. **And** all `DateTime` fields are stored as UTC.
5. **And** all relations are explicitly defined with referential actions; no implicit many-to-many.
6. **And** enums are defined: `Role` (PARENT, TEACHER, ADMIN), `GradeBand` (GRADE_1, GRADE_2, GRADE_3), `TeacherStatus` (PENDING, APPROVED, REJECTED), `SubscriptionStatus` (PENDING_PAYMENT, ACTIVE, EXPIRED, CANCELLED).
7. **And** `Question.difficultyLevel` is an `Int`; `Question.choices` is `Json`; `Question.imageUrl` is `String?` (nullable).
8. **And** the Prisma client singleton in `src/lib/db.ts` uses `DATABASE_URL_POOLED` (PgBouncer) for all runtime queries; `DATABASE_URL` is never imported in any `src/` file.
9. **And** `prisma migrate deploy` is added to the Vercel build command so migrations run automatically on production deploy.

## Tasks / Subtasks

- [x] **Task 1: Upgrade schema.prisma to full entity model** (AC: #2, #3, #4, #5, #6, #7)
  - [x] 1.1 — Replace the Story 1.1 stub `prisma/schema.prisma` with the complete schema (see Dev Notes → "Full Prisma Schema Draft"). Keep the existing `generator client` / `datasource db` blocks — only extend, do not restructure them.
  - [x] 1.2 — Add `directUrl = env("DATABASE_URL")` to the `datasource db` block alongside `url = env("DATABASE_URL_POOLED")` — this is the standard Prisma pattern for PgBouncer pooling (migrations use `directUrl`, runtime queries use `url`). This flips which var name goes in `url` vs the Story 1.1 stub — see the **Critical: datasource url vs directUrl** note below before touching this.
  - [x] 1.3 — Define all four enums exactly as named in AC #6.
  - [x] 1.4 — Define all 14 models listed in AC #2 with fields from the Dev Notes draft, explicit relations, and `onDelete` referential actions.
  - [x] 1.5 — Every model's `id` field: `id String @id @default(cuid())`. Grep the finished file for `@default(uuid())` or any `Uuid` type — must return zero matches.
  - [x] 1.6 — Every `DateTime` field has no explicit timezone handling needed (Postgres `timestamp` via Prisma is stored UTC by convention) — just confirm no `@db.Timestamptz` vs `@db.Timestamp` mixing; use the default Prisma `DateTime` mapping throughout.

- [x] **Task 2: Create Prisma client singleton** (AC: #8)
  - [x] 2.1 — Create `src/lib/db.ts` exporting a singleton `PrismaClient` using the standard Next.js dev-hot-reload-safe pattern (`globalThis` cache) — see Dev Notes for exact code.
  - [x] 2.2 — The singleton must NOT pass an explicit `datasourceUrl` referencing `env.DATABASE_URL` — rely on the schema's `url = env("DATABASE_URL_POOLED")` binding so Prisma Client uses the pooled connection automatically.
  - [x] 2.3 — Grep the entire `src/` tree for `DATABASE_URL` (excluding `DATABASE_URL_POOLED` matches) after this task — must return zero matches outside `src/lib/env.ts`.

- [x] **Task 3: Run initial migration** (AC: #1)
  - [x] 3.1 — Confirm `.env` (or `.env.local`) has `DATABASE_URL` and `DATABASE_URL_POOLED` pointing at a Supabase Singapore-region project (per Story 1.1 / AD-7 — do not create a project in another region).
  - [x] 3.2 — Run `pnpm prisma migrate dev --name init`.
  - [x] 3.3 — Verify all 14 tables exist via `pnpm prisma studio` or `\dt` in `psql`.
  - [x] 3.4 — Commit the generated `prisma/migrations/` folder — migrations are source-controlled, never gitignored.

- [x] **Task 4: Wire migrations into the Vercel build command** (AC: #9)
  - [x] 4.1 — Update the `build` script in `package.json` to run `prisma migrate deploy && next build` (or add a `"vercel-build"` script if the team prefers keeping local `build` migration-free — pick one and document the choice in Completion Notes).
  - [x] 4.2 — Do NOT use `prisma migrate dev` in any build script — `migrate dev` prompts interactively and can drop data; only `migrate deploy` is safe for CI/production.
  - [x] 4.3 — Confirm `DATABASE_URL` (direct) is available as a Vercel env var at build time, since `migrate deploy` needs the direct connection, not the pooled one.

- [x] **Task 5: Seed-readiness check (no seed content yet — Story 3.2/7.5 own that)**
  - [x] 5.1 — Confirm `prisma/seed.ts` (stub from Story 1.1) still compiles against the new schema — it should still be an empty/no-op main function; do not add `Skill`/`Question` seed logic in this story.

- [x] **Task 6: Build & lint verification**
  - [x] 6.1 — Run `pnpm prisma generate` and confirm zero errors.
  - [x] 6.2 — Run `pnpm build` — zero TypeScript strict-mode errors.
  - [x] 6.3 — Confirm all new/changed file names are kebab-case (`db.ts` is already kebab-case as a single word).

## Dev Notes

### Critical: `datasource url` vs `directUrl` — read before editing schema.prisma

The Story 1.1 stub schema currently has:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")   // <- migrations-only var, sitting in `url` for now
}
```
This story must flip it to the standard Prisma PgBouncer pattern:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL_POOLED")  // runtime queries (Prisma Client) — PgBouncer
  directUrl = env("DATABASE_URL")         // `prisma migrate` / `prisma db seed` only
}
```
This is not a deviation from AD-3 — it is the correct implementation of it. Prisma Client always connects via `url`; `prisma migrate`/`db seed` automatically use `directUrl` when present. Getting this backwards means either migrations fail against PgBouncer (transaction-mode pooling doesn't support the advisory locks `migrate` needs) or runtime queries exhaust the direct connection pool on Vercel serverless — exactly the failure AD-3 exists to prevent.

### Prisma version already pinned — do not upgrade in this story

`package.json` has `prisma` and `@prisma/client` pinned to `^5.22.0` (Architecture Spine's stack table says "Prisma 6", but Story 1.1's dev agent downgraded to 5.22 because Prisma 7 dropped the `url = env(...)` datasource syntax this schema depends on). Stay on 5.22.x for this story — do not `pnpm add prisma@latest`. If you hit a Prisma 5.22 limitation implementing this schema, flag it in Completion Notes rather than silently upgrading.

### Full Prisma Schema Draft

The Architecture Spine's ER diagram (ARCHITECTURE-SPINE.md → "Core entity relationships") gives field names but omits some types/constraints needed for a real migration. The draft below fills those gaps by cross-referencing every FR that touches each entity. Treat field names/types as authoritative; treat cardinality notes marked "**judgment call**" as things to confirm against your own read of the FRs — they're flagged, not hidden.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL_POOLED")
  directUrl = env("DATABASE_URL")
}

enum Role {
  PARENT
  TEACHER
  ADMIN
}

enum GradeBand {
  GRADE_1
  GRADE_2
  GRADE_3
}

enum TeacherStatus {
  PENDING
  APPROVED
  REJECTED
}

enum SubscriptionStatus {
  PENDING_PAYMENT
  ACTIVE
  EXPIRED
  CANCELLED
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  passwordHash  String?        // null for Google-OAuth-only Parent accounts
  role          Role
  emailVerified DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  parentAccount  ParentAccount?
  teacherAccount TeacherAccount?
}

model ParentAccount {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  childProfiles ChildProfile[]
  subscription  Subscription?
}

model ChildProfile {
  id              String    @id @default(cuid())
  parentAccountId String
  parentAccount   ParentAccount @relation(fields: [parentAccountId], references: [id], onDelete: Cascade)
  name            String
  gradeBand       GradeBand
  deletedAt       DateTime? // soft delete — 30-day retention per FR-11; hard-delete via scheduled job, not in this story's scope
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  sessions          Session[]
  classMemberships  ClassMembership[]
}

model Subscription {
  id              String             @id @default(cuid())
  parentAccountId String             @unique // one Subscription per ParentAccount, applies to all its ChildProfiles (FR-24)
  parentAccount   ParentAccount      @relation(fields: [parentAccountId], references: [id], onDelete: Cascade)
  status          SubscriptionStatus
  renewsAt        DateTime?
  cancelledAt     DateTime?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}

model TeacherAccount {
  id          String        @id @default(cuid())
  userId      String        @unique
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  schoolName  String
  gradeTaught GradeBand
  status      TeacherStatus @default(PENDING)
  rejectedReason String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  classes        Class[]
  assignmentSets AssignmentSet[]
}

model Class {
  id               String   @id @default(cuid())
  teacherAccountId String
  teacherAccount   TeacherAccount @relation(fields: [teacherAccountId], references: [id], onDelete: Cascade)
  name             String
  gradeBand        GradeBand
  joinCode         String   @unique // system-generated, short, human-enterable (FR-19)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  memberships    ClassMembership[]
  assignmentSets AssignmentSet[]
}

model ClassMembership {
  id             String       @id @default(cuid())
  classId        String
  class          Class        @relation(fields: [classId], references: [id], onDelete: Cascade)
  childProfileId String
  childProfile   ChildProfile @relation(fields: [childProfileId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())

  // judgment call: FR-19 says "at most one Class per Teacher Account" for a given Child Profile —
  // NOT "at most one Class total". A child could join classes from two different teachers.
  // This unique constraint enforces "one Class per (childProfile, teacherAccount)" via the Class's owning teacher.
  // If product intent is actually "one Class, period" simplify to @@unique([childProfileId]) instead — confirm before building the join-code redemption flow in Epic 5.
  @@unique([classId, childProfileId])
}

model Skill {
  id        String   @id @default(cuid())
  code      String   @unique // upsert key — see epics.md "v1 Skill Enumeration"; seeded in Story 7.5, not this story
  name      String   // Vietnamese display name — duplicated into src/locales/vi/skills.ts per epics.md, DB copy is for joins/admin only
  createdAt DateTime @default(now())

  questions Question[]
}

model Question {
  id              String    @id @default(cuid())
  prompt          String
  imageUrl        String?   // fully-qualified Supabase CDN URL or null — never a relative path (AD-13)
  choices         Json      // array of 2-4 choice strings/objects
  correctAnswer   String
  skillId         String
  skill           Skill     @relation(fields: [skillId], references: [id], onDelete: Restrict)
  gradeBand       GradeBand
  difficultyLevel Int       // 1-5, enforce range in application layer (domain), not DB constraint
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  sessionAnswers          SessionAnswer[]
  assignmentSetQuestions  AssignmentSetQuestion[]

  @@index([gradeBand, skillId, difficultyLevel]) // hot path for getQuestionsForSession (Story 3.2)
}

model Session {
  id             String    @id @default(cuid())
  childProfileId String
  childProfile   ChildProfile @relation(fields: [childProfileId], references: [id], onDelete: Cascade)
  questionCount  Int
  correctCount   Int       @default(0)
  startedAt      DateTime  @default(now())
  completedAt    DateTime? // null = in-progress/abandoned; only completed Sessions count toward accuracy (FR-7)

  answers SessionAnswer[]

  @@index([childProfileId, completedAt])
}

model SessionAnswer {
  id                      String   @id @default(cuid())
  sessionId               String
  session                 Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  questionId              String
  question                Question @relation(fields: [questionId], references: [id], onDelete: Restrict)
  answeredCorrectly        Boolean?  // null = stub row not yet answered (createSession pre-creates stubs per Story 3.2 AC)
  difficultyLevelAtAnswer  Int?
  answeredAt               DateTime?

  @@index([questionId])
}

model AssignmentSet {
  id               String    @id @default(cuid())
  teacherAccountId String
  teacherAccount   TeacherAccount @relation(fields: [teacherAccountId], references: [id], onDelete: Cascade)
  classId          String
  class            Class     @relation(fields: [classId], references: [id], onDelete: Cascade)
  title            String
  dueAt            DateTime?
  assignedAt       DateTime? // null = draft (per FR-20 "saved as draft until explicitly assigned")
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  questions AssignmentSetQuestion[]
}

model AssignmentSetQuestion {
  id              String        @id @default(cuid())
  assignmentSetId String
  assignmentSet   AssignmentSet @relation(fields: [assignmentSetId], references: [id], onDelete: Cascade)
  questionId      String
  question        Question      @relation(fields: [questionId], references: [id], onDelete: Restrict)

  @@unique([assignmentSetId, questionId])
}

model GlobalConfig {
  id        String   @id @default(cuid())
  key       String   @unique // e.g. "FREE_TIER_DAILY_ALLOTMENT", "SESSION_QUESTION_COUNT", "SESSION_TIME_LIMIT_MINUTES"
  value     String   // stored as string, parsed by consumer (Int/bool as needed) — keeps GlobalConfig schema-agnostic across FR-5/FR-27 keys
  updatedAt DateTime @updatedAt
}
```

**Notes on judgment calls left in the draft above (confirm during implementation, don't silently reinterpret):**
- `User.passwordHash` nullable: Google-OAuth Parent accounts (AD-4) never set a password; Teacher/Admin accounts (email/password only) always will. Don't make it required.
- `ClassMembership` uniqueness: see inline comment — FR-19's exact wording supports one-class-per-teacher, not a global one-class cap. Flagged for confirmation at Epic 5 build time, not blocking for this story.
- `SessionAnswer` fields nullable (`answeredCorrectly`, `difficultyLevelAtAnswer`, `answeredAt`): Story 3.2's `createSession` AC says it "creates a Session record and associated SessionAnswer stubs" — meaning rows exist before an answer is recorded. Model them nullable now so Story 3.2 doesn't need a schema change.
- `GlobalConfig.value` as `String`: keeps one schema-agnostic table for both `FREE_TIER_DAILY_ALLOTMENT` (Int) and future non-numeric config, consistent with how FR-5 and FR-27 both reference "GlobalConfig" generically without implying separate tables.

### `src/lib/db.ts` — Prisma Client Singleton (exact pattern)

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```
This is the standard Next.js dev-mode pattern that prevents hot-reload from spawning a new `PrismaClient` (and new connection pool) on every file save. No `datasourceUrl` override needed — `PrismaClient` reads `url` from the generated schema, which now points at `DATABASE_URL_POOLED`.

### Architecture Compliance

- **AD-3** (two connection strings): implemented via `url`/`directUrl` split above — this is the entire point of this story.
- **AD-2** (layer boundaries): `src/lib/db.ts` is Infrastructure-adjacent but lives in `src/lib/` per the Story 1.1 structure (matches `src/lib/auth.ts`, `src/lib/env.ts` precedent) — repositories in `src/infrastructure/repositories/*` (Story 3.2+) will import `db` from here, never instantiate their own `PrismaClient`.
- **Consistency convention** (Prisma schema): one schema file, all relations explicit — the draft above has zero implicit many-to-many; every join (`ClassMembership`, `AssignmentSetQuestion`) is an explicit model.
- Do not add `src/domain/` imports of `@prisma/client` — domain stays pure per AD-2; this story only touches `prisma/`, `src/lib/db.ts`, `package.json`, `vercel.json`/build config.

### Project Structure Notes

- Files touched: `prisma/schema.prisma` (rewrite), `prisma/migrations/*` (new, generated — commit it), `src/lib/db.ts` (new), `package.json` (build script), possibly `vercel.json` if the build command is set there instead of `package.json`.
- No changes to any `src/app/`, `src/components/`, or `src/domain/` files in this story — this is pure data-layer infrastructure.
- Do not touch `src/lib/env.ts` — it already validates both `DATABASE_URL` and `DATABASE_URL_POOLED` (Story 1.1); no schema changes needed there.

### Previous Story Intelligence (Story 1.1)

- Prisma pinned at `^5.22.0` for both `prisma` and `@prisma/client` — **do not upgrade**; Prisma 7 dropped the `url = env(...)` syntax this schema needs, and the team explicitly chose to stay on 5.22 rather than rewrite around it.
- `package.json` already has `"postinstall": "prisma generate 2>/dev/null || echo 'prisma generate skipped (no models yet)'"` — once real models exist in this story, `prisma generate` will succeed normally; no change needed to that script, but verify it stops silently swallowing errors once you add real models (temporarily run `pnpm prisma generate` directly to see real errors, not the `2>/dev/null`-suppressed postinstall).
- `package.json` already has `"prisma": { "seed": "tsx prisma/seed.ts" }` and `tsx` in devDependencies — seeding infra is ready; this story does not need to touch it.
- Story 1.1's review found and fixed a stray private Next.js type import in `child-profile-cookie.ts` — not relevant to this story, but a reminder that this codebase's review process is strict about implementation shortcuts; don't take similar shortcuts with `directUrl`/pooling.
- No `src/lib/db.ts` exists yet — this story creates it for the first time; there is nothing to preserve/merge, just create it per the pattern above.

### Testing Standards

- No existing test framework was set up in Story 1.1 (none mentioned in its File List or Completion Notes). This story has no explicit test AC — verification is via `prisma migrate dev` succeeding and `pnpm build` passing. Do not introduce a test framework as a side effect of this story; that's out of scope.
- Manual verification checklist for Dev Agent Record: migration applied cleanly, all 14 tables visible via `prisma studio`, `pnpm build` zero errors, grep confirms no `DATABASE_URL` (bare) usage outside `env.ts`, grep confirms no `uuid()` defaults.

### References

- Story requirements: [epics.md](../_bmad-output/planning-artifacts/epics.md) — "Story 1.2: Complete Prisma Schema & Database Infrastructure"
- Architecture ER diagram: [ARCHITECTURE-SPINE.md#core-entity-relationships](../_bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md)
- AD-3 (two Prisma connection strings): [ARCHITECTURE-SPINE.md#ad-3](../_bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md)
- AD-7 (Vercel + Supabase Singapore region): [ARCHITECTURE-SPINE.md#ad-7](../_bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md)
- Project context (IDs, dates, DB rules): [project-context.md](../_bmad-output/project-context.md)
- Previous story (Prisma stub, package.json state): [1-1-initialize-nextjs-monorepo-design-system-foundation.md](./1-1-initialize-nextjs-monorepo-design-system-foundation.md)
- Downstream consumers of this schema: Story 3.2 (`question-repository.ts`, `session-repository.ts`), Story 7.5 (Skill/Question seed fixtures)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `pnpm prisma migrate dev --name init` initially failed with P1012 (`DATABASE_URL` not found) because Prisma CLI auto-loads `.env`, not `.env.local`. Fixed by copying `.env.local` → `.env` (both gitignored) so the CLI picks it up — matches the story's "`.env` (or `.env.local`)" allowance.
- Migration then failed with P1001 (`Can't reach database server at db.<ref>.supabase.co:5432`) — DNS resolution of the direct Supabase host failed entirely (`Test-NetConnection` confirmed no A record; this Supabase project has no IPv4 add-on, so the direct host is IPv6-only). Root-caused with the user and fixed by pointing `DATABASE_URL` (the `directUrl` used only by `prisma migrate`/`prisma db seed`) at the Supavisor pooler in **session mode** (`aws-0-ap-southeast-1.pooler.supabase.com:5432`) instead of the direct host — confirmed IPv4-reachable via `Test-NetConnection`. `DATABASE_URL_POOLED` (transaction mode, port 6543) was already correct and unchanged. This is a documented Supabase workaround for networks without IPv6 egress; does not violate AD-3 (the two-connection-string split), it only changes which literal host `directUrl` resolves against.
- `pnpm prisma migrate dev --name init` then applied cleanly: 1 migration created (`20260710000411_init`), 14 `CREATE TABLE` statements confirmed via grep.
- `pnpm build` (`prisma migrate deploy && next build`) ran clean end-to-end: "No pending migrations to apply", compiled successfully, 16/16 static pages generated, zero TypeScript errors.

### Completion Notes List

- Full 14-model schema, 4 enums, and all explicit relations/referential actions implemented per the Dev Notes draft with no field-level deviations.
- `directUrl`/`url` split implemented exactly as specified in AC #8/Dev Notes; verified zero bare `DATABASE_URL` references in `src/` outside `src/lib/env.ts`.
- Chose `"build": "prisma migrate deploy && next build"` in `package.json` (over a separate `vercel-build` script) so the same command works identically in local `pnpm build` and on Vercel — no divergent build paths to maintain.
- Task 4.3 (confirm `DATABASE_URL` is set as a Vercel env var at build time) is an infrastructure/dashboard action outside this repo's scope — flagging for the user to configure in Vercel Project Settings → Environment Variables before the first production deploy. Per the debug-log finding above, the Vercel `DATABASE_URL` value should use the **session-mode pooler URL** (`...pooler.supabase.com:5432`), not the direct `db.<ref>.supabase.co` host, unless/until the Supabase project's IPv4 add-on is purchased.
- Prisma stayed pinned at `^5.22.0` per the Story 1.1 note; the CLI's "5.22.0 → 7.8.0 available" upgrade nudge was intentionally ignored.
- No test framework exists in this repo (confirmed, matches Dev Notes) — verification was via `prisma migrate dev`/`deploy` succeeding, `pnpm build` passing with zero errors, and the grep checks specified in Tasks 1.5 and 2.3.

### File List

- `prisma/schema.prisma` (rewritten — full 14-model schema, 4 enums, `directUrl`/`url` split; review fix: `ClassMembership.teacherAccountId`)
- `prisma/migrations/20260710000411_init/migration.sql` (new — generated by `prisma migrate dev`)
- `prisma/migrations/migration_lock.toml` (new — generated by `prisma migrate dev`)
- `prisma/migrations/20260710072848_class_membership_teacher_scope/migration.sql` (new — review fix, applied)
- `src/lib/db.ts` (new — Prisma Client singleton)
- `package.json` (`build` script updated to `prisma migrate deploy && next build`; review fix: `postinstall` message cleanup)

### Review Findings

- [x] [Review][Patch] Stale `postinstall` fallback message no longer applies now that 13 real models exist [package.json:10] — fixed, message removed
- [x] [Review][Patch] `ClassMembership` unique constraint didn't enforce its own stated intent ("one Class per Teacher Account") — added `teacherAccountId` (denormalized from `Class.teacherAccountId`) + `@@unique([teacherAccountId, childProfileId])`, replacing `@@unique([classId, childProfileId])` [prisma/schema.prisma:114-127] — fixed via migration `20260710072848_class_membership_teacher_scope`, applied and verified with `prisma migrate status` (no drift) and `pnpm build` (clean)
- [x] [Review][Defer] `DATABASE_URL` (direct) resolves to a shared Supavisor session-mode pooler rather than a true direct connection — accepted as a documented workaround for now (see Debug Log References); revisit if the Supabase IPv4 add-on is purchased [prisma/schema.prisma:5-9] — deferred, pre-existing (Story 1.1/1.2 network constraint)
- [x] [Review][Defer] No unique constraint on `SessionAnswer(sessionId, questionId)` — duplicate stub rows possible once Story 3.2's `createSession` writes begin [prisma/schema.prisma:171-182] — deferred, out of scope (Story 3.2 owns this write path)
- [x] [Review][Defer] `SessionAnswer` partial-state consistency not enforced (`answeredCorrectly`/`answeredAt`/`difficultyLevelAtAnswer` can be set independently) [prisma/schema.prisma:171-182] — deferred, out of scope (Story 3.2 owns this write path)
- [x] [Review][Defer] `Session.correctCount` has no DB-level check that it stays `<= questionCount` [prisma/schema.prisma:157-169] — deferred, pre-existing pattern (domain-layer invariant enforcement, consistent with rest of schema)
- [x] [Review][Defer] No DB-level UTC enforcement for `DateTime` columns (enforced by convention only) [prisma/migrations/20260710000411_init/migration.sql] — deferred, pre-existing pattern
- [x] [Review][Defer] `User.role` has no DB-level tie to which account relation (`parentAccount`/`teacherAccount`) actually exists [prisma/schema.prisma:36-47] — deferred, pre-existing pattern (app-layer validation, no polymorphic constraint support in Prisma)
- [x] [Review][Defer] `GlobalConfig` ships with no seed/bootstrap step for keys like `FREE_TIER_DAILY_ALLOTMENT` [prisma/schema.prisma:303-308] — deferred, out of scope (this story's Task 5 scopes seed content to Skill/Question only, owned by Story 3.2/7.5)
- [x] [Review][Defer] `onDelete: Restrict` on Question's relations blocks deleting Questions/Skills with historical answers, no archival path [prisma/schema.prisma:239,270,298] — deferred, out of scope (content moderation, Epic 7)
- [x] [Review][Defer] `TeacherAccount` has `rejectedReason` but no `approvedAt`/`approvedBy` — asymmetric audit trail [prisma/schema.prisma:179-192] — deferred, out of scope (Epic 5/7 teacher-approval stories)
- [x] [Review][Defer] `Class.joinCode` has no length/format constraint at the DB level [prisma/schema.prisma:194-206] — deferred, out of scope (Epic 5 join-code generation/redemption)
- [x] [Review][Defer] `PrismaClient` singleton unsupported on Edge runtime if ever imported there [src/lib/db.ts:1-9] — deferred, not reachable today (zero `runtime = 'edge'` routes in repo)
- [x] [Review][Defer] Running `prisma migrate deploy` inside `next build` means local `pnpm build` runs real migrations against whatever DB is configured locally [package.json:7] — deferred, documented deliberate tradeoff (Completion Notes)

## Change Log

- 2026-07-10 — Implemented full Prisma schema (14 models, 4 enums), Prisma Client singleton, initial migration against Supabase (Singapore), and wired `prisma migrate deploy` into the build command. Status → review.
- 2026-07-10 — Code review: fixed stale `postinstall` message and `ClassMembership` teacher-scoping constraint (new migration `20260710072848_class_membership_teacher_scope`, applied). 11 items deferred (see Review Findings). Status → done.
