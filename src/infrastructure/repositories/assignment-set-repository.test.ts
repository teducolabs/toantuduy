import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    assignmentSet: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'
import {
  createAssignmentSetDraft,
  listAssignmentSetsForTeacher,
  findDraftSetForTeacher,
  findActiveSetsForClasses,
  assignSetToClasses,
  getActiveAssignmentsForChild,
  findStartableAssignmentForChild,
  getClassReportData,
} from './assignment-set-repository'

const setCreate = db.assignmentSet.create as unknown as ReturnType<typeof vi.fn>
const setFindMany = db.assignmentSet.findMany as unknown as ReturnType<typeof vi.fn>
const setFindFirst = db.assignmentSet.findFirst as unknown as ReturnType<typeof vi.fn>
const transactionMock = db.$transaction as unknown as ReturnType<typeof vi.fn>

const tx = {
  assignmentSet: { update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
}

beforeEach(() => {
  setCreate.mockReset()
  setFindMany.mockReset()
  setFindFirst.mockReset()
  tx.assignmentSet.update.mockReset()
  tx.assignmentSet.updateMany.mockReset()
  tx.assignmentSet.create.mockReset()
  transactionMock.mockReset().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx))
})

describe('createAssignmentSetDraft', () => {
  it('creates the draft with nested question join rows and NO classId/assignedAt', async () => {
    setCreate.mockResolvedValueOnce({ id: 'set-1' })

    await createAssignmentSetDraft('teacher-1', {
      title: 'Ôn tập tuần 3',
      gradeBand: 'GRADE_1',
      dueAt: new Date('2026-07-30T00:00:00.000Z'),
      questionIds: ['q1', 'q2'],
    })

    const createData = setCreate.mock.calls[0][0].data
    expect(createData).toEqual({
      teacherAccountId: 'teacher-1',
      title: 'Ôn tập tuần 3',
      gradeBand: 'GRADE_1',
      dueAt: new Date('2026-07-30T00:00:00.000Z'),
      questions: { create: [{ questionId: 'q1' }, { questionId: 'q2' }] },
    })
    expect(createData).not.toHaveProperty('classId')
    expect(createData).not.toHaveProperty('assignedAt')
  })

  it('passes a null dueAt through for drafts without a due date', async () => {
    setCreate.mockResolvedValueOnce({ id: 'set-1' })

    await createAssignmentSetDraft('teacher-1', {
      title: 'Không hạn',
      gradeBand: 'GRADE_2',
      dueAt: null,
      questionIds: ['q1'],
    })

    expect(setCreate.mock.calls[0][0].data.dueAt).toBeNull()
  })
})

describe('listAssignmentSetsForTeacher', () => {
  it('scopes to the teacher, orders newest first, and includes question count + class name', async () => {
    setFindMany.mockResolvedValueOnce([])

    await listAssignmentSetsForTeacher('teacher-1')

    expect(setFindMany).toHaveBeenCalledWith({
      where: { teacherAccountId: 'teacher-1' },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { questions: true } },
        class: { select: { name: true } },
      },
    })
  })
})

describe('findDraftSetForTeacher', () => {
  it('requires ownership AND draft status (assignedAt null) in one query', async () => {
    setFindFirst.mockResolvedValueOnce(null)

    await findDraftSetForTeacher('set-1', 'teacher-1')

    expect(setFindFirst).toHaveBeenCalledWith({
      where: { id: 'set-1', teacherAccountId: 'teacher-1', assignedAt: null },
      include: { questions: { select: { questionId: true } } },
    })
  })
})

describe('findActiveSetsForClasses', () => {
  it('filters to active sets (assigned, not replaced) of the target classes', async () => {
    setFindMany.mockResolvedValueOnce([])

    await findActiveSetsForClasses(['c1', 'c2'])

    expect(setFindMany).toHaveBeenCalledWith({
      where: { classId: { in: ['c1', 'c2'] }, assignedAt: { not: null }, replacedAt: null },
      select: { id: true, classId: true, title: true },
    })
  })
})

describe('assignSetToClasses', () => {
  const draftRow = {
    id: 'set-1',
    teacherAccountId: 'teacher-1',
    title: 'Ôn tập tuần 3',
    gradeBand: 'GRADE_1',
    dueAt: null,
  }

  it('replaces active sets, assigns the draft to the first class, and clones for the rest — one transaction', async () => {
    tx.assignmentSet.updateMany.mockResolvedValue({ count: 1 })
    tx.assignmentSet.update.mockResolvedValue(draftRow)
    tx.assignmentSet.create.mockResolvedValue({ id: 'clone-1' })

    await assignSetToClasses('set-1', ['c1', 'c2', 'c3'], ['q1', 'q2'])

    expect(transactionMock).toHaveBeenCalledTimes(1)

    // (a) replace: supersede active sets of ALL target classes
    const updateManyArgs = tx.assignmentSet.updateMany.mock.calls[0][0]
    expect(updateManyArgs.where).toEqual({ classId: { in: ['c1', 'c2', 'c3'] }, assignedAt: { not: null }, replacedAt: null })
    expect(updateManyArgs.data.replacedAt).toBeInstanceOf(Date)

    // (b) the draft row itself is assigned to the FIRST class
    const updateArgs = tx.assignmentSet.update.mock.calls[0][0]
    expect(updateArgs.where).toEqual({ id: 'set-1' })
    expect(updateArgs.data.classId).toBe('c1')
    expect(updateArgs.data.assignedAt).toBeInstanceOf(Date)

    // (c) one clone per remaining class, copying fields + nested questions
    expect(tx.assignmentSet.create).toHaveBeenCalledTimes(2)
    const cloneData = tx.assignmentSet.create.mock.calls.map((call) => call[0].data)
    expect(cloneData.map((data) => data.classId)).toEqual(['c2', 'c3'])
    for (const data of cloneData) {
      expect(data.teacherAccountId).toBe('teacher-1')
      expect(data.title).toBe('Ôn tập tuần 3')
      expect(data.gradeBand).toBe('GRADE_1')
      expect(data.dueAt).toBeNull()
      expect(data.questions).toEqual({ create: [{ questionId: 'q1' }, { questionId: 'q2' }] })
    }

    // same instant everywhere (single new Date())
    expect(updateManyArgs.data.replacedAt).toBe(updateArgs.data.assignedAt)
    expect(cloneData[0].assignedAt).toBe(updateArgs.data.assignedAt)
  })

  it('creates no clones for a single-class assign', async () => {
    tx.assignmentSet.updateMany.mockResolvedValue({ count: 0 })
    tx.assignmentSet.update.mockResolvedValue(draftRow)

    await assignSetToClasses('set-1', ['c1'], ['q1'])

    expect(tx.assignmentSet.create).not.toHaveBeenCalled()
  })
})

describe('getActiveAssignmentsForChild', () => {
  it('filters by membership + active flags, orders newest assigned first, selects teacher display fields', async () => {
    setFindMany.mockResolvedValueOnce([])

    await getActiveAssignmentsForChild('child-1')

    expect(setFindMany).toHaveBeenCalledWith({
      where: {
        assignedAt: { not: null },
        replacedAt: null,
        class: { memberships: { some: { childProfileId: 'child-1' } } },
      },
      orderBy: { assignedAt: 'desc' },
      select: {
        id: true,
        title: true,
        dueAt: true,
        teacherAccount: { select: { fullName: true, schoolName: true } },
      },
    })
  })
})

describe('getClassReportData', () => {
  it('requires ownership + assigned (NOT draft) in one query and does NOT filter on replacedAt (D6)', async () => {
    setFindFirst.mockResolvedValueOnce(null)

    await getClassReportData('set-1', 'teacher-1')

    const args = setFindFirst.mock.calls[0][0]
    expect(args.where).toEqual({ id: 'set-1', teacherAccountId: 'teacher-1', assignedAt: { not: null } })
    expect(args.where).not.toHaveProperty('replacedAt')
  })

  it('selects header fields, live roster (deletedAt filter, createdAt asc), assignment skills, and completed sessions newest-first', async () => {
    setFindFirst.mockResolvedValueOnce(null)

    await getClassReportData('set-1', 'teacher-1')

    const select = setFindFirst.mock.calls[0][0].select
    expect(select.title).toBe(true)
    expect(select.dueAt).toBe(true)
    expect(select.assignedAt).toBe(true)
    expect(select.replacedAt).toBe(true)

    expect(select.class).toEqual({
      select: {
        id: true,
        name: true,
        memberships: {
          where: { childProfile: { deletedAt: null } },
          orderBy: { createdAt: 'asc' },
          select: { childProfile: { select: { id: true, name: true } } },
        },
      },
    })

    expect(select.questions).toEqual({
      select: { question: { select: { skillId: true, skill: { select: { id: true, code: true, name: true } } } } },
    })

    // Privacy (D1/NFR-11): only completed sessions, newest first, answered rows
    // only — and NO correctCount/questionCount anywhere in the select.
    expect(select.sessions).toEqual({
      where: { completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      select: {
        childProfileId: true,
        completedAt: true,
        answers: {
          where: { answeredCorrectly: { not: null } },
          select: { answeredCorrectly: true, question: { select: { skillId: true } } },
        },
      },
    })
    expect(select.sessions.select).not.toHaveProperty('correctCount')
    expect(select.sessions.select).not.toHaveProperty('questionCount')
  })
})

describe('findStartableAssignmentForChild', () => {
  it('authorizes via active + membership filters and includes questions in deterministic id order (D8)', async () => {
    setFindFirst.mockResolvedValueOnce(null)

    await findStartableAssignmentForChild('set-1', 'child-1')

    expect(setFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'set-1',
        assignedAt: { not: null },
        replacedAt: null,
        class: { memberships: { some: { childProfileId: 'child-1' } } },
      },
      include: { questions: { select: { questionId: true }, orderBy: { id: 'asc' } } },
    })
  })
})
