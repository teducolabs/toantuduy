import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/app/(parent)/profiles/actions', () => ({
  requireParentAccountId: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/global-config-repository', () => ({
  getSubscriptionPlanPricing: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/subscription-repository', () => ({
  cancelSubscription: vi.fn(),
  createPendingSubscription: vi.fn(),
  getSubscriptionSummary: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('@/infrastructure/payment/payos', () => ({
  generateOrderCode: vi.fn(),
  initiatePayment: vi.fn(),
}))
// env.ts parses process.env at import time — mock it so tests need no real keys.
vi.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_URL: 'https://toantuduy.vn',
  },
}))

import { revalidatePath } from 'next/cache'
import { requireParentAccountId } from '@/app/(parent)/profiles/actions'
import { getSubscriptionPlanPricing } from '@/infrastructure/repositories/global-config-repository'
import {
  cancelSubscription,
  createPendingSubscription,
  getSubscriptionSummary,
} from '@/infrastructure/repositories/subscription-repository'
import { generateOrderCode, initiatePayment } from '@/infrastructure/payment/payos'
import {
  getSubscriptionPlansAction,
  subscribeAction,
  getSubscriptionSummaryAction,
  cancelSubscriptionAction,
} from './actions'

const requireParentAccountIdMock = requireParentAccountId as unknown as ReturnType<typeof vi.fn>
const cancelSubscriptionMock = cancelSubscription as unknown as ReturnType<typeof vi.fn>
const revalidatePathMock = revalidatePath as unknown as ReturnType<typeof vi.fn>
const getSubscriptionPlanPricingMock = getSubscriptionPlanPricing as unknown as ReturnType<typeof vi.fn>
const createPendingSubscriptionMock = createPendingSubscription as unknown as ReturnType<typeof vi.fn>
const getSubscriptionSummaryMock = getSubscriptionSummary as unknown as ReturnType<typeof vi.fn>
const generateOrderCodeMock = generateOrderCode as unknown as ReturnType<typeof vi.fn>
const initiatePaymentMock = initiatePayment as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  requireParentAccountIdMock.mockReset()
  cancelSubscriptionMock.mockReset()
  revalidatePathMock.mockReset()
  getSubscriptionPlanPricingMock.mockReset()
  createPendingSubscriptionMock.mockReset()
  getSubscriptionSummaryMock.mockReset()
  generateOrderCodeMock.mockReset()
  initiatePaymentMock.mockReset()
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

describe('subscribeAction', () => {
  it('returns the auth error and never touches the repository or PayOS when unauthorized', async () => {
    const error = { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }
    requireParentAccountIdMock.mockResolvedValueOnce(error)

    const result = await subscribeAction('MONTHLY')

    expect(result).toEqual(error)
    expect(getSubscriptionPlanPricingMock).not.toHaveBeenCalled()
    expect(createPendingSubscriptionMock).not.toHaveBeenCalled()
    expect(initiatePaymentMock).not.toHaveBeenCalled()
  })

  it('returns PLAN_NOT_AVAILABLE for ANNUAL when no annual price is configured, without calling PayOS', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    getSubscriptionPlanPricingMock.mockResolvedValueOnce({ monthlyPriceVnd: 79000, annualPriceVnd: null })

    const result = await subscribeAction('ANNUAL')

    expect(result).toMatchObject({ error: { code: 'PLAN_NOT_AVAILABLE' } })
    expect(createPendingSubscriptionMock).not.toHaveBeenCalled()
    expect(initiatePaymentMock).not.toHaveBeenCalled()
  })

  it('returns ALREADY_SUBSCRIBED and never calls PayOS when an ACTIVE subscription exists', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    getSubscriptionPlanPricingMock.mockResolvedValueOnce({ monthlyPriceVnd: 79000, annualPriceVnd: null })
    generateOrderCodeMock.mockReturnValueOnce(1753000000000123)
    createPendingSubscriptionMock.mockResolvedValueOnce(false)

    const result = await subscribeAction('MONTHLY')

    expect(result).toMatchObject({ error: { code: 'ALREADY_SUBSCRIBED' } })
    expect(initiatePaymentMock).not.toHaveBeenCalled()
  })

  it('creates the pending row before PayOS with the config price and returns the checkout URL', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    getSubscriptionPlanPricingMock.mockResolvedValueOnce({ monthlyPriceVnd: 79000, annualPriceVnd: null })
    generateOrderCodeMock.mockReturnValueOnce(1753000000000123)
    createPendingSubscriptionMock.mockResolvedValueOnce(true)
    initiatePaymentMock.mockResolvedValueOnce({ checkoutUrl: 'https://pay.payos.vn/web/abc' })

    const result = await subscribeAction('MONTHLY')

    expect(result).toEqual({ data: { checkoutUrl: 'https://pay.payos.vn/web/abc' } })
    expect(createPendingSubscriptionMock).toHaveBeenCalledWith('parent-1', BigInt(1753000000000123))
    expect(createPendingSubscriptionMock.mock.invocationCallOrder[0]).toBeLessThan(
      initiatePaymentMock.mock.invocationCallOrder[0],
    )
    const payload = initiatePaymentMock.mock.calls[0][0]
    expect(payload.orderCode).toBe(1753000000000123)
    expect(payload.amount).toBe(79000)
    expect(payload.description.length).toBeLessThanOrEqual(25)
    expect(payload.returnUrl).toBe('https://toantuduy.vn/subscription/result')
    expect(payload.cancelUrl).toBe('https://toantuduy.vn/subscription/result')
  })

  it('sends the config annual price when subscribing to a configured ANNUAL plan', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    getSubscriptionPlanPricingMock.mockResolvedValueOnce({ monthlyPriceVnd: 79000, annualPriceVnd: 790000 })
    generateOrderCodeMock.mockReturnValueOnce(1753000000000124)
    createPendingSubscriptionMock.mockResolvedValueOnce(true)
    initiatePaymentMock.mockResolvedValueOnce({ checkoutUrl: 'https://pay.payos.vn/web/def' })

    const result = await subscribeAction('ANNUAL')

    expect(result).toEqual({ data: { checkoutUrl: 'https://pay.payos.vn/web/def' } })
    const payload = initiatePaymentMock.mock.calls[0][0]
    expect(payload.amount).toBe(790000)
    expect(payload.description.length).toBeLessThanOrEqual(25)
  })

  it('returns PAYMENT_INIT_FAILED when initiatePayment throws', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    getSubscriptionPlanPricingMock.mockResolvedValueOnce({ monthlyPriceVnd: 79000, annualPriceVnd: null })
    generateOrderCodeMock.mockReturnValueOnce(1753000000000125)
    createPendingSubscriptionMock.mockResolvedValueOnce(true)
    initiatePaymentMock.mockRejectedValueOnce(new Error('PayOS down'))

    const result = await subscribeAction('MONTHLY')

    expect(result).toMatchObject({ error: { code: 'PAYMENT_INIT_FAILED' } })
  })
})

describe('getSubscriptionSummaryAction', () => {
  it('returns the auth error and never calls the repository when unauthorized', async () => {
    const error = { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }
    requireParentAccountIdMock.mockResolvedValueOnce(error)

    const result = await getSubscriptionSummaryAction()

    expect(result).toEqual(error)
    expect(getSubscriptionSummaryMock).not.toHaveBeenCalled()
  })

  it('serializes renewsAt to an ISO string on success', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    getSubscriptionSummaryMock.mockResolvedValueOnce({
      status: 'ACTIVE',
      renewsAt: new Date('2026-08-23T00:00:00Z'),
    })

    const result = await getSubscriptionSummaryAction()

    expect(result).toEqual({ data: { status: 'ACTIVE', renewsAt: '2026-08-23T00:00:00.000Z' } })
  })

  it('returns { data: null } when the parent has no subscription row', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    getSubscriptionSummaryMock.mockResolvedValueOnce(null)

    const result = await getSubscriptionSummaryAction()

    expect(result).toEqual({ data: null })
  })
})

describe('cancelSubscriptionAction', () => {
  it('returns the auth error and never calls the repository when unauthorized', async () => {
    const error = { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }
    requireParentAccountIdMock.mockResolvedValueOnce(error)

    const result = await cancelSubscriptionAction()

    expect(result).toEqual(error)
    expect(cancelSubscriptionMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('returns FORBIDDEN and skips revalidation when the parent has no ACTIVE subscription', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    cancelSubscriptionMock.mockResolvedValueOnce(false)

    const result = await cancelSubscriptionAction()

    expect(result).toMatchObject({ error: { code: 'FORBIDDEN' } })
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('cancels the session parent, revalidates account + dashboard, and returns cancelled: true', async () => {
    requireParentAccountIdMock.mockResolvedValueOnce({ parentAccountId: 'parent-1' })
    cancelSubscriptionMock.mockResolvedValueOnce(true)

    const result = await cancelSubscriptionAction()

    expect(result).toEqual({ data: { cancelled: true } })
    expect(cancelSubscriptionMock).toHaveBeenCalledWith('parent-1', expect.any(Date))
    expect(revalidatePathMock).toHaveBeenCalledWith('/account')
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard')
  })
})
