---
baseline_commit: 8a0b65b
---

# Story 6.2: Subscription Plans Page

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to view available subscription plans with pricing,
so that I can make an informed purchase decision.

## Acceptance Criteria

1. **Given** I tap the upsell banner link or navigate to `/(parent)/subscription/plans`, **when** the plans page renders, **then** at least the monthly plan is shown as a `subscription-plan-card` with: price ("79,000 đ / tháng"), billing cycle, ≤ 3 bullet points, and a single "Đăng ký" CTA (FR-23, UX-DR11).
2. **Given** an annual plan is configured in `GlobalConfig`, **when** the plans page renders, **then** the annual plan card renders below the monthly plan.
3. **And** the plans page is accessible from the `upsell-banner` link and from the Account nav item (FR-23).
4. **And** the page is protected by the PARENT role check server-side (NFR-10).

## Design Decisions (resolved during story creation — do not re-litigate)

These close gaps between the ACs and the current code. Implement exactly as stated.

- **D1 — Plan pricing lives in `GlobalConfig`, read via `global-config-repository.ts`.** AC #2 says the annual plan is "configured in GlobalConfig" — the monthly price belongs there too (admin-configurable, consistent with `FREE_TIER_DAILY_ALLOTMENT`). Keys: `SUBSCRIPTION_MONTHLY_PRICE_VND` (fallback default **79000** when the row is absent/unparsable — the page must never render empty) and `SUBSCRIPTION_ANNUAL_PRICE_VND` (**no fallback** — absent or unparsable row means "annual plan not offered" and the annual card does NOT render). Add to `src/infrastructure/repositories/global-config-repository.ts`: `getSubscriptionPlanPricing(): Promise<{ monthlyPriceVnd: number; annualPriceVnd: number | null }>`. Reuse the existing `getConfigInt` helper for monthly; add a private `getConfigIntOrNull(key)` for annual (returns `null` on missing row or non-finite parse). Do NOT put pricing in `subscription-repository.ts` — that file is the AD-9 state-transition module (see its header comment); pricing is config, not subscription state.
- **D2 — Data reaches the page through a server action, never a direct repository import.** Presentation (`src/app/`, `src/components/`) must not import `src/infrastructure/` (project-context Architecture Layer Rules). New `src/app/(parent)/subscription/actions.ts` (`'use server'`) exporting `getSubscriptionPlansAction(): Promise<{ data: { monthlyPriceVnd: number; annualPriceVnd: number | null } } | { error: { code: string; message: string } }>`. First line of business: `const resolved = await requireParentAccountId(); if ('error' in resolved) return resolved` — the exact session-check pattern from `src/app/(parent)/dashboard/actions.ts` (`requireParentAccountId` is exported from `src/app/(parent)/profiles/actions.ts` and covers both the UNAUTHORIZED and role checks). Then call `getSubscriptionPlanPricing()` and return `{ data: ... }`. Server actions never throw — `{ data } | { error }` only.
- **D3 — The plans page is a Server Component that replaces the stub.** `src/app/(parent)/subscription/plans/page.tsx` currently renders "Subscription plans — coming soon" — replace wholesale. `async` RSC: call `getSubscriptionPlansAction()`; on `error` render the established inline load-error pattern (`subscription.loadErrorMessage` text — a static page has no client retry; a simple message is sufficient here, matching the "no empty-state" spirit of UX-DR14 without adding client machinery); on `data` render one `SubscriptionPlanCard` for the monthly plan and, only when `annualPriceVnd !== null`, a second card below it (AC #2). Page heading from locale (`subscription.plansTitle`). No loading skeleton needed — the page is one cheap config read (UX-DR14's skeleton mandate targets the dashboard).
- **D4 — `subscription-plan-card` component per DESIGN.md.** New `src/components/parent/subscription-plan-card.tsx`. shadcn `Card` base, `rounded-brand-md` radius (DESIGN.md: `{rounded.md}` — adult surface), `data-slot="subscription-plan-card"` (mirrors `upsell-banner`'s convention). Contents top-to-bottom: plan name (e.g. "Gói tháng"), **price prominent** (largest text on the card, e.g. `text-2xl font-semibold`), billing-cycle line included in the price string, a `<ul>` of exactly 3 bullets, single full-width `Button` CTA "Đăng ký". Props: `{ name: string; priceLabel: string; bullets: readonly string[]; cta: string }` — a dumb presentational component, all strings passed in from the page (which reads them from the locale module). NO `'use client'` directive — it renders server-side; the CTA `Button` has **no onClick/no action in this story** (D6).
- **D5 — Price string formatted to match the AC literally: "79,000 đ / tháng".** The AC and EXPERIENCE.md Flow 4 both use comma as the thousands separator (not the vi-VN dot). Locale module provides `formatVnd(amount: number): string` using `amount.toLocaleString('en-US')` (comma grouping) and functions `priceMonthly(amount)` → `` `${formatVnd(amount)} đ / tháng` `` and `priceAnnual(amount)` → `` `${formatVnd(amount)} đ / năm` ``. With the 79000 default this renders exactly "79,000 đ / tháng". Do not use `toLocaleString('vi-VN')` (gives "79.000" — contradicts the AC).
- **D6 — The "Đăng ký" CTA is visual-only in this story.** Story 6.3 wires it to the checkout server action (creates the PENDING_PAYMENT Subscription and redirects to PayOS). Render the `Button` with no handler and leave a one-line comment marking 6.3's insertion point. Do NOT disable it (the visual spec shows an active primary CTA; wiring is one story away) and do NOT link it anywhere. No Subscription record creation, no PayOS import, anywhere in this story.
- **D7 — New locale module `src/locales/vi/subscription.ts`.** No inline Vietnamese in components (UX-DR18). Exact strings:
  ```ts
  export const subscription = {
    plansTitle: 'Gói đăng ký',
    monthlyPlanName: 'Gói tháng',
    annualPlanName: 'Gói năm',
    formatVnd: (amount: number) => amount.toLocaleString('en-US'),
    priceMonthly: (amount: number) => `${subscription.formatVnd(amount)} đ / tháng`,
    priceAnnual: (amount: number) => `${subscription.formatVnd(amount)} đ / năm`,
    planBullets: [
      'Không giới hạn buổi luyện tập mỗi ngày',
      'Áp dụng cho tất cả hồ sơ của bé',
      'Hủy bất cứ lúc nào',
    ] as const,
    subscribeCta: 'Đăng ký',
    viewPlansLink: 'Xem gói đăng ký →',
    loadErrorMessage: 'Không tải được dữ liệu.',
  }
  ```
  (Bullets satisfy "≤ 3": exactly 3, reused for both cards. `viewPlansLink` matches the dashboard's existing `upsellBannerCta` wording.)
- **D8 — AC #3 "accessible from the Account nav item" resolves to two small edits.** (a) `src/app/(parent)/subscription/page.tsx` (the "Gói cước" nav target, currently a "coming soon" stub) becomes `redirect('/subscription/plans')` (import from `next/navigation`) — the Subscription nav item now lands on the plans page. (b) `src/app/(parent)/account/page.tsx` (the "Tài khoản" nav target, stub until 6.4) keeps its stub text but gains a `next/link` `Link` to `/subscription/plans` labeled with `subscription.viewPlansLink` — this is FR-23's "accessible from account settings" hook; Story 6.4 will rebuild this page around it. The upsell banner already links to `/subscription/plans` (`src/components/parent/upsell-banner.tsx` line 52) — **zero changes to the banner**.
- **D9 — AC #4 (PARENT role check) is already satisfied twice; add nothing new.** `src/app/(parent)/layout.tsx` redirects to `/login` unless `session.user.role === 'PARENT'` (lines 20–23), and D2's `requireParentAccountId` re-checks inside the action. Do not add a third check in the page; do not add middleware.
- **D10 — No schema change, no migration, no new dependency, no seed.** `GlobalConfig` already exists (`prisma/schema.prisma` lines 220–225: string key/value, parsed by consumer). Fallback defaults (D1) mean nothing breaks when the pricing rows don't exist; actually inserting rows is admin/ops work (Epic 7 config UI or manual SQL) — note it in Completion Notes as an optional ops step, don't build it.

## Tasks / Subtasks

- [x] Task 1: Pricing config repository (AC: #1, #2; D1)
  - [x] 1.1 Extend `src/infrastructure/repositories/global-config-repository.ts`: private `getConfigIntOrNull(key: string): Promise<number | null>`; export `getSubscriptionPlanPricing()` returning `{ monthlyPriceVnd, annualPriceVnd }` with keys/defaults per D1. Keep the existing exports and `getConfigInt` untouched.
- [x] Task 2: Server action (AC: #1, #2, #4; D2)
  - [x] 2.1 New `src/app/(parent)/subscription/actions.ts` with `getSubscriptionPlansAction()` — `requireParentAccountId()` gate first, then repository call, `{ data } | { error }` shape, never throws.
- [x] Task 3: Locale strings (D5, D7)
  - [x] 3.1 New `src/locales/vi/subscription.ts` with the exact strings from D7.
- [x] Task 4: UI (AC: #1, #2; D3, D4, D6)
  - [x] 4.1 New `src/components/parent/subscription-plan-card.tsx` per D4 (server-renderable, `rounded-brand-md`, `data-slot`, price prominent, 3 bullets, full-width "Đăng ký" `Button` with a `// Story 6.3 wires this CTA to the checkout server action` comment).
  - [x] 4.2 Rewrite `src/app/(parent)/subscription/plans/page.tsx` per D3: heading, monthly card always, annual card only when `annualPriceVnd !== null`, load-error message on action error.
- [x] Task 5: Entry points (AC: #3; D8)
  - [x] 5.1 `src/app/(parent)/subscription/page.tsx` → `redirect('/subscription/plans')`.
  - [x] 5.2 `src/app/(parent)/account/page.tsx` → add the `Link` to `/subscription/plans` (keep stub text; locale label `subscription.viewPlansLink`).
- [x] Task 6: Tests (all ACs)
  - [x] 6.1 New `src/infrastructure/repositories/global-config-repository.test.ts`: `vi.mock('@/lib/db')` with `globalConfig: { findUnique: vi.fn() }` (mirror `subscription-repository.test.ts`'s mock shape). Cases: monthly falls back to 79000 on missing row; monthly parses a configured value; annual is `null` on missing row; annual is `null` on non-numeric value; annual returns the configured value. (This file also covers the two pre-existing exports if trivial to include — optional.)
  - [x] 6.2 New `src/app/(parent)/subscription/actions.test.ts`: mock `@/app/(parent)/profiles/actions` (`requireParentAccountId`) and `@/infrastructure/repositories/global-config-repository`. Cases: (a) unauthorized — `requireParentAccountId` returns `{ error }` → action returns that error and the repository is never called; (b) success — returns `{ data: { monthlyPriceVnd, annualPriceVnd } }` passed through from the repository.
  - [x] 6.3 No DOM/component tests — established convention (node environment, no jsdom; 4.5 precedent). The card and page are verified by `next build` + manual QA.
  - [x] 6.4 Full gate: `npx vitest run` (**293 green at baseline — all must pass plus new**), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build`.
- [x] Task 7: Manual verification trace for Completion Notes (AC: #1, #3)
  - [x] 7.1 Trace all three entry paths in code: upsell banner `href="/subscription/plans"` → page; nav "Gói cước" `/subscription` → redirect → page; nav "Tài khoản" `/account` → link → page. State the rendered price string for the default config ("79,000 đ / tháng") and that the annual card is absent until `SUBSCRIPTION_ANNUAL_PRICE_VND` is configured. Live browser check is the established manual QA item (sandbox fallback: build + trace).

## Dev Notes

### Current state of files being modified (read them before editing)

- `src/app/(parent)/subscription/plans/page.tsx` — 3-line stub ("coming soon"). Replace wholesale (D3).
- `src/app/(parent)/subscription/page.tsx` — 3-line stub. Becomes a redirect (D8a).
- `src/app/(parent)/account/page.tsx` — 3-line stub. Gains one Link; Story 6.4 rebuilds it fully (D8b).
- `src/infrastructure/repositories/global-config-repository.ts` — 19 lines: `getConfigInt` helper + `getFreeTierDailyAllotment` / `getSessionQuestionCount`. Append only; no test file exists yet for it.
- `src/app/(parent)/layout.tsx` — already provides the PARENT gate, the "Gói cước" (`/subscription`) and "Tài khoản" (`/account`) nav items, and `max-w-3xl` content width. **No changes** — the nav labels in `src/locales/vi/common.ts` already exist.
- `src/components/parent/upsell-banner.tsx` — already links to `/subscription/plans` (line 52). **No changes.**
- `src/app/(parent)/profiles/actions.ts` — exports `requireParentAccountId()` used by every parent server action; returns `{ parentAccountId } | { error }`. Reuse, don't reimplement.

### Architecture guardrails

- **Layer rule is the story's main trap:** the RSC page must NOT import `global-config-repository` directly — Presentation imports only server actions and Domain types (project-context Architecture Layer Rules). The action in `src/app/(parent)/subscription/actions.ts` is the only bridge (D2). The dashboard (`dashboard/page.tsx` → `getDashboardDataAction`) is the exact precedent to mirror.
- **AD-9 boundary:** nothing in this story reads or writes `Subscription` rows. Do not touch `subscription-repository.ts`, the webhook route, or the cron route. Plans display is pure config.
- **Server-action contract:** session check first, `{ data } | { error }` return, never throw. Route pages render error states; they don't catch exceptions.
- **shadcn defaults:** `subscription-plan-card` inherits shadcn `Card`/`Button` unrestyled (DESIGN.md Do's and Don'ts: don't restyle base variants). Adult surface → `rounded-brand-md`; the brand-token classes already exist (used across parent/teacher surfaces).
- **UX-DR18:** zero inline Vietnamese in `.tsx` files — everything through `src/locales/vi/subscription.ts` (D7). Note the known open action item about `rounded-brand-*` vs tailwind-merge — not this story's to fix; just use the class as the other parent components do.
- **Accessibility floor (UX-DR17):** the CTA is a full-width shadcn `Button` (≥ 44px target by default); bullets are a semantic `<ul>`/`<li>`; page has one `<h1>`-level heading.

### What NOT to build (scope walls)

- **No checkout flow, no Subscription record creation, no PayOS import, no redirect to a checkout URL** — Story 6.3 (the CTA is inert, D6).
- **No subscription status display, cancel/reactivate, next-billing-date UI** — Story 6.4 (the account page stays a stub + one link).
- **No admin UI or seed for the pricing GlobalConfig rows** — Epic 7 / ops (D10). Defaults keep the page functional without them.
- **No changes to `upsell-banner`, dashboard, layout/nav, or `subscription-repository.ts`.**
- **No loading skeleton, no client components, no `'use client'`** anywhere in this story — the whole surface is server-rendered static content.
- **No new dependencies, no schema/migration changes.**

### Project Structure Notes

- Files to **create**: `src/app/(parent)/subscription/actions.ts`, `src/app/(parent)/subscription/actions.test.ts`, `src/components/parent/subscription-plan-card.tsx`, `src/locales/vi/subscription.ts`, `src/infrastructure/repositories/global-config-repository.test.ts`.
- Files to **modify**: `src/app/(parent)/subscription/plans/page.tsx` (rewrite), `src/app/(parent)/subscription/page.tsx` (redirect), `src/app/(parent)/account/page.tsx` (+1 link), `src/infrastructure/repositories/global-config-repository.ts` (append).
- Naming: kebab-case files; camelCase functions (`getSubscriptionPlansAction`, `getSubscriptionPlanPricing`); PascalCase component (`SubscriptionPlanCard`).

## Previous Story Intelligence

- **Story 6.1 (commit `8a0b65b`, done):** test baseline is now **293 tests green**; gate = vitest + `tsc --noEmit` + eslint on changed files + `next build`. It added the PayOS adapter (`initiatePayment`/`generateOrderCode` in `src/infrastructure/payment/payos.ts`), the HMAC webhook, `Subscription.payosOrderCode BigInt? @unique`, and the expiry cron — all of which Story 6.3 (not this one) will consume. Its D7 warning stands: **never let a BigInt cross a JSON boundary** — irrelevant here as long as you don't return Subscription rows (you don't).
- **Repo is pnpm-managed** (`pnpm add`, not `npm install`) — irrelevant here (no new deps) but don't "fix" anything with npm.
- **Mock conventions:** inline `vi.mock('@/lib/db')` per test file, `environment: 'node'`, no DOM tests (Story 4.5 precedent). Action tests mock the modules the action imports (see `dashboard/actions.test.ts` and `profiles/actions.test.ts` for the exact style, including mocking `requireParentAccountId`).
- **Verification convention:** live browser QA is usually impossible in the sandbox; accepted fallback is `next build` + unit coverage + an explicit code trace in Completion Notes with the live gap flagged (Task 7). The Epic 2 retro action item ("manual browser pass before done") remains open — flag it for Toan.
- **Git pattern:** one commit per story, conventional-commit style (`feat(subscriptions): ...`), story file + sprint-status.yaml updated in the same commit.

## Latest Tech Notes (verified 2026-07-24)

- **No new packages.** Next `15.3.9`: `redirect()` from `next/navigation` works in RSC pages (throws internally — call it unconditionally at the top, no `return` needed but returning is fine); async Server Components + server actions as already used everywhere in this repo.
- `Number.prototype.toLocaleString('en-US')` gives comma grouping deterministically in Node ≥ 13 (full-icu built in) — safe for D5's exact "79,000" rendering server-side.
- shadcn `Card`/`Button` components already vendored under `src/components/ui/` — import, don't re-generate.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.2] (lines 1071–1089) — ACs verbatim; Epic 6 overview (1043–1045, 255–259); Story 6.3 (1091–1112) and 6.4 (1114–1134) for the scope boundary
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-23] (357–363) — plans page + both entry points; §4.6 (351–353) freemium context; A-7 (518) — 79,000 VNĐ monthly, annual TBD (hence D1's optional annual key)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/DESIGN.md] (line 254) — `subscription-plan-card`: Card base, `{rounded.md}`, price prominent, 3-bullet list, single CTA; Do's and Don'ts (264–276)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#Flow 4] (360–370) — "79,000 đ / tháng", single CTA "Đăng ký" (exact strings)
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR11/UX-DR14/UX-DR17/UX-DR18] (174–190) — component mandate, parent state patterns, a11y floor, locale rule
- [Source: _bmad-output/project-context.md#Architecture Layer Rules / #Code Style] — layer direction, server-action contract, locale + naming rules, adult-surface radii
- [Source: prisma/schema.prisma] (220–225) — GlobalConfig string key/value model (no schema change needed)
- [Source: src/infrastructure/repositories/global-config-repository.ts] — `getConfigInt` pattern to extend
- [Source: src/app/(parent)/dashboard/page.tsx + actions.ts] — RSC → server action → repository precedent, `requireParentAccountId` gate
- [Source: src/app/(parent)/layout.tsx] (12–23) — PARENT gate + nav items already in place
- [Source: src/components/parent/upsell-banner.tsx] (line 52) — existing `/subscription/plans` link (AC #3, no change)
- [Source: _bmad-output/implementation-artifacts/6-1-payos-payment-infrastructure-webhook-handler.md] — baseline 293, pnpm, conventions, 6.3 handoff points

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Epics, PRD FR-23, UX DESIGN/EXPERIENCE specs, project context, the parent layout/nav, the upsell banner, GlobalConfig schema + repository, the dashboard's action pattern, and Story 6.1's intelligence were analyzed. The ten design decisions resolve every gap between the epic's ACs and the current system — notably where plan pricing lives (D1), how data crosses the layer boundary (D2), the exact price-string format (D5), the inert-CTA staging against 6.3 (D6), and how "accessible from the Account nav item" maps onto the existing `/subscription` and `/account` stubs (D8).

## Dev Agent Record

### Agent Model Used

claude-fable-5 (Claude Fable 5)

### Debug Log References

- Full gate run 2026-07-24: `npx vitest run` → 32 files / **305 tests passed** (293 baseline + 12 new); `npx tsc --noEmit` → exit 0; `npx eslint` on all 9 changed files → exit 0; `npx next build` → exit 0 (`/subscription/plans` builds as a dynamic route, 390 B page JS).

### Completion Notes List

- **Implementation plan followed D1–D10 exactly.** Pricing added to `global-config-repository.ts` (keys `SUBSCRIPTION_MONTHLY_PRICE_VND` fallback 79000, `SUBSCRIPTION_ANNUAL_PRICE_VND` no fallback → `null` hides the annual card). New private `getConfigIntOrNull`; existing exports untouched. Layer rule respected: the RSC page calls `getSubscriptionPlansAction()` (new `subscription/actions.ts`, `requireParentAccountId` gate first, `{ data } | { error }`, never throws) — no direct infrastructure import from Presentation.
- **UI:** `SubscriptionPlanCard` is a server-rendered dumb component (shadcn `Card`/`Button`, `rounded-brand-md`, `data-slot="subscription-plan-card"`, price at `text-2xl font-semibold`, semantic `<ul>` of 3 bullets, full-width active "Đăng ký" CTA with no handler — `// Story 6.3 wires this CTA to the checkout server action` marks the insertion point). Plans page renders heading + monthly card always, annual card only when `annualPriceVnd !== null`, and the inline `subscription.loadErrorMessage` on action error. All strings from new `src/locales/vi/subscription.ts` (UX-DR18 — zero inline Vietnamese).
- **Entry-path trace (AC #1, #3):** (1) upsell banner → `src/components/parent/upsell-banner.tsx:52` already has `href="/subscription/plans"` (unchanged) → plans page. (2) Nav "Gói cước" → `/subscription` → `redirect('/subscription/plans')` in `src/app/(parent)/subscription/page.tsx`. (3) Nav "Tài khoản" → `/account` → new `Link` labeled "Xem gói đăng ký →" → `/subscription/plans`. With default config (no GlobalConfig rows) the monthly card renders exactly **"79,000 đ / tháng"** (`toLocaleString('en-US')` comma grouping) and the annual card is absent until `SUBSCRIPTION_ANNUAL_PRICE_VND` is configured.
- **AC #4:** PARENT gate satisfied by the existing `(parent)/layout.tsx` redirect plus `requireParentAccountId` inside the action — no new check added (D9).
- **Optional ops step (D10):** inserting the `SUBSCRIPTION_MONTHLY_PRICE_VND` / `SUBSCRIPTION_ANNUAL_PRICE_VND` GlobalConfig rows is admin/ops work (Epic 7 config UI or manual SQL); defaults keep the page fully functional without them.
- **Known gap (established convention):** live browser QA not possible in this sandbox — verification is `next build` + unit coverage + the code trace above. The Epic 2 retro action item ("manual browser pass before done") remains open — Toan, please click through the three entry paths before marking done.
- Tests: 9 new cases in `global-config-repository.test.ts` (5 pricing cases per Task 6.1 + optional coverage of the two pre-existing exports) and 3 new cases in `actions.test.ts` (unauthorized short-circuit, success pass-through, annual pass-through).

### File List

- `src/infrastructure/repositories/global-config-repository.ts` (modified — appended `getConfigIntOrNull` + `getSubscriptionPlanPricing`)
- `src/infrastructure/repositories/global-config-repository.test.ts` (new)
- `src/app/(parent)/subscription/actions.ts` (new)
- `src/app/(parent)/subscription/actions.test.ts` (new)
- `src/app/(parent)/subscription/page.tsx` (modified — stub → redirect to `/subscription/plans`)
- `src/app/(parent)/subscription/plans/page.tsx` (modified — stub → plans RSC)
- `src/app/(parent)/account/page.tsx` (modified — added Link to `/subscription/plans`)
- `src/components/parent/subscription-plan-card.tsx` (new)
- `src/locales/vi/subscription.ts` (new)
- `_bmad-output/implementation-artifacts/6-2-subscription-plans-page.md` (modified — story tracking)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status tracking)

## Change Log

- 2026-07-24 — Story 6.2 implemented: subscription plans page with GlobalConfig-driven pricing, `subscription-plan-card` component, server action, locale module, and entry points from nav + account page. Full gate green (305 tests, tsc, eslint, next build). Status → review.
