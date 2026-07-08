---
name: ToanTuDuy
description: >
  Math reasoning practice for Vietnamese primary students (Grades 1–3).
  shadcn/ui on Next.js + Tailwind. Brand layer overrides primary, student-mode
  canvas, and feedback tokens. All other tokens inherit shadcn defaults.
status: final
created: 2026-07-08
updated: 2026-07-08
sources:
  - _bmad-output/planning-artifacts/briefs/brief-toantuduy-2026-07-08/brief.md
  - _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md
colors:
  # --- Brand primary (orange) — all surfaces ---
  primary: '#F97316'
  primary-foreground: '#FFFFFF'
  primary-dark: '#FB923C'
  primary-foreground-dark: '#1C1007'

  # --- Student-mode canvas — replaces shadcn background only in student surfaces ---
  student-bg: '#FFF7ED'
  student-bg-dark: '#1C1007'

  # --- Correct-answer feedback — vivid green, positive ---
  feedback-correct: '#16A34A'
  feedback-correct-foreground: '#FFFFFF'
  feedback-correct-dark: '#4ADE80'
  feedback-correct-foreground-dark: '#052E16'

  # --- Incorrect-answer feedback — warm rose, NOT alarm red (avoids sense of failure) ---
  feedback-incorrect: '#F87171'
  feedback-incorrect-foreground: '#FFFFFF'
  feedback-incorrect-dark: '#FCA5A5'
  feedback-incorrect-foreground-dark: '#450A0A'

  # --- Skill status badges (parent dashboard only) ---
  skill-strong-bg: '#DCFCE7'
  skill-strong-fg: '#15803D'
  skill-strong-bg-dark: '#14532D'
  skill-strong-fg-dark: '#86EFAC'
  skill-weak-bg: '#FEF9C3'
  skill-weak-fg: '#854D0E'
  skill-weak-bg-dark: '#422006'
  skill-weak-fg-dark: '#FDE68A'

  # All remaining tokens (background, foreground, muted, muted-foreground,
  # border, input, ring, card, popover, destructive) inherit shadcn defaults.

typography:
  display:
    fontFamily: Baloo 2
    fontWeight: '700'
    fontSize: 36px
    lineHeight: '1.15'
    # Student surface only — session summary headline, mascot speech, celebration moments
  question:
    fontFamily: Be Vietnam Pro
    fontWeight: '600'
    fontSize: 22px
    lineHeight: '1.5'
    # Question prompt text in student surface; large and clear for Grade 1–3 readers
  label-student:
    fontFamily: Be Vietnam Pro
    fontWeight: '600'
    fontSize: 18px
    lineHeight: '1.4'
    # Answer button text and student-surface navigation labels
  heading:
    fontFamily: Be Vietnam Pro
    fontWeight: '700'
    fontSize: 20px
    lineHeight: '1.3'
    # Section headers in parent/teacher/admin surfaces
  body:
    fontFamily: Be Vietnam Pro
    fontWeight: '400'
    fontSize: 16px
    lineHeight: '1.65'
    # Base text across all surfaces; Be Vietnam Pro chosen for Vietnamese diacritic quality

rounded:
  sm: 8px
  md: 12px
  lg: 20px
  xl: 28px
  # Student surface uses lg/xl; adult surfaces use sm/md.
  # Intentionally rounder than shadcn defaults — brand reads warm, not clinical.

spacing:
  # Tailwind 4-based scale inherited throughout. No global overrides.
  # Student surface: inner-card padding 24px, answer-button min-height 64px,
  # touch target floor 44×44px (per PRD NFR — cross-cutting accessibility).

components:
  answer-button:
    min-height: 64px
    radius: '{rounded.lg}'
    # Student surface only. Four states: default → hover → selected-correct | selected-incorrect.
    # Tap submits immediately (no confirm step, per FR-2).

  question-card:
    radius: '{rounded.xl}'
    background: white
    shadow: shadow-sm
    # Floats on {colors.student-bg}. Contains: optional illustration,
    # question prompt at {typography.question}, audio replay button.

  feedback-overlay:
    correct-background: '{colors.feedback-correct}'
    correct-foreground: '{colors.feedback-correct-foreground}'
    incorrect-background: '{colors.feedback-incorrect}'
    incorrect-foreground: '{colors.feedback-incorrect-foreground}'
    # Answer button transforms in-place — no modal/drawer.
    # Correct: green fill + checkmark + mascot transitions to cu-happy.
    # Incorrect: rose fill + X on selected button; correct answer revealed
    # in green on its sibling; mascot transitions to cu-gentle.

  mascot:
    assets:
      - cu-neutral.svg   # idle / between questions
      - cu-happy.svg     # correct answer
      - cu-gentle.svg    # incorrect answer (soft smile, not sad)
    size: 72px
    # SVG owl mascot "Cú". Positioned in question screen and session summary.
    # Absent from parent, teacher, and admin surfaces.

  audio-button:
    icon: speaker
    label: Nghe lại
    # Accessible label always visible (icon + text). Replays TTS of question prompt.
    # Visible on every question screen; students in Grade 1–2 may not read fluently.

  skill-badge-strong:
    background: '{colors.skill-strong-bg}'
    foreground: '{colors.skill-strong-fg}'
    radius: '{rounded.sm}'
    label: Tốt
    # Parent dashboard, skill breakdown. Muted — reads as data, not alert.

  skill-badge-weak:
    background: '{colors.skill-weak-bg}'
    foreground: '{colors.skill-weak-fg}'
    radius: '{rounded.sm}'
    label: Cần luyện
    # Parent dashboard, sorted before strong badges.
---

## Brand & Style

ToanTuDuy has two audiences who share one login but inhabit completely different surfaces.

**The student surface** is a safe, joyful space for a 7-year-old doing math puzzles after dinner. It is warm, mascot-present, almost wordless in its navigation, and generous in its encouragement. The design contract: a student must never feel stupid here.

**The adult surfaces** — Parent Dashboard, Teacher Portal, Admin Panel — are clean, data-forward tools for people who need answers fast. The brand orange appears, but restrainedly: these surfaces belong to the shadcn vocabulary, not the playroom.

Both surfaces share the same brand primary orange (`#F97316`). The brand discipline: orange is an *accent* on adult surfaces; it is the *atmosphere* on the student surface.

Owl mascot **Cú** lives exclusively in the student surface. Cú is simple, flat-design, three-state. Cú's emotional reactions are the primary feedback layer for correct/incorrect answers — never text alone, always Cú + color transformation. [ASSUMPTION: Cú is delivered as three SVG assets; detailed illustration style (exact feather texture, eye shape) is left to the illustrator within the constraint of "simple, flat, 3-color maximum per state."]

Vietnamese is the product language throughout. **Be Vietnam Pro** is the body typeface — designed specifically for Vietnamese diacritic precision, available on Google Fonts. **Baloo 2** is the celebration typeface, used sparingly in the student surface for headline moments.

## Colors

The palette is one brand primary, one student-mode canvas, two feedback colors, two badge token pairs, and shadcn defaults for everything else.

- **Sunrise Orange (`#F97316`)** is the brand color. Primary buttons, active nav, CTAs across all surfaces. In the student surface it saturates the environment. In parent and teacher surfaces it appears only on primary actions and selected states.
- **Warm Cream (`#FFF7ED`)** is the student-surface canvas. Replaces shadcn's white `background` only when `data-mode="student"` is set on the root. Warm, not clinical — paper, not screen.
- **Growth Green (`#16A34A`)** is the correct-answer color. Vivid, unambiguous, celebratory. Used exclusively for correct feedback; never repurposed for progress bars, navigation, or status.
- **Gentle Rose (`#F87171`)** is the incorrect-answer color. Warm rose, not alarm red. Communicates "not quite right" rather than "failure." The mascot's gentle expression carries the encouragement; the color does not punish.
- **Skill badges** — muted green (`skill-strong-*`) and muted amber (`skill-weak-*`) in the parent dashboard. Understated so they read as data labels, not alerts.
- All remaining tokens (`card`, `border`, `muted`, `muted-foreground`, `destructive`, `ring`, `popover`) inherit shadcn defaults. Overriding them without a documented brand justification is a discipline violation.

Avoid: saturated multi-color confetti palettes on student screens (two accent colors maximum per screen), gradient fills, and overloading the adult surfaces with student-mode warmth.

## Typography

**Be Vietnam Pro** is the workhorse. It handles Vietnamese diacritics correctly across weights, renders cleanly at 16px without hinting artifacts, and covers bold through regular without needing a secondary sans-serif. All surfaces use it for body text; parent and teacher surfaces use it exclusively.

**Baloo 2** enters in the student surface only — session summary headlines, mascot speech bubbles, and celebration moments. "Tuyệt vời! 8/10 câu đúng" in Baloo 2 at 36px is a reward. The same font in the parent dashboard would be jarring.

**Question text** (`question` token, Be Vietnam Pro 600 / 22px) is intentionally larger than body. Students in Grades 1–2 are still building reading fluency; question prompts earn more space and weight. Audio playback (Nghe lại) supplements for non-fluent readers.

**Answer button labels** (`label-student`, 18px) are 2px larger than standard body to maintain legibility at the 64px button height.

Do not use Baloo 2 for question prompts or body content. Do not reduce question-text size to fit more content on screen — remove content instead.

## Layout & Spacing

Tailwind 4-based spacing scale inherited throughout. No global overrides.

**Student surface layout rules:**
- Touch target floor: **44×44px** (PRD cross-cutting NFR). Answer buttons: **64px height** minimum.
- Question card: full-width (`w-full`) on mobile and tablet, `max-w-lg` centered on desktop.
- Mascot Cú: **72×72px**, positioned absolutely at the bottom-right of the question card.
- Progress indicator ("3 / 10"): small chip, top-right of the session screen. Never covers question content.
- No persistent navigation chrome during an active session.
- Maximum two choices per row on tablet; single column on phone.

**Adult surface layout rules:**
- Parent Dashboard content max-width: `max-w-2xl` on mobile/tablet; `max-w-3xl` on desktop alongside sidebar.
- Teacher Portal: `max-w-4xl` to accommodate table layouts (class roster, assignment set builder).
- Admin Panel: single-column `max-w-2xl`.

## Elevation & Depth

Question cards and Parent Dashboard summary cards use `shadow-sm` — depth as "here is the active content." All other elevation inherits shadcn defaults (subtle hover/active shadows). No gradient surfaces; no decorative shadows.

## Shapes

Rounder than shadcn defaults throughout — the brand reads warm, not corporate.

| Token | Value | Used on |
|---|---|---|
| `rounded.sm` | 8px | Parent/teacher inputs, small chips, admin form fields |
| `rounded.md` | 12px | Parent/teacher cards, dialogs, teacher report rows |
| `rounded.lg` | 20px | Answer buttons in student surface |
| `rounded.xl` | 28px | Question card container |

No fully-rounded pills in the student surface — pills register as tags, which confuses young children. Pills (`rounded-full`) appear only on adult-surface skill badges.

## Components

ToanTuDuy inherits the following shadcn components unchanged: `Button` (base), `Card`, `Dialog`, `Sheet`, `Tabs`, `Table`, `Badge`, `Skeleton`, `Toast`, `Avatar`, `Separator`, `DropdownMenu`, `Popover`, `Input`, `Label`, `Select`. Do not restyle these.

Brand-layer additions and overrides:

**Answer button** — Student surface only. Custom component (not a shadcn `Button` variant). Min 64px height, `{rounded.lg}`. States: default (shadcn outlined + `{colors.primary}` border), hover (light orange tint `#FFF7ED`), selected-correct (`{colors.feedback-correct}` fill + checkmark icon + sibling buttons fade), selected-incorrect (`{colors.feedback-incorrect}` fill + × icon; correct sibling reveals `{colors.feedback-correct}` fill). All state transitions animate at 200ms ease-in-out.

**Question card** — White float on `{colors.student-bg}`, `{rounded.xl}`, `shadow-sm`. Sections: illustration slot (top, optional), question text (`{typography.question}`), audio button (top-right corner). Full-width on mobile/tablet.

**Mascot (Cú)** — Three SVG assets, CSS class-swapped on feedback. No text labels on the mascot. Emotion is the only communication. Cú does not appear in any adult surface.

**Feedback overlay** — Answer button transforms in-place (no modal). Both states resolve in ≤ 200ms (PRD FR-3: ≤ 500ms). Correct: `{colors.feedback-correct}` fill + Cú transitions to `cu-happy`. Incorrect: `{colors.feedback-incorrect}` fill on selected + `{colors.feedback-correct}` on correct sibling + Cú transitions to `cu-gentle` + correct answer text shown below.

**Skill badge** — Two variants (`skill-badge-strong`, `skill-badge-weak`). `rounded-full`. Used only in Parent Dashboard skill breakdown. Never in the student surface.

**Audio button** — Speaker icon + "Nghe lại" text label. Both icon and text always visible (icon-only fails WCAG for labeled controls). Triggers TTS playback of the question prompt text. [ASSUMPTION: TTS uses a Vietnamese voice via Web Speech API or a managed TTS service; exact provider is architecture's decision.]

**Surface-specific compositions** — The following components are built on shadcn base components with no brand-layer visual override beyond standard token inheritance. Each is named in kebab-case for cross-spine consistency:

| Component (kebab-case) | shadcn base | Radius | Notes |
|---|---|---|---|
| `student-home-card` | `Card` | `{rounded.xl}` | Warm cream background, primary orange CTA |
| `session-progress-chip` | inline badge | `rounded-full` | `{colors.primary}` tint, 12–14px text |
| `session-summary-card` | `Card` | `{rounded.xl}` | Celebration state; score in `{typography.display}` |
| `free-tier-gate-card` | `Card` | `{rounded.xl}` | Neutral, friendly — same card style as student-home |
| `child-profile-switcher` | `Sheet` trigger | `{rounded.sm}` | Avatar + name + chevron |
| `weekly-activity-strip` | custom row | `rounded-full` dots | Filled = `{colors.primary}`; empty = muted |
| `skill-summary-section` | composition | — | Group of `skill-badge-*` with section label |
| `grade-progress-indicator` | inline text | — | Single line + info tooltip (`Popover`) |
| `upsell-banner` | `Card` (warning variant) | `{rounded.sm}` | Orange-50 bg, left text + right link |
| `session-history-list` | `Card` + rows | `{rounded.sm}` rows | Date + score chip + skill tag row pattern |
| `skill-detail-panel` | `Sheet` | — | Full-sheet on ≤ md, push route on ≥ lg |
| `subscription-plan-card` | `Card` | `{rounded.md}` | Price prominent, 3-bullet list, single CTA |
| `class-card` | `Card` | `{rounded.md}` | Class name + meta + assignment status pill |
| `assignment-set-card` | `Card` | `{rounded.sm}` | Name + status pill (`Draft`/`Assigned`/`Done`) |
| `assignment-set-builder` | multi-step Sheet | `{rounded.md}` | Three-step: config → question browser → assign |
| `question-library-row` | `Table` row | — | Checkbox + preview + skill tag |
| `class-report-table` | `Table` | `{rounded.md}` wrapper | Sticky header; average row pinned at bottom |
| `join-code-display` | `Card` | `{rounded.sm}` | Large monospace code + copy button |
| `teacher-application-row` | `Card` | `{rounded.sm}` | Name + school + actions inline |
| `session-config-form` | `Card` + `Form` | `{rounded.sm}` | Number input + toggle + save CTA |

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use `{colors.feedback-correct}` for correct answers exclusively | Repurpose green for progress bars, active nav, or loading states |
| Use `{colors.feedback-incorrect}` (warm rose) for incorrect feedback | Use alarm red anywhere in the student surface |
| Keep mascot Cú in the student surface only | Show Cú in the parent dashboard or teacher portal |
| Use Baloo 2 only for session summary and celebration headlines | Set question prompts or body content in Baloo 2 |
| Answer buttons: tap-to-submit, immediate in-place feedback | Add a separate "Xác nhận" (confirm) step after answer selection |
| Inherit shadcn defaults for all non-brand components | Restyle shadcn's `Button`, `Card`, or `Dialog` base variants |
| `{rounded.lg}` / `{rounded.xl}` on student-surface containers | Sharp corners (< 8px) anywhere in the student surface |
| Vietnamese throughout; Be Vietnam Pro on all text | Mix English in student-facing microcopy |
| Audio button: icon + text label always visible | Icon-only audio affordance (inaccessible for screen readers) |
