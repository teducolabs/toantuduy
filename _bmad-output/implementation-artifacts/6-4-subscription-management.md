---
baseline_commit: 94298ff
---

# Story 6.4: Subscription Management

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to view my subscription status, cancel it (effective at period end), and reactivate it,
so that I have full billing control without contacting support.

## Acceptance Criteria

1. **Given** I navigate to `/(parent)/account` with an `ACTIVE` subscription, **when** the account page renders, **then** I see: subscription status "Đang hoạt động", next billing date, and a "Hủy đăng ký" button (FR-25).
2. **Given** I tap "Hủy đăng ký" and confirm, **when** cancellation is processed, **then** `Subscription.status` is set to `CANCELLED`; full access is retained until `renewsAt`; account settings shows: "Đã hủy — có hiệu lực đến [date]" + "Kích hoạt lại" CTA (FR-25, UX-DR14).
3. **Given** I tap "Kích hoạt lại" or "Đăng ký" again, **when** the flow initiates, **then** a new PayOS payment flow launches (same as Story 6.3).
4. **And** the cancellation server action verifies `session.user.role === 'PARENT'` and that `Subscription.parentAccountId` matches the session; mismatches return `{ error: { code: 'FORBIDDEN' } }`.

## Design Decisions (resolved during story creation — do not re-litigate)

These close gaps between the ACs and the current code. Implement exactly as stated.

- **D1 — CRITICAL: "full access until renewsAt" requires extending `hasActiveSubscription` (paid-through rule).** Today it returns `subscription?.status === 'ACTIVE'` — the moment status flips to `CANCELLED`, the free-tier gate and upsell banner would kick in immediately, violating AC #2. Change it to: `return sub?.status === 'ACTIVE' || (sub?.renewsAt != null && sub.renewsAt > new Date())`. Walk the state machine to see why this exact rule is right: ACTIVE → true (first clause, even if cron is late). CANCELLED with future `renewsAt` → true (paid-through — the AC's requirement). CANCELLED past `renewsAt` → false (and `expireDueSubscriptions` already flips CANCELLED → EXPIRED on schedule — built in 6.1 anticipating exactly this story). Fresh PENDING_PAYMENT (never paid, `renewsAt` null) → false. PENDING_PAYMENT with future `renewsAt` (a CANCELLED parent who tapped "Kích hoạt lại" then abandoned the PayOS page — `createPendingSubscription` resets status but never touches `renewsAt`) → true: they paid for that period, abandoning a reactivation checkout must not strip it. EXPIRED → false (cron only expires rows with `renewsAt <= now`, so no EXPIRED row can have a future `renewsAt`). Do NOT change the function signature (no `now` param) — both callers (`isAllotmentExhausted` → student gate + upsell banner) pick up the fix for free; tests use `renewsAt` fixtures relative to `Date.now()` (e.g. `new Date(Date.now() + 86_400_000)`).
- **D2 — New repository write `cancelSubscription(parentAccountId: string, cancelledAt: Date): Promise<boolean>` in `subscription-repository.ts`.** `updateMany({ where: { parentAccountId, status: 'ACTIVE' }, data: { status: 'CANCELLED', cancelledAt } })`; return `result.count > 0`. `updateMany` with the `status: 'ACTIVE'` WHERE guard mirrors `activateSubscriptionByOrderCode`'s idempotency pattern: a double-tap or a cancel against a non-ACTIVE row matches zero rows and is a no-op. `renewsAt` is NOT touched — it becomes the "có hiệu lực đến" date and the expiry-cron trigger. **AD-9 header amendment (third edit to that comment):** append that ACTIVE → CANCELLED is invoked ONLY by the cancel server action — it grants nothing (it *reduces* entitlement; access until `renewsAt` comes from the paid-through read, D1); activation stays webhook-only, expiry stays cron-only.
- **D3 — Cancel server action `cancelSubscriptionAction()` in `src/app/(parent)/subscription/actions.ts`, no arguments.** Flow: (1) `requireParentAccountId()` — returns `{ error: { code: 'UNAUTHORIZED' } }` on missing session or non-PARENT role (this IS the AC #4 role check; keep the existing gate's code, do not rename it to FORBIDDEN). (2) `cancelSubscription(resolved.parentAccountId, new Date())`. (3) `false` (no ACTIVE row for this parent) → `{ error: { code: 'FORBIDDEN', message: 'No active subscription to cancel' } }` — AC #4's mandated code for any cancel the caller isn't entitled to make. (4) On success: `revalidatePath('/account')` and `revalidatePath('/dashboard')` (precedent: `profiles/actions.ts` uses `revalidatePath` after mutations), then return `{ data: { cancelled: true } }`. **The action takes NO subscription id from the client** — it cancels the session-derived parent's own row, which makes the AC's "parentAccountId matches the session" structurally guaranteed rather than checked; state this in a comment.
- **D4 — Account page rebuilt as the subscription-management surface.** `src/app/(parent)/account/page.tsx` (async RSC, PARENT gate automatic via `(parent)` layout): heading `subscription.accountTitle`, section heading `subscription.subscriptionSectionTitle`, then one of three views computed by a PURE helper `resolveAccountSubscriptionView(summary: { status: string; renewsAt: string | null } | null, now: Date): 'active' | 'cancelled' | 'none'` in new `src/app/(parent)/account/account-view-state.ts`: `'active'` when `status === 'ACTIVE'`; `'cancelled'` when `renewsAt != null && new Date(renewsAt) > now && status !== 'ACTIVE'` (covers CANCELLED, and PENDING_PAYMENT-with-future-renewsAt = abandoned reactivation — still paid-through, D1); else `'none'`. Views: **active** → `subscription.statusActiveLabel` + existing `nextBillingDateLabel(renewsAt.toLocaleDateString('vi-VN'))` + `<CancelSubscriptionDialog />` (D5). **cancelled** → `subscription.statusCancelledLabel(date)` ("Đã hủy — có hiệu lực đến [date]", date = `renewsAt.toLocaleDateString('vi-VN')`) + `<SubscribeButton plan="MONTHLY" label={subscription.reactivateCta} />` (D6). **none** (no row / EXPIRED / fresh PENDING_PAYMENT) → `subscription.statusNoneLabel` + the existing `viewPlansLink` `Link`. Data source: the existing `getSubscriptionSummaryAction()` unchanged (it already returns `{ status, renewsAt: string | null } | null`). On action `error` → render `subscription.loadErrorMessage` (existing key) + the plans link; no retry UI. The hardcoded English stub text "Account — coming soon" is DELETED (it violated the locale rule anyway). The plans `Link` (`viewPlansLink`) renders ONLY in the 'none' and error views — 'active'/'cancelled' users reach plans via the nav item.
- **D5 — Cancel confirmation: new `src/components/parent/cancel-subscription-dialog.tsx` (`'use client'`), mirroring `delete-child-profile-dialog.tsx` EXACTLY** (the repo's AlertDialog + destructive-trigger + toast pattern): `AlertDialogTrigger render={<Button variant="destructive" size="sm" />}` labeled `subscription.cancelCta`; title `subscription.cancelConfirmTitle`; description `subscription.cancelConfirmBody(effectiveUntil)` — takes prop `{ effectiveUntil: string }` (the formatted `renewsAt` date passed from the RSC) so the parent sees exactly how long access lasts before confirming; footer `AlertDialogCancel` = `subscription.cancelConfirmKeepCta`, `AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}` = `subscription.cancelCta` / `subscription.subscribeCtaPending` while submitting. `handleConfirm`: `await cancelSubscriptionAction()`; `'error' in result` → `toast.error(subscription.cancelErrorToast)`; success → close dialog + `toast.success(subscription.cancelSuccessToast(effectiveUntil))`. No `router.refresh()` needed — the action's `revalidatePath('/account')` re-renders the RSC with the cancelled view.
- **D6 — Reactivate = the 6.3 checkout flow verbatim, via a `label` prop on `SubscribeButton`.** Add optional prop `label?: string` to `src/components/parent/subscribe-button.tsx`, defaulting to `subscription.subscribeCta` (existing behavior — plans page untouched). The account page's cancelled view renders `<SubscribeButton plan="MONTHLY" label={subscription.reactivateCta} />`: one tap → `subscribeAction('MONTHLY')` → `createPendingSubscription` resets the CANCELLED row to PENDING_PAYMENT with a fresh orderCode (6.3's D2 explicitly built this branch for this story) → PayOS checkout → webhook activates and clears `cancelledAt` (6.3's D3 built that for this story too) → renewsAt = now + 30d. NOTHING else to build for AC #3. Two accepted product nuances to note in Completion Notes, not "fix": (a) reactivating before period end restarts the clock at now+30d (webhook behavior from 6.1 — no stacking; out of scope); (b) an abandoned reactivation leaves the row PENDING_PAYMENT with the old future `renewsAt` — access retained (D1) and the account page shows the 'cancelled' view (D4), from which the parent can retry.
- **D7 — Locale additions to `src/locales/vi/subscription.ts` (append-only, exact strings):**
  ```ts
  accountTitle: 'Tài khoản',
  subscriptionSectionTitle: 'Gói đăng ký',
  statusActiveLabel: 'Đang hoạt động',
  statusCancelledLabel: (date: string) => `Đã hủy — có hiệu lực đến ${date}`,
  statusNoneLabel: 'Chưa có gói đăng ký',
  cancelCta: 'Hủy đăng ký',
  reactivateCta: 'Kích hoạt lại',
  cancelConfirmTitle: 'Hủy gói đăng ký?',
  cancelConfirmBody: (date: string) =>
    `Bạn vẫn có thể sử dụng không giới hạn đến ${date}. Sau đó tài khoản sẽ trở về gói miễn phí.`,
  cancelConfirmKeepCta: 'Giữ gói đăng ký',
  cancelSuccessToast: (date: string) => `Đã hủy gói đăng ký. Có hiệu lực đến ${date}.`,
  cancelErrorToast: 'Không thể hủy gói đăng ký. Vui lòng thử lại.',
  ```
  `statusCancelledLabel` wording is UX-mandated verbatim (EXPERIENCE.md state table: "Đã hủy — có hiệu lực đến [date]"). Keep every existing key untouched; no inline Vietnamese in any `.tsx` (UX-DR18).
- **D8 — No email on cancellation.** The epic, FR-25, and EXPERIENCE.md specify no cancellation email; do not add one (AD-14 covers activation only, shipped in 6.3).
- **D9 — Date and BigInt discipline unchanged.** `renewsAt` crosses the action boundary as an ISO string (already the case via `getSubscriptionSummaryAction`); format with `.toLocaleDateString('vi-VN')` in the RSC only; `payosOrderCode` (BigInt) is never selected by `getSubscriptionSummary` — keep it that way.

## Tasks / Subtasks

- [x] Task 1: Repository (AC: #2; D1, D2)
  - [x] 1.1 `subscription-repository.ts`: extend `hasActiveSubscription` with the paid-through rule per D1 (keep signature; update the function's comment to document the rule and why PENDING_PAYMENT-with-future-renewsAt must pass).
  - [x] 1.2 Add `cancelSubscription(parentAccountId, cancelledAt)` per D2 (`updateMany`, ACTIVE guard, count > 0).
  - [x] 1.3 Amend the AD-9 header comment per D2 (ACTIVE → CANCELLED = cancel-server-action-only).
- [x] Task 2: Cancel server action (AC: #2, #4; D3)
  - [x] 2.1 `subscription/actions.ts`: add `cancelSubscriptionAction()` per D3's 4-step flow (gate → cancel → FORBIDDEN on false → revalidatePath ×2 + `{ data: { cancelled: true } }`). File gains a `revalidatePath` import (`next/cache`).
- [x] Task 3: Locale (D7)
  - [x] 3.1 Append the twelve D7 keys to `src/locales/vi/subscription.ts` verbatim.
- [x] Task 4: Cancel dialog component (AC: #1, #2; D5)
  - [x] 4.1 New `src/components/parent/cancel-subscription-dialog.tsx` mirroring `delete-child-profile-dialog.tsx` (AlertDialog, destructive trigger, isSubmitting guard, error/success toasts, close-on-success).
- [x] Task 5: Reactivate CTA (AC: #3; D6)
  - [x] 5.1 `subscribe-button.tsx`: add optional `label` prop defaulting to `subscription.subscribeCta`; verify plans page renders unchanged.
- [x] Task 6: Account page rebuild (AC: #1, #2, #3; D4)
  - [x] 6.1 New `src/app/(parent)/account/account-view-state.ts` with pure `resolveAccountSubscriptionView(summary, now)` per D4.
  - [x] 6.2 Rebuild `account/page.tsx` per D4: three views (active = status + billing date + CancelSubscriptionDialog; cancelled = statusCancelledLabel + reactivate SubscribeButton; none = statusNoneLabel + plans link); delete the English stub text; error → loadErrorMessage + plans link.
- [x] Task 7: Tests (all ACs)
  - [x] 7.1 `subscription-repository.test.ts` (extend; existing `vi.mock('@/lib/db')` shape): `hasActiveSubscription` — ACTIVE → true; CANCELLED + `renewsAt` tomorrow → true; CANCELLED + `renewsAt` yesterday → false; PENDING_PAYMENT + `renewsAt` tomorrow → true; PENDING_PAYMENT + `renewsAt: null` → false; EXPIRED → false; no row → false. **Audit existing tests that stub `findUnique` for `hasActiveSubscription`/`isAllotmentExhausted` (also in session-gate/dashboard action tests if they mock the repository module instead — those mock the function itself and stay green): any fixture row using a bare `{ status: 'CANCELLED' }` etc. must now carry an explicit `renewsAt` so intent is unambiguous.** `cancelSubscription` — ACTIVE row: `updateMany` called with `{ parentAccountId, status: 'ACTIVE' }` WHERE + `{ status: 'CANCELLED', cancelledAt }` data, returns true (count 1); count 0 → returns false.
  - [x] 7.2 `subscription/actions.test.ts` (extend; existing mocks for `requireParentAccountId` + repository + add `vi.mock('next/cache')` for `revalidatePath`): cancelSubscriptionAction — (a) unauthorized short-circuit, `cancelSubscription` never called; (b) repo returns false → `{ error: { code: 'FORBIDDEN' } }`, no revalidatePath; (c) success → repo called with the session parentAccountId and a `Date`, `revalidatePath` called with `/account` and `/dashboard`, returns `{ data: { cancelled: true } }`.
  - [x] 7.3 `account-view-state.test.ts` (new, pure): ACTIVE → 'active'; CANCELLED + future renewsAt → 'cancelled'; CANCELLED + past renewsAt → 'none'; PENDING_PAYMENT + future renewsAt → 'cancelled'; PENDING_PAYMENT + null renewsAt → 'none'; EXPIRED → 'none'; null summary → 'none'.
  - [x] 7.4 No DOM/component tests (node environment convention) — dialog/page verified by `next build` + trace.
  - [x] 7.5 Full gate: `npx vitest run` (**332 green at baseline — all must pass plus new**), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build`.
- [x] Task 8: End-to-end trace for Completion Notes (AC: all)
  - [x] 8.1 Trace in code: (cancel) `/account` ACTIVE view → "Hủy đăng ký" → AlertDialog confirm → `cancelSubscriptionAction` → `cancelSubscription` (ACTIVE → CANCELLED, cancelledAt set, renewsAt untouched) → revalidatePath → account re-renders cancelled view "Đã hủy — có hiệu lực đến [date]" + "Kích hoạt lại"; student sessions still unlimited (`hasActiveSubscription` paid-through) and dashboard shows no upsell banner until `renewsAt`, after which the expiry cron flips CANCELLED → EXPIRED and the free-tier gate returns. (reactivate) cancelled view → "Kích hoạt lại" → `subscribeAction('MONTHLY')` → PENDING_PAYMENT reset + PayOS checkout → webhook activates + clears `cancelledAt` → account shows active view. (forbidden) cancel with no ACTIVE row → FORBIDDEN error toast, no mutation. Flag live PayOS reactivation + real cancellation-through-expiry as the manual QA gap.

## Dev Notes

### Current state of files being modified (read them before editing)

- `src/infrastructure/repositories/subscription-repository.ts` — 97 lines. `hasActiveSubscription` (lines 10–13, the D1 change site — its comment block and `isAllotmentExhausted`'s shared-caller note explain the blast radius); `createPendingSubscription` / `activateSubscriptionByOrderCode` / `getParentEmailByOrderCode` / `getSubscriptionSummary` — DO NOT TOUCH; `expireDueSubscriptions` (lines 88–97) already expires CANCELLED rows past `renewsAt` — the end-of-period mechanism is BUILT, do not touch. AD-9 header comment at lines 1–4 (amend per D2).
- `src/app/(parent)/subscription/actions.ts` — 78 lines: `getSubscriptionPlansAction`, `subscribeAction`, `getSubscriptionSummaryAction`. Append `cancelSubscriptionAction`; existing three untouched. `getSubscriptionSummaryAction` already returns exactly what D4 needs.
- `src/app/(parent)/account/page.tsx` — 30-line stub: hardcoded "Account — coming soon", conditional billing-date line (6.3's minimal slice — absorbed into the D4 active view), plans `Link`. Fully rebuilt this story (6.3 documented this handoff).
- `src/components/parent/subscribe-button.tsx` — 30 lines; label is hardcoded to `subscription.subscribeCta`/`subscribeCtaPending` — D6 adds the `label` prop; pending label stays `subscribeCtaPending` for both uses.
- `src/locales/vi/subscription.ts` — 25 lines, append-only (D7). `nextBillingDateLabel`, `viewPlansLink`, `loadErrorMessage`, `subscribeCtaPending` already exist — reuse, don't duplicate.
- `src/components/parent/delete-child-profile-dialog.tsx` — the exact AlertDialog pattern to copy for D5 (note the `render={<Button …/>}` trigger idiom of this AlertDialog implementation — not shadcn's `asChild`).
- `src/app/(parent)/profiles/actions.ts` — `requireParentAccountId` (lines 22–34): returns UNAUTHORIZED for missing session, non-PARENT role, or missing ParentAccount row — D3's gate. Also the `revalidatePath` precedent.
- `prisma/schema.prisma` — `SubscriptionStatus` enum already has `CANCELLED`; `Subscription.cancelledAt DateTime?` already exists. **NO schema changes, NO migration in this story.**
- `src/app/(parent)/layout.tsx` — `/account` nav item already wired (`common.parentNavAccount`). No layout changes.

### Architecture guardrails

- **AD-9 amended, not broken:** ACTIVE/EXPIRED transitions remain webhook/cron-only. ACTIVE → CANCELLED from a server action is a NEW permitted transition because it only *reduces* entitlement — document it in the repository header (D2). The account page performs zero direct DB writes; everything goes gate → action → repository.
- **The paid-through rule (D1) is the story's real risk.** It changes the shared read behind the student free-tier gate AND the dashboard upsell banner. The desired behavior is precisely "cancelled parents keep unlimited access and see no upsell until renewsAt" — that is AC #2, not a side effect. Do not "fix" it by special-casing callers; change the single shared function.
- **Server-action contract:** gate first, `{ data } | { error }` union, never throw, no client-supplied IDs for the cancel (session-keyed).
- **UX-DR14/17/18:** cancelled state = durable inline text (the status line), not just a toast; AlertDialog confirm before the destructive action (repo precedent); all strings in locale modules; shadcn Button/AlertDialog defaults keep ≥ 44px targets.
- **Layer rules:** page (Presentation) imports actions + locale + components; dialog imports action + locale + ui; repository is the only Prisma toucher.
- **No BigInt anywhere near the wire (D9).**

### What NOT to build (scope walls)

- **No schema change, no migration, no new dependency, no new env var, no new route.** The account page and nav item exist.
- **No cancellation email** (D8) and no changes to the activation email.
- **No changes to** the webhook route, expiry cron, `payos.ts`, `createPendingSubscription`, `activateSubscriptionByOrderCode`, pricing, plans page, or upsell banner component.
- **No proration/stacking of remaining days on reactivation** — webhook sets renewsAt = now + 30d; accepted (D6).
- **No annual-plan reactivate button** — cancelled view offers MONTHLY; annual reachable via plans page.
- **No polling/spinner** after reactivation checkout — same D12 rationale as 6.3.
- **No admin/subscription-history surface.**

### Project Structure Notes

- Files to **create**: `src/components/parent/cancel-subscription-dialog.tsx`, `src/app/(parent)/account/account-view-state.ts`, `src/app/(parent)/account/account-view-state.test.ts`.
- Files to **modify**: `src/infrastructure/repositories/subscription-repository.ts` + its test, `src/app/(parent)/subscription/actions.ts` + its test, `src/app/(parent)/account/page.tsx`, `src/components/parent/subscribe-button.tsx`, `src/locales/vi/subscription.ts`.
- Naming: kebab-case files; camelCase functions (`cancelSubscription`, `cancelSubscriptionAction`, `resolveAccountSubscriptionView`); PascalCase components (`CancelSubscriptionDialog`).

## Previous Story Intelligence

- **Story 6.3 (commit `89e823c`/`94298ff`, done):** baseline **332 tests green**; gate = vitest + `tsc --noEmit` + eslint on changed files + `next build`. It deliberately built for this story: `createPendingSubscription` handles the CANCELLED → PENDING_PAYMENT reactivation reset; `activateSubscriptionByOrderCode` clears `cancelledAt` so a reactivated subscription doesn't carry a stale cancellation; `getSubscriptionSummaryAction` returns exactly the `{ status, renewsAt }` shape the account page needs; the account page was left as a stub explicitly "rebuilt fully" here. `SubscribeButton` + `subscribeAction` are the complete reactivation flow — AC #3 is a label prop away.
- **Story 6.1:** `expireDueSubscriptions` already includes `CANCELLED` in its WHERE — its comment names this story as the reason. End-of-period expiry needs zero new code.
- **Mock conventions:** inline `vi.mock('@/lib/db')` per test file; `environment: 'node'`, no DOM tests; actions tests mock `requireParentAccountId` + repositories (see `subscription/actions.test.ts` for exact style); anything importing `@/lib/env` transitively needs `vi.mock('@/lib/env', ...)` — the actions test file already has it.
- **Repo is pnpm-managed** — no new deps here anyway; don't "fix" anything with npm.
- **Verification convention:** live browser/payment QA impossible in sandbox; accepted fallback is `next build` + unit coverage + an explicit code trace in Completion Notes with the live gap flagged (Task 8). The Epic 2 retro action item (manual browser pass before done) remains open — flag the live cancel/reactivate pass for Toan.
- **Git pattern:** one commit per story, conventional-commit style (`feat(subscriptions): ...`), story file + sprint-status.yaml updated in the same commit.

## Latest Tech Notes (verified 2026-07-24)

- **No new packages, no new external APIs.** Cancellation is a pure DB state change — PayOS has no server-side "cancel subscription" call to make (payments are one-shot; there is no PayOS recurring mandate to revoke).
- The AlertDialog in `src/components/ui/alert-dialog.tsx` uses the `render={<Button/>}` composition prop on its trigger (see `delete-child-profile-dialog.tsx`) — copy that idiom, don't reach for Radix `asChild`.
- `revalidatePath` inside a server action invalidates the RSC cache for the given path on the SAME request round-trip — the client component's awaited action result returns after revalidation, so the page re-renders the cancelled view without `router.refresh()`.
- `Date.prototype.toLocaleDateString('vi-VN')` → `dd/M/yyyy`-style Vietnamese date, deterministic in Node (full-icu) — same formatting as 6.3's billing-date line; use it for every date in D7 strings.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.4] (lines 1114–1134) — ACs verbatim; Epic 6 overview (1043–1045); Story 6.3 (1091–1112) for the reactivation flow being reused
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-25] (374–381) — status view, end-of-period cancellation, reactivation of lapsed/cancelled; FR-23 (363) — plans page reachable from account settings
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md] (58, 188, 190) — account settings surface purpose; "Subscription cancelled" state treatment: "Đã hủy — có hiệu lực đến [date]." + Reactivate CTA; active state shows next billing date
- [Source: _bmad-output/project-context.md#Payment & Security Rules / #Architecture Layer Rules] — AD-9 transition sources (amended per D2), layer direction, server-action contract
- [Source: src/infrastructure/repositories/subscription-repository.ts] — hasActiveSubscription (D1 change site), expireDueSubscriptions' CANCELLED handling (built in 6.1 for this story), AD-9 header
- [Source: src/app/(parent)/subscription/actions.ts#getSubscriptionSummaryAction] — the account page's existing data source, reused unchanged
- [Source: src/components/parent/delete-child-profile-dialog.tsx] — the AlertDialog confirm + toast pattern D5 copies
- [Source: src/components/parent/subscribe-button.tsx] — D6's label-prop change site; the complete reactivation flow behind it
- [Source: src/app/(parent)/profiles/actions.ts#requireParentAccountId] — the gate + revalidatePath precedents
- [Source: prisma/schema.prisma] — SubscriptionStatus enum (CANCELLED exists), cancelledAt field (exists) — no migration
- [Source: _bmad-output/implementation-artifacts/6-3-*.md] — baseline 332, handoff notes (account stub, cancelledAt clearing, CANCELLED reset branch)

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Epics, PRD (FR-25), EXPERIENCE.md state treatments, project context, the full subscription codebase (repository, actions, account stub, subscribe button, dialog precedent, locale, schema), and Stories 6.1/6.3 handoff intelligence were analyzed. The critical finding is D1: the ACs' "full access until renewsAt" is impossible with today's `hasActiveSubscription` — the paid-through rule is the story's core change, with the cancel action (D2/D3), the three-state account page (D4/D5), and the label-prop reactivation reuse (D6) closing the rest.

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5) via Claude Code

### Debug Log References

- Full gate (2026-07-24): `npx vitest run` — 34 files, **351 tests passed** (332 baseline + 19 new: 9 repository, 3 action, 7 view-state); `npx tsc --noEmit` — clean; `npx eslint` on all 10 changed files — clean; `npx next build` — success (`/account` now 3.75 kB dynamic route).
- One deviation from D4's literal markup caught during implementation: `text-subheading` is not a project utility class — the section heading uses the existing `font-semibold` idiom (precedent: `classes/[classId]/page.tsx` roster title).

### Completion Notes List

- **D1 (paid-through rule) implemented exactly as specified**: `hasActiveSubscription` now returns `status === 'ACTIVE' || (renewsAt != null && renewsAt > new Date())`, signature unchanged; both callers (`isAllotmentExhausted` → student free-tier gate + dashboard upsell banner) pick up the fix with zero caller changes. Full state-machine coverage in tests (7 cases incl. PENDING_PAYMENT-with-future-renewsAt = abandoned reactivation → true).
- **D2/D3**: `cancelSubscription` uses `updateMany` with the `status: 'ACTIVE'` WHERE guard (idempotent no-op on double-tap/non-ACTIVE); `renewsAt` untouched. `cancelSubscriptionAction` is session-keyed with NO client-supplied id — AC #4's ownership check is structurally guaranteed; gate returns UNAUTHORIZED, no-ACTIVE-row returns FORBIDDEN; success revalidates `/account` + `/dashboard`. AD-9 header comment amended (third edit): ACTIVE → CANCELLED is cancel-server-action-only and grants nothing.
- **D4/D5**: account page rebuilt as three-state RSC (active/cancelled/none via pure `resolveAccountSubscriptionView`); English stub deleted; error view = `loadErrorMessage` + plans link; plans link renders only in 'none' and error views. `CancelSubscriptionDialog` mirrors `delete-child-profile-dialog.tsx` exactly (AlertDialog `render={<Button/>}` trigger idiom, isSubmitting guard, error/success toasts, close-on-success, no `router.refresh()`).
- **D6**: reactivation = existing 6.3 checkout verbatim; `SubscribeButton` gained an optional `label` prop defaulting to `subscription.subscribeCta` — plans page renders byte-identical. Accepted product nuances (per D6, not bugs): (a) reactivating before period end restarts the clock at now+30d (webhook behavior from 6.1 — no stacking); (b) an abandoned reactivation leaves the row PENDING_PAYMENT with the old future `renewsAt` — access retained (D1) and the account page still shows the 'cancelled' view (D4), from which the parent can retry.
- **D7/D8/D9**: twelve locale keys appended verbatim; no cancellation email; `renewsAt` crosses the wire as ISO string, formatted with `.toLocaleDateString('vi-VN')` in the RSC only; `payosOrderCode` (BigInt) still never selected.
- **End-to-end trace (Task 8):** *(cancel)* `/account` with ACTIVE row → `resolveAccountSubscriptionView` → 'active' view → "Hủy đăng ký" trigger → AlertDialog shows `cancelConfirmBody(effectiveUntil)` → confirm → `cancelSubscriptionAction` → `requireParentAccountId` gate → `cancelSubscription('parent', now)` flips ACTIVE → CANCELLED, sets `cancelledAt`, leaves `renewsAt` → `revalidatePath('/account')` + `('/dashboard')` → awaited action returns after revalidation → RSC re-renders 'cancelled' view "Đã hủy — có hiệu lực đến [date]" + "Kích hoạt lại" + success toast. Student sessions stay unlimited and dashboard shows no upsell (paid-through `hasActiveSubscription` behind `isAllotmentExhausted`) until `renewsAt`, when `/api/cron/expire-subscriptions` → `expireDueSubscriptions` flips CANCELLED → EXPIRED and the free-tier gate returns. *(reactivate)* 'cancelled' view → "Kích hoạt lại" → `subscribeAction('MONTHLY')` → `createPendingSubscription` resets CANCELLED → PENDING_PAYMENT with fresh orderCode (renewsAt untouched) → PayOS checkout → verified webhook → `activateSubscriptionByOrderCode` sets ACTIVE, renewsAt = now+30d, clears `cancelledAt` → account shows 'active' view. *(forbidden)* cancel with no ACTIVE row → `updateMany` matches 0 → FORBIDDEN → error toast, no mutation, no revalidation.
- **Manual QA gap (flagged per convention):** live PayOS reactivation checkout and a real cancellation-through-expiry (cron flipping CANCELLED → EXPIRED at period end) cannot be exercised in the sandbox — needs a live browser/payment pass by Toan. The Epic 2 retro action item (manual browser pass before done) applies.

### File List

- `src/infrastructure/repositories/subscription-repository.ts` (modified — paid-through `hasActiveSubscription`, new `cancelSubscription`, AD-9 header amendment)
- `src/infrastructure/repositories/subscription-repository.test.ts` (modified — 9 new tests, ACTIVE fixture given explicit `renewsAt`)
- `src/app/(parent)/subscription/actions.ts` (modified — `cancelSubscriptionAction`, `revalidatePath` import)
- `src/app/(parent)/subscription/actions.test.ts` (modified — 3 new tests, `next/cache` mock)
- `src/app/(parent)/account/page.tsx` (modified — full rebuild, three-state subscription view)
- `src/app/(parent)/account/account-view-state.ts` (new — pure view resolver)
- `src/app/(parent)/account/account-view-state.test.ts` (new — 7 tests)
- `src/components/parent/cancel-subscription-dialog.tsx` (new — AlertDialog cancel confirm)
- `src/components/parent/subscribe-button.tsx` (modified — optional `label` prop)
- `src/locales/vi/subscription.ts` (modified — twelve D7 keys appended)

## Change Log

- 2026-07-24: Story 6.4 implemented (all 8 tasks). Paid-through `hasActiveSubscription`, `cancelSubscription` repository write + AD-9 amendment, session-keyed `cancelSubscriptionAction`, three-state account page with pure view resolver, AlertDialog cancel confirm, `SubscribeButton` label prop for reactivation, twelve locale keys. Gate: 351/351 vitest, tsc clean, eslint clean, next build success. Status → review.
- 2026-07-24: Story created via create-story workflow (ultimate context engine analysis: epics + PRD FR-25 + EXPERIENCE state table + project context + subscription codebase survey + Stories 6.1/6.3 intelligence). Key decisions: paid-through extension of hasActiveSubscription (D1 — the load-bearing change), session-keyed no-arg cancel action with FORBIDDEN on no-ACTIVE-row (D3), three-state account page with pure view resolver (D4), AlertDialog cancel confirm copying the delete-profile pattern (D5), reactivation = SubscribeButton label prop over the existing 6.3 flow (D6). Status: ready-for-dev.
