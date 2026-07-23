'use server'

import { requireParentAccountId } from '@/app/(parent)/profiles/actions'
import { findChildProfileByIdForParent } from '@/infrastructure/repositories/child-profile-repository'
import { isAllotmentExhausted } from '@/infrastructure/repositories/subscription-repository'
import {
  getWeeklyActivity,
  getCurrentStreak,
  getSkillBreakdown,
  getSkillSessionDetail,
  getGradeProgress,
  getSessionHistory,
  type WeeklyActivity,
  type SkillBreakdownRow,
  type SkillSessionDetail,
  type SessionHistoryRow,
} from '@/infrastructure/repositories/dashboard-repository'
import type { GradeBand } from '@prisma/client'

export type DashboardDataResult =
  | {
      data: {
        weeklyActivity: WeeklyActivity
        skillBreakdown: SkillBreakdownRow[]
        gradeProgress: 'early' | 'mid' | 'late' | null
        gradeBand: GradeBand
        sessionHistory: SessionHistoryRow[]
        childName: string
        showUpsellBanner: boolean
      }
    }
  | { error: { code: string; message: string } }

export async function getDashboardDataAction(childProfileId: string): Promise<DashboardDataResult> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const childProfile = await findChildProfileByIdForParent(childProfileId, resolved.parentAccountId)
  if (!childProfile) {
    return { error: { code: 'FORBIDDEN', message: 'Child profile does not belong to this account' } }
  }

  const [weekly, streakResult, skillBreakdown, gradeProgress, sessionHistory, showUpsellBanner] = await Promise.all([
    getWeeklyActivity(childProfileId),
    getCurrentStreak(childProfileId),
    getSkillBreakdown(childProfileId),
    getGradeProgress(childProfileId),
    getSessionHistory(childProfileId, { skip: 0 }),
    isAllotmentExhausted(childProfileId, resolved.parentAccountId),
  ])

  return {
    data: {
      weeklyActivity: { ...weekly, ...streakResult },
      skillBreakdown,
      gradeProgress,
      gradeBand: childProfile.gradeBand,
      sessionHistory,
      childName: childProfile.name,
      showUpsellBanner,
    },
  }
}

export async function getMoreSessionHistoryAction(
  childProfileId: string,
  skip: number,
): Promise<{ data: { sessions: SessionHistoryRow[] } } | { error: { code: string; message: string } }> {
  const resolved = await requireParentAccountId()
  if ('error' in resolved) return resolved

  const childProfile = await findChildProfileByIdForParent(childProfileId, resolved.parentAccountId)
  if (!childProfile) {
    return { error: { code: 'FORBIDDEN', message: 'Child profile does not belong to this account' } }
  }

  const sessions = await getSessionHistory(childProfileId, { skip })
  return { data: { sessions } }
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
