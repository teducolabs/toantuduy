import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  db: {
    teacherAccount: { findUnique: vi.fn() },
    assignmentSet: { findFirst: vi.fn() },
  },
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getClassReportAction } from './actions'

const authMock = auth as unknown as ReturnType<typeof vi.fn>
const teacherFindUnique = db.teacherAccount.findUnique as unknown as ReturnType<typeof vi.fn>
const setFindFirst = db.assignmentSet.findFirst as unknown as ReturnType<typeof vi.fn>

const skillRow = { id: 'sk-a', code: 'pattern-recognition', name: 'Nhận diện quy luật' }

const reportData = {
  id: 'set-1',
  title: 'Ôn tập tuần 3',
  dueAt: new Date('2026-07-30T00:00:00.000Z'),
  assignedAt: new Date('2026-07-20T00:00:00.000Z'),
  replacedAt: null,
  class: {
    id: 'class-1',
    name: 'Lớp 1A',
    memberships: [
      { childProfile: { id: 'child-1', name: 'An' } },
      { childProfile: { id: 'child-2', name: 'Bình' } },
    ],
  },
  questions: [
    { question: { skillId: 'sk-a', skill: skillRow } },
    { question: { skillId: 'sk-a', skill: skillRow } },
  ],
  sessions: [
    {
      childProfileId: 'child-1',
      completedAt: new Date('2026-07-24T10:00:00.000Z'),
      answers: [
        { answeredCorrectly: true, question: { skillId: 'sk-a' } },
        { answeredCorrectly: false, question: { skillId: 'sk-a' } },
      ],
    },
  ],
}

beforeEach(() => {
  authMock.mockReset()
  teacherFindUnique.mockReset()
  setFindFirst.mockReset()

  authMock.mockResolvedValue({ user: { id: 'user-1', role: 'TEACHER' } })
  teacherFindUnique.mockResolvedValue({ id: 'teacher-1', userId: 'user-1', status: 'APPROVED' })
})

// AD-6 dual gate — non-negotiable rejection matrix.
describe('getClassReportAction — AD-6 approval gate', () => {
  it.each([
    ['no session', () => authMock.mockResolvedValue(null)],
    ['wrong role', () => authMock.mockResolvedValue({ user: { id: 'user-1', role: 'PARENT' } })],
    ['no TeacherAccount row', () => teacherFindUnique.mockResolvedValue(null)],
    ['status PENDING', () => teacherFindUnique.mockResolvedValue({ id: 'teacher-1', status: 'PENDING' })],
    ['status REJECTED', () => teacherFindUnique.mockResolvedValue({ id: 'teacher-1', status: 'REJECTED' })],
  ])('rejects with UNAUTHORIZED when %s', async (_label, arrange) => {
    arrange()

    const result = await getClassReportAction({ assignmentSetId: 'set-1' })

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
    expect(setFindFirst).not.toHaveBeenCalled()
  })
})

describe('getClassReportAction — validation', () => {
  it('rejects an empty assignmentSetId', async () => {
    const result = await getClassReportAction({ assignmentSetId: '' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
    expect(setFindFirst).not.toHaveBeenCalled()
  })
})

describe('getClassReportAction — not found', () => {
  it('returns NOT_FOUND when the repo resolves null (foreign / draft / missing set)', async () => {
    setFindFirst.mockResolvedValue(null)

    const result = await getClassReportAction({ assignmentSetId: 'set-x' })

    expect('error' in result && result.error.code).toBe('NOT_FOUND')
  })
})

describe('getClassReportAction — happy path', () => {
  it('scopes the query to the resolved teacher and returns the computed report with header fields', async () => {
    setFindFirst.mockResolvedValue(reportData)

    const result = await getClassReportAction({ assignmentSetId: 'set-1' })

    // AC #8: the repo query itself is teacher-scoped.
    expect(setFindFirst.mock.calls[0][0].where).toMatchObject({ id: 'set-1', teacherAccountId: 'teacher-1' })

    if ('error' in result) throw new Error('expected data')
    const { report } = result.data

    expect(report.title).toBe('Ôn tập tuần 3')
    expect(report.className).toBe('Lớp 1A')
    expect(report.status).toBe('assigned')
    expect(report.dueAt).toEqual(new Date('2026-07-30T00:00:00.000Z'))
    expect(report.questionCount).toBe(2)

    expect(report.skills).toEqual([skillRow])
    expect(report.rows).toEqual([
      { childProfileId: 'child-1', name: 'An', completed: true, accuracyBySkillId: { 'sk-a': 0.5 } },
      { childProfileId: 'child-2', name: 'Bình', completed: false, accuracyBySkillId: null },
    ])
    expect(report.classAverage).toEqual({ 'sk-a': 0.5 })
  })

  it('reports status "replaced" for a superseded set (D6)', async () => {
    setFindFirst.mockResolvedValue({ ...reportData, replacedAt: new Date('2026-07-23T00:00:00.000Z') })

    const result = await getClassReportAction({ assignmentSetId: 'set-1' })

    if ('error' in result) throw new Error('expected data')
    expect(result.data.report.status).toBe('replaced')
  })

  it('never exposes per-student session totals in the payload (D1/NFR-11)', async () => {
    setFindFirst.mockResolvedValue(reportData)

    const result = await getClassReportAction({ assignmentSetId: 'set-1' })

    if ('error' in result) throw new Error('expected data')
    const serialized = JSON.stringify(result.data.report)
    expect(serialized).not.toContain('correctCount')
    for (const row of result.data.report.rows) {
      expect(row).not.toHaveProperty('correctCount')
      expect(row).not.toHaveProperty('questionCount')
      expect(row).not.toHaveProperty('score')
    }
  })
})
