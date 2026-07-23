import { describe, it, expect } from 'vitest'
import { shouldFireOfflineToast } from './dashboard-offline-toast-state'

describe('shouldFireOfflineToast', () => {
  it('fires on the online → offline transition', () => {
    expect(shouldFireOfflineToast(true, false)).toBe(true)
  })

  it('does not fire while remaining offline (no repeat toast without an intervening online event)', () => {
    expect(shouldFireOfflineToast(false, false)).toBe(false)
  })

  it('does not fire on the offline → online transition', () => {
    expect(shouldFireOfflineToast(false, true)).toBe(false)
  })

  it('does not fire while remaining online', () => {
    expect(shouldFireOfflineToast(true, true)).toBe(false)
  })

  it('fires again on a second disconnect after reconnecting', () => {
    // online -> offline (fires) -> online (no fire) -> offline (fires again)
    expect(shouldFireOfflineToast(true, false)).toBe(true)
    expect(shouldFireOfflineToast(false, true)).toBe(false)
    expect(shouldFireOfflineToast(true, false)).toBe(true)
  })
})
