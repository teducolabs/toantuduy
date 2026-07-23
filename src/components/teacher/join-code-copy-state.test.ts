import { describe, it, expect } from 'vitest'
import { COPY_CONFIRMATION_MS, isCopyConfirmationActive, computeCopyButtonLabel } from './join-code-copy-state'

const LABELS = { copy: 'Sao chép', copied: 'Đã sao chép ✓' }

describe('isCopyConfirmationActive', () => {
  it('is inactive before any copy', () => {
    expect(isCopyConfirmationActive(null, 1000)).toBe(false)
  })

  it('is active immediately after a copy', () => {
    expect(isCopyConfirmationActive(1000, 1000)).toBe(true)
  })

  it('is still active just before the 2s window ends', () => {
    expect(isCopyConfirmationActive(1000, 1000 + COPY_CONFIRMATION_MS - 1)).toBe(true)
  })

  it('reverts at exactly 2 seconds', () => {
    expect(isCopyConfirmationActive(1000, 1000 + COPY_CONFIRMATION_MS)).toBe(false)
  })

  it('is inactive after the 2s window', () => {
    expect(isCopyConfirmationActive(1000, 1000 + COPY_CONFIRMATION_MS + 500)).toBe(false)
  })
})

describe('computeCopyButtonLabel', () => {
  it('shows the copy label before any copy', () => {
    expect(computeCopyButtonLabel(null, 1000, LABELS)).toBe(LABELS.copy)
  })

  it('shows the confirmation label within the 2s window', () => {
    expect(computeCopyButtonLabel(1000, 2000, LABELS)).toBe(LABELS.copied)
  })

  it('reverts to the copy label after the window', () => {
    expect(computeCopyButtonLabel(1000, 1000 + COPY_CONFIRMATION_MS, LABELS)).toBe(LABELS.copy)
  })
})
