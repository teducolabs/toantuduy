import { getQuestionsForSession } from '@/infrastructure/repositories/question-repository'
import { getSkillAccuracyHistory } from '@/infrastructure/repositories/session-repository'
import { getSessionQuestionCount } from '@/infrastructure/repositories/global-config-repository'
import { selectNextQuestion } from '@/domain/use-cases/adaptive-difficulty'
import type { SkillAccuracyWindow } from '@/domain/entities/skill-accuracy-window'
import type { Question } from '@/domain/entities/question'
import type { GradeBand } from '@/domain/entities/child-profile'

// Pure loop: repeatedly calls `pickNext`, stripping the chosen Question from
// the pool each time so no Question repeats within one Session (AC #8).
// Guards remainingPool.length on every iteration, including the first, since
// a Grade Band can have zero eligible Questions and selectNextQuestion throws
// on an empty array.
export function buildSessionQuestionIds(
  pool: Question[],
  skillAccuracyHistory: SkillAccuracyWindow[],
  sessionQuestionCount: number,
  pickNext: (history: SkillAccuracyWindow[], availableQuestions: Question[]) => Question = selectNextQuestion,
): string[] {
  const questionIds: string[] = []
  let remainingPool = pool
  for (let i = 0; i < sessionQuestionCount; i++) {
    if (remainingPool.length === 0) break
    const picked = pickNext(skillAccuracyHistory, remainingPool)
    questionIds.push(picked.id)
    remainingPool = remainingPool.filter((q) => q.id !== picked.id)
  }
  return questionIds
}

export async function selectSessionQuestionIds(childProfileId: string, gradeBand: GradeBand): Promise<string[]> {
  const pool = await getQuestionsForSession({ gradeBand })
  const skillIds = Array.from(new Set(pool.map((q) => q.skillId)))
  const skillAccuracyHistory: SkillAccuracyWindow[] = await Promise.all(
    skillIds.map((skillId) => getSkillAccuracyHistory(childProfileId, skillId)),
  )
  const sessionQuestionCount = await getSessionQuestionCount()
  return buildSessionQuestionIds(pool, skillAccuracyHistory, sessionQuestionCount)
}
