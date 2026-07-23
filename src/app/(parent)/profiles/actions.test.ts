import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  db: {
    parentAccount: { findUnique: vi.fn() },
  },
}))
vi.mock('@/infrastructure/repositories/child-profile-repository', () => ({
  listChildProfiles: vi.fn(),
  createChildProfile: vi.fn(),
  updateChildProfile: vi.fn(),
  softDeleteChildProfile: vi.fn(),
  findChildProfileById: vi.fn(),
  findChildProfileByIdForParent: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/class-repository', () => ({
  findClassByJoinCode: vi.fn(),
  createClassMembership: vi.fn(),
}))
vi.mock('@/lib/child-profile-cookie', () => ({
  setChildProfileCookie: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { findChildProfileByIdForParent } from '@/infrastructure/repositories/child-profile-repository'
import { findClassByJoinCode, createClassMembership } from '@/infrastructure/repositories/class-repository'
import { revalidatePath } from 'next/cache'
import { joinClassAction } from './actions'

const authMock = auth as unknown as ReturnType<typeof vi.fn>
const parentFindUnique = db.parentAccount.findUnique as unknown as ReturnType<typeof vi.fn>
const findChildProfileByIdForParentMock = findChildProfileByIdForParent as unknown as ReturnType<typeof vi.fn>
const findClassByJoinCodeMock = findClassByJoinCode as unknown as ReturnType<typeof vi.fn>
const createClassMembershipMock = createClassMembership as unknown as ReturnType<typeof vi.fn>
const revalidatePathMock = revalidatePath as unknown as ReturnType<typeof vi.fn>

const foundClass = { id: 'class-1', name: 'Lớp 1A', teacherAccountId: 'teacher-1', joinCode: 'ABC234' }

beforeEach(() => {
  authMock.mockReset().mockResolvedValue({ user: { id: 'user-1', role: 'PARENT' } })
  parentFindUnique.mockReset().mockResolvedValue({ id: 'parent-1', userId: 'user-1' })
  findChildProfileByIdForParentMock.mockReset().mockResolvedValue({ id: 'child-1', parentAccountId: 'parent-1' })
  findClassByJoinCodeMock.mockReset().mockResolvedValue(foundClass)
  createClassMembershipMock.mockReset().mockResolvedValue({ id: 'membership-1' })
  revalidatePathMock.mockReset()
})

describe('joinClassAction', () => {
  it('creates a membership with the denormalized teacherAccountId from the found class', async () => {
    const result = await joinClassAction({ childProfileId: 'child-1', joinCode: 'ABC234' })

    expect(result).toEqual({ data: { className: 'Lớp 1A' } })
    expect(createClassMembershipMock).toHaveBeenCalledWith('class-1', 'child-1', 'teacher-1')
    expect(revalidatePathMock).toHaveBeenCalledWith('/profiles', 'layout')
  })

  it('normalizes lowercase input — a lowercase code finds the uppercase-stored code', async () => {
    const result = await joinClassAction({ childProfileId: 'child-1', joinCode: '  abc234 ' })

    expect('data' in result).toBe(true)
    expect(findClassByJoinCodeMock).toHaveBeenCalledWith('ABC234')
  })

  it('returns INVALID_JOIN_CODE when no class matches the code', async () => {
    findClassByJoinCodeMock.mockResolvedValue(null)

    const result = await joinClassAction({ childProfileId: 'child-1', joinCode: 'ZZZZZZ' })

    expect('error' in result && result.error.code).toBe('INVALID_JOIN_CODE')
    expect(createClassMembershipMock).not.toHaveBeenCalled()
  })

  it('returns NOT_FOUND when the child profile does not belong to this parent', async () => {
    findChildProfileByIdForParentMock.mockResolvedValue(null)

    const result = await joinClassAction({ childProfileId: 'someone-elses-child', joinCode: 'ABC234' })

    expect('error' in result && result.error.code).toBe('NOT_FOUND')
    expect(createClassMembershipMock).not.toHaveBeenCalled()
  })

  it('maps a P2002 unique violation to ALREADY_IN_CLASS (A-5: one class per teacher per child)', async () => {
    createClassMembershipMock.mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['teacherAccountId', 'childProfileId'] },
      }),
    )

    const result = await joinClassAction({ childProfileId: 'child-1', joinCode: 'ABC234' })

    expect('error' in result && result.error.code).toBe('ALREADY_IN_CLASS')
  })

  it('returns JOIN_FAILED (never throws) on unexpected membership creation failure', async () => {
    createClassMembershipMock.mockRejectedValue(new Error('db down'))

    const result = await joinClassAction({ childProfileId: 'child-1', joinCode: 'ABC234' })

    expect('error' in result && result.error.code).toBe('JOIN_FAILED')
  })

  it('returns VALIDATION_ERROR for an empty join code', async () => {
    const result = await joinClassAction({ childProfileId: 'child-1', joinCode: '   ' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
    expect(findClassByJoinCodeMock).not.toHaveBeenCalled()
  })

  it('returns UNAUTHORIZED when there is no parent session', async () => {
    authMock.mockResolvedValue(null)

    const result = await joinClassAction({ childProfileId: 'child-1', joinCode: 'ABC234' })

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })
})
