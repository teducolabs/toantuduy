import { describe, expect, it } from 'vitest'
import { computeAnswerButtonState, type AnswerFeedback } from './answer-button-state'

const CHOICES = ['12', '15', '18', '21']

describe('computeAnswerButtonState', () => {
  it('returns default for every button when there is no feedback', () => {
    CHOICES.forEach((_choice, index) => {
      expect(computeAnswerButtonState(index, CHOICES, null)).toBe('default')
    })
  })

  it('marks the tapped button tapped-correct and fades all siblings on a correct answer', () => {
    const feedback: AnswerFeedback = { selectedChoice: '15', correctAnswer: '15', correct: true }
    expect(computeAnswerButtonState(1, CHOICES, feedback)).toBe('tapped-correct')
    expect(computeAnswerButtonState(0, CHOICES, feedback)).toBe('faded')
    expect(computeAnswerButtonState(2, CHOICES, feedback)).toBe('faded')
    expect(computeAnswerButtonState(3, CHOICES, feedback)).toBe('faded')
  })

  it('marks tapped button tapped-incorrect, reveals the correct sibling, fades the rest on an incorrect answer', () => {
    const feedback: AnswerFeedback = { selectedChoice: '12', correctAnswer: '18', correct: false }
    expect(computeAnswerButtonState(0, CHOICES, feedback)).toBe('tapped-incorrect')
    expect(computeAnswerButtonState(2, CHOICES, feedback)).toBe('revealed-correct')
    expect(computeAnswerButtonState(1, CHOICES, feedback)).toBe('faded')
    expect(computeAnswerButtonState(3, CHOICES, feedback)).toBe('faded')
  })

  it('resolves duplicate choice text by first match (documented data-quality edge)', () => {
    const dupes = ['12', '15', '15', '21']
    const feedback: AnswerFeedback = { selectedChoice: '15', correctAnswer: '21', correct: false }
    expect(computeAnswerButtonState(1, dupes, feedback)).toBe('tapped-incorrect')
    expect(computeAnswerButtonState(2, dupes, feedback)).toBe('faded')
    expect(computeAnswerButtonState(3, dupes, feedback)).toBe('revealed-correct')
  })

  it('fades all siblings when the correct answer is not among the choices (defensive)', () => {
    const feedback: AnswerFeedback = { selectedChoice: '12', correctAnswer: '99', correct: false }
    expect(computeAnswerButtonState(0, CHOICES, feedback)).toBe('tapped-incorrect')
    expect(computeAnswerButtonState(1, CHOICES, feedback)).toBe('faded')
    expect(computeAnswerButtonState(2, CHOICES, feedback)).toBe('faded')
    expect(computeAnswerButtonState(3, CHOICES, feedback)).toBe('faded')
  })
})
