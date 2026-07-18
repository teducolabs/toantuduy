import { describe, it, expect } from 'vitest'
import { buildSessionQuestionIds } from './session-question-selection'
import type { Question } from '@/domain/entities/question'

const GRADE = 'GRADE_1' as const

function makeQuestion(id: string): Question {
  return {
    id,
    prompt: 'prompt',
    imageUrl: null,
    choices: ['a', 'b'],
    correctAnswer: 'a',
    skillId: 'skill-a',
    gradeBand: GRADE,
    difficultyLevel: 2,
  }
}

describe('buildSessionQuestionIds', () => {
  it('never repeats a Question within one Session — removes each pick from the pool passed to the next call', () => {
    const pool = [makeQuestion('q1'), makeQuestion('q2'), makeQuestion('q3')]
    const seenPools: Question[][] = []
    const pickFirst = (_history: unknown[], availableQuestions: Question[]) => {
      seenPools.push(availableQuestions)
      return availableQuestions[0]
    }

    const ids = buildSessionQuestionIds(pool, [], 3, pickFirst)

    expect(ids).toEqual(['q1', 'q2', 'q3'])
    expect(seenPools.map((p) => p.length)).toEqual([3, 2, 1])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('stops without throwing when the pool is exhausted before reaching sessionQuestionCount', () => {
    const pool = [makeQuestion('q1'), makeQuestion('q2')]
    const pickFirst = (_history: unknown[], availableQuestions: Question[]) => availableQuestions[0]

    const ids = buildSessionQuestionIds(pool, [], 10, pickFirst)

    expect(ids).toEqual(['q1', 'q2'])
  })

  it('never calls pickNext when the pool starts empty (a Grade Band with zero eligible Questions)', () => {
    let callCount = 0
    const pickNext = (_history: unknown[], availableQuestions: Question[]) => {
      callCount++
      return availableQuestions[0]
    }

    const ids = buildSessionQuestionIds([], [], 10, pickNext)

    expect(ids).toEqual([])
    expect(callCount).toBe(0)
  })

  it('requests exactly sessionQuestionCount Questions when the pool is large enough', () => {
    const pool = Array.from({ length: 20 }, (_, i) => makeQuestion(`q${i}`))
    const pickFirst = (_history: unknown[], availableQuestions: Question[]) => availableQuestions[0]

    const ids = buildSessionQuestionIds(pool, [], 10, pickFirst)

    expect(ids.length).toBe(10)
  })
})
