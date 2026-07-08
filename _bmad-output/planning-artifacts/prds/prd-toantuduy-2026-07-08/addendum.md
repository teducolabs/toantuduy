---
title: "ToanTuDuy PRD — Addendum"
updated: 2026-07-08
---

# PRD Addendum: ToanTuDuy

*Captures depth that belongs downstream (architecture, UX) or earned a place but does not fit the PRD body: rejected alternatives, options-considered rationale, technical decisions, and competitive detail.*

---

## Monetization Options Considered

Three models were evaluated before settling on Freemium (Option A):

| Option | Model | Rationale for / against |
|---|---|---|
| **A — Freemium** (chosen) | 5 questions/day free; monthly subscription ~79k VNĐ/month unlocks unlimited | Low acquisition friction. Lets the product prove value before asking for payment. Risk: 5-question allotment may not demonstrate enough value to convert. |
| **B — Trial → Subscription** | 14-day free trial, then subscription required | Higher conversion intent from users who paid attention to the trial window. Risk: cold-start friction; parents may not sign up if they can't "try first." |
| **C — Pay-per-term** | ~300–500k VNĐ/học kỳ | Pattern familiar to VN parents (matches tutoring/supplemental learning pricing). Risk: high upfront commitment before product trust is established; churn management is harder. |

**Chosen: Option A (Freemium)** with the explicit note that if free-to-paid conversion (SM-5) underperforms, messaging and/or the free allotment limit are the primary levers before considering a model change.

**Key open risk:** Will Vietnamese parents pay for "tư duy toán học" (mathematical reasoning) or only when they see a direct link to exam scores? If the latter, product messaging may need to pivot toward "con sẽ giải được các dạng bài khó trong kỳ thi" framing, which would also affect content curation priorities.

---

## Teacher Verification Options Considered

| Option | Tradeoff |
|---|---|
| **Manual approval** (chosen) | Maximum trust signal for first cohort; operational overhead scales linearly with teacher growth. Acceptable for v1; needs automation trigger at scale. |
| School email domain whitelist | Low friction but prone to abuse (any school-domain email qualifies); hard to maintain the domain list. |
| Self-declare + post-hoc review | Fastest onboarding; teachers could misuse the portal briefly before review. |
| School code / institution verification | Highest integrity; requires partnership with schools or MoET data, which is not feasible for v1. |

**Chosen: Manual approval** with explicit note to revisit automation (email domain + self-declare with flagging) once teacher cohort exceeds a manageable manual queue (~50–100/week).

---

## Technical Stack

- **Framework:** Next.js — appropriate for a B2C web app with SEO needs (parent acquisition via search), React ecosystem for interactive dashboards, and SSR capability.
- **Platform:** Web-first, mobile-responsive. No native app in v1. Primary device expected: mobile phone (Android), secondary: tablet, tertiary: desktop browser.
- **Payment:** MoMo as primary v1 integration. ZaloPay and local bank transfer are natural v1.1 additions based on conversion data.

These are architecture-layer decisions; the PRD treats platform and payment as product-defined constraints, not implementation specifics.

---

## Competitive Landscape Detail

**International:**
- **Prodigy Math** — RPG-format math game, ~1M teacher users. Sacrifices reasoning depth for engagement. No Vietnamese content or language support.
- **ST Math** — Spatial/visual reasoning, mastery-based progression. Closest in philosophy to ToanTuDuy but no Vietnamese localization and no teacher-parent feedback loop.
- **Brilliant** — AI-tutored, scaffolded problem-solving. Targets older learners (13+); not relevant to the 6–9 segment.
- **Khan Academy Kids** — Free, content-rich, but passive (video-heavy) and not reasoning-focused for the Vietnamese curriculum.

**Vietnam:**
- **Hocmai** — Dominant in grades 6–12 exam prep. No presence in primary reasoning practice.
- **Monkey Junior** — Early childhood (pre-school / grade 1), reading and language focus. Not a math reasoning competitor.
- **No direct competitor** is currently positioned at grades 1–3 math reasoning in Vietnamese with a teacher-parent feedback loop.

**Moat assessment (from brief):** No technology moat. Advantage is execution speed and market focus. The teacher referral flywheel (UJ-3 → SM-6) is the most defensible distribution mechanism if it works.

---

## v1 Skill Enumeration (Canonical List)

*This section defines the complete, canonical list of Skills for ToanTuDuy v1. Required by the `Skill` table in the Prisma schema, the adaptive difficulty domain model, the question seed fixtures (Story 7.5), and the Parent Dashboard Skill breakdown (FR-14). The PRD Glossary (§3) lists these as examples — this addendum formalizes them as the definitive v1 set.*

### Rationale for 4 Skills

The Brief defines two content types: **câu đố logic** (logic puzzles) and **bài toán có ngữ cảnh** (word problems). The four Skills below decompose logic puzzles into three distinct cognitive dimensions (pattern, spatial, classification) plus one word-problem Skill. Four Skills is the minimum viable set for meaningful per-Skill accuracy breakdown on the Parent Dashboard (FR-14) and for the adaptive difficulty sliding window to have differentiation signal (FR-8, FR-9).

### Skill Definitions

| `code` (DB / seed key) | `name` (Vietnamese — UI display) | Category | Description |
|---|---|---|---|
| `pattern-recognition` | Nhận diện quy luật | Logic puzzle | Identify, continue, or complete number sequences, shape patterns, and color/symbol patterns. The most fundamental systematic-reasoning skill for Grades 1–3. |
| `spatial-reasoning` | Suy luận không gian | Logic puzzle | Reason about 2D shapes, orientations, rotations, reflections, and spatial relationships. Aligns with the geometry strand in the Vietnamese Grade 1–3 curriculum. |
| `classification` | Phân loại | Logic puzzle | Group or categorize objects, numbers, or concepts by shared attributes; identify the item that does not belong. Trains attribute-based logical analysis. |
| `word-problem` | Đọc hiểu bài toán | Word problem | Read, understand, and reason through contextualized word problems requiring multi-step reasoning. The skill most predictive of later math performance (per SM-4 success metric). |

### Usage Rules

- **All four Skills are seeded in every environment** via `prisma/seed.ts` using `code` as the upsert key. IDs are cuid2-generated at seed time — never hard-coded.
- **Every Question is tagged to exactly one Skill** (per the PRD Glossary definition). No Question may have a null `skillId`.
- **The Skill `name` field is the Vietnamese display string** used in the Parent Dashboard Skill breakdown, Teacher Portal Class Report column headers, and Assignment Set builder filter. All four names are stored in `src/locales/vi/skills.ts` — never inline in component code.
- **v2 expansion note:** Additional Skills (e.g., Logical Deduction, Number Sense) may be added in v2 without breaking the adaptive difficulty algorithm — the sliding window is Skill-agnostic. Adding a new Skill requires only a new seed record and corresponding Questions.

---

## Parked Ideas (not v1)

- **Gamification (streaks, badges, leaderboards):** Increases retention signal but adds design complexity and may shift student motivation from intrinsic (reasoning) to extrinsic (points). Deferred to v2 pending retention data.
- **AI-generated questions:** Cost-efficient at scale but requires quality validation data that doesn't exist pre-launch. Deferred to v2.
- **Teacher-parent messaging in-app:** High relationship value but transforms the product into a communication platform with trust, moderation, and notification obligations. Explicit non-goal.
- **Grade 4–5 expansion:** Content complexity (fractions, ratios, multi-step problems) is substantially higher and the UX for 10–11 year olds diverges from the 6–9 UX. Defer until grade 1–3 PMF is validated.
