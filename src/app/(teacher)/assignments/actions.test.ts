import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  db: {
    teacherAccount: { findUnique: vi.fn() },
    assignmentSet: { create: vi.fn(), findMany: vi.fn() },
    question: { findMany: vi.fn(), count: vi.fn() },
    skill: { findMany: vi.fn() },
    globalConfig: { findUnique: vi.fn() },
  },
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import {
  getAssignmentBuilderContextAction,
  getQuestionLibraryAction,
  createAssignmentSetDraftAction,
  getAssignmentSetsAction,
} from './actions'

const authMock = auth as unknown as ReturnType<typeof vi.fn>
const teacherFindUnique = db.teacherAccount.findUnique as unknown as ReturnType<typeof vi.fn>
const setCreate = db.assignmentSet.create as unknown as ReturnType<typeof vi.fn>
const setFindMany = db.assignmentSet.findMany as unknown as ReturnType<typeof vi.fn>
const questionFindMany = db.question.findMany as unknown as ReturnType<typeof vi.fn>
const questionCount = db.question.count as unknown as ReturnType<typeof vi.fn>
const skillFindMany = db.skill.findMany as unknown as ReturnType<typeof vi.fn>
const globalConfigFindUnique = db.globalConfig.findUnique as unknown as ReturnType<typeof vi.fn>
const revalidatePathMock = revalidatePath as unknown as ReturnType<typeof vi.fn>

const validDraftInput = {
  title: 'Ôn tập tuần 3',
  gradeBand: 'GRADE_1' as const,
  questionIds: ['q1', 'q2', 'q3'],
}

beforeEach(() => {
  authMock.mockReset()
  teacherFindUnique.mockReset()
  setCreate.mockReset()
  setFindMany.mockReset()
  questionFindMany.mockReset()
  questionCount.mockReset()
  skillFindMany.mockReset()
  globalConfigFindUnique.mockReset()
  revalidatePathMock.mockReset()

  authMock.mockResolvedValue({ user: { id: 'user-1', role: 'TEACHER' } })
  teacherFindUnique.mockResolvedValue({ id: 'teacher-1', userId: 'user-1', status: 'APPROVED' })
  globalConfigFindUnique.mockResolvedValue({ key: 'SESSION_QUESTION_COUNT', value: '10' })
  questionCount.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
    Promise.resolve(where.id.in.length),
  )
  setCreate.mockResolvedValue({ id: 'set-1' })
})

// AD-6 dual gate — non-negotiable rejection matrix for the mutating action.
describe('createAssignmentSetDraftAction — AD-6 approval gate', () => {
  it.each([
    ['no session', () => authMock.mockResolvedValue(null)],
    ['wrong role', () => authMock.mockResolvedValue({ user: { id: 'user-1', role: 'PARENT' } })],
    ['no TeacherAccount row', () => teacherFindUnique.mockResolvedValue(null)],
    ['status PENDING', () => teacherFindUnique.mockResolvedValue({ id: 'teacher-1', status: 'PENDING' })],
    ['status REJECTED', () => teacherFindUnique.mockResolvedValue({ id: 'teacher-1', status: 'REJECTED' })],
  ])('rejects with UNAUTHORIZED when %s', async (_label, arrange) => {
    arrange()

    const result = await createAssignmentSetDraftAction(validDraftInput)

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
    expect(setCreate).not.toHaveBeenCalled()
  })
})

describe('createAssignmentSetDraftAction — validation', () => {
  it('rejects an empty title', async () => {
    const result = await createAssignmentSetDraftAction({ ...validDraftInput, title: '   ' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
    expect(setCreate).not.toHaveBeenCalled()
  })

  it('rejects an empty questionIds array', async () => {
    const result = await createAssignmentSetDraftAction({ ...validDraftInput, questionIds: [] })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a malformed dueDate', async () => {
    const result = await createAssignmentSetDraftAction({ ...validDraftInput, dueDate: '30/07/2026' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
  })

  it('dedupes duplicate question ids before creating', async () => {
    const result = await createAssignmentSetDraftAction({ ...validDraftInput, questionIds: ['q1', 'q1', 'q2'] })

    expect('data' in result).toBe(true)
    expect(setCreate.mock.calls[0][0].data.questions.create).toEqual([{ questionId: 'q1' }, { questionId: 'q2' }])
  })

  it('re-enforces the admin-configured max server-side (TOO_MANY_QUESTIONS)', async () => {
    globalConfigFindUnique.mockResolvedValue({ key: 'SESSION_QUESTION_COUNT', value: '2' })

    const result = await createAssignmentSetDraftAction(validDraftInput)

    expect('error' in result && result.error.code).toBe('TOO_MANY_QUESTIONS')
    expect(setCreate).not.toHaveBeenCalled()
  })

  it('rejects ids that do not all match the submitted grade band (INVALID_QUESTIONS)', async () => {
    questionCount.mockResolvedValue(2) // 3 ids submitted, only 2 exist in the grade band

    const result = await createAssignmentSetDraftAction(validDraftInput)

    expect('error' in result && result.error.code).toBe('INVALID_QUESTIONS')
    expect(setCreate).not.toHaveBeenCalled()
  })
})

describe('createAssignmentSetDraftAction — happy path', () => {
  it('creates the draft with mapped title, gradeBand, UTC dueAt, and nested questions', async () => {
    const result = await createAssignmentSetDraftAction({ ...validDraftInput, dueDate: '2026-07-30' })

    expect('data' in result && result.data.assignmentSet.id).toBe('set-1')
    const createData = setCreate.mock.calls[0][0].data
    expect(createData.teacherAccountId).toBe('teacher-1')
    expect(createData.title).toBe('Ôn tập tuần 3')
    expect(createData.gradeBand).toBe('GRADE_1')
    expect(createData.dueAt).toEqual(new Date('2026-07-30T00:00:00.000Z'))
    expect(createData.questions.create).toEqual([{ questionId: 'q1' }, { questionId: 'q2' }, { questionId: 'q3' }])
    expect(createData).not.toHaveProperty('classId')
    expect(createData).not.toHaveProperty('assignedAt')
    expect(revalidatePathMock).toHaveBeenCalledWith('/classes')
    expect(revalidatePathMock).toHaveBeenCalledWith('/assignments')
  })

  it('stores a null dueAt when no dueDate is submitted', async () => {
    await createAssignmentSetDraftAction(validDraftInput)

    expect(setCreate.mock.calls[0][0].data.dueAt).toBeNull()
  })

  it('maps a database failure to CREATE_FAILED instead of throwing', async () => {
    setCreate.mockRejectedValue(new Error('db down'))

    const result = await createAssignmentSetDraftAction(validDraftInput)

    expect('error' in result && result.error.code).toBe('CREATE_FAILED')
  })
})

describe('getAssignmentBuilderContextAction', () => {
  it('returns skills and the admin-configured max question count', async () => {
    skillFindMany.mockResolvedValueOnce([{ id: 'skill-1', code: 'classification', name: 'Phân loại' }])
    globalConfigFindUnique.mockResolvedValue({ key: 'SESSION_QUESTION_COUNT', value: '15' })

    const result = await getAssignmentBuilderContextAction()

    expect('data' in result && result.data.skills).toHaveLength(1)
    expect('data' in result && result.data.maxQuestions).toBe(15)
  })

  it('rejects an unapproved teacher (AD-6)', async () => {
    teacherFindUnique.mockResolvedValue({ id: 'teacher-1', status: 'PENDING' })

    const result = await getAssignmentBuilderContextAction()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })
})

describe('getQuestionLibraryAction', () => {
  it('returns lean library items for a valid grade band', async () => {
    questionFindMany.mockResolvedValueOnce([
      {
        id: 'q1',
        prompt: 'Hình nào tiếp theo?',
        correctAnswer: 'a',
        choices: ['a', 'b'],
        difficultyLevel: 2,
        skill: { id: 'skill-1', code: 'pattern-recognition', name: 'Nhận diện quy luật' },
      },
    ])

    const result = await getQuestionLibraryAction({ gradeBand: 'GRADE_1', skillId: 'skill-1' })

    expect('data' in result).toBe(true)
    if ('data' in result) {
      expect(result.data.questions[0]).not.toHaveProperty('correctAnswer')
      expect(result.data.questions[0]).not.toHaveProperty('choices')
    }
    expect(questionFindMany.mock.calls[0][0].where).toEqual({ gradeBand: 'GRADE_1', skillId: 'skill-1' })
  })

  it('rejects an invalid grade band', async () => {
    const result = await getQuestionLibraryAction({ gradeBand: 'GRADE_9' as 'GRADE_1' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects an unapproved teacher (AD-6)', async () => {
    teacherFindUnique.mockResolvedValue({ id: 'teacher-1', status: 'REJECTED' })

    const result = await getQuestionLibraryAction({ gradeBand: 'GRADE_1' })

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
    expect(questionFindMany).not.toHaveBeenCalled()
  })
})

describe('getAssignmentSetsAction', () => {
  it('lists assignment sets scoped to the resolved teacher', async () => {
    setFindMany.mockResolvedValueOnce([{ id: 'set-1', _count: { questions: 5 }, class: null }])

    const result = await getAssignmentSetsAction()

    expect('data' in result && result.data.assignmentSets).toHaveLength(1)
    expect(setFindMany.mock.calls[0][0].where).toEqual({ teacherAccountId: 'teacher-1' })
  })
})
