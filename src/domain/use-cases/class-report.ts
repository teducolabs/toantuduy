// Class report computation (Story 5.6, D7).
// Pure domain logic — zero imports from Prisma, Next.js, or any external SDK.

export type ClassReportSkill = {
  id: string
  code: string
  name: string
}

export type ClassReportInput = {
  students: { id: string; name: string }[]
  skills: ClassReportSkill[]
  // Must arrive ordered completedAt DESC (newest first) — the repository
  // guarantees this; D3 picks each student's first (= most recent) session.
  completedSessions: {
    childProfileId: string
    completedAt: string
    answers: { skillId: string; answeredCorrectly: boolean }[]
  }[]
}

export type ClassReportRow = {
  childProfileId: string
  name: string
  completed: boolean
  // null = student has not completed the set ("no data" — distinct from 0).
  accuracyBySkillId: Record<string, number> | null
}

export type ClassReport = {
  skills: ClassReportSkill[]
  rows: ClassReportRow[]
  // Unweighted mean over completing students (D4); null when zero completers.
  classAverage: Record<string, number> | null
}

// D1 boundary: per-student per-Skill accuracies ARE part of the report model;
// per-student session totals/scores are never computed or exposed here.
export function computeClassReport(input: ClassReportInput): ClassReport {
  // Dedupe skills by id, first-encounter order (Map preserves insertion order).
  const skillsById = new Map<string, ClassReportSkill>()
  for (const skill of input.skills) {
    if (!skillsById.has(skill.id)) skillsById.set(skill.id, skill)
  }
  const skills = [...skillsById.values()]

  const rosterIds = new Set(input.students.map((student) => student.id))

  // Most recent completed session per roster student (D3): the list is
  // completedAt desc, so the first session seen per child wins. Non-roster
  // sessions are ignored (D9).
  const latestSessionByChild = new Map<string, ClassReportInput['completedSessions'][number]>()
  for (const completedSession of input.completedSessions) {
    if (!rosterIds.has(completedSession.childProfileId)) continue
    if (!latestSessionByChild.has(completedSession.childProfileId)) {
      latestSessionByChild.set(completedSession.childProfileId, completedSession)
    }
  }

  const rows: ClassReportRow[] = input.students.map((student) => {
    const latestSession = latestSessionByChild.get(student.id)
    if (!latestSession) {
      return { childProfileId: student.id, name: student.name, completed: false, accuracyBySkillId: null }
    }

    const tallyBySkill = new Map<string, { correct: number; total: number }>()
    for (const answer of latestSession.answers) {
      let tally = tallyBySkill.get(answer.skillId)
      if (!tally) {
        tally = { correct: 0, total: 0 }
        tallyBySkill.set(answer.skillId, tally)
      }
      tally.total += 1
      if (answer.answeredCorrectly) tally.correct += 1
    }

    const accuracyBySkillId: Record<string, number> = {}
    for (const [skillId, tally] of tallyBySkill) {
      accuracyBySkillId[skillId] = tally.correct / tally.total
    }
    return { childProfileId: student.id, name: student.name, completed: true, accuracyBySkillId }
  })

  const completerRows = rows.filter((row) => row.accuracyBySkillId !== null)
  let classAverage: Record<string, number> | null = null
  if (completerRows.length > 0) {
    classAverage = {}
    for (const skill of skills) {
      const values = completerRows
        .map((row) => row.accuracyBySkillId![skill.id])
        .filter((value): value is number => value !== undefined)
      if (values.length > 0) {
        classAverage[skill.id] = values.reduce((sum, value) => sum + value, 0) / values.length
      }
    }
  }

  return { skills, rows, classAverage }
}
