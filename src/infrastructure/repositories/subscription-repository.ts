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
