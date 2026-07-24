import { describe, it, expect } from 'vitest'
import { resolveSubscriptionResult } from './result-state'

describe('resolveSubscriptionResult', () => {
  it('returns success for a PAID, non-cancelled redirect with code 00', () => {
    const result = resolveSubscriptionResult({
      code: '00',
      id: 'link-1',
      cancel: 'false',
      status: 'PAID',
      orderCode: '803347',
    })

    expect(result).toBe('success')
  })

  it('returns failure when cancel is true, even with PAID status', () => {
    const result = resolveSubscriptionResult({ code: '00', cancel: 'true', status: 'PAID' })

    expect(result).toBe('failure')
  })

  it('returns failure for a CANCELLED status', () => {
    const result = resolveSubscriptionResult({ code: '00', cancel: 'false', status: 'CANCELLED' })

    expect(result).toBe('failure')
  })

  it('returns failure when code is not 00', () => {
    const result = resolveSubscriptionResult({ code: '01', cancel: 'false', status: 'PAID' })

    expect(result).toBe('failure')
  })

  it('returns failure for empty params', () => {
    expect(resolveSubscriptionResult({})).toBe('failure')
  })

  it('returns failure when params arrive as arrays (crafted query string)', () => {
    const result = resolveSubscriptionResult({
      code: ['00'],
      cancel: ['false'],
      status: ['PAID'],
    })

    expect(result).toBe('failure')
  })
})
