---
stepsCompleted: ['step-01', 'step-02', 'step-03']
inputDocuments:
  - '_bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md'
  - '_bmad-output/project-context.md'
---

# ToanTuDuy - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for ToanTuDuy, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: Start session — A Student can start a Session that presents Questions sequentially until the admin-configured question count is reached. A Free Tier Child Profile that has reached its daily Question allotment cannot start a new Session.

FR-2: Display question with answer choices — Each Question is displayed with its prompt (text and/or image) and 2–4 answer choices in a Grade Band–appropriate visual layout. Tapping or clicking an answer submits it immediately (no separate confirm step).

FR-3: Immediate post-answer feedback — After a student submits an answer, the system immediately shows whether the answer was correct or incorrect (within 500ms), and reveals the correct answer if the student was wrong.

FR-4: Session summary on completion — On completion of all Questions in a Session, the system displays a Session Summary showing: total Questions, correct count, and per-Skill outcome for all Skills encountered.

FR-5: Free Tier daily question gate — A Free Tier Child Profile has an admin-configurable daily Question allotment (default: 5). Once exhausted, the student sees a friendly end-of-allotment message. No subscription upsell or pricing information appears in the student surface.

FR-6: Teacher-assigned sessions surfaced to student — If a Child Profile's Class has an active Assignment Set, it appears as a named practice option on the student's home screen with visual distinction. Assigned Questions count toward the Free Tier daily allotment.

FR-7: Per-skill accuracy tracking — The system records, per Child Profile and per Skill, the running accuracy (correct / total attempts) across all completed Sessions. Questions in incomplete Sessions are not counted.

FR-8: Difficulty-adjusted question selection — When building a Session, the system selects Questions at a Difficulty Level matching the Child Profile's recent per-Skill accuracy. Lower accuracy → lower Difficulty Level; higher accuracy → higher Difficulty Level. Stays within the Child Profile's current Grade Band.

FR-9: Skill weighting toward weak areas — The system weights Question selection toward Skills where the Child Profile's accuracy is lower, within the configured session question count.

FR-10: Parent account registration — A parent can register a Parent Account with an email address and password. Email verification is required before the account is active; registration is rejected if the email is already in use.

FR-11: Create and manage child profiles — A Parent Account can create one or more Child Profiles, each with a display name and a Grade Band (1, 2, or 3). The parent can rename or delete any Child Profile and change Grade Band at any time; historical Session data is preserved. Deleted profiles' Session history is retained for 30 days before permanent deletion.

FR-12: Switch active child profile — From the parent-facing surface, a parent can switch the active Child Profile without re-authenticating.

FR-13: Weekly activity summary — The Parent Dashboard shows, for the selected Child Profile: Sessions completed in the current week (Monday–Sunday, Asia/Ho_Chi_Minh timezone), a visual indicator of which days practice occurred, and the current Streak (consecutive calendar days with at least one completed Session).

FR-14: Skill breakdown view — The Parent Dashboard shows per-Skill accuracy categorized as "Tốt" (≥70%) or "Cần luyện" (<70%). A Skill appears only after ≥5 Questions attempted. Needs-practice Skills sorted first. Tapping a Skill shows the last 3 Sessions that included it with per-session accuracy.

FR-15: Grade progress indicator — The Parent Dashboard shows a high-level indicator of where the Child Profile's average Difficulty Level sits within the Grade Band: "đầu kỳ" (avg 1.0–2.0), "giữa kỳ" (avg 2.1–3.5), "cuối kỳ" (avg 3.6–5.0).

FR-16: Subscription upsell prompt — When a Free Tier Child Profile has exhausted its daily Question allotment, the Parent Dashboard displays a prompt with a link to Subscription plans. No upsell content appears in the Student surface.

FR-17: Session history — The Parent Dashboard provides a scrollable history of completed Sessions for the selected Child Profile, showing date, score (correct / total), and Skills covered. Most recent 30 shown by default with pagination.

FR-18: Teacher account registration and approval — A teacher submits a registration (name, school name, grade taught, email). Account is pending until an admin approves or rejects it. Teacher is notified by email on either outcome.

FR-19: Class management — An approved Teacher Account can create one or more Classes (name + grade) each with a unique system-generated join code. A Parent Account can add a Child Profile to a Class using the join code. A Child Profile can be in at most one Class per Teacher Account.

FR-20: Assignment set creation — An approved Teacher Account can create an Assignment Set by selecting Questions from the question library filtered by Grade Band and Skill. Set has a name and optional due date. Saved as draft until explicitly assigned.

FR-21: Assign assignment set to class — An approved Teacher Account can assign an Assignment Set to one or more Classes. Students see the Assignment Set on their next login. A Class may have at most one active Assignment Set at a time; assigning a second requires confirmation to replace.

FR-22: Class report — An approved Teacher Account can view a Class Report for any assigned Assignment Set showing: per-student completion status (completed / not yet) and class-average accuracy per Skill. Individual student scores are not surfaced. Updates within 60 seconds of a student Session completion.

FR-23: Subscription plans display — A Parent Account can view available Subscription plans (monthly; annual if offered) with pricing on a dedicated plans page, accessible from the Parent Dashboard upsell prompt and account settings.

FR-24: Subscribe via Vietnamese payment method — A Parent Account can complete a subscription purchase via MoMo (v1). Subscription activates within 10 seconds of payment confirmation and applies to all Child Profiles under the account without requiring re-login.

FR-25: Subscription management — A Parent Account can view current subscription status (active/cancelled, next billing date), cancel their Subscription (takes effect at end of billing period), and reactivate a cancelled Subscription.

FR-26: Teacher account approval (Admin) — An admin can view all pending Teacher Account requests and approve or reject each with an optional reason. Approval or rejection triggers a notification email and updates the Teacher Account status immediately.

FR-27: Session configuration (Admin) — An admin can set the global session question count (range: 5–30 inclusive) and optionally a per-session time limit (positive integer minutes) or disable the time limit. Changes apply to newly started Sessions only; in-progress Sessions are not affected.

### NonFunctional Requirements

NFR-1 (Accessibility): All interactive elements in the Student Practice Interface have touch targets ≥ 44×44px.

NFR-2 (Accessibility): Navigation in the student surface uses icons with text labels throughout; text-only navigation is not permitted.

NFR-3 (Accessibility): No student-facing navigation element requires reading ability beyond Grade 1 Vietnamese.

NFR-4 (Performance): Questions load and render within 2 seconds on a 4G mobile connection.

NFR-5 (Performance): Session Summary renders within 1 second of the final answer submission.

NFR-6 (Performance): Parent Dashboard initial load completes within 3 seconds.

NFR-7 (Performance): Class Report and Parent Dashboard weekly summary update within 60 seconds of a student Session completion.

NFR-8 (Privacy/Data): Child Profile learning data (Session history, accuracy, Skill breakdown) is accessible only to the owning Parent Account and, in aggregated/completion-only form, to the linked Teacher Account's Class Report.

NFR-9 (Privacy/Data): No third-party advertising, analytics, or tracking SDKs are embedded in the student-facing surface.

NFR-10 (Security): Parent Account authentication is required before any Child Profile data is accessible.

NFR-11 (Security): Teacher Accounts access only Class-level aggregates and completion status; individual student scores from Child Profiles outside their Class are never surfaced.

NFR-12 (Security): Payment processing uses the payment provider's hosted flow; ToanTuDuy systems store no card data.

### Additional Requirements

_Technical requirements from the Architecture Spine that directly affect epic and story structure:_

- **Project initialization (Epic 1)**: Scaffold the exact Next.js 15 App Router monorepo directory structure defined in the Architecture Spine (src/app route groups, src/domain, src/infrastructure, src/components, src/lib, prisma/); this is a greenfield project with no starter template specified.

- **Prisma schema (Epic 1)**: Create single prisma/schema.prisma covering all entities: User, ParentAccount, ChildProfile, Subscription, TeacherAccount, Class, ClassMembership, Skill, Question, Session, SessionAnswer, AssignmentSet, AssignmentSetQuestion, GlobalConfig. All IDs use cuid2. All timestamps are DateTime (UTC). (AD-3)

- **Database connection strings (Epic 1)**: Configure DATABASE_URL (direct, migrations-only) and DATABASE_URL_POOLED (Supabase PgBouncer, all runtime access) — never interchangeable. Both must be set in Vercel environment variables. (AD-3)

- **Deployment configuration (Epic 1)**: Vercel project region must be sin1 (ap-southeast-1 Singapore); Supabase project must be in the Singapore region. This is an irreversible decision at project creation. (AD-7)

- **Environment variable validation (Epic 1)**: All secrets and config via environment variables. src/lib/env.ts exports Zod-validated env vars. No hard-coded credentials in src/. (Consistency)

- **Layer architecture enforcement (all Epics)**: React components (Presentation) must not import from src/domain/ or src/infrastructure/. Server actions are the only entry point from Presentation into business logic. Domain use cases must not import from @prisma/client, Next.js, or any external SDK. (AD-2)

- **Server action return shape (all Epics)**: Every server action returns `{ data: T } | { error: { code: string; message: string } }` — never throws. Every server action begins with a session check. (Consistency)

- **Auth via NextAuth v5 (Epic 2)**: Three role types: PARENT, TEACHER, ADMIN. Google OAuth enabled for Parent accounts only; Teacher and Admin use email/password. Authorization always reads session.user.role from server-side session; client-side session is display-only. (AD-4)

- **Child Profile cookie (Epic 2, Epic 3)**: After a parent selects a Child Profile, childProfileId is stored in a signed, httpOnly cookie. The student surface reads childProfileId from this cookie server-side. These two claims (parentAccountId from JWT, childProfileId from cookie) never coexist in the same JWT. (AD-5)

- **Teacher approval gate (Epic 6)**: NextAuth signIn callback must reject when teacher.status !== 'APPROVED'. Every /teacher/* layout and server action must additionally verify status === 'APPROVED' server-side. (AD-6)

- **Adaptive difficulty (Epic 4)**: Pure domain use case in src/domain/use-cases/adaptive-difficulty.ts. Signature: selectNextQuestion(skillAccuracyHistory: SkillAccuracyWindow[], availableQuestions: Question[]): Question. Zero external imports. Sliding window over last N=10 answered questions. ACCURACY_UP_THRESHOLD=0.80, ACCURACY_DOWN_THRESHOLD=0.50. Constants exported from src/domain/constants.ts. (AD-11)

- **Question content seeding (Epic 9)**: Initial question corpus loaded via prisma/seed.ts from structured JSON fixtures in prisma/fixtures/. Ongoing authoring via /admin/questions CRUD UI. (AD-12)

- **Question images (Epic 9)**: Upload via src/infrastructure/storage/supabase-storage.ts. Images stored in Supabase Storage public bucket. CDN URL stored in Question.imageUrl. No proxying through Next.js server. (AD-13)

- **Transactional email (Epics 2, 6, 7)**: All outbound email through src/infrastructure/email/resend.ts. No surface code imports from Resend SDK directly. Three trigger events in v1: subscription activated (parent), teacher approved (teacher), teacher rejected (teacher). (AD-14)

- **PayOS webhook (Epic 7)**: HMAC-SHA256 signature verified on every inbound request before any DB mutation. Subscription.status transitions (PENDING_PAYMENT → ACTIVE, ACTIVE → EXPIRED) only from this handler or a scheduled expiry job — never from a client-invoked server action. (AD-9)

- **Admin panel role gate (Epic 8)**: Every /admin/* layout and server action verifies session.user.role === 'ADMIN' server-side; returns 403/redirect otherwise. (AD-10)

- **Vietnamese strings (all Epics)**: All UI-visible Vietnamese strings live in locale files under src/locales/vi/. No inline Vietnamese in component code. (Consistency)

### UX Design Requirements

_Actionable UX requirements from DESIGN.md and EXPERIENCE.md:_

UX-DR1: Implement brand token system — brand primary orange (#F97316 / dark: #FB923C), student-mode canvas warm cream (#FFF7ED / dark: #1C1007), feedback-correct green (#16A34A), feedback-incorrect warm rose (#F87171), and skill-badge color token pairs (strong: muted green; weak: muted amber) — as CSS custom properties overriding shadcn defaults; all remaining tokens inherit shadcn defaults.

UX-DR2: Implement two Google Fonts: Be Vietnam Pro (all surfaces — body, heading, question, label-student) and Baloo 2 (student surface display/celebration headlines only); configure all five typography tokens with exact families, weights, and sizes (display: Baloo 2 700/36px; question: BVP 600/22px; label-student: BVP 600/18px; heading: BVP 700/20px; body: BVP 400/16px).

UX-DR3: Implement custom border-radius scale (sm 8px, md 12px, lg 20px, xl 28px) overriding shadcn defaults; student-surface containers use lg/xl; adult-surface (parent/teacher/admin) components use sm/md.

UX-DR4: Build answer-button component — custom (not a shadcn Button variant), min-height 64px, rounded-lg, four states (default / hover / selected-correct / selected-incorrect), all state transitions animate at 200ms ease-in-out; tap submits immediately (no confirm step).

UX-DR5: Build question-card component — white float on student-bg canvas, rounded-xl, shadow-sm; three sections top-to-bottom: illustration slot (optional, from Supabase CDN), question text (typography.question), audio button positioned top-right.

UX-DR6: Build feedback-overlay behavior — answer button transforms in-place (no modal/drawer); correct: feedback-correct fill + checkmark icon + Cú → cu-happy; incorrect: feedback-incorrect fill + × on selected button + correct answer revealed in feedback-correct fill on sibling button + Cú → cu-gentle; full state resolution in ≤ 200ms; "Tiếp theo →" button appears 500ms after feedback renders.

UX-DR7: Implement mascot Cú SVG system — three SVG assets (cu-neutral.svg, cu-happy.svg, cu-gentle.svg), 72px, positioned bottom-right of question card via absolute positioning; CSS class-swapped on feedback state; absent from all parent/teacher/admin surfaces; emotion conveyed by color + icon (never color alone).

UX-DR8: Build audio-button component — speaker icon + "Nghe lại" text label always visible (icon+text, never icon-only); triggers TTS playback of question prompt text; auto-plays on Grade 1 profiles on question load; tap-to-play on Grades 2–3; re-tap during playback restarts from beginning.

UX-DR9: Build skill-badge-strong and skill-badge-weak components — rounded-full pills using muted green and muted amber token pairs respectively; text + color (never color alone for state communication); used exclusively in the Parent Dashboard skill breakdown; weak badges sorted before strong badges.

UX-DR10: Implement student-mode surface scoping — data-mode="student" attribute on shell root triggers warm cream canvas; no persistent navigation chrome during an active session; banned affordances in student surface: hover-only, drag, long-press, keyboard shortcuts, right-click menus, external links of any kind; linear session flow enforcement.

UX-DR11: Implement all 20 named surface-specific composition components from DESIGN.md: student-home-card, session-progress-chip, session-summary-card, free-tier-gate-card, child-profile-switcher, weekly-activity-strip, skill-summary-section, grade-progress-indicator, upsell-banner, session-history-list, skill-detail-panel, subscription-plan-card, class-card, assignment-set-card, assignment-set-builder (3-step: config → question browser → assign), question-library-row, class-report-table, join-code-display, teacher-application-row, session-config-form.

UX-DR12: Implement fully responsive layout — student: full-width on mobile/tablet + max-w-lg centered on desktop; parent: bottom tab bar ≤ md + sidebar ≥ lg + content max-w-3xl; teacher: collapsed sidebar ≤ md + expanded sidebar ≥ lg + content max-w-4xl; admin: single column max-w-2xl; tablet safe-area CSS env() insets supported throughout.

UX-DR13: Implement all Student Mode state patterns — loading skeleton (max 2s, Skeleton on illustration + text areas), answering, feedback correct, feedback incorrect, auto-advance 1.5s (disabled on final question — manual "Tiếp theo" required), session complete, free-tier gate (no session CTA + assignment card hidden), assignment-set active (second card on student home), mid-session resume ("Tiếp tục buổi luyện" + progress indicator), offline (disable answer buttons + non-blocking banner + local state cache preserved).

UX-DR14: Implement all Parent Mode state patterns — no sessions ever (empty activity strip + skill section placeholder text), first week (current week only), loading skeleton (Skeleton on activity strip + skill badges + progress indicator), upsell banner active (Free Tier + allotment exhausted; dismissible per day), subscription active (no upsell banner + next billing date in settings), payment failed (error Toast; account stays Free Tier), subscription cancelled ("Đã hủy — có hiệu lực đến [date]" + reactivate CTA), child-profile deleted (immediate removal + toast with 30-day retention notice), offline (Toast once; read-only from cache), load error (inline error card with retry CTA; no empty-state until retry succeeds).

UX-DR15: Implement all Teacher Mode state patterns — no classes empty state (single primary action), pending approval full-screen ("Đang chờ xét duyệt" + no portal access), no students in class (join code prominent), assignment with 0 completions (report accessible; all rows "—"; class average "Chưa có dữ liệu"), class report row updates ≤ 60s (no full page refresh), offline (Toast once; assignment submission disabled), load error (inline retry; builder preserves draft on failed fetch).

UX-DR16: Implement all Admin Mode state patterns — empty approval queue ("Không có đơn đăng ký nào đang chờ"), config saved (Toast: "Áp dụng cho buổi tiếp theo"), offline (Toast; approve/reject disabled), save error (inline error; form values preserved).

UX-DR17: Implement WCAG 2.2 AA accessibility floor — 44×44px touch target minimum on all interactive elements; icon+text labels in student surface (never icon-only); aria-live="polite" on session progress chip; explicit focus management to first answer button on new question load; color never sole conveyor of information (skill badges: color + text label; feedback: color + icon + mascot expression); all images and icons have descriptive alt text or aria-label; every form input has an associated <label> (never placeholder as substitute); error messages associated with fields via aria-describedby; prefers-reduced-motion: skip animation frames (state still changes, animation frame is skipped); screen reader announces surface/page on navigation.

UX-DR18: Implement Vietnamese locale system — all UI-visible strings in src/locales/vi/ with no inline Vietnamese in component code; student microcopy conventions enforced (use "chưa đúng"/"thử lại nhé" — never "Sai"; short icon-supported labels); parent microcopy is data-forward and concise; teacher microcopy uses dense column labels.

UX-DR19: Implement interaction primitives per surface — student: tap-only (no swipe, no long-press, no drag); answer tap = immediate submit; audio re-tap = restart playback; no back/exit during active session from student surface; parent/teacher/admin: full keyboard navigation (Tab/Shift-Tab navigates all interactive elements; Enter activates; Esc closes dialogs/sheets); teacher class report table: client-side column sort (completion, skill accuracy).

UX-DR20: Implement session state preservation and offline resilience — session answer state cached locally (survives browser close/reload); mid-session resume flow on student home screen; offline mode disables answer submission but preserves displayed content; session not lost on connectivity drop.

### FR Coverage Map

| FR | Epic | Domain |
|---|---|---|
| FR-10 | Epic 1 | Parent registration + email verify |
| FR-11 | Epic 2 | Child Profile CRUD |
| FR-12 | Epic 2 | Child Profile switch |
| FR-1 | Epic 3 | Session start |
| FR-2 | Epic 3 | Question display + answer submission |
| FR-3 | Epic 3 | Immediate post-answer feedback |
| FR-4 | Epic 3 | Session summary |
| FR-5 | Epic 3 | Free Tier daily question gate |
| FR-7 | Epic 3 | Per-Skill accuracy tracking |
| FR-8 | Epic 3 | Difficulty-adjusted question selection |
| FR-9 | Epic 3 | Skill weighting toward weak areas |
| FR-13 | Epic 4 | Weekly activity + streak |
| FR-14 | Epic 4 | Skill breakdown view |
| FR-15 | Epic 4 | Grade progress indicator |
| FR-16 | Epic 4 | Subscription upsell prompt |
| FR-17 | Epic 4 | Session history |
| FR-6 | Epic 5 | Teacher-assigned sessions surfaced to student |
| FR-18 | Epic 5 | Teacher registration + approval |
| FR-19 | Epic 5 | Class management + join codes |
| FR-20 | Epic 5 | Assignment Set creation |
| FR-21 | Epic 5 | Assign to Class |
| FR-22 | Epic 5 | Class Report |
| FR-23 | Epic 6 | Subscription plans display |
| FR-24 | Epic 6 | Subscribe via MoMo/PayOS |
| FR-25 | Epic 6 | Subscription management |
| FR-26 | Epic 7 | Teacher account approval (Admin) |
| FR-27 | Epic 7 | Session configuration (Admin) |

## Epic List

### Epic 1: Project Foundation & Parent Authentication
A parent can register with email and password, verify their email, and log in to a deployed, fully-scaffolded application. The complete Prisma database schema, design system tokens, and architecture layer structure are in place as the substrate for all subsequent epics.
**FRs covered:** FR-10
**Architecture covered:** Full monorepo scaffold, complete Prisma schema (all 13 entities), design tokens (UX-DR1–3), NextAuth v5 with all three roles, Zod env validation, Vercel sin1 + Supabase Singapore deployment

### Epic 2: Child Profile Management
A parent can create one or more Child Profiles (with name and Grade Band), switch between them without re-authenticating, rename them, change Grade Band, and delete them. The signed, httpOnly child-profile cookie session handoff to the student surface is functional.
**FRs covered:** FR-11, FR-12
**Architecture covered:** AD-5 (child profile cookie), AD-4 (parent role auth)

### Epic 3: Student Practice Interface & Adaptive Difficulty
A student (via an active Child Profile) can start a daily practice Session, answer Questions with immediate visual feedback, have Questions adaptively selected by Difficulty Level based on their per-Skill accuracy history, and see a Session Summary on completion. The Free Tier daily allotment gate is enforced. The full student-mode UX (mascot Cú, answer-button, question-card, audio-button, feedback-overlay, offline resilience) is delivered.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-7, FR-8, FR-9
**Architecture covered:** AD-11 (adaptive difficulty domain use case), AD-12 (initial question seed data)
**UX-DRs covered:** UX-DR4–13, UX-DR17, UX-DR18, UX-DR19, UX-DR20

### Epic 4: Parent Dashboard
A parent can open the Parent Dashboard for any Child Profile and, in under 30 seconds, see: weekly activity + streak, per-Skill accuracy breakdown ("Tốt" / "Cần luyện"), grade progress indicator, a subscription upsell prompt when the Free Tier allotment is exhausted, and a full scrollable Session history. Tapping a Skill badge shows the last 3 Sessions for that Skill.
**FRs covered:** FR-13, FR-14, FR-15, FR-16, FR-17
**UX-DRs covered:** UX-DR9, UX-DR11 (parent components), UX-DR12 (parent responsive layout), UX-DR14

### Epic 5: Teacher Portal & Class Reports
A teacher can register (entering pending state), receive an approval or rejection email, manage Classes with join codes, build Assignment Sets from the question library, assign them to Classes, and view per-student completion status plus class-average Skill accuracy in a Class Report. Active assignments appear on enrolled students' home screens.
**FRs covered:** FR-6, FR-18, FR-19, FR-20, FR-21, FR-22
**Architecture covered:** AD-6 (teacher approval gate at signIn + route level), AD-8 (Server Component load-on-visit), AD-14 (approval/rejection emails)
**UX-DRs covered:** UX-DR11 (teacher components), UX-DR15

### Epic 6: Subscription & Payments
A parent can view subscription plans, subscribe via MoMo through the PayOS-hosted flow, and have their Subscription activate within 10 seconds of payment confirmation (unlocking unlimited Sessions for all Child Profiles). A parent can view subscription status, cancel (end-of-period), and reactivate.
**FRs covered:** FR-23, FR-24, FR-25
**Architecture covered:** AD-9 (PayOS webhook + HMAC-SHA256 verification), AD-14 (subscription activated email)
**UX-DRs covered:** UX-DR11 (subscription-plan-card), UX-DR14 (payment/subscription states)

### Epic 7: Admin Panel & Question Library
An admin can process the Teacher Account approval queue (approve / reject with reason, triggering notification emails), configure the global Session question count (5–30) and optional time limit, and manage the full Question library (create, edit, delete, image upload to Supabase Storage). The initial question corpus seed is loadable from prisma/fixtures/.
**FRs covered:** FR-26, FR-27
**Architecture covered:** AD-10 (admin role gate), AD-12 (question CRUD + seed), AD-13 (Supabase Storage image upload)
**UX-DRs covered:** UX-DR11 (admin components), UX-DR16

---

## Epic 1: Project Foundation & Parent Authentication

A parent can register with email and password, verify their email, and log in to a deployed, fully-scaffolded application. The complete Prisma database schema, design system tokens, and architecture layer structure are in place as the substrate for all subsequent epics.

### Story 1.1: Initialize Next.js Monorepo & Design System Foundation

As a developer,
I want the project scaffolded with the correct directory structure, brand design tokens, and validated env config,
So that all subsequent development starts from a convention-compliant foundation with no structural rework.

**Acceptance Criteria:**

**Given** Node.js and pnpm are installed,
**When** I run `pnpm install` and `pnpm dev`,
**Then** the Next.js 15 App Router dev server starts without errors.

**And** the directory structure matches the Architecture Spine exactly:
- `src/app/(student)/`, `src/app/(parent)/`, `src/app/(teacher)/`, `src/app/admin/`, `src/app/api/`
- `src/domain/entities/`, `src/domain/use-cases/`, `src/domain/constants.ts`
- `src/infrastructure/repositories/`, `src/infrastructure/email/`, `src/infrastructure/storage/`, `src/infrastructure/payment/`
- `src/components/ui/`, `src/components/student/`, `src/components/parent/`, `src/components/teacher/`
- `src/lib/` containing `auth.ts`, `env.ts`, `utils.ts`, `child-profile-cookie.ts`
- `src/locales/vi/` with an initial `common.ts` locale file
- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/fixtures/`

**And** Tailwind CSS v4 and shadcn/ui are installed and baselined.

**And** brand color tokens are defined as CSS custom properties overriding shadcn defaults (per DESIGN.md): `primary` (#F97316 light / #FB923C dark), `student-bg` (#FFF7ED light / #1C1007 dark), `feedback-correct` (#16A34A), `feedback-incorrect` (#F87171), skill-badge strong and weak token pairs — all with dark-mode variants.

**And** Be Vietnam Pro and Baloo 2 are loaded from Google Fonts; five typography tokens are configured in Tailwind: `display` (Baloo 2 700/36px), `question` (Be Vietnam Pro 600/22px), `label-student` (Be Vietnam Pro 600/18px), `heading` (Be Vietnam Pro 700/20px), `body` (Be Vietnam Pro 400/16px).

**And** custom border-radius tokens override shadcn defaults: `rounded-brand-sm` (8px), `rounded-brand-md` (12px), `rounded-brand-lg` (20px), `rounded-brand-xl` (28px).

**And** `src/lib/env.ts` exports Zod-validated env vars for all required secrets (`DATABASE_URL`, `DATABASE_URL_POOLED`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`); the app fails to start if any required var is missing or invalid.

**And** `pnpm build` completes with zero TypeScript strict-mode errors; all file names are kebab-case.

### Story 1.2: Complete Prisma Schema & Database Infrastructure

As a developer,
I want the full Prisma schema with all 13 entities migrated to Supabase (Singapore),
So that all features have a ready, fully-relational data layer with no schema-blocking surprises in later epics.

> **Note:** All 13 entities are created here because they are fully specified in the Architecture Spine with explicit relations; creating them all at once prevents inter-epic migration conflicts.

**Acceptance Criteria:**

**Given** `DATABASE_URL` and `DATABASE_URL_POOLED` point to a Supabase project in the Singapore region,
**When** I run `prisma migrate dev --name init`,
**Then** the migration succeeds and all 13 tables exist in the database.

**And** `prisma/schema.prisma` defines all entities: `User`, `ParentAccount`, `ChildProfile`, `Subscription`, `TeacherAccount`, `Class`, `ClassMembership`, `Skill`, `Question`, `Session`, `SessionAnswer`, `AssignmentSet`, `AssignmentSetQuestion`, `GlobalConfig`.

**And** all primary keys use `@default(cuid())` (cuid2); no UUID fields anywhere in the schema.

**And** all `DateTime` fields are stored as UTC.

**And** all relations are explicitly defined with referential actions; no implicit many-to-many.

**And** enums are defined: `Role` (PARENT, TEACHER, ADMIN), `GradeBand` (GRADE_1, GRADE_2, GRADE_3), `TeacherStatus` (PENDING, APPROVED, REJECTED), `SubscriptionStatus` (PENDING_PAYMENT, ACTIVE, EXPIRED, CANCELLED).

**And** `Question.difficultyLevel` is an `Int`; `Question.choices` is `Json`; `Question.imageUrl` is `String?` (nullable).

**And** the Prisma client singleton in `src/lib/db.ts` uses `DATABASE_URL_POOLED` (PgBouncer) for all runtime queries; `DATABASE_URL` is never imported in any `src/` file.

**And** `prisma migrate deploy` is added to the Vercel build command so migrations run automatically on production deploy.

### Story 1.3: NextAuth v5 Authentication Infrastructure

As a developer,
I want NextAuth v5 configured with all providers, the signIn callback, and the child-profile cookie utility,
So that the full authentication contract for all three user types is in place before any user-facing features are built.

**Acceptance Criteria:**

**Given** NextAuth v5 dependencies are installed,
**When** a request hits `/api/auth/[...nextauth]`,
**Then** the NextAuth route handler responds without errors.

**And** `src/lib/auth.ts` configures a Credentials provider (email + bcrypt-hashed password validated against the User table) and a Google OAuth provider.

**And** the NextAuth `signIn` callback rejects Google OAuth sign-in if the resolved user's `role !== 'PARENT'` (returns `false`).

**And** the `signIn` callback rejects any sign-in if the user is a Teacher with `status !== 'APPROVED'` (returns `false`).

**And** the session JWT shape includes `user.id`, `user.role`, and `user.email`; client-side session contains the same fields for display only.

**And** `src/lib/child-profile-cookie.ts` exports:
- `setChildProfileCookie(profileId: string, response: NextResponse): void` — sets a signed, httpOnly, SameSite=Strict cookie named `child-profile-id`
- `getChildProfileId(headers: ReadonlyHeaders): string | null` — reads and verifies the HMAC signature using `NEXTAUTH_SECRET`; returns `null` on missing or invalid signature

**And** there is a `/login` page with email/password fields and a Google sign-in button; all inputs have associated `<label>` elements.

**And** authentication errors (invalid credentials, unverified email, pending teacher) display user-facing messages without leaking system internals.

### Story 1.4: Parent Account Registration & Email Verification

As a parent,
I want to register with my email and password and verify my email,
So that I have a secure, verified account before accessing the application.

**Acceptance Criteria:**

**Given** I am on `/register`,
**When** I submit a valid email, password (≥8 characters), and matching confirm-password,
**Then** a `User` (role: PARENT) and `ParentAccount` record are created with `emailVerified: null`; a verification email is sent via `src/infrastructure/email/resend.ts` containing a signed one-time link valid for 24 hours.

**Given** I click the valid, non-expired verification link,
**When** the link is processed,
**Then** `User.emailVerified` is set to the current timestamp and I am redirected to `/login` with a "Email verified — please log in" success message.

**Given** I try to register with an email address already in use,
**When** I submit the form,
**Then** I see the error "Email address already registered" (no leakage of verification status).

**Given** I submit with mismatched password and confirm-password,
**When** the form validates,
**Then** an inline validation error appears before submission; the form is not submitted to the server.

**Given** an unverified Parent Account tries to log in,
**When** they submit valid credentials,
**Then** sign-in is rejected with "Please verify your email before logging in."

**And** the registration server action returns `{ data: { success: true } } | { error: { code: string; message: string } }` — it never throws.

**And** all form inputs have associated `<label>` elements; error messages are linked via `aria-describedby`.

### Story 1.5: Parent Login & Post-Auth Parent Shell

As a parent,
I want to log in and land on a working parent shell,
So that I can access the application after authentication.

**Acceptance Criteria:**

**Given** I am on `/login` with a verified Parent Account,
**When** I submit valid email and password,
**Then** I am authenticated via NextAuth and redirected to `/(parent)/dashboard`.

**Given** I sign in with Google with an email matching an existing PARENT account,
**When** the OAuth flow completes,
**Then** I am authenticated and redirected to `/(parent)/dashboard`.

**Given** I am already authenticated as a PARENT and navigate to `/login`,
**When** the page loads,
**Then** I am redirected to `/(parent)/dashboard`.

**And** `/(parent)/` layout verifies `session.user.role === 'PARENT'` server-side; unauthenticated or wrong-role requests redirect to `/login`.

**And** the parent shell renders with bottom tab bar navigation at `< md` breakpoint and sidebar navigation at `≥ lg` breakpoint, with four navigation items: Dashboard, Profiles, Subscription, Account. Items other than Dashboard show a "coming soon" placeholder until implemented in later epics.

**And** an `APPROVED` Teacher logging in is redirected to `/(teacher)/` (stub shell, "Teacher Portal — coming soon").

**And** a `PENDING` or `REJECTED` Teacher logging in sees a full-screen message: "Tài khoản đang chờ xét duyệt. Chúng tôi sẽ thông báo qua email." with no portal content accessible.

**And** an ADMIN logging in is redirected to `/admin/` (stub shell, "Admin Panel — coming soon").

**And** all server actions in auth flows return `{ data: T } | { error: { code: string; message: string } }`; no unhandled exceptions propagate to the client.

---

## Epic 2: Child Profile Management

A parent can create one or more Child Profiles (with name and Grade Band), switch between them without re-authenticating, rename them, change Grade Band, and delete them. The signed, httpOnly child-profile cookie session handoff to the student surface is functional.

### Story 2.1: Create & Manage Child Profiles

As a parent,
I want to create Child Profiles with a name and Grade Band and manage them (rename, change grade, delete),
So that I can set up a personalized practice account for each of my children.

**Acceptance Criteria:**

**Given** I am authenticated as a PARENT and on the Profiles page (`/(parent)/profiles`),
**When** I tap "Thêm hồ sơ" and submit a display name and Grade Band (Grade 1, 2, or 3),
**Then** a `ChildProfile` record is created linked to my `ParentAccount` and appears in my profile list immediately.

**Given** I have an existing Child Profile,
**When** I rename it or change its Grade Band,
**Then** the change is reflected immediately; historical Session data for the profile is not affected.

**Given** I delete a Child Profile,
**When** the deletion is confirmed via a confirmation dialog,
**Then** the profile is removed from the list immediately and a toast shows "Hồ sơ đã được xóa. Lịch sử sẽ được giữ 30 ngày."
**And** the underlying DB record is soft-deleted (retained for 30 days before hard deletion, per FR-11).

**Given** I have 5 or more existing Child Profiles,
**When** I attempt to create another,
**Then** the system allows it (no cap enforced in v1 per A-2).

**And** the `child-profile-switcher` component renders in the parent shell header showing the active profile's name and grade with a chevron; tapping it opens a Sheet listing all profiles plus "Thêm hồ sơ."

**And** all server actions begin with a session check returning `{ error: { code: 'UNAUTHORIZED' } }` if no PARENT session is present (NFR-10).

**And** all form inputs have associated `<label>` elements; error messages are linked via `aria-describedby`.

### Story 2.2: Child Profile Switch & Student Surface Entry

As a parent,
I want to select one of my Child Profiles and enter the student surface for that child,
So that my child can start practicing without needing their own login credentials.

**Acceptance Criteria:**

**Given** I tap a Child Profile name in the profile switcher Sheet,
**When** the selection is processed,
**Then** `setChildProfileCookie` is called server-side with the selected `ChildProfile.id`, setting a signed httpOnly `child-profile-id` cookie (SameSite=Strict).
**And** the Sheet closes and the parent shell header reflects the newly active profile's name immediately.

**Given** the `child-profile-id` cookie is valid and set,
**When** the student surface (`/(student)/`) layout runs server-side,
**Then** `getChildProfileId()` reads and verifies the cookie; the student home screen renders with the active Child Profile's display name.

**Given** a request reaches any `/(student)/` route without a valid `child-profile-id` cookie,
**When** the layout server-side check runs,
**Then** the request is redirected to `/(parent)/dashboard`; the student surface is never accessible without an active profile.

**Given** I switch from Profile A to Profile B via the switcher,
**When** the cookie is updated,
**Then** subsequent navigations to the student surface reflect Profile B's data; Profile A's cookie value is no longer accepted.

**And** `parentAccountId` (from the NextAuth JWT) and `childProfileId` (from the cookie) never coexist in the same JWT — they are separate claims read from separate sources (AD-5).

**And** the student surface root layout (`/(student)/layout.tsx`) sets `data-mode="student"` on the root element, activating the warm cream canvas (`student-bg`) via Tailwind.

### Story 2.3: Student Home Screen Shell

As a student (via an active Child Profile),
I want to see my home screen with a clear call-to-action to start today's practice,
So that I know exactly what to do when I open the app.

**Acceptance Criteria:**

**Given** the student surface loads with a valid active Child Profile,
**When** the student home page (`/(student)/`) renders,
**Then** I see a greeting with the child's display name ("Xin chào [Tên]! 👋") in `typography.display` (Baloo 2 700/36px).
**And** a large primary orange `student-home-card` with the CTA "Luyện tập hôm nay" is visible.
**And** `data-mode="student"` is active; background is warm cream; no persistent navigation chrome is visible during the session screen.

**Given** the student home renders with no active Assignment Set for this Child Profile's Class,
**When** the page loads,
**Then** only the primary practice card is shown; no second assignment card is visible (assignment card implemented in Epic 5).

**Given** a session is in-progress (mid-session resume — implemented in Epic 3 Story 3.7),
**When** the student home loads,
**Then** the CTA reads "Tiếp tục buổi luyện" with a progress indicator; this state is a stub in this story and fully implemented in Epic 3.

**And** the student home is a Next.js Server Component that reads `childProfileId` from the cookie server-side.

**And** all UI text is sourced from `src/locales/vi/`; no inline Vietnamese strings in component code (UX-DR18).

---

## Epic 3: Student Practice Interface & Adaptive Difficulty

A student (via an active Child Profile) can start a daily practice Session, answer Questions with immediate visual feedback, have Questions adaptively selected by Difficulty Level based on their per-Skill accuracy history, and see a Session Summary on completion. The Free Tier daily allotment gate is enforced. The full student-mode UX (mascot Cú, answer-button, question-card, audio-button, feedback-overlay, offline resilience) is delivered.

### Story 3.1: Adaptive Difficulty Domain Use Case

As a developer,
I want the adaptive difficulty use case implemented as a pure domain function with unit tests,
So that question selection logic is testable in isolation and never contaminated by framework or DB dependencies.

**Acceptance Criteria:**

**Given** `src/domain/use-cases/adaptive-difficulty.ts` exists,
**When** `selectNextQuestion(skillAccuracyHistory, availableQuestions)` is called,
**Then** it returns one `Question` from `availableQuestions` with zero imports from `@prisma/client`, Next.js, or any external SDK (AD-11).

**And** `src/domain/constants.ts` exports `WINDOW_SIZE = 10`, `ACCURACY_UP_THRESHOLD = 0.80`, `ACCURACY_DOWN_THRESHOLD = 0.50` as named constants.

**And** the algorithm per-Skill computes accuracy over the last `WINDOW_SIZE` answered questions: if accuracy > `ACCURACY_UP_THRESHOLD`, prefer higher Difficulty Level; if accuracy < `ACCURACY_DOWN_THRESHOLD`, prefer lower Difficulty Level; if no history, start at Difficulty Level 2.

**And** question selection weights toward Skills with lower accuracy — over any 5-question window, a Skill with accuracy <50% receives proportionally more Questions than a Skill with accuracy >80% (FR-9).

**And** the function never returns a Question outside the Child Profile's current `GradeBand`.

**And** at least 10 unit tests cover: no history, high accuracy, low accuracy, mixed Skills, boundary thresholds (exactly 0.80, exactly 0.50), and a fallback random pick when `availableQuestions` is empty.

**And** `src/domain/entities/` defines TypeScript types: `Question`, `Skill`, `SkillAccuracyWindow`, `Session`, `SessionAnswer`, `ChildProfile` — all pure types, zero framework imports.

### Story 3.2: Question & Session Repository Infrastructure

As a developer,
I want Prisma-backed repositories for Questions and Sessions plus a minimal question seed,
So that the practice flow has data to work with from the first dev run.

**Acceptance Criteria:**

**Given** `src/infrastructure/repositories/question-repository.ts` exists,
**When** `getQuestionsForSession({ gradeBand, skillIds?, difficultyLevel? })` is called,
**Then** it returns `Question[]` filtered by Grade Band (and optionally Skill and Difficulty Level) using `DATABASE_URL_POOLED`.

**And** `src/infrastructure/repositories/session-repository.ts` exports:
- `createSession(childProfileId, questionIds): Promise<Session>` — creates a `Session` record and associated `SessionAnswer` stubs
- `recordAnswer(sessionAnswerId, answeredCorrectly, difficultyLevelAtAnswer): Promise<void>` — updates one `SessionAnswer`
- `completeSession(sessionId): Promise<Session>` — sets `Session.completedAt` and computes `correctCount`
- `getSkillAccuracyHistory(childProfileId, skillId): Promise<SkillAccuracyWindow>` — returns the last `WINDOW_SIZE` completed answers for that Skill

**And** `prisma/fixtures/` contains at least one JSON fixture file with ≥ 3 Questions per `GradeBand × Skill × difficultyLevel` combination (minimum viable seed for dev/test; full corpus is delivered in Epic 7).

**And** `prisma/seed.ts` loads all fixture JSON files and upserts `Skill` and `Question` records; `prisma db seed` completes without errors.

**And** no repository file contains business logic; repositories import domain types only — no domain use cases (AD-2).

### Story 3.3: Session Start & Free Tier Daily Gate

As a student (via an active Child Profile),
I want to start a Session when I tap "Luyện tập hôm nay" — and see a friendly message if my Free Tier allotment is exhausted,
So that I can practice up to my daily limit with a clear, non-commercial experience when it's reached.

**Acceptance Criteria:**

**Given** the active Child Profile is on the Free Tier with remaining daily allotment,
**When** I tap "Luyện tập hôm nay",
**Then** a `Session` is created server-side; I am routed to `/(student)/session/[sessionId]` and the first question loads.
**And** the `session-progress-chip` ("1 / 10") renders top-right with `aria-live="polite"` (UX-DR17).

**Given** the active Child Profile holds an active Subscription,
**When** I tap the CTA at any point in the day,
**Then** a new Session always starts with no allotment check.

**Given** a Free Tier Child Profile has answered ≥ the admin-configured daily allotment Questions today (default: 5),
**When** the student home loads,
**Then** the primary CTA is hidden and a `free-tier-gate-card` shows: "Hôm nay [Tên] đã luyện đủ rồi 🌟" with tomorrow's date.
**And** the gate card contains no pricing, subscription CTA, or commercial content (FR-5).

**And** the daily allotment value is read from `GlobalConfig` (key: `FREE_TIER_DAILY_ALLOTMENT`, default `5`).

**And** the start-session server action returns `{ data: { sessionId: string } } | { error: { code: 'ALLOTMENT_EXHAUSTED' | 'UNAUTHORIZED' | string } }`.

### Story 3.4: Question Display & Answer Submission

As a student,
I want each Question displayed in a clear card with answer buttons I tap to submit immediately,
So that I can answer questions quickly without confirmation friction.

**Acceptance Criteria:**

**Given** a Session is active and a Question is loaded,
**When** the session screen renders,
**Then** a `question-card` (white, rounded-brand-xl, shadow-sm, on warm-cream canvas) shows: an illustration slot (loaded from CDN if `Question.imageUrl` is non-null), the question prompt in `typography.question` (Be Vietnam Pro 600/22px), and an `audio-button` top-right.

**And** 2–4 `answer-button` components render in a 2-column grid on tablet and single column on phone; each is min-height 64px, rounded-brand-lg, `label-student` typography (18px); no answer is pre-selected on load.

**And** tapping an answer button submits it immediately — `recordAnswer()` is called; no separate confirm step (FR-2).

**And** on new question load, focus is explicitly moved to the first answer button (UX-DR17).

**And** the `question-card` shows a `Skeleton` pulse in illustration and text areas while loading; questions render within 2 seconds on a 4G connection (NFR-4).

**And** all answer buttons meet 44×44px minimum touch target; CSS safe-area insets are respected (NFR-1).

**And** no hover-only affordances, drag, long-press, keyboard shortcuts, right-click menus, or external links exist in the student surface (UX-DR19).

### Story 3.5: Immediate Feedback & Mascot Reactions

As a student,
I want to see immediately whether I was right or wrong — with a clear visual reaction and the correct answer shown if I was wrong,
So that I learn from each question without interruption.

**Acceptance Criteria:**

**Given** I tap an answer button,
**When** the answer is submitted,
**Then** feedback state resolves within 200ms (within FR-3's 500ms requirement):
- **Correct:** tapped button fills `feedback-correct` + checkmark icon; mascot swaps to `cu-happy.svg`.
- **Incorrect:** tapped button fills `feedback-incorrect` + × icon; correct sibling button fills `feedback-correct`; text "Đáp án đúng là [X]" appears below card; mascot swaps to `cu-gentle.svg`.

**And** all button state transitions animate at 200ms ease-in-out (UX-DR4).

**And** feedback state uses color + icon + mascot — never color alone (UX-DR17).

**And** "Tiếp theo →" appears 500ms after feedback renders (UX-DR6).

**And** for questions 1 to N−1: auto-advance fires after 1.5 seconds; tapping "Tiếp theo →" before 1.5s cancels the timer and navigates immediately (UX-DR13).

**And** for the final question (question N): auto-advance is disabled; the student must tap "Tiếp theo →" explicitly to reach the summary (UX-DR13).

**And** the mascot `Cú` (72px SVG, bottom-right of question card, absolutely positioned) is CSS class-swapped on feedback state; absent from all parent/teacher/admin surfaces (UX-DR7).

**And** `prefers-reduced-motion: reduce` skips CSS transition frames; state changes (color fills, mascot swap) still occur (UX-DR17).

### Story 3.6: Session Completion, Summary & Accuracy Update

As a student,
I want to see a summary screen after my final question showing my score and per-Skill results,
So that I have a sense of accomplishment and know which Skills I practiced.

**Acceptance Criteria:**

**Given** I tap "Tiếp theo →" after the final question's feedback,
**When** `completeSession()` is called,
**Then** `Session.completedAt` is set; `Session.correctCount` is computed from `SessionAnswer` records; per-Skill accuracy is updated for all Skills answered in this Session (FR-7).

**And** I am routed to `/(student)/summary/[sessionId]`; the `session-summary-card` renders within 1 second of session completion (NFR-5) showing:
- Large score in `typography.display` (e.g., "8 / 10")
- Per-Skill rows (correct/total per Skill encountered in the Session) (FR-4)
- `cu-happy.svg` mascot in celebration state

**And** if the Session contained only one Skill, the summary shows that Skill's accuracy (e.g., "6/8 Nhận diện quy luật").

**And** two exit buttons: "Về trang chủ" (always); and "Xong cho hôm nay" replaces it only if the Free Tier allotment is now exhausted.

**And** questions from sessions without a `completedAt` (abandoned/in-progress) are excluded from all accuracy calculations (FR-7).

**And** accuracy updates are scoped to the owning `ChildProfile` only; no cross-profile reads (NFR-8).

### Story 3.7: Session State Preservation & Offline Resilience

As a student,
I want my session preserved if I close the browser or lose connectivity mid-session,
So that I never lose progress and can resume where I left off.

**Acceptance Criteria:**

**Given** I am mid-session and close the browser tab,
**When** I return to the student home,
**Then** the CTA reads "Tiếp tục buổi luyện" with a progress indicator (e.g., "3 / 10 câu") sourced from the in-progress `Session` in the DB (UX-DR13, UX-DR20).

**Given** I tap "Tiếp tục buổi luyện",
**When** the session screen loads,
**Then** I am placed at the next unanswered question; already-answered questions are not re-presented.

**Given** I lose network connectivity mid-session,
**When** I attempt to submit an answer,
**Then** answer buttons are disabled and a non-blocking inline banner shows "Mất kết nối — kiểm tra lại"; no session data is lost (UX-DR13).

**Given** connectivity is restored,
**When** I try to submit again,
**Then** the offline banner disappears and answer submission resumes normally.

**And** only one in-progress Session per Child Profile is permitted at a time; starting a new Session while one is in-progress marks the previous as abandoned (not `completedAt`).

### Story 3.8: Audio Button, Accessibility Floor & Interaction Constraints

As a student,
I want question prompts read aloud automatically (Grade 1) or on demand (Grades 2–3), with full accessibility support throughout,
So that non-fluent readers can fully participate and all users have an accessible experience.

**Acceptance Criteria:**

**Given** a question renders for a Grade 1 Child Profile,
**When** the question card mounts,
**Then** the `audio-button` TTS (Web Speech API, `vi-VN` voice) plays automatically; the button remains visible and tappable for replay.

**Given** a question renders for a Grade 2 or 3 Child Profile,
**When** the question card mounts,
**Then** TTS does not auto-play; the `audio-button` (speaker icon + "Nghe lại" text — always both icon and text, never icon-only) is tappable on demand (UX-DR8).

**Given** I tap the audio button during playback,
**When** the tap registers,
**Then** playback restarts from the beginning (UX-DR8).

**And** all interactive elements meet 44×44px minimum touch target (NFR-1).

**And** every question image and mascot SVG has a descriptive `alt` text or `aria-label` (UX-DR17).

**And** every navigation element in the student surface uses icon + text label; no text-only navigation (NFR-2, NFR-3).

**And** `prefers-reduced-motion: reduce` is respected — transition frames are skipped but state changes always apply (UX-DR17).

**And** the student surface enforces: no swipe, long-press, drag, hover-only affordances, keyboard shortcuts, right-click menus, or external links of any kind (UX-DR19).

---

## Epic 4: Parent Dashboard

A parent can open the Parent Dashboard for any Child Profile and, in under 30 seconds, see: weekly activity + streak, per-Skill accuracy breakdown, grade progress indicator, subscription upsell prompt when the Free Tier allotment is exhausted, and a full scrollable Session history. Tapping a Skill badge shows the last 3 Sessions for that Skill.

### Story 4.1: Weekly Activity Strip & Streak

As a parent,
I want to see which days this week my child practiced and their current streak,
So that I can track consistency at a glance.

**Acceptance Criteria:**

**Given** I open the Parent Dashboard for a Child Profile with completed Sessions,
**When** the dashboard renders,
**Then** a `weekly-activity-strip` shows 7 circles (Mon–Sun) for the current week in Asia/Ho_Chi_Minh timezone; days with ≥ 1 completed Session are filled orange (`primary`); days without are empty muted circles (FR-13).

**And** the current Streak (consecutive calendar days with ≥ 1 completed Session, Asia/Ho_Chi_Minh timezone) is displayed (e.g., "4 ngày") (FR-13).

**And** the weekly summary updates within 60 seconds of a Session completion (NFR-7).

**And** for a Child Profile with no Sessions ever, the activity strip shows all empty circles and no streak count (UX-DR14).

**And** the dashboard renders via a Next.js Server Component; `Skeleton` placeholders show in the activity strip and streak positions while loading (UX-DR14).

**And** all dashboard server actions verify `session.user.role === 'PARENT'` and that the requested `ChildProfile.parentAccountId` matches the session's `parentAccountId`; mismatches return `{ error: { code: 'FORBIDDEN' } }` (NFR-8, NFR-10).

### Story 4.2: Skill Breakdown View & Skill Detail

As a parent,
I want to see how my child is doing per Skill and drill into any weak Skill in ≤ 3 taps,
So that I can identify exactly where they need more practice in under 30 seconds.

**Acceptance Criteria:**

**Given** the active Child Profile has attempted ≥ 5 Questions for a Skill,
**When** the skill summary section renders,
**Then** a `skill-badge-weak` ("Cần luyện", muted amber) shows for Skills with accuracy < 70%; a `skill-badge-strong` ("Tốt", muted green) for Skills ≥ 70% (FR-14).
**And** weak badges are sorted before strong badges.
**And** badges use `rounded-full` pill shape with both color and text label — never color alone (UX-DR9, UX-DR17).

**Given** a Skill has fewer than 5 attempts,
**When** the skill summary renders,
**Then** the Skill appears as "Chưa đủ dữ liệu" with no badge (FR-14, A-12).

**Given** I tap a Skill badge,
**When** the skill detail opens,
**Then** a `skill-detail-panel` (Sheet on ≤ md, push route on ≥ lg) shows: Skill name + accuracy % + badge, and the last 3 Sessions containing that Skill with per-session accuracy (e.g., "2/3 correct") (FR-14).

**And** a parent can identify the weakest Skill in ≤ 3 taps from dashboard open (FR-14).

**And** skill data is accessible only to the owning Parent Account server-side (NFR-8).

### Story 4.3: Grade Progress Indicator & Session History

As a parent,
I want to see my child's grade progress level and browse their complete Session history,
So that I have a full picture of where they stand and how they've been doing over time.

**Acceptance Criteria:**

**Given** the active Child Profile has completed Sessions,
**When** the dashboard renders,
**Then** a `grade-progress-indicator` shows: "Đang ở: Lớp [N], [label]" where label maps average Difficulty Level across all Skills to: "đầu kỳ" (1.0–2.0), "giữa kỳ" (2.1–3.5), "cuối kỳ" (3.6–5.0) (FR-15).
**And** tapping the indicator opens a `Popover` tooltip explaining the metric.

**Given** I navigate to the session history surface,
**When** the `session-history-list` renders,
**Then** the most recent 30 completed Sessions are shown by default; each row displays date + day-of-week, score chip (e.g., "8/10"), and Skill tags (FR-17).
**And** a "Xem thêm" pagination control loads the next 30 entries on tap.

**And** session history is sorted newest-first and is accessible only to the owning Parent Account server-side (NFR-8).

### Story 4.4: Free Tier Upsell Prompt on Dashboard

As a parent,
I want to see a non-intrusive banner when my child has exhausted today's free allotment with a link to subscription plans,
So that I can easily upgrade if I want to remove the daily limit.

**Acceptance Criteria:**

**Given** the active Child Profile is on the Free Tier and has exhausted today's allotment,
**When** the Parent Dashboard loads,
**Then** a dismissible `upsell-banner` appears above the weekly activity strip: "[Tên] đã dùng hết lượt miễn phí hôm nay 🌟 — Xem gói đăng ký →" (FR-16).
**And** the banner contains no pricing information — only a link to the plans page.

**Given** I dismiss the upsell banner,
**When** dismissed,
**Then** it disappears for the current day (dismissed state stored client-side); it reappears the following day if the profile is still Free Tier and allotment is exhausted.

**Given** the Child Profile has an active Subscription,
**When** the dashboard renders,
**Then** no upsell banner is shown (UX-DR14).

**And** the banner link navigates to `/(parent)/subscription/plans` (stub until Epic 6).

**And** no upsell content of any kind appears anywhere in `/(student)/` routes (FR-5).

### Story 4.5: Parent Dashboard Performance & All State Patterns

As a parent,
I want the dashboard to load quickly and handle all edge cases gracefully,
So that the experience is reliable regardless of network conditions or data state.

**Acceptance Criteria:**

**Given** I open the Parent Dashboard,
**When** the page first loads,
**Then** the initial load completes within 3 seconds (NFR-6).
**And** `Skeleton` placeholders show in the activity strip, skill badges, and grade progress indicator positions while loading (UX-DR14).

**Given** the Child Profile is in their first week of use,
**When** the dashboard renders,
**Then** only the current week's activity strip is shown with no prior-week comparison.

**Given** I lose network connectivity on the dashboard,
**When** connectivity drops,
**Then** a shadcn `Toast` fires once: "Không có kết nối. Dữ liệu có thể chưa cập nhật."; existing cached content stays readable (UX-DR14).

**Given** a dashboard data fetch fails,
**When** the error occurs,
**Then** an inline error card with a "Thử lại" retry CTA replaces the failed section; no empty-state is shown until retry succeeds (UX-DR14).

**And** the parent shell is fully responsive: bottom tab bar (≤ md), sidebar (≥ lg), content max-w-3xl on desktop (UX-DR12).

**And** all keyboard navigation is complete: Tab/Shift-Tab through all interactive elements; Enter activates focused button or link; Esc closes Sheets and Popovers (UX-DR19).

---

## Epic 5: Teacher Portal & Class Reports

A teacher can register, get approved, manage Classes with join codes, build Assignment Sets from the question library, assign them to Classes, and view per-student completion status plus class-average Skill accuracy in a Class Report. Active assignments appear on enrolled students' home screens.

### Story 5.1: Teacher Registration & Pending State

As a teacher,
I want to register an account and see a clear pending-approval screen while I wait,
So that I know my application was received and what to expect next.

**Acceptance Criteria:**

**Given** I am on `/register/teacher`,
**When** I submit name, school name, grade taught, and email,
**Then** a `User` (role: TEACHER) and `TeacherAccount` (status: PENDING) are created; I am redirected to a pending-state screen.

**Given** I log in after submitting registration with `TeacherAccount.status === 'PENDING'`,
**When** the signIn callback runs,
**Then** sign-in is rejected; I see a full-screen: "Tài khoản đang chờ xét duyệt. Chúng tôi sẽ thông báo qua email." with no portal content accessible (UX-DR15).

**Given** I log in after being REJECTED,
**When** the signIn callback runs,
**Then** sign-in is rejected with a message indicating rejection and the admin-provided reason; no portal access.

**And** all form inputs have associated `<label>` elements; errors are linked via `aria-describedby`.

**And** the registration server action returns `{ data: { success: true } } | { error: { code: string; message: string } }` — never throws.

### Story 5.2: Resend Email Adapter & Teacher Notification Emails

As a developer,
I want a single Resend email adapter and teacher approval/rejection email templates,
So that all outbound teacher notification email goes through one place with no direct SDK calls from surfaces.

**Acceptance Criteria:**

**Given** `src/infrastructure/email/resend.ts` exists,
**When** any server action needs to send email,
**Then** it calls the adapter — no `src/app/` or `src/domain/` code imports from the Resend SDK directly (AD-14).

**And** `sendTeacherApprovalEmail(to, name)` sends a confirmation email informing the teacher their account is approved and they can log in.

**And** `sendTeacherRejectionEmail(to, name, reason)` sends a rejection email with the provided reason.

**And** email functions return `{ data: { id: string } } | { error: { code: string } }`; failures are logged but do not throw to callers.

**And** email templates are React Email components in `src/infrastructure/email/templates/`; all Vietnamese copy is sourced from `src/locales/vi/`.

### Story 5.3: Teacher Portal Shell & Class Management

As an approved teacher,
I want to create and manage Classes with join codes so parents can enroll their children,
So that I have a roster of students to assign practice sets to.

**Acceptance Criteria:**

**Given** I am an APPROVED Teacher and log in,
**When** I reach `/(teacher)/`,
**Then** the teacher portal shell renders with sidebar navigation (collapsed icon-only at ≤ md, expanded at ≥ lg, per UX-DR12).
**And** every `/(teacher)/` layout and server action verifies both `session.user.role === 'TEACHER'` AND `TeacherAccount.status === 'APPROVED'` server-side — the JWT role alone is insufficient (AD-6).

**Given** I have no Classes yet,
**When** the portal home renders,
**Then** an empty state shows: "Tạo lớp học đầu tiên để bắt đầu." with a single primary CTA (UX-DR15).

**Given** I create a Class (name + grade),
**When** creation succeeds,
**Then** a `Class` record is created with a unique system-generated join code; a `class-card` appears on the portal home.

**Given** I view a Class detail with no students enrolled,
**When** the detail renders,
**Then** the `join-code-display` shows the join code prominently with a copy-to-clipboard button; "Lớp chưa có học sinh. Chia sẻ mã tham gia để thêm học sinh." is shown (UX-DR15).
**And** clicking the copy button copies the code to clipboard and changes the button label to "Đã sao chép ✓" for 2 seconds (UX-DR19).

**Given** a Parent Account uses a valid join code,
**When** they submit it via `/(parent)/profiles` (join class flow),
**Then** a `ClassMembership` record is created linking the `ChildProfile` to the `Class`.
**And** a Child Profile can be in at most one Class per Teacher Account (A-5).

**And** all Class server actions verify `TeacherAccount.status === 'APPROVED'` server-side (AD-6).

### Story 5.4: Assignment Set Builder

As an approved teacher,
I want to build an Assignment Set by selecting Questions from the library filtered by Grade Band and Skill,
So that I can create targeted practice for my class.

**Acceptance Criteria:**

**Given** I tap "Tạo bộ bài tập",
**When** the `assignment-set-builder` Sheet opens,
**Then** Step 1 renders fields: name (required), Grade Band selector, optional due date.

**Given** I advance to Step 2,
**When** the question browser loads,
**Then** Questions render as `question-library-row` components (text truncated to one line, Skill tag, Difficulty Level, checkbox); filterable by Skill and Grade Band; selected count shown in a sticky footer (UX-DR11).
**And** I can select between 1 and the admin-configured maximum (`GlobalConfig.SESSION_QUESTION_COUNT`) Questions (FR-20).

**Given** I advance to Step 3 and save as draft,
**When** the draft is saved,
**Then** an `AssignmentSet` record is created with no assigned Class; it appears on the portal home as a draft `assignment-set-card` (FR-20).

**And** if a network error occurs mid-step, the partially filled form is preserved on retry (UX-DR15).

**And** all builder server actions verify `TeacherAccount.status === 'APPROVED'` server-side (AD-6).

### Story 5.5: Assign to Class & Student Assignment Card

As an approved teacher,
I want to assign an Assignment Set to one or more Classes so enrolled students see it on their home screen,
So that my students receive targeted practice as a named option.

**Acceptance Criteria:**

**Given** I have a Draft Assignment Set and proceed to Step 3,
**When** I select one or more Classes and confirm,
**Then** the `AssignmentSet` is linked to those Classes; students in those Classes see the assignment card on their student home on next load (FR-21).

**Given** a Class already has an active Assignment Set,
**When** I try to assign another,
**Then** a confirmation dialog: "Lớp này đã có bộ bài tập đang giao. Thay thế?" — confirming replaces the active set (FR-21).

**Given** a Child Profile is in a Class with an active Assignment Set,
**When** the student home loads,
**Then** a second `student-home-card` renders below the primary CTA showing: assignment name, teacher display name, and due date if set (FR-6, UX-DR13).

**And** completing the Assignment Set records a `Session` against the `ChildProfile`; assigned Questions count toward the Free Tier daily allotment (A-1, FR-6).

**And** only the owning Teacher Account can assign or replace Assignment Sets for their Classes (AD-6).

### Story 5.6: Class Report

As an approved teacher,
I want to view a Class Report for any assigned Assignment Set showing completion and class-average Skill accuracy,
So that I can identify struggling students and weak Skills without manual aggregation.

**Acceptance Criteria:**

**Given** at least one student has completed the assigned Assignment Set,
**When** I open the Class Report,
**Then** a `class-report-table` shows one row per enrolled student: display name, completion status (checkmark or "—"), and per-Skill accuracy cells for Skills in the assignment (FR-22).

**Given** a student has not completed the Assignment Set,
**When** their row renders,
**Then** all Skill accuracy cells show "—"; completion status shows "—".

**Given** 0 students have completed,
**When** the report renders,
**Then** all rows show "—"; the class average row shows "Chưa có dữ liệu" (UX-DR15).

**And** a class average row is pinned at the bottom showing average Skill accuracy across completing students.

**And** individual student scores are never surfaced — only completion status and class-level aggregates (FR-22, NFR-11).

**And** the Class Report updates within 60 seconds of a student Session completion via Server Component re-render on navigation; no WebSocket or SSE in v1 (AD-8, NFR-7).

**And** column headers are sortable client-side: completion (complete-first / incomplete-first), Skill accuracy columns (low-first) (UX-DR19).

**And** the report is accessible only to the owning Teacher Account server-side (NFR-11).

### Story 5.7: Teacher Portal State Patterns & Approval Gate Hardening

As a developer,
I want all teacher portal edge-case state patterns implemented and the dual approval gate verified end-to-end,
So that the portal is robust against status changes, network failures, and security boundary crossings.

**Acceptance Criteria:**

**Given** an APPROVED Teacher's `TeacherAccount.status` is subsequently changed to `PENDING` or `REJECTED` by an admin,
**When** they make any subsequent request to `/(teacher)/` routes or server actions,
**Then** the server-side status check catches the change and redirects to the pending screen — the JWT role claim alone does not grant access (AD-6).

**And** teacher portal offline state: a shadcn `Toast` fires once on connectivity loss; assignment submission is disabled; browsing existing data is available (UX-DR15).

**And** load error on Class Report or Assignment Builder: an inline retry card appears; the assignment builder preserves draft state on a failed fetch (UX-DR15).

**And** full keyboard navigation across the teacher portal: Tab/Shift-Tab through all table rows and form fields; Enter fires the primary action on the focused element (UX-DR19).

---

## Epic 6: Subscription & Payments

A parent can view subscription plans, subscribe via MoMo through the PayOS-hosted flow, and have their Subscription activate within 10 seconds of payment confirmation (unlocking unlimited Sessions for all Child Profiles). A parent can view subscription status, cancel (end-of-period), and reactivate.

### Story 6.1: PayOS Payment Infrastructure & Webhook Handler

As a developer,
I want the PayOS adapter and HMAC-verified webhook handler implemented,
So that the subscription state machine is driven exclusively by verified payment events — never by client-side calls.

**Acceptance Criteria:**

**Given** `src/infrastructure/payment/payos.ts` exists,
**When** `initiatePayment({ orderId, amount, description, returnUrl, cancelUrl })` is called,
**Then** it creates a PayOS payment request using `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` and returns `{ checkoutUrl: string }` for the hosted MoMo flow; no card data passes through the server (NFR-12).

**Given** PayOS sends a webhook to `/api/payments/payos/webhook`,
**When** the handler receives a request,
**Then** the HMAC-SHA256 signature is verified using `PAYOS_CHECKSUM_KEY` before any DB mutation; an unverified request returns HTTP 400 with no DB changes (AD-9).

**And** on a verified `PAID` event: `Subscription.status` transitions `PENDING_PAYMENT → ACTIVE`; `Subscription.renewsAt` is set to 30 days from now.

**And** on a verified expiry event (or scheduled job trigger): `Subscription.status` transitions `ACTIVE → EXPIRED`.

**And** `Subscription.status` is never changed from any client-invoked server action — only from this webhook handler or a scheduled expiry job (AD-9).

**And** the webhook handler is idempotent: processing the same `orderId` twice does not create duplicate records or duplicate state transitions.

### Story 6.2: Subscription Plans Page

As a parent,
I want to view available subscription plans with pricing,
So that I can make an informed purchase decision.

**Acceptance Criteria:**

**Given** I tap the upsell banner link or navigate to `/(parent)/subscription/plans`,
**When** the plans page renders,
**Then** at least the monthly plan is shown as a `subscription-plan-card` with: price ("79,000 đ / tháng"), billing cycle, ≤ 3 bullet points, and a single "Đăng ký" CTA (FR-23, UX-DR11).

**Given** an annual plan is configured in `GlobalConfig`,
**When** the plans page renders,
**Then** the annual plan card renders below the monthly plan.

**And** the plans page is accessible from the `upsell-banner` link and from the Account nav item (FR-23).

**And** the page is protected by the PARENT role check server-side (NFR-10).

### Story 6.3: Subscribe via MoMo & Subscription Activation

As a parent,
I want to subscribe via MoMo and have my subscription activate immediately after payment so all my child profiles get unlimited sessions,
So that I don't have to log out and back in and my children can keep practicing.

**Acceptance Criteria:**

**Given** I tap "Đăng ký" on the monthly plan card,
**When** my tap is processed,
**Then** a `Subscription` record is created with `status: PENDING_PAYMENT`; I am redirected to the PayOS-hosted MoMo checkout URL (FR-24, NFR-12).

**Given** payment is confirmed by PayOS,
**When** the HMAC-verified webhook processes the `PAID` event,
**Then** `Subscription.status` is updated to `ACTIVE` within 10 seconds; all Child Profiles under my account gain unlimited Sessions without requiring re-login (FR-24).
**And** a subscription activation email is sent via `src/infrastructure/email/resend.ts` (AD-14).

**Given** payment fails or is cancelled at the MoMo checkout,
**When** I return to the app via the cancel URL,
**Then** my account remains on Free Tier; an error Toast shows: "Thanh toán không thành công. Vui lòng thử lại." (UX-DR14).

**And** on return from successful payment, the Parent Dashboard reflects the active subscription immediately (no upsell banner) and account settings shows the next billing date.

### Story 6.4: Subscription Management

As a parent,
I want to view my subscription status, cancel it (effective at period end), and reactivate it,
So that I have full billing control without contacting support.

**Acceptance Criteria:**

**Given** I navigate to `/(parent)/account` with an `ACTIVE` subscription,
**When** the account page renders,
**Then** I see: subscription status "Đang hoạt động", next billing date, and a "Hủy đăng ký" button (FR-25).

**Given** I tap "Hủy đăng ký" and confirm,
**When** cancellation is processed,
**Then** `Subscription.status` is set to `CANCELLED`; full access is retained until `renewsAt`; account settings shows: "Đã hủy — có hiệu lực đến [date]" + "Kích hoạt lại" CTA (FR-25, UX-DR14).

**Given** I tap "Kích hoạt lại" or "Đăng ký" again,
**When** the flow initiates,
**Then** a new PayOS payment flow launches (same as Story 6.3).

**And** the cancellation server action verifies `session.user.role === 'PARENT'` and that `Subscription.parentAccountId` matches the session; mismatches return `{ error: { code: 'FORBIDDEN' } }`.

---

## Epic 7: Admin Panel & Question Library

An admin can process the Teacher Account approval queue (approve / reject with reason, triggering notification emails), configure the global Session question count (5–30) and optional time limit, and manage the full Question library (create, edit, delete, image upload to Supabase Storage). The initial question corpus seed is loadable from prisma/fixtures/.

### Story 7.1: Admin Panel Foundation & Role Gate

As a developer,
I want the `/admin/` route group fully secured with a server-side ADMIN role gate and a working shell,
So that no non-admin user can ever access admin functionality regardless of URL knowledge.

**Acceptance Criteria:**

**Given** I am authenticated as an ADMIN and navigate to `/admin/`,
**When** the admin shell loads,
**Then** I see the admin panel with top navigation bar and links to: Teacher Approvals, Session Config, Question Library.

**Given** any request reaches any `/admin/` route or server action,
**When** the layout or action runs server-side,
**Then** `session.user.role === 'ADMIN'` is verified; any other role returns a 403 redirect to `/login` (AD-10).

**And** the admin shell renders as a single-column `max-w-2xl` layout (UX-DR12).

**And** all admin server actions return `{ data: T } | { error: { code: string; message: string } }` — never throw.

### Story 7.2: Teacher Account Approval Queue

As an admin,
I want to view pending teacher registrations and approve or reject each one,
So that only verified teachers get access to the Teacher Portal.

**Acceptance Criteria:**

**Given** I am on `/admin/teachers`,
**When** pending Teacher Account requests exist,
**Then** a list of `teacher-application-row` components renders, each showing: teacher name, school, grade taught, submitted date; with "Duyệt" and "Từ chối" action buttons (FR-26, UX-DR11).

**Given** no pending applications exist,
**When** the page renders,
**Then** an empty state shows: "Không có đơn đăng ký nào đang chờ." (UX-DR16).

**Given** I tap "Duyệt" and confirm,
**When** the action runs,
**Then** `TeacherAccount.status` is set to `APPROVED` immediately; `sendTeacherApprovalEmail()` is called; the row disappears from the queue (FR-26).

**Given** I tap "Từ chối", enter an optional rejection reason, and confirm,
**When** the action runs,
**Then** `TeacherAccount.status` is set to `REJECTED`; `sendTeacherRejectionEmail(reason)` is called; the row disappears (FR-26).

**And** approve/reject actions are idempotent — acting on an already-processed account returns `{ error: { code: 'ALREADY_PROCESSED' } }`.

**And** if offline, approve/reject buttons are disabled; a Toast fires once: "Không có kết nối." (UX-DR16).

### Story 7.3: Session Configuration Panel

As an admin,
I want to set the global session question count and optional time limit,
So that I can tune the practice experience without a code deploy.

**Acceptance Criteria:**

**Given** I am on `/admin/config`,
**When** the `session-config-form` renders,
**Then** it shows: a number input for question count (current value from `GlobalConfig.SESSION_QUESTION_COUNT`, valid range 5–30) and a toggle + minutes input for the optional per-session time limit (FR-27, UX-DR11).

**Given** I submit a valid question count (5–30),
**When** the save action runs,
**Then** `GlobalConfig.SESSION_QUESTION_COUNT` is updated; a Toast confirms: "Đã lưu. Cài đặt mới áp dụng cho buổi tiếp theo." (FR-27, UX-DR16).
**And** in-progress Sessions are not affected — only newly started Sessions use the new value (FR-27).

**Given** I submit a question count outside 5–30,
**When** the form validates,
**Then** an inline validation error appears before submission; the form is not submitted.

**Given** save fails due to a server error,
**When** the error occurs,
**Then** an inline error shows: "Lưu không thành công. Thử lại."; form values are preserved (UX-DR16).

**And** all form inputs have associated `<label>` elements; errors linked via `aria-describedby`.

### Story 7.4: Question Library CRUD & Image Upload

As an admin,
I want to create, edit, and delete Questions with optional image upload to Supabase Storage,
So that the question library can be maintained without code changes or database tools.

**Acceptance Criteria:**

**Given** I am on `/admin/questions`,
**When** the page renders,
**Then** I see a list of all Questions with: prompt (truncated), Skill, Grade Band, Difficulty Level, and Edit/Delete actions.

**Given** I create a new Question with prompt, 2–4 answer choices (JSON), correct answer, Skill, Grade Band, and Difficulty Level (1–5),
**When** I save,
**Then** a `Question` record is created; the question appears in the list immediately (AD-12).

**Given** I upload an image during create or edit,
**When** the upload completes via `src/infrastructure/storage/supabase-storage.ts`,
**Then** the file is stored in the Supabase Storage public bucket; the returned CDN URL is stored in `Question.imageUrl` (AD-13).
**And** `Question.imageUrl` is always a fully-qualified CDN URL or `null` — never a relative path or blob URL.
**And** images are served directly from the CDN URL in the student surface; no proxying through the Next.js server (AD-13).

**Given** I delete a Question,
**When** I confirm deletion,
**Then** the `Question` record is deleted; historical `SessionAnswer` records referencing it are preserved.

**And** no `src/app/` code imports from the Supabase Storage SDK directly — all uploads route through `src/infrastructure/storage/supabase-storage.ts` (AD-13).

### Story 7.5: Initial Question Corpus Seed

As a developer,
I want a structured fixture-based seed that loads a usable question corpus into the database,
So that the practice flow works out-of-the-box in staging and production without manual data entry.

**Acceptance Criteria:**

**Given** `prisma/fixtures/` contains structured JSON fixture files,
**When** `prisma db seed` is run,
**Then** all `Skill` and `Question` records from fixtures are upserted without errors; running seed twice is idempotent (AD-12).

**And** the seed contains at least 5 Questions per `GradeBand × Skill × difficultyLevel` combination — 3 Grade Bands × 4 Skills minimum × 5 Difficulty Levels = ≥ 60 seed questions (A-13).

**And** each fixture `Question` has: `prompt` (Vietnamese text), `choices` (JSON array of 2–4 options), `correctAnswer`, `skillCode`, `gradeBand`, `difficultyLevel`; `imageUrl` is `null` for all seed questions.

**And** `prisma/seed.ts` upserts `Skill` records by `code` first, then upserts `Question` records; no hard-coded IDs anywhere.

**And** seeding runs automatically in the staging deploy pipeline; it is opt-in (not auto-run) in production.
