import { db } from '@/lib/db'
import type { ChildProfile, GradeBand } from '@prisma/client'

export function listChildProfiles(parentAccountId: string): Promise<ChildProfile[]> {
  return db.childProfile.findMany({
    where: { parentAccountId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
}

export function findChildProfileById(id: string): Promise<ChildProfile | null> {
  return db.childProfile.findFirst({
    where: { id, deletedAt: null },
  })
}

export function findChildProfileByIdForParent(id: string, parentAccountId: string): Promise<ChildProfile | null> {
  return db.childProfile.findFirst({
    where: { id, parentAccountId, deletedAt: null },
  })
}

export function createChildProfile(parentAccountId: string, name: string, gradeBand: GradeBand): Promise<ChildProfile> {
  return db.childProfile.create({
    data: { parentAccountId, name, gradeBand },
  })
}

export async function updateChildProfile(
  id: string,
  parentAccountId: string,
  data: { name?: string; gradeBand?: GradeBand },
): Promise<ChildProfile | null> {
  return db.$transaction(async (tx) => {
    const result = await tx.childProfile.updateMany({
      where: { id, parentAccountId, deletedAt: null },
      data,
    })
    if (result.count === 0) return null
    return tx.childProfile.findUnique({ where: { id } })
  })
}

export async function softDeleteChildProfile(id: string, parentAccountId: string): Promise<ChildProfile | null> {
  return db.$transaction(async (tx) => {
    const result = await tx.childProfile.updateMany({
      where: { id, parentAccountId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    if (result.count === 0) return null
    return tx.childProfile.findUnique({ where: { id } })
  })
}
