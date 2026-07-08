---
title: "ToanTuDuy — Math Reasoning Practice for Vietnamese Primary Students"
status: done
created: 2026-07-08
updated: 2026-07-08
---

# PRD: ToanTuDuy

## 0. Document Purpose

This PRD is for the product manager, downstream workflow owners (UX, architecture, engineering), and stakeholders making scope or prioritization decisions on ToanTuDuy v1. It defines what the product does — not how it is built. All Glossary terms are used verbatim throughout; introducing a synonym elsewhere is a discipline violation.

Source inputs: Product Brief (`brief.md`) and Brief Addendum (`addendum.md`), both dated 2026-07-08. UX design and architecture are downstream of this PRD; it does not duplicate technical decisions. Technical stack notes (Next.js, platform rationale) and competitive landscape detail live in the PRD Addendum (`addendum.md` in this folder).

---

## 1. Vision

ToanTuDuy is a daily math reasoning practice tool for Vietnamese primary school students in grades 1–3 (ages 6–9). It trains the cognitive layer beneath arithmetic — reading a problem, reasoning step by step, recognizing patterns — not rote calculation. Students practice through short daily Sessions of logic puzzles and contextualized word problems that adjust in Difficulty Level based on their results.

Parents are the buyers. They need visibility not just into completion ("did my child do it?") but into where the child actually struggles — which Skills are weak, how progress tracks against grade expectations. ToanTuDuy's Parent Dashboard answers "where is my child struggling?" in under 30 seconds.

Teachers are the growth channel. They get the Teacher Portal for free: assign practice sets to their class, see real-time completion and per-Skill class averages. When the feedback loop between homework and teacher visibility is closed, teachers refer ToanTuDuy to parents in their class. In 2–3 years, ToanTuDuy becomes the default standard for primary school math reasoning in Vietnam — the tool teachers recommend and parents seek out in place of a private reasoning tutor.

---

## 2. Target User

### 2.1 Jobs To Be Done

**Students (Grade 1–3, ages 6–9)**
- Complete a short daily practice that feels like a puzzle, not homework
- Get immediate feedback after each answer to understand whether they were right
- Encounter Questions at a Difficulty Level that feels challenging but not frustrating

**Parents**
- Know whether their child is building math reasoning ability — not just "clicking through"
- Identify the specific Skill areas where their child needs more practice
- Understand where their child stands relative to their Grade Band's expected progression
- Pay once (Subscription) and not worry about it again

**Teachers**
- Assign targeted practice to students without creating it by hand
- Know, by the next morning, which students completed last night's assignment and which did not
- See which Skills a class-wide segment of students is struggling with — without manual aggregation

### 2.2 Non-Users (v1)

- Students in grades 4–5 (v2 expansion)
- School or district administrators (no institutional purchase flow in v1)
- Students or parents outside Vietnam (product is in Vietnamese; content aligns to the Vietnamese national primary curriculum)

### 2.3 Key User Journeys

**UJ-1. Minh completes today's practice after dinner.**
- **Persona + context:** Minh, 7 years old, Grade 2. His mother set up his Child Profile last week.
- **Entry state:** Parent Account is authenticated (mother logged in, Minh's Child Profile selected). Minh opens the app on a tablet browser.
- **Path:** He taps "Luyện tập hôm nay." A Session of 10 Questions begins. Each Question shows a logic puzzle with an illustration. He taps his answer. The app gives immediate visual feedback — correct (green checkmark + small animation) or incorrect (red cross + correct answer shown). He moves to the next Question without interruption.
- **Climax:** After Question 10, a Session Summary screen shows his score and a per-Skill outcome breakdown.
- **Resolution:** The Session is recorded. His parent can see it in the Parent Dashboard.
- **Edge case:** If Minh is on the Free Tier and has exhausted today's Question allotment, he sees a friendly end-of-allotment message. No subscription upsell appears in the student surface.

**UJ-2. Lan checks her son's progress before a parent-teacher meeting.**
- **Persona + context:** Lan, 35, parent of two. Subscribed last month for her Grade 1 son, Khôi.
- **Entry state:** Authenticated. Opens ToanTuDuy on her phone.
- **Path:** She opens Khôi's Child Profile from the Parent Dashboard. She sees: 4 Sessions completed this week, streak intact. She taps "Kỹ năng" and sees a Skill breakdown — Pattern Recognition (strong), Word Problem Reading Comprehension (needs practice). She taps the weak Skill and sees the last 3 Sessions where it flagged.
- **Climax:** In under 30 seconds she has a specific answer: Khôi's word problem comprehension is the gap.
- **Resolution:** She names the specific Skill confidently at the parent-teacher meeting.

**UJ-3. Cô Hương assigns a practice set and checks results the next morning.**
- **Persona + context:** Cô Hương, Grade 2 teacher, 28 students. Approved Teacher Account.
- **Entry state:** Authenticated on Teacher Portal, on a laptop.
- **Path:** She creates an Assignment Set — selects 8 word problem Questions at Grade 2 level, titles it "Ôn tập tuần 3," assigns it to her Class with a due date of tomorrow. Students in her Class see the Assignment Set on their next login.
- **Climax:** Next morning, she opens the Teacher Portal: 22/28 students completed (78%). Six non-completers identified. Class average on word problems: 65%.
- **Resolution:** No manual aggregation. She has what she needs in one screen, in time for today's lesson.

**UJ-4. Lan hits the free limit and subscribes.**
- **Persona + context:** Lan, Free Tier, using ToanTuDuy for 5 days.
- **Entry state:** Authenticated. Opens Parent Dashboard.
- **Path:** A banner shows "Khôi đã dùng hết lượt miễn phí hôm nay" with an "Xem gói đăng ký" button. She taps, sees monthly and annual plans, selects monthly at 79,000 VNĐ, pays via MoMo. [ASSUMPTION: MoMo is the primary v1 payment method; ZaloPay and bank transfer are post-v1.]
- **Climax:** Subscription confirmed. Khôi's profile is now unlimited. Next billing date shown in account settings.
- **Resolution:** Lan is subscribed. All Child Profiles under her account are unlocked.

---

## 3. Glossary

- **Session (Buổi luyện)** — A single practice unit for a Child Profile, consisting of an admin-configured number of Questions. One Session per day is the intended cadence. A Session is counted as complete when all its Questions have been answered.
- **Question** — An individual logic puzzle or word problem presented during a Session. Each Question belongs to exactly one Skill and one Grade Band.
- **Skill** — A named cognitive skill category used to tag Questions (e.g., Pattern Recognition, Spatial Reasoning, Word Problem Reading Comprehension, Classification). Skills are the unit of breakdown in the Parent Dashboard and Class Report.
- **Grade Band** — One of three content tiers: Grade 1, Grade 2, or Grade 3, aligned to the Vietnamese national primary curriculum. Each Question is tagged to exactly one Grade Band.
- **Difficulty Level** — An ordinal rating within a Grade Band, on a scale of 1–5 where 1 is easiest and 5 is hardest within that Grade Band. The Adaptive Difficulty engine selects Questions at the appropriate Difficulty Level based on a Child Profile's recent per-Skill accuracy.
- **Adaptive Difficulty** — The system behavior of selecting Question Difficulty Levels based on a Child Profile's per-Skill accuracy history. Operates within the Child Profile's current Grade Band only; Grade Band does not change automatically.
- **Child Profile** — A named student identity managed under a Parent Account. Holds the student's Grade Band, Session history, per-Skill accuracy, and Class membership. One Parent Account may have multiple Child Profiles.
- **Parent Account** — The authenticated account of a parent or guardian. Creates and manages Child Profiles, holds the Subscription, and accesses the Parent Dashboard.
- **Free Tier** — The access level available without a Subscription. Each Child Profile under a Free Tier Parent Account is limited to an admin-configurable daily Question allotment (default: 5 Questions per calendar day).
- **Subscription** — A paid access level attached to a Parent Account, unlocking unlimited Sessions for all Child Profiles under that account. Billed monthly (or annually, if offered). [ASSUMPTION: initial monthly price ~79,000 VNĐ; annual pricing TBD.]
- **Assignment Set (Bộ bài tập)** — A teacher-curated collection of Questions with a name, Grade Band, and optional due date, assigned to a Class by a Teacher Account.
- **Class** — A teacher-defined group of Child Profiles linked to a Teacher Account, used for assigning Assignment Sets and generating Class Reports.
- **Teacher Account** — A free account for a verified teacher, active only after manual admin approval. Provides access to the Teacher Portal.
- **Teacher Portal** — The teacher-specific interface for creating Assignment Sets, managing Classes, and viewing Class Reports.
- **Parent Dashboard** — The parent-specific interface for viewing per-Child Profile Session history, weekly activity, Skill breakdown, grade progress, and Subscription status.
- **Class Report** — A teacher-facing view showing completion status per student and class-average accuracy per Skill for a given Assignment Set.
- **Admin Panel** — An internal tool for ToanTuDuy staff to approve Teacher Account requests and configure global session parameters (question count, time limit).
- **Streak** — A count of consecutive calendar days on which a Child Profile completed at least one Session. The Streak resets to 0 if a calendar day passes with no completed Session. Displayed in the Parent Dashboard weekly activity summary.

---

## 4. Features

### 4.1 Student Practice Interface

**Description:** The primary student-facing surface. After a parent selects a Child Profile, the student sees a minimal home screen with one primary action: start today's Session. Each Session presents Questions sequentially — logic puzzles (pattern recognition, spatial reasoning, classification) or word problems requiring multi-step reasoning. Each Question receives immediate post-answer feedback. A Session Summary is shown on completion. The interface is minimal, ad-free, and designed for independent use by children ages 6–9: large touch targets, icon-supported navigation, Vietnamese language throughout. Free Tier Child Profiles see a friendly end-of-allotment message when their daily quota is exhausted; no upsell content appears within the student surface. Realizes UJ-1.

**Functional Requirements:**

#### FR-1: Start session

A Student can start a Session that presents Questions sequentially until the admin-configured question count is reached.

**Consequences (testable):**
- A Session starts with exactly the admin-configured number of Questions (default: 10; range: 5–30 per FR-27).
- A Free Tier Child Profile that has reached its daily Question allotment cannot start a new Session; the student sees the end-of-allotment message.
- A Subscribed Child Profile can always start a Session regardless of prior activity that day.

#### FR-2: Display question with answer choices

Each Question is displayed with its prompt (text and/or image) and answer choices in a Grade Band–appropriate visual layout. The student taps or clicks one answer to submit.

**Consequences (testable):**
- Each Question renders with its prompt and 2–4 answer choices.
- No answer is pre-selected on load.
- Tapping or clicking an answer submits it immediately (no separate confirm step).

#### FR-3: Immediate post-answer feedback

After a student submits an answer, the system immediately shows whether the answer was correct or incorrect, and reveals the correct answer if the student was wrong.

**Consequences (testable):**
- Feedback renders within 500ms of answer submission.
- Correct and incorrect feedback are visually distinct.
- If incorrect, the correct answer is shown before the student can advance.

#### FR-4: Session summary on completion

On completion of all Questions in a Session, the system displays a Session Summary showing: total Questions, correct count, and per-Skill outcome for all Skills encountered in the Session.

**Consequences (testable):**
- Session Summary renders after the final Question is answered.
- Summary shows total Questions answered and total correct.
- Summary includes a per-Skill breakdown if the Session contained Questions from more than one Skill.
- If the Session contained Questions from only one Skill, the Session Summary shows that Skill's accuracy (e.g., "6/8 Pattern Recognition").

#### FR-5: Free Tier daily question gate

A Free Tier Child Profile has an admin-configurable daily Question allotment (default: 5). Once exhausted, the student sees a friendly end-of-allotment message. No subscription upsell or pricing information appears in the student surface.

**Consequences (testable):**
- Once a Free Tier Child Profile reaches the daily allotment, no further Questions can be started for that profile on that calendar day.
- The end-of-allotment message contains no pricing, subscription call-to-action, or commercial content.
- The subscription prompt appears only in the Parent Dashboard (FR-16).

#### FR-6: Teacher-assigned sessions surfaced to student

If a Child Profile's Class has an active Assignment Set, the Assignment Set appears as a named practice option on the student's home screen with visual distinction. Assigned Questions count toward the daily Free Tier allotment. [ASSUMPTION: A-1]

**Consequences (testable):**
- An active Assignment Set is shown as a distinct option on the student's home screen.
- Completing the Assignment Set records it as a Session against the Child Profile.
- If the Free Tier allotment is exhausted, the student cannot access the Assignment Set until the next calendar day.

---

### 4.2 Adaptive Difficulty Engine

**Description:** The system selects each Session's Questions at the appropriate Difficulty Level for the Child Profile based on their per-Skill accuracy history. Difficulty adjusts within the current Grade Band — Grade Band is set by the parent and does not auto-advance. The engine weights selection toward Skills with lower recent accuracy to surface practice where it is most needed. This feature is invisible to the student; it shapes Question selection with no UI exposure.

**Functional Requirements:**

#### FR-7: Per-skill accuracy tracking

The system records, per Child Profile and per Skill, the running accuracy (correct / total attempts) across all completed Sessions.

**Consequences (testable):**
- After each completed Session, per-Skill accuracy is updated for the Child Profile.
- An attempt is defined as a single Question answered within a completed Session. Questions in incomplete Sessions are not counted.
- Accuracy reflects all historical attempts for that Skill, not just the most recent Session.

[NOTE FOR PM: All-time cumulative accuracy means a child who improves significantly will continue to see “Cần luyện” for many Sessions after real mastery. Confirm this is the intended model vs. a recency-weighted approach (e.g., accuracy over the last N Sessions).]

#### FR-8: Difficulty-adjusted question selection

When building a Session, the system selects Questions at a Difficulty Level matching the Child Profile's recent per-Skill accuracy. Higher accuracy → higher Difficulty Level Questions for that Skill. Lower accuracy → lower Difficulty Level Questions.

**Consequences (testable):**
- A Child Profile with <50% accuracy on a Skill receives Questions at a lower Difficulty Level for that Skill than one with >80% accuracy.
- Question selection respects the Child Profile's current Grade Band boundary (does not serve Questions from a different Grade Band).

#### FR-9: Skill weighting toward weak areas

The system weights Question selection toward Skills where the Child Profile's accuracy is lower, within the configured session question count.

**Consequences (testable):**
- Over any 5-Session window, a Skill with accuracy <50% receives a higher proportion of Questions than a Skill with accuracy >80%.

---

### 4.3 Parent Account & Child Profile Management

**Description:** A parent registers a Parent Account and creates one or more Child Profiles under it. Each Child Profile has a name and a Grade Band. Subscription is attached at the Parent Account level; all Child Profiles under the account share unlocked access. Account setup is entirely the parent's domain — students never see account or settings screens. Realizes UJ-2, UJ-4.

**Functional Requirements:**

#### FR-10: Parent account registration

A parent can register a Parent Account with an email address and password. Email verification is required before the account is active.

**Consequences (testable):**
- A verification email is sent on registration; the account is inactive until verified.
- Registration is rejected if the email address is already associated with an existing account.

#### FR-11: Create and manage child profiles

A Parent Account can create one or more Child Profiles, each with a display name and a Grade Band (1, 2, or 3). The parent can rename or delete any Child Profile at any time. Grade Band can be changed at any time; historical Session data is preserved.

**Consequences (testable):**
- A Parent Account can hold at least 5 Child Profiles simultaneously. [ASSUMPTION: A-2]
- Deleting a Child Profile removes it from the Parent Dashboard immediately; Session history is retained for 30 days before permanent deletion. [ASSUMPTION: A-3]
- Changing a Child Profile's Grade Band does not delete its historical Session data.

#### FR-12: Switch active child profile

From the parent-facing surface, a parent can switch the active Child Profile without re-authenticating the Parent Account.

**Consequences (testable):**
- Switching Child Profiles does not require a password prompt.
- The student surface reflects the newly selected Child Profile's Session state immediately after switch.

---

### 4.4 Parent Dashboard

**Description:** The analytics surface for authenticated parents. Answers "where is my child struggling?" in under 30 seconds. Shows weekly Session activity, per-Skill accuracy breakdown, grade progress indicator, and Session history. The subscription upsell prompt surfaces here — and only here — when a Free Tier Child Profile's daily allotment is exhausted. Realizes UJ-2, UJ-4.

**Functional Requirements:**

#### FR-13: Weekly activity summary

The Parent Dashboard shows, for the selected Child Profile: number of Sessions completed in the current week and a visual indicator of which days practice occurred.

**Consequences (testable):**
- Weekly summary updates within 60 seconds of a Session completion.
- Current week is defined as Monday–Sunday in the Asia/Ho_Chi_Minh timezone.
- The weekly activity summary displays the Child Profile's current Streak (consecutive calendar days with at least one completed Session).

#### FR-14: Skill breakdown view

The Parent Dashboard shows per-Skill accuracy for the selected Child Profile, categorized as "Tốt" (strong, ≥70% accuracy) or "Cần luyện" (needs practice, <70% accuracy). [ASSUMPTION: A-4]

**Consequences (testable):**
- A Skill appears in the breakdown only after the Child Profile has attempted ≥ 5 Questions from that Skill; prior to that threshold, the Skill is listed as "Chưa đủ dữ liệu" (insufficient data). [ASSUMPTION: A-12]
- Needs-practice Skills are sorted before strong Skills.
- Tapping a Skill shows the last 3 Sessions that included Questions from that Skill, with the Child Profile's accuracy for that Skill *within that Session only* (e.g., "2/3 correct"). The 3 Sessions shown are sourced from the Session history (FR-17).
- A parent can identify the weakest Skill for the active Child Profile in ≤ 3 taps / ≤ 30 seconds from Dashboard open.

#### FR-15: Grade progress indicator

The Parent Dashboard shows a high-level indicator of where the Child Profile's current average Difficulty Level sits within the Grade Band progression (e.g., "Đang ở: Lớp 2, giữa kỳ").

**Consequences (testable):**
- The grade progress indicator is shown on the main Child Profile view.
- It reflects the Child Profile's average Difficulty Level (1–5 scale) across all Skills within the current Grade Band. The average maps to one of three labels: "đầu kỳ" (average 1.0–2.0), "giữa kỳ" (average 2.1–3.5), "cuối kỳ" (average 3.6–5.0).

[NOTE FOR PM: The đầu kỳ / giữa kỳ / cuối kỳ label boundaries above are provisional. Confirm the correct curriculum-period mapping with the content team before the UX design sprint.]

#### FR-16: Subscription upsell prompt

When a Free Tier Child Profile has exhausted its daily Question allotment, the Parent Dashboard displays a prompt with a link to Subscription plans. No upsell content appears within the student surface (FR-5).

**Consequences (testable):**
- The upsell prompt appears in the Parent Dashboard once the daily allotment is exhausted for that Child Profile on that calendar day.
- The prompt includes a link to the Subscription plans page (FR-23).
- No upsell content appears in the Student Practice Interface.

#### FR-17: Session history

The Parent Dashboard provides a scrollable history of completed Sessions for the selected Child Profile, showing date, score (correct / total), and Skills covered per Session.

**Consequences (testable):**
- All completed Sessions are retained for the lifetime of the Child Profile. The display shows the most recent 30 by default with pagination or scroll to access older entries.
- Each entry shows date, correct/total, and Skills covered.

---

### 4.5 Teacher Portal

**Description:** A free, opt-in surface for verified teachers. A teacher submits a Teacher Account registration; an admin manually approves or rejects it. Approved teachers can create Assignment Sets from the question library, manage one or more Classes (via student join codes), assign Assignment Sets to Classes, and view Class Reports. Teacher accounts are permanently free. Realizes UJ-3.

**Functional Requirements:**

#### FR-18: Teacher account registration and approval

A teacher submits a Teacher Account registration (name, school name, grade taught, email). The account is in "pending" status until an admin approves or rejects it. The teacher is notified by email on either outcome.

**Consequences (testable):**
- After submission, Teacher Account status is "pending."
- Admin can approve or reject a pending Teacher Account from the Admin Panel (FR-26).
- On approval, the teacher receives a notification email and gains access to the Teacher Portal.
- On rejection, the teacher receives a notification email with a reason. [ASSUMPTION: A-9]

#### FR-19: Class management

An approved Teacher Account can create one or more Classes, each with a name and grade. Each Class has a unique system-generated join code. A Parent Account can join a Class on behalf of a Child Profile using the join code.

**Consequences (testable):**
- A Teacher Account can manage at least 5 Classes.
- Each Class has a unique join code.
- A Parent Account can add a Child Profile to a Class using the join code.
- A Child Profile can be in at most one Class per Teacher Account. [ASSUMPTION: A-5]

#### FR-20: Assignment set creation

An approved Teacher Account can create an Assignment Set by selecting Questions from the question library, filtered by Grade Band and Skill. The Assignment Set has a name and an optional due date. It is saved as a draft until explicitly assigned.

**Consequences (testable):**
- Teacher can filter Questions by Grade Band and Skill when building an Assignment Set.
- An Assignment Set must contain at least 1 Question and at most the admin-configured session question count (FR-27).
- Unassigned Assignment Sets are saved as drafts and do not appear for students.

#### FR-21: Assign assignment set to class

An approved Teacher Account can assign an Assignment Set to one or more of their Classes. Assigned students see the Assignment Set on their next login (FR-6). A Class may have at most one active Assignment Set at a time. [ASSUMPTION: A-6]

**Consequences (testable):**
- An Assignment Set can be assigned to multiple Classes simultaneously.
- Students in the assigned Class see the Assignment Set on their student home screen.
- Assigning a second Assignment Set to a Class that has an active one requires the teacher to confirm, replacing the prior active set.

#### FR-22: Class report

An approved Teacher Account can view a Class Report for any assigned Assignment Set showing: per-student completion status (completed / not yet) and class-average accuracy per Skill for students who completed.

**Consequences (testable):**
- Class Report is available as soon as at least one student has completed the Assignment Set.
- Per-student rows show completion status only — individual student scores are not surfaced to teachers or other parents.
- Class averages update within 60 seconds of a student Session completion.

---

### 4.6 Subscription & Monetization

**Description:** ToanTuDuy follows a Freemium model. Parent Accounts default to Free Tier: each Child Profile has an admin-configurable daily Question allotment (default: 5). Upgrading to a Subscription — attached to the Parent Account — unlocks unlimited Sessions for all Child Profiles under that account. Subscriptions are billed monthly; an optional annual plan may be offered. Payment is via Vietnamese payment methods (MoMo at v1 launch). Realizes UJ-4.

**Functional Requirements:**

#### FR-23: Subscription plans display

A Parent Account can view available Subscription plans (monthly, and annual if offered) with pricing on a dedicated plans page, accessible from the Parent Dashboard and account settings.

**Consequences (testable):**
- Plans page shows at least the monthly plan with its price.
- Plans page is accessible from the upsell prompt (FR-16) and from account settings (FR-25).

#### FR-24: Subscribe via Vietnamese payment method

A Parent Account can complete a subscription purchase via the available payment method(s). Subscription activates immediately upon payment confirmation.

**Consequences (testable):**
- Subscription activation is reflected on the Parent Account within 10 seconds of successful payment confirmation.
- On payment failure, the account remains on Free Tier; an error message is displayed.
- The activated Subscription applies to all Child Profiles under the account without requiring re-login.

#### FR-25: Subscription management

A Parent Account can view current subscription status (active/cancelled, next billing date), cancel their Subscription, and reactivate a cancelled Subscription.

**Consequences (testable):**
- Subscription management is accessible from account settings.
- Cancellation takes effect at the end of the current billing period; the account returns to Free Tier at that point.
- A lapsed or cancelled Subscription can be reactivated.

---

### 4.7 Admin Panel

**Description:** An internal-only tool for ToanTuDuy staff. V1 scope is intentionally minimal: approve or reject Teacher Account requests, and configure global Session parameters (question count, time limit per session). Not accessible to any end-user. Changes to session configuration apply to newly started Sessions only.

**Functional Requirements:**

#### FR-26: Teacher account approval

An admin can view all pending Teacher Account requests and approve or reject each. Approval or rejection triggers a notification email to the teacher (FR-18).

**Consequences (testable):**
- Admin Panel presents a queue of pending Teacher Account registrations.
- Approving or rejecting updates the Teacher Account status immediately and triggers the appropriate notification email.

#### FR-27: Session configuration

An admin can set the global session question count (range: 5–30 inclusive) and optionally a per-session time limit (in minutes) or disable the time limit. Changes apply to newly started Sessions; in-progress Sessions are not affected.

**Consequences (testable):**
- Session question count accepts values between 5 and 30 inclusive and rejects values outside this range.
- Time limit can be set to a positive integer (minutes) or disabled.
- A configuration change takes effect on the next Session start, not on any currently active Session.

---

## 5. Cross-Cutting NFRs

**Accessibility (children ages 6–9)**
- All interactive elements in the Student Practice Interface have touch targets ≥ 44×44px.
- Navigation in the student surface uses icons with labels — not text-only — throughout.
- No student-facing navigation element requires reading ability beyond Grade 1 Vietnamese.

**Performance**
- Questions load and render within 2 seconds on a 4G mobile connection.
- Session Summary renders within 1 second of the final answer submission.
- Parent Dashboard initial load completes within 3 seconds.
- Class Report updates within 60 seconds of a student Session completion (FR-22, FR-13).

**Privacy & child data**
- Child Profile learning data (Session history, accuracy, Skill breakdown) is accessible only to the owning Parent Account and, in aggregated/completion-only form, to the linked Teacher Account's Class Report.
- No third-party advertising, analytics, or tracking SDKs are embedded in the student-facing surface.
- Child Profile data is not shared with third parties. [NOTE FOR PM: review obligations under Vietnam's Personal Data Protection Decree (PDPD) — see Open Question 7.]

**Security**
- Parent Account authentication is required before any Child Profile data is accessible.
- Teacher Accounts access only Class-level aggregates and completion status — not individual student scores from Child Profiles outside their Class.
- Payment processing uses the payment provider's hosted flow; ToanTuDuy systems store no card data.

---

## 6. Non-Goals (Explicit)

- **Grade 4–5 content** — v2. Validating product-market fit at grades 1–3 is a prerequisite; curriculum for grades 4–5 is substantially more complex and would dilute UX focus for the 6–9 age group.
- **Native mobile app (iOS/Android)** — v2. Mobile-responsive web covers the v1 surface area.
- **AI-generated questions** — v2. Requires sufficient data to validate output quality; human-curated question library is the v1 content strategy.
- **Teacher-parent in-app messaging** — explicit non-goal. Transforms the product's scope and introduces trust/safety obligations that are out of focus.
- **Advanced gamification** (global leaderboards, avatar RPG, collectibles) — explicit non-goal for v1. Session completion feedback (FR-4) is included; competitive or cosmetic meta-layers are not.
- **School or district institutional purchase** — v1 targets parents as buyers only. No procurement, PO, or multi-school admin flows.
- **Adaptive Grade Band promotion** — the Adaptive Difficulty engine (FR-8) operates within the explicitly-set Grade Band only. Automatic grade-band promotion is not in scope; parents update the Grade Band.
- **ZaloPay and bank transfer payment integrations** — post-v1. Only MoMo at launch. [NOTE FOR PM: broadening payment methods reduces checkout abandonment — prioritize for v1.1 if conversion data supports it.]
- **Third-party SSO (Google, Facebook)** — not in v1 scope. [NOTE FOR PM: high-value for reducing sign-up friction; consider for v1.1 if account creation abandonment is high.]

---

## 7. MVP Scope

### 7.1 In Scope
- Student Practice Interface with adaptive question selection (FR-1 – FR-6, FR-7 – FR-9)
- Parent Account with multiple Child Profiles, email verification (FR-10 – FR-12)
- Parent Dashboard: weekly activity, Skill breakdown, grade progress, Session history, upsell prompt (FR-13 – FR-17)
- Teacher Portal: registration + manual approval, Class management via join codes, Assignment Set creation and assignment, Class Report (FR-18 – FR-22)
- Freemium model: Free Tier daily gate, monthly Subscription via MoMo (FR-23 – FR-25)
- Admin Panel: teacher approval queue, session configuration (FR-26 – FR-27)
- Question library: Grades 1–3, logic puzzles + word problems, tagged by Skill and Grade Band

### 7.2 Out of Scope for MVP
- Grade 4–5 content (v2)
- Native mobile app (v2)
- AI-generated questions (v2)
- Teacher-parent in-app messaging (explicit non-goal)
- ZaloPay and bank transfer payment integrations (post-v1)
- Annual subscription plan (defer if payment integration scope makes it infeasible; retain if feasible — see Open Question 1) [NOTE FOR PM: annual plan significantly increases LTV — preserve if at all possible]
- Gamification beyond Session Summary feedback
- Institutional/school purchase flows
- In-app question library editing tool (content management handled outside v1 via internal tooling)

### 7.3 Platform
- **v1:** Web application, mobile-responsive. Primary access expected on mobile browser (phone or tablet). Built in Next.js.
- **v2+:** Native iOS/Android app (out of v1 scope).

---

## 8. Success Metrics

**Primary**

- **SM-1: Student weekly retention** — ≥ 40% of active Child Profiles complete ≥ 3 Sessions in a given week, measured at end of month 1 post-launch. Validates FR-1, FR-3, FR-4.
- **SM-2: Parent NPS** — ≥ 40 NPS from parents surveyed at 4 weeks of usage. Validates FR-13, FR-14, FR-15.
- **SM-3: Teacher assignment adoption** — ≥ 50% of approved Teacher Accounts assign at least 1 Assignment Set within their first 30 days. Validates FR-20, FR-21.
- **SM-4: Learning signal** — For Child Profiles with ≥ 15 Sessions, per-Skill accuracy for word problem Skills improves by ≥ 10 percentage points from Sessions 1–5 (baseline) to Sessions 11–15. Validates FR-7, FR-8, FR-9.

**Secondary**

- **SM-5: Free-to-paid conversion** — ≥ 15% of Free Tier Parent Accounts convert to Subscription within 30 days. [ASSUMPTION: A-10] Validates FR-16, FR-23, FR-24.
- **SM-6: Teacher-to-parent referral** — ≥ 20% of new Parent Account sign-ups in months 2–3 are attributable to a teacher referral (tracked via Class join code or referral tag). Validates UJ-3 growth flywheel.

**Counter-metrics (do not optimize)**

- **SM-C1: Session skip rate** — Sessions started but not completed. If SM-1 is gamed by reducing session length to 5 Questions, skip rate will rise. Counterbalances SM-1.
- **SM-C2: Parent Dashboard dwell time** — Do not optimize for parents spending more time in the dashboard. High dwell time signals the dashboard is not answering the question fast enough (FR-14 quality check). Counterbalances SM-2.

---

## 9. Open Questions

1. **Annual subscription pricing** — Should annual be offered at v1 launch? At what discount? Affects FR-23, FR-24. Owner: PM. Revisit: before payment integration sprint.
2. **Free Tier question allotment** — Default of 5 Questions/day is an assumption (A-11). Does this provide enough value to hook but enough friction to convert? Owner: PM + growth. Revisit: after first 2 weeks of beta data.
3. **Teacher approval SLA** — How quickly will ToanTuDuy staff turn around Teacher Account approvals? A slow SLA will lag SM-3. Owner: ops. Revisit: before teacher beta launch.
4. **Class join code expiry** — Do Class join codes expire? What happens to students in a Class if the Teacher Account is deactivated or rejected? Owner: PM + engineering. Revisit: before Teacher Portal sprint.
5. **Assigned questions and Free Tier gate** — Confirmed assumption (A-1): assigned Questions count toward the daily Free Tier allotment. This may frustrate teachers whose Free Tier students cannot complete assigned work. Consider whether Teacher-assigned Sessions bypass the Free Tier gate. Owner: PM. Revisit: before Teacher Portal sprint.
6. **Question library size at launch** — How many Questions are needed per Grade Band × Skill × Difficulty Level to avoid repetition within 30 days of daily Sessions? [ASSUMPTION: A-13, provisional floor ≥ 50 Questions per Grade Band × Skill × Difficulty Level cell; must be validated by the content lead before the content sprint.] Owner: content lead + PM. Revisit: during content sprint planning.
7. **Child data privacy / PDPD compliance** — The product stores learning data for children ages 6–9. What are ToanTuDuy's obligations under Vietnam's Personal Data Protection Decree for children's data? Does account creation by a parent constitute sufficient consent? Owner: PM + legal. Revisit: before public launch.

---

## 10. Assumptions Index

- **A-1** (FR-6): Teacher-assigned Questions count toward the Free Tier daily allotment. (See Open Question 5)
- **A-2** (FR-11): No explicit cap on Child Profiles per Parent Account in v1.
- **A-3** (FR-11): Deleted Child Profile Session history retained for 30 days before permanent deletion.
- **A-4** (FR-14): 70% accuracy is the default threshold distinguishing "Tốt" (strong) from "Cần luyện" (needs practice).
- **A-5** (FR-19): A Child Profile can be in at most one Class per Teacher Account.
- **A-6** (FR-21): A Class has at most one active Assignment Set at a time.
- **A-7** (§4.6, FR-23): Monthly Subscription price ~79,000 VNĐ/month; annual pricing TBD.
- **A-8** (FR-24, UJ-4): MoMo is the primary v1 payment integration; ZaloPay and bank transfer are post-v1.
- **A-9** (FR-18): Teacher rejection reason is a free-text field in the Admin Panel.
- **A-10** (SM-5): 15% free-to-paid conversion is an initial target, subject to revision after cohort observation.
- **A-11** (FR-5, Free Tier): Default free Question allotment is 5 Questions per Child Profile per calendar day. (See Open Question 2)
- **A-12** (FR-14): Minimum attempts before a Skill appears in the Skill breakdown is 5 Questions. (Provisional; content team to validate.)
- **A-13** (OQ-6): Provisional question library floor is ≥ 50 Questions per Grade Band × Skill × Difficulty Level cell. (Content lead to validate before content sprint.)
