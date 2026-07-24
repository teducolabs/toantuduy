'use server'

import { headers } from 'next/headers'
import { getChildProfileId } from '@/lib/child-profile-cookie'
import { findChildProfileById } from '@/infrastructure/repositories/child-profile-repository'
import { isAllotmentExhausted } from '@/infrastructure/repositories/subscription-repository'
import {
  abandonPreviousSessions,
  completeSession,
  createSession,
  computeVnDayBoundaryUtc,
  findActiveSession,
  formatVnDateLabel,
  recordAnswer,
} from '@/infrastructure/repositories/session-repository'
import {
  getActiveAssignmentsForChild,
  findStartableAssignmentForChild,
} from '@/infrastructure/repositories/assignment-set-repository'
import { selectSessionQuestionIds } from '@/app/(student)/session-question-selection'
import { db } from '@/lib/db'
import { student } from '@/locales/vi/student'

type ActionResult<T> = { data: T } | { error: { code: string; message: string } }

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

// D8: an assignment session is the set's fixed question list — no adaptive
// selection. Play/answer/complete/summary flows are reused untouched, so
// completion records a Session (with assignmentSetId) and every answer counts
// toward the free-tier allotment exactly like a normal session (A-1).
export async function startAssignmentSessionAction(assignmentSetId: string): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const childProfileId = await getChildProfileId(await headers())
    if (!childProfileId) {
      return { error: { code: 'UNAUTHORIZED', message: student.unauthorizedError } }
    }

    const childProfile = await findChildProfileById(childProfileId)
    if (!childProfile) {
      return { error: { code: 'UNAUTHORIZED', message: student.unauthorizedError } }
    }

    // One code for not-active/replaced/not-a-member — no information leak.
    const assignment = await findStartableAssignmentForChild(assignmentSetId, childProfile.id)
    if (!assignment) {
      return { error: { code: 'ASSIGNMENT_NOT_AVAILABLE', message: student.assignmentNotAvailableError } }
    }

    if (await isAllotmentExhausted(childProfile.id, childProfile.parentAccountId)) {
      return { error: { code: 'ALLOTMENT_EXHAUSTED', message: student.allotmentExhaustedError } }
    }

    await abandonPreviousSessions(childProfile.id)

    const questionIds = assignment.questions.map((question) => question.questionId)
    const session = await createSession(childProfile.id, questionIds, assignment.id)

    return { data: { sessionId: session.id } }
  } catch {
    return { error: { code: 'INTERNAL_ERROR', message: student.genericStartError } }
  }
}

// Server-side data loader for the student home (RootPage is a Server
// Component) — one card per active assignment, assignedAt desc from the repo.
export async function getActiveAssignmentsState(
  childProfileId: string,
): Promise<{ id: string; title: string; teacherName: string; dueAt: Date | null }[]> {
  const assignments = await getActiveAssignmentsForChild(childProfileId)
  return assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    teacherName: assignment.teacherAccount.fullName ?? assignment.teacherAccount.schoolName,
    dueAt: assignment.dueAt,
  }))
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
