import { db } from '@/lib/db'
import { computeVnDayBoundaryUtc, formatVnDateLabel } from '@/infrastructure/repositories/session-repository'

export interface WeeklyActivity {
  days: boolean[] // index 0 = Monday ... 6 = Sunday, true if ≥1 completed Session that VN calendar day
  weeklySessionCount: number // total completed Sessions this VN week (not distinct days — a child can complete >1 Session/day)
  streak: number
  hasAnyCompletedSession: boolean // false ⇒ AC #4: caller must render zero streak text at all
}

// Dashboard-view constants (Story 4.2) — distinct from src/domain/constants.ts,
// which is scoped exclusively to AD-11's adaptive-difficulty tuning.
const SKILL_STRONG_THRESHOLD = 0.7
const SKILL_MIN_ATTEMPTS = 5

export interface SkillBreakdownRow {
  skillId: string
  code: string // Skill.code — used to look up the Vietnamese display name via skillDisplayName()
  name: string // Skill.name — DB fallback only, per skills.ts's documented convention
  attempts: number // total answered questions for this Skill across all completed Sessions
  correct: number
  status: 'strong' | 'weak' | 'insufficient' // 'insufficient' when attempts < 5
}

export interface SkillSessionDetail {
  sessionId: string
  completedAt: string
  correct: number
  total: number
}

// FR-7's all-time running accuracy (correct/total across every completed
// Session, no sliding window) — distinct from getSkillAccuracyHistory's
// WINDOW_SIZE=10 window, which feeds the adaptive-difficulty algorithm only.
export async function getSkillBreakdown(childProfileId: string): Promise<SkillBreakdownRow[]> {
  const [skills, answers] = await Promise.all([
    db.skill.findMany(),
    db.sessionAnswer.findMany({
      where: {
        answeredCorrectly: { not: null },
        session: { childProfileId, completedAt: { not: null } },
      },
      select: { answeredCorrectly: true, question: { select: { skillId: true } } },
    }),
  ])

  const tallies = new Map<string, { attempts: number; correct: number }>()
  for (const answer of answers) {
    const tally = tallies.get(answer.question.skillId) ?? { attempts: 0, correct: 0 }
    tally.attempts++
    if (answer.answeredCorrectly) tally.correct++
    tallies.set(answer.question.skillId, tally)
  }

  return skills.map((skill) => {
    const tally = tallies.get(skill.id) ?? { attempts: 0, correct: 0 }
    const status: SkillBreakdownRow['status'] =
      tally.attempts < SKILL_MIN_ATTEMPTS
        ? 'insufficient'
        : tally.correct / tally.attempts >= SKILL_STRONG_THRESHOLD
          ? 'strong'
          : 'weak'
    return { skillId: skill.id, code: skill.code, name: skill.name, attempts: tally.attempts, correct: tally.correct, status }
  })
}

export async function getSkillSessionDetail(childProfileId: string, skillId: string): Promise<SkillSessionDetail[]> {
  const answers = await db.sessionAnswer.findMany({
    where: {
      answeredCorrectly: { not: null },
      question: { skillId },
      session: { childProfileId, completedAt: { not: null } },
    },
    select: { sessionId: true, answeredCorrectly: true, session: { select: { completedAt: true } } },
  })

  const sessions = new Map<string, { completedAt: Date; correct: number; total: number }>()
  for (const answer of answers) {
    const session = sessions.get(answer.sessionId) ?? {
      completedAt: answer.session.completedAt as Date,
      correct: 0,
      total: 0,
    }
    session.total++
    if (answer.answeredCorrectly) session.correct++
    sessions.set(answer.sessionId, session)
  }

  return Array.from(sessions.entries())
    .map(([sessionId, s]) => ({ sessionId, completedAt: s.completedAt.toISOString(), correct: s.correct, total: s.total }))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 3)
}

export async function getWeeklyActivity(
  childProfileId: string,
  now: Date = new Date(),
): Promise<Pick<WeeklyActivity, 'days' | 'weeklySessionCount'>> {
  const nowVn = new Date(now.getTime() + 7 * 3600_000)
  const daysSinceMonday = (nowVn.getUTCDay() + 6) % 7

  const { todayStartUtc: weekStartUtc } = computeVnDayBoundaryUtc(now, -daysSinceMonday)
  const { todayEndUtc: weekEndUtc } = computeVnDayBoundaryUtc(now, -daysSinceMonday + 6)

  const rows = await db.session.findMany({
    where: { childProfileId, completedAt: { gte: weekStartUtc, lt: weekEndUtc } },
    select: { completedAt: true },
  })

  const days = Array.from({ length: 7 }, (_, i) => {
    const { todayStartUtc, todayEndUtc } = computeVnDayBoundaryUtc(now, -daysSinceMonday + i)
    return rows.some((r) => r.completedAt! >= todayStartUtc && r.completedAt! < todayEndUtc)
  })

  return { days, weeklySessionCount: rows.length }
}

export async function getCurrentStreak(
  childProfileId: string,
  now: Date = new Date(),
): Promise<{ streak: number; hasAnyCompletedSession: boolean }> {
  const rows = await db.session.findMany({
    where: { childProfileId, completedAt: { not: null } },
    select: { completedAt: true },
  })
  if (rows.length === 0) {
    return { streak: 0, hasAnyCompletedSession: false }
  }

  const activeDays = new Set(rows.map((r) => formatVnDateLabel(r.completedAt!)))

  function activeOnOffset(offset: number): boolean {
    const { todayStartUtc } = computeVnDayBoundaryUtc(now, offset)
    return activeDays.has(formatVnDateLabel(todayStartUtc))
  }

  let offset = 0
  if (!activeOnOffset(0)) {
    offset = -1
    if (!activeOnOffset(-1)) return { streak: 0, hasAnyCompletedSession: true }
  }

  let streak = 0
  while (activeOnOffset(offset)) {
    streak++
    offset--
  }
  return { streak, hasAnyCompletedSession: true }
}
