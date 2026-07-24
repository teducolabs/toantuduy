import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { globalConfig: { findUnique: vi.fn() } },
}))

import { db } from '@/lib/db'
import {
  getFreeTierDailyAllotment,
  getSessionQuestionCount,
  getSubscriptionPlanPricing,
} from './global-config-repository'

const findUnique = db.globalConfig.findUnique as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  findUnique.mockReset()
})

function mockConfigRows(rows: Record<string, string | undefined>) {
  findUnique.mockImplementation(({ where: { key } }: { where: { key: string } }) => {
    const value = rows[key]
    return Promise.resolve(value === undefined ? null : { key, value })
  })
}

describe('getSubscriptionPlanPricing', () => {
  it('falls back to 79000 for monthly when the row is missing', async () => {
    mockConfigRows({})

    const pricing = await getSubscriptionPlanPricing()

    expect(pricing.monthlyPriceVnd).toBe(79000)
  })

  it('parses a configured monthly value', async () => {
    mockConfigRows({ SUBSCRIPTION_MONTHLY_PRICE_VND: '99000' })

    const pricing = await getSubscriptionPlanPricing()

    expect(pricing.monthlyPriceVnd).toBe(99000)
  })

  it('returns null for annual when the row is missing', async () => {
    mockConfigRows({})

    const pricing = await getSubscriptionPlanPricing()

    expect(pricing.annualPriceVnd).toBeNull()
  })

  it('returns null for annual when the value is not numeric', async () => {
    mockConfigRows({ SUBSCRIPTION_ANNUAL_PRICE_VND: 'not-a-number' })

    const pricing = await getSubscriptionPlanPricing()

    expect(pricing.annualPriceVnd).toBeNull()
  })

  it('returns the configured annual value', async () => {
    mockConfigRows({ SUBSCRIPTION_ANNUAL_PRICE_VND: '790000' })

    const pricing = await getSubscriptionPlanPricing()

    expect(pricing.annualPriceVnd).toBe(790000)
  })
})

describe('getFreeTierDailyAllotment', () => {
  it('falls back to 5 when the row is missing', async () => {
    mockConfigRows({})

    expect(await getFreeTierDailyAllotment()).toBe(5)
  })

  it('parses a configured value', async () => {
    mockConfigRows({ FREE_TIER_DAILY_ALLOTMENT: '8' })

    expect(await getFreeTierDailyAllotment()).toBe(8)
  })
})

describe('getSessionQuestionCount', () => {
  it('falls back to 10 when the row is missing', async () => {
    mockConfigRows({})

    expect(await getSessionQuestionCount()).toBe(10)
  })

  it('parses a configured value', async () => {
    mockConfigRows({ SESSION_QUESTION_COUNT: '15' })

    expect(await getSessionQuestionCount()).toBe(15)
  })
})
