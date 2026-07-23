import { describe, it, expect } from 'vitest'
import { generateJoinCode, JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH } from './join-code'

describe('generateJoinCode', () => {
  it('generates a 6-character code', () => {
    expect(generateJoinCode()).toHaveLength(JOIN_CODE_LENGTH)
  })

  it('only uses characters from the unambiguous uppercase alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode()
      for (const char of code) {
        expect(JOIN_CODE_ALPHABET).toContain(char)
      }
    }
  })

  it('never contains ambiguous characters (0, O, 1, I, L)', () => {
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[0O1IL]/)
    for (let i = 0; i < 200; i++) {
      expect(generateJoinCode()).not.toMatch(/[0O1IL]/)
    }
  })

  it('is uppercase', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateJoinCode()
      expect(code).toBe(code.toUpperCase())
    }
  })

  it('produces reasonable uniqueness across a batch', () => {
    const batch = new Set(Array.from({ length: 1000 }, () => generateJoinCode()))
    // 31^6 ≈ 887M combinations — a 1000-code batch should be near-collision-free.
    expect(batch.size).toBeGreaterThan(995)
  })
})
