# Spine Pair Review — ToanTuDuy

## Overall verdict

The spine pair is well-structured and internally disciplined: DESIGN.md follows the canonical section order perfectly and EXPERIENCE.md covers most required sections with genuine design specificity rather than PRD restatement. However, two critical structural gaps prevent sign-off: the Key Flows section is entirely absent from EXPERIENCE.md (UJ-1 through UJ-4 have no numbered protagonist flows), and the visual reference block points to a folder path and set of filenames that do not match the actual mocks in `.working/`. Component coverage is also thin — DESIGN.md defines visual specs for only the 7 brand-layer components, leaving 15+ components in EXPERIENCE.md with behavioral rows but no visual counterpart. With the Key Flows section written and references corrected, this pair would be strong.

---

## 1. Flow coverage — broken

**What was checked:** PRD UJ-1 (Minh completes a session), UJ-2 (Lan checks skill data), UJ-3 (Cô Hương assigns and reviews), UJ-4 (Lan hits free limit and subscribes). Rubric requires each UJ to have a named protagonist, numbered steps, climax beat, and a failure path in EXPERIENCE.md's Key Flows section.

### Findings

- **critical** — Key Flows section is entirely absent from EXPERIENCE.md. None of UJ-1 through UJ-4 appears as a named, step-by-step flow with protagonist, numbered steps, climax beat, or failure path. (EXPERIENCE.md — missing section). *Fix:* Add a `## Key Flows` section with four flows: UJ-1 Minh daily practice (including Free Tier gate failure path), UJ-2 Lan skill check (including no-data cold state), UJ-3 Cô Hương assign+review (including zero-completion failure path), UJ-4 Lan subscription conversion (including payment failure path).

---

## 2. Token completeness — adequate

**What was checked:** All frontmatter YAML keys verified to have hex values; all `{path.to.token}` references in prose checked for resolution; light/dark pair coverage for tokens used in both modes.

### Findings

- **high** — Skill badge color tokens lack dark-mode pairs. `skill-strong-bg`, `skill-strong-fg`, `skill-weak-bg`, `skill-weak-fg` all have light-mode values but no `*-dark` counterparts. Parent Dashboard will render in dark mode on some devices; badge contrast is unspecified. (DESIGN.md frontmatter, `colors:` block). *Fix:* Add `skill-strong-bg-dark`, `skill-strong-fg-dark`, `skill-weak-bg-dark`, `skill-weak-fg-dark` to the frontmatter. Suggested values: muted dark-green and muted dark-amber tones to maintain the "data label, not alert" intent at dark backgrounds.

- **low** — EXPERIENCE.md State Patterns uses the non-standard cross-document token reference `{DESIGN.md.question-card}` in the Loading question state row. This is not a DESIGN.md frontmatter key; it is a prose component name. (EXPERIENCE.md, State Patterns → Student Mode → Loading question). *Fix:* Replace with prose: "question-card skeleton (animated gray pulse using shadcn `Skeleton`)."

---

## 3. Component coverage — thin

**What was checked:** Every named component extracted from DESIGN.md and EXPERIENCE.md; verified each has a DESIGN.md visual entry (frontmatter and/or Components prose) AND an EXPERIENCE.md Component Patterns behavioral row.

**DESIGN.md brand-layer components (7):** `answer-button`, `question-card`, `feedback-overlay`, `mascot`, `audio-button`, `skill-badge-strong`, `skill-badge-weak`. All 7 have both frontmatter entries and prose. EXPERIENCE.md has behavioral rows for 5 of them (see Finding #1 below).

**EXPERIENCE.md-only components with no DESIGN.md visual entry (15+):** session-progress-chip, student-home-card, session-summary-card, free-tier-gate-card, child-profile-switcher, weekly-activity-strip, skill-summary-section, grade-progress-indicator, upsell-banner, session-history-list, skill-detail-panel, subscription-plan-card, class-card, assignment-set-card, assignment-set-builder, question-library-row, class-report-table, join-code-display, teacher-application-row, session-config-form.

### Findings

- **high** — 20 components in EXPERIENCE.md Component Patterns have behavioral definitions but no corresponding DESIGN.md Components entry (visual shape, radius, shadow, background). DESIGN.md's scope statement ("brand-layer additions and overrides") implicitly delegates these to shadcn defaults, but no explicit mapping is written, leaving implementers to infer. (DESIGN.md Components section — omitted). *Fix:* Add a "Surface-specific compositions" block at the bottom of DESIGN.md Components listing the 20 components with their shadcn base, radius token, and any brand-override notes (even "inherits shadcn `Card`" is sufficient).

- **medium** — Component name mismatch between spines: DESIGN.md frontmatter and Components prose use `feedback-overlay`; EXPERIENCE.md Component Patterns uses the heading `Feedback transition`. These refer to the same component. (DESIGN.md frontmatter key `feedback-overlay` vs. EXPERIENCE.md Component Patterns row `Feedback transition`). *Fix:* Align to `feedback-overlay` in EXPERIENCE.md table heading; add a parenthetical alias if desired.

- **low** — `skill-badge-strong` and `skill-badge-weak` have frontmatter entries and a Components prose block in DESIGN.md, but EXPERIENCE.md's Skill summary section does not give them dedicated Component Patterns rows — they are mentioned inline in the Skill summary section behavioral description only. (EXPERIENCE.md, Component Patterns → Parent Mode). *Fix:* Add explicit `Skill badge` row to the Parent Mode component table.

---

## 4. State coverage — adequate

**What was checked:** For each IA surface, expected states (empty, cold-load, loading, error, offline) checked against EXPERIENCE.md State Patterns.

**Covered well:** Student Mode has 9 states. Parent Mode has 8 states including payment-failed and subscription-cancelled. Teacher Mode has 5 states. Admin Mode has 2 states.

### Findings

- **medium** — Offline state not defined for any surface. A student mid-session losing connectivity, a parent loading the dashboard without network, or a teacher submitting the assignment builder while offline — none have a defined treatment. (EXPERIENCE.md State Patterns — all four mode tables). *Fix:* Add a cross-surface "Offline" state row to each table (or a separate "Cross-surface states" table): suggest a shadcn `Toast` banner "Không có kết nối — thử lại" and disabled submit controls, with auto-retry on reconnect.

- **medium** — Network error / generic failure state absent for loading operations. Loading dashboard, loading class report, saving session config — all have loading states but no error resolution. (EXPERIENCE.md State Patterns — Parent Mode loading dashboard; Teacher Mode class report; Admin Mode config). *Fix:* Add error state row per surface: inline error message + retry CTA using shadcn `Toast` or inline error card.

- **low** — Auto-advance disabled for the last question in a session is specified in State Patterns, but the corresponding state for "last question — awaiting explicit Tiếp theo tap" is not named as its own state row; it is embedded in the Auto-advance row prose. Implementers may miss the special-case rule. (EXPERIENCE.md, State Patterns → Student Mode → Auto-advance). *Fix:* Split into two rows: "Auto-advance (questions 1 to N−1)" and "Final question — manual advance only."

---

## 5. Visual reference coverage — broken

**What was checked:** EXPERIENCE.md IA section references to mock files; actual files present in the workspace at `.working/` path.

**Actual mocks present in `.working/`:**
- `.working/key-session-question.html` ✓
- `.working/key-parent-dashboard.html` ✓
- `.working/key-teacher-portal.html` ✓

**EXPERIENCE.md IA reference block states:** "Composition references (to be created in `mockups/`): `student-home.html`, `session-question.html`, `session-summary.html`, `parent-dashboard.html`, `skill-detail.html`, `teacher-portal-home.html`."

### Findings

- **high** — Folder path mismatch: EXPERIENCE.md references `mockups/` but mocks live in `.working/`. No `mockups/` folder exists. (EXPERIENCE.md, Information Architecture, final line). *Fix:* Update the reference to `.working/`.

- **high** — Filename mismatch: actual files use `key-` prefix (`key-session-question.html`, `key-parent-dashboard.html`, `key-teacher-portal.html`); EXPERIENCE.md omits the prefix. References resolve to non-existent files. (EXPERIENCE.md, IA → same location). *Fix:* Update referenced names to match actual filenames.

- **high** — Three compositions referenced in EXPERIENCE.md do not exist anywhere in the workspace: `student-home.html`, `session-summary.html`, `skill-detail.html` (even with or without the `key-` prefix). They represent the student primary surface and the post-session summary — arguably the highest-stakes screens. (EXPERIENCE.md IA → Composition references; workspace `.working/` directory). *Fix:* Either create these mocks or explicitly annotate the reference as "to be created" with a priority note.

---

## 6. Bloat & overspecification — strong

**What was checked:** Pixel specs where tokens suffice, PRD FR restatement, prose where tables work better.

### Findings

- **low** — Several `[ASSUMPTION]` notes are embedded inline in Component Patterns rows (audio auto-play behavior, Cú illustration on free-tier gate, join code expiry, session row non-interactive in v1, plan card 3-bullet limit, class report display name for privacy). These are design decisions, not UX unknowns — they would be better logged in the spine's decisions register or moved to a frontmatter `decisions:` block. Inline, they interrupt behavioral reading. (EXPERIENCE.md, Component Patterns, multiple rows). *Fix:* Consolidate into a `## Decisions` appendix with a short rationale per item; replace inline text with "(see Decisions: D-n)."

- **low** — EXPERIENCE.md Interaction Primitives includes "Drag-to-reorder for assignment set questions: deferred to v2." This is a scope note, not an interaction primitive definition. It adds noise to the section. (EXPERIENCE.md, Interaction Primitives → Teacher Mode). *Fix:* Move to a `## Deferred to v2` appendix or remove entirely; scope is already managed in the PRD.

---

## 7. Inheritance discipline — adequate

**What was checked:** UJ/FR names vs. PRD verbatim; token syntax consistency; component name consistency across spines.

**Glossary discipline:** All PRD Glossary terms used correctly throughout both spines — Session, Child Profile, Parent Account, Assignment Set, Class, Grade Band, Skill, Difficulty Level, Free Tier, Subscription, Teacher Portal, Parent Dashboard, Class Report, Admin Panel all appear verbatim. No synonyms introduced.

**FR reference discipline:** EXPERIENCE.md Component Patterns cites FR numbers inline (FR-2, FR-4, FR-5, FR-6, FR-10, FR-11, FR-12, FR-14, FR-17, FR-18, FR-20, FR-22, FR-23, FR-25, FR-26, FR-27) rather than restating FR prose. This is the correct pattern.

**Token syntax:** `{typography.display}`, `{colors.primary}`, `{colors.feedback-correct}`, `{rounded.lg}` — all resolve correctly to DESIGN.md frontmatter keys and use consistent dot-path notation.

### Findings

- **medium** — `{DESIGN.md.question-card}` is a non-standard cross-document reference that breaks the `{category.key}` token syntax convention. (EXPERIENCE.md, State Patterns → Student Mode → Loading question). *Fix:* Prose reference: "question-card `Skeleton`" (already noted in Token section above; shared finding).

- **medium** — The 20 EXPERIENCE.md-only components have no canonical kebab-case names established in DESIGN.md. This creates a risk that implementation tickets will use different names for the same component across the two spines. (EXPERIENCE.md Component Patterns vs. DESIGN.md Components). *Fix:* Resolve when the DESIGN.md "surface-specific compositions" block (Fix from §3) is added; use kebab-case canonical names there, matching the table headings in EXPERIENCE.md.

---

## 8. Shape fit — strong

**What was checked:** DESIGN.md section order against canonical sequence; EXPERIENCE.md against required section checklist.

**DESIGN.md canonical order (required → actual):**
1. Brand & Style ✓
2. Colors ✓
3. Typography ✓
4. Layout & Spacing ✓
5. Elevation & Depth ✓
6. Shapes ✓
7. Components ✓
8. Do's and Don'ts ✓

DESIGN.md is in perfect canonical order with no extra sections inserted.

**EXPERIENCE.md required sections:**
- Foundation ✓
- IA ✓
- Voice and Tone ✓
- Component Patterns ✓
- State Patterns ✓
- Interaction Primitives ✓
- Accessibility Floor ✓
- Key Flows — **absent** ✗

EXPERIENCE.md also includes two bonus sections not in the required checklist — `Responsive & Platform` and `Inspiration & Anti-patterns` — both well-executed and additive.

### Findings

- **critical** — `## Key Flows` section absent from EXPERIENCE.md. (Already the primary finding in §1; captured here for shape-fit completeness.) (EXPERIENCE.md — end of file). *Fix:* Add the section after `## Accessibility Floor` or before `## Responsive & Platform`; see §1 Fix for content requirements.

---

## Mechanical notes

**Frontmatter completeness:**
- DESIGN.md frontmatter: `name`, `description`, `status`, `created`, `updated`, `sources`, `colors`, `typography`, `rounded`, `spacing`, `components` — all present and populated.
- EXPERIENCE.md frontmatter: `name`, `status`, `created`, `updated`, `sources` — minimal but sufficient for a behavior spine. No `components:` block expected here.

**Cross-reference consistency:**
- EXPERIENCE.md IA links to `prd.md` implicitly via FR cites; no broken FR numbers detected against the FR-1 through FR-27 range read.
- `data-mode="student"` attribute convention mentioned in DESIGN.md Colors is not cross-referenced in EXPERIENCE.md Foundation IA. Low risk but worth a note to the implementation team.

**Naming inconsistencies (summary):**
| DESIGN.md | EXPERIENCE.md | Status |
|---|---|---|
| `feedback-overlay` | `Feedback transition` | Mismatch — fix in EXPERIENCE.md |
| `mascot` | `Mascot Cú` | Acceptable alias |
| `skill-badge-strong` / `skill-badge-weak` | Unnamed in component table | Add explicit rows to EXPERIENCE.md |
| (not defined) | `session-progress-chip`, `student-home-card`, et al. (15+ components) | Add visual entries to DESIGN.md |

**Mock file path matrix:**
| Referenced in EXPERIENCE.md | Exists in workspace | Status |
|---|---|---|
| `mockups/student-home.html` | No | Missing |
| `mockups/session-question.html` | `.working/key-session-question.html` | Path + name mismatch |
| `mockups/session-summary.html` | No | Missing |
| `mockups/parent-dashboard.html` | `.working/key-parent-dashboard.html` | Path + name mismatch |
| `mockups/skill-detail.html` | No | Missing |
| `mockups/teacher-portal-home.html` | `.working/key-teacher-portal.html` | Path + name mismatch |
