import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { globalConfig: { findUnique: vi.fn(), upsert: vi.fn() } },
}))

import { db } from '@/lib/db'
import {
  getFreeTierDailyAllotment,
  getSessionQuestionCount,
  getSessionTimeLimitMinutes,
  getSubscriptionPlanPricing,
  setSessionQuestionCount,
  setSessionTimeLimitMinutes,
} from './global-config-repository'

const findUnique = db.globalConfig.findUnique as unknown as ReturnType<typeof vi.fn>
const upsert = db.globalConfig.upsert as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  findUnique.mockReset()
  upsert.mockReset()
  upsert.mockResolvedValue({})
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

describe('getSessionTimeLimitMinutes', () => {
  it('returns null when the row is missing', async () => {
    mockConfigRows({})

    expect(await getSessionTimeLimitMinutes()).toBeNull()
  })

  it("returns null for '0' (explicitly disabled — D1)", async () => {
    mockConfigRows({ SESSION_TIME_LIMIT_MINUTES: '0' })

    expect(await getSessionTimeLimitMinutes()).toBeNull()
  })

  it('returns null for a negative value', async () => {
    mockConfigRows({ SESSION_TIME_LIMIT_MINUTES: '-5' })

    expect(await getSessionTimeLimitMinutes()).toBeNull()
  })

  it('returns null when the value is not numeric', async () => {
    mockConfigRows({ SESSION_TIME_LIMIT_MINUTES: 'garbage' })

    expect(await getSessionTimeLimitMinutes()).toBeNull()
  })

  it('returns the configured positive value', async () => {
    mockConfigRows({ SESSION_TIME_LIMIT_MINUTES: '20' })

    expect(await getSessionTimeLimitMinutes()).toBe(20)
  })
})

describe('setSessionQuestionCount', () => {
  it('upserts the stringified count on the SESSION_QUESTION_COUNT key', async () => {
    await setSessionQuestionCount(15)

    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'SESSION_QUESTION_COUNT' },
      update: { value: '15' },
      create: { key: 'SESSION_QUESTION_COUNT', value: '15' },
    })
  })
})

describe('setSessionTimeLimitMinutes', () => {
  it('upserts the stringified minutes on the SESSION_TIME_LIMIT_MINUTES key', async () => {
    await setSessionTimeLimitMinutes(20)

    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'SESSION_TIME_LIMIT_MINUTES' },
      update: { value: '20' },
      create: { key: 'SESSION_TIME_LIMIT_MINUTES', value: '20' },
    })
  })

  it("upserts '0' when disabled (null — D1)", async () => {
    await setSessionTimeLimitMinutes(null)

    expect(upsert).toHaveBeenCalledWith({
      where: { key: 'SESSION_TIME_LIMIT_MINUTES' },
      update: { value: '0' },
      create: { key: 'SESSION_TIME_LIMIT_MINUTES', value: '0' },
    })
  })
})
