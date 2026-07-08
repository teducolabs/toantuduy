---
stepsCompleted: ['step-01-document-discovery', 'step-02-prd-analysis', 'step-03-epic-coverage-validation', 'step-04-ux-alignment', 'step-05-epic-quality-review', 'step-06-final-assessment']
documentsSelected:
  prd: 'prds/prd-toantuduy-2026-07-08/prd.md'
  prd_addendum: 'prds/prd-toantuduy-2026-07-08/addendum.md'
  architecture: 'architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md'
  epics: 'epics.md'
  ux_design: 'ux-designs/ux-toantuduy-2026-07-08/DESIGN.md'
  ux_experience: 'ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md'
---

# Implementation Readiness Assessment Report

**Date:** 2026-07-08
**Project:** ToanTuDuy

---

## PRD Analysis

### Functional Requirements

FR-1: A Student can start a Session that presents Questions sequentially until the admin-configured question count is reached.
FR-2: Each Question is displayed with its prompt (text and/or image) and answer choices in a Grade Band–appropriate visual layout. The student taps or clicks one answer to submit.
FR-3: After a student submits an answer, the system immediately shows whether the answer was correct or incorrect, and reveals the correct answer if the student was wrong.
FR-4: On completion of all Questions in a Session, the system displays a Session Summary showing: total Questions, correct count, and per-Skill outcome for all Skills encountered in the Session.
FR-5: A Free Tier Child Profile has an admin-configurable daily Question allotment (default: 5). Once exhausted, the student sees a friendly end-of-allotment message. No subscription upsell or pricing information appears in the student surface.
FR-6: If a Child Profile's Class has an active Assignment Set, the Assignment Set appears as a named practice option on the student's home screen. Assigned Questions count toward the daily Free Tier allotment.
FR-7: The system records, per Child Profile and per Skill, the running accuracy (correct / total attempts) across all completed Sessions.
FR-8: When building a Session, the system selects Questions at a Difficulty Level matching the Child Profile's recent per-Skill accuracy. Higher accuracy → higher Difficulty Level; Lower accuracy → lower Difficulty Level.
FR-9: The system weights Question selection toward Skills where the Child Profile's accuracy is lower, within the configured session question count.
FR-10: A parent can register a Parent Account with an email address and password. Email verification is required before the account is active.
FR-11: A Parent Account can create one or more Child Profiles, each with a display name and a Grade Band (1, 2, or 3). The parent can rename or delete any Child Profile at any time. Grade Band can be changed; historical Session data is preserved.
FR-12: From the parent-facing surface, a parent can switch the active Child Profile without re-authenticating the Parent Account.
FR-13: The Parent Dashboard shows, for the selected Child Profile: number of Sessions completed in the current week, visual indicator of which days practice occurred, and the current Streak.
FR-14: The Parent Dashboard shows per-Skill accuracy for the selected Child Profile, categorized as "Tốt" (≥70%) or "Cần luyện" (<70%). Skill appears after ≥5 Questions attempted; needs-practice Skills sorted first; tapping a Skill shows last 3 Sessions with that Skill.
FR-15: The Parent Dashboard shows a high-level indicator of where the Child Profile's current average Difficulty Level sits within the Grade Band progression (đầu kỳ / giữa kỳ / cuối kỳ).
FR-16: When a Free Tier Child Profile has exhausted its daily Question allotment, the Parent Dashboard displays a prompt with a link to Subscription plans. No upsell content appears in the student surface.
FR-17: The Parent Dashboard provides a scrollable history of completed Sessions for the selected Child Profile, showing date, score (correct / total), and Skills covered per Session.
FR-18: A teacher submits a Teacher Account registration (name, school name, grade taught, email). The account is "pending" until an admin approves or rejects it. The teacher is notified by email on either outcome.
FR-19: An approved Teacher Account can create one or more Classes, each with a name and grade. Each Class has a unique system-generated join code. A Parent Account can join a Class on behalf of a Child Profile using the join code.
FR-20: An approved Teacher Account can create an Assignment Set by selecting Questions from the question library, filtered by Grade Band and Skill. The Assignment Set has a name and optional due date, saved as a draft until assigned.
FR-21: An approved Teacher Account can assign an Assignment Set to one or more of their Classes. A Class may have at most one active Assignment Set at a time.
FR-22: An approved Teacher Account can view a Class Report for any assigned Assignment Set showing: per-student completion status and class-average accuracy per Skill for students who completed.
FR-23: A Parent Account can view available Subscription plans (monthly, and annual if offered) with pricing on a dedicated plans page.
FR-24: A Parent Account can complete a subscription purchase via available payment method(s). Subscription activates immediately upon payment confirmation.
FR-25: A Parent Account can view current subscription status (active/cancelled, next billing date), cancel their Subscription, and reactivate a cancelled Subscription.
FR-26: An admin can view all pending Teacher Account requests and approve or reject each, triggering a notification email to the teacher.
FR-27: An admin can set the global session question count (range: 5–30 inclusive) and optionally a per-session time limit (in minutes) or disable it. Changes apply to newly started Sessions only.

**Total FRs: 27**

---

### Non-Functional Requirements

NFR-ACC-1: All interactive elements in the Student Practice Interface have touch targets ≥ 44×44px.
NFR-ACC-2: Navigation in the student surface uses icons with labels — not text-only — throughout.
NFR-ACC-3: No student-facing navigation element requires reading ability beyond Grade 1 Vietnamese.
NFR-PERF-1: Questions load and render within 2 seconds on a 4G mobile connection.
NFR-PERF-2: Session Summary renders within 1 second of the final answer submission.
NFR-PERF-3: Parent Dashboard initial load completes within 3 seconds.
NFR-PERF-4: Class Report updates within 60 seconds of a student Session completion.
NFR-PRIV-1: Child Profile learning data (Session history, accuracy, Skill breakdown) is accessible only to the owning Parent Account and, in aggregated/completion-only form, to the linked Teacher Account's Class Report.
NFR-PRIV-2: No third-party advertising, analytics, or tracking SDKs are embedded in the student-facing surface.
NFR-PRIV-3: Child Profile data is not shared with third parties.
NFR-SEC-1: Parent Account authentication is required before any Child Profile data is accessible.
NFR-SEC-2: Teacher Accounts access only Class-level aggregates and completion status — not individual student scores from Child Profiles outside their Class.
NFR-SEC-3: Payment processing uses the payment provider's hosted flow; ToanTuDuy systems store no card data.

**Total NFRs: 13**

---

### Additional Requirements / Constraints

- Question library must cover Grades 1–3, logic puzzles + word problems, tagged by Skill and Grade Band.
- Provisional question library floor: ≥50 Questions per Grade Band × Skill × Difficulty Level cell (A-13; content lead to validate).
- Streak: consecutive calendar days with at least one completed Session; resets to 0 if a day passes with no Session.
- Weekly current period = Monday–Sunday in Asia/Ho_Chi_Minh timezone.
- Deleted Child Profile Session history retained for 30 days before permanent deletion (A-3).
- Adaptive Difficulty engine operates within Grade Band only; Grade Band does not auto-advance.
- MoMo is the v1 payment method; ZaloPay and bank transfer are post-v1.
- Admin Panel is internal-only; not accessible to any end user.

### PRD Completeness Assessment

The PRD is well-structured and comprehensive. 27 numbered FRs with testable consequences, 13 NFRs, explicit non-goals, success metrics, and assumptions index. Open questions are clearly flagged. The PRD is ready for coverage validation against epics.

---

## Epic Coverage Validation

### Coverage Matrix

| FR | PRD Requirement (summary) | Epic | Story | Status |
|---|---|---|---|---|
| FR-1 | Start session — sequential Questions, admin-configured count, Free Tier gate | Epic 3 | 3.3 | ✓ Covered |
| FR-2 | Display question with prompt + 2–4 answer choices, immediate tap-to-submit | Epic 3 | 3.4 | ✓ Covered |
| FR-3 | Immediate post-answer feedback within 500ms, correct answer revealed if wrong | Epic 3 | 3.5 | ✓ Covered |
| FR-4 | Session Summary: total Qs, correct count, per-Skill outcome | Epic 3 | 3.6 | ✓ Covered |
| FR-5 | Free Tier daily Question allotment gate; no upsell in student surface | Epic 3 | 3.3, 3.6 | ✓ Covered |
| FR-6 | Teacher-assigned sessions on student home screen; count toward allotment | Epic 5 | 5.5 | ✓ Covered |
| FR-7 | Per-Skill accuracy tracking (completed Sessions only) | Epic 3 | 3.2, 3.6 | ✓ Covered |
| FR-8 | Difficulty-adjusted question selection per per-Skill accuracy history | Epic 3 | 3.1, 3.2 | ✓ Covered |
| FR-9 | Skill weighting toward weak areas | Epic 3 | 3.1 | ✓ Covered |
| FR-10 | Parent account registration with email verification | Epic 1 | 1.4 | ✓ Covered |
| FR-11 | Create/manage/delete Child Profiles; Grade Band change; 30-day history retention | Epic 2 | 2.1 | ✓ Covered |
| FR-12 | Switch active Child Profile without re-authenticating | Epic 2 | 2.2 | ✓ Covered |
| FR-13 | Weekly activity summary + streak | Epic 4 | 4.1 | ✓ Covered |
| FR-14 | Skill breakdown: Tốt/Cần luyện, ≥5Q threshold, sorted, tap to last-3-Sessions | Epic 4 | 4.2 | ✓ Covered |
| FR-15 | Grade progress indicator (đầu kỳ / giữa kỳ / cuối kỳ) | Epic 4 | 4.3 | ✓ Covered |
| FR-16 | Upsell prompt on Parent Dashboard when allotment exhausted; none in student surface | Epic 4 | 4.4 | ✓ Covered |
| FR-17 | Scrollable Session history (30 default, pagination) with date, score, Skills | Epic 4 | 4.3 | ✓ Covered |
| FR-18 | Teacher registration, pending state, approval/rejection email notification | Epic 5 | 5.1, 5.2 | ✓ Covered |
| FR-19 | Class management with unique join codes; Child Profile joins via code; 1-class-per-teacher cap | Epic 5 | 5.3 | ✓ Covered |
| FR-20 | Assignment Set creation (question library filter, name, due date, draft save) | Epic 5 | 5.4 | ✓ Covered |
| FR-21 | Assign Assignment Set to Class; one active set per Class; confirmation to replace | Epic 5 | 5.5 | ✓ Covered |
| FR-22 | Class Report: per-student completion + class-average Skill accuracy; no individual scores | Epic 5 | 5.6 | ✓ Covered |
| FR-23 | Subscription plans page (monthly + annual if configured) accessible from upsell + settings | Epic 6 | 6.2 | ✓ Covered |
| FR-24 | Subscribe via MoMo/PayOS; activation within 10s; all Child Profiles unlock; no re-login | Epic 6 | 6.1, 6.3 | ✓ Covered |
| FR-25 | Subscription management: view status, cancel (end-of-period), reactivate | Epic 6 | 6.4 | ✓ Covered |
| FR-26 | Admin: view pending teacher queue, approve/reject with reason, trigger email | Epic 7 | 7.1, 7.2 | ✓ Covered |
| FR-27 | Admin: session question count (5–30) + optional time limit; applies to new Sessions only | Epic 7 | 7.3 | ✓ Covered |

### Missing Requirements

**None.** All 27 Functional Requirements are covered by at least one Epic and Story.

### NFR Coverage

| NFR | Requirement | Coverage | Status |
|---|---|---|---|
| NFR-ACC-1 | Touch targets ≥ 44×44px | Story 3.4, 3.8; UX-DR17 | ✓ Covered |
| NFR-ACC-2 | Icon + text labels in student surface | Story 3.8; UX-DR8, UX-DR17 | ✓ Covered |
| NFR-ACC-3 | No reading above Grade 1 Vietnamese | Story 3.8; UX-DR17 | ✓ Covered |
| NFR-PERF-1 | Questions render ≤ 2s on 4G | Story 3.4 | ✓ Covered |
| NFR-PERF-2 | Session Summary ≤ 1s after final answer | Story 3.6 | ✓ Covered |
| NFR-PERF-3 | Parent Dashboard initial load ≤ 3s | Story 4.5 | ✓ Covered |
| NFR-PERF-4 | Class Report + weekly summary update ≤ 60s | Story 4.1, 5.6 | ✓ Covered |
| NFR-PRIV-1 | Child Profile data: parent-only + teacher aggregates only | Stories 4.1–4.5, 5.6 | ✓ Covered |
| NFR-PRIV-2 | No third-party ad/analytics/tracking SDKs in student surface | UX-DR10; implicitly enforced via architecture | ✓ Covered |
| NFR-PRIV-3 | Child Profile data not shared with third parties | Architecture/infrastructure constraints | ✓ Covered |
| NFR-SEC-1 | Parent auth required before Child Profile data is accessible | Stories 1.3, 2.1, 4.1 (role gate) | ✓ Covered |
| NFR-SEC-2 | Teacher sees only class-level aggregates, not individual scores | Story 5.6 | ✓ Covered |
| NFR-SEC-3 | Payment via hosted flow; no card data stored | Story 6.1 | ✓ Covered |

### Coverage Statistics

- **Total PRD FRs:** 27
- **FRs covered in Epics:** 27
- **FR Coverage:** 100%
- **Total PRD NFRs:** 13
- **NFRs addressed in Epics:** 13
- **NFR Coverage:** 100%

---

## UX Alignment Assessment

### UX Document Status

**Found** — `DESIGN.md` (16.4 KB) and `EXPERIENCE.md` (28.3 KB) in `ux-designs/ux-toantuduy-2026-07-08/`. Both marked status `final`, created 2026-07-08. Three HTML mockups also present.

### UX ↔ PRD Alignment

| Area | Status | Notes |
|---|---|---|
| All 4 User Journeys (UJ-1 to UJ-4) represented in EXPERIENCE.md IA | ✓ Aligned | Student, Parent, Teacher, Admin IA surfaces map to all UJ scenarios |
| All 27 FRs reflected in UX component/state/interaction patterns | ✓ Aligned | Every FR consequence is traceable to a UX behavioral spec |
| Accessibility NFRs (44×44px, icon+text, Grade 1 reading) | ✓ Aligned | Accessibility Floor section in EXPERIENCE.md matches PRD NFR-ACC-1/2/3 exactly |
| Performance NFRs (2s question, 1s summary, 3s dashboard, 60s report) | ✓ Aligned | State pattern loading skeletons and timing specs match PRD NFR-PERF-1/2/3/4 |
| Privacy — no individual scores to teacher | ✓ Aligned | Class report table explicitly shows only completion status + class averages |
| No upsell in student surface | ✓ Aligned | Free tier gate card spec explicitly excludes pricing and subscription mention |
| Weekly activity strip day-tap shows sessions | ⚠ Extension | EXPERIENCE.md adds "Tap a day → shows session(s)" — this is beyond FR-13's text but not a contradiction. No story explicitly covers it. Low risk; can be added to Story 4.1 or deferred. |
| No session row tap interaction (v1) | ✓ Aligned | EXPERIENCE.md explicitly defers session row detail to v2 — consistent with PRD scope |

### UX ↔ Architecture Alignment

| Area | Status | Notes |
|---|---|---|
| No native app — web only | ✓ Aligned | Both UX and Architecture confirm Next.js web, mobile-responsive |
| Supabase Storage CDN for images; no Next.js proxying | ✓ Aligned | UX question-card CDN URL requirement matches AD-13 |
| Signed httpOnly child-profile cookie | ✓ Aligned | UX student surface entry matches AD-5 |
| Server Component re-render on navigation (no SSE/WebSocket) for Class Report | ✓ Aligned | UX ≤60s row update matches AD-8 |
| Admin Question Library surface | ⚠ Minor gap | EXPERIENCE.md Admin IA table only lists 2 admin surfaces; Question Library (Story 7.4) is in DESIGN.md components and epics but absent from EXPERIENCE.md IA table. No functional risk — the component specs and story exist. |
| Web Speech API for audio (vi-VN) | ⚠ Not in Architecture | EXPERIENCE.md + Story 3.8 specify Web Speech API for TTS. Architecture Spine does not call this out as an architectural decision. No blockers expected (browser-native API, no infrastructure), but worth documenting as a tech dependency. |

### Warnings

1. **⚠ Day-tap on weekly activity strip** — UX specifies tapping a calendar day shows session(s) from that day. FR-13 does not include this, and no epic story covers it. If implemented, it can be handled as an extension to Story 4.1. If skipped, the activity strip is still read-only (days are visual indicators only), which is a valid MVP interpretation. Recommend PM clarification before Story 4.1 implementation.

2. **⚠ Join code regeneration** — EXPERIENCE.md component table for `join-code-display` states "Teacher can regenerate (invalidates old code)" but no FR or Epic Story covers this. Not a blocking gap for MVP, but should be captured as a story addendum or open item for Epic 5.

3. **⚠ Web Speech API (TTS) not in Architecture Spine** — Used in Story 3.8 for audio playback. Browser-native, no infrastructure impact. Should be noted in project-context.md as a tech dependency to avoid surprises during implementation.

---

## Epic Quality Review

### User Value Focus

| Epic | User Value Statement | Assessment |
|---|---|---|
| Epic 1: Project Foundation & Parent Authentication | "A parent can register, verify email, and log in to a deployed application." | ✓ User value clear. "Project Foundation" in title is technical but description is user-centric. Acceptable for Epic 1. |
| Epic 2: Child Profile Management | "A parent can create, switch, rename, change grade, and delete Child Profiles." | ✓ User-centric |
| Epic 3: Student Practice Interface & Adaptive Difficulty | "A student can start a daily Session, answer Questions with feedback, see Session Summary." | ✓ User-centric |
| Epic 4: Parent Dashboard | "A parent can see weekly activity, Skill breakdown, grade progress, and Session history." | ✓ User-centric |
| Epic 5: Teacher Portal & Class Reports | "A teacher can register, manage Classes, build Assignment Sets, view Class Reports." | ✓ User-centric |
| Epic 6: Subscription & Payments | "A parent can subscribe via MoMo, have Subscription activate within 10s, cancel, and reactivate." | ✓ User-centric |
| Epic 7: Admin Panel & Question Library | "An admin can approve teachers, configure session settings, and manage the Question library." | ✓ User-centric |

**Result: No purely technical epics. All 7 epics deliver user value.** ✓

---

### Epic Independence Validation

| Epic | Depends On | Forward Stubs? | Assessment |
|---|---|---|---|
| Epic 1 | None | Stubs for teacher/admin redirects (Story 1.5) | ✓ Standalone; stubs acknowledged |
| Epic 2 | Epic 1 | Assignment card stub (Story 2.3) | ✓ Functions on Epic 1; stub acknowledged |
| Epic 3 | Epics 1, 2 | None | ✓ Sequential dependency correct |
| Epic 4 | Epics 1, 2, 3 (data) | Plans page link stub (Story 4.4) | ✓ Dashboard renders; stub is acknowledged |
| Epic 5 | Epics 1, 2, 3 | None | ✓ Sequential dependency correct |
| Epic 6 | Epics 1, 2 | None | ✓ Subscription is independent of Epic 5 |
| Epic 7 | Epic 1 | None | ✓ Admin panel is independent of Epics 3–6 |

**Result: No circular dependencies. Epic chain is correct.** ✓

---

### Story Quality Assessment

#### Acceptance Criteria Format
All stories use Given/When/Then BDD format. Error paths are covered in all auth and payment stories. No stories use vague criteria like "user can login."

#### Story Sizing
- Stories 1.1–1.3 are large but appropriate as foundational setup stories within Epic 1.
- All remaining stories are appropriately scoped to a single deliverable.
- Developer-facing stories (3.1 adaptive difficulty use case; 5.2 email adapter) are valid and follow infrastructure-first ordering within their epic.

---

### Dependency Analysis

#### Database Creation Timing

**🟠 MAJOR — Story 1.2 creates all 13 entities upfront**

Story 1.2 ("Complete Prisma Schema & Database Infrastructure") creates all 13 tables: `User`, `ParentAccount`, `ChildProfile`, `Subscription`, `TeacherAccount`, `Class`, `ClassMembership`, `Skill`, `Question`, `Session`, `SessionAnswer`, `AssignmentSet`, `AssignmentSetQuestion`, `GlobalConfig`.

Per best practices, each story should create only the tables it needs. This violates the "tables when needed" principle.

**Story justification:** An explicit note in Story 1.2 states this is intentional: *"All 13 entities are created here because they are fully specified in the Architecture Spine with explicit relations; creating them all at once prevents inter-epic migration conflicts."*

**Assessment:** Deviation is architecturally justified (FK constraints across entities would require migration ordering across epics if split). The risk of not splitting is that Schema changes in later stories may require additional migrations. The risk of splitting is greater: broken FK chains during development. **Accepted as a justified deviation for this architecture.**

---

### Critical Violations

**None found.**

---

### Major Issues

#### 🟠 MAJOR-1: Skill Enumeration Not Formally Defined ~~— RESOLVED 2026-07-08~~

**✅ RESOLVED.** The canonical v1 Skill list has been added to:
- **PRD Addendum** (`prds/prd-toantuduy-2026-07-08/addendum.md` — "v1 Skill Enumeration" section)
- **Epics** (`epics.md` — Additional Requirements section)

**Four Skills defined:**

| `code` | `name` (vi) | Category |
|---|---|---|
| `pattern-recognition` | Nhận diện quy luật | Logic puzzle |
| `spatial-reasoning` | Suy luận không gian | Logic puzzle |
| `classification` | Phân loại | Logic puzzle |
| `word-problem` | Đọc hiểu bài toán | Word problem |

Stories 3.1, 7.4, and 7.5 are now unblocked. Epic 7 / content sprint may proceed.

#### 🟠 MAJOR-2: All DB Tables Created Upfront (Story 1.2)

Already documented above. Justified deviation — not a blocker, but noted.

---

### Minor Concerns

#### 🟡 MINOR-1: Story 1.1 Scope is Very Large

Story 1.1 ("Initialize Next.js Monorepo & Design System Foundation") covers: full directory scaffold, all design tokens, both Google Fonts, custom border-radius scale, Zod env validation, TypeScript strict mode check, and pnpm build pass. This is 6–8 hours of work minimum.

**Recommendation:** Consider splitting into 1.1a (scaffold + auth config + env validation) and 1.1b (design tokens + typography + build validation) to reduce PR review risk. Not a blocker for current structure.

#### 🟡 MINOR-2: Weekly Activity Day-Tap Not in Any Story

EXPERIENCE.md states: "Tap on a day shows session(s) from that day." No FR (FR-13 says "visual indicator of which days practice occurred") and no Story 4.1 AC covers this behavior.

**Recommendation:** Either add this as an explicit AC to Story 4.1 if in scope for v1, or formally defer to v2 with a note in the epics.

#### 🟡 MINOR-3: Join Code Regeneration Not in Any Story

EXPERIENCE.md `join-code-display` component states: "Teacher can regenerate (invalidates old code)." No FR and no story cover this. It's a user-facing feature implied by the UX document.

**Recommendation:** Add a brief story or AC addendum to Story 5.3. Without it, the join code regeneration UI will be implemented without a backed story, making it invisible to planning/QA.

#### 🟡 MINOR-4: NFR-PRIV-2 Not in Any Story AC

NFR-PRIV-2 requires "No third-party advertising, analytics, or tracking SDKs embedded in the student-facing surface." No story acceptance criterion explicitly tests for this. UX-DR10 prohibits external links from student surface, which partially covers it, but SDK presence is a build-level concern.

**Recommendation:** Add a single explicit AC to Story 3.3 or Story 2.2: "No third-party analytics, advertising, or tracking SDK scripts are loaded on any `/(student)/` route (verified via build analysis or network panel inspection)."

#### 🟡 MINOR-5: Story 5.3 / Story 5.7 Approval Gate AC Overlap

Story 5.3 includes the AC: "every /(teacher)/ layout and server action verifies both session.user.role === 'TEACHER' AND TeacherAccount.status === 'APPROVED' server-side." Story 5.7 also verifies this gate end-to-end. Minor duplication — not a blocker, but reviewers should be aware both stories touch this boundary.

#### 🟡 MINOR-6: Web Speech API Not in Architecture Spine

(Already documented in UX Alignment section.)

---

### Quality Compliance Checklist Summary

| Check | Result |
|---|---|
| All Epics deliver user value | ✓ Pass |
| No technical-only epics | ✓ Pass |
| No circular epic dependencies | ✓ Pass |
| Epic chain is sequential and correct | ✓ Pass |
| All stories use Given/When/Then ACs | ✓ Pass |
| Error conditions covered in critical stories | ✓ Pass |
| FR traceability maintained | ✓ Pass (100% FR coverage) |
| DB creation timing | ⚠ Justified deviation |
| Skill enumeration defined | ❌ Missing — blocks content sprint |
| All UX behaviors covered in story ACs | ⚠ 3 minor gaps (day-tap, join code regen, NFR-PRIV-2) |

---

## Summary and Recommendations

### Overall Readiness Status

## ✅ READY

**Ready to begin implementation on all Epics.** The Skill Enumeration gap (MAJOR-1) has been resolved. Three minor story gaps should be addressed before the affected sprints but are not blockers.

---

### Issue Summary

| ID | Severity | Issue | Blocking? |
|---|---|---|---|
| ~~MAJOR-1~~ | ✅ Resolved | Skill enumeration defined in PRD Addendum + epics.md | No longer blocking |
| MAJOR-2 | 🟠 Major | All 13 DB tables created in Story 1.2 (deviates from "tables when needed") | No — justified deviation |
| MINOR-1 | 🟡 Minor | Story 1.1 is very large (full scaffold + design tokens + env validation) | No |
| MINOR-2 | 🟡 Minor | Weekly activity day-tap (EXPERIENCE.md) not in Story 4.1 ACs | No — scope question |
| MINOR-3 | 🟡 Minor | Join code regeneration (EXPERIENCE.md) not in any story | No — missing story |
| MINOR-4 | 🟡 Minor | NFR-PRIV-2 (no third-party SDKs in student surface) not in any story AC | No |
| MINOR-5 | 🟡 Minor | Story 5.3/5.7 overlap on teacher approval gate ACs | No |
| MINOR-6 | 🟡 Minor | Web Speech API (TTS) not documented in Architecture Spine | No |

---

### Critical Actions Before Implementation Starts

**✅ MAJOR-1 (Skill Enumeration) has been resolved.** No remaining blockers before sprint start.

---

### Recommended Next Steps

1. **✅ Proceed with Epic 1** — No blockers. Story 1.1 is large but well-specified. Consider splitting 1.1 into scaffold (1.1a) and design tokens (1.1b) if the team prefers smaller PRs.

2. **✅ Proceed through Epics 2–6 sequentially** — No blockers. The 100% FR coverage and tight Architecture alignment mean the implementation stories are well-specified and ready.

3. **📋 Resolve Skill Enumeration before Epic 7 sprint planning** — PM + content lead action. Define and document the canonical Skill list (code + Vietnamese display name). Block Story 7.5 sprint planning until this is done.

4. **📋 Clarify weekly activity day-tap scope (MINOR-2)** — PM decision: is "tap a day to see sessions" in v1 scope or deferred to v2? Update Story 4.1 ACs accordingly before the Epic 4 sprint.

5. **📋 Add join code regeneration story (MINOR-3)** — Add to Epic 5 as Story 5.3a or an AC extension to Story 5.3 before the Epic 5 sprint. The UX document specifies this behavior explicitly.

6. **📋 Add NFR-PRIV-2 AC to Story 2.2 or 3.3 (MINOR-4)** — A single AC: "No third-party analytics, advertising, or tracking SDK is loaded on any `/(student)/` route." Add before Epic 3 sprint.

7. **📋 Document Web Speech API in project-context.md (MINOR-6)** — Add to the Technology Stack section: "Audio playback: Web Speech API (browser-native, `vi-VN` voice) — no infrastructure required."

---

### Strengths of the Planning Artifacts

- **100% FR coverage** — All 27 Functional Requirements and all 13 NFRs are addressed in Epics and Stories
- **Strong architecture alignment** — Every architectural decision (AD-1 through AD-14) is reflected in at least one story's acceptance criteria
- **Clear BDD acceptance criteria** — Every story uses testable Given/When/Then format with error paths covered
- **Explicit non-goals and assumptions** — PRD open questions and assumptions index prevent scope creep
- **UX–PRD–Architecture traceability** — All three design documents cross-reference each other consistently
- **Layer architecture enforcement** — Architecture Spine constraints are reflected in story ACs throughout, not just in Epic 1

---

### Final Note

This assessment identified **8 issues** across **2 severity categories**: 2 Major, 6 Minor. There are no Critical blockers. The planning artifacts are comprehensive, well-aligned, and ready to support implementation.

The **one action that must complete before the Epic 7 / content sprint** is defining the canonical Skill enumeration. All Epics 1–6 can proceed immediately.

---

*Assessment completed: 2026-07-08*
*Assessor: AI Implementation Readiness Review*
*Report: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-07-08.md`*
