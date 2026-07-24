---
baseline_commit: 0db8dfe
---

# Story 5.5: Assign to Class & Student Assignment Card

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an approved teacher,
I want to assign an Assignment Set to one or more Classes so enrolled students see it on their home screen,
so that my students receive targeted practice as a named option.

## Acceptance Criteria

1. **Given** I have a Draft Assignment Set and proceed to Step 3, **when** I select one or more Classes and confirm, **then** the `AssignmentSet` is linked to those Classes; students in those Classes see the assignment card on their student home on next load (FR-21).
2. **Given** a Class already has an active Assignment Set, **when** I try to assign another, **then** a confirmation dialog: "Lớp này đã có bộ bài tập đang giao. Thay thế?" — confirming replaces the active set (FR-21).
3. **Given** a Child Profile is in a Class with an active Assignment Set, **when** the student home loads, **then** a second `student-home-card` renders below the primary CTA showing: assignment name, teacher display name, and due date if set (FR-6, UX-DR13).
4. **And** completing the Assignment Set records a `Session` against the `ChildProfile`; assigned Questions count toward the Free Tier daily allotment (A-1, FR-6).
5. **And** only the owning Teacher Account can assign or replace Assignment Sets for their Classes (AD-6).

## Design Decisions (resolved during story creation — do not re-litigate)

These close gaps between the ACs and the current schema/spine. Implement exactly as stated.

- **D1 — Multi-class with single `classId` (spine ERD keeps `AssignmentSet.classId`):** assigning a draft to N classes assigns the draft row to the FIRST selected class (`classId`, `assignedAt = now`) and creates N−1 **clones** (same `title`/`gradeBand`/`dueAt`/`teacherAccountId`/question join rows, own `classId`, same `assignedAt`) in ONE `$transaction`. One assigned set row ↔ exactly one class. This keeps the Story 5.6 Class Report (per class, per set) and per-class replacement trivially correct. Do NOT add an `AssignmentSetClass` join table.
- **D2 — Active set & replacement:** add `replacedAt DateTime?` to `AssignmentSet`. Active set for a class = `{ classId, assignedAt: { not: null }, replacedAt: null }` (invariant A-6: at most one). Replace = set `replacedAt = now()` on the class's current active set inside the same assign transaction. Replaced sets are NEVER deleted or reverted to draft (5.6 report history). Status derivation on cards becomes: `assignedAt === null` → draft; `replacedAt !== null` → replaced ("Đã thay thế"); else assigned ("Đã giao").
- **D3 — Session↔Assignment link:** add `Session.assignmentSetId String?` (FK → AssignmentSet, `onDelete: SetNull`) + back-relation. Story 5.6's completion status = exists Session where `{ assignmentSetId, childProfileId, completedAt: { not: null } }`. Without this column 5.6 is unimplementable.
- **D4 — Teacher display name is currently DROPPED at registration (latent bug this story must fix):** `src/app/register/teacher/actions.ts` validates `name` (zod line 9) but the `tx.teacherAccount.create` (lines 52–59) never stores it — there is no name column on `User` or `TeacherAccount`. Add `TeacherAccount.fullName String?` (nullable — existing dev rows have no name), persist it at registration, and the student card shows `fullName ?? schoolName` as the teacher display name.
- **D5 — Assigning existing drafts:** 5.4 drafts must not be dead ends. The draft `assignment-set-card` gains a "Giao bài" button opening an `AssignSetDialog` (class picker + confirm). The builder's Step 3 gains the same class picker + a "Giao bài" CTA (create draft → assign in sequence; if assign fails the set remains a normal draft — teacher retries from its card). Do NOT build full "reopen builder to edit draft" — still a follow-up.
- **D6 — Replace confirmation is server-driven:** `assignAssignmentSetAction` takes `confirmReplace: boolean`. With `false` and ≥1 target class having an active set → `{ error: { code: 'CLASS_HAS_ACTIVE_SET', ... } }` (no mutation). Client shows the AlertDialog and re-calls with `true`. No pre-flight conflict fetch; no client-side conflict guessing.
- **D7 — Student card & gate:** assignment card(s) render below the primary card ONLY when the free-tier gate is NOT blocked (EXPERIENCE.md line 174: "Assignment Set CTA also hidden if allotment is zero"). A child in classes from multiple teachers (A-5 allows this) can have several active assignments — render one card per active assignment, ordered `assignedAt desc`. Partial allotment behaves exactly like normal sessions today (binary exhausted check — no per-question budgeting). Re-taking a completed assignment is allowed (no completed-state styling in 5.5).
- **D8 — Assignment session = fixed question list, no adaptive selection:** the set's `AssignmentSetQuestion.questionId`s (deterministic `orderBy: { id: 'asc' }`) go straight into the existing `createSession` — do NOT call `selectSessionQuestionIds`/`selectNextQuestion`. Play/answer/complete/summary flows are reused untouched.

## Tasks / Subtasks

- [x] Task 1: Prisma migration — assignment linkage columns (AC: #1, #2, #3, #4; D2, D3, D4)
  - [x] 1.1 `prisma/schema.prisma`: add `replacedAt DateTime? // non-null = superseded by a newer set for the same class (D2); active = assignedAt set AND replacedAt null` to `AssignmentSet`; add `sessions Session[]` back-relation to `AssignmentSet`; add to `Session`: `assignmentSetId String?` + `assignmentSet AssignmentSet? @relation(fields: [assignmentSetId], references: [id], onDelete: SetNull)`; add `fullName String? // teacher display name; nullable because pre-5.5 rows never stored it (D4)` to `TeacherAccount`. Add `@@index([classId, assignedAt])` to `AssignmentSet` (active-set lookup from student home). Touch NOTHING else.
  - [x] 1.2 `npx prisma migrate dev --name assignment_assign_support` (direct `DATABASE_URL`, never pooled; Prisma CLI does not auto-load `.env.local` — source it first, see 5.4 debug log) + `npx prisma generate`. All columns nullable → no backfill needed.
  - [x] 1.3 Fix D4: in `src/app/register/teacher/actions.ts` persist `fullName: parsed.data.name` in `tx.teacherAccount.create`; update the payload assertion in `src/app/register/teacher/actions.test.ts` (line ~43).

- [x] Task 2: Repository — assign + student-side reads (AC: #1, #2, #3; D1, D2)
  - [x] 2.1 Extend `src/infrastructure/repositories/assignment-set-repository.ts`:
    - `findDraftSetForTeacher(assignmentSetId, teacherAccountId)` — `findFirst where { id, teacherAccountId, assignedAt: null }`, include `questions: { select: { questionId: true } }` (ownership + draft check in one query).
    - `findActiveSetsForClasses(classIds: string[])` — `findMany where { classId: { in }, assignedAt: { not: null }, replacedAt: null }`, select `id, classId, title` (conflict detection).
    - `assignSetToClasses(assignmentSetId, classIds, questionIds)` — ONE `db.$transaction`: (a) `updateMany` set `replacedAt: now` on active sets of ALL target classes; (b) `update` the draft: `classId: classIds[0]`, `assignedAt: now` (same `new Date()` instance throughout); (c) for each remaining classId, `create` a clone (copy `teacherAccountId`, `title`, `gradeBand`, `dueAt`, `classId`, `assignedAt`, nested `questions: { create: questionIds.map(...) }`). Read the draft's fields inside the transaction (or pass them in) — do not race a separate read.
    - `getActiveAssignmentsForChild(childProfileId)` — memberships → active sets: `db.assignmentSet.findMany({ where: { assignedAt: { not: null }, replacedAt: null, class: { memberships: { some: { childProfileId } } } }, orderBy: { assignedAt: 'desc' }, select: { id, title, dueAt, teacherAccount: { select: { fullName: true, schoolName: true } } } })`.
    - `findStartableAssignmentForChild(assignmentSetId, childProfileId)` — same active+membership `where` plus `id`, include `questions: { select: { questionId: true }, orderBy: { id: 'asc' } }` (authorization for session start, D8 ordering).
  - [x] 2.2 Extend `listAssignmentSetsForTeacher`'s return type: it already includes `class: { name }`; add `replacedAt` passthrough is automatic (full model) — no query change needed, just use the field.
  - [x] 2.3 Extend `src/infrastructure/repositories/class-repository.ts` `listClassesForTeacher`: add `assignmentSets: { where: { assignedAt: { not: null }, replacedAt: null }, select: { title: true }, take: 1 }` to the include, extend `ClassWithStudentCount` accordingly (class-card pill data — 5.4 explicitly deferred this swap to 5.5).
  - [x] 2.4 Extend `src/infrastructure/repositories/session-repository.ts` `createSession(childProfileId, questionIds, assignmentSetId?: string)` — thread `assignmentSetId` into `session.create` data (undefined for normal sessions). Existing callers unchanged.

- [x] Task 3: Teacher server action — assign (AC: #1, #2, #5; D1, D6)
  - [x] 3.1 In `src/app/(teacher)/assignments/actions.ts` add `assignAssignmentSetAction(input: { assignmentSetId: string; classIds: string[]; confirmReplace: boolean })`. Flow: `requireTeacherAccountId()` (import stays from `../classes/actions` — do NOT duplicate the AD-6 gate) → zod `safeParse` (assignmentSetId min 1; classIds array of min-1 strings, `.min(1)`; confirmReplace boolean) → dedupe classIds → `findDraftSetForTeacher` else `{ error: { code: 'SET_NOT_FOUND' } }` (covers not-owned AND already-assigned) → verify ALL classIds belong to this teacher (`db.class.count({ where: { id: { in }, teacherAccountId } })` via a small class-repo helper `countClassesForTeacher(classIds, teacherAccountId)`; mismatch → `INVALID_CLASSES`) → `findActiveSetsForClasses`; if non-empty and `!confirmReplace` → `{ error: { code: 'CLASS_HAS_ACTIVE_SET', message: ... } }` → `assignSetToClasses` (try/catch → `ASSIGN_FAILED`) → `revalidatePath('/classes')` + `revalidatePath('/assignments')` → `{ data: { assignedClassCount: classIds.length } }`.
  - [x] 3.2 Return shape stays `{ data } | { error: { code, message } }`, never throws. No new guard logic anywhere.

- [x] Task 4: Teacher UI — class picker, builder Step 3, draft card, class-card pill (AC: #1, #2; D5, D6)
  - [x] 4.1 Pure helpers in `src/components/teacher/assignment-builder-state.ts` (+ tests): `toggleClassSelection(selectedIds, id)` (no cap), `canAssign(selectedClassCount)` (≥ 1). Follow the existing helper style in that file.
  - [x] 4.2 New `src/components/teacher/assign-class-picker.tsx` — presentational client component: checkbox rows of the teacher's classes (reuse `src/components/ui/checkbox.tsx` + the whole-row `<label>` pattern from `question-library-row.tsx`, 44px min height), each row: class name + `profiles.gradeBandLabels[gradeBand]` + student count. Props: `classes`, `selectedIds`, `onToggle`. Empty-classes state: text `assignments.noClassesToAssign` (teacher has 0 classes → assign impossible, only "Lưu nháp" remains meaningful).
  - [x] 4.3 Builder Step 3 (`src/components/teacher/assignment-set-builder.tsx`): keep summary + "Lưu nháp" exactly as-is; add the class picker below the summary + a primary "Giao bài" CTA (enabled when `canAssign` and not submitting; "Lưu nháp" becomes `variant="outline"`). "Giao bài" flow: `createAssignmentSetDraftAction` → on success `assignAssignmentSetAction({ assignmentSetId, classIds, confirmReplace: false })` → on `CLASS_HAS_ACTIVE_SET` open the replace `AlertDialog` (see 4.5) → confirm re-calls with `confirmReplace: true`. Keep the created draft id in state so retries/confirm NEVER create a second draft. On final success: close + reset (revalidate refreshes cards). All failures: inline error, Sheet stays open, state preserved (UX-DR15 — same contract as 5.4).
  - [x] 4.4 New `src/components/teacher/assign-set-dialog.tsx` — `'use client'`; a `Dialog` (exists: `src/components/ui/dialog.tsx`) opened from a "Giao bài" button on DRAFT cards only. Props: `assignmentSetId`, `classes`. Contains the same `AssignClassPicker` + confirm CTA + the replace AlertDialog + inline error/retry. Calls `assignAssignmentSetAction` directly (set already exists). Reset state on close (mirror `create-class-dialog.tsx` `handleOpenChange`).
  - [x] 4.5 Replace confirmation: `AlertDialog` (exists: `src/components/ui/alert-dialog.tsx`) with body `assignments.replaceConfirmBody` = "Lớp này đã có bộ bài tập đang giao. Thay thế?" (EXACT string per AC #2), confirm "Thay thế" / cancel "Hủy".
  - [x] 4.6 `src/components/teacher/assignment-set-card.tsx`: extend status derivation per D2 (`replacedAt` prop): draft → "Bản nháp" + "Giao bài" button (renders `AssignSetDialog`); assigned → "Đã giao" and show `class.name`; replaced → "Đã thay thế". Card itself stays non-navigating (report link is 5.6).
  - [x] 4.7 `src/components/teacher/class-card.tsx`: replace the hardcoded `classes.noAssignmentPill` with data: prop `activeAssignmentTitle: string | null` → pill shows the title (truncated) when present else `noAssignmentPill`. Wire from `listClassesForTeacher` in `src/app/(teacher)/classes/page.tsx`.
  - [x] 4.8 Pages: `src/app/(teacher)/classes/page.tsx` and `src/app/(teacher)/assignments/page.tsx` must pass the teacher's classes (name, gradeBand, studentCount, id) into the builder and into each draft card's dialog. `/assignments` page currently fetches no classes — reuse `getClassesAction()` from `../classes/actions` (server-side, AD-8; check its exact name/shape before wiring). Preserve the 5.3 no-classes empty state on `/classes` exactly as 5.4 did.

- [x] Task 5: Student home — assignment card (AC: #3; D7)
  - [x] 5.1 New server read in `src/app/(student)/actions.ts`: `getActiveAssignmentsState(childProfileId)` → maps `getActiveAssignmentsForChild` to `{ id, title, teacherName: fullName ?? schoolName, dueAt: Date | null }[]`. (It's a server-side data loader like `getSessionStartGateState` — root page is a Server Component.)
  - [x] 5.2 New `src/components/student/assignment-card.tsx` — student-surface card below the primary CTA: `Card` with `rounded-brand-xl` (student surface radii), visually distinct from the orange primary card (e.g. white/card bg with orange accent — primary orange stays reserved for the main CTA). Shows: assignment `title`, `student.assignmentFrom(teacherName)`, and if `dueAt` set `student.assignmentDue(day, month)` ("Hạn: {d}/{m}" style, Vietnamese short date like the teacher side). Start button: min-h-16 like `SessionStartButton`, client child component `assignment-start-button.tsx` mirroring `session-start-button.tsx` exactly (useTransition, toast on error, `router.push('/session/{id}')`) but calling `startAssignmentSessionAction(assignmentSetId)`.
  - [x] 5.3 `src/app/page.tsx` (RootPage — the student home; there is NO separate (student) home page): fetch `gateState` and assignments once; render assignment cards (0..n, `assignedAt desc` order comes from the repo) below the primary card in every branch where `gateState.blocked === false`; when blocked, `FreeTierGateCard` only (D7). Keep the in-progress-resume branch's primary card behavior untouched — assignment cards may render below it (starting one abandons the in-progress session via existing `abandonPreviousSessions`, consistent with `startSessionAction`).
  - [x] 5.4 All strings in `src/locales/vi/student.ts` — NO inline Vietnamese (UX-DR18). Baloo 2 stays reserved for display headlines; card text is Be Vietnam Pro (default).

- [x] Task 6: Student server action — start assignment session (AC: #4; D7, D8)
  - [x] 6.1 In `src/app/(student)/actions.ts` add `startAssignmentSessionAction(assignmentSetId: string)`, mirroring `startSessionAction` (lines 22–47) step-for-step: `getChildProfileId(await headers())` → `findChildProfileById` → `findStartableAssignmentForChild(assignmentSetId, childProfile.id)` else `{ error: { code: 'ASSIGNMENT_NOT_AVAILABLE' } }` (covers: not active, replaced, child not a member — one code, no information leak) → `isAllotmentExhausted(childProfile.id, childProfile.parentAccountId)` → `ALLOTMENT_EXHAUSTED` (same code/message as `startSessionAction` so the toast copy matches) → `abandonPreviousSessions` → `createSession(childProfile.id, questionIds, assignmentSetId)` with the set's ordered questionIds (D8) → `{ data: { sessionId } }`.
  - [x] 6.2 NOTHING else changes in the student flow: `/session/[sessionId]` play, `submitAnswerAction`, `completeSessionAction`, summary — all reused as-is. AC #4 holds automatically: completion sets `Session.completedAt` (a Session against the ChildProfile, now carrying `assignmentSetId`), and every answer writes `SessionAnswer.answeredAt`, which `countQuestionsAnsweredToday` already counts toward the allotment (A-1). Verify this chain in the code trace, do not add new counting logic.

- [x] Task 7: Locale strings (all ACs)
  - [x] 7.1 `src/locales/vi/assignments.ts` additions: Step-3 assign section label ("Giao cho lớp"), `assignCta: 'Giao bài'`, `noClassesToAssign`, `replaceConfirmTitle`, `replaceConfirmBody: 'Lớp này đã có bộ bài tập đang giao. Thay thế?'`, `replaceConfirmCta: 'Thay thế'`, `cancelCta: 'Hủy'`, `replacedPill: 'Đã thay thế'`, assigned-with-class display, error messages for `SET_NOT_FOUND`, `INVALID_CLASSES`, `ASSIGN_FAILED`, assign-success behavior needs no toast (cards refresh via revalidate; if a toast is used, string lives here).
  - [x] 7.2 `src/locales/vi/student.ts` additions: assignment card heading/CTA (e.g. `startAssignmentCta`), `assignmentFrom: (teacherName) => ...`, `assignmentDue: (day, month) => ...`. Follow the existing arrow-function-member pattern.
  - [x] 7.3 `src/locales/vi/classes.ts`: keep `noAssignmentPill`; no change unless a label for the active-title pill is needed.

- [x] Task 8: Tests (all ACs)
  - [x] 8.1 `src/app/(teacher)/assignments/actions.test.ts` — extend with `assignAssignmentSetAction`: **non-negotiable AD-6 matrix (no session / wrong role / no TeacherAccount row / PENDING / REJECTED — all rejected)**; validation (empty classIds); `SET_NOT_FOUND` for foreign/assigned set; `INVALID_CLASSES` when a classId isn't the teacher's (mock `db.class.count` short); `CLASS_HAS_ACTIVE_SET` when conflicts exist and `confirmReplace: false` — assert NO mutation calls; happy path single class (draft updated with classId + assignedAt, no clones); multi-class (clones created with copied fields + nested questions); replace path (`updateMany` replacedAt on conflicting sets). Mock pattern: inline `vi.mock('@/lib/auth')`, `vi.mock('@/lib/db')`, `vi.mock('next/cache')` — copy the existing file's setup; `$transaction` mock must invoke its callback with the tx mock (see existing register/teacher test for the pattern).
  - [x] 8.2 `src/infrastructure/repositories/assignment-set-repository.test.ts` — extend: `getActiveAssignmentsForChild` where-shape (membership + active filters, order, teacherAccount select), `findStartableAssignmentForChild` (ordered questions include), `assignSetToClasses` transaction sequence.
  - [x] 8.3 `src/app/(student)/actions.test.ts` (extend existing if present, else follow the (teacher) test conventions): `startAssignmentSessionAction` — no cookie → error; `ASSIGNMENT_NOT_AVAILABLE`; `ALLOTMENT_EXHAUSTED` (mock exhausted); happy path asserts `createSession` called with the set's questionIds in `id asc` order AND the `assignmentSetId`, and `abandonPreviousSessions` called first.
  - [x] 8.4 `assignment-builder-state.test.ts` — `toggleClassSelection`, `canAssign`.
  - [x] 8.5 Registration fix regression: `src/app/register/teacher/actions.test.ts` payload now includes `fullName`.
  - [x] 8.6 Full gate before done: `npx vitest run` (**185 green at baseline — all must pass plus new**), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build`. Migration folder exists under `prisma/migrations/`.
  - [x] 8.7 Live browser verification if possible; otherwise the established fallback (build + full unit coverage + explicit end-to-end code trace: draft card/builder → assign action → repo transaction → student home read → start action → createSession → play/complete → allotment count) stated plainly in Completion Notes. Manual QA still needs an APPROVED teacher via direct DB update until 7.2.

## Dev Notes

### Current state of files being modified (read them before editing)

- `src/app/page.tsx` (RootPage, 51 lines) — IS the student home. Three render branches: resume (active session), gate-blocked (`FreeTierGateCard`), start (`StudentHomeCard`). Data via `resolveActiveChildProfile` → `getActiveSessionState` → `getSessionStartGateState`. Preserve: the redirect logic for non-PARENT roles and the greeting/`ExitToDashboardLink` wrapper.
- `src/app/(student)/actions.ts` — `startSessionAction` (lines 22–47) is the template for the new assignment start action: cookie → profile → gate → abandon → create. `getSessionStartGateState` (53–63), `getActiveSessionState` (68–77). Server actions here trust the signed child-profile cookie (`getChildProfileId(await headers())` from `src/lib/child-profile-cookie.ts`) — NOT the NextAuth JWT.
- `src/infrastructure/repositories/session-repository.ts` — `createSession(childProfileId, questionIds)` (lines 17–34): `$transaction` creating Session + stub `SessionAnswer` rows (`answeredAt: null`). `countQuestionsAnsweredToday` (115–123) counts SessionAnswers with `answeredAt` in the VN-day window (UTC+7) — this is the allotment counter; assignment answers flow through it with zero changes. `findActiveSession` filters `completedAt: null, abandonedAt: null`.
- `src/infrastructure/repositories/subscription-repository.ts` — `isAllotmentExhausted` (13–22): active subscription bypasses; else `countQuestionsAnsweredToday >= getFreeTierDailyAllotment()` (GlobalConfig `FREE_TIER_DAILY_ALLOTMENT`, default 5).
- `src/app/(teacher)/assignments/actions.ts` — 4 actions from 5.4; all begin `requireTeacherAccountId()` imported from `../classes/actions`. Zod v4 `safeParse` + first-issue message convention. `revalidatePath('/classes')` + `revalidatePath('/assignments')` after mutations.
- `src/infrastructure/repositories/assignment-set-repository.ts` — `createAssignmentSetDraft` (nested atomic create), `listAssignmentSetsForTeacher` (includes `_count.questions`, `class.name` — already 5.5-ready).
- `src/components/teacher/assignment-set-builder.tsx` (357 lines) — 3-step controlled Sheet; ALL state mounted across steps; reset only in `handleOpenChange(false)`; Step 3 = summary `dl` + "Lưu nháp". Extend, don't restructure: add picker + CTA to the `step === 3` block; keep `handleSaveDraft` intact and add `handleAssign` alongside.
- `src/components/teacher/assignment-set-card.tsx` — props `{ title, gradeBand, questionCount, assignedAt }`; comment says "Story 5.5 extends this derivation". Add `replacedAt`, `assignmentSetId`, `className`, and the dialog trigger for drafts.
- `src/components/teacher/class-card.tsx` — pill hardcodes `classes.noAssignmentPill` (line 29); 5.4 scope wall explicitly says "the pill's data source only changes in 5.5". This is that change.
- `src/app/register/teacher/actions.ts` — see D4; smallest possible diff: one field in the create + schema column.
- `prisma/schema.prisma` — `AssignmentSet` (lines ~186–200) already has `classId String?`, `gradeBand`, `assignedAt DateTime?` from 5.4. `Session` (~157–170), `TeacherAccount` (~85–99), `ClassMembership` has denormalized `teacherAccountId` + `@@unique([teacherAccountId, childProfileId])` (A-5 enforced in DB).

### Architecture guardrails

- **Layers (AD-2):** components never import `@/lib/db`/`@prisma/client` values/repositories — data flows page → actions → repository. `@prisma/client` TYPE imports in components are the established exception (`GradeBand` in cards).
- **AD-6:** every teacher action starts with `requireTeacherAccountId()`; additionally scope every query by `teacherAccountId` (ownership = AC #5). Student actions authorize via cookie + membership check — a student can only start sets active for a class they belong to.
- **Action contract:** `{ data: T } | { error: { code, message } }`, never throw (try/catch Prisma paths).
- **AD-8:** student home data via Server Component on load ("on next load" in AC #1 — no push, no polling, no extra revalidate for `/` needed; RootPage is dynamic via `auth()`/`headers()`).
- **Transactions:** replace + assign + clones MUST be one `$transaction` (D1/D2) — a partial assign that replaced the old set but failed to assign the new one would strand a class with nothing.
- **Dates:** `dueAt` is UTC `DateTime`; student card displays Vietnamese short form (day/month) like the teacher side; never English date strings.
- **IDs:** cuid via `@default(cuid())`; no UUID, no nanoid.

### UX guardrails

- Student surface: warm cream bg (`bg-student-bg` wrapper exists), radii `rounded-brand-lg/xl`, min 44×44 touch targets, start button min-h-16 (match `SessionStartButton`). The assignment card is VISUALLY DISTINCT from the primary orange card (UX-DR13: "named option", not a second identical CTA) — card bg + orange accent, primary orange reserved for the main CTA.
- Teacher surface: dense action-forward microcopy ("Giao bài", "Thay thế", "Hủy"); `rounded-brand-sm` cards, `rounded-brand-md` Sheet — unchanged from 5.4.
- Replace dialog copy is EXACTLY "Lớp này đã có bộ bài tập đang giao. Thay thế?" (AC #2).
- Failures inside Sheet/Dialog: inline error + retry, state preserved, never auto-close (UX-DR15).
- A11y (UX-DR17/19): labels via `useId`, `aria-describedby` on errors, `role="alert"`, whole-row label toggles for class checkboxes, Esc closes dialogs (Base UI default).

### What NOT to build (scope walls)

- **Class Report, report links from cards, "Completed" status pill, completion aggregates** → Story 5.6 (D3's column is the only 5.6 prep).
- **Offline toast, keyboard-nav hardening pass, approval-gate E2E hardening** → Story 5.7 (basic a11y IS in scope).
- **Draft editing / reopen-builder-to-edit** — still a follow-up; only "assign existing draft" lands (D5).
- **Unassign/withdraw an active set** — not in any AC; replacement is the only lifecycle transition.
- **Completed-assignment state on student card, per-question allotment budgeting, grade-band matching between set and child/class** — not specced (D7).
- **No `AssignmentSetClass` join table, no status enum, no `Class.activeAssignmentSetId` pointer** — D1/D2 are the decided shapes.
- **No new dependencies. No domain-layer changes** (fixed list ≠ algorithm; `src/domain/` untouched).
- **No changes to play/answer/complete/summary routes** (D8).

### Project Structure Notes

- Files to **create**: `prisma/migrations/<ts>_assignment_assign_support/` (generated); `src/components/teacher/assign-class-picker.tsx`; `src/components/teacher/assign-set-dialog.tsx`; `src/components/student/assignment-card.tsx`; `src/components/student/assignment-start-button.tsx`.
- Files to **modify**: `prisma/schema.prisma` (Task 1.1 only); `src/app/register/teacher/actions.ts` (+ test); `src/infrastructure/repositories/assignment-set-repository.ts` (+ test); `src/infrastructure/repositories/class-repository.ts`; `src/infrastructure/repositories/session-repository.ts`; `src/app/(teacher)/assignments/actions.ts` (+ test); `src/app/(teacher)/classes/page.tsx`; `src/app/(teacher)/assignments/page.tsx`; `src/components/teacher/assignment-set-builder.tsx`; `src/components/teacher/assignment-builder-state.ts` (+ test); `src/components/teacher/assignment-set-card.tsx`; `src/components/teacher/class-card.tsx`; `src/app/page.tsx`; `src/app/(student)/actions.ts` (+ test); `src/locales/vi/assignments.ts`; `src/locales/vi/student.ts`.
- Naming: kebab-case files, PascalCase types, camelCase functions.

## Previous Story Intelligence

- **Story 5.4 (done, commit `0db8dfe`):** built everything this story extends — builder Sheet (state-preserving retry contract), `assignment-set-card` with status derivation designed for this story, guard reuse from `classes/actions.ts`, server-side re-validation pattern (never trust client caps), locale-file-per-surface. Its scope walls explicitly hand this story: Step-3 class assignment, replace confirmation, student card, class-card pill data source.
- **Test baseline is 185** (23 files) after 5.4. Mock pattern: inline `vi.mock('@/lib/auth')`, `vi.mock('@/lib/db')`, `vi.mock('next/cache')`; `environment: 'node'`; `.tsx` tests compile (oxc jsx config since 5.2).
- **`src/lib/auth.ts` is untestable under vitest** (calls `NextAuth()` at import) — never import into pure helpers; tests mock `@/lib/auth`.
- **`src/lib/env.ts` parses env on import** — the child-profile cookie helper imports it; student action tests must `vi.mock('@/lib/env')` (and mock `next/headers`) per existing patterns.
- **Prisma CLI doesn't auto-load `.env.local`** — 5.4 ran migrations with `set -a; . ./.env.local` (bash). Direct URL for migrate, pooled for runtime.
- **Verification convention:** live browser QA usually impossible here; accepted fallback = `next build` + full unit coverage + explicit end-to-end code trace in Completion Notes.
- **Git pattern:** one commit per story, conventional-commit style, story file + sprint-status updated alongside code.
- **Open action items:** do NOT speculatively add rate limiting; the `rounded-brand-xl` vs tailwind-merge override risk (Epic 2 retro) may bite the student card — if `rounded-brand-xl` gets merged away by `cn()`, apply it last or verify output.

## Latest Tech Notes (verified against 5.4, 2026-07-23)

- **No new packages.** Next `15.3.9` (App Router; `await params`/`await headers()`), React 19, Prisma `^5.22.0`, zod `^4.4.3` (v4 idioms — copy `assignments/actions.ts`, not v3 memory), `@base-ui/react ^1.6.0` (dialog/alert-dialog/checkbox all wrap Base UI, NOT Radix), Tailwind v4, lucide-react, vitest `^4.1.10`, sonner for toasts (student start button already uses it).
- Prisma interactive `$transaction(async (tx) => ...)` is the shape for assign-with-clones; every query inside MUST use `tx`, not `db`.
- `updateMany` returns a count, not rows — read conflicting sets BEFORE the transaction only for the confirm check; inside the transaction just `updateMany` by the same filter (idempotent, race-safe).

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.5] (lines 969–991) — ACs verbatim; Epic 5 overview (lines 863–865)
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-6] (lines 164–171) — student surfacing, allotment gating, completion-records-Session; #FR-21 (331–338) — multi-class, one-active-per-class, replace-confirm; #A-1 (512), #A-5 (516), #A-6 (517); Open Question 5 (504) — A-1 confirmed: assigned questions COUNT toward allotment
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-6, AD-8; ERD lines 240–338] — AssignmentSet keeps single `classId` (D1 rationale); Session has no assignment link in spine (D3 is a story-driven extension, like 5.4's `gradeBand`)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md] — line 120 (student home card: "assignment name + teacher name + due date"), 148 (set card status Draft|Assigned), 149 (Step 3: "assign to class(es) or save as draft"), 174 (gate hides assignment CTA), 175 (second card below primary), 351–354 (teacher journey: assign → "Bộ bài tập đã được giao" → student home shows card)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md] — `student-home-card` Card/`rounded.xl` warm cream + orange CTA (line 243); teacher card radii (255–257)
- [Source: prisma/schema.prisma] — AssignmentSet (186–200), Class (101–113), ClassMembership (115–127), Session (157–170), TeacherAccount (85–99), User (36–47 — NO name field)
- [Source: src/app/page.tsx] — RootPage = student home (three branches to extend)
- [Source: src/app/(student)/actions.ts#startSessionAction] (lines 22–47) — template for assignment start; gate + abandon + create sequence
- [Source: src/infrastructure/repositories/session-repository.ts] — `createSession` (17–34), `countQuestionsAnsweredToday` (115–123, VN-day window = the allotment counter), `abandonPreviousSessions` (66–71)
- [Source: src/infrastructure/repositories/subscription-repository.ts#isAllotmentExhausted] (13–22)
- [Source: src/app/(teacher)/assignments/actions.ts] — action idioms + guard import; src/app/(teacher)/classes/actions.ts — `requireTeacherAccountId`
- [Source: src/infrastructure/repositories/assignment-set-repository.ts, class-repository.ts] — repo patterns to extend
- [Source: src/components/teacher/assignment-set-builder.tsx] — Step 3 block to extend; state-preservation contract
- [Source: src/components/teacher/assignment-set-card.tsx, class-card.tsx] — cards to extend (5.4 comments point here)
- [Source: src/components/student/student-home-card.tsx, session-start-button.tsx] — student card + start-button templates
- [Source: src/lib/child-profile-cookie.ts, src/lib/active-child-profile.ts] — student identity resolution (AD-5)
- [Source: src/app/register/teacher/actions.ts] (lines 8–13, 46–60) — D4 latent bug: `name` validated, never stored
- [Source: src/locales/vi/assignments.ts, student.ts, classes.ts] — locale files to extend; existing `assignedPill`/`noAssignmentPill`
- [Source: _bmad-output/implementation-artifacts/5-4-assignment-set-builder.md] — previous story intelligence (baseline, mock patterns, scope handoffs)
- [Source: _bmad-output/project-context.md] — layer rules, action shape, locale rule, tokens, two-connection-string rule

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. All epics/PRD/UX/architecture artifacts, the full 5.4 story intelligence, git history, and the live codebase (teacher + student surfaces, schema, repositories) were analyzed; the eight design decisions above resolve every gap between the ACs and the current system.

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5) via Claude Code

### Debug Log References

- Migration ran with `set -a; . ./.env.local` (Prisma CLI doesn't auto-load `.env.local`, per 5.4 debug log): `prisma/migrations/20260724001745_assignment_assign_support/` created and applied cleanly; all new columns nullable, no backfill needed.
- One pre-existing test needed updating: `class-repository.test.ts` `listClassesForTeacher` include-shape assertion (the 2.3 pill-data include is a deliberate query change, not a regression).

### Completion Notes List

- **Task 1:** `AssignmentSet.replacedAt` (D2), `AssignmentSet.sessions` back-relation + `@@index([classId, assignedAt])`, `Session.assignmentSetId` FK `onDelete: SetNull` (D3), `TeacherAccount.fullName` (D4). Registration now persists `fullName: parsed.data.name` — the latent D4 bug is fixed and regression-tested.
- **Task 2:** Repo additions exactly per spec: `findDraftSetForTeacher` (ownership+draft in one query), `findActiveSetsForClasses`, `assignSetToClasses` (ONE `$transaction`: replace via `updateMany` → assign draft to first class → clone per remaining class with nested question rows; single `new Date()` instance throughout), `getActiveAssignmentsForChild` (membership+active filters, `assignedAt desc`), `findStartableAssignmentForChild` (`orderBy: { id: 'asc' }` questions, D8). `countClassesForTeacher` added to class-repository; `listClassesForTeacher` now includes the active set title (take 1) for the class-card pill. `createSession` gained optional `assignmentSetId` — existing callers unchanged.
- **Task 3:** `assignAssignmentSetAction` follows the exact flow: `requireTeacherAccountId` (guard imported from `../classes/actions`, not duplicated) → zod → dedupe → `SET_NOT_FOUND` → `INVALID_CLASSES` → `CLASS_HAS_ACTIVE_SET` when conflicts and `!confirmReplace` (D6, no mutation) → transaction → revalidate both paths → `{ data: { assignedClassCount } }`. Never throws.
- **Task 4:** `AssignClassPicker` (whole-row label checkboxes, 44px min, empty state), `AssignSetDialog` (draft cards, D5; state reset on close mirroring create-class-dialog), builder Step 3 gained picker + primary "Giao bài" ("Lưu nháp" → outline); created-draft id kept in state so retry/confirm NEVER creates a second draft, and a post-assign-failure "Lưu nháp" click just closes (draft already persisted). Replace AlertDialog uses the EXACT AC #2 copy. Set card derives draft/assigned/replaced per D2 and shows class name when assigned; class-card pill now data-driven (`activeAssignmentTitle ?? noAssignmentPill`). Both pages pass classes; `/assignments` reuses `getClassesAction()`; 5.3 no-classes empty state preserved.
- **Tasks 5–6:** `getActiveAssignmentsState` maps `fullName ?? schoolName`; `AssignmentCard` (rounded-brand-xl, card bg + orange accent border — distinct from primary orange, UX-DR13) with `AssignmentStartButton` mirroring `session-start-button` (useTransition, toast, push). RootPage fetches gate + assignments once; cards render below the primary card in both the resume and start branches only when `gateState.blocked === false`; blocked → `FreeTierGateCard` only (D7). `startAssignmentSessionAction` mirrors `startSessionAction` step-for-step: cookie → profile → `ASSIGNMENT_NOT_AVAILABLE` (one code, no info leak) → `ALLOTMENT_EXHAUSTED` (same code/message) → abandon → `createSession(childId, orderedQuestionIds, assignmentSetId)`. No changes to play/answer/complete/summary (D8).
- **Task 7:** All strings in `src/locales/vi/` (assignments + student); `classes.ts` untouched — `noAssignmentPill` reused as fallback. No inline Vietnamese (UX-DR18).
- **Task 8:** Full gate green: `npx vitest run` → **217 passed / 24 files** (baseline 185 + 32 new), `npx tsc --noEmit` clean, `npx eslint <changed files>` 0 errors, `npx next build` succeeds. AD-6 rejection matrix for `assignAssignmentSetAction` covered (no session / wrong role / no row / PENDING / REJECTED).
- **8.7 verification fallback (live browser QA not possible in this sandbox; manual QA still needs an APPROVED teacher via direct DB update until 7.2):** explicit end-to-end code trace verified: draft card/builder "Giao bài" → `assignAssignmentSetAction` → `assignSetToClasses` transaction (replace + assign + clones atomic) → student home `getActiveAssignmentsState` (membership + active filters) → `AssignmentCard`/`AssignmentStartButton` → `startAssignmentSessionAction` → `createSession` with fixed ordered question list + `assignmentSetId` → existing `/session/[sessionId]` play → `submitAnswerAction` writes `SessionAnswer.answeredAt` → `countQuestionsAnsweredToday` counts it toward the allotment (A-1, zero new counting logic) → `completeSessionAction` sets `Session.completedAt` (AC #4, 5.6-ready via `assignmentSetId`).

### File List

- `prisma/schema.prisma` (modified)
- `prisma/migrations/20260724001745_assignment_assign_support/migration.sql` (created, generated)
- `src/app/register/teacher/actions.ts` (modified)
- `src/app/register/teacher/actions.test.ts` (modified)
- `src/infrastructure/repositories/assignment-set-repository.ts` (modified)
- `src/infrastructure/repositories/assignment-set-repository.test.ts` (modified)
- `src/infrastructure/repositories/class-repository.ts` (modified)
- `src/infrastructure/repositories/class-repository.test.ts` (modified)
- `src/infrastructure/repositories/session-repository.ts` (modified)
- `src/app/(teacher)/assignments/actions.ts` (modified)
- `src/app/(teacher)/assignments/actions.test.ts` (modified)
- `src/app/(teacher)/assignments/page.tsx` (modified)
- `src/app/(teacher)/classes/page.tsx` (modified)
- `src/components/teacher/assignment-builder-state.ts` (modified)
- `src/components/teacher/assignment-builder-state.test.ts` (modified)
- `src/components/teacher/assign-class-picker.tsx` (created)
- `src/components/teacher/assign-set-dialog.tsx` (created)
- `src/components/teacher/assignment-set-builder.tsx` (modified)
- `src/components/teacher/assignment-set-card.tsx` (modified)
- `src/components/teacher/class-card.tsx` (modified)
- `src/components/student/assignment-card.tsx` (created)
- `src/components/student/assignment-start-button.tsx` (created)
- `src/app/(student)/actions.ts` (modified)
- `src/app/(student)/actions.test.ts` (created)
- `src/app/page.tsx` (modified)
- `src/locales/vi/assignments.ts` (modified)
- `src/locales/vi/student.ts` (modified)

## Change Log

- 2026-07-24: Story 5.5 implemented (all 8 tasks). Schema: `replacedAt`, `Session.assignmentSetId`, `TeacherAccount.fullName`, active-set index (migration `20260724001745_assignment_assign_support`). Teacher: assign action (D1 clone-per-class, D2 replace, D6 server-driven confirm), builder Step 3 class picker + "Giao bài", draft-card AssignSetDialog, data-driven class-card pill. Student: assignment cards on home (gate-aware, D7), fixed-list assignment sessions reusing the whole play pipeline (D8, A-1 allotment counting unchanged). D4 registration name bug fixed. Tests 185 → 217 green; tsc/eslint/build clean. Status: review.

- 2026-07-24: Story created via create-story workflow (ultimate context engine analysis: epics + PRD + architecture spine + UX docs + full codebase survey + Story 5.4 intelligence). Key decisions: clone-per-class for multi-class assign (D1), `replacedAt` for replacement/A-6 (D2), `Session.assignmentSetId` for 5.6 completion (D3), fix dropped teacher name via `TeacherAccount.fullName` (D4), assign-existing-drafts via `AssignSetDialog` (D5), server-driven replace confirmation (D6), gate-aware student card rules (D7), fixed-list assignment sessions reusing the whole play pipeline (D8). Status: ready-for-dev.
