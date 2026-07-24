import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    teacherAccount: { findMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import {
  listPendingTeacherApplications,
  getTeacherApplicationById,
  markTeacherApplicationApproved,
  markTeacherApplicationRejected,
} from './teacher-account-repository'

const teacherFindMany = db.teacherAccount.findMany as unknown as ReturnType<typeof vi.fn>
const teacherFindUnique = db.teacherAccount.findUnique as unknown as ReturnType<typeof vi.fn>
const teacherUpdateMany = db.teacherAccount.updateMany as unknown as ReturnType<typeof vi.fn>

const expectedSelect = {
  id: true,
  fullName: true,
  schoolName: true,
  gradeTaught: true,
  createdAt: true,
  user: { select: { email: true } },
}

beforeEach(() => {
  teacherFindMany.mockReset()
  teacherFindUnique.mockReset()
  teacherUpdateMany.mockReset()
})

describe('listPendingTeacherApplications', () => {
  it('lists only PENDING applications, oldest first, selecting row fields + user email', async () => {
    teacherFindMany.mockResolvedValueOnce([])

    await listPendingTeacherApplications()

    expect(teacherFindMany).toHaveBeenCalledWith({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: expectedSelect,
    })
  })
})

describe('getTeacherApplicationById', () => {
  it('looks up by id with the same select plus status', async () => {
    teacherFindUnique.mockResolvedValueOnce(null)

    const result = await getTeacherApplicationById('teacher-1')

    expect(result).toBeNull()
    expect(teacherFindUnique).toHaveBeenCalledWith({
      where: { id: 'teacher-1' },
      select: { ...expectedSelect, status: true },
    })
  })
})

describe('markTeacherApplicationApproved', () => {
  it('flips status atomically only from PENDING, clearing rejectedReason, and returns the count', async () => {
    teacherUpdateMany.mockResolvedValueOnce({ count: 1 })

    const count = await markTeacherApplicationApproved('teacher-1')

    expect(count).toBe(1)
    expect(teacherUpdateMany).toHaveBeenCalledWith({
      where: { id: 'teacher-1', status: 'PENDING' },
      data: { status: 'APPROVED', rejectedReason: null },
    })
  })

  it('returns 0 when the row is not PENDING (idempotency guard, D1)', async () => {
    teacherUpdateMany.mockResolvedValueOnce({ count: 0 })

    const count = await markTeacherApplicationApproved('teacher-1')

    expect(count).toBe(0)
  })
})

describe('markTeacherApplicationRejected', () => {
  it('flips status atomically only from PENDING, persisting the reason', async () => {
    teacherUpdateMany.mockResolvedValueOnce({ count: 1 })

    const count = await markTeacherApplicationRejected('teacher-1', 'Thiếu thông tin trường học')

    expect(count).toBe(1)
    expect(teacherUpdateMany).toHaveBeenCalledWith({
      where: { id: 'teacher-1', status: 'PENDING' },
      data: { status: 'REJECTED', rejectedReason: 'Thiếu thông tin trường học' },
    })
  })

  it('persists null when no reason is given', async () => {
    teacherUpdateMany.mockResolvedValueOnce({ count: 1 })

    await markTeacherApplicationRejected('teacher-1', null)

    expect(teacherUpdateMany).toHaveBeenCalledWith({
      where: { id: 'teacher-1', status: 'PENDING' },
      data: { status: 'REJECTED', rejectedReason: null },
    })
  })
})
