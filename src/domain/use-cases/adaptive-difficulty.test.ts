import { describe, it, expect, vi } from 'vitest'
import { selectNextQuestion } from './adaptive-difficulty'
import type { Question } from '../entities/question'
import type { SkillAccuracyWindow } from '../entities/skill-accuracy-window'

const GRADE = 'GRADE_1' as const

// Deterministic PRNG (mulberry32) so trial-based assertions never flake on
// real Math.random() sampling.
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeQuestion(overrides: Partial<Question> & Pick<Question, 'id' | 'skillId' | 'difficultyLevel'>): Question {
  return {
    prompt: 'prompt',
    imageUrl: null,
    choices: ['a', 'b'],
    correctAnswer: 'a',
    gradeBand: GRADE,
    ...overrides,
  }
}

function history(skillId: string, answers: boolean[]): SkillAccuracyWindow {
  return { skillId, answers }
}

describe('selectNextQuestion', () => {
  it('defaults to Difficulty Level 2 when a Skill has no history', () => {
    const questions = [
      makeQuestion({ id: 'q1', skillId: 'skill-a', difficultyLevel: 2 }),
      makeQuestion({ id: 'q2', skillId: 'skill-a', difficultyLevel: 4 }),
    ]

    for (let i = 0; i < 50; i++) {
      const picked = selectNextQuestion([], questions)
      expect(picked.difficultyLevel).toBe(2)
    }
  })

  it('prefers a higher Difficulty Level when accuracy is high (>0.80)', () => {
    const highAccuracyHistory = [history('skill-a', [true, true, true, true, true, true, true, true, true, false])]
    const questions = [
      makeQuestion({ id: 'q-low', skillId: 'skill-a', difficultyLevel: 2 }),
      makeQuestion({ id: 'q-high', skillId: 'skill-a', difficultyLevel: 3 }),
    ]

    for (let i = 0; i < 50; i++) {
      const picked = selectNextQuestion(highAccuracyHistory, questions)
      expect(picked.difficultyLevel).toBe(3)
    }
  })

  it('prefers a lower Difficulty Level when accuracy is low (<0.50)', () => {
    const lowAccuracyHistory = [history('skill-a', [true, false, false, false, false, false, false, false, false, false])]
    const questions = [
      makeQuestion({ id: 'q-low', skillId: 'skill-a', difficultyLevel: 1 }),
      makeQuestion({ id: 'q-high', skillId: 'skill-a', difficultyLevel: 2 }),
    ]

    for (let i = 0; i < 50; i++) {
      const picked = selectNextQuestion(lowAccuracyHistory, questions)
      expect(picked.difficultyLevel).toBe(1)
    }
  })

  it('does NOT trigger the up-shift at exactly 0.80 accuracy', () => {
    const exactUpBoundary = [history('skill-a', [true, true, true, true, true, true, true, true, false, false])]
    const questions = [
      makeQuestion({ id: 'q-default', skillId: 'skill-a', difficultyLevel: 2 }),
      makeQuestion({ id: 'q-up', skillId: 'skill-a', difficultyLevel: 3 }),
    ]

    for (let i = 0; i < 50; i++) {
      const picked = selectNextQuestion(exactUpBoundary, questions)
      expect(picked.difficultyLevel).toBe(2)
    }
  })

  it('does NOT trigger the down-shift at exactly 0.50 accuracy', () => {
    const exactDownBoundary = [history('skill-a', [true, false, true, false, true, false, true, false, true, false])]
    const questions = [
      makeQuestion({ id: 'q-default', skillId: 'skill-a', difficultyLevel: 2 }),
      makeQuestion({ id: 'q-down', skillId: 'skill-a', difficultyLevel: 1 }),
    ]

    for (let i = 0; i < 50; i++) {
      const picked = selectNextQuestion(exactDownBoundary, questions)
      expect(picked.difficultyLevel).toBe(2)
    }
  })

  it('selects across mixed Skills at different accuracy tiers', () => {
    const mixed = [
      history('skill-weak', [false, false, false, false, false, false, false, false, false, true]),
      history('skill-strong', [true, true, true, true, true, true, true, true, true, false]),
    ]
    const questions = [
      makeQuestion({ id: 'q-weak', skillId: 'skill-weak', difficultyLevel: 1 }),
      makeQuestion({ id: 'q-strong', skillId: 'skill-strong', difficultyLevel: 3 }),
    ]

    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      seen.add(selectNextQuestion(mixed, questions).id)
    }
    expect(seen.has('q-weak')).toBe(true)
    expect(seen.has('q-strong')).toBe(true)
  })

  it('never returns a Question outside the Grade Band of availableQuestions', () => {
    const questions = [
      makeQuestion({ id: 'q1', skillId: 'skill-a', difficultyLevel: 2, gradeBand: 'GRADE_2' }),
      makeQuestion({ id: 'q2', skillId: 'skill-a', difficultyLevel: 2, gradeBand: 'GRADE_2' }),
    ]

    for (let i = 0; i < 20; i++) {
      const picked = selectNextQuestion([], questions)
      expect(picked.gradeBand).toBe('GRADE_2')
    }
  })

  it('rejects availableQuestions spanning multiple Grade Bands as a caller invariant violation', () => {
    const questions = [
      makeQuestion({ id: 'q1', skillId: 'skill-a', difficultyLevel: 2, gradeBand: 'GRADE_1' }),
      makeQuestion({ id: 'q2', skillId: 'skill-a', difficultyLevel: 2, gradeBand: 'GRADE_2' }),
    ]

    expect(() => selectNextQuestion([], questions)).toThrow()
  })

  it('weights a weak Skill (<50% accuracy) to receive proportionally more picks over a 5-question window than a strong Skill (>80%)', () => {
    const mixed = [
      history('skill-weak', [false, false, false, false, false, false, false, false, false, true]),
      history('skill-strong', [true, true, true, true, true, true, true, true, true, false]),
    ]
    const questions = [
      makeQuestion({ id: 'q-weak', skillId: 'skill-weak', difficultyLevel: 1 }),
      makeQuestion({ id: 'q-strong', skillId: 'skill-strong', difficultyLevel: 3 }),
    ]

    // Seeded RNG: this trial-based assertion is deterministic, not a flaky
    // sample of real Math.random().
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(seededRandom(42))
    try {
      let weakCount = 0
      let strongCount = 0
      const trials = 400
      for (let i = 0; i < trials; i++) {
        const picked = selectNextQuestion(mixed, questions)
        if (picked.id === 'q-weak') weakCount++
        if (picked.id === 'q-strong') strongCount++
      }

      expect(weakCount).toBeGreaterThan(strongCount)
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('handles a partial (< WINDOW_SIZE) answer window without over-reacting to a tiny sample', () => {
    // A single answer swings observed accuracy to 0% or 100%; the sliding
    // window intentionally has no minimum-sample-size gate (per AD-11), so
    // this documents the current behavior explicitly.
    const oneWrongAnswer = [history('skill-a', [false])]
    const oneRightAnswer = [history('skill-a', [true])]
    const questions = [
      makeQuestion({ id: 'q-down', skillId: 'skill-a', difficultyLevel: 1 }),
      makeQuestion({ id: 'q-default', skillId: 'skill-a', difficultyLevel: 2 }),
      makeQuestion({ id: 'q-up', skillId: 'skill-a', difficultyLevel: 3 }),
    ]

    expect(selectNextQuestion(oneWrongAnswer, questions).difficultyLevel).toBe(1)
    expect(selectNextQuestion(oneRightAnswer, questions).difficultyLevel).toBe(3)
  })

  it('throws when skillAccuracyHistory has duplicate entries for the same skillId', () => {
    const duplicated = [history('skill-a', [true]), history('skill-a', [false])]
    const questions = [makeQuestion({ id: 'q1', skillId: 'skill-a', difficultyLevel: 2 })]

    expect(() => selectNextQuestion(duplicated, questions)).toThrow()
  })

  it('falls back to a random pick across all available Questions when no Question matches the target Skill/Difficulty-Level', () => {
    const highAccuracyHistory = [history('skill-a', [true, true, true, true, true, true, true, true, true, true])]
    // Target level for skill-a will be 3, but only level 5 exists.
    const questions = [makeQuestion({ id: 'q-only', skillId: 'skill-a', difficultyLevel: 5 })]

    const picked = selectNextQuestion(highAccuracyHistory, questions)
    expect(picked.id).toBe('q-only')
  })

  it('throws when availableQuestions is empty', () => {
    expect(() => selectNextQuestion([], [])).toThrow('selectNextQuestion: no available questions')
  })
})
