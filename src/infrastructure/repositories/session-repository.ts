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
