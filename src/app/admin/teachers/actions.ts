'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/app/admin/actions'
import {
  listPendingTeacherApplications,
  getTeacherApplicationById,
  markTeacherApplicationApproved,
  markTeacherApplicationRejected,
  type PendingTeacherApplication,
} from '@/infrastructure/repositories/teacher-account-repository'
import { sendTeacherApprovalEmail, sendTeacherRejectionEmail } from '@/infrastructure/email/resend'

type ActionResult<T> = { data: T } | { error: { code: string; message: string } }

export async function getPendingTeachersAction(): Promise<ActionResult<{ applications: PendingTeacherApplication[] }>> {
  const resolved = await requireAdmin()
  if ('error' in resolved) return resolved

  try {
    const applications = await listPendingTeacherApplications()
    return { data: { applications } }
  } catch {
    return { error: { code: 'LOAD_FAILED', message: 'Could not load pending applications' } }
  }
}

const approveSchema = z.object({ teacherAccountId: z.string().min(1) })

export async function approveTeacherAction(input: { teacherAccountId: string }): Promise<ActionResult<{ teacherAccountId: string }>> {
  const resolved = await requireAdmin()
  if ('error' in resolved) return resolved

  const parsed = approveSchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  try {
    // One findUnique serves both the email payload and the D1 disambiguation.
    const application = await getTeacherApplicationById(parsed.data.teacherAccountId)
    if (!application) {
      return { error: { code: 'NOT_FOUND', message: 'Teacher application not found' } }
    }

    const count = await markTeacherApplicationApproved(parsed.data.teacherAccountId)
    if (count === 0) {
      return { error: { code: 'ALREADY_PROCESSED', message: 'Application was already processed' } }
    }

    // Best-effort (D2): a failed email must never roll back or fail the approval.
    const emailResult = await sendTeacherApprovalEmail(application.user.email, application.fullName ?? '')
    if ('error' in emailResult) {
      console.error('Teacher approval email failed', { teacherAccountId: parsed.data.teacherAccountId })
    }

    revalidatePath('/admin/teachers')
    return { data: { teacherAccountId: parsed.data.teacherAccountId } }
  } catch {
    return { error: { code: 'UPDATE_FAILED', message: 'Could not approve teacher' } }
  }
}

const rejectSchema = z.object({
  teacherAccountId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
})

export async function rejectTeacherAction(input: {
  teacherAccountId: string
  reason?: string
}): Promise<ActionResult<{ teacherAccountId: string }>> {
  const resolved = await requireAdmin()
  if ('error' in resolved) return resolved

  const parsed = rejectSchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  try {
    const application = await getTeacherApplicationById(parsed.data.teacherAccountId)
    if (!application) {
      return { error: { code: 'NOT_FOUND', message: 'Teacher application not found' } }
    }

    const reason = parsed.data.reason || null
    const count = await markTeacherApplicationRejected(parsed.data.teacherAccountId, reason)
    if (count === 0) {
      return { error: { code: 'ALREADY_PROCESSED', message: 'Application was already processed' } }
    }

    // Best-effort (D2): a failed email must never roll back or fail the rejection.
    const emailResult = await sendTeacherRejectionEmail(application.user.email, application.fullName ?? '', reason ?? '')
    if ('error' in emailResult) {
      console.error('Teacher rejection email failed', { teacherAccountId: parsed.data.teacherAccountId })
    }

    revalidatePath('/admin/teachers')
    return { data: { teacherAccountId: parsed.data.teacherAccountId } }
  } catch {
    return { error: { code: 'UPDATE_FAILED', message: 'Could not reject teacher' } }
  }
}
