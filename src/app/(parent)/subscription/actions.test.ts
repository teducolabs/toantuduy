import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/app/(parent)/profiles/actions', () => ({
  requireParentAccountId: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/global-config-repository', () => ({
  getSubscriptionPlanPricing: vi.fn(),
}))

import { requireParentAccountId } from '@/app/(parent)/profiles/actions'
import { getSubscriptionPlanPricing } from '@/infrastructure/repositories/global-config-repository'
import { getSubscriptionPlansAction } from './actions'

const requireParentAccountIdMock = requireParentAccountId as unknown as ReturnType<typeof vi.fn>
const getSubscriptionPlanPricingMock = getSubscriptionPlanPricing as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  requireParentAccountIdMock.mockReset()
  getSubscriptionPlanPricingMock.mockReset()
})

describe('getSubscriptionPlansAction', () => {
  it('returns the auth error and never calls the repository when unauthorized', async () => {
    const error = { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }
    requireParentAccountIdMock.mockResolvedValueOnce(error)

    const result = await getSubscriptionPlansAction()

    expect(result).toEqual(error)
    expect(getSubscriptionPlanPricingMock).not.toHaveBeenCalled()
  })

  it('passes the repository pricing through as data on success', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    getSubscriptionPlanPricingMock.mockResolvedValueOnce({ monthlyPriceVnd: 79000, annualPriceVnd: null })

    const result = await getSubscriptionPlansAction()

    expect(result).toEqual({ data: { monthlyPriceVnd: 79000, annualPriceVnd: null } })
  })

  it('passes a configured annual price through unchanged', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    getSubscriptionPlanPricingMock.mockResolvedValueOnce({ monthlyPriceVnd: 79000, annualPriceVnd: 790000 })

    const result = await getSubscriptionPlansAction()

    expect(result).toEqual({ data: { monthlyPriceVnd: 79000, annualPriceVnd: 790000 } })
  })
})
