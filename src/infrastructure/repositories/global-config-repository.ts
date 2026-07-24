import { db } from '@/lib/db'

const FREE_TIER_DAILY_ALLOTMENT_DEFAULT = 5
const SESSION_QUESTION_COUNT_DEFAULT = 10
const SUBSCRIPTION_MONTHLY_PRICE_VND_DEFAULT = 79000

async function getConfigInt(key: string, fallback: number): Promise<number> {
  const row = await db.globalConfig.findUnique({ where: { key } })
  if (!row) return fallback
  const parsed = parseInt(row.value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function getFreeTierDailyAllotment(): Promise<number> {
  return getConfigInt('FREE_TIER_DAILY_ALLOTMENT', FREE_TIER_DAILY_ALLOTMENT_DEFAULT)
}

export function getSessionQuestionCount(): Promise<number> {
  return getConfigInt('SESSION_QUESTION_COUNT', SESSION_QUESTION_COUNT_DEFAULT)
}

async function getConfigIntOrNull(key: string): Promise<number | null> {
  const row = await db.globalConfig.findUnique({ where: { key } })
  if (!row) return null
  const parsed = parseInt(row.value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

// Annual price has no fallback: a missing/unparsable row means the annual plan
// is not offered and its card must not render.
export async function getSubscriptionPlanPricing(): Promise<{
  monthlyPriceVnd: number
  annualPriceVnd: number | null
}> {
  const [monthlyPriceVnd, annualPriceVnd] = await Promise.all([
    getConfigInt('SUBSCRIPTION_MONTHLY_PRICE_VND', SUBSCRIPTION_MONTHLY_PRICE_VND_DEFAULT),
    getConfigIntOrNull('SUBSCRIPTION_ANNUAL_PRICE_VND'),
  ])
  return { monthlyPriceVnd, annualPriceVnd }
}
