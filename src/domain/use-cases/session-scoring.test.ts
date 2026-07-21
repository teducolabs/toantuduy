import { describe, it, expect } from 'vitest'
import { computePerSkillBreakdown } from './session-scoring'

describe('computePerSkillBreakdown', () => {
  it('groups answers by skillId across multiple skills', () => {
    const rows = computePerSkillBreakdown([
      { skillId: 'skill-a', answeredCorrectly: true },
      { skillId: 'skill-b', answeredCorrectly: false },
      { skillId: 'skill-a', answeredCorrectly: false },
      { skillId: 'skill-b', answeredCorrectly: true },
      { skillId: 'skill-a', answeredCorrectly: true },
    ])

    expect(rows).toEqual([
      { skillId: 'skill-a', correct: 2, total: 3 },
      { skillId: 'skill-b', correct: 1, total: 2 },
    ])
  })

  it('returns a single row for a single-skill session', () => {
    const rows = computePerSkillBreakdown([
      { skillId: 'pattern-recognition', answeredCorrectly: true },
      { skillId: 'pattern-recognition', answeredCorrectly: true },
      { skillId: 'pattern-recognition', answeredCorrectly: false },
    ])

    expect(rows).toEqual([{ skillId: 'pattern-recognition', correct: 2, total: 3 }])
  })

  it('excludes unanswered stub rows from both correct and total', () => {
    const rows = computePerSkillBreakdown([
      { skillId: 'skill-a', answeredCorrectly: true },
      { skillId: 'skill-a', answeredCorrectly: null },
      { skillId: 'skill-b', answeredCorrectly: null },
    ])

    expect(rows).toEqual([{ skillId: 'skill-a', correct: 1, total: 1 }])
  })

  it('returns an empty array for empty input', () => {
    expect(computePerSkillBreakdown([])).toEqual([])
  })

  it('preserves first-encounter order of skills (no alphabetical resort)', () => {
    const rows = computePerSkillBreakdown([
      { skillId: 'zebra', answeredCorrectly: true },
      { skillId: 'apple', answeredCorrectly: true },
      { skillId: 'zebra', answeredCorrectly: false },
      { skillId: 'mango', answeredCorrectly: true },
    ])

    expect(rows.map((row) => row.skillId)).toEqual(['zebra', 'apple', 'mango'])
  })

  it('keeps a 0/n row for an all-incorrect skill', () => {
    const rows = computePerSkillBreakdown([
      { skillId: 'skill-a', answeredCorrectly: false },
      { skillId: 'skill-a', answeredCorrectly: false },
      { skillId: 'skill-b', answeredCorrectly: true },
    ])

    expect(rows).toEqual([
      { skillId: 'skill-a', correct: 0, total: 2 },
      { skillId: 'skill-b', correct: 1, total: 1 },
    ])
  })
})
