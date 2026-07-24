import { describe, it, expect } from 'vitest'
import {
  canAdvanceFromStep1,
  toggleQuestionSelection,
  canSaveDraft,
  toggleClassSelection,
  canAssign,
  selectionCountLabel,
} from './assignment-builder-state'

describe('canAdvanceFromStep1', () => {
  it('rejects an empty title', () => {
    expect(canAdvanceFromStep1('')).toBe(false)
  })

  it('rejects a whitespace-only title', () => {
    expect(canAdvanceFromStep1('   ')).toBe(false)
  })

  it('accepts a non-empty title', () => {
    expect(canAdvanceFromStep1('Ôn tập tuần 3')).toBe(true)
  })
})

describe('toggleQuestionSelection', () => {
  it('adds an unselected question', () => {
    expect(toggleQuestionSelection(['q1'], 'q2', 10)).toEqual(['q1', 'q2'])
  })

  it('removes an already-selected question', () => {
    expect(toggleQuestionSelection(['q1', 'q2'], 'q1', 10)).toEqual(['q2'])
  })

  it('is a no-op when adding at the max cap', () => {
    const atCap = ['q1', 'q2', 'q3']
    expect(toggleQuestionSelection(atCap, 'q4', 3)).toEqual(atCap)
  })

  it('still allows removal when at the max cap', () => {
    expect(toggleQuestionSelection(['q1', 'q2', 'q3'], 'q2', 3)).toEqual(['q1', 'q3'])
  })

  it('does not mutate the input array', () => {
    const input = ['q1']
    toggleQuestionSelection(input, 'q2', 10)
    expect(input).toEqual(['q1'])
  })
})

describe('canSaveDraft', () => {
  it('requires at least one selected question', () => {
    expect(canSaveDraft(0)).toBe(false)
    expect(canSaveDraft(1)).toBe(true)
    expect(canSaveDraft(10)).toBe(true)
  })
})

describe('toggleClassSelection', () => {
  it('adds an unselected class', () => {
    expect(toggleClassSelection(['c1'], 'c2')).toEqual(['c1', 'c2'])
  })

  it('removes an already-selected class', () => {
    expect(toggleClassSelection(['c1', 'c2'], 'c1')).toEqual(['c2'])
  })

  it('has no cap — keeps adding classes', () => {
    expect(toggleClassSelection(['c1', 'c2', 'c3'], 'c4')).toEqual(['c1', 'c2', 'c3', 'c4'])
  })

  it('does not mutate the input array', () => {
    const input = ['c1']
    toggleClassSelection(input, 'c2')
    expect(input).toEqual(['c1'])
  })
})

describe('canAssign', () => {
  it('requires at least one selected class', () => {
    expect(canAssign(0)).toBe(false)
    expect(canAssign(1)).toBe(true)
    expect(canAssign(5)).toBe(true)
  })
})

describe('selectionCountLabel', () => {
  it('formats as "count / max câu"', () => {
    expect(selectionCountLabel(8, 10)).toBe('8 / 10 câu')
    expect(selectionCountLabel(0, 5)).toBe('0 / 5 câu')
  })
})
