import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/app/(parent)/profiles/actions', () => ({
  requireParentAccountId: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/child-profile-repository', () => ({
  findChildProfileByIdForParent: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/subscription-repository', () => ({
  isAllotmentExhausted: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/dashboard-repository', () => ({
  getWeeklyActivity: vi.fn(),
  getCurrentStreak: vi.fn(),
  getSkillBreakdown: vi.fn(),
  getGradeProgress: vi.fn(),
  getSessionHistory: vi.fn(),
}))

import { requireParentAccountId } from '@/app/(parent)/profiles/actions'
import { findChildProfileByIdForParent } from '@/infrastructure/repositories/child-profile-repository'
import { isAllotmentExhausted } from '@/infrastructure/repositories/subscription-repository'
import {
  getWeeklyActivity,
  getCurrentStreak,
  getSkillBreakdown,
  getGradeProgress,
  getSessionHistory,
} from '@/infrastructure/repositories/dashboard-repository'
import { getDashboardDataAction } from './actions'

const requireParentAccountIdMock = requireParentAccountId as unknown as ReturnType<typeof vi.fn>
const findChildProfileByIdForParentMock = findChildProfileByIdForParent as unknown as ReturnType<typeof vi.fn>
const isAllotmentExhaustedMock = isAllotmentExhausted as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  requireParentAccountIdMock.mockReset()
  findChildProfileByIdForParentMock.mockReset()
  isAllotmentExhaustedMock.mockReset()
  ;(getWeeklyActivity as unknown as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue({
    days: [false, false, false, false, false, false, false],
    weeklySessionCount: 0,
    hasAnyCompletedSession: false,
  })
  ;(getCurrentStreak as unknown as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue({ currentStreak: 0 })
  ;(getSkillBreakdown as unknown as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue([])
  ;(getGradeProgress as unknown as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue(null)
  ;(getSessionHistory as unknown as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue([])

  requireParentAccountIdMock.mockResolvedValue({ parentAccountId: 'parent-1' })
  findChildProfileByIdForParentMock.mockResolvedValue({
    id: 'child-1',
    name: 'Khôi',
    gradeBand: 'GRADE_1',
  })
})

describe('getDashboardDataAction', () => {
  it('returns showUpsellBanner: true and the child name when the allotment is exhausted', async () => {
    isAllotmentExhaustedMock.mockResolvedValueOnce(true)

    const result = await getDashboardDataAction('child-1')

    expect('error' in result).toBe(false)
    if ('data' in result) {
      expect(result.data.showUpsellBanner).toBe(true)
      expect(result.data.childName).toBe('Khôi')
    }
  })

  it('returns showUpsellBanner: false when subscribed or under the allotment', async () => {
    isAllotmentExhaustedMock.mockResolvedValueOnce(false)

    const result = await getDashboardDataAction('child-1')

    expect('error' in result).toBe(false)
    if ('data' in result) {
      expect(result.data.showUpsellBanner).toBe(false)
    }
  })

  it('checks isAllotmentExhausted with the resolved child and parent account ids', async () => {
    isAllotmentExhaustedMock.mockResolvedValueOnce(false)

    await getDashboardDataAction('child-1')

    expect(isAllotmentExhaustedMock).toHaveBeenCalledWith('child-1', 'parent-1')
  })

  it('returns the full first-week (zero completed Sessions) response shape combined across all four dashboard sections', async () => {
    // Story 4.1-4.3 each guarantee their own empty state in isolation; this
    // asserts all four hold together on a single getDashboardDataAction load (AC #2).
    isAllotmentExhaustedMock.mockResolvedValueOnce(false)

    const result = await getDashboardDataAction('child-1')

    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.data.weeklyActivity.hasAnyCompletedSession).toBe(false)
      expect(result.data.gradeProgress).toBeNull()
      expect(result.data.sessionHistory).toEqual([])
      expect(result.data.skillBreakdown).toEqual([])
    }
  })
})
