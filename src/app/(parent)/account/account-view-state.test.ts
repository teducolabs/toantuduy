import { describe, it, expect } from 'vitest'
import { resolveAccountSubscriptionView } from './account-view-state'

const now = new Date('2026-07-24T12:00:00Z')
const future = '2026-08-01T00:00:00.000Z'
const past = '2026-07-01T00:00:00.000Z'

describe('resolveAccountSubscriptionView', () => {
  it("returns 'active' for an ACTIVE subscription", () => {
    expect(resolveAccountSubscriptionView({ status: 'ACTIVE', renewsAt: future }, now)).toBe('active')
  })

  it("returns 'cancelled' for CANCELLED with a future renewsAt (paid-through)", () => {
    expect(resolveAccountSubscriptionView({ status: 'CANCELLED', renewsAt: future }, now)).toBe('cancelled')
  })

  it("returns 'none' for CANCELLED with a past renewsAt (period over)", () => {
    expect(resolveAccountSubscriptionView({ status: 'CANCELLED', renewsAt: past }, now)).toBe('none')
  })

  it("returns 'cancelled' for PENDING_PAYMENT with a future renewsAt (abandoned reactivation)", () => {
    expect(resolveAccountSubscriptionView({ status: 'PENDING_PAYMENT', renewsAt: future }, now)).toBe('cancelled')
  })

  it("returns 'none' for a fresh PENDING_PAYMENT with null renewsAt (never paid)", () => {
    expect(resolveAccountSubscriptionView({ status: 'PENDING_PAYMENT', renewsAt: null }, now)).toBe('none')
  })

  it("returns 'none' for EXPIRED", () => {
    expect(resolveAccountSubscriptionView({ status: 'EXPIRED', renewsAt: past }, now)).toBe('none')
  })

  it("returns 'none' when there is no subscription row", () => {
    expect(resolveAccountSubscriptionView(null, now)).toBe('none')
  })
})
