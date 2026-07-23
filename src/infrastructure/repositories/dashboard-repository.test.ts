import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    session: { findMany: vi.fn() },
    skill: { findMany: vi.fn() },
    sessionAnswer: { findMany: vi.fn(), aggregate: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import {
  getWeeklyActivity,
  getCurrentStreak,
  getSkillBreakdown,
  getSkillSessionDetail,
  getGradeProgress,
  getSessionHistory,
} from './dashboard-repository'

const findMany = db.session.findMany as unknown as ReturnType<typeof vi.fn>
const skillFindMany = db.skill.findMany as unknown as ReturnType<typeof vi.fn>
const answerFindMany = db.sessionAnswer.findMany as unknown as ReturnType<typeof vi.fn>
const answerAggregate = db.sessionAnswer.aggregate as unknown as ReturnType<typeof vi.fn>

function row(iso: string) {
  return { completedAt: new Date(iso) }
}

const SKILLS = [
  { id: 'skill-1', code: 'pattern-recognition', name: 'Nhận diện quy luật' },
  { id: 'skill-2', code: 'spatial-reasoning', name: 'Suy luận không gian' },
  { id: 'skill-3', code: 'classification', name: 'Phân loại' },
  { id: 'skill-4', code: 'word-problem', name: 'Đọc hiểu bài toán' },
]

beforeEach(() => {
  findMany.mockReset()
  skillFindMany.mockReset()
  answerFindMany.mockReset()
  answerAggregate.mockReset()
})

describe('getWeeklyActivity', () => {
  it('buckets Sessions at the Monday/Sunday week boundaries into the correct day', async () => {
    // now = 2026-07-15T10:00:00Z -> VN Wed 2026-07-15 (week Mon 07-13 .. Sun 07-19)
    const now = new Date('2026-07-15T10:00:00.000Z')
    findMany.mockResolvedValueOnce([row('2026-07-13T10:00:00.000Z'), row('2026-07-19T10:00:00.000Z')])

    const result = await getWeeklyActivity('child-1', now)

    expect(result.days).toEqual([true, false, false, false, false, false, true])
    expect(result.weeklySessionCount).toBe(2)
  })

  it('assigns a Session at the exact VN midnight instant to the new day, not the previous one', async () => {
    // now = 2026-07-15T10:00:00Z -> VN Wed 2026-07-15
    const now = new Date('2026-07-15T10:00:00.000Z')
    // VN midnight starting 2026-07-16 (Thursday) is 2026-07-15T17:00:00Z
    findMany.mockResolvedValueOnce([row('2026-07-15T17:00:00.000Z')])

    const result = await getWeeklyActivity('child-1', now)

    expect(result.days).toEqual([false, false, false, true, false, false, false])
    expect(result.weeklySessionCount).toBe(1)
  })

  it('returns all-empty days when there are no Sessions this week', async () => {
    const now = new Date('2026-07-15T10:00:00.000Z')
    findMany.mockResolvedValueOnce([])

    const result = await getWeeklyActivity('child-1', now)

    expect(result.days).toEqual([false, false, false, false, false, false, false])
    expect(result.weeklySessionCount).toBe(0)
  })
})

describe('getCurrentStreak', () => {
  it('returns streak 0 and hasAnyCompletedSession false when there are no completed Sessions', async () => {
    findMany.mockResolvedValueOnce([])

    const result = await getCurrentStreak('child-1', new Date('2026-07-22T10:00:00.000Z'))

    expect(result).toEqual({ streak: 0, hasAnyCompletedSession: false })
  })

  it('counts a streak of 1 when only today has a completed Session', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z') // VN Wed 2026-07-22
    findMany.mockResolvedValueOnce([row('2026-07-22T10:00:00.000Z')])

    const result = await getCurrentStreak('child-1', now)

    expect(result).toEqual({ streak: 1, hasAnyCompletedSession: true })
  })

  it('counts a consecutive-day streak of N ending today', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z') // VN Wed 2026-07-22
    findMany.mockResolvedValueOnce([
      row('2026-07-20T10:00:00.000Z'),
      row('2026-07-21T10:00:00.000Z'),
      row('2026-07-22T10:00:00.000Z'),
    ])

    const result = await getCurrentStreak('child-1', now)

    expect(result).toEqual({ streak: 3, hasAnyCompletedSession: true })
  })

  it('stops the streak count at a gap day', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z') // VN Wed 2026-07-22
    findMany.mockResolvedValueOnce([row('2026-07-20T10:00:00.000Z'), row('2026-07-22T10:00:00.000Z')])

    const result = await getCurrentStreak('child-1', now)

    expect(result).toEqual({ streak: 1, hasAnyCompletedSession: true })
  })

  it('keeps the streak alive through today when yesterday had a Session but today has not happened yet', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z') // VN Wed 2026-07-22, no Session yet today
    findMany.mockResolvedValueOnce([row('2026-07-21T10:00:00.000Z')])

    const result = await getCurrentStreak('child-1', now)

    expect(result).toEqual({ streak: 1, hasAnyCompletedSession: true })
  })

  it('resets to 0 when neither today nor yesterday has a completed Session, but reports hasAnyCompletedSession true', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z') // VN Wed 2026-07-22
    findMany.mockResolvedValueOnce([row('2026-07-19T10:00:00.000Z')])

    const result = await getCurrentStreak('child-1', now)

    expect(result).toEqual({ streak: 0, hasAnyCompletedSession: true })
  })
})

function answer(skillId: string, correct: boolean) {
  return { answeredCorrectly: correct, question: { skillId } }
}

describe('getSkillBreakdown', () => {
  it('marks a Skill with 0 attempts as insufficient', async () => {
    skillFindMany.mockResolvedValueOnce(SKILLS)
    answerFindMany.mockResolvedValueOnce([])

    const result = await getSkillBreakdown('child-1')

    expect(result).toEqual(SKILLS.map((s) => ({ skillId: s.id, code: s.code, name: s.name, attempts: 0, correct: 0, status: 'insufficient' })))
  })

  it('marks exactly 4 attempts as insufficient (boundary)', async () => {
    skillFindMany.mockResolvedValueOnce(SKILLS)
    answerFindMany.mockResolvedValueOnce([
      answer('skill-1', true),
      answer('skill-1', true),
      answer('skill-1', true),
      answer('skill-1', false),
    ])

    const result = await getSkillBreakdown('child-1')

    expect(result.find((r) => r.skillId === 'skill-1')).toEqual({
      skillId: 'skill-1',
      code: 'pattern-recognition',
      name: 'Nhận diện quy luật',
      attempts: 4,
      correct: 3,
      status: 'insufficient',
    })
  })

  it('crosses out of insufficient at exactly 5 attempts (boundary)', async () => {
    skillFindMany.mockResolvedValueOnce(SKILLS)
    answerFindMany.mockResolvedValueOnce([
      answer('skill-1', true),
      answer('skill-1', true),
      answer('skill-1', true),
      answer('skill-1', false),
      answer('skill-1', false),
    ])

    const result = await getSkillBreakdown('child-1')

    expect(result.find((r) => r.skillId === 'skill-1')?.status).toBe('weak')
  })

  it('treats exactly 70% accuracy as strong (>= boundary)', async () => {
    skillFindMany.mockResolvedValueOnce(SKILLS)
    answerFindMany.mockResolvedValueOnce([
      ...Array.from({ length: 7 }, () => answer('skill-1', true)),
      ...Array.from({ length: 3 }, () => answer('skill-1', false)),
    ])

    const result = await getSkillBreakdown('child-1')

    expect(result.find((r) => r.skillId === 'skill-1')?.status).toBe('strong')
  })

  it('treats accuracy just under 70% as weak', async () => {
    skillFindMany.mockResolvedValueOnce(SKILLS)
    answerFindMany.mockResolvedValueOnce([
      ...Array.from({ length: 6 }, () => answer('skill-1', true)),
      ...Array.from({ length: 4 }, () => answer('skill-1', false)),
    ])

    const result = await getSkillBreakdown('child-1')

    expect(result.find((r) => r.skillId === 'skill-1')?.status).toBe('weak')
  })
})

function sessionAnswer(sessionId: string, skillId: string, correct: boolean, completedAt: string) {
  return { sessionId, answeredCorrectly: correct, session: { completedAt: new Date(completedAt) } }
}

describe('getSkillSessionDetail', () => {
  it('does not conflate per-Skill accuracy across a Session spanning two Skills', async () => {
    answerFindMany.mockResolvedValueOnce([
      sessionAnswer('session-1', 'skill-1', true, '2026-07-20T10:00:00.000Z'),
      sessionAnswer('session-1', 'skill-1', false, '2026-07-20T10:00:00.000Z'),
      sessionAnswer('session-1', 'skill-1', true, '2026-07-20T10:00:00.000Z'),
    ])

    const result = await getSkillSessionDetail('child-1', 'skill-1')

    expect(result).toEqual([{ sessionId: 'session-1', completedAt: '2026-07-20T10:00:00.000Z', correct: 2, total: 3 }])
  })

  it('returns only the 3 most recent qualifying Sessions, most-recent-first', async () => {
    answerFindMany.mockResolvedValueOnce([
      sessionAnswer('session-1', 'skill-1', true, '2026-07-10T10:00:00.000Z'),
      sessionAnswer('session-2', 'skill-1', true, '2026-07-15T10:00:00.000Z'),
      sessionAnswer('session-3', 'skill-1', true, '2026-07-18T10:00:00.000Z'),
      sessionAnswer('session-4', 'skill-1', true, '2026-07-20T10:00:00.000Z'),
    ])

    const result = await getSkillSessionDetail('child-1', 'skill-1')

    expect(result.map((r) => r.sessionId)).toEqual(['session-4', 'session-3', 'session-2'])
  })
})

describe('getGradeProgress', () => {
  it('returns null when there are zero completed Sessions with difficulty data', async () => {
    answerAggregate.mockResolvedValueOnce({ _avg: { difficultyLevelAtAnswer: null } })

    const result = await getGradeProgress('child-1')

    expect(result).toBeNull()
  })

  it('classifies an average of exactly 2.0 as early (boundary)', async () => {
    answerAggregate.mockResolvedValueOnce({ _avg: { difficultyLevelAtAnswer: 2.0 } })

    expect(await getGradeProgress('child-1')).toBe('early')
  })

  it('classifies an average of exactly 2.1 as mid (boundary)', async () => {
    answerAggregate.mockResolvedValueOnce({ _avg: { difficultyLevelAtAnswer: 2.1 } })

    expect(await getGradeProgress('child-1')).toBe('mid')
  })

  it('classifies an average of exactly 3.5 as mid (boundary)', async () => {
    answerAggregate.mockResolvedValueOnce({ _avg: { difficultyLevelAtAnswer: 3.5 } })

    expect(await getGradeProgress('child-1')).toBe('mid')
  })

  it('classifies an average of exactly 3.6 as late (boundary)', async () => {
    answerAggregate.mockResolvedValueOnce({ _avg: { difficultyLevelAtAnswer: 3.6 } })

    expect(await getGradeProgress('child-1')).toBe('late')
  })
})

function sessionRow(id: string, completedAt: string, correctCount: number, questionCount: number, skillCodes: string[][]) {
  return {
    id,
    completedAt: new Date(completedAt),
    correctCount,
    questionCount,
    answers: skillCodes.map((codes) => ({ question: { skill: { code: codes[0] } } })),
  }
}

describe('getSessionHistory', () => {
  it('dedupes Skill codes for a Session spanning two Skills', async () => {
    findMany.mockResolvedValueOnce([
      {
        id: 'session-1',
        completedAt: new Date('2026-07-20T10:00:00.000Z'),
        correctCount: 7,
        questionCount: 10,
        answers: [
          { question: { skill: { code: 'pattern-recognition' } } },
          { question: { skill: { code: 'classification' } } },
          { question: { skill: { code: 'pattern-recognition' } } },
        ],
      },
    ])

    const result = await getSessionHistory('child-1', { skip: 0 })

    expect(result).toEqual([
      {
        sessionId: 'session-1',
        completedAt: '2026-07-20T10:00:00.000Z',
        correct: 7,
        total: 10,
        skillCodes: ['pattern-recognition', 'classification'],
      },
    ])
  })

  it('uses Session.correctCount/questionCount directly for the score, not a re-derived tally', async () => {
    findMany.mockResolvedValueOnce([sessionRow('session-1', '2026-07-20T10:00:00.000Z', 8, 10, [['pattern-recognition']])])

    const result = await getSessionHistory('child-1', { skip: 0 })

    expect(result[0]).toMatchObject({ correct: 8, total: 10 })
  })

  it('passes skip/take through to the query for pagination', async () => {
    findMany.mockResolvedValueOnce([])

    await getSessionHistory('child-1', { skip: 30 })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { childProfileId: 'child-1', completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        skip: 30,
        take: 30,
      }),
    )
  })

  it('excludes in-progress (completedAt: null) Sessions via the where clause', async () => {
    findMany.mockResolvedValueOnce([])

    await getSessionHistory('child-1', { skip: 0 })

    expect(findMany.mock.calls[0][0].where).toEqual({ childProfileId: 'child-1', completedAt: { not: null } })
  })
})
