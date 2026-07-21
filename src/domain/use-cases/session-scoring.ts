// Session summary computation (Architecture Spine Structural Seed).
// Pure domain logic — zero imports from Prisma, Next.js, or any external SDK.

export type SkillAnswerInput = {
  skillId: string
  answeredCorrectly: boolean | null
}

export type SkillBreakdownRow = {
  skillId: string
  correct: number
  total: number
}

// Groups session answers by Skill in first-encounter order. Unanswered stub
// rows (answeredCorrectly: null) contribute to neither correct nor total.
export function computePerSkillBreakdown(answers: SkillAnswerInput[]): SkillBreakdownRow[] {
  const rowsBySkill = new Map<string, SkillBreakdownRow>()

  for (const answer of answers) {
    if (answer.answeredCorrectly === null) continue

    let row = rowsBySkill.get(answer.skillId)
    if (!row) {
      row = { skillId: answer.skillId, correct: 0, total: 0 }
      rowsBySkill.set(answer.skillId, row)
    }
    row.total += 1
    if (answer.answeredCorrectly) row.correct += 1
  }

  // Map preserves insertion order — first-encounter ordering falls out.
  return [...rowsBySkill.values()]
}
