import { describe, it, expect } from 'vitest'
import { shouldShowLoadErrorCard } from './dashboard-content-state'
import type { DashboardDataResult } from '@/app/(parent)/dashboard/actions'
import type { GradeBand } from '@prisma/client'

const ERROR_RESULT: DashboardDataResult = { error: { code: 'INTERNAL', message: 'boom' } }
const DATA_RESULT: DashboardDataResult = {
  data: {
    weeklyActivity: { days: [false, false, false, false, false, false, false], weeklySessionCount: 0, streak: 0, hasAnyCompletedSession: false },
    skillBreakdown: [],
    gradeProgress: null,
    gradeBand: 'GRADE_1' as GradeBand,
    sessionHistory: [],
    childName: 'Khôi',
    showUpsellBanner: false,
  },
}

describe('shouldShowLoadErrorCard', () => {
  it('is true for an error result — the error card must render instead of the dashboard', () => {
    expect(shouldShowLoadErrorCard(ERROR_RESULT)).toBe(true)
  })

  it('is false for a data result — the normal dashboard content renders, no error card', () => {
    expect(shouldShowLoadErrorCard(DATA_RESULT)).toBe(false)
  })

  it('flips from true to false when a retry resolves with data, replacing the error card with dashboard content', () => {
    let current: DashboardDataResult = ERROR_RESULT
    expect(shouldShowLoadErrorCard(current)).toBe(true)

    current = DATA_RESULT
    expect(shouldShowLoadErrorCard(current)).toBe(false)
  })
})
