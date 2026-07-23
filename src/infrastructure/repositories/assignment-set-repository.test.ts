import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    assignmentSet: { create: vi.fn(), findMany: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import { createAssignmentSetDraft, listAssignmentSetsForTeacher } from './assignment-set-repository'

const setCreate = db.assignmentSet.create as unknown as ReturnType<typeof vi.fn>
const setFindMany = db.assignmentSet.findMany as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  setCreate.mockReset()
  setFindMany.mockReset()
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
