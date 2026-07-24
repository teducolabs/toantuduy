'use server'

import { requireParentAccountId } from '@/app/(parent)/profiles/actions'
import { getSubscriptionPlanPricing } from '@/infrastructure/repositories/global-config-repository'

export async function getSubscriptionPlansAction(): Promise<
  | { data: { monthlyPriceVnd: number; annualPriceVnd: number | null } }
  | { error: { code: string; message: string } }
> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const pricing = await getSubscriptionPlanPricing()
  return { data: pricing }
}
