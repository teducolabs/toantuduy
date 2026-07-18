import { db } from '@/lib/db'
import type { Question as PrismaQuestion } from '@prisma/client'
import type { Question } from '@/domain/entities/question'
import type { GradeBand } from '@/domain/entities/child-profile'

function toDomainQuestion(row: PrismaQuestion): Question {
  return {
    id: row.id,
    prompt: row.prompt,
    imageUrl: row.imageUrl,
    choices: row.choices,
    correctAnswer: row.correctAnswer,
    skillId: row.skillId,
    gradeBand: row.gradeBand,
    difficultyLevel: row.difficultyLevel,
  }
}

export async function getQuestionsForSession({
  gradeBand,
  skillIds,
  difficultyLevel,
}: {
  gradeBand: GradeBand
  skillIds?: string[]
  difficultyLevel?: number
}): Promise<Question[]> {
  const rows = await db.question.findMany({
    where: {
      gradeBand,
      ...(skillIds && skillIds.length > 0 ? { skillId: { in: skillIds } } : {}),
      ...(difficultyLevel !== undefined ? { difficultyLevel } : {}),
    },
  })
  return rows.map(toDomainQuestion)
}
