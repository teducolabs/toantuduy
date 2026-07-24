---
baseline_commit: c48d9d6
---

# Story 6.3: Subscribe via MoMo & Subscription Activation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a parent,
I want to subscribe via MoMo and have my subscription activate immediately after payment so all my child profiles get unlimited sessions,
so that I don't have to log out and back in and my children can keep practicing.

## Acceptance Criteria

1. **Given** I tap "Đăng ký" on the monthly plan card, **when** my tap is processed, **then** a `Subscription` record is created with `status: PENDING_PAYMENT`; I am redirected to the PayOS-hosted MoMo checkout URL (FR-24, NFR-12).
2. **Given** payment is confirmed by PayOS, **when** the HMAC-verified webhook processes the `PAID` event, **then** `Subscription.status` is updated to `ACTIVE` within 10 seconds; all Child Profiles under my account gain unlimited Sessions without requiring re-login (FR-24). **And** a subscription activation email is sent via `src/infrastructure/email/resend.ts` (AD-14).
3. **Given** payment fails or is cancelled at the MoMo checkout, **when** I return to the app via the cancel URL, **then** my account remains on Free Tier; an error Toast shows: "Thanh toán không thành công. Vui lòng thử lại." (UX-DR14).
4. **And** on return from successful payment, the Parent Dashboard reflects the active subscription immediately (no upsell banner) and account settings shows the next billing date.

## Design Decisions (resolved during story creation — do not re-litigate)

These close gaps between the ACs and the current code. Implement exactly as stated.

- **D1 — Checkout server action `subscribeAction(plan: 'MONTHLY' | 'ANNUAL')` in the existing `src/app/(parent)/subscription/actions.ts`.** Flow, in order: (1) `requireParentAccountId()` gate — return its `{ error }` verbatim on failure. (2) `getSubscriptionPlanPricing()` — the amount comes ONLY from GlobalConfig, NEVER from the client (a client-supplied price would be a payment-amount forgery hole). If `plan === 'ANNUAL'` and `annualPriceVnd === null` → `{ error: { code: 'PLAN_NOT_AVAILABLE', message: ... } }`. (3) `const orderCode = generateOrderCode()` from `@/infrastructure/payment/payos`. (4) `createPendingSubscription(parentAccountId, BigInt(orderCode))` (D2) — returns `false` when an ACTIVE subscription exists → `{ error: { code: 'ALREADY_SUBSCRIBED', message: ... } }`, no PayOS call. (5) `initiatePayment({ orderCode, amount, description, returnUrl, cancelUrl })` wrapped in try/catch — any throw → `{ error: { code: 'PAYMENT_INIT_FAILED', message: ... } }` (the pending row already exists with a never-paid orderCode; that's harmless — a retry overwrites it, see D2). (6) Return `{ data: { checkoutUrl } }`. The action returns the URL; the CLIENT navigates (D6) — no `redirect()` in the action (zero in-repo precedent; every action returns the `{ data } | { error }` union; keep it that way).
- **D2 — New repository function `createPendingSubscription(parentAccountId: string, orderCode: bigint): Promise<boolean>` in `subscription-repository.ts`.** Implementation: `findUnique({ where: { parentAccountId } })`; if `existing?.status === 'ACTIVE'` → return `false` (never clobber a live subscription); if no row → `create({ data: { parentAccountId, status: 'PENDING_PAYMENT', payosOrderCode: orderCode } })`; else `update({ where: { parentAccountId }, data: { status: 'PENDING_PAYMENT', payosOrderCode: orderCode } })` (covers EXPIRED re-subscribe, PENDING_PAYMENT retry-with-new-orderCode, and CANCELLED — Story 6.4's "Kích hoạt lại" reuses this same flow per the epic). Return `true`. `renewsAt`/`cancelledAt` untouched here — the webhook owns them on activation (D3). The read-then-write race is acceptable: the webhook's `status: 'PENDING_PAYMENT'` WHERE guard already makes double activation impossible. **AD-9 clarification (update the file-header comment):** entering `PENDING_PAYMENT` from the checkout server action is permitted — it grants nothing; the PROTECTED transitions remain activation (webhook-only) and expiry (cron-only). Amend the header to: transitions to ACTIVE/EXPIRED live only here and are invoked only by the PayOS webhook route and the expiry cron route; creation/reset to PENDING_PAYMENT is invoked only by the checkout server action.
- **D3 — Extend `activateSubscriptionByOrderCode` to also clear `cancelledAt`.** Change its `data` to `{ status: 'ACTIVE', renewsAt, cancelledAt: null }`. Reason: a CANCELLED subscriber who re-subscribes (D2) must not carry a stale `cancelledAt` into their new ACTIVE period — 6.4's status display would misreport it. WHERE clause unchanged (idempotency guard stays). Update the existing assertion in `subscription-repository.test.ts` that checks the exact `data` payload.
- **D4 — Activation email = new adapter function + template + webhook hook.** (a) `src/infrastructure/email/resend.ts`: add `sendSubscriptionActivatedEmail(to: string, renewsAtLabel: string)` following the `sendTeacherApprovalEmail` pattern exactly — `sendEmail({ to, subject: emails.subscriptionActivatedSubject, react: SubscriptionActivatedEmail({ renewsAtLabel, dashboardUrl: \`${env.NEXTAUTH_URL}/dashboard\` }) })`. `sendEmail` never throws (returns `{ error }` and logs) — the webhook's 200 response can never be affected by email failure; do NOT add extra try/catch. (b) New template `src/infrastructure/email/templates/subscription-activated-email.tsx` mirroring `teacher-approval-email.tsx` (`@react-email/components`, `Html lang="vi"`, brand button `#F97316`, all strings from `emails` locale). **No parent name exists anywhere in the schema** (only `TeacherAccount.fullName`/`ChildProfile.name`) — use `emails.greetingFallback` unconditionally; do not invent a name lookup. Body: subscription active + next billing date line + CTA button to the dashboard. (c) Strings appended to `src/locales/vi/emails.ts`: `subscriptionActivatedSubject`, `subscriptionActivatedBody` (mentions unlimited sessions for all child profiles), `subscriptionActivatedRenewsAt: (date: string) => ...`, `subscriptionActivatedCta`.
- **D5 — Webhook hook, at the marked insertion point (`route.ts` line 39 comment).** After `const activated = await activateSubscriptionByOrderCode(...)`: `if (activated) { const email = await getParentEmailByOrderCode(BigInt(data.orderCode)); if (email) await sendSubscriptionActivatedEmail(email, renewsAt.toLocaleDateString('vi-VN')) }`. New repository READ `getParentEmailByOrderCode(orderCode: bigint): Promise<string | null>`: `db.subscription.findUnique({ where: { payosOrderCode: orderCode }, select: { parentAccount: { select: { user: { select: { email: true } } } } } })` → `...?.parentAccount.user.email ?? null` (parent email lives on `User.email`, reached Subscription → parentAccount → user). Verification order is untouched — this all sits AFTER the existing verify + activate lines; replays (`activated === false`) send nothing. Response stays `NextResponse.json({ received: true })` — no BigInt, no email result in the response. Keep logging to orderCode + outcome only (NFR-12) — never log the email address payload contents.
- **D6 — Client CTA: new `src/components/parent/subscribe-button.tsx` (`'use client'`).** Props `{ plan: 'MONTHLY' | 'ANNUAL' }`; strings imported from the `subscription` locale module directly (it's a client component — same pattern as `upsell-banner`). `useTransition`; onClick → `subscribeAction(plan)`; on `data` → `window.location.assign(result.data.checkoutUrl)` (full-page navigation to the external PayOS domain — `router.push` is wrong for external URLs); on `error` → `toast(subscription.checkoutErrorToast)` (sonner, already mounted app-wide via `src/app/layout.tsx`). While pending: `disabled` + label `subscription.subscribeCtaPending`. Full-width `Button` (shadcn) exactly where the inert one sat. `SubscriptionPlanCard` changes: replace the `cta: string` prop + inert `Button` + the `// Story 6.3 wires this CTA...` comment with a `plan: 'MONTHLY' | 'ANNUAL'` prop rendering `<SubscribeButton plan={plan} />`. Card itself stays a server component (server components may render client children). `plans/page.tsx`: pass `plan="MONTHLY"` / `plan="ANNUAL"` to the two cards and drop the now-unused `cta` prop values.
- **D7 — Result page: `src/app/(parent)/subscription/result/page.tsx` serves BOTH returnUrl and cancelUrl.** `initiatePayment` gets `returnUrl` = `cancelUrl` = `` `${env.NEXTAUTH_URL}/subscription/result` `` (built in the action, server-side — there is NO `NEXT_PUBLIC_APP_URL`; `NEXTAUTH_URL` is the established base-URL var, same as the teacher-email login links). PayOS appends `?code=...&id=...&cancel=true|false&status=PAID|CANCELLED&orderCode=...` to whichever URL it redirects to. Page is an async RSC (inside `(parent)` layout → PARENT gate is automatic): `const params = await searchParams` (Next 15: `searchParams` is a Promise), compute the variant via a PURE helper `resolveSubscriptionResult(params)` in `src/app/(parent)/subscription/result/result-state.ts` — returns `'success'` when `status === 'PAID' && cancel !== 'true' && code === '00'`, else `'failure'` (all params are strings or undefined; undefined/anything-else → `'failure'`). Success view: heading `subscription.resultSuccessTitle`, body `subscription.resultSuccessBody`, `Link` to `/dashboard` labeled `subscription.goToDashboardLink`. Failure view: heading `subscription.resultFailureTitle`, `Link` back to `/subscription/plans` labeled `subscription.backToPlansLink`. **This page performs ZERO subscription reads/writes** — activation is exclusively the webhook's (AD-9); the query string is untrusted display input only.
- **D8 — Result toast: new `src/components/parent/subscription-result-toast.tsx` (`'use client'`).** Props `{ variant: 'success' | 'failure' }`; fires exactly once on mount (a `useRef` fired-guard + `useEffect`, mirroring `dashboard-offline-toast.tsx`'s ref pattern): success → `toast(subscription.successToast)` ("Đã đăng ký thành công! Lượt luyện tập đã được mở." — EXPERIENCE.md Flow 4 step 4, generalized without the child name the page can't know); failure → `toast.error(subscription.checkoutErrorToast)` with the AC's exact string. Renders `null`; the result page mounts it alongside the inline content (toast alone is dismissible/missable — inline content is the durable state, UX-DR14 spirit).
- **D9 — Account page next-billing-date line (AC #4's second clause — minimal, 6.4 rebuilds this page).** (a) New repository READ `getSubscriptionSummary(parentAccountId: string): Promise<{ status: SubscriptionStatus; renewsAt: Date | null } | null>` — `findUnique` with `select: { status: true, renewsAt: true }`. **Never select `payosOrderCode`** (BigInt kills `JSON.stringify`/RSC serialization — D10). (b) New action `getSubscriptionSummaryAction()` in `subscription/actions.ts` (same `requireParentAccountId` gate, returns `{ data: { status, renewsAt: string | null } }` with `renewsAt` serialized via `.toISOString()`). (c) `src/app/(parent)/account/page.tsx` becomes an async RSC: call the action; when `data.status === 'ACTIVE' && data.renewsAt` render `subscription.nextBillingDateLabel(new Date(data.renewsAt).toLocaleDateString('vi-VN'))`; otherwise render nothing extra. Keep the existing stub text + plans `Link` untouched. On action `error`, render the existing stub unchanged (no error UI for a stub page).
- **D10 — BigInt and money discipline.** `generateOrderCode()` returns a `number`; convert with `BigInt(orderCode)` ONLY at repository call sites. No BigInt in any action return value, JSON response, or RSC prop. Amounts are integer VNĐ passed straight from `getSubscriptionPlanPricing()` to `initiatePayment` — no arithmetic, no client involvement. `description` must be ≤ 25 chars (PayOS/VietQR hard limit — rejected if longer): use ASCII literals `'ToanTuDuy goi thang'` (19) / `'ToanTuDuy goi nam'` (17), defined as constants in the action file (not locale — this is a PayOS field, not UI copy; diacritics risk the VietQR field).
- **D11 — Locale additions to `src/locales/vi/subscription.ts` (exact strings):**
  ```ts
  subscribeCtaPending: 'Đang xử lý…',
  checkoutErrorToast: 'Thanh toán không thành công. Vui lòng thử lại.',
  successToast: 'Đã đăng ký thành công! Lượt luyện tập đã được mở.',
  resultSuccessTitle: 'Thanh toán thành công',
  resultSuccessBody: 'Gói đăng ký của bạn đang được kích hoạt. Tất cả hồ sơ của bé đã có lượt luyện tập không giới hạn.',
  resultFailureTitle: 'Thanh toán không thành công',
  goToDashboardLink: 'Về bảng điều khiển →',
  backToPlansLink: 'Xem lại gói đăng ký →',
  nextBillingDateLabel: (date: string) => `Ngày thanh toán tiếp theo: ${date}`,
  ```
  Keep every existing key untouched. No inline Vietnamese in any `.tsx` (UX-DR18).
- **D12 — Nothing new for "dashboard reflects immediately" (AC #4 first clause) — verify, don't build.** `getDashboardDataAction` → `isAllotmentExhausted` → `hasActiveSubscription` reads `status === 'ACTIVE'` fresh per request; the dashboard page is dynamic. Webhook activation therefore hides the upsell banner on the next dashboard render with zero session/JWT involvement (FR-24's no-re-login mechanism, wired in 6.1). The known race — parent lands on the result page before PayOS's webhook (typically < a few seconds) — is why D11's success body says "đang được kích hoạt"; do NOT build polling or a waiting spinner.

## Tasks / Subtasks

- [x] Task 1: Repository functions (AC: #1, #2, #4; D2, D3, D9a)
  - [x] 1.1 `subscription-repository.ts`: add `createPendingSubscription` per D2; amend the AD-9 header comment per D2.
  - [x] 1.2 Extend `activateSubscriptionByOrderCode`'s `data` with `cancelledAt: null` (D3).
  - [x] 1.3 Add reads `getParentEmailByOrderCode` (D5) and `getSubscriptionSummary` (D9a — no `payosOrderCode` in the select).
- [x] Task 2: Checkout server action (AC: #1; D1, D7, D10)
  - [x] 2.1 `subscription/actions.ts`: add `subscribeAction(plan)` per D1's exact 6-step flow; description constants + returnUrl/cancelUrl from `env.NEXTAUTH_URL` per D7/D10. Note: this file now imports `env` — it already runs server-only (`'use server'`), fine.
  - [x] 2.2 Add `getSubscriptionSummaryAction()` per D9b.
- [x] Task 3: Activation email (AC: #2; D4, D5)
  - [x] 3.1 `src/locales/vi/emails.ts`: append the four `subscriptionActivated*` strings (D4c).
  - [x] 3.2 New template `subscription-activated-email.tsx` per D4b (greetingFallback only — no name prop).
  - [x] 3.3 `resend.ts`: add `sendSubscriptionActivatedEmail(to, renewsAtLabel)` per D4a.
  - [x] 3.4 Webhook `route.ts`: insert the D5 hook at the marked line 39 comment, gated on `activated`; replace that comment.
- [x] Task 4: CTA wiring (AC: #1; D6)
  - [x] 4.1 New `subscribe-button.tsx` client component per D6 (useTransition, `window.location.assign`, error toast, pending label).
  - [x] 4.2 `subscription-plan-card.tsx`: swap `cta` prop for `plan` prop, render `SubscribeButton` (D6).
  - [x] 4.3 `plans/page.tsx`: pass `plan="MONTHLY"` / `plan="ANNUAL"`.
- [x] Task 5: Result page (AC: #3, #4; D7, D8, D11)
  - [x] 5.1 New `result/result-state.ts` with pure `resolveSubscriptionResult(params)` per D7.
  - [x] 5.2 New `result/page.tsx` RSC per D7 (await searchParams; success/failure views; zero DB access).
  - [x] 5.3 New `subscription-result-toast.tsx` per D8; mount it in the result page.
  - [x] 5.4 `src/locales/vi/subscription.ts`: append D11 strings.
- [x] Task 6: Account page billing date (AC: #4; D9c)
  - [x] 6.1 `account/page.tsx`: async RSC + `getSubscriptionSummaryAction()` + conditional `nextBillingDateLabel` line.
- [x] Task 7: Tests (all ACs)
  - [x] 7.1 `subscription-repository.test.ts` (extend; keep the `vi.mock('@/lib/db')` shape, add `create`/`update`/`findUnique` fns to the subscription mock as needed): createPendingSubscription — no existing row → `create` called with PENDING_PAYMENT + orderCode, returns true; EXPIRED row → `update` called, returns true; ACTIVE row → returns false and neither create nor update called. Activate now includes `cancelledAt: null` (fix the existing data assertion). `getParentEmailByOrderCode` — returns the nested email; returns null when no row. `getSubscriptionSummary` — returns selected fields; null when no row.
  - [x] 7.2 `subscription/actions.test.ts` (extend; mock `@/infrastructure/payment/payos`, `@/infrastructure/repositories/subscription-repository`, and `@/lib/env` — env parses at import, copy the resend-test mocking pattern): subscribeAction — (a) unauthorized short-circuit, no repo/PayOS calls; (b) ANNUAL with `annualPriceVnd: null` → PLAN_NOT_AVAILABLE, no PayOS call; (c) ACTIVE (createPendingSubscription → false) → ALREADY_SUBSCRIBED, `initiatePayment` never called; (d) success → `createPendingSubscription` called with `BigInt`-typed orderCode BEFORE `initiatePayment`, `initiatePayment` called with the config price (not any client value), description ≤ 25 chars, both URLs ending `/subscription/result`, returns `{ data: { checkoutUrl } }`; (e) `initiatePayment` throws → PAYMENT_INIT_FAILED. getSubscriptionSummaryAction — unauthorized short-circuit; success serializes `renewsAt` to ISO string.
  - [x] 7.3 `webhook/route.test.ts` (extend; add `getParentEmailByOrderCode` to the repository mock and mock `@/infrastructure/email/resend`): activated=true → email looked up by the same BigInt orderCode and `sendSubscriptionActivatedEmail` called with the address; activated=false → no email lookup, no send; email lookup returns null → no send, still 200; existing 5 cases stay green.
  - [x] 7.4 `result-state.test.ts` (new, pure): PAID/cancel=false/code=00 → success; `cancel: 'true'` → failure; `status: 'CANCELLED'` → failure; code ≠ '00' → failure; empty params → failure.
  - [x] 7.5 `resend.test.ts` (extend, existing `vi.hoisted` SDK-mock pattern): `sendSubscriptionActivatedEmail` sends with `emails.subscriptionActivatedSubject` and returns `{ data }`; SDK failure → `{ error: { code: 'EMAIL_SEND_FAILED' } }` without throwing.
  - [x] 7.6 No DOM/component tests (node environment convention; 4.5 precedent) — button/card/pages verified by `next build` + trace.
  - [x] 7.7 Full gate: `npx vitest run` (**305 green at baseline — all must pass plus new**), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build`.
- [x] Task 8: End-to-end trace for Completion Notes (AC: all)
  - [x] 8.1 Trace both paths in code: (happy) plans page → SubscribeButton → subscribeAction (gate → config price → orderCode → pending row → PayOS) → `window.location.assign(checkoutUrl)` → MoMo → PayOS webhook (verify → activate + `cancelledAt: null` → email via User.email) → parent returns to `/subscription/result?status=PAID...` → success toast + view → dashboard renders without upsell banner; account page shows next billing date. (failure) cancel at MoMo → `/subscription/result?cancel=true&status=CANCELLED` → error toast with the AC's exact string → account still Free Tier (nothing was activated; pending row is inert). Flag live PayOS checkout + real webhook delivery as the manual QA gap (established sandbox fallback).

## Dev Notes

### Current state of files being modified (read them before editing)

- `src/app/(parent)/subscription/actions.ts` — 16 lines: only `getSubscriptionPlansAction()` (requireParentAccountId gate → `getSubscriptionPlanPricing()`). Append two actions; keep the existing one untouched.
- `src/components/parent/subscription-plan-card.tsx` — 34 lines, server component, props `{ name, priceLabel, bullets, cta }`; the inert CTA + `{/* Story 6.3 wires this CTA to the checkout server action */}` comment sit at lines ~29–31. That comment marks exactly what D6 replaces.
- `src/app/(parent)/subscription/plans/page.tsx` — 40 lines; renders monthly card always, annual when `annualPriceVnd !== null`; currently passes `cta={subscription.subscribeCta}` — becomes `plan=...` per D6. `subscribeCta` stays in the locale (SubscribeButton uses it as its label).
- `src/infrastructure/repositories/subscription-repository.ts` — 48 lines; AD-9 header comment (amend per D2); `hasActiveSubscription`, `isAllotmentExhausted` (DO NOT TOUCH — the free-tier gate + upsell banner share them), `activateSubscriptionByOrderCode` (extend data only, D3), `expireDueSubscriptions` (DO NOT TOUCH).
- `src/app/api/payments/payos/webhook/route.ts` — 44 lines; the D4 flow from 6.1 with the email insertion comment at line 39. Add ONLY the D5 hook — verification order, status codes, and the always-200-on-verified rule are frozen.
- `src/infrastructure/email/resend.ts` — 61 lines; `FROM_ADDRESS = 'ToanTuDuy <onboarding@resend.dev>'`, `sendEmail` never throws, `sendTeacherApprovalEmail` (lines 47–53) is the exact pattern to copy.
- `src/infrastructure/email/templates/teacher-approval-email.tsx` — the template pattern to mirror (`@react-email/components`, inline style consts, `#F97316` button).
- `src/locales/vi/subscription.ts` (16 lines) / `src/locales/vi/emails.ts` (15 lines) — append-only per D11/D4c.
- `src/app/(parent)/account/page.tsx` — 19-line stub with the plans `Link`. D9c adds one conditional line; Story 6.4 rebuilds it fully.
- `src/infrastructure/payment/payos.ts` — DO NOT MODIFY. Exports `initiatePayment({ orderCode: number, amount, description, returnUrl, cancelUrl }) → { checkoutUrl }`, `verifyWebhook`, `generateOrderCode(): number`. Constraints documented in-file: description ≤ 25 chars, orderCode positive safe integer.
- `src/lib/env.ts` — `NEXTAUTH_URL` is the only base-URL var (no `NEXT_PUBLIC_APP_URL`). PayOS + Resend vars already validated. NO env changes in this story.
- `prisma/schema.prisma` — `Subscription` (one per parent, `parentAccountId @unique`, `payosOrderCode BigInt? @unique`, `renewsAt`, `cancelledAt`); parent email = `Subscription → parentAccount → user.email` (`User.email`); there is NO parent name field and NO Payment/Transaction model. NO schema changes in this story.

### Architecture guardrails

- **AD-9 remains the spine:** activation happens ONLY in the webhook (already built); this story's action may only create/reset `PENDING_PAYMENT` (D2's clarified rule). The result page and the subscribe action must never set ACTIVE, and the result page does zero DB access (D7) — the query string is attacker-controllable.
- **Amount integrity:** the price sent to PayOS comes from `getSubscriptionPlanPricing()` (GlobalConfig) inside the action. The client sends only `'MONTHLY' | 'ANNUAL'`. Any design where the client posts an amount is wrong.
- **Layer rules:** the action (Application) imports repositories + the payment adapter — allowed. `subscribe-button.tsx` (Presentation) imports only the server action + locale + sonner + shadcn Button. The card/pages import components + actions + locale only.
- **Server-action contract:** gate first, `{ data } | { error }` union, never throw. Route handlers keep speaking HTTP statuses — two idioms, two worlds (6.1 note still applies).
- **Email is best-effort, webhook response is sacred:** `sendEmail` already never throws; the webhook must return `200 { received: true }` whether the email succeeded, failed, or had no address (PayOS retries non-2xx deliveries — an email failure must not trigger webhook retries).
- **BigInt discipline (D10):** `BigInt(...)` conversions only at repository call sites; `getSubscriptionSummary` selects around `payosOrderCode`; nothing BigInt-typed crosses an action return, RSC prop, or JSON response.
- **UX-DR14/17/18:** failure state = the AC's exact toast string + durable inline failure view; toasts via the app-wide sonner `Toaster`; all strings in locale modules; links/buttons are shadcn/`next/link` with default ≥ 44px targets.
- **PayOS return params are display-only:** `code`, `id`, `cancel`, `status`, `orderCode` arrive as query strings on BOTH URLs (a cancelled payment can arrive at returnUrl with `cancel=true`) — hence one result page + `resolveSubscriptionResult` (D7) instead of separate success/cancel routes trusting the path.

### What NOT to build (scope walls)

- **No cancel/reactivate UI, no "Hủy đăng ký", no status text "Đang hoạt động"/"Đã hủy..."** — Story 6.4 (the account page gets ONLY the next-billing-date line, D9c).
- **No polling/spinner waiting for the webhook** on the result page (D12) and no `revalidatePath` — dashboard/account are dynamic reads.
- **No schema change, no migration, no new dependency, no new env var.**
- **No changes to** `payos.ts`, the webhook's verification/idempotency flow, the expiry cron, `hasActiveSubscription`/`isAllotmentExhausted`, pricing config/repository, or the upsell banner.
- **No recurring billing/auto-renew** — PayOS is one-shot; renewal is a future manual payment.
- **No parent-name lookup for the email** (no such field exists — greetingFallback only, D4b).
- **No payment/transaction history model or admin surface.**

### Project Structure Notes

- Files to **create**: `src/components/parent/subscribe-button.tsx`, `src/components/parent/subscription-result-toast.tsx`, `src/app/(parent)/subscription/result/page.tsx`, `src/app/(parent)/subscription/result/result-state.ts`, `src/app/(parent)/subscription/result/result-state.test.ts`, `src/infrastructure/email/templates/subscription-activated-email.tsx`.
- Files to **modify**: `src/app/(parent)/subscription/actions.ts` (+2 actions) + `actions.test.ts`, `src/components/parent/subscription-plan-card.tsx`, `src/app/(parent)/subscription/plans/page.tsx`, `src/infrastructure/repositories/subscription-repository.ts` (+3 changes) + its test, `src/app/api/payments/payos/webhook/route.ts` (+email hook) + its test, `src/infrastructure/email/resend.ts` + `resend.test.ts`, `src/locales/vi/subscription.ts`, `src/locales/vi/emails.ts`, `src/app/(parent)/account/page.tsx`.
- Naming: kebab-case files; camelCase functions (`subscribeAction`, `createPendingSubscription`, `getParentEmailByOrderCode`, `getSubscriptionSummary`, `resolveSubscriptionResult`, `sendSubscriptionActivatedEmail`); PascalCase components (`SubscribeButton`, `SubscriptionResultToast`, `SubscriptionActivatedEmail`).

## Previous Story Intelligence

- **Story 6.2 (commit `c48d9d6`, review):** baseline **305 tests green**; gate = vitest + `tsc --noEmit` + eslint on changed files + `next build`. It deliberately left the CTA inert with the insertion-point comment this story consumes, and left `/subscription/result` unbuilt. Its pricing helper `getSubscriptionPlanPricing()` (monthly falls back to 79000; annual `null` = not offered) is this story's price source — D1 reuses it verbatim; when annual is not configured the plans page never renders the annual card, so `subscribeAction('ANNUAL')`'s PLAN_NOT_AVAILABLE branch is defense-in-depth, not a UI path.
- **Story 6.1 (commit `8a0b65b`, review):** built everything this story's webhook side plugs into. Its D7 warning is live here: **BigInt never crosses a JSON boundary** (this story's D10). Its D8 explicitly reserved the email hook location this story fills. PayOS retries non-2xx webhook deliveries — never let the new email code path change the response status.
- **Repo is pnpm-managed** — no new deps here anyway; don't "fix" anything with npm.
- **Mock conventions:** inline `vi.mock('@/lib/db')` per test file; `environment: 'node'`, no DOM tests; actions tests mock `requireParentAccountId` + the repositories (see `subscription/actions.test.ts` for the exact style); anything importing `@/lib/env` transitively needs `vi.mock('@/lib/env', ...)` (env parses at import — resend tests show the pattern); resend SDK mocked via `vi.hoisted`.
- **Verification convention:** live browser/payment QA is impossible in the sandbox; accepted fallback is `next build` + unit coverage + an explicit code trace in Completion Notes with the live gap flagged (Task 8). The Epic 2 retro action item (manual browser pass before done) remains open — flag the live PayOS checkout for Toan.
- **Git pattern:** one commit per story, conventional-commit style (`feat(subscriptions): ...`), story file + sprint-status.yaml updated in the same commit.

## Latest Tech Notes (verified 2026-07-24)

- **No new packages.** `@payos/node` 2.0.5 already installed; the adapter wraps everything this story needs.
- **PayOS redirect contract:** after checkout, PayOS redirects to returnUrl/cancelUrl with appended query params `code`, `id`, `cancel` (`'true'`/`'false'` strings), `status` (`PAID`/`CANCELLED`), `orderCode` — e.g. `...?code=00&id=<paymentLinkId>&cancel=false&status=PAID&orderCode=803347`. Success = `code=00 & status=PAID & cancel=false` (D7). Params land on either URL — treat them as the only signal, not the route.
- Next `15.3.9`: page `searchParams` is a `Promise<Record<string, string | string[] | undefined>>` — `await` it (D7). Server actions callable from client components via direct import; `useTransition` for pending state.
- `sonner` is already mounted app-wide (`src/components/ui/sonner.tsx` + root layout); `toast(...)`/`toast.error(...)` from `'sonner'` in client components only.
- `Date.prototype.toLocaleDateString('vi-VN')` → `dd/M/yyyy`-style Vietnamese date, deterministic in Node (full-icu) — used for both the email's renewsAt label and the account page line.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.3] (lines 1091–1112) — ACs verbatim; Epic 6 overview (1043–1045, 255–259); Story 6.4 (1114–1134) for the cancel/reactivate scope boundary
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-24] (365–372) — 10-second activation, failure keeps Free Tier, all profiles no re-login; #FR-25 (374–381) — next-billing-date in account settings; A-7/A-8 (518–519) — 79,000 VNĐ monthly, MoMo primary
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-toantuduy-2026-07-08/EXPERIENCE.md#Flow 4] (360–370) — tap "Đăng ký" → provider-hosted MoMo → success toast wording → banner gone → next billing date in settings
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR14/UX-DR17/UX-DR18] (180, 186, 188) — payment-failed toast state, a11y floor, locale rule
- [Source: _bmad-output/project-context.md#Payment & Security Rules / #Architecture Layer Rules] — AD-9 transition sources, HMAC-before-mutation, layer direction, server-action contract
- [Source: src/infrastructure/payment/payos.ts] — adapter surface (initiatePayment/generateOrderCode; description ≤ 25 chars) — unchanged consumer contract
- [Source: src/app/api/payments/payos/webhook/route.ts] (line 39) — the reserved email insertion point
- [Source: src/infrastructure/repositories/subscription-repository.ts] — AD-9 header, activate/expire functions; hasActiveSubscription as the downstream FR-24 mechanism
- [Source: src/infrastructure/email/resend.ts + templates/teacher-approval-email.tsx + src/locales/vi/emails.ts] — 5.2's adapter/template/locale pattern to mirror
- [Source: src/components/parent/subscription-plan-card.tsx + src/app/(parent)/subscription/plans/page.tsx + actions.ts] — 6.2 surfaces this story extends
- [Source: src/components/parent/dashboard-offline-toast.tsx] — client toast-once ref pattern (D8)
- [Source: src/app/(parent)/profiles/actions.ts#requireParentAccountId] — `{ parentAccountId } | { error }` gate reused by every action here
- [Source: prisma/schema.prisma] — Subscription/ParentAccount/User relations (email path), SubscriptionStatus enum
- [Source: _bmad-output/implementation-artifacts/6-1-*.md + 6-2-*.md] — baseline 305, conventions, reserved handoff points
- [Source: payos.vn/docs/du-lieu-tra-ve/return-url] — redirect query params (code/id/cancel/status/orderCode)

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Epics, PRD (FR-24/FR-25), EXPERIENCE.md Flow 4, UX-DR14/17/18, project context, the full payment codebase (adapter, webhook, repository, plans surface, resend adapter + templates, locale modules, env), Stories 6.1/6.2 intelligence, and PayOS redirect documentation were analyzed. The twelve design decisions resolve every gap between the epic's ACs and the current system — notably where PENDING_PAYMENT creation sits relative to AD-9 (D2), config-sourced pricing as a payment-integrity rule (D1), the missing parent-email path for the activation mail (D4/D5), the single result page driven by PayOS's redirect params (D7/D8), and the minimal account-page billing-date slice ahead of 6.4 (D9).

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5)

### Debug Log References

- Full gate run 2026-07-24: `npx vitest run` → 33 files / **332 tests passed** (baseline 305 + 27 new, zero regressions); `npx tsc --noEmit` → clean; `npx eslint <19 changed files>` → clean; `npx next build` → success (new `ƒ /subscription/result` route; `/account` now dynamic).

### Completion Notes List

- **Task 1 (repository):** `createPendingSubscription` implemented exactly per D2 — findUnique → ACTIVE guard returns `false` (no mutation) → create when no row / update otherwise (covers EXPIRED re-subscribe, PENDING_PAYMENT retry, CANCELLED reactivation via 6.4). AD-9 header comment amended per D2's clarified rule (PENDING_PAYMENT creation is checkout-action territory; ACTIVE/EXPIRED transitions remain webhook/cron-only). `activateSubscriptionByOrderCode` data extended with `cancelledAt: null` (D3); WHERE guard untouched. New reads `getParentEmailByOrderCode` (Subscription → parentAccount → user.email) and `getSubscriptionSummary` (selects only `status`/`renewsAt` — never `payosOrderCode`, D10).
- **Task 2 (actions):** `subscribeAction(plan)` follows D1's 6-step flow verbatim: gate → GlobalConfig pricing (client never supplies an amount) → PLAN_NOT_AVAILABLE guard → `generateOrderCode()` → `createPendingSubscription(parentAccountId, BigInt(orderCode))` → ALREADY_SUBSCRIBED short-circuit → `initiatePayment` in try/catch → PAYMENT_INIT_FAILED on throw → `{ data: { checkoutUrl } }`. returnUrl = cancelUrl = `${env.NEXTAUTH_URL}/subscription/result` (D7). ASCII descriptions `'ToanTuDuy goi thang'` (19 ch) / `'ToanTuDuy goi nam'` (17 ch) as action-file constants (D10). `getSubscriptionSummaryAction()` serializes `renewsAt` via `.toISOString()`; returns `{ data: null }` when the parent has no subscription row.
- **Task 3 (email):** four `subscriptionActivated*` strings appended to `emails` locale; `subscription-activated-email.tsx` mirrors the teacher-approval template (Html lang="vi", `#F97316` button, `emails.greetingFallback` unconditionally — no name field exists in the schema); `sendSubscriptionActivatedEmail(to, renewsAtLabel)` copies the `sendTeacherApprovalEmail` pattern with the dashboard CTA URL. Webhook hook inserted at the reserved line-39 comment, gated on `activated`; replays and null-email lookups send nothing; response stays `200 { received: true }` regardless of email outcome (sendEmail never throws).
- **Task 4 (CTA):** `subscribe-button.tsx` client component — `useTransition`, `subscribeAction(plan)`, `window.location.assign(checkoutUrl)` on success (external PayOS domain), `toast(subscription.checkoutErrorToast)` on error, disabled + `subscribeCtaPending` label while pending. `SubscriptionPlanCard` swapped `cta: string` for `plan: 'MONTHLY' | 'ANNUAL'` and renders `<SubscribeButton plan={plan} />` (card stays a server component); plans page passes `plan="MONTHLY"` / `plan="ANNUAL"`.
- **Task 5 (result page):** pure `resolveSubscriptionResult` — success iff `status === 'PAID' && cancel !== 'true' && code === '00'` (array-typed params fail closed to `'failure'`). Result page is an async RSC awaiting `searchParams` (Next 15), serves both returnUrl and cancelUrl, performs ZERO subscription reads/writes (AD-9 — query string is untrusted display input). `subscription-result-toast.tsx` fires exactly once on mount via `useRef` guard: success → `toast(successToast)`, failure → `toast.error(checkoutErrorToast)` (AC #3's exact string); inline view is the durable state (UX-DR14). Nine D11 locale strings appended verbatim.
- **Task 6 (account page):** now an async RSC calling `getSubscriptionSummaryAction()`; renders `nextBillingDateLabel(renewsAt.toLocaleDateString('vi-VN'))` only when `status === 'ACTIVE' && renewsAt` — existing stub text + plans Link untouched; action errors render the stub unchanged.
- **Task 7 (tests):** +27 tests. Repository: createPendingSubscription (create path / EXPIRED update path / ACTIVE guard), activation `cancelledAt: null` assertion fixed, getParentEmailByOrderCode (nested email / null), getSubscriptionSummary (fields / null). Actions: subscribeAction unauthorized short-circuit, PLAN_NOT_AVAILABLE, ALREADY_SUBSCRIBED (initiatePayment never called), success (BigInt orderCode, pending-row-before-PayOS call order, config price, description ≤ 25, both URLs `/subscription/result`), annual-price variant, PAYMENT_INIT_FAILED; getSubscriptionSummaryAction unauthorized / ISO serialization / no-row. Webhook: email sent on activated=true with BigInt-keyed lookup, no lookup/send on replay, null email → no send + still 200; the 5 existing cases stay green. result-state: 6 pure cases including array-typed params. resend: subject + greetingFallback + date + dashboard href assertions, non-throwing failure shape. No DOM/component tests (node-environment convention; button/card/pages verified by `next build` + trace).
- **Task 8 (E2E code trace):** **Happy path:** `/subscription/plans` renders `SubscriptionPlanCard` → `SubscribeButton` onClick → `subscribeAction('MONTHLY')` [gate → `getSubscriptionPlanPricing()` (79000 default) → `generateOrderCode()` → pending row with BigInt orderCode → `initiatePayment` with config amount + 19-char description + result URLs] → client `window.location.assign(checkoutUrl)` → MoMo payment on PayOS's page → PayOS POSTs webhook → `verifyWebhook` (HMAC) → `code === '00'` → `activateSubscriptionByOrderCode` (PENDING_PAYMENT → ACTIVE, renewsAt = now+30d, `cancelledAt: null`) → `getParentEmailByOrderCode` → `sendSubscriptionActivatedEmail` (best-effort) → 200. Parent redirected to `/subscription/result?code=00&cancel=false&status=PAID&orderCode=...` → `resolveSubscriptionResult` → 'success' → success view + one-shot toast → Dashboard: `getDashboardDataAction` → `isAllotmentExhausted` → `hasActiveSubscription` reads ACTIVE fresh per request → upsell banner hidden, unlimited sessions for all child profiles, no re-login (D12 — verified, nothing built). Account page: `getSubscriptionSummaryAction` → `Ngày thanh toán tiếp theo: dd/M/yyyy`. **Failure path:** cancel at MoMo → PayOS redirects with `cancel=true&status=CANCELLED` → 'failure' → `toast.error('Thanh toán không thành công. Vui lòng thử lại.')` (AC #3 exact) + durable failure view + back-to-plans link; nothing was activated — the pending row is inert (webhook for a cancelled payment has `code !== '00'` → acknowledged, no mutation); account remains Free Tier.
- **Manual QA gap (flagged for Toan):** live PayOS checkout, real MoMo payment, and real webhook delivery cannot be exercised in the sandbox (established fallback: `next build` + unit coverage + this trace). The Epic 2 retro action item (manual browser pass before done) applies — please run a live checkout against the PayOS sandbox before marking done.

### File List

- `src/infrastructure/repositories/subscription-repository.ts` (modified — AD-9 header, createPendingSubscription, cancelledAt: null, getParentEmailByOrderCode, getSubscriptionSummary)
- `src/infrastructure/repositories/subscription-repository.test.ts` (modified — +7 tests, activation data assertion updated)
- `src/app/(parent)/subscription/actions.ts` (modified — subscribeAction, getSubscriptionSummaryAction, description constants)
- `src/app/(parent)/subscription/actions.test.ts` (modified — +9 tests, new mocks for payos/subscription-repository/env)
- `src/app/(parent)/subscription/plans/page.tsx` (modified — plan prop instead of cta)
- `src/app/(parent)/subscription/result/page.tsx` (new — result RSC, both return/cancel URLs)
- `src/app/(parent)/subscription/result/result-state.ts` (new — pure resolveSubscriptionResult)
- `src/app/(parent)/subscription/result/result-state.test.ts` (new — 6 tests)
- `src/app/(parent)/account/page.tsx` (modified — async RSC + next-billing-date line)
- `src/app/api/payments/payos/webhook/route.ts` (modified — activation email hook at reserved insertion point)
- `src/app/api/payments/payos/webhook/route.test.ts` (modified — +3 tests, email mocks)
- `src/infrastructure/email/resend.ts` (modified — sendSubscriptionActivatedEmail)
- `src/infrastructure/email/resend.test.ts` (modified — +2 tests)
- `src/infrastructure/email/templates/subscription-activated-email.tsx` (new — activation email template)
- `src/components/parent/subscribe-button.tsx` (new — client checkout CTA)
- `src/components/parent/subscription-result-toast.tsx` (new — one-shot result toast)
- `src/components/parent/subscription-plan-card.tsx` (modified — renders SubscribeButton via plan prop)
- `src/locales/vi/subscription.ts` (modified — 9 D11 strings appended)
- `src/locales/vi/emails.ts` (modified — 4 subscriptionActivated* strings appended)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — story status tracking)

## Change Log

- 2026-07-24: Story 6.3 implemented (all 8 tasks). Checkout server action with config-sourced pricing + PENDING_PAYMENT row + PayOS checkout URL; webhook activation email via User.email (best-effort, 200 preserved); activation now clears cancelledAt; SubscribeButton client CTA with pending state + error toast; single `/subscription/result` page resolving PayOS redirect params with one-shot toast; account page next-billing-date line. 27 new tests (332 total green), tsc/eslint/next build clean. Status: review.
- 2026-07-24: Story created via create-story workflow (ultimate context engine analysis: epics + PRD + EXPERIENCE/UX-DRs + project context + payment/subscription codebase survey + PayOS redirect research + Stories 6.1/6.2 intelligence). Key decisions: client-plan/server-price checkout action returning checkoutUrl (D1), PENDING_PAYMENT create/reset repo function with ACTIVE guard + AD-9 header clarification (D2), activation clears cancelledAt (D3), activation email via User.email with greetingFallback (D4/D5), single `/subscription/result` page reading PayOS redirect params + toast-once component (D7/D8), minimal account billing-date line (D9). Status: ready-for-dev.
