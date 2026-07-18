import { db } from '@/lib/db'

const FREE_TIER_DAILY_ALLOTMENT_DEFAULT = 5
const SESSION_QUESTION_COUNT_DEFAULT = 10

async function getConfigInt(key: string, fallback: number): Promise<number> {
  const row = await db.globalConfig.findUnique({ where: { key } })
  if (!row) return fallback
  const parsed = parseInt(row.value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function getFreeTierDailyAllotment(): Promise<number> {
  return getConfigInt('FREE_TIER_DAILY_ALLOTMENT', FREE_TIER_DAILY_ALLOTMENT_DEFAULT)
}

export function getSessionQuestionCount(): Promise<number> {
  return getConfigInt('SESSION_QUESTION_COUNT', SESSION_QUESTION_COUNT_DEFAULT)
}
