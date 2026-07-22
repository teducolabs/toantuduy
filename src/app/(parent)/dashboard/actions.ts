'use server'

import { requireParentAccountId } from '@/app/(parent)/profiles/actions'
import { findChildProfileByIdForParent } from '@/infrastructure/repositories/child-profile-repository'
import { getWeeklyActivity, getCurrentStreak, type WeeklyActivity } from '@/infrastructure/repositories/dashboard-repository'

export async function getDashboardDataAction(
  childProfileId: string,
): Promise<{ data: { weeklyActivity: WeeklyActivity } } | { error: { code: string; message: string } }> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const childProfile = await findChildProfileByIdForParent(childProfileId, resolved.parentAccountId)
  if (!childProfile) {
    return { error: { code: 'FORBIDDEN', message: 'Child profile does not belong to this account' } }
  }

  const [weekly, streakResult] = await Promise.all([
    getWeeklyActivity(childProfileId),
    getCurrentStreak(childProfileId),
  ])

  return { data: { weeklyActivity: { ...weekly, ...streakResult } } }
}
