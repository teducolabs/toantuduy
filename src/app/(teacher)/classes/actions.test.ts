import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  db: {
    teacherAccount: { findUnique: vi.fn() },
    class: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
  },
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireTeacherAccountId, createClassAction, getClassesAction, getClassDetailAction } from './actions'

const authMock = auth as unknown as ReturnType<typeof vi.fn>
const teacherFindUnique = db.teacherAccount.findUnique as unknown as ReturnType<typeof vi.fn>
const classFindMany = db.class.findMany as unknown as ReturnType<typeof vi.fn>
const classCreate = db.class.create as unknown as ReturnType<typeof vi.fn>
const classFindFirst = db.class.findFirst as unknown as ReturnType<typeof vi.fn>
const revalidatePathMock = revalidatePath as unknown as ReturnType<typeof vi.fn>

function p2002JoinCode() {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['joinCode'] } })
}

beforeEach(() => {
  authMock.mockReset()
  teacherFindUnique.mockReset()
  classFindMany.mockReset()
  classCreate.mockReset()
  classFindFirst.mockReset()
  revalidatePathMock.mockReset()

  authMock.mockResolvedValue({ user: { id: 'user-1', role: 'TEACHER' } })
  teacherFindUnique.mockResolvedValue({ id: 'teacher-1', userId: 'user-1', status: 'APPROVED' })
})

describe('requireTeacherAccountId', () => {
  it('returns the teacherAccountId for an APPROVED teacher', async () => {
    const result = await requireTeacherAccountId()

    expect(result).toEqual({ teacherAccountId: 'teacher-1' })
  })

  it('rejects when there is no session', async () => {
    authMock.mockResolvedValue(null)

    const result = await requireTeacherAccountId()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects a non-TEACHER role', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1', role: 'PARENT' } })

    const result = await requireTeacherAccountId()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects when no TeacherAccount row exists', async () => {
    teacherFindUnique.mockResolvedValue(null)

    const result = await requireTeacherAccountId()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects a PENDING teacher — JWT role alone is insufficient (AD-6)', async () => {
    teacherFindUnique.mockResolvedValue({ id: 'teacher-1', userId: 'user-1', status: 'PENDING' })

    const result = await requireTeacherAccountId()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects a REJECTED teacher (AD-6)', async () => {
    teacherFindUnique.mockResolvedValue({ id: 'teacher-1', userId: 'user-1', status: 'REJECTED' })

    const result = await requireTeacherAccountId()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })
})

describe('createClassAction', () => {
  it('creates a class with a generated join code and revalidates /classes', async () => {
    classCreate.mockResolvedValueOnce({ id: 'class-1', name: 'Lớp 1A', joinCode: 'ABC234' })

    const result = await createClassAction({ name: 'Lớp 1A', gradeBand: 'GRADE_1' })

    expect('data' in result && result.data.class.id).toBe('class-1')
    const createData = classCreate.mock.calls[0][0].data
    expect(createData.teacherAccountId).toBe('teacher-1')
    expect(createData.name).toBe('Lớp 1A')
    expect(createData.gradeBand).toBe('GRADE_1')
    expect(createData.joinCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
    expect(revalidatePathMock).toHaveBeenCalledWith('/classes')
  })

  it('retries with a fresh join code on a P2002 joinCode collision', async () => {
    classCreate.mockRejectedValueOnce(p2002JoinCode()).mockResolvedValueOnce({ id: 'class-1' })

    const result = await createClassAction({ name: 'Lớp 1A', gradeBand: 'GRADE_1' })

    expect('data' in result).toBe(true)
    expect(classCreate).toHaveBeenCalledTimes(2)
    const firstCode = classCreate.mock.calls[0][0].data.joinCode
    const secondCode = classCreate.mock.calls[1][0].data.joinCode
    expect(firstCode).not.toBe(secondCode)
  })

  it('gives up after 5 collision attempts with an error result', async () => {
    classCreate.mockRejectedValue(p2002JoinCode())

    const result = await createClassAction({ name: 'Lớp 1A', gradeBand: 'GRADE_1' })

    expect('error' in result && result.error.code).toBe('CREATE_FAILED')
    expect(classCreate).toHaveBeenCalledTimes(5)
  })

  it('does not retry on non-collision errors', async () => {
    classCreate.mockRejectedValue(new Error('db down'))

    const result = await createClassAction({ name: 'Lớp 1A', gradeBand: 'GRADE_1' })

    expect('error' in result && result.error.code).toBe('CREATE_FAILED')
    expect(classCreate).toHaveBeenCalledTimes(1)
  })

  it('returns VALIDATION_ERROR for an empty name', async () => {
    const result = await createClassAction({ name: '   ', gradeBand: 'GRADE_1' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
    expect(classCreate).not.toHaveBeenCalled()
  })

  it('returns VALIDATION_ERROR for an invalid gradeBand', async () => {
    const result = await createClassAction({ name: 'Lớp 1A', gradeBand: 'GRADE_9' as 'GRADE_1' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects a PENDING teacher before touching the database (AC #6)', async () => {
    teacherFindUnique.mockResolvedValue({ id: 'teacher-1', userId: 'user-1', status: 'PENDING' })

    const result = await createClassAction({ name: 'Lớp 1A', gradeBand: 'GRADE_1' })

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
    expect(classCreate).not.toHaveBeenCalled()
  })
})

describe('getClassesAction', () => {
  it('lists classes scoped to the resolved teacher', async () => {
    classFindMany.mockResolvedValueOnce([{ id: 'class-1', _count: { memberships: 3 } }])

    const result = await getClassesAction()

    expect('data' in result && result.data.classes).toHaveLength(1)
    expect(classFindMany.mock.calls[0][0].where).toEqual({ teacherAccountId: 'teacher-1' })
  })
})

describe('getClassDetailAction', () => {
  it('returns NOT_FOUND for a non-owned or unknown class', async () => {
    classFindFirst.mockResolvedValueOnce(null)

    const result = await getClassDetailAction({ classId: 'someone-elses-class' })

    expect('error' in result && result.error.code).toBe('NOT_FOUND')
    expect(classFindFirst.mock.calls[0][0].where).toEqual({ id: 'someone-elses-class', teacherAccountId: 'teacher-1' })
  })

  it('returns the class detail for an owned class', async () => {
    classFindFirst.mockResolvedValueOnce({ id: 'class-1', joinCode: 'ABC234', memberships: [] })

    const result = await getClassDetailAction({ classId: 'class-1' })

    expect('data' in result && result.data.class.joinCode).toBe('ABC234')
  })
})
