import { db } from '@/lib/db'

export async function hasActiveSubscription(parentAccountId: string): Promise<boolean> {
  const subscription = await db.subscription.findUnique({ where: { parentAccountId } })
  return subscription?.status === 'ACTIVE'
}
