'use server'

import { requireParentAccountId } from '@/app/(parent)/profiles/actions'
import { findChildProfileByIdForParent } from '@/infrastructure/repositories/child-profile-repository'
import {
  getWeeklyActivity,
  getCurrentStreak,
  getSkillBreakdown,
  getSkillSessionDetail,
  type WeeklyActivity,
  type SkillBreakdownRow,
  type SkillSessionDetail,
} from '@/infrastructure/repositories/dashboard-repository'

export async function getDashboardDataAction(
  childProfileId: string,
): Promise<
  | { data: { weeklyActivity: WeeklyActivity; skillBreakdown: SkillBreakdownRow[] } }
  | { error: { code: string; message: string } }
> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const childProfile = await findChildProfileByIdForParent(childProfileId, resolved.parentAccountId)
  if (!childProfile) {
    return { error: { code: 'FORBIDDEN', message: 'Child profile does not belong to this account' } }
  }

  const [weekly, streakResult, skillBreakdown] = await Promise.all([
    getWeeklyActivity(childProfileId),
    getCurrentStreak(childProfileId),
    getSkillBreakdown(childProfileId),
  ])

  return { data: { weeklyActivity: { ...weekly, ...streakResult }, skillBreakdown } }
}

export async function getSkillDetailAction(
  childProfileId: string,
  skillId: string,
): Promise<{ data: { sessions: SkillSessionDetail[] } } | { error: { code: string; message: string } }> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const childProfile = await findChildProfileByIdForParent(childProfileId, resolved.parentAccountId)
  if (!childProfile) {
    return { error: { code: 'FORBIDDEN', message: 'Child profile does not belong to this account' } }
  }

  const sessions = await getSkillSessionDetail(childProfileId, skillId)
  return { data: { sessions } }
}
