'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  listChildProfiles,
  createChildProfile,
  updateChildProfile,
  softDeleteChildProfile,
} from '@/infrastructure/repositories/child-profile-repository'
import type { ChildProfile, GradeBand } from '@prisma/client'

type ActionResult<T> = { data: T } | { error: { code: string; message: string } }

async function requireParentAccountId(): Promise<{ parentAccountId: string } | { error: { code: string; message: string } }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'PARENT') {
    return { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }
  }

  const parentAccount = await db.parentAccount.findUnique({ where: { userId: session.user.id } })
  if (!parentAccount) {
    return { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }
  }

  return { parentAccountId: parentAccount.id }
}

const gradeBandSchema = z.enum(['GRADE_1', 'GRADE_2', 'GRADE_3'])

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name too long'),
  gradeBand: gradeBandSchema,
})

export async function listChildProfilesAction(): Promise<ActionResult<{ childProfiles: ChildProfile[] }>> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const childProfiles = await listChildProfiles(resolved.parentAccountId)
  return { data: { childProfiles } }
}

export async function createChildProfileAction(input: {
  name: string
  gradeBand: 'GRADE_1' | 'GRADE_2' | 'GRADE_3'
}): Promise<ActionResult<{ childProfile: ChildProfile }>> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  const childProfile = await createChildProfile(resolved.parentAccountId, parsed.data.name, parsed.data.gradeBand)

  revalidatePath('/profiles', 'layout')

  return { data: { childProfile } }
}

const updateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1, 'Name is required').max(50, 'Name too long').optional(),
    gradeBand: gradeBandSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.gradeBand !== undefined, {
    message: 'At least one field must be provided',
  })

export async function updateChildProfileAction(input: {
  id: string
  name?: string
  gradeBand?: GradeBand
}): Promise<ActionResult<{ childProfile: ChildProfile }>> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  const { id, ...data } = parsed.data
  const childProfile = await updateChildProfile(id, resolved.parentAccountId, data)
  if (!childProfile) {
    return { error: { code: 'NOT_FOUND', message: 'Child profile not found' } }
  }

  revalidatePath('/profiles', 'layout')

  return { data: { childProfile } }
}

const deleteSchema = z.object({ id: z.string().min(1) })

export async function deleteChildProfileAction(input: { id: string }): Promise<ActionResult<{ childProfile: ChildProfile }>> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const parsed = deleteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } }
  }

  const childProfile = await softDeleteChildProfile(parsed.data.id, resolved.parentAccountId)
  if (!childProfile) {
    return { error: { code: 'NOT_FOUND', message: 'Child profile not found' } }
  }

  revalidatePath('/profiles', 'layout')

  return { data: { childProfile } }
}
