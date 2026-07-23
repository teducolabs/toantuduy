import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { subscription: { findUnique: vi.fn() } },
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
import { isAllotmentExhausted } from './subscription-repository'

const findUnique = db.subscription.findUnique as unknown as ReturnType<typeof vi.fn>
const allotment = getFreeTierDailyAllotment as unknown as ReturnType<typeof vi.fn>
const answeredToday = countQuestionsAnsweredToday as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  findUnique.mockReset()
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
