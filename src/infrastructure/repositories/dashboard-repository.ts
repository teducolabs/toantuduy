import { db } from '@/lib/db'
import { computeVnDayBoundaryUtc, formatVnDateLabel } from '@/infrastructure/repositories/session-repository'

export interface WeeklyActivity {
  days: boolean[] // index 0 = Monday ... 6 = Sunday, true if ≥1 completed Session that VN calendar day
  weeklySessionCount: number // total completed Sessions this VN week (not distinct days — a child can complete >1 Session/day)
  streak: number
  hasAnyCompletedSession: boolean // false ⇒ AC #4: caller must render zero streak text at all
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
