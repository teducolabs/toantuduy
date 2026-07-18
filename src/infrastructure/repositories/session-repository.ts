import { db } from '@/lib/db'
import type { Session as PrismaSession } from '@prisma/client'
import type { Session } from '@/domain/entities/session'
import type { SkillAccuracyWindow } from '@/domain/entities/skill-accuracy-window'
import { WINDOW_SIZE } from '@/domain/constants'

function toDomainSession(row: PrismaSession): Session {
  return {
    id: row.id,
    childProfileId: row.childProfileId,
    completedAt: row.completedAt?.toISOString() ?? null,
    questionCount: row.questionCount,
    correctCount: row.correctCount,
  }
}

export async function createSession(childProfileId: string, questionIds: string[]): Promise<Session> {
  const session = await db.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: { childProfileId, questionCount: questionIds.length },
    })
    await tx.sessionAnswer.createMany({
      data: questionIds.map((questionId) => ({
        sessionId: created.id,
        questionId,
        answeredCorrectly: null,
        difficultyLevelAtAnswer: null,
        answeredAt: null,
      })),
    })
    return created
  })
  return toDomainSession(session)
}

export async function recordAnswer(
  sessionAnswerId: string,
  answeredCorrectly: boolean,
  difficultyLevelAtAnswer: number,
): Promise<void> {
  await db.sessionAnswer.update({
    where: { id: sessionAnswerId },
    data: { answeredCorrectly, difficultyLevelAtAnswer, answeredAt: new Date() },
  })
}

export async function completeSession(sessionId: string): Promise<Session> {
  const session = await db.$transaction(async (tx) => {
    const correctCount = await tx.sessionAnswer.count({
      where: { sessionId, answeredCorrectly: true },
    })
    return tx.session.update({
      where: { id: sessionId },
      data: { completedAt: new Date(), correctCount },
    })
  })
  return toDomainSession(session)
}

// Asia/Ho_Chi_Minh is a fixed UTC+7 offset (no DST) — plain millisecond
// arithmetic, no Intl.DateTimeFormat timezone conversion needed.
const VN_OFFSET_MS = 7 * 3600_000

export function computeVnDayBoundaryUtc(now: Date): { todayStartUtc: Date; todayEndUtc: Date } {
  const nowVn = new Date(now.getTime() + VN_OFFSET_MS)
  const vnMidnightUtcMs = Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate()) - VN_OFFSET_MS
  const todayStartUtc = new Date(vnMidnightUtcMs)
  const todayEndUtc = new Date(vnMidnightUtcMs + 24 * 3600_000)
  return { todayStartUtc, todayEndUtc }
}

// Formats a UTC instant that represents a VN calendar-day boundary (e.g.
// `todayEndUtc` from computeVnDayBoundaryUtc) as a `dd/MM/yyyy` VN date label.
export function formatVnDateLabel(instantUtc: Date): string {
  const vnInstant = new Date(instantUtc.getTime() + VN_OFFSET_MS)
  const day = String(vnInstant.getUTCDate()).padStart(2, '0')
  const month = String(vnInstant.getUTCMonth() + 1).padStart(2, '0')
  const year = vnInstant.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export async function countQuestionsAnsweredToday(childProfileId: string): Promise<number> {
  const { todayStartUtc, todayEndUtc } = computeVnDayBoundaryUtc(new Date())
  return db.sessionAnswer.count({
    where: {
      session: { childProfileId },
      answeredAt: { gte: todayStartUtc, lt: todayEndUtc },
    },
  })
}

export async function getSkillAccuracyHistory(childProfileId: string, skillId: string): Promise<SkillAccuracyWindow> {
  const rows = await db.sessionAnswer.findMany({
    where: {
      answeredCorrectly: { not: null },
      session: { childProfileId, completedAt: { not: null } },
      question: { skillId },
    },
    orderBy: { answeredAt: 'desc' },
    take: WINDOW_SIZE,
  })
  return {
    skillId,
    answers: rows.reverse().map((row) => row.answeredCorrectly as boolean),
  }
}
