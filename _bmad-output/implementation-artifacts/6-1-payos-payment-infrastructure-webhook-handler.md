---
baseline_commit: 82d0c4e
---

# Story 6.1: PayOS Payment Infrastructure & Webhook Handler

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the PayOS adapter and HMAC-verified webhook handler implemented,
so that the subscription state machine is driven exclusively by verified payment events — never by client-side calls.

## Acceptance Criteria

1. **Given** `src/infrastructure/payment/payos.ts` exists, **when** `initiatePayment({ orderCode, amount, description, returnUrl, cancelUrl })` is called, **then** it creates a PayOS payment request using `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` and returns `{ checkoutUrl: string }` for the hosted MoMo flow; no card data passes through the server (NFR-12). *(The epic's AC names the first param `orderId` — PayOS's own name for it is `orderCode`, a number; use `orderCode` in code. See D2.)*
2. **Given** PayOS sends a webhook to `/api/payments/payos/webhook`, **when** the handler receives a request, **then** the HMAC-SHA256 signature is verified using `PAYOS_CHECKSUM_KEY` before any DB mutation; an unverified request returns HTTP 400 with no DB changes (AD-9).
3. **And** on a verified `PAID` event: `Subscription.status` transitions `PENDING_PAYMENT → ACTIVE`; `Subscription.renewsAt` is set to 30 days from now.
4. **And** on a scheduled expiry job trigger: `Subscription.status` transitions `ACTIVE → EXPIRED` for subscriptions whose `renewsAt` has passed. *(PayOS has no subscription-expiry webhook event — payments are one-shot; the epic's "verified expiry event (or scheduled job trigger)" resolves to the scheduled job. See D5.)*
5. **And** `Subscription.status` is never changed from any client-invoked server action — only from this webhook handler or the scheduled expiry job (AD-9).
6. **And** the webhook handler is idempotent: processing the same `orderCode` twice does not create duplicate records or duplicate state transitions.

## Design Decisions (resolved during story creation — do not re-litigate)

These close gaps between the ACs and the current code. Implement exactly as stated.

- **D1 — Install `@payos/node` v2 (the current SDK) as a new dependency.** It is NOT in `package.json` yet. v2 requires Node 20+ (project uses `@types/node ^20` — fine). Instantiation: `new PayOS({ clientId: env.PAYOS_CLIENT_ID, apiKey: env.PAYOS_API_KEY, checksumKey: env.PAYOS_CHECKSUM_KEY })`. The three env vars are ALREADY validated in `src/lib/env.ts` (lines 21–24) — no PayOS env changes needed. Do NOT use v1's API shape (`new PayOS(id, key, checksum)` / `createPaymentLink()` / `verifyPaymentWebhookData()`) — v2 renamed these to `payos.paymentRequests.create()` and `payos.webhooks.verify()`.
- **D2 — Replace the `payos.ts` stub's `createPaymentLink` with `initiatePayment`.** The stub (`src/infrastructure/payment/payos.ts`) has zero importers (grep-verified), so renaming is safe. Signature: `initiatePayment(params: { orderCode: number; amount: number; description: string; returnUrl: string; cancelUrl: string }): Promise<{ checkoutUrl: string }>`. Internally calls `payos.paymentRequests.create({ orderCode, amount, description, returnUrl, cancelUrl })` and returns `{ checkoutUrl: response.checkoutUrl }`. Module holds a lazily-created singleton PayOS client (module-level `let` + getter) so importing the module in tests doesn't construct the SDK client. PayOS constraints to document in code comments: `orderCode` must be a positive integer unique per merchant (≤ `Number.MAX_SAFE_INTEGER`); `description` max **25 characters** (VietQR field limit — PayOS rejects longer). Caller (Story 6.3) generates the orderCode; this story provides and exports `generateOrderCode(): number` here (timestamp-based: `Date.now() * 1000 + Math.floor(Math.random() * 1000)` — stays under MAX_SAFE_INTEGER until year ~2255, collision-safe enough for v1 volume) so 6.3 doesn't invent its own.
- **D3 — Schema change: add `payosOrderCode BigInt? @unique` to `Subscription`.** The webhook payload identifies the payment only by `orderCode` — without a stored correlation the handler cannot find which Subscription to activate. Nullable (existing rows and rows before checkout have none), `@unique` (one pending payment at a time per v1 design; also gives the idempotency lookup an index). `BigInt` not `Int` — orderCode values from `generateOrderCode()` exceed Int4 range. Migration name: `add_subscription_payos_order_code`. Run via `npx dotenv -e .env.local -- npx prisma migrate dev --name add_subscription_payos_order_code` (the project's `.env.local` convention; `DATABASE_URL` direct connection is migrations-only per AD-3).
- **D4 — Webhook handler flow (exact order, in `src/app/api/payments/payos/webhook/route.ts`):**
  1. `const body = await req.json()` inside try/catch → malformed JSON returns 400.
  2. `payos.webhooks.verify(body)` inside try/catch — ANY throw (invalid signature, malformed payload) → `NextResponse.json({ error: 'Invalid signature' }, { status: 400 })`, **zero DB access before this point**. Export a `verifyWebhook(body)` function from `payos.ts` that wraps `payos.webhooks.verify()` so the route never touches the SDK directly and tests can mock the adapter, not the SDK.
  3. Verified data with a non-success code (`data.code !== '00'`) → `200 { received: true }`, no mutation (failed/cancelled payments are acknowledged, not processed — PayOS retries webhooks that don't get a 2xx).
  4. On success code: `activateSubscriptionByOrderCode(orderCode)` (D6). If it reports no row transitioned → still return `200 { received: true }`. This single rule handles BOTH idempotency (second delivery of the same orderCode finds status already ACTIVE → no-op) AND PayOS's webhook-URL confirmation probe (when `payos.webhooks.confirm()`/dashboard registration fires a test payload with an orderCode that matches no Subscription — returning non-2xx would make webhook registration fail).
  5. Never return 4xx/5xx for "unknown orderCode" — only for signature/parse failures.
- **D5 — Expiry = repository function + cron route; no PayOS event.** (a) `expireDueSubscriptions(now: Date)` in `subscription-repository.ts`: `db.subscription.updateMany({ where: { status: { in: ['ACTIVE', 'CANCELLED'] }, renewsAt: { lte: now } }, data: { status: 'EXPIRED' } })` returning the count. `CANCELLED` is included deliberately: Story 6.4's cancel is end-of-period — a cancelled subscription retains access until `renewsAt`, then must expire; ACTIVE→EXPIRED and CANCELLED→EXPIRED are the only transitions this job performs. (b) New route `src/app/api/cron/expire-subscriptions/route.ts` (GET — Vercel Cron sends GET): checks `Authorization` header equals `` `Bearer ${env.CRON_SECRET}` `` → 401 JSON on mismatch; on match calls `expireDueSubscriptions(new Date())` and returns `200 { expired: count }`. (c) Add `CRON_SECRET: z.string().min(16)` to `src/lib/env.ts` and a value to `.env.local`. (d) `vercel.json` gains `"crons": [{ "path": "/api/cron/expire-subscriptions", "schedule": "0 17 * * *" }]` (17:00 UTC = midnight ICT; daily is Hobby-plan compatible).
- **D6 — Idempotent activation lives in the repository, not the route.** Add to `subscription-repository.ts`: `activateSubscriptionByOrderCode(orderCode: bigint, renewsAt: Date): Promise<boolean>` implemented as `db.subscription.updateMany({ where: { payosOrderCode: orderCode, status: 'PENDING_PAYMENT' }, data: { status: 'ACTIVE', renewsAt } })` → returns `count > 0`. The `status: 'PENDING_PAYMENT'` guard in the WHERE clause is the idempotency mechanism — a replayed webhook matches zero rows because the row is already ACTIVE. `updateMany` (not `update`) so an unknown orderCode is a zero-count no-op instead of a throw. The route computes `renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)` and converts `BigInt(data.orderCode)` at the call site.
- **D7 — BigInt never crosses a JSON boundary.** `JSON.stringify`/`NextResponse.json` throws on BigInt. Neither the webhook response nor the cron response may include `payosOrderCode`; repository functions return booleans/counts, never the Subscription row. Story 6.3's server action will also need this care — leave a code comment on the schema field.
- **D8 — Webhook route stays lean; the activation email is Story 6.3's.** Epic 6.3's AC sends the subscription-activation email "when the HMAC-verified webhook processes the PAID event" — 6.3 will extend this handler with a `sendSubscriptionActivatedEmail(...)` call (via `src/infrastructure/email/resend.ts`, AD-14) after a successful activation. Structure the handler so that insertion point is obvious (activation result in a local variable), but do NOT build the email now (no template, no locale strings exist yet).
- **D9 — No UI, no locale strings, no server actions in this story.** Plans page (6.2), checkout server action + Subscription-record creation (6.3), and cancel/reactivate (6.4) are later stories. Nothing here imports from `src/app/(parent)/`. `hasActiveSubscription`/`isAllotmentExhausted` in the repository are untouched — activation flips status to ACTIVE and the existing Free-Tier gate immediately honors it with zero changes (that's the FR-24 "no re-login" mechanism).
- **D10 — Both new routes are Node-runtime route handlers (the default).** Do not add `export const runtime = 'edge'` — Prisma and the PayOS SDK require Node. No middleware, no signature verification outside the route.

## Tasks / Subtasks

- [x] Task 1: Dependency + schema (AC: #3, #6; D1, D3)
  - [x] 1.1 `npm install @payos/node` (v2.x lands in `dependencies`).
  - [x] 1.2 `prisma/schema.prisma`: add `payosOrderCode BigInt? @unique // PayOS orderCode correlation; BigInt — never serialize to JSON (D7)` to `model Subscription`.
  - [x] 1.3 Create migration `add_subscription_payos_order_code` (D3 command). If no DB is reachable in the sandbox, author the migration SQL by hand under `prisma/migrations/<timestamp>_add_subscription_payos_order_code/migration.sql` (`ALTER TABLE "Subscription" ADD COLUMN "payosOrderCode" BIGINT; CREATE UNIQUE INDEX ...`) matching Prisma's generated shape, and flag it in Completion Notes.
- [x] Task 2: PayOS adapter (AC: #1, #2; D1, D2)
  - [x] 2.1 Rewrite `src/infrastructure/payment/payos.ts`: lazy singleton `PayOS` client from `env` vars; export `initiatePayment(params): Promise<{ checkoutUrl: string }>`; export `verifyWebhook(body: unknown)` returning the SDK's verified webhook data (let SDK throws propagate to the caller); export `generateOrderCode(): number`. Document the 25-char description limit and orderCode constraints in comments.
  - [x] 2.2 Keep the file free of Prisma/db imports — the adapter talks only to the PayOS SDK (AD-2: infrastructure imports Domain types + external SDKs only).
- [x] Task 3: Subscription repository transitions (AC: #3, #4, #5, #6; D5a, D6)
  - [x] 3.1 Add `activateSubscriptionByOrderCode(orderCode: bigint, renewsAt: Date): Promise<boolean>` (updateMany with `status: 'PENDING_PAYMENT'` guard).
  - [x] 3.2 Add `expireDueSubscriptions(now: Date): Promise<number>` (updateMany over ACTIVE + CANCELLED with `renewsAt <= now`).
  - [x] 3.3 Add a file-header comment: "Subscription.status transitions live ONLY here and are invoked ONLY by the PayOS webhook route and the expiry cron route (AD-9). Never call these from a client-invoked server action."
- [x] Task 4: Webhook route (AC: #2, #3, #6; D4, D7, D8, D10)
  - [x] 4.1 Rewrite `src/app/api/payments/payos/webhook/route.ts` `POST` per D4's exact flow: parse → `verifyWebhook` → non-'00' ack → `activateSubscriptionByOrderCode(BigInt(orderCode), now+30d)` → always `200 { received: true }` on verified payloads.
  - [x] 4.2 Confirm zero DB reads/writes occur before verification succeeds (AC #2) — structure the code so this is visible (verification block first, repository import used only after).
- [x] Task 5: Expiry cron route + config (AC: #4, #5; D5b–d)
  - [x] 5.1 `src/lib/env.ts`: add `CRON_SECRET: z.string().min(16)`. Add a generated value to `.env.local` (and note it as a new Vercel env var in Completion Notes).
  - [x] 5.2 New `src/app/api/cron/expire-subscriptions/route.ts` `GET`: Bearer-token check → 401 `{ error: 'UNAUTHORIZED' }` on mismatch/absence; else `expireDueSubscriptions(new Date())` → `200 { expired: count }`.
  - [x] 5.3 `vercel.json`: add the `crons` entry (D5d), keeping `"regions": ["sin1"]`.
- [x] Task 6: Tests (all ACs)
  - [x] 6.1 `src/infrastructure/payment/payos.test.ts`: mock `@payos/node` (`vi.mock('@payos/node', ...)` with a `PayOS` class whose `paymentRequests.create`/`webhooks.verify` are `vi.fn()`); assert `initiatePayment` passes params through and returns `{ checkoutUrl }`; assert `verifyWebhook` propagates SDK throws; assert `generateOrderCode` returns a positive safe integer and distinct consecutive values.
  - [x] 6.2 `src/infrastructure/repositories/subscription-repository.test.ts`: extend the existing file (keep its `vi.mock('@/lib/db')` shape — add `updateMany: vi.fn()` to the subscription mock). Cases: activate returns true on count 1 and false on count 0; WHERE includes `status: 'PENDING_PAYMENT'` + the exact orderCode; expire's WHERE covers ACTIVE and CANCELLED with `renewsAt: { lte: now }`; existing 3 tests stay green.
  - [x] 6.3 New `src/app/api/payments/payos/webhook/route.test.ts`: mock `@/infrastructure/payment/payos` and `@/infrastructure/repositories/subscription-repository`. Cases: (a) invalid signature (verifyWebhook throws) → 400 and repository never called; (b) malformed JSON body → 400; (c) verified `code: '00'` → activation called with `BigInt(orderCode)` and a `renewsAt` ≈ 30 days out, 200; (d) verified non-'00' → 200, no activation; (e) activation returns false (replay/unknown orderCode) → still 200 (idempotency, AC #6). Invoke `POST(new NextRequest('http://localhost/api/payments/payos/webhook', { method: 'POST', body: JSON.stringify(...) }))` — node environment handles this fine.
  - [x] 6.4 New `src/app/api/cron/expire-subscriptions/route.test.ts`: missing/wrong Bearer → 401 and repository never called; correct Bearer → 200 `{ expired: n }`. Mock `@/lib/env` (see Dev Notes — env.ts parses at import, so tests must mock it) and the repository.
  - [x] 6.5 AC #5 verification: grep `src/app/**/actions.ts` for any `subscription.update`/status writes — expected zero (grep-verified at story creation: no `subscription.create|update|upsert` exists anywhere in `src/`). Record the sweep in Completion Notes.
  - [x] 6.6 Full gate: `npx vitest run` (**277 green at baseline — all must pass plus new**), `npx tsc --noEmit`, `npx eslint <changed files>`, `npx next build`.
- [x] Task 7: End-to-end code trace for Completion Notes (AC: #2, #3, #6)
  - [x] 7.1 Trace: PayOS POSTs signed payload → route parses → `verifyWebhook` (HMAC-SHA256 via checksum key inside SDK) → '00' → `activateSubscriptionByOrderCode` guarded updateMany → ACTIVE + renewsAt(+30d) → replay of same orderCode matches 0 rows → 200 no-op. State plainly that no DB mutation can precede signature verification and that live webhook delivery (needs a public URL + PayOS merchant account) is a manual QA item — established sandbox fallback applies.

## Dev Notes

### Current state of files being modified (read them before editing)

- `src/infrastructure/payment/payos.ts` — 10-line stub: `createPaymentLink()` that throws 'Not yet implemented — Story 6.1'. **Zero importers** — replace wholesale (D2).
- `src/app/api/payments/payos/webhook/route.ts` — stub `POST` returning 501. Replace wholesale (D4). The path `/api/payments/payos/webhook` is fixed by AD-9 — do not move it.
- `src/infrastructure/repositories/subscription-repository.ts` — 23 lines: `hasActiveSubscription` (status === 'ACTIVE' via `findUnique`) and `isAllotmentExhausted` (shared by student gate + parent upsell banner — comment in file). **Do not modify these two functions**; append the two new transition functions. Because `hasActiveSubscription` keys purely off status, webhook activation propagates to the Free-Tier gate instantly with no session/JWT involvement.
- `src/infrastructure/repositories/subscription-repository.test.ts` — 3 tests, mock shape `db: { subscription: { findUnique: vi.fn() } }`. Extend, don't replace.
- `src/lib/env.ts` — zod schema; PayOS vars at lines 21–24 already present. Add only `CRON_SECRET`. Note: `envSchema.parse(process.env)` runs at import — any test importing a module that (transitively) imports `@/lib/env` must `vi.mock('@/lib/env', () => ({ env: { ...fakes } }))` first (the resend tests already follow this pattern — copy it).
- `prisma/schema.prisma` — `model Subscription` (lines 74–83): `parentAccountId @unique` (one subscription per parent, FR-24 comment), `status SubscriptionStatus`, `renewsAt DateTime?`, `cancelledAt DateTime?`. Enum `SubscriptionStatus` (lines 29–34) already has all four states — no enum change.
- `vercel.json` — currently only `{ "regions": ["sin1"] }`.
- `src/lib/db.ts` — global-singleton Prisma client; import as `import { db } from '@/lib/db'` in repositories only.

### Architecture guardrails

- **AD-9 is the story's reason to exist:** HMAC verification before ANY DB mutation; status transitions only via webhook handler or scheduled expiry job. The repository-level guard comment (Task 3.3) + the grep sweep (Task 6.5) make the invariant auditable.
- **AD-2 layers:** route handlers count as Application layer — they may import Infrastructure (repository, payment adapter). The adapter (`payos.ts`) imports only the SDK + env. No Presentation involvement anywhere in this story.
- **NFR-12 / PCI posture:** the hosted-flow design means no card/wallet data ever reaches this codebase — `initiatePayment` sends only order metadata and receives a redirect URL. Don't log webhook payloads' full contents (they carry buyer info); log orderCode + outcome only.
- **AD-3:** migration uses direct `DATABASE_URL` via the dotenv convention; runtime code keeps using the pooled client through `@/lib/db`.
- **Server-action contract does not apply to route handlers** — webhooks speak HTTP status codes (400/401/200 JSON), not `{ data } | { error }`. Keep the two idioms in their own worlds.
- **Idempotency is state-guard-based, not ledger-based** (D6). Do NOT add a webhook-events table, processed-event log, or unique constraint gymnastics — the `PENDING_PAYMENT` WHERE guard is sufficient for v1's one-subscription-per-parent model.

### PayOS SDK v2 specifics (verified 2026-07-24)

- Package `@payos/node` v2.x, Node ≥ 20. Import: `import { PayOS } from '@payos/node'`.
- Client: `new PayOS({ clientId, apiKey, checksumKey })` (object arg — v1 took positional args).
- Create payment: `payos.paymentRequests.create({ orderCode, amount, description, returnUrl, cancelUrl })` → response includes `checkoutUrl` (plus `orderCode`, `paymentLinkId`, etc.).
- Verify webhook: `payos.webhooks.verify(body)` where body is the full posted JSON (`{ code, desc, success, data, signature }`); returns the verified `data` object (contains `orderCode: number`, `amount`, `code` — `'00'` = success); **throws** on invalid signature. Treat any throw as unverified → 400.
- Amounts are integer VNĐ (no decimals). `description` ≤ 25 chars. `orderCode`: positive integer, unique per merchant.
- PayOS retries webhook deliveries that don't receive 2xx, and fires a test payload when a webhook URL is registered — hence D4's "verified-but-unknown orderCode → 200" rule.

### What NOT to build (scope walls)

- **No Subscription creation, no checkout server action, no plans/account UI, no locale strings** — Stories 6.2/6.3/6.4.
- **No activation email** — 6.3 (D8); no email templates or resend.ts changes.
- **No webhook-URL registration code** (`payos.webhooks.confirm()`) — that's a one-time ops step done via PayOS dashboard/console; note it as a deployment step in Completion Notes instead.
- **No recurring-billing/auto-renew machinery** — PayOS is one-shot; renewal = a new manual payment (6.4 reactivation). The cron job only EXPIRES.
- **No rate limiting, no replay-nonce store, no webhook event ledger** (idempotency per D6). The open rate-limiting action item is scoped to auth paths.
- **No changes to `hasActiveSubscription`/`isAllotmentExhausted`** or any student/parent/teacher surface code.
- **No edge runtime, no middleware, no `payos.webhooks.confirm` call at boot.**

### Project Structure Notes

- Files to **create**: `src/app/api/cron/expire-subscriptions/route.ts`, `src/infrastructure/payment/payos.test.ts`, `src/app/api/payments/payos/webhook/route.test.ts`, `src/app/api/cron/expire-subscriptions/route.test.ts`, one Prisma migration dir.
- Files to **modify**: `src/infrastructure/payment/payos.ts` (rewrite), `src/app/api/payments/payos/webhook/route.ts` (rewrite), `src/infrastructure/repositories/subscription-repository.ts` (+ its test), `src/lib/env.ts`, `prisma/schema.prisma`, `vercel.json`, `package.json` (+lockfile).
- Naming: kebab-case files, camelCase functions (`initiatePayment`, `verifyWebhook`, `generateOrderCode`, `activateSubscriptionByOrderCode`, `expireDueSubscriptions`).

## Previous Story Intelligence

- **Story 5.7 (commit `82d0c4e`, in review):** test baseline is now **277 tests / 27+ files green**; gate = vitest + `tsc --noEmit` + eslint on changed files + `next build`. Mock conventions: inline `vi.mock('@/lib/db')` / `vi.mock('@/lib/auth')` / `vi.mock('@/lib/env')`, `environment: 'node'`, **no DOM tests** (4.5 precedent) — route handlers and repositories are exactly the node-testable surface this story lives in.
- **Verification convention:** live external QA (here: a real PayOS webhook delivery) is usually impossible in the sandbox; the accepted fallback is `next build` + full unit coverage + an explicit end-to-end code trace in Completion Notes with the live gap flagged (Task 7).
- **Story 5.2 (resend adapter) is the closest structural precedent for this story's adapter:** single infrastructure module wrapping an SDK, env-validated keys, adapter-level tests that mock the SDK module, callers mock the adapter. Mirror that layering for `payos.ts`.
- **Git pattern:** one commit per story, conventional-commit style (`feat(payments): ...`), story file + sprint-status.yaml updated in the same commit.
- **Open action items that do NOT belong here:** rate limiting (auth paths), GlobalConfig seeding (3.2/7.5 — done), rounded-brand-xl tailwind-merge risk (UI stories).

## Latest Tech Notes (verified 2026-07-24)

- **New package: `@payos/node` v2** — see "PayOS SDK v2 specifics" above; this is the only dependency change.
- Next `15.3.9` route handlers: `POST(req: NextRequest)` / `GET(req: NextRequest)`, `NextResponse.json(body, { status })`. Node runtime is the default — add nothing.
- Prisma `^5.22.0` `BigInt` maps to JS `bigint`; comparison/filters accept `bigint` values (`where: { payosOrderCode: BigInt(x) }`). `JSON.stringify` on `bigint` THROWS — D7.
- Vercel Cron: configured in `vercel.json` `crons[]`; requests arrive as GET with `Authorization: Bearer <CRON_SECRET>` when a `CRON_SECRET` env var is set on the project. Hobby plan allows daily schedules.
- zod `^4.4.3`: `z.string().min(16)` unchanged from v3 usage in this file.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.1] (lines 1047–1069) — ACs verbatim; Epic 6 overview (1043–1045); 6.3's webhook-email handoff (1104–1106)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-toantuduy-2026-07-08/ARCHITECTURE-SPINE.md#AD-9] — webhook-only state mutation + HMAC rule; #AD-2 layers; #AD-3 two connection strings; stack table (PayOS Node SDK)
- [Source: _bmad-output/planning-artifacts/prds/prd-toantuduy-2026-07-08/prd.md#FR-24] (365–372) — 10-second activation, all profiles, no re-login; §Security (431) — hosted flow, no card data (NFR-12); FR-25 (374–381) — cancel/reactivate context for D5's CANCELLED handling
- [Source: _bmad-output/project-context.md#Payment & Security Rules] — webhook path, HMAC-before-mutation, valid transition sources
- [Source: src/infrastructure/payment/payos.ts] — stub being replaced (zero importers)
- [Source: src/app/api/payments/payos/webhook/route.ts] — stub being replaced
- [Source: src/infrastructure/repositories/subscription-repository.ts] — append-only target; `hasActiveSubscription` is the activation's downstream consumer
- [Source: src/lib/env.ts] (21–24) — PayOS vars already validated; CRON_SECRET addition point
- [Source: prisma/schema.prisma] (29–34, 74–83) — SubscriptionStatus enum + Subscription model
- [Source: src/infrastructure/email/resend.ts + resend.test.ts] — SDK-adapter structural precedent (5.2)
- [Source: _bmad-output/implementation-artifacts/5-7-teacher-portal-state-patterns-approval-gate-hardening.md] — baseline 277, gate + verification conventions
- [Source: github.com/payOSHQ/payos-lib-node] — @payos/node v2 API (paymentRequests.create / webhooks.verify), Node 20+ requirement

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Epics, architecture spine, PRD, project context, Prisma schema, the existing payment/webhook stubs, subscription repository, env validation, Stories 5.2/5.7 intelligence, git history, and current PayOS SDK v2 documentation were analyzed. The ten design decisions resolve every gap between the epic's ACs and the current system — notably the missing orderCode↔Subscription correlation (D3), the v1→v2 PayOS SDK API change (D1/D2), the nonexistence of PayOS expiry events (D5), and the idempotency mechanism (D6).

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5) via Claude Code

### Debug Log References

- `npm install @payos/node` failed with an ERESOLVE error — the repo is **pnpm-managed** (`pnpm-lock.yaml` + `node_modules/.pnpm`); installed with `pnpm add @payos/node` instead → `@payos/node 2.0.5` in `dependencies`.
- `prisma migrate dev` refuses non-interactive environments. Fallback (per Task 1.3): generated the migration SQL with `prisma migrate diff --from-schema-datasource --to-schema-datamodel --script` (exact Prisma-generated shape: `ALTER TABLE "Subscription" ADD COLUMN "payosOrderCode" BIGINT; CREATE UNIQUE INDEX "Subscription_payosOrderCode_key" ...`), placed it under `prisma/migrations/20260724030000_add_subscription_payos_order_code/`, then **applied it to the real database** via `prisma migrate deploy` (success — 7 migrations, all applied) and re-ran `prisma generate`. Not a sandbox-only migration; the DB column exists.

### Completion Notes List

- **Adapter** (`src/infrastructure/payment/payos.ts`): lazy-singleton PayOS v2 client (`new PayOS({ clientId, apiKey, checksumKey })` from validated env); exports `initiatePayment` (→ `payos.paymentRequests.create`, returns `{ checkoutUrl }`), `verifyWebhook` (→ `payos.webhooks.verify`, throws propagate), `generateOrderCode` (timestamp-based safe integer). No db/Prisma imports (AD-2). 25-char description + orderCode constraints documented in comments (D2).
- **Repository** (`subscription-repository.ts`): appended `activateSubscriptionByOrderCode` (updateMany with `status: 'PENDING_PAYMENT'` WHERE guard = idempotency, D6) and `expireDueSubscriptions` (ACTIVE + CANCELLED with `renewsAt <= now` → EXPIRED, D5a). AD-9 file-header comment added. `hasActiveSubscription`/`isAllotmentExhausted` untouched — activation propagates to the Free-Tier gate with zero changes (FR-24).
- **Webhook route**: exact D4 flow — JSON parse (400 on malformed) → `verifyWebhook` (400 on any throw, **zero DB access before this line**) → non-'00' ack 200 → `activateSubscriptionByOrderCode(BigInt(orderCode), now+30d)` → always 200 `{ received: true }` on verified payloads (covers replays and PayOS's registration probe). Activation result held in a local `activated` variable — Story 6.3's email hook inserts there (D8). Logs orderCode + outcome only, never payload contents (NFR-12). No BigInt in any JSON response (D7).
- **Expiry cron route** (`/api/cron/expire-subscriptions`, GET): `Authorization: Bearer ${CRON_SECRET}` check → 401 `{ error: 'UNAUTHORIZED' }`; on match `expireDueSubscriptions(new Date())` → 200 `{ expired: count }`. `CRON_SECRET: z.string().min(16)` added to env schema; a generated 48-char value appended to `.env.local`. `vercel.json` gained the daily cron (`0 17 * * *` = midnight ICT), `regions: ["sin1"]` preserved.
- **AC #5 sweep (Task 6.5):** `grep 'subscription\.(create|update|upsert|delete)'` over `src/` → matches ONLY in `subscription-repository.ts` (the two new transition functions) and its test. Zero subscription writes in any `actions.ts` / server action. AD-9 invariant holds.
- **Tests:** 16 new (adapter 5, repository 3, webhook route 5, cron route 3), existing 3 repository tests untouched and green. **Full gate: 293/293 vitest (baseline 277 + 16), `tsc --noEmit` clean, `eslint` clean on all changed files, `next build` succeeds** with both routes registered as dynamic (ƒ).
- **End-to-end trace (Task 7.1):** PayOS POSTs the signed JSON to `/api/payments/payos/webhook` → `req.json()` (malformed → 400) → `verifyWebhook(body)` = `payos.webhooks.verify` (HMAC-SHA256 with `PAYOS_CHECKSUM_KEY` inside the SDK; any throw → 400, and the repository has not been touched — the only DB-capable import is used strictly after this block) → verified `code === '00'` → `activateSubscriptionByOrderCode(BigInt(orderCode), now+30d)` → `updateMany WHERE payosOrderCode = X AND status = 'PENDING_PAYMENT'` flips the row to ACTIVE and sets `renewsAt` → a replay of the same orderCode finds the row already ACTIVE, matches 0 rows, returns false → route still answers 200 no-op. **No DB mutation can precede signature verification.** Expiry: Vercel Cron GETs the guarded route daily; ACTIVE/CANCELLED rows past `renewsAt` flip to EXPIRED.
- **Manual QA gap (established sandbox fallback):** live webhook delivery needs a public URL + PayOS merchant account — verified here by unit tests + build + this code trace instead.
- **Deployment steps for Toan:** (1) add `CRON_SECRET` as a Vercel env var (same value as `.env.local` or a fresh one); (2) one-time ops: register the webhook URL `https://<domain>/api/payments/payos/webhook` in the PayOS dashboard (no code for this per scope walls); (3) Vercel picks up the cron from `vercel.json` on next deploy.

### File List

- `package.json` (modified — `@payos/node ^2.0.5` dependency)
- `pnpm-lock.yaml` (modified — lockfile for the above)
- `prisma/schema.prisma` (modified — `Subscription.payosOrderCode BigInt? @unique`)
- `prisma/migrations/20260724030000_add_subscription_payos_order_code/migration.sql` (new — applied to DB)
- `src/infrastructure/payment/payos.ts` (rewritten — PayOS v2 adapter)
- `src/infrastructure/payment/payos.test.ts` (new — 5 tests)
- `src/infrastructure/repositories/subscription-repository.ts` (modified — 2 transition functions + AD-9 header)
- `src/infrastructure/repositories/subscription-repository.test.ts` (modified — +3 tests, mock extended with `updateMany`)
- `src/app/api/payments/payos/webhook/route.ts` (rewritten — verified webhook handler)
- `src/app/api/payments/payos/webhook/route.test.ts` (new — 5 tests)
- `src/app/api/cron/expire-subscriptions/route.ts` (new — guarded expiry job)
- `src/app/api/cron/expire-subscriptions/route.test.ts` (new — 3 tests)
- `src/lib/env.ts` (modified — `CRON_SECRET`)
- `vercel.json` (modified — daily cron entry)
- `.env.local` (modified — `CRON_SECRET` value; gitignored, not committed)

## Change Log

- 2026-07-24: Story 6.1 implemented (Claude Fable 5). PayOS v2 adapter (`initiatePayment`/`verifyWebhook`/`generateOrderCode`), `payosOrderCode` correlation column + applied migration, HMAC-verify-before-any-DB webhook handler with state-guard idempotency, CRON_SECRET-guarded daily expiry route + Vercel cron. 16 new tests; full gate green (293 vitest / tsc / eslint / next build). Status → review.
- 2026-07-24: Story created via create-story workflow (ultimate context engine analysis: epics + architecture spine + PRD + project context + payment/subscription codebase survey + PayOS SDK v2 research + Stories 5.2/5.7 intelligence). Key decisions: install @payos/node v2 with adapter-wrapped `initiatePayment`/`verifyWebhook`/`generateOrderCode` (D1/D2), `payosOrderCode BigInt? @unique` correlation column (D3), verify-before-any-DB webhook flow with 200-on-unknown-orderCode idempotency (D4/D6), scheduled expiry via CRON_SECRET-guarded route + Vercel cron covering ACTIVE and CANCELLED (D5), activation email deferred to 6.3 (D8). Status: ready-for-dev.
