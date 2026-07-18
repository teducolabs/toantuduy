import { headers } from 'next/headers'
import { getChildProfileId } from '@/lib/child-profile-cookie'
import { findChildProfileById, findChildProfileByIdForParent } from '@/infrastructure/repositories/child-profile-repository'
import type { ChildProfile } from '@prisma/client'

// Shared by the parent-surface root page (ownership-scoped, since a parent session exists) and
// the `(student)` layout (cookie-only trust boundary, per AD-5 — no parent session exists there).
export async function resolveActiveChildProfile(parentAccountId?: string): Promise<ChildProfile | null> {
  const childProfileId = await getChildProfileId(await headers())
  if (!childProfileId) return null

  return parentAccountId
    ? findChildProfileByIdForParent(childProfileId, parentAccountId)
    : findChildProfileById(childProfileId)
}
