import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    class: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    classMembership: { create: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import {
  listClassesForTeacher,
  createClass,
  getClassDetail,
  findClassByJoinCode,
  createClassMembership,
} from './class-repository'

const classFindMany = db.class.findMany as unknown as ReturnType<typeof vi.fn>
const classCreate = db.class.create as unknown as ReturnType<typeof vi.fn>
const classFindFirst = db.class.findFirst as unknown as ReturnType<typeof vi.fn>
const classFindUnique = db.class.findUnique as unknown as ReturnType<typeof vi.fn>
const membershipCreate = db.classMembership.create as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  classFindMany.mockReset()
  classCreate.mockReset()
  classFindFirst.mockReset()
  classFindUnique.mockReset()
  membershipCreate.mockReset()
})

describe('listClassesForTeacher', () => {
  it('scopes to the teacher, orders by createdAt asc, and includes the student count', async () => {
    classFindMany.mockResolvedValueOnce([])

    await listClassesForTeacher('teacher-1')

    expect(classFindMany).toHaveBeenCalledWith({
      where: { teacherAccountId: 'teacher-1' },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { memberships: true } } },
    })
  })
})

describe('createClass', () => {
  it('creates the class with the provided join code', async () => {
    classCreate.mockResolvedValueOnce({ id: 'class-1' })

    await createClass('teacher-1', 'Lớp 1A', 'GRADE_1', 'ABC234')

    expect(classCreate).toHaveBeenCalledWith({
      data: { teacherAccountId: 'teacher-1', name: 'Lớp 1A', gradeBand: 'GRADE_1', joinCode: 'ABC234' },
    })
  })
})

describe('getClassDetail', () => {
  it('scopes the query by both classId and teacherAccountId (ownership in the where clause)', async () => {
    classFindFirst.mockResolvedValueOnce(null)

    const result = await getClassDetail('class-1', 'teacher-1')

    expect(result).toBeNull()
    const callArg = classFindFirst.mock.calls[0][0]
    expect(callArg.where).toEqual({ id: 'class-1', teacherAccountId: 'teacher-1' })
  })

  it('excludes soft-deleted child profiles from the roster query', async () => {
    classFindFirst.mockResolvedValueOnce(null)

    await getClassDetail('class-1', 'teacher-1')

    const callArg = classFindFirst.mock.calls[0][0]
    expect(callArg.include.memberships.where).toEqual({ childProfile: { deletedAt: null } })
  })
})

describe('findClassByJoinCode', () => {
  it('looks up by the unique joinCode', async () => {
    classFindUnique.mockResolvedValueOnce(null)

    await findClassByJoinCode('ABC234')

    expect(classFindUnique).toHaveBeenCalledWith({ where: { joinCode: 'ABC234' } })
  })
})

describe('createClassMembership', () => {
  it('creates the membership with the denormalized teacherAccountId', async () => {
    membershipCreate.mockResolvedValueOnce({ id: 'membership-1' })

    await createClassMembership('class-1', 'child-1', 'teacher-1')

    expect(membershipCreate).toHaveBeenCalledWith({
      data: { classId: 'class-1', childProfileId: 'child-1', teacherAccountId: 'teacher-1' },
    })
  })
})
