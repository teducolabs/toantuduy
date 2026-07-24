// Subscription.status transitions live ONLY here and are invoked ONLY by the PayOS
// webhook route and the expiry cron route (AD-9). Never call these from a
// client-invoked server action.
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

// PENDING_PAYMENT → ACTIVE, keyed by the PayOS orderCode correlation (D6).
// The `status: 'PENDING_PAYMENT'` guard IS the idempotency mechanism: a replayed
// webhook (or an unknown orderCode) matches zero rows and is a no-op — hence
// updateMany, not update. Returns whether a row actually transitioned.
export async function activateSubscriptionByOrderCode(orderCode: bigint, renewsAt: Date): Promise<boolean> {
  const result = await db.subscription.updateMany({
    where: { payosOrderCode: orderCode, status: 'PENDING_PAYMENT' },
    data: { status: 'ACTIVE', renewsAt },
  })
  return result.count > 0
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
