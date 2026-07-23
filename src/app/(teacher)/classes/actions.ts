'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateJoinCode } from '@/lib/join-code'
import {
  listClassesForTeacher,
  createClass,
  getClassDetail,
  type ClassWithStudentCount,
  type ClassDetail,
} from '@/infrastructure/repositories/class-repository'
import type { Class } from '@prisma/client'

type ActionResult<T> = { data: T } | { error: { code: string; message: string } }

const JOIN_CODE_CREATE_ATTEMPTS = 5

function isJoinCodeCollision(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const known = error as { code?: string; meta?: { target?: unknown } }
  if (known.code !== 'P2002') return false
  const target = known.meta?.target
  return Array.isArray(target) ? target.includes('joinCode') : String(target ?? '').includes('joinCode')
}

// AD-6 dual gate: the JWT role alone is insufficient — every teacher action
// must also verify TeacherAccount.status === 'APPROVED' server-side.
export async function requireTeacherAccountId(): Promise<{ teacherAccountId: string } | { error: { code: string; message: string } }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'TEACHER') {
    return { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }
  }

  const teacherAccount = await db.teacherAccount.findUnique({ where: { userId: session.user.id } })
  if (!teacherAccount || teacherAccount.status !== 'APPROVED') {
    return { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }
  }

  return { teacherAccountId: teacherAccount.id }
}

const createClassSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name too long'),
  gradeBand: z.enum(['GRADE_1', 'GRADE_2', 'GRADE_3']),
})

export async function createClassAction(input: {
  name: string
  gradeBand: 'GRADE_1' | 'GRADE_2' | 'GRADE_3'
}): Promise<ActionResult<{ class: Class }>> {
  const resolved = await requireTeacherAccountId()
  if ('error' in resolved) return resolved

  const parsed = createClassSchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  try {
    for (let attempt = 1; ; attempt++) {
      try {
        const created = await createClass(resolved.teacherAccountId, parsed.data.name, parsed.data.gradeBand, generateJoinCode())
        revalidatePath('/classes')
        return { data: { class: created } }
      } catch (error) {
        if (!isJoinCodeCollision(error) || attempt >= JOIN_CODE_CREATE_ATTEMPTS) throw error
      }
    }
  } catch {
    return { error: { code: 'CREATE_FAILED', message: 'Could not create class' } }
  }
}

export async function getClassesAction(): Promise<ActionResult<{ classes: ClassWithStudentCount[] }>> {
  const resolved = await requireTeacherAccountId()
  if ('error' in resolved) return resolved

  const classList = await listClassesForTeacher(resolved.teacherAccountId)
  return { data: { classes: classList } }
}

const classDetailSchema = z.object({ classId: z.string().min(1) })

export async function getClassDetailAction(input: { classId: string }): Promise<ActionResult<{ class: ClassDetail }>> {
  const resolved = await requireTeacherAccountId()
  if ('error' in resolved) return resolved

  const parsed = classDetailSchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  const classDetail = await getClassDetail(parsed.data.classId, resolved.teacherAccountId)
  if (!classDetail) {
    return { error: { code: 'NOT_FOUND', message: 'Class not found' } }
  }

  return { data: { class: classDetail } }
}
