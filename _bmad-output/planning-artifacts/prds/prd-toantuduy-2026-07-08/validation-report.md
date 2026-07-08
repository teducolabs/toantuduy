# Validation Report — ToanTuDuy

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md`
- **Rubric:** `.agents/skills/bmad-prd/assets/prd-validation-checklist.md`
- **Run at:** 2026-07-08T00:00:00+07:00
- **Grade:** Poor

## Overall verdict

The PRD is structurally sound and strategically coherent: vision → teacher-referral flywheel → metrics → counter-metrics form a clean arc, personas drive decisions, NFRs carry real thresholds, and non-goals do real work. The concentrated risk is in the session history / learning history cluster: FR-15's testable consequence is broken (normalization undefined), FR-7's accuracy model carries an unexamined early-anchoring problem, and a "streak" concept in UJ-2 has no FR backing it. Fix the three critical/high blockers before the architecture sprint; the rest of the document is ready to feed downstream.

Grade is **Poor** because at least one critical finding exists (FR-15 normalization undefined) per the rubric grade criteria.

## Dimension verdicts

- Decision-readiness — adequate
- Substance over theater — adequate
- Strategic coherence — strong
- Done-ness clarity — thin
- Scope honesty — adequate
- Downstream usability — adequate
- Shape fit — strong

## Findings by severity

### Critical (1)

**[Done-ness clarity]** — FR-15 normalization undefined (§4.4 FR-15)
Consequence 2 states "It reflects the Child Profile's average Difficulty Level across all Skills, normalized within the Grade Band." Three things are undefined: (1) how many Difficulty Levels exist per Grade Band — the Glossary says "ordinal rating" with no count or names; (2) what "normalized" means — percentile, min-max, lookup table; (3) how a normalized value maps to the label "Đang ở: Lớp 2, giữa kỳ." A UX designer cannot design this widget. An engineer cannot implement it. A QA tester cannot verify it.
Fix: Define the Difficulty Level ordinal scale in the Glossary (e.g., 1–5 per Grade Band). Rewrite FR-15 consequence 2 with the actual normalization formula and the label-to-value mapping. Add a [NOTE FOR PM] if the label system (đầu kỳ / giữa kỳ / cuối kỳ) is still TBD.

### High (5)

**[Done-ness clarity]** — FR-7 attempt granularity undefined (§4.2 FR-7)
"Running accuracy (correct / total attempts)" — "attempt" is never defined in the Glossary or FR. Is one Question = one attempt? If a Session has 4 Pattern Recognition Questions and 3 are correct, is that 4 attempts at 75%? This is the arithmetic foundation for FR-8 (difficulty selection) and FR-14 (Tốt/Cần luyện). Downstream implementers will make incompatible choices.
Fix: Add to FR-7 consequences: "An attempt is defined as a single Question answered within a completed Session. Questions in incomplete Sessions are not counted."

**[Done-ness clarity]** — FR-7 cumulative accuracy model unnamed (§4.2 FR-7)
"Accuracy reflects all historical attempts" — a child who answered their first 5 Pattern Recognition Questions at 20% correct must answer 45 more at 100% to reach the 70% "Tốt" threshold. A parent will see "Cần luyện" for a Skill the child mastered in recent weeks. This is a deliberate product choice that has never been named, and it directly affects parent trust (SM-2).
Fix: Add a [NOTE FOR PM]: "All-time cumulative accuracy means a child who improves significantly will continue to see 'Cần luyện' for many Sessions. Confirm this is the intended model vs. a recency-weighted approach (e.g., last-N-Sessions accuracy)."

**[Done-ness clarity]** — FR-14 "per-Session accuracy" ambiguous (§4.4 FR-14)
"Tapping a Skill shows the last 3 Sessions that included Questions from that Skill, with per-Session accuracy." This could mean (a) accuracy for that Skill within that Session specifically (e.g., "2/3 correct") or (b) running accuracy at time of Session. These tell completely different stories — (a) is a trend; (b) is a slowly-moving average. A parent using this to judge "is my child improving?" needs (a). This must be disambiguated before UX design.
Fix: Specify: "Tapping a Skill shows the last 3 Sessions that included Questions from that Skill, with the Child Profile's accuracy for that Skill *within that Session only* (e.g., '2/3 correct')."

**[Downstream usability]** — "Streak" not in Glossary (§3, §2.3 UJ-2)
UJ-2 shows "streak intact" as a visible parent-facing UI element. No FR defines what a streak is or what resets it. No Glossary entry exists. Either this is in scope (missing FR) or out of scope (misleading UJ-2). Active Glossary drift.
Fix: Add "Streak" to §3 Glossary with definition and reset rule, then add a testable consequence to FR-13. Or remove from UJ-2 and add "streak tracking" to Non-Goals.

**[Substance over theater]** — SM-4 measurement theater (§8 SM-4)
"Child Profiles with ≥ 2 weeks of Sessions show measurable improvement in word problem accuracy" has no baseline protocol, no delta threshold, and no comparison group. SM-4 is the only metric validating the adaptive engine (FR-7–FR-9). As written it passes with any positive accuracy delta, even noise.
Fix: Define a minimum meaningful delta (e.g., "per-Skill accuracy improves by ≥ 10pp from Sessions 1–5 to Sessions 11–15 for Child Profiles with ≥ 15 Sessions") and a baseline condition.

### Medium (5)

**[Decision-readiness]** — No 30-second decomposition (Vision §1, FR-13–FR-17)
"Under 30 seconds" parent value claim maps to five FRs but no FR carries it as a testable consequence. If UX or engineering must trade off between these FRs, there is no PRD basis for the call.
Fix: Add a consequence to FR-14 or the Parent Dashboard section description: "A parent can identify the weakest Skill for the active Child Profile in ≤ 3 taps / ≤ 30 seconds from Dashboard open."

**[Decision-readiness]** — Open Question 6 has no floor (§9 OQ-6)
"How many Questions are needed… No count is defined." Leaves content sprint planning and FR-9's weighting algorithm with no minimum inventory constraint. This is also a blocking dependency for SM-4.
Fix: Add a provisional [ASSUMPTION] with an order-of-magnitude floor (e.g., "≥ 50 Questions per Grade Band × Skill × Difficulty Level cell"); mark for content lead validation.

**[Done-ness clarity]** — FR-14 no minimum-attempts floor (§4.4 FR-14)
"All Skills the Child Profile has encountered at least once appear in the breakdown." A child who answered 1 Question and got it right shows 100% "Tốt" — a misleading signal.
Fix: Add a consequence: "A Skill appears in the breakdown only after the Child Profile has attempted ≥ [N] Questions from that Skill. Prior to that threshold, the Skill is listed as 'Chưa đủ dữ liệu' (insufficient data)." Mark [N] as [ASSUMPTION: A-X].

**[Done-ness clarity]** — FR-17 no retention policy beyond 30-Session display floor (§4.4 FR-17)
Active Child Profile Session history has no stated upper bound. A parent with 18 months of daily Sessions — are Sessions 31+ accessible by scrolling, or dropped?
Fix: Add to FR-17: "All completed Sessions are retained for the lifetime of the Child Profile. The display shows the most recent 30 by default with pagination/scroll to older entries."

**[Scope honesty]** — "Streak" is in scope by UJ-2 implication but has no FR or Non-Goal (§2.3 UJ-2)
If it's out of scope, UJ-2 misleads. If it's in scope, it is silently added complexity with no engineering estimate.
Fix: Either add a consequence to FR-13 defining streak, or add "streak tracking" to Non-Goals.

**[Downstream usability]** — FR-14 and FR-17 data surface overlap not cross-referenced
FR-14's Skill drill-down ("last 3 Sessions…") overlaps with FR-17 (Session history list) but there is no cross-reference. UX will need to decide if the FR-14 drill-down is a sub-view of FR-17 or a separate surface.
Fix: Add to FR-14: "The 3 Sessions shown in the Skill drill-down are sourced from the Session history (FR-17)."

### Low (3)

**[Done-ness clarity]** — FR-4 single-Skill Session summary undefined (§4.1 FR-4)
"Summary includes a per-Skill breakdown if the Session contained Questions from more than one Skill." Teacher-assigned sets targeting a single Skill produce Sessions where this condition is false — the single-Skill case is unspecified.
Fix: Add: "If the Session contained Questions from only one Skill, the Session Summary shows that Skill's accuracy (e.g., '6/8 Pattern Recognition')."

**[Downstream usability]** — Difficulty Level scale absent from Glossary (§3)
Glossary defines Difficulty Level as "an ordinal rating" with no scale. FR-8 and FR-15 both depend on it.
Fix: Add the ordinal range to the Difficulty Level Glossary entry (e.g., "1–5 per Grade Band, where 1 is easiest").

**[Scope honesty]** — Open Question 6 has no provisional assumption (§9 OQ-6)
Duplicate of medium finding above; listed here as a scope-honesty low because it leaves the PRD with a fully open inventory question, no provisional floor.
Fix: Same as above.

## Mechanical notes

- **Glossary drift — "Streak":** Appears as a visible UI concept in UJ-2 with no Glossary entry and no FR. Highest-priority drift item because it implies work.
- **Glossary drift — label system:** "Giữa kỳ" label in FR-15 example implies a curriculum-period label mapping (đầu kỳ / giữa kỳ / cuối kỳ or similar) that is defined nowhere.
- **Glossary drift — "Difficulty Level" scale:** Defined as "ordinal rating" without a stated range. FR-8 and FR-15 depend on it.
- **ID continuity:** FR-1–FR-27 contiguous ✓ · SM-1–SM-6, SM-C1–SM-C2 contiguous ✓ · UJ-1–UJ-4 contiguous ✓ · A-1–A-11 contiguous ✓
- **Assumptions Index roundtrip:** All 11 inline [ASSUMPTION] tags appear in the index; all index entries appear inline ✓. Minor: Subscription Glossary entry has an untagged inline assumption resolving to A-7 — cosmetic only.
- **UJ protagonist naming:** All four UJs have named protagonists (Minh, Lan / Khôi, Cô Hương) ✓.

## Priority fix list (ordered by blocking impact)

| # | Severity | Item | Blocks |
|---|----------|------|--------|
| 1 | critical | FR-15 normalization + Difficulty Level scale undefined | UX design, FR-8 implementation |
| 2 | high | FR-7 "attempt" granularity undefined | FR-8 difficulty selection, FR-14 accuracy display |
| 3 | high | FR-14 "per-Session accuracy" ambiguity (trend vs. snapshot) | UX design of Skill drill-down, parent trust |
| 4 | high | "Streak" in UJ-2 with no FR or Glossary entry | Scope clarity, engineering estimate |
| 5 | high | FR-7 cumulative accuracy model undisclosed (early-anchor effect) | PM decision on recency weighting |
| 6 | medium | SM-4 has no measurable threshold | Validating the adaptive learning engine |
| 7 | medium | FR-14 no minimum-attempts floor | Dashboard signal quality |
| 8 | medium | FR-17 no retention policy beyond 30-Session display floor | Architecture data retention |

## Reviewer files

- `review-rubric.md`
