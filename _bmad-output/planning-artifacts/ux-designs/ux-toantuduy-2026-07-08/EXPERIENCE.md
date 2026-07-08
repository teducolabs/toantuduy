---
name: ToanTuDuy
status: final
created: 2026-07-08
updated: 2026-07-08
sources:
  - _bmad-output/planning-artifacts/briefs/brief-toantuduy-2026-07-08/brief.md
  - _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md
---

# ToanTuDuy — Experience Spine

## Foundation

Multi-surface responsive web. shadcn/ui on Next.js + Tailwind CSS. `DESIGN.md` is the visual identity reference; this spine owns information architecture, behavior, states, interactions, and accessibility. Spines win on conflict with any mock, wireframe, or downstream implementation.

**Two UX modes, one application shell.** ToanTuDuy serves four role types — Student, Parent, Teacher, Admin — where Student and Parent share a Parent Account login. After authentication, the shell dispatches to the correct surface. The most critical design discipline: **Student Mode and Adult Mode are not UI "themes" — they are fundamentally different experience contracts.** Student Mode is a near-zero-navigation practice environment; Adult Mode is a multi-tab, data-forward tool.

| Mode | Who | Primary device | Navigation pattern |
|---|---|---|---|
| Student Mode | Grade 1–3 student (ages 6–9) | Tablet (landscape or portrait) | No persistent nav; linear session flow |
| Parent Mode | Parent / guardian | Tablet or phone | Bottom tab bar on ≤ md; sidebar on ≥ lg |
| Teacher Mode | Approved teacher | Desktop or laptop | Sidebar on ≥ md; sheet nav on < md |
| Admin Mode | Internal ToanTuDuy staff | Desktop | Top nav bar, minimal |

Platform: web, mobile-responsive. Primary device: **tablet** (768–1024px). Desktop secondary (1024px+). Phone supported throughout but not the primary target for any surface. No native app in v1.

## Information Architecture

### Auth Shell (shared)

| Surface | Reached from | Purpose |
|---|---|---|
| Login | App cold open | Email + password login for all roles |
| Parent register | Login page link | New parent account: email, password, email verify |
| Teacher register | Login page link | Teacher application: name, school, grade, email — enters pending state |
| Email verify | Post-registration | One-time verification link; account inactive until confirmed (FR-10) |
| Pending teacher | Post-login (pending teacher) | "Đang chờ xét duyệt" — no portal access yet (FR-18) |

### Student Mode (entered when parent activates a Child Profile)

| Surface | Reached from | Purpose |
|---|---|---|
| Student home | Parent selects Child Profile | "Luyện tập hôm nay" CTA + optional active Assignment Set |
| Session | Student home tap | Sequential question → immediate feedback → next question |
| Session summary | Final question answered | Score + per-skill outcome (FR-4) |
| Free tier gate | Student home (allotment exhausted) | Friendly end message; no upsell content (FR-5) |

### Parent Mode

| Surface | Reached from | Purpose |
|---|---|---|
| Parent dashboard | Post-login; child-profile switch | Overview: weekly activity, skill summary, grade progress, upsell prompt if applicable |
| Skill detail | Dashboard skill badge tap | Last 3 sessions with that skill + per-session accuracy (FR-14) |
| Session history | Dashboard "Xem thêm" link | Scrollable list of past sessions (FR-17) |
| Child profile manager | Dashboard header / account settings | Create, rename, delete, grade-change Child Profiles (FR-11, FR-12) |
| Subscription plans | Upsell prompt or account settings | Monthly (and annual if offered) plan details (FR-23) |
| Account settings | Nav avatar menu | Profile info, subscription management, billing date (FR-25) |

### Teacher Mode

| Surface | Reached from | Purpose |
|---|---|---|
| Teacher portal home | Post-login (approved teacher) | List of Classes + Assignment Sets |
| Class detail | Portal home class row | Students in Class, join code, active Assignment Set, link to report |
| Assignment set builder | "Tạo bộ bài tập" button | Question library browser → configure set (FR-20) |
| Class report | Class detail → active assignment | Per-student completion + class-average skill accuracy (FR-22) |

### Admin Mode

| Surface | Reached from | Purpose |
|---|---|---|
| Teacher approval queue | Admin panel home | Pending applications; approve / reject with reason (FR-26) |
| Session configuration | Admin panel nav | Global question count (5–30) + optional time limit (FR-27) |

→ Compositions in `mockups/`: [`key-session-question.html`](mockups/key-session-question.html) (session question + feedback states), [`key-parent-dashboard.html`](mockups/key-parent-dashboard.html) (parent dashboard — subscribed + upsell states), [`key-teacher-portal.html`](mockups/key-teacher-portal.html) (portal home + class report). Pending mocks (spine-only for now): `student-home`, `session-summary`, `skill-detail`. Spine wins on conflict.

## Voice and Tone

Microcopy. Brand voice and aesthetic posture live in `DESIGN.md.Brand & Style`.

### Student surface
Short, icon-supported, warm. Never uses the word "Sai" (wrong) — incorrect answers are "chưa đúng" or "thử lại nhé." Questions are short sentences; if a sentence is long, the audio button carries it.

| Do | Don't |
|---|---|
| "Luyện tập hôm nay!" | "Bắt đầu buổi luyện tập của bạn" |
| "Đúng rồi!" | "Câu trả lời đúng!" |
| "Thử lại nhé 😊" | "Sai! Đáp án là..." |
| "8 / 10" (score chip) | "Bạn đã trả lời đúng 8 trong số 10 câu hỏi." |
| Icon + 1–3 word label everywhere | Text-only navigation |

### Parent surface
Clear, data-forward, respectful of the parent's time. Answers questions, does not narrate.

| Do | Don't |
|---|---|
| "4 buổi tuần này" | "Con của bạn đã hoàn thành 4 buổi luyện tập trong tuần này!" |
| "Cần luyện thêm: Đọc hiểu bài toán" | "Con bạn đang gặp khó khăn với kỹ năng đọc hiểu bài toán" |
| "Gia hạn gói để tiếp tục" | "Hãy nâng cấp ngay để không bỏ lỡ!" |
| Date formats: "Thứ Hai, 7/7" | Unix timestamps or English date formats |

### Teacher surface
Efficient, action-forward. Teachers want numbers and names, not explanations.

| Do | Don't |
|---|---|
| "22/28 hoàn thành" | "22 học sinh trong tổng số 28 học sinh đã hoàn thành bài tập" |
| "Giao ngày: 9/7" | "Due date: July 9th, 2026" |
| Column labels short: "Hoàn thành", "Kỹ năng yếu" | Verbose column headers |

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

### Student Mode Components

| Component | Use | Behavioral rules |
|---|---|---|
| Student home card | Student home | Full-width primary CTA "Luyện tập hôm nay" (primary orange). If active Assignment Set: a second card below with assignment name + teacher name + due date. |
| Session progress chip | Session screen (top-right) | "3 / 10" — small chip, always visible, never obscures question content. |
| Question card | Session screen | Fills most of the viewport. Sections top-to-bottom: illustration (optional, loaded from content library), question text, answer grid. Audio button top-right of card. Mascot Cú bottom-right corner. |
| Answer button | Session screen | 2-column grid on tablet (4 choices), single column on phone. Tap = immediate submit (FR-2). No hover state on touch devices. States per `DESIGN.md.answer-button`. |
| Feedback overlay (`feedback-overlay`) | Session screen | In-place on answer button (200ms). Auto-advances after 1.5s OR on explicit "Tiếp theo →" tap. "Tiếp theo" button appears 500ms after feedback renders. |
| Audio button | Session screen | Icon + "Nghe lại". Auto-plays on question load for Grade 1 profiles; tap-to-play on Grades 2–3. Audio button always visible and tappable for replay on all grades. |
| Session summary card | Session summary | Large score display (`{typography.display}`), then per-skill rows. Two exit buttons: "Về trang chủ" and, if today's allotment is spent, "Xong cho hôm nay". |
| Free tier gate card | Student home | "Hôm nay [tên] đã luyện đủ rồi 🌟" — single card, no subscription mention, no pricing. Tomorrow's date shown. [ASSUMPTION: friendly illustration or Cú neutral state accompanies this screen.] |

### Parent Mode Components

| Component | Use | Behavioral rules |
|---|---|---|
| Child profile switcher | Dashboard header | Displays active child's name + grade. Tap → sheet with all Child Profiles + "Thêm hồ sơ" option. Switch is immediate (FR-12). |
| Weekly activity strip | Dashboard | 7 circles (Mon–Sun). Filled orange = session completed; empty = no session. Current week per Asia/Ho_Chi_Minh timezone. Tap on a day shows session(s) from that day. |
| Skill summary section | Dashboard | "Cần luyện" badges listed first (amber), then "Tốt" badges (green). Tap any badge → Skill Detail. |
| Skill badge (`skill-badge-strong` / `skill-badge-weak`) | Skill summary | `rounded-full` pill. Strong: "Tốt" label + green tones (visual spec: `DESIGN.md.skill-badge-strong`). Weak: "Cần luyện" label + amber tones (visual spec: `DESIGN.md.skill-badge-weak`). Sorted weak-first. Tappable. |
| Grade progress indicator | Dashboard | Single line: "Đang ở: Lớp 2, giữa kỳ". Tap → tooltip explaining the metric. |
| Upsell banner | Dashboard (Free Tier, allotment exhausted) | Sticky banner at top of dashboard: "[Tên] đã dùng hết lượt hôm nay." + "Xem gói đăng ký →". No pricing shown in the banner itself. Dismissible per day. Reappears next day if still Free Tier. |
| Session history list | Session history surface | Rows: date + day-of-week, score chip (e.g. "8/10"), skill tags. Load 30 per page; "Xem thêm" pagination. |
| Skill detail panel | Skill detail | Skill name + accuracy % + badge. Below: last 3 sessions containing this skill, each showing date + per-session accuracy. |
| Subscription plan card | Subscription plans | One card per plan. Monthly shown by default; annual below if enabled. Price prominent, billing cycle clear. Single CTA "Đăng ký". [ASSUMPTION: plan card does not include long feature comparison lists — keep to 3 bullet points maximum.] |

### Teacher Mode Components

| Component | Use | Behavioral rules |
|---|---|---|
| Class card | Teacher portal home | Class name + grade + student count + active assignment status (or "Chưa có bài tập"). Tap → Class detail. |
| Assignment set card | Teacher portal home | Set name + question count + grade band + status: Draft | Assigned | Completed. Tap → builder (Draft) or report (Assigned/Completed). |
| Assignment set builder | Assignment set builder | Step 1: name + grade band + optional due date. Step 2: question browser (filterable by Skill and Grade Band, per FR-20). Min 1, max admin-configured count. Step 3: assign to class(es) or save as draft. |
| Question library row | Builder step 2 | Question preview (text truncated to one line), Skill tag, Difficulty Level. Checkbox for selection. Selected count shown in sticky footer. |
| Class report table | Class report | Rows: student names [ASSUMPTION: display name from Child Profile, not personal name for privacy], columns: Completion status + per-Skill accuracy cells. Incomplete students: "—". Class average row pinned at bottom. |
| Join code display | Class detail | Large text join code + copy button. Teacher can regenerate (invalidates old code). [ASSUMPTION: join codes do not expire automatically in v1.] |

### Admin Mode Components

| Component | Use | Behavioral rules |
|---|---|---|
| Teacher application row | Approval queue | Teacher name, school, grade, submitted date. Two actions: Approve | Reject. Reject → inline free-text reason field + confirm. |
| Session config form | Session configuration | Question count field (number input, 5–30 validation), time limit toggle + minutes field. "Lưu" saves; confirms "Áp dụng cho buổi tiếp theo." |

## State Patterns

### Student Mode States

| State | Surface | Treatment |
|---|---|---|
| Loading question | Session | `question-card` layout rendered with shadcn `Skeleton` gray pulse in illustration slot and text areas. Max 2s per PRD perf NFR. |
| Answering | Session | Answer buttons active, feedback-correct/incorrect not shown yet. |
| Feedback: correct | Session | Answer button → correct state (green + checkmark). Cú → `cu-happy`. "Tiếp theo →" appears after 500ms. |
| Feedback: incorrect | Session | Selected button → incorrect state (rose + ×). Correct sibling → correct state (green). Text below: "Đáp án đúng là [X]". Cú → `cu-gentle`. "Tiếp theo →" appears after 500ms. |
| Auto-advance (questions 1 to N−1) | Session | 1.5s after feedback renders, advance to next question automatically. User can tap "Tiếp theo" earlier. |
| Final question — manual advance only | Session | Auto-advance is disabled for the last question. "Tiếp theo" button must be tapped explicitly. After tap, session summary renders. |
| Session complete | Session summary | Score + per-skill summary + celebration animation. |
| Free tier gate | Student home | Gate card shown; no session CTA. Assignment Set CTA also hidden if allotment is zero. |
| Assignment Set active | Student home | Second card visible below primary session card. |
| No session started yet today | Student home | Primary CTA enabled (Subscribed or Free Tier with remaining allotment). |
| Session in-progress (mid-session resume) | Student home | Primary CTA changes to "Tiếp tục buổi luyện" + progress indicator (e.g. "3 / 10 câu"). Session state is preserved on browser close/reload. |
| Offline | All student screens | Session question: disable answer buttons, show non-blocking banner "Mất kết nối — kiểm tra lại". No data loss. Session state cached locally. |

### Parent Mode States

| State | Surface | Treatment |
|---|---|---|
| No sessions ever | Dashboard | Skill section: "Chưa có dữ liệu kỹ năng. Bắt đầu luyện tập để xem kết quả." Activity strip: all empty. |
| First week | Dashboard | Activity strip shows current week only. Session history shows "0 buổi đã hoàn thành." |
| Loading dashboard | Dashboard | `Skeleton` placeholders for activity strip, skill badges, and progress indicator. |
| Upsell active (allotment exhausted) | Dashboard | Upsell banner appears above weekly activity. |
| Subscription active | Dashboard | No upsell banner. Account settings shows next billing date. |
| Payment failed | Subscription plans | Error Toast: "Thanh toán không thành công. Vui lòng thử lại." Account stays on Free Tier. |
| Subscription cancelled | Account settings | Status: "Đã hủy — có hiệu lực đến [date]." Reactivate CTA available. |
| Child profile deleted | Dashboard | Profile removed immediately; toast: "[Tên] đã được xóa. Lịch sử sẽ được giữ 30 ngày." |
| Offline | Dashboard | shadcn `Toast` once: "Không có kết nối. Dữ liệu có thể chưa cập nhật." Read-only content still displayed from cache. |
| Load error | Dashboard | Inline error card with retry CTA: "Không tải được dữ liệu. Thử lại." No empty-state shown until retry succeeds. |

### Teacher Mode States

| State | Surface | Treatment |
|---|---|---|
| No classes | Portal home | Empty state: "Tạo lớp học đầu tiên để bắt đầu." Single primary action. |
| Pending approval | Pending teacher screen | Full-screen: "Tài khoản đang chờ xét duyệt. Chúng tôi sẽ thông báo qua email." No portal content accessible. |
| No students in class | Class detail | "Lớp chưa có học sinh. Chia sẻ mã tham gia để thêm học sinh." Join code shown prominently. |
| Assignment has 0 completions | Class report | Report accessible; all rows show "—". Class average row: "Chưa có dữ liệu." |
| Class report updating | Class report | Individual rows update live as students complete (≤ 60s per PRD perf NFR). No full page refresh required. |
| Offline | Portal | shadcn `Toast` once: "Không có kết nối." Assignment submission disabled; browsing existing data still available. |
| Load error | Class report / assignment builder | Inline retry card. Assignment builder preserves draft if fetch fails mid-step. |

### Admin Mode States

| State | Surface | Treatment |
|---|---|---|
| Empty queue | Approval queue | "Không có đơn đăng ký nào đang chờ." |
| Config saved | Session configuration | Toast: "Đã lưu. Cài đặt mới áp dụng cho buổi tiếp theo." In-progress sessions are not affected. |
| Offline | Approval queue | Toast: "Không có kết nối." Approve/reject actions disabled. |
| Save error | Session configuration | Inline error: "Lưu không thành công. Thử lại." Form values preserved. |

## Interaction Primitives

### Student Mode

Students are 6–9 years old on a touchscreen. The entire student surface is **touch-first, tap-only**.

- **Tap** is the only intentional gesture. No swipe, no long-press, no drag.
- **Answer submission**: tap an answer button → submit immediately. No intermediate selected-but-not-confirmed state visible to the student beyond the button highlighting on touch.
- **Audio replay**: tap speaker button → plays TTS from the beginning. Tapping during playback restarts.
- **Advance**: tap "Tiếp theo →" to move to next question. Auto-advance fires at 1.5s as fallback.
- **Back / exit**: not exposed during an active session. Exiting mid-session requires a parent-level action (browser back or explicit exit from parent shell). Session state is preserved; the student returning to the student home sees "Tiếp tục buổi luyện" (see State Patterns → Session in-progress).
- **Banned in student surface**: hover-only affordances, drag interactions, keyboard shortcuts, right-click menus, external links of any kind.

### Parent Mode

Standard responsive web.

- **Click / tap** to navigate and act.
- **Tab / Shift-Tab** navigates all interactive elements in logical reading order.
- **Enter** activates focused button or link.
- **Esc** closes dialogs, sheets, and date pickers.
- Child profile switcher: single tap opens sheet; tap profile → switch immediately.
- Skill badge: single tap opens Skill Detail (sheet on ≤ md, push route on ≥ lg).
- Session history: tap row → no action in v1 (row is read-only). [ASSUMPTION: tapping a session row is non-interactive in v1; session detail is deferred to v2.]
- Subscription CTA: opens plans page (not a modal). Returns to dashboard on successful payment.

### Teacher Mode

Desktop-forward. Mouse and keyboard.

- **Tab** navigation complete on all forms and table rows.
- **Enter** fires primary action on focused interactive element.
- Assignment set builder: **checkbox** for question selection; sticky footer shows selection count + "Tiếp tục" CTA.
- Class report table: column headers are sortable (Completion: complete first / incomplete first; Skill columns: low accuracy first). [ASSUMPTION: table sort is client-side; no backend re-query required for v1 data volumes.]
- Join code copy: **click** on code → copies to clipboard, button label changes to "Đã sao chép ✓" for 2s.
- **Drag-to-reorder** for assignment set questions: deferred to v2.

### Admin Mode

Simple internal tool. No keyboard shortcuts needed; standard form interactions only.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md` (inherits shadcn's WCAG AA-compliant defaults; brand overrides verified to maintain contrast ratios).

**Student surface — children-first accessibility:**
- All interactive elements meet **44×44px touch target minimum** (PRD cross-cutting NFR).
- Every navigation element in the student surface uses **icon + text label** — text-only navigation is banned (PRD NFR).
- No student-facing navigation element requires reading ability beyond Grade 1 Vietnamese (PRD NFR).
- `audio-button` replays question text for non-fluent readers. Auto-plays on Grade 1 profiles.
- Mascot state changes are accompanied by **color + icon** on the answer button — emotion is never conveyed by color alone.
- `aria-live="polite"` on the progress chip ("3 / 10") to announce advancement to the next question.
- Focus is explicitly managed to the first answer button when a new question loads (keyboard users reach question content without tabbing through header chrome).

**All surfaces — WCAG 2.2 AA:**
- Color is never the sole conveyor of information: skill badges carry both color and text label; feedback uses color + icon + mascot expression.
- All images and icons include descriptive `alt` text or `aria-label`.
- `aria-live` regions for real-time updates: class report rows, dashboard weekly summary.
- Screen reader announces surface/page on navigation: "Trang chủ học sinh, Minh — Lớp 2" / "Tổng quan: Khôi, Lớp 1".
- Form fields: every input has an associated `<label>` (never `placeholder` as label substitute).
- Error messages: associated with their field via `aria-describedby`. No color-only error indication.
- Reduce Motion: feedback animation and mascot state transitions skip animation (`prefers-reduced-motion: reduce`); states still change, animation frame is skipped.

## Responsive & Platform

| Breakpoint | Student Mode | Parent Mode | Teacher Mode |
|---|---|---|---|
| `< sm` (< 640px) | Question card full-width; 1-col answer grid; progress chip top-right | Single column; bottom tab bar | Sheet nav from top bar |
| `sm–md` (640–767px) | Question card full-width; 2-col answer grid | Single column; bottom tab bar | Sheet nav from top bar |
| `md–lg` (768–1023px) | Question card `max-w-lg` centered; 2-col answer grid | Single column; bottom tab bar | Sidebar collapsed to icons |
| `≥ lg` (1024px+) | Question card `max-w-lg` centered; 2-col answer grid | Sidebar + content `max-w-3xl` | Sidebar expanded + content `max-w-4xl` |

**Tablet-specific notes (primary target):**
- Student mode: landscape and portrait both supported. Question card size accounts for both orientations.
- Parent mode: bottom tab bar is the default at md; moving to sidebar at lg is the natural progression.
- Teacher mode: at 768px the sidebar collapses; at 1024px it expands — teacher work is content-heavy and benefits from the extra width.

**No native app in v1.** The responsive web surface must work on tablet browser (primary) without native app affordances. `Safe area insets` for notched tablets should be respected via CSS env variables.

## Inspiration & Anti-patterns

**Lifted from ST Math (JiJi):** the silence-first approach to the student surface. ST Math's mascot (JiJi the penguin) communicates progress through visual state only — no text, no explanations. ToanTuDuy's mascot Cú follows this discipline: reaction through expression, not narration.

**Lifted from Duolingo (children mode):** large, tappable answer tiles with immediate color feedback. Duolingo's lesson flow — prompt → choices → immediate correct/incorrect → advance — is the right pattern for this age group. ToanTuDuy does NOT lift Duolingo's streak-pressure mechanics.

**Lifted from Linear (teacher/parent surfaces):** dense, readable data tables with clean typography. Class Report borrows Linear's approach to showing many rows of information without making it feel overwhelming: generous row height, subtle row dividers, bold status indicators.

**Rejected — Streaks displayed to students:** Streaks create anxiety for young children when broken. ToanTuDuy surfaces streak data in the parent dashboard as an *informational* signal for parents — never gamified or shown in the student surface.

**Rejected — Points, stars, or global leaderboards in the student surface:** PRD explicit non-goal (§6). Session completion feedback (score at summary) is the reward; competitive meta-layers are not.

**Rejected — Subscription upsell in the student surface:** PRD explicit requirement (FR-5). The student surface free-tier gate is a friendly "done for today" message, not a conversion funnel. All commercial content lives in the parent dashboard only.

**Rejected — Separate login per Child Profile:** Students tap a name/avatar in the parent shell; there is no per-student password. Children ages 6–9 should not be managing credentials.

**Rejected — Drag-to-reorder question list in assignment builder v1:** Higher implementation cost, low priority for teachers building small assignment sets (max 10–30 questions). Deferred to v2.

## Key Flows

### Flow 1 — Minh completes today's practice (UJ-1)

*Minh, 7, Grade 2. His mother opened ToanTuDuy and selected his Child Profile. He's on a tablet.*

1. Student home loads. "Xin chào Minh! 👋" in `{typography.display}`. Single large CTA: "Luyện tập hôm nay".
2. Minh taps the CTA. Session begins — first question loads (skeleton visible for < 2s).
3. Question 1: an illustration of animals arranged in a pattern. Question text reads "Con nào tiếp theo?" Cú sits neutral in the bottom-right of the card. Audio plays automatically (Grade 2: tap-to-play).
4. Minh taps an answer tile (bottom-right choice). The tile immediately turns green with a checkmark. Cú jumps to happy state. "Tiếp theo →" appears.
5. Minh taps "Tiếp theo". Question 2 loads.
6. Question 7: Minh taps the wrong tile. It turns rose with ×. The correct tile reveals green. Cú softens to gentle. Text below the card: "Đáp án đúng là hình vuông". "Tiếp theo →" appears.
7. **Climax:** After Question 10, the session summary screen appears. Cú is in happy state. "8 / 10" in large Baloo 2. Below: skill rows — "Nhận diện quy luật: 4/4 ✓", "Đọc hiểu bài toán: 4/6 ✓".
8. Minh taps "Về trang chủ". Student home shows with today's practice marked complete (activity indicator updated).

*Parent dashboard updates within 60s of session completion (PRD NFR).*

---

### Flow 2 — Lan checks Khôi's progress before a parent-teacher meeting (UJ-2)

*Lan, 35, Parent Account, subscribed. Grade 1 son Khôi. On phone.*

1. Lan opens ToanTuDuy. Parent dashboard loads with Khôi's profile active (last active profile).
2. Dashboard shows: "4 buổi tuần này" with activity strip (Mon, Tue, Thu, Fri filled). Streak: "4 ngày".
3. Skill summary: two "Cần luyện" badges at the top — "Đọc hiểu bài toán", "Phân loại". Three "Tốt" badges below.
4. Lan taps "Đọc hiểu bài toán" badge.
5. **Climax:** Skill detail sheet slides up. "Đọc hiểu bài toán — 55% — Cần luyện". Below: three session rows showing accuracy decline. Lan has a specific answer in hand.
6. She closes the sheet and opens account settings to verify next billing date. No action needed.

*Total time from app open to answer: under 30 seconds (PRD requirement).*

---

### Flow 3 — Cô Hương assigns a practice set and reviews completion (UJ-3)

*Cô Hương, Grade 2 teacher, 28 students. Approved Teacher Account. On laptop.*

1. Cô Hương opens Teacher Portal. Portal home shows her Class "Lớp 2A" and two draft assignment sets.
2. She clicks "Tạo bộ bài tập". Builder opens. Step 1: she names it "Ôn tập tuần 3", sets Grade Band 2, due date tomorrow.
3. Step 2: Question browser filtered to Grade 2 × Word Problems. She selects 8 questions (count shown in sticky footer: "8 / 10 câu"). She clicks "Tiếp tục".
4. Step 3: She assigns to "Lớp 2A". Confirmation: "Bộ bài tập đã được giao." Student home for Lớp 2A students now shows the assignment card.
5. **Next morning:** She opens the Class Report for "Ôn tập tuần 3". Table shows 22 rows with completion checkmarks, 6 with "—". Class average column: "Đọc hiểu: 65%".
6. **Climax:** No manual aggregation. She identifies 6 non-completers and the weak skill in one view.

---

### Flow 4 — Lan hits the free limit and subscribes (UJ-4)

*Lan, Free Tier, 5 days of use. Opens Parent Dashboard on phone.*

1. Dashboard loads. Upsell banner at top: "Khôi đã dùng hết lượt miễn phí hôm nay 🌟 — Xem gói đăng ký →".
2. Lan taps the banner. Subscription plans page opens. Monthly plan: "79,000 đ / tháng" — single CTA "Đăng ký".
3. She taps "Đăng ký". MoMo payment flow launches (provider-hosted).
4. **Climax:** Payment confirmed. Toast: "Đã đăng ký thành công! Lượt luyện tập của Khôi đã được mở." Upsell banner gone. Account settings shows next billing date.
5. Lan returns to student home for Khôi. Session CTA active; no gate card.

*Subscription activates within 10s of payment confirmation (PRD FR-24).*
