import { db } from '@/lib/db'
import type { GradeBand, TeacherStatus } from '@prisma/client'

export type PendingTeacherApplication = {
  id: string
  fullName: string | null
  schoolName: string
  gradeTaught: GradeBand
  createdAt: Date
  user: { email: string }
}

export type TeacherApplication = PendingTeacherApplication & { status: TeacherStatus }

const applicationSelect = {
  id: true,
  fullName: true,
  schoolName: true,
  gradeTaught: true,
  createdAt: true,
  user: { select: { email: true } },
} as const

export function listPendingTeacherApplications(): Promise<PendingTeacherApplication[]> {
  return db.teacherAccount.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: applicationSelect,
  })
}

export function getTeacherApplicationById(id: string): Promise<TeacherApplication | null> {
  return db.teacherAccount.findUnique({
    where: { id },
    select: { ...applicationSelect, status: true },
  })
}

// Idempotency via atomic status-guarded update (D1): count 1 → processed,
// count 0 → caller disambiguates NOT_FOUND vs ALREADY_PROCESSED.
export async function markTeacherApplicationApproved(id: string): Promise<number> {
  const { count } = await db.teacherAccount.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'APPROVED', rejectedReason: null },
  })
  return count
}

export async function markTeacherApplicationRejected(id: string, reason: string | null): Promise<number> {
  const { count } = await db.teacherAccount.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'REJECTED', rejectedReason: reason },
  })
  return count
}
