import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    question: { findMany: vi.fn(), count: vi.fn() },
    skill: { findMany: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { listQuestionsForLibrary, listSkills, countQuestionsInGradeBand } from './question-repository'

const questionFindMany = db.question.findMany as unknown as ReturnType<typeof vi.fn>
const questionCount = db.question.count as unknown as ReturnType<typeof vi.fn>
const skillFindMany = db.skill.findMany as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  questionFindMany.mockReset()
  questionCount.mockReset()
  skillFindMany.mockReset()
})

describe('listQuestionsForLibrary', () => {
  it('filters by gradeBand only when no skillId is given', async () => {
    questionFindMany.mockResolvedValueOnce([])

    await listQuestionsForLibrary({ gradeBand: 'GRADE_1' })

    const callArg = questionFindMany.mock.calls[0][0]
    expect(callArg.where).toEqual({ gradeBand: 'GRADE_1' })
    expect(callArg.orderBy).toEqual([{ skillId: 'asc' }, { difficultyLevel: 'asc' }])
  })

  it('adds the skillId filter when given', async () => {
    questionFindMany.mockResolvedValueOnce([])

    await listQuestionsForLibrary({ gradeBand: 'GRADE_2', skillId: 'skill-1' })

    expect(questionFindMany.mock.calls[0][0].where).toEqual({ gradeBand: 'GRADE_2', skillId: 'skill-1' })
  })

  it('returns lean items without correctAnswer or choices', async () => {
    questionFindMany.mockResolvedValueOnce([
      {
        id: 'q1',
        prompt: 'Hình nào tiếp theo?',
        imageUrl: null,
        choices: ['a', 'b'],
        correctAnswer: 'a',
        skillId: 'skill-1',
        gradeBand: 'GRADE_1',
        difficultyLevel: 3,
        skill: { id: 'skill-1', code: 'pattern-recognition', name: 'Nhận diện quy luật' },
      },
    ])

    const items = await listQuestionsForLibrary({ gradeBand: 'GRADE_1' })

    expect(items).toEqual([
      {
        id: 'q1',
        prompt: 'Hình nào tiếp theo?',
        skillCode: 'pattern-recognition',
        skillName: 'Nhận diện quy luật',
        difficultyLevel: 3,
      },
    ])
    expect(items[0]).not.toHaveProperty('correctAnswer')
    expect(items[0]).not.toHaveProperty('choices')
  })
})

describe('listSkills', () => {
  it('lists skills ordered by name with a lean select', async () => {
    skillFindMany.mockResolvedValueOnce([])

    await listSkills()

    expect(skillFindMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    })
  })
})

describe('countQuestionsInGradeBand', () => {
  it('counts only questions with the given ids AND grade band', async () => {
    questionCount.mockResolvedValueOnce(2)

    const count = await countQuestionsInGradeBand(['q1', 'q2'], 'GRADE_3')

    expect(count).toBe(2)
    expect(questionCount).toHaveBeenCalledWith({ where: { id: { in: ['q1', 'q2'] }, gradeBand: 'GRADE_3' } })
  })
})
