import { describe, it, expect } from 'vitest'
import { computeVnDayBoundaryUtc, formatVnDateLabel } from './session-repository'

describe('computeVnDayBoundaryUtc', () => {
  it('computes VN midnight boundaries for a time well within the VN day', () => {
    // 2026-07-18T10:00:00Z = 2026-07-18T17:00:00+07:00 (still 2026-07-18 in VN)
    const now = new Date('2026-07-18T10:00:00.000Z')
    const { todayStartUtc, todayEndUtc } = computeVnDayBoundaryUtc(now)
    expect(todayStartUtc.toISOString()).toBe('2026-07-17T17:00:00.000Z')
    expect(todayEndUtc.toISOString()).toBe('2026-07-18T17:00:00.000Z')
  })

  it('handles the instant exactly at VN midnight (start of the boundary)', () => {
    const now = new Date('2026-07-18T17:00:00.000Z')
    const { todayStartUtc, todayEndUtc } = computeVnDayBoundaryUtc(now)
    expect(todayStartUtc.toISOString()).toBe('2026-07-18T17:00:00.000Z')
    expect(todayEndUtc.toISOString()).toBe('2026-07-19T17:00:00.000Z')
  })

  it('handles an instant just before VN midnight — still the previous VN day', () => {
    // 2026-07-18T16:59:59.999Z = 2026-07-18T23:59:59.999+07:00 (still 2026-07-18 in VN)
    const now = new Date('2026-07-18T16:59:59.999Z')
    const { todayStartUtc, todayEndUtc } = computeVnDayBoundaryUtc(now)
    expect(todayStartUtc.toISOString()).toBe('2026-07-17T17:00:00.000Z')
    expect(todayEndUtc.toISOString()).toBe('2026-07-18T17:00:00.000Z')
  })

  it('handles a UTC month/year rollover correctly (VN day crosses into a new UTC month)', () => {
    // 2026-01-31T20:00:00Z = 2026-02-01T03:00:00+07:00 (VN day is Feb 1)
    const now = new Date('2026-01-31T20:00:00.000Z')
    const { todayStartUtc, todayEndUtc } = computeVnDayBoundaryUtc(now)
    expect(todayStartUtc.toISOString()).toBe('2026-01-31T17:00:00.000Z')
    expect(todayEndUtc.toISOString()).toBe('2026-02-01T17:00:00.000Z')
  })
})

describe('formatVnDateLabel', () => {
  it('formats a UTC instant as a VN dd/MM/yyyy date label', () => {
    expect(formatVnDateLabel(new Date('2026-07-19T17:00:00.000Z'))).toBe('20/07/2026')
  })

  it('formats an instant exactly at VN midnight as that VN calendar day', () => {
    expect(formatVnDateLabel(new Date('2026-01-01T00:00:00.000Z'))).toBe('01/01/2026')
  })
})
