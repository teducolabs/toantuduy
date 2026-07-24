// Subscription.status transitions live ONLY here (AD-9). Transitions to
// ACTIVE/EXPIRED are invoked ONLY by the PayOS webhook route and the expiry cron
// route. Creation/reset to PENDING_PAYMENT is invoked ONLY by the checkout server
// action — it grants nothing; activation still requires the verified webhook.
import type { SubscriptionStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { getFreeTierDailyAllotment } from '@/infrastructure/repositories/global-config-repository'
import { countQuestionsAnsweredToday } from '@/infrastructure/repositories/session-repository'

export async function hasActiveSubscription(parentAccountId: string): Promise<boolean> {
  const subscription = await db.subscription.findUnique({ where: { parentAccountId } })
  return subscription?.status === 'ACTIVE'
}

// Shared by the student surface (startSessionAction / getSessionStartGateState) and
// the parent dashboard (upsell banner) so the subscription-bypass + allotment logic
// can't drift between callers.
export async function isAllotmentExhausted(childProfileId: string, parentAccountId: string): Promise<boolean> {
  const subscribed = await hasActiveSubscription(parentAccountId)
  if (subscribed) return false

  const [allotment, answeredToday] = await Promise.all([
    getFreeTierDailyAllotment(),
    countQuestionsAnsweredToday(childProfileId),
  ])
  return answeredToday >= allotment
}

// Creates (or resets) the parent's single Subscription row to PENDING_PAYMENT with
// the fresh PayOS orderCode before checkout. Returns false — and touches nothing —
// when an ACTIVE subscription already exists (never clobber a live subscription).
// EXPIRED/CANCELLED/PENDING_PAYMENT rows are reset in place (re-subscribe or
// retry-with-new-orderCode). renewsAt/cancelledAt are left alone here — the webhook
// owns them on activation. The read-then-write race is acceptable: the webhook's
// `status: 'PENDING_PAYMENT'` WHERE guard makes double activation impossible.
export async function createPendingSubscription(parentAccountId: string, orderCode: bigint): Promise<boolean> {
  const existing = await db.subscription.findUnique({ where: { parentAccountId } })
  if (existing?.status === 'ACTIVE') return false

  if (!existing) {
    await db.subscription.create({
      data: { parentAccountId, status: 'PENDING_PAYMENT', payosOrderCode: orderCode },
    })
  } else {
    await db.subscription.update({
      where: { parentAccountId },
      data: { status: 'PENDING_PAYMENT', payosOrderCode: orderCode },
    })
  }
  return true
}

// PENDING_PAYMENT → ACTIVE, keyed by the PayOS orderCode correlation (D6).
// The `status: 'PENDING_PAYMENT'` guard IS the idempotency mechanism: a replayed
// webhook (or an unknown orderCode) matches zero rows and is a no-op — hence
// updateMany, not update. Returns whether a row actually transitioned.
export async function activateSubscriptionByOrderCode(orderCode: bigint, renewsAt: Date): Promise<boolean> {
  const result = await db.subscription.updateMany({
    where: { payosOrderCode: orderCode, status: 'PENDING_PAYMENT' },
    // cancelledAt cleared so a re-subscribing CANCELLED parent doesn't carry a
    // stale cancellation into the new ACTIVE period (Story 6.4's status display).
    data: { status: 'ACTIVE', renewsAt, cancelledAt: null },
  })
  return result.count > 0
}

// Parent's email for the activation notification, reached via
// Subscription → parentAccount → user.email. Null when the orderCode matches no row.
export async function getParentEmailByOrderCode(orderCode: bigint): Promise<string | null> {
  const row = await db.subscription.findUnique({
    where: { payosOrderCode: orderCode },
    select: { parentAccount: { select: { user: { select: { email: true } } } } },
  })
  return row?.parentAccount.user.email ?? null
}

// Status + next billing date for the account page. Deliberately never selects
// payosOrderCode — BigInt breaks JSON/RSC serialization (D10).
export async function getSubscriptionSummary(
  parentAccountId: string,
): Promise<{ status: SubscriptionStatus; renewsAt: Date | null } | null> {
  return db.subscription.findUnique({
    where: { parentAccountId },
    select: { status: true, renewsAt: true },
  })
}

// ACTIVE → EXPIRED and CANCELLED → EXPIRED for subscriptions past renewsAt.
// CANCELLED is included deliberately: cancellation (Story 6.4) is end-of-period —
// a cancelled subscription keeps access until renewsAt, then must expire here.
export async function expireDueSubscriptions(now: Date): Promise<number> {
  const result = await db.subscription.updateMany({
    where: { status: { in: ['ACTIVE', 'CANCELLED'] }, renewsAt: { lte: now } },
    data: { status: 'EXPIRED' },
  })
  return result.count
}
