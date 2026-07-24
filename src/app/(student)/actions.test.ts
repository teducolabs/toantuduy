import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))
vi.mock('@/lib/env', () => ({
  env: { NEXTAUTH_SECRET: 'test-secret' },
}))
vi.mock('@/lib/child-profile-cookie', () => ({
  getChildProfileId: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  db: {},
}))
vi.mock('@/infrastructure/repositories/child-profile-repository', () => ({
  findChildProfileById: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/subscription-repository', () => ({
  isAllotmentExhausted: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/session-repository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createSession: vi.fn(),
  abandonPreviousSessions: vi.fn(),
  findActiveSession: vi.fn(),
  recordAnswer: vi.fn(),
  completeSession: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/assignment-set-repository', () => ({
  getActiveAssignmentsForChild: vi.fn(),
  findStartableAssignmentForChild: vi.fn(),
}))
vi.mock('@/app/(student)/session-question-selection', () => ({
  selectSessionQuestionIds: vi.fn(),
}))

import { getChildProfileId } from '@/lib/child-profile-cookie'
import { findChildProfileById } from '@/infrastructure/repositories/child-profile-repository'
import { isAllotmentExhausted } from '@/infrastructure/repositories/subscription-repository'
import { createSession, abandonPreviousSessions } from '@/infrastructure/repositories/session-repository'
import {
  getActiveAssignmentsForChild,
  findStartableAssignmentForChild,
} from '@/infrastructure/repositories/assignment-set-repository'
import { startAssignmentSessionAction, getActiveAssignmentsState } from './actions'

const getChildProfileIdMock = getChildProfileId as unknown as ReturnType<typeof vi.fn>
const findChildProfileByIdMock = findChildProfileById as unknown as ReturnType<typeof vi.fn>
const isAllotmentExhaustedMock = isAllotmentExhausted as unknown as ReturnType<typeof vi.fn>
const createSessionMock = createSession as unknown as ReturnType<typeof vi.fn>
const abandonPreviousSessionsMock = abandonPreviousSessions as unknown as ReturnType<typeof vi.fn>
const getActiveAssignmentsForChildMock = getActiveAssignmentsForChild as unknown as ReturnType<typeof vi.fn>
const findStartableAssignmentForChildMock = findStartableAssignmentForChild as unknown as ReturnType<typeof vi.fn>

const childProfile = { id: 'child-1', parentAccountId: 'parent-1', name: 'Bé An', gradeBand: 'GRADE_1' }

// Ordered questionIds come from the repo's orderBy id asc include (D8).
const startableAssignment = {
  id: 'set-1',
  questions: [{ questionId: 'q1' }, { questionId: 'q2' }, { questionId: 'q3' }],
}

beforeEach(() => {
  getChildProfileIdMock.mockReset().mockResolvedValue('child-1')
  findChildProfileByIdMock.mockReset().mockResolvedValue(childProfile)
  isAllotmentExhaustedMock.mockReset().mockResolvedValue(false)
  createSessionMock.mockReset().mockResolvedValue({ id: 'session-1' })
  abandonPreviousSessionsMock.mockReset().mockResolvedValue(undefined)
  getActiveAssignmentsForChildMock.mockReset().mockResolvedValue([])
  findStartableAssignmentForChildMock.mockReset().mockResolvedValue(startableAssignment)
})

describe('startAssignmentSessionAction', () => {
  it('returns UNAUTHORIZED when no child-profile cookie is present', async () => {
    getChildProfileIdMock.mockResolvedValue(null)

    const result = await startAssignmentSessionAction('set-1')

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it('returns ASSIGNMENT_NOT_AVAILABLE when the set is not startable for this child', async () => {
    findStartableAssignmentForChildMock.mockResolvedValue(null)

    const result = await startAssignmentSessionAction('set-1')

    expect('error' in result && result.error.code).toBe('ASSIGNMENT_NOT_AVAILABLE')
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it('returns ALLOTMENT_EXHAUSTED when the free-tier gate is closed (same code as startSessionAction)', async () => {
    isAllotmentExhaustedMock.mockResolvedValue(true)

    const result = await startAssignmentSessionAction('set-1')

    expect('error' in result && result.error.code).toBe('ALLOTMENT_EXHAUSTED')
    expect(abandonPreviousSessionsMock).not.toHaveBeenCalled()
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it("happy path: abandons previous sessions first, then creates the session with the set's ordered questionIds and assignmentSetId", async () => {
    const result = await startAssignmentSessionAction('set-1')

    expect('data' in result && result.data.sessionId).toBe('session-1')
    expect(findStartableAssignmentForChildMock).toHaveBeenCalledWith('set-1', 'child-1')
    expect(abandonPreviousSessionsMock).toHaveBeenCalledWith('child-1')
    expect(createSessionMock).toHaveBeenCalledWith('child-1', ['q1', 'q2', 'q3'], 'set-1')
    expect(abandonPreviousSessionsMock.mock.invocationCallOrder[0]).toBeLessThan(
      createSessionMock.mock.invocationCallOrder[0],
    )
  })

  it('maps an unexpected failure to INTERNAL_ERROR instead of throwing', async () => {
    createSessionMock.mockRejectedValue(new Error('db down'))

    const result = await startAssignmentSessionAction('set-1')

    expect('error' in result && result.error.code).toBe('INTERNAL_ERROR')
  })
})

describe('getActiveAssignmentsState', () => {
  it('maps active assignments and falls back to schoolName when fullName is missing (D4)', async () => {
    getActiveAssignmentsForChildMock.mockResolvedValue([
      {
        id: 'set-1',
        title: 'Ôn tập tuần 3',
        dueAt: new Date('2026-07-30T00:00:00.000Z'),
        teacherAccount: { fullName: 'Cô Lan', schoolName: 'Tiểu học Kim Đồng' },
      },
      {
        id: 'set-2',
        title: 'Bài cũ hơn',
        dueAt: null,
        teacherAccount: { fullName: null, schoolName: 'Tiểu học Kim Đồng' },
      },
    ])

    const result = await getActiveAssignmentsState('child-1')

    expect(result).toEqual([
      { id: 'set-1', title: 'Ôn tập tuần 3', teacherName: 'Cô Lan', dueAt: new Date('2026-07-30T00:00:00.000Z') },
      { id: 'set-2', title: 'Bài cũ hơn', teacherName: 'Tiểu học Kim Đồng', dueAt: null },
    ])
  })
})
