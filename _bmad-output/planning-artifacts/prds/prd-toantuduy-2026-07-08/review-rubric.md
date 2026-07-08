# PRD Quality Review — ToanTuDuy

## Overall verdict

The PRD is structurally sound and strategically coherent: vision → teacher-referral flywheel → metrics → counter-metrics form a clean arc, personas drive decisions, NFRs carry real thresholds, and non-goals do real work. The concentrated risk is in the session history / learning history cluster: FR-15's testable consequence is broken (normalization undefined), FR-7's accuracy model carries an unexamined early-anchoring problem, and a "streak" concept in UJ-2 has no FR backing it. Fix these three before the architecture sprint; the rest of the document is ready to feed downstream.

---

## 1. Decision-readiness — adequate

The PRD surfaces trade-offs honestly: free Teacher Portal cost vs. referral upside (Vision §1), Free Tier gate tension with teacher-assigned content (Open Question 5 / A-1), SSO deferral with a [NOTE FOR PM] callout. Counter-metrics (SM-C1, SM-C2) prevent metric gaming. Open Questions are genuinely open with named owners and revisit triggers.

One gap: the 30-second Parent Dashboard promise ("answers 'where is my child struggling?' in under 30 seconds," §1 Vision) is the product's core parent value proposition and appears in UJ-2's climax, but it is never decomposed into what the FR cluster (FR-13–FR-17) must collectively deliver to satisfy it. If any one of those FRs falls short, no PM has a basis for reprioritizing among them.

Open Question 6 (question library size) is flagged but unbounded — no order-of-magnitude floor, no content sprint dependency noted. This is a blocking dependency for FR-1 and FR-9 (session composition fails if per-Skill/Grade-Band/Difficulty Level inventory is thin) and for SM-4 (learning signal requires enough question variety to avoid repeat exposure).

### Findings
- **medium** No 30-second decomposition (Vision §1, FR-13–FR-17) — The "under 30 seconds" parent value claim maps to five FRs but no FR carries it as a consequence. If UX or engineering must trade off between these FRs, there is no PRD basis for the call. *Fix:* Add a consequence to FR-14 or the Parent Dashboard section description: "A parent can identify the weakest Skill for the active Child Profile in ≤ 3 taps / ≤ 30 seconds from Dashboard open."
- **medium** Open Question 6 has no floor (§9 OQ-6) — "How many Questions are needed…No count is defined." The absence leaves content sprint planning and FR-9's weighting algorithm with no minimum inventory constraint. *Fix:* Add a temporary [ASSUMPTION] with an order-of-magnitude floor (e.g., "≥ 50 Questions per Grade Band × Skill × Difficulty Level cell") to unblock planning; mark it for content lead validation.

---

## 2. Substance over theater — adequate

Personas drive decisions: Minh → FR-1/FR-5 edge cases; Lan → FR-13/FR-14/FR-15 specificity; Cô Hương → FR-20/FR-21 workflow. NFRs have real thresholds (500ms, 2s, 1s, 3s, 60s, 44×44px). The Vision statement is product-specific (teacher-referral flywheel, "default standard…in place of a private reasoning tutor").

One clear theater instance:

### Findings
- **high** SM-4 is measurement theater (§8 SM-4) — "Child Profiles with ≥ 2 weeks of Sessions show *measurable improvement* in word problem accuracy" has no baseline protocol, no delta threshold, and no comparison group. SM-4 is the only metric that validates the adaptive learning engine (FR-7–FR-9). As written it passes with any positive accuracy delta, even noise. *Fix:* Define a minimum meaningful delta (e.g., "per-Skill accuracy improves by ≥ 10 percentage points from Sessions 1–5 to Sessions 11–15 for Child Profiles with ≥ 15 Sessions") and a baseline condition (accuracy in first 2 Sessions vs. Sessions 11–15).

---

## 3. Strategic coherence — strong

The thesis is explicit: free Teacher Portal → teacher referral → parent acquisition → student practice → learning signal validates product. Every major feature cluster serves one leg of this arc:

- FR-18–FR-22 (Teacher Portal, free) → SM-3, SM-6
- FR-13–FR-15 (Parent Dashboard analytics) → SM-2 (NPS), parent retention
- FR-7–FR-9 (Adaptive Difficulty + Skill tracking) → SM-4 (learning signal), SM-1 (retention)
- FR-23–FR-25 (Subscription) → SM-5 (conversion)

Counter-metrics (SM-C1 skip rate, SM-C2 dwell time) are named and their anti-gaming logic is explained. Success Metrics link back to specific FRs.

No findings.

---

## 4. Done-ness clarity — thin (one broken)

Most FRs are adequately specified with testable consequences and real bounds. The session history / learning history cluster (FR-7, FR-13, FR-14, FR-15, FR-17) carries disproportionate ambiguity — consistent with the PM's concern.

### FR-7 (per-Skill accuracy tracking) — **thin**

FR-7 states "running accuracy (correct / total attempts) across all completed Sessions." Two problems:

1. **Attempt granularity is undefined.** Does one Question = one attempt for that Skill? If a Session contains 4 Pattern Recognition Questions and the student answers 3 correctly, is that 4 attempts at 75%? The word "attempts" is never defined in the Glossary or FR. This definition is the arithmetic foundation for FR-8 (difficulty selection) and FR-14 (Tốt/Cần luyện). Downstream implementers will make incompatible choices.

2. **Cumulative accuracy has an unexamined early-anchoring problem.** "Accuracy reflects all historical attempts for that Skill, not just the most recent Session" — a child who answered their first 5 Pattern Recognition Questions at 20% correct must now answer 45 more at 100% to reach 70% (the FR-14 "Tốt" threshold). A parent looking at FR-14 will see "Cần luyện" for a Skill the child has mastered in recent weeks. This is not necessarily wrong, but it is a deliberate product choice that has never been named as such. It directly affects parent trust (SM-2) and dashboard honesty.

### FR-13 (weekly activity summary) — **adequate, one gap**

Consequences are testable. However, UJ-2 describes "streak intact" as a visible parent-facing UI element ("She sees: 4 Sessions completed this week, streak intact"). No FR defines what a "streak" is or requires it. FR-13 only requires a count and a day-presence indicator — not a streak. Either "streak" is a feature that needs its own FR, or UJ-2 is misleading. See Mechanical Notes.

### FR-14 (Skill breakdown view) — **thin**

The three consequences are testable. Two unresolved gaps:

1. **"Per-Session accuracy" in the drill-down is ambiguous.** "Tapping a Skill shows the last 3 Sessions that included Questions from that Skill, with per-Session accuracy." This could mean (a) the child's accuracy for that specific Skill within that specific Session (e.g., "2/3 word problems correct in Session 7") or (b) the child's running per-Skill accuracy at the time of that Session. These tell completely different stories — (a) is a trend; (b) is a history of a slowly-moving average. A parent using this to judge "is my child improving?" needs (a). This must be disambiguated before UX design.

2. **No floor on minimum attempts before a Skill appears.** "All Skills the Child Profile has encountered at least once appear in the breakdown." A child who answered 1 Question from a Skill and got it right shows 100% / "Tốt." This produces a misleading signal after 1 Question. A minimum-attempts floor (e.g., ≥ 3 Questions before the Skill is categorized) would prevent noise.

### FR-15 (grade progress indicator) — **broken**

Consequence 2: "It reflects the Child Profile's average Difficulty Level across all Skills, normalized within the Grade Band."

This is not testable. Three things are undefined:

1. **How many Difficulty Levels exist per Grade Band?** The Glossary defines Difficulty Level as "an ordinal rating within a Grade Band" — no count, no names, no range.
2. **What does "normalized" mean?** Percentile? Min-max scaling? A lookup table?
3. **How does a normalized value map to the displayed label?** The example "Đang ở: Lớp 2, giữa kỳ" (Grade 2, midterm) implies a mapping from a numeric value to a curriculum-period label ("đầu kỳ / giữa kỳ / cuối kỳ" or similar). This mapping exists nowhere in the PRD or Glossary.

A UX designer cannot design this widget. An engineer cannot implement it. A QA tester cannot verify it. FR-15 consequence 2 must be rewritten with the actual scale.

### FR-17 (Session history) — **adequate, one gap**

Consequences are largely testable. One gap: no data retention policy beyond the 30-Session display floor. A parent with 18 months of daily Sessions — are Sessions 31+ accessible by scrolling, or are they dropped? The Glossary's Child Profile entry says it "holds Session history" without bounds. Contrast with A-3 (deleted Child Profile history retained 30 days) — active profile history has no stated limit.

### Other done-ness findings

- **FR-4 edge case (§4.1)** — "Summary includes a per-Skill breakdown *if* the Session contained Questions from more than one Skill." Teacher-assigned sets targeting a single Skill produce a Session with one Skill. In that case, the Session Summary shows only total/correct with no Skill breakdown. Is that the intended UX? Implied yes, but never stated.
- **FR-8 (§4.2)** — Testable consequences cover only the two extremes (<50% → lower, >80% → higher). What happens at 65%? The middle band is untested territory. Not broken, but a QA team will need to ask.

### Findings
- **critical** FR-15 normalization undefined (§4.4 FR-15) — "normalized within the Grade Band" is untestable; Difficulty Level ordinal scale, normalization function, and label mapping (e.g., "giữa kỳ") are all absent. *Fix:* Define the Difficulty Level scale (e.g., 1–5 per Grade Band) in the Glossary; specify how the normalized value maps to the displayed label in FR-15's consequences; add a [NOTE FOR PM] if the label system is still TBD.
- **high** FR-7 attempt granularity undefined (§4.2 FR-7) — "correct / total attempts" uses an undefined unit. *Fix:* Add to FR-7: "An attempt is defined as a single Question answered within a completed Session. Questions in incomplete Sessions are not counted."
- **high** FR-7 cumulative accuracy model unnamed (§4.2 FR-7) — All-time averaging silently penalizes improved children. *Fix:* Add a [NOTE FOR PM]: "All-time cumulative accuracy means a child who improves significantly will continue to see 'Cần luyện' for many Sessions. Confirm this is the intended model vs. a recency-weighted approach (e.g., last-N-Sessions accuracy)."
- **high** FR-14 "per-Session accuracy" ambiguous (§4.4 FR-14) — Drill-down meaning is unclear between (a) Skill accuracy within that Session vs. (b) running accuracy at time of Session. *Fix:* Specify explicitly: "Tapping a Skill shows the last 3 Sessions that included Questions from that Skill, with the Child Profile's accuracy for that Skill *within that Session only* (e.g., '2/3 correct')."
- **medium** FR-14 no minimum-attempts floor (§4.4 FR-14) — A single correct answer produces 100% "Tốt." *Fix:* Add a consequence: "A Skill appears in the breakdown only after the Child Profile has attempted ≥ [N] Questions from that Skill. Prior to that threshold, the Skill is listed as 'Chưa đủ dữ liệu' (insufficient data)." Mark [N] as [ASSUMPTION: A-X].
- **medium** FR-17 no retention policy for Sessions beyond 30 display floor (§4.4 FR-17) — Active Child Profile Session history has no stated upper bound. *Fix:* Add to FR-17: "All completed Sessions are retained for the lifetime of the Child Profile (or until the Child Profile is deleted, per FR-11/A-3). The display shows the most recent 30 by default with pagination/scroll to older entries."
- **low** FR-4 single-Skill Session summary undefined (§4.1 FR-4) — Assigned sets often produce single-Skill Sessions; the conditional "if more than one Skill" leaves the single-Skill case unspecified. *Fix:* Add: "If the Session contained Questions from only one Skill, the Session Summary shows that Skill's accuracy (e.g., '6/8 Pattern Recognition')."

---

## 5. Scope honesty — adequate

Non-Goals section does real work: each entry carries a reasoning note and is specific (e.g., "AI-generated questions — v2. Requires sufficient data to validate output quality"). [ASSUMPTION] tags are inline and indexed. [NOTE FOR PM] callouts flag ZaloPay, SSO, and annual plan as real deferral tensions.

### Findings
- **medium** "Streak" is in scope by UJ-2 implication but has no FR or Non-Goal (§2.3 UJ-2) — UJ-2 shows "streak intact" as visible parent-facing UI. There is no FR covering streak calculation, display, or reset rules, and no Non-Goal excluding it. If it's out of scope, UJ-2 misleads. If it's in scope, it is silently added complexity. *Fix:* Either add a consequence to FR-13 defining streak (e.g., "A streak counter shows the number of consecutive calendar days on which at least one Session was completed"), or add "streak tracking" to Non-Goals with an explanation.
- **low** Open Question 6 has no provisional assumption (§9 OQ-6) — Question library size is fully open with no floor, leaving content sprint planning and FR-9's engine with zero constraint. *Fix:* Add a provisional [ASSUMPTION] with a target minimum; flag it for content lead validation.

---

## 6. Downstream usability — adequate

Glossary is comprehensive; Glossary terms are used verbatim in FRs (discipline is enforced by §0). FR IDs FR-1–FR-27 are contiguous with no gaps. UJ protagonists are named (Minh, Lan, Cô Hương). Assumptions A-1–A-11 all appear inline and in the index — roundtrip is clean.

### Findings
- **high** "Streak" not in Glossary (§3, §2.3 UJ-2) — UJ-2 uses "streak" as a UI-visible concept with no Glossary entry and no FR. This is active Glossary drift. *Fix:* Add "Streak" to §3 Glossary with definition and reset rule, then add a testable consequence to FR-13. Or remove from UJ-2 explicitly.
- **medium** FR-14 and FR-17 data surface overlap not cross-referenced — FR-14's Skill drill-down ("last 3 Sessions that included Questions from that Skill") overlaps with FR-17 (Session history list), but there is no cross-reference between them. UX will need to decide if the FR-14 drill-down is a sub-view of FR-17 or a separate surface. *Fix:* Add a cross-reference in FR-14: "The 3 Sessions shown in the Skill drill-down are sourced from the Session history (FR-17)."
- **low** Difficulty Level scale absent from Glossary (§3) — The Glossary defines Difficulty Level as "an ordinal rating" but gives no scale (e.g., 1–5). FR-8 and FR-15 both depend on this scale. *Fix:* Add the ordinal range to the Difficulty Level Glossary entry (e.g., "1–5 per Grade Band, where 1 is easiest").

---

## 7. Shape fit — strong

Multi-stakeholder B2B/consumer product (parent buyer, child user, teacher growth channel) with named protagonists in every UJ. The PRD feeds UX → architecture → stories (stated in §0). Feature sections are organized by user role surface, which matches how downstream teams will work. The free Teacher Portal decision is the biggest structural bet and it is named explicitly in Vision, not buried.

No findings.

---

## Mechanical notes

**Glossary drift:**
- "Streak" (UJ-2, §2.3): appears as a visible UI concept with no Glossary entry and no FR. Highest-priority drift item because it implies work.
- "Giữa kỳ / đầu kỳ / cuối kỳ" label system (FR-15): these curriculum-period terms are used in an example consequence but have no definition anywhere. If the label system is TBD, add a [NOTE FOR PM].

**ID continuity:**
- FR-1 through FR-27: contiguous, unique. ✓
- SM-1 through SM-6, SM-C1, SM-C2: contiguous. ✓
- UJ-1 through UJ-4: contiguous. ✓
- A-1 through A-11: contiguous. ✓
- Note: FR-18 through FR-22 and FR-23 through FR-27 are fully specified in the PRD (not stubs). IDs are accurate.

**Assumptions Index roundtrip:**
- A-1 (FR-6) ✓, A-2 (FR-11) ✓, A-3 (FR-11) ✓, A-4 (FR-14) ✓, A-5 (FR-19) ✓, A-6 (FR-21) ✓, A-7 (§4.6/FR-23) ✓, A-8 (FR-24/UJ-4) ✓, A-9 (FR-18) ✓, A-10 (SM-5) ✓, A-11 (FR-5) ✓
- All 11 inline tags appear in the index. All index entries appear inline. Roundtrip is clean. ✓
- Note: Subscription Glossary entry contains an inline `[ASSUMPTION]` tag ("initial monthly price ~79,000 VNĐ") that is not numbered — it resolves to A-7 in the index but uses different inline syntax than the rest. Cosmetic inconsistency only.

**UJ protagonist naming:**
- UJ-1: Minh (student), mother unnamed ✓
- UJ-2: Lan (parent), Khôi (child) ✓
- UJ-3: Cô Hương (teacher) ✓
- UJ-4: Lan (parent), Khôi (child) ✓
- All protagonists are named. ✓

---

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
