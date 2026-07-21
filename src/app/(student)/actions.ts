'use server'

import { headers } from 'next/headers'
import { getChildProfileId } from '@/lib/child-profile-cookie'
import { findChildProfileById } from '@/infrastructure/repositories/child-profile-repository'
import { hasActiveSubscription } from '@/infrastructure/repositories/subscription-repository'
import { getFreeTierDailyAllotment } from '@/infrastructure/repositories/global-config-repository'
import {
  abandonPreviousSessions,
  completeSession,
  countQuestionsAnsweredToday,
  createSession,
  computeVnDayBoundaryUtc,
  findActiveSession,
  formatVnDateLabel,
  recordAnswer,
} from '@/infrastructure/repositories/session-repository'
import { selectSessionQuestionIds } from '@/app/(student)/session-question-selection'
import { db } from '@/lib/db'
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

    await abandonPreviousSessions(childProfile.id)

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

// Read-only pre-check used by the student-home render (RootPage) to decide
// whether to show the resume CTA. Must be checked before getSessionStartGateState
// so an in-progress session is always resumable regardless of the free-tier gate.
export async function getActiveSessionState(
  childProfileId: string,
): Promise<{ sessionId: string; progressLabel: string } | null> {
  const session = await findActiveSession(childProfileId)
  if (!session) return null
  return {
    sessionId: session.id,
    progressLabel: student.resumeProgressLabel(session.answeredCount, session.questionCount),
  }
}

export async function submitAnswerAction(
  sessionAnswerId: string,
  selectedChoice: string,
): Promise<ActionResult<{ correct: boolean; correctAnswer: string }>> {
  try {
    const childProfileId = await getChildProfileId(await headers())
    if (!childProfileId) {
      return { error: { code: 'UNAUTHORIZED', message: student.unauthorizedError } }
    }

    const sessionAnswer = await db.sessionAnswer.findUnique({
      where: { id: sessionAnswerId },
      include: { session: true, question: true },
    })
    if (
      !sessionAnswer ||
      sessionAnswer.session.childProfileId !== childProfileId ||
      sessionAnswer.session.abandonedAt !== null
    ) {
      return { error: { code: 'UNAUTHORIZED', message: student.unauthorizedError } }
    }

    if (sessionAnswer.answeredAt !== null) {
      return { error: { code: 'ALREADY_ANSWERED', message: student.alreadyAnsweredError } }
    }

    const answeredCorrectly = selectedChoice === sessionAnswer.question.correctAnswer
    const recorded = await recordAnswer(sessionAnswerId, answeredCorrectly, sessionAnswer.question.difficultyLevel)
    if (!recorded) {
      return { error: { code: 'ALREADY_ANSWERED', message: student.alreadyAnsweredError } }
    }

    // Safe to reveal: recordAnswer has already atomically committed this
    // answer (updateMany where answeredAt: null), so the value cannot be
    // used to answer. Error paths above return no answer data.
    return { data: { correct: answeredCorrectly, correctAnswer: sessionAnswer.question.correctAnswer } }
  } catch {
    return { error: { code: 'INTERNAL_ERROR', message: student.genericSubmitAnswerError } }
  }
}

export async function completeSessionAction(sessionId: string): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const childProfileId = await getChildProfileId(await headers())
    if (!childProfileId) {
      return { error: { code: 'UNAUTHORIZED', message: student.unauthorizedError } }
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { answers: { select: { answeredAt: true } } },
    })
    if (!session || session.childProfileId !== childProfileId || session.abandonedAt !== null) {
      return { error: { code: 'UNAUTHORIZED', message: student.unauthorizedError } }
    }

    // Idempotent success: a double-tap, refresh, or stale tab must still
    // land on the summary — there is nothing left to protect here.
    if (session.completedAt !== null) {
      return { data: { sessionId } }
    }

    // Application-layer completion policy (closes the Story 3.2 deferral):
    // a session with unanswered stubs cannot be completed. Only reachable
    // via manipulated/stale clients — the UI gates "Tiếp theo →" on the
    // final answer.
    if (session.answers.some((answer) => answer.answeredAt === null)) {
      return { error: { code: 'SESSION_NOT_FINISHED', message: student.sessionNotFinishedError } }
    }

    await completeSession(sessionId)

    return { data: { sessionId } }
  } catch {
    return { error: { code: 'INTERNAL_ERROR', message: student.genericCompleteSessionError } }
  }
}
