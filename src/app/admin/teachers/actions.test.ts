import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/teacher-account-repository', () => ({
  listPendingTeacherApplications: vi.fn(),
  getTeacherApplicationById: vi.fn(),
  markTeacherApplicationApproved: vi.fn(),
  markTeacherApplicationRejected: vi.fn(),
}))
vi.mock('@/infrastructure/email/resend', () => ({
  sendTeacherApprovalEmail: vi.fn(),
  sendTeacherRejectionEmail: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/lib/auth'
import {
  listPendingTeacherApplications,
  getTeacherApplicationById,
  markTeacherApplicationApproved,
  markTeacherApplicationRejected,
} from '@/infrastructure/repositories/teacher-account-repository'
import { sendTeacherApprovalEmail, sendTeacherRejectionEmail } from '@/infrastructure/email/resend'
import { revalidatePath } from 'next/cache'
import { getPendingTeachersAction, approveTeacherAction, rejectTeacherAction } from './actions'

const authMock = auth as unknown as ReturnType<typeof vi.fn>
const listPendingMock = listPendingTeacherApplications as unknown as ReturnType<typeof vi.fn>
const getByIdMock = getTeacherApplicationById as unknown as ReturnType<typeof vi.fn>
const markApprovedMock = markTeacherApplicationApproved as unknown as ReturnType<typeof vi.fn>
const markRejectedMock = markTeacherApplicationRejected as unknown as ReturnType<typeof vi.fn>
const approvalEmailMock = sendTeacherApprovalEmail as unknown as ReturnType<typeof vi.fn>
const rejectionEmailMock = sendTeacherRejectionEmail as unknown as ReturnType<typeof vi.fn>
const revalidatePathMock = revalidatePath as unknown as ReturnType<typeof vi.fn>

const pendingApplication = {
  id: 'teacher-1',
  fullName: 'Cô Lan',
  schoolName: 'Tiểu học Kim Đồng',
  gradeTaught: 'GRADE_1',
  createdAt: new Date('2026-07-20T00:00:00Z'),
  status: 'PENDING',
  user: { email: 'lan@example.test' },
}

beforeEach(() => {
  authMock.mockReset()
  listPendingMock.mockReset()
  getByIdMock.mockReset()
  markApprovedMock.mockReset()
  markRejectedMock.mockReset()
  approvalEmailMock.mockReset()
  rejectionEmailMock.mockReset()
  revalidatePathMock.mockReset()

  authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
  getByIdMock.mockResolvedValue(pendingApplication)
  markApprovedMock.mockResolvedValue(1)
  markRejectedMock.mockResolvedValue(1)
  approvalEmailMock.mockResolvedValue({ data: { id: 'email-1' } })
  rejectionEmailMock.mockResolvedValue({ data: { id: 'email-1' } })
})

const unauthorizedMatrix: [string, () => void][] = [
  ['no session', () => authMock.mockResolvedValue(null)],
  ['PARENT role', () => authMock.mockResolvedValue({ user: { id: 'user-1', role: 'PARENT' } })],
  ['TEACHER role', () => authMock.mockResolvedValue({ user: { id: 'user-1', role: 'TEACHER' } })],
]

describe('getPendingTeachersAction', () => {
  it('returns the pending applications for an admin', async () => {
    listPendingMock.mockResolvedValueOnce([pendingApplication])

    const result = await getPendingTeachersAction()

    expect('data' in result && result.data.applications).toHaveLength(1)
  })

  it('returns LOAD_FAILED when the repository throws', async () => {
    listPendingMock.mockRejectedValueOnce(new Error('db down'))

    const result = await getPendingTeachersAction()

    expect('error' in result && result.error.code).toBe('LOAD_FAILED')
  })

  it.each(unauthorizedMatrix)('rejects with UNAUTHORIZED when %s (AD-10)', async (_label, arrange) => {
    arrange()

    const result = await getPendingTeachersAction()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
    expect(listPendingMock).not.toHaveBeenCalled()
  })
})

describe('approveTeacherAction', () => {
  it('approves, emails the teacher via user.email, and revalidates the queue', async () => {
    const result = await approveTeacherAction({ teacherAccountId: 'teacher-1' })

    expect('data' in result && result.data.teacherAccountId).toBe('teacher-1')
    expect(markApprovedMock).toHaveBeenCalledWith('teacher-1')
    expect(approvalEmailMock).toHaveBeenCalledWith('lan@example.test', 'Cô Lan')
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/teachers')
  })

  it('passes an empty name to the email when fullName is null (D4)', async () => {
    getByIdMock.mockResolvedValueOnce({ ...pendingApplication, fullName: null })

    await approveTeacherAction({ teacherAccountId: 'teacher-1' })

    expect(approvalEmailMock).toHaveBeenCalledWith('lan@example.test', '')
  })

  it('returns NOT_FOUND when the application row is missing — no email, no revalidate', async () => {
    getByIdMock.mockResolvedValueOnce(null)

    const result = await approveTeacherAction({ teacherAccountId: 'ghost' })

    expect('error' in result && result.error.code).toBe('NOT_FOUND')
    expect(markApprovedMock).not.toHaveBeenCalled()
    expect(approvalEmailMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('returns ALREADY_PROCESSED when the guarded update matches nothing (AC #5) — no email', async () => {
    getByIdMock.mockResolvedValueOnce({ ...pendingApplication, status: 'APPROVED' })
    markApprovedMock.mockResolvedValueOnce(0)

    const result = await approveTeacherAction({ teacherAccountId: 'teacher-1' })

    expect('error' in result && result.error.code).toBe('ALREADY_PROCESSED')
    expect(approvalEmailMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('still returns data when the email send fails (D2 — best-effort)', async () => {
    approvalEmailMock.mockResolvedValueOnce({ error: { code: 'EMAIL_SEND_FAILED' } })

    const result = await approveTeacherAction({ teacherAccountId: 'teacher-1' })

    expect('data' in result).toBe(true)
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/teachers')
  })

  it('returns UPDATE_FAILED when the DB throws', async () => {
    markApprovedMock.mockRejectedValueOnce(new Error('db down'))

    const result = await approveTeacherAction({ teacherAccountId: 'teacher-1' })

    expect('error' in result && result.error.code).toBe('UPDATE_FAILED')
  })

  it('returns VALIDATION_ERROR for an empty id', async () => {
    const result = await approveTeacherAction({ teacherAccountId: '' })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
    expect(getByIdMock).not.toHaveBeenCalled()
  })

  it.each(unauthorizedMatrix)('rejects with UNAUTHORIZED when %s (AD-10)', async (_label, arrange) => {
    arrange()

    const result = await approveTeacherAction({ teacherAccountId: 'teacher-1' })

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
    expect(markApprovedMock).not.toHaveBeenCalled()
  })
})

describe('rejectTeacherAction', () => {
  it('rejects with a reason: persists it and passes it to the email', async () => {
    const result = await rejectTeacherAction({ teacherAccountId: 'teacher-1', reason: 'Thiếu thông tin trường học' })

    expect('data' in result && result.data.teacherAccountId).toBe('teacher-1')
    expect(markRejectedMock).toHaveBeenCalledWith('teacher-1', 'Thiếu thông tin trường học')
    expect(rejectionEmailMock).toHaveBeenCalledWith('lan@example.test', 'Cô Lan', 'Thiếu thông tin trường học')
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/teachers')
  })

  it('rejects without a reason: persists null and passes an empty string to the email (D5)', async () => {
    const result = await rejectTeacherAction({ teacherAccountId: 'teacher-1' })

    expect('data' in result).toBe(true)
    expect(markRejectedMock).toHaveBeenCalledWith('teacher-1', null)
    expect(rejectionEmailMock).toHaveBeenCalledWith('lan@example.test', 'Cô Lan', '')
  })

  it('treats a whitespace-only reason as no reason', async () => {
    await rejectTeacherAction({ teacherAccountId: 'teacher-1', reason: '   ' })

    expect(markRejectedMock).toHaveBeenCalledWith('teacher-1', null)
    expect(rejectionEmailMock).toHaveBeenCalledWith('lan@example.test', 'Cô Lan', '')
  })

  it('returns NOT_FOUND when the application row is missing — no email', async () => {
    getByIdMock.mockResolvedValueOnce(null)

    const result = await rejectTeacherAction({ teacherAccountId: 'ghost' })

    expect('error' in result && result.error.code).toBe('NOT_FOUND')
    expect(markRejectedMock).not.toHaveBeenCalled()
    expect(rejectionEmailMock).not.toHaveBeenCalled()
  })

  it('returns ALREADY_PROCESSED when the guarded update matches nothing (AC #5) — no email', async () => {
    getByIdMock.mockResolvedValueOnce({ ...pendingApplication, status: 'REJECTED' })
    markRejectedMock.mockResolvedValueOnce(0)

    const result = await rejectTeacherAction({ teacherAccountId: 'teacher-1' })

    expect('error' in result && result.error.code).toBe('ALREADY_PROCESSED')
    expect(rejectionEmailMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('still returns data when the email send fails (D2 — best-effort)', async () => {
    rejectionEmailMock.mockResolvedValueOnce({ error: { code: 'EMAIL_SEND_FAILED' } })

    const result = await rejectTeacherAction({ teacherAccountId: 'teacher-1' })

    expect('data' in result).toBe(true)
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/teachers')
  })

  it('returns VALIDATION_ERROR when the reason exceeds 500 characters', async () => {
    const result = await rejectTeacherAction({ teacherAccountId: 'teacher-1', reason: 'a'.repeat(501) })

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
    expect(getByIdMock).not.toHaveBeenCalled()
  })

  it('returns UPDATE_FAILED when the DB throws', async () => {
    markRejectedMock.mockRejectedValueOnce(new Error('db down'))

    const result = await rejectTeacherAction({ teacherAccountId: 'teacher-1' })

    expect('error' in result && result.error.code).toBe('UPDATE_FAILED')
  })

  it.each(unauthorizedMatrix)('rejects with UNAUTHORIZED when %s (AD-10)', async (_label, arrange) => {
    arrange()

    const result = await rejectTeacherAction({ teacherAccountId: 'teacher-1' })

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
    expect(markRejectedMock).not.toHaveBeenCalled()
  })
})
