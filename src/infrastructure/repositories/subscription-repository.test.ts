import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { subscription: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() } },
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
  createPendingSubscription,
  getParentEmailByOrderCode,
  getSubscriptionSummary,
} from './subscription-repository'

const findUnique = db.subscription.findUnique as unknown as ReturnType<typeof vi.fn>
const updateMany = db.subscription.updateMany as unknown as ReturnType<typeof vi.fn>
const create = db.subscription.create as unknown as ReturnType<typeof vi.fn>
const update = db.subscription.update as unknown as ReturnType<typeof vi.fn>
const allotment = getFreeTierDailyAllotment as unknown as ReturnType<typeof vi.fn>
const answeredToday = countQuestionsAnsweredToday as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  findUnique.mockReset()
  updateMany.mockReset()
  create.mockReset()
  update.mockReset()
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
      data: { status: 'ACTIVE', renewsAt, cancelledAt: null },
    })
  })

  it('returns false when no row matches (replay or unknown orderCode)', async () => {
    updateMany.mockResolvedValueOnce({ count: 0 })

    const result = await activateSubscriptionByOrderCode(BigInt(999), renewsAt)

    expect(result).toBe(false)
  })
})

describe('createPendingSubscription', () => {
  const orderCode = BigInt(1753000000000456)

  it('creates a PENDING_PAYMENT row with the orderCode when no row exists', async () => {
    findUnique.mockResolvedValueOnce(null)

    const result = await createPendingSubscription('parent-1', orderCode)

    expect(result).toBe(true)
    expect(create).toHaveBeenCalledWith({
      data: { parentAccountId: 'parent-1', status: 'PENDING_PAYMENT', payosOrderCode: orderCode },
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('resets an EXPIRED row to PENDING_PAYMENT with the new orderCode', async () => {
    findUnique.mockResolvedValueOnce({ status: 'EXPIRED' })

    const result = await createPendingSubscription('parent-1', orderCode)

    expect(result).toBe(true)
    expect(update).toHaveBeenCalledWith({
      where: { parentAccountId: 'parent-1' },
      data: { status: 'PENDING_PAYMENT', payosOrderCode: orderCode },
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('returns false and mutates nothing when an ACTIVE subscription exists', async () => {
    findUnique.mockResolvedValueOnce({ status: 'ACTIVE' })

    const result = await createPendingSubscription('parent-1', orderCode)

    expect(result).toBe(false)
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})

describe('getParentEmailByOrderCode', () => {
  it('returns the nested parent email for a matching orderCode', async () => {
    findUnique.mockResolvedValueOnce({ parentAccount: { user: { email: 'parent@example.vn' } } })

    const result = await getParentEmailByOrderCode(BigInt(42))

    expect(result).toBe('parent@example.vn')
    expect(findUnique).toHaveBeenCalledWith({
      where: { payosOrderCode: BigInt(42) },
      select: { parentAccount: { select: { user: { select: { email: true } } } } },
    })
  })

  it('returns null when the orderCode matches no row', async () => {
    findUnique.mockResolvedValueOnce(null)

    const result = await getParentEmailByOrderCode(BigInt(42))

    expect(result).toBeNull()
  })
})

describe('getSubscriptionSummary', () => {
  it('returns the selected status and renewsAt fields', async () => {
    const renewsAt = new Date('2026-08-23T00:00:00Z')
    findUnique.mockResolvedValueOnce({ status: 'ACTIVE', renewsAt })

    const result = await getSubscriptionSummary('parent-1')

    expect(result).toEqual({ status: 'ACTIVE', renewsAt })
    expect(findUnique).toHaveBeenCalledWith({
      where: { parentAccountId: 'parent-1' },
      select: { status: true, renewsAt: true },
    })
  })

  it('returns null when the parent has no subscription row', async () => {
    findUnique.mockResolvedValueOnce(null)

    const result = await getSubscriptionSummary('parent-1')

    expect(result).toBeNull()
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
