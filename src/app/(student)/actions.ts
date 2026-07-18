'use server'

import { headers } from 'next/headers'
import { getChildProfileId } from '@/lib/child-profile-cookie'
import { findChildProfileById } from '@/infrastructure/repositories/child-profile-repository'
import { hasActiveSubscription } from '@/infrastructure/repositories/subscription-repository'
import { getFreeTierDailyAllotment } from '@/infrastructure/repositories/global-config-repository'
import {
  countQuestionsAnsweredToday,
  createSession,
  computeVnDayBoundaryUtc,
  formatVnDateLabel,
} from '@/infrastructure/repositories/session-repository'
import { selectSessionQuestionIds } from '@/app/(student)/session-question-selection'
import { student } from '@/locales/vi/student'

type ActionResult<T> = { data: T } | { error: { code: string; message: string } }

// Shared by startSessionAction (authoritative, on click) and
// getSessionStartGateState (read-only pre-check, at render time) so the
// subscription-bypass + allotment logic can't drift between the two callers.
async function isAllotmentExhausted(childProfileId: string, parentAccountId: string): Promise<boolean> {
  const subscribed = await hasActiveSubscription(parentAccountId)
  if (subscribed) return false

  const [allotment, answeredToday] = await Promise.all([
    getFreeTierDailyAllotment(),
    countQuestionsAnsweredToday(childProfileId),
  ])
  return answeredToday >= allotment
}

export async function startSessionAction(): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const childProfileId = await getChildProfileId(await headers())
    if (!childProfileId) {
      return { error: { code: 'UNAUTHORIZED', message: student.unauthorizedError } }
    }

    const childProfile = await findChildProfileById(childProfileId)
    if (!childProfile) {
      return { error: { code: 'UNAUTHORIZED', message: student.unauthorizedError } }
    }

    if (await isAllotmentExhausted(childProfile.id, childProfile.parentAccountId)) {
      return { error: { code: 'ALLOTMENT_EXHAUSTED', message: student.allotmentExhaustedError } }
    }

    const questionIds = await selectSessionQuestionIds(childProfile.id, childProfile.gradeBand)
    const session = await createSession(childProfile.id, questionIds)

    return { data: { sessionId: session.id } }
  } catch {
    return { error: { code: 'INTERNAL_ERROR', message: student.genericStartError } }
  }
}

// Read-only pre-check used by the student-home render (RootPage) to decide
// between the primary CTA and the free-tier-gate-card. startSessionAction
// repeats the authoritative check on click — a TOCTOU gap here is expected
// and handled by the client button surfacing ALLOTMENT_EXHAUSTED.
export async function getSessionStartGateState(
  childProfileId: string,
  parentAccountId: string,
): Promise<{ blocked: false } | { blocked: true; tomorrowLabel: string }> {
  if (!(await isAllotmentExhausted(childProfileId, parentAccountId))) {
    return { blocked: false }
  }

  const { todayEndUtc } = computeVnDayBoundaryUtc(new Date())
  return { blocked: true, tomorrowLabel: formatVnDateLabel(todayEndUtc) }
}
