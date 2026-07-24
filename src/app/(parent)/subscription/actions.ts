'use server'

import { revalidatePath } from 'next/cache'
import { requireParentAccountId } from '@/app/(parent)/profiles/actions'
import { getSubscriptionPlanPricing } from '@/infrastructure/repositories/global-config-repository'
import {
  cancelSubscription,
  createPendingSubscription,
  getSubscriptionSummary,
} from '@/infrastructure/repositories/subscription-repository'
import { generateOrderCode, initiatePayment } from '@/infrastructure/payment/payos'
import { env } from '@/lib/env'

// PayOS descriptions are capped at 25 chars (VietQR field limit) and must stay
// ASCII — diacritics risk the VietQR field. Not locale strings: PayOS field, not UI copy.
const MONTHLY_DESCRIPTION = 'ToanTuDuy goi thang'
const ANNUAL_DESCRIPTION = 'ToanTuDuy goi nam'

export async function getSubscriptionPlansAction(): Promise<
  | { data: { monthlyPriceVnd: number; annualPriceVnd: number | null } }
  | { error: { code: string; message: string } }
> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const pricing = await getSubscriptionPlanPricing()
  return { data: pricing }
}

// Creates the PENDING_PAYMENT row and returns the PayOS checkout URL — the CLIENT
// navigates (no redirect() here). The amount comes ONLY from GlobalConfig, never
// from the client: the client supplies just the plan name (payment-amount integrity).
export async function subscribeAction(
  plan: 'MONTHLY' | 'ANNUAL',
): Promise<{ data: { checkoutUrl: string } } | { error: { code: string; message: string } }> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const pricing = await getSubscriptionPlanPricing()
  if (plan === 'ANNUAL' && pricing.annualPriceVnd === null) {
    return { error: { code: 'PLAN_NOT_AVAILABLE', message: 'Annual plan is not available' } }
  }
  const amount = plan === 'ANNUAL' ? (pricing.annualPriceVnd as number) : pricing.monthlyPriceVnd

  const orderCode = generateOrderCode()
  const created = await createPendingSubscription(resolved.parentAccountId, BigInt(orderCode))
  if (!created) {
    return { error: { code: 'ALREADY_SUBSCRIBED', message: 'An active subscription already exists' } }
  }

  // A throw here leaves a pending row with a never-paid orderCode — harmless; a
  // retry overwrites it via createPendingSubscription.
  try {
    const resultUrl = `${env.NEXTAUTH_URL}/subscription/result`
    const { checkoutUrl } = await initiatePayment({
      orderCode,
      amount,
      description: plan === 'ANNUAL' ? ANNUAL_DESCRIPTION : MONTHLY_DESCRIPTION,
      returnUrl: resultUrl,
      cancelUrl: resultUrl,
    })
    return { data: { checkoutUrl } }
  } catch {
    return { error: { code: 'PAYMENT_INIT_FAILED', message: 'Could not initiate payment' } }
  }
}

// renewsAt is serialized to an ISO string — Date crosses the action boundary as
// a string, and payosOrderCode (BigInt) is never selected upstream (D10).
export async function getSubscriptionSummaryAction(): Promise<
  | { data: { status: string; renewsAt: string | null } | null }
  | { error: { code: string; message: string } }
> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const summary = await getSubscriptionSummary(resolved.parentAccountId)
  if (!summary) return { data: null }
  return { data: { status: summary.status, renewsAt: summary.renewsAt?.toISOString() ?? null } }
}

// Takes NO subscription id from the client — it cancels the session-derived
// parent's own row, so "parentAccountId matches the session" (AC #4) is
// structurally guaranteed rather than checked.
export async function cancelSubscriptionAction(): Promise<
  { data: { cancelled: true } } | { error: { code: string; message: string } }
> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const cancelled = await cancelSubscription(resolved.parentAccountId, new Date())
  if (!cancelled) {
    return { error: { code: 'FORBIDDEN', message: 'No active subscription to cancel' } }
  }

  revalidatePath('/account')
  revalidatePath('/dashboard')
  return { data: { cancelled: true } }
}
