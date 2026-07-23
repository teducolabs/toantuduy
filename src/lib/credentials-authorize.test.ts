import { describe, it, expect, vi, beforeEach } from 'vitest'

// next-auth's package entry imports next/server, which vitest's node
// environment cannot resolve — stub just the CredentialsSignin base class.
vi.mock('next-auth', () => ({
  CredentialsSignin: class CredentialsSignin extends Error {
    code = 'credentials'
  },
}))
vi.mock('@/lib/db', () => ({
  db: { user: { findUnique: vi.fn() } },
}))
vi.mock('bcryptjs', () => ({
  default: {
    hashSync: vi.fn(() => 'dummy-hash'),
    compare: vi.fn(),
  },
}))

import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import {
  authorizeCredentials,
  EmailNotVerifiedError,
  TeacherPendingError,
  TeacherRejectedError,
} from './credentials-authorize'

const findUniqueMock = db.user.findUnique as unknown as ReturnType<typeof vi.fn>
const compareMock = bcrypt.compare as unknown as ReturnType<typeof vi.fn>

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    role: 'PARENT',
    emailVerified: new Date('2026-01-01'),
    teacherAccount: null,
    ...overrides,
  }
}

const credentials = { email: 'user@example.com', password: 'correct-password' }

beforeEach(() => {
  findUniqueMock.mockReset()
  compareMock.mockReset().mockResolvedValue(true)
})

describe('authorizeCredentials', () => {
  it('returns null for missing credentials', async () => {
    await expect(authorizeCredentials(undefined)).resolves.toBeNull()
    await expect(authorizeCredentials({ email: 'a@b.c' })).resolves.toBeNull()
  })

  it('returns null for an unknown email or wrong password', async () => {
    findUniqueMock.mockResolvedValue(null)
    await expect(authorizeCredentials(credentials)).resolves.toBeNull()

    findUniqueMock.mockResolvedValue(makeUser())
    compareMock.mockResolvedValue(false)
    await expect(authorizeCredentials(credentials)).resolves.toBeNull()
  })

  it('throws EmailNotVerifiedError (code email_not_verified) for an unverified parent', async () => {
    findUniqueMock.mockResolvedValue(makeUser({ emailVerified: null }))

    const promise = authorizeCredentials(credentials)
    await expect(promise).rejects.toBeInstanceOf(EmailNotVerifiedError)
    await expect(promise).rejects.toMatchObject({ code: 'email_not_verified' })
  })

  it('returns the session user for a verified parent, unaffected by the teacher branch', async () => {
    findUniqueMock.mockResolvedValue(makeUser())

    await expect(authorizeCredentials(credentials)).resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
      role: 'PARENT',
    })
  })

  it('throws TeacherPendingError (code teacher_pending) for a PENDING teacher', async () => {
    findUniqueMock.mockResolvedValue(makeUser({ role: 'TEACHER', teacherAccount: { status: 'PENDING' } }))

    const promise = authorizeCredentials(credentials)
    await expect(promise).rejects.toBeInstanceOf(TeacherPendingError)
    await expect(promise).rejects.toMatchObject({ code: 'teacher_pending' })
  })

  it('throws TeacherRejectedError (code teacher_rejected) for a REJECTED teacher', async () => {
    findUniqueMock.mockResolvedValue(makeUser({ role: 'TEACHER', teacherAccount: { status: 'REJECTED' } }))

    const promise = authorizeCredentials(credentials)
    await expect(promise).rejects.toBeInstanceOf(TeacherRejectedError)
    await expect(promise).rejects.toMatchObject({ code: 'teacher_rejected' })
  })

  it('treats a TEACHER user with no TeacherAccount row as pending', async () => {
    findUniqueMock.mockResolvedValue(makeUser({ role: 'TEACHER', teacherAccount: null }))

    await expect(authorizeCredentials(credentials)).rejects.toBeInstanceOf(TeacherPendingError)
  })

  it('lets an APPROVED teacher through, gated by approval rather than email verification', async () => {
    findUniqueMock.mockResolvedValue(
      makeUser({ role: 'TEACHER', emailVerified: null, teacherAccount: { status: 'APPROVED' } }),
    )

    await expect(authorizeCredentials(credentials)).resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
      role: 'TEACHER',
    })
  })

  it('rejects a PENDING teacher with a wrong password as invalid credentials, not teacher_pending', async () => {
    findUniqueMock.mockResolvedValue(makeUser({ role: 'TEACHER', teacherAccount: { status: 'PENDING' } }))
    compareMock.mockResolvedValue(false)

    await expect(authorizeCredentials(credentials)).resolves.toBeNull()
  })
})
