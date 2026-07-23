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

// Lean teacher-facing shape for the assignment builder's question browser —
// deliberately excludes correctAnswer/choices so they never ship to the teacher client.
export type QuestionLibraryItem = {
  id: string
  prompt: string
  skillCode: string
  skillName: string
  difficultyLevel: number
}

export async function listQuestionsForLibrary({
  gradeBand,
  skillId,
}: {
  gradeBand: GradeBand
  skillId?: string
}): Promise<QuestionLibraryItem[]> {
  const rows = await db.question.findMany({
    where: { gradeBand, ...(skillId ? { skillId } : {}) },
    include: { skill: { select: { id: true, code: true, name: true } } },
    orderBy: [{ skillId: 'asc' }, { difficultyLevel: 'asc' }],
  })
  return rows.map((row) => ({
    id: row.id,
    prompt: row.prompt,
    skillCode: row.skill.code,
    skillName: row.skill.name,
    difficultyLevel: row.difficultyLevel,
  }))
}

export function listSkills(): Promise<{ id: string; code: string; name: string }[]> {
  return db.skill.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, code: true, name: true },
  })
}

// Integrity helper for createAssignmentSetDraftAction: all submitted ids must
// exist AND belong to the submitted grade band (count must equal ids.length).
export function countQuestionsInGradeBand(questionIds: string[], gradeBand: GradeBand): Promise<number> {
  return db.question.count({ where: { id: { in: questionIds }, gradeBand } })
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
