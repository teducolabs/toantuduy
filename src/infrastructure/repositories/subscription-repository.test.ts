import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { subscription: { findUnique: vi.fn(), updateMany: vi.fn() } },
}))
vi.mock('@/infrastructure/repositories/global-config-repository', () => ({
  getFreeTierDailyAllotment: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/session-repository', () => ({
  countQuestionsAnsweredToday: vi.fn(),
}))

import { db } from '@/lib/db'
import { getFreeTierDailyAllotment } from '@/infrastructure/repositories/global-config-repository'
import { countQuestionsAnsweredToday } from '@/infrastructure/repositories/session-repository'
import {
  isAllotmentExhausted,
  activateSubscriptionByOrderCode,
  expireDueSubscriptions,
} from './subscription-repository'

const findUnique = db.subscription.findUnique as unknown as ReturnType<typeof vi.fn>
const updateMany = db.subscription.updateMany as unknown as ReturnType<typeof vi.fn>
const allotment = getFreeTierDailyAllotment as unknown as ReturnType<typeof vi.fn>
const answeredToday = countQuestionsAnsweredToday as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  findUnique.mockReset()
  updateMany.mockReset()
  allotment.mockReset()
  answeredToday.mockReset()
})

describe('isAllotmentExhausted', () => {
  it('returns false when the parent account has an active subscription, regardless of usage', async () => {
    findUnique.mockResolvedValueOnce({ status: 'ACTIVE' })

    const result = await isAllotmentExhausted('child-1', 'parent-1')

    expect(result).toBe(false)
    expect(allotment).not.toHaveBeenCalled()
    expect(answeredToday).not.toHaveBeenCalled()
  })

  it('returns false when unsubscribed and under the daily allotment', async () => {
    findUnique.mockResolvedValueOnce(null)
    allotment.mockResolvedValueOnce(5)
    answeredToday.mockResolvedValueOnce(3)

    const result = await isAllotmentExhausted('child-1', 'parent-1')

    expect(result).toBe(false)
  })

  it('returns true when unsubscribed and at or over the daily allotment', async () => {
    findUnique.mockResolvedValueOnce(null)
    allotment.mockResolvedValueOnce(5)
    answeredToday.mockResolvedValueOnce(5)

    const result = await isAllotmentExhausted('child-1', 'parent-1')

    expect(result).toBe(true)
  })
})

describe('activateSubscriptionByOrderCode', () => {
  const renewsAt = new Date('2026-08-23T00:00:00Z')

  it('returns true when a PENDING_PAYMENT row transitions to ACTIVE', async () => {
    updateMany.mockResolvedValueOnce({ count: 1 })

    const result = await activateSubscriptionByOrderCode(BigInt(1753000000000123), renewsAt)

    expect(result).toBe(true)
    expect(updateMany).toHaveBeenCalledWith({
      where: { payosOrderCode: BigInt(1753000000000123), status: 'PENDING_PAYMENT' },
      data: { status: 'ACTIVE', renewsAt },
    })
  })

  it('returns false when no row matches (replay or unknown orderCode)', async () => {
    updateMany.mockResolvedValueOnce({ count: 0 })

    const result = await activateSubscriptionByOrderCode(BigInt(999), renewsAt)

    expect(result).toBe(false)
  })
})

describe('expireDueSubscriptions', () => {
  it('expires ACTIVE and CANCELLED subscriptions whose renewsAt has passed', async () => {
    updateMany.mockResolvedValueOnce({ count: 2 })
    const now = new Date('2026-07-24T17:00:00Z')

    const result = await expireDueSubscriptions(now)

    expect(result).toBe(2)
    expect(updateMany).toHaveBeenCalledWith({
      where: { status: { in: ['ACTIVE', 'CANCELLED'] }, renewsAt: { lte: now } },
      data: { status: 'EXPIRED' },
    })
  })
})
