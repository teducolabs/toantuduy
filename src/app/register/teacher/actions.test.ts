import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { db } from '@/lib/db'
import { registerTeacher } from './actions'

const findUniqueMock = db.user.findUnique as unknown as ReturnType<typeof vi.fn>
const transactionMock = db.$transaction as unknown as ReturnType<typeof vi.fn>

const tx = {
  user: { create: vi.fn() },
  teacherAccount: { create: vi.fn() },
}

const validInput = {
  name: 'Cô Lan',
  schoolName: 'Tiểu học Kim Đồng',
  gradeTaught: 'GRADE_2',
  email: 'lan@school.vn',
}

beforeEach(() => {
  findUniqueMock.mockReset().mockResolvedValue(null)
  tx.user.create.mockReset().mockResolvedValue({ id: 'user-1' })
  tx.teacherAccount.create.mockReset().mockResolvedValue({ id: 'teacher-1' })
  transactionMock.mockReset().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx))
})

describe('registerTeacher', () => {
  it('creates a TEACHER User (no password, unverified) and a PENDING TeacherAccount', async () => {
    const result = await registerTeacher(validInput)

    expect(result).toEqual({ data: { success: true } })
    expect(tx.user.create).toHaveBeenCalledWith({
      data: { email: 'lan@school.vn', passwordHash: null, role: 'TEACHER', emailVerified: null },
    })
    expect(tx.teacherAccount.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', fullName: 'Cô Lan', schoolName: 'Tiểu học Kim Đồng', gradeTaught: 'GRADE_2', status: 'PENDING' },
    })
  })

  it('lowercases the email before lookup and creation', async () => {
    const result = await registerTeacher({ ...validInput, email: 'Lan@School.VN' })

    expect(result).toEqual({ data: { success: true } })
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { email: 'lan@school.vn' } })
  })

  it('returns EMAIL_IN_USE when the email already has an account, without creating anything', async () => {
    findUniqueMock.mockResolvedValue({ id: 'existing' })

    const result = await registerTeacher(validInput)

    expect(result).toEqual({ error: { code: 'EMAIL_IN_USE', message: 'Email address already registered' } })
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('returns EMAIL_IN_USE when a concurrent registration wins the race (transaction rejects)', async () => {
    transactionMock.mockRejectedValue(new Error('Unique constraint failed on User.email'))

    const result = await registerTeacher(validInput)

    expect(result).toEqual({ error: { code: 'EMAIL_IN_USE', message: 'Email address already registered' } })
  })

  it('returns VALIDATION_ERROR for a missing name', async () => {
    const result = await registerTeacher({ ...validInput, name: '   ' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('returns VALIDATION_ERROR for a missing schoolName', async () => {
    const result = await registerTeacher({ ...validInput, schoolName: '' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for an invalid gradeTaught', async () => {
    const result = await registerTeacher({ ...validInput, gradeTaught: 'GRADE_9' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns INVALID_EMAIL for a malformed email', async () => {
    const result = await registerTeacher({ ...validInput, email: 'not-an-email' })

    expect('error' in result && result.error.code).toBe('INVALID_EMAIL')
  })

  it('never throws — unexpected lookup failure still resolves to an error result', async () => {
    findUniqueMock.mockRejectedValue(new Error('db down'))

    const result = await registerTeacher(validInput)

    expect('error' in result && result.error.code).toBe('REGISTRATION_FAILED')
  })
})
