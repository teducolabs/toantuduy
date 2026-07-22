import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { session: { findMany: vi.fn() } },
}))

import { db } from '@/lib/db'
import { getWeeklyActivity, getCurrentStreak } from './dashboard-repository'

const findMany = db.session.findMany as unknown as ReturnType<typeof vi.fn>

function row(iso: string) {
  return { completedAt: new Date(iso) }
}

beforeEach(() => {
  findMany.mockReset()
})

describe('getWeeklyActivity', () => {
  it('buckets Sessions at the Monday/Sunday week boundaries into the correct day', async () => {
    // now = 2026-07-15T10:00:00Z -> VN Wed 2026-07-15 (week Mon 07-13 .. Sun 07-19)
    const now = new Date('2026-07-15T10:00:00.000Z')
    findMany.mockResolvedValueOnce([row('2026-07-13T10:00:00.000Z'), row('2026-07-19T10:00:00.000Z')])

    const result = await getWeeklyActivity('child-1', now)

    expect(result.days).toEqual([true, false, false, false, false, false, true])
    expect(result.weeklySessionCount).toBe(2)
  })

  it('assigns a Session at the exact VN midnight instant to the new day, not the previous one', async () => {
    // now = 2026-07-15T10:00:00Z -> VN Wed 2026-07-15
    const now = new Date('2026-07-15T10:00:00.000Z')
    // VN midnight starting 2026-07-16 (Thursday) is 2026-07-15T17:00:00Z
    findMany.mockResolvedValueOnce([row('2026-07-15T17:00:00.000Z')])

    const result = await getWeeklyActivity('child-1', now)

    expect(result.days).toEqual([false, false, false, true, false, false, false])
    expect(result.weeklySessionCount).toBe(1)
  })

  it('returns all-empty days when there are no Sessions this week', async () => {
    const now = new Date('2026-07-15T10:00:00.000Z')
    findMany.mockResolvedValueOnce([])

    const result = await getWeeklyActivity('child-1', now)

    expect(result.days).toEqual([false, false, false, false, false, false, false])
    expect(result.weeklySessionCount).toBe(0)
  })
})

describe('getCurrentStreak', () => {
  it('returns streak 0 and hasAnyCompletedSession false when there are no completed Sessions', async () => {
    findMany.mockResolvedValueOnce([])

    const result = await getCurrentStreak('child-1', new Date('2026-07-22T10:00:00.000Z'))

    expect(result).toEqual({ streak: 0, hasAnyCompletedSession: false })
  })

  it('counts a streak of 1 when only today has a completed Session', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z') // VN Wed 2026-07-22
    findMany.mockResolvedValueOnce([row('2026-07-22T10:00:00.000Z')])

    const result = await getCurrentStreak('child-1', now)

    expect(result).toEqual({ streak: 1, hasAnyCompletedSession: true })
  })

  it('counts a consecutive-day streak of N ending today', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z') // VN Wed 2026-07-22
    findMany.mockResolvedValueOnce([
      row('2026-07-20T10:00:00.000Z'),
      row('2026-07-21T10:00:00.000Z'),
      row('2026-07-22T10:00:00.000Z'),
    ])

    const result = await getCurrentStreak('child-1', now)

    expect(result).toEqual({ streak: 3, hasAnyCompletedSession: true })
  })

  it('stops the streak count at a gap day', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z') // VN Wed 2026-07-22
    findMany.mockResolvedValueOnce([row('2026-07-20T10:00:00.000Z'), row('2026-07-22T10:00:00.000Z')])

    const result = await getCurrentStreak('child-1', now)

    expect(result).toEqual({ streak: 1, hasAnyCompletedSession: true })
  })

  it('keeps the streak alive through today when yesterday had a Session but today has not happened yet', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z') // VN Wed 2026-07-22, no Session yet today
    findMany.mockResolvedValueOnce([row('2026-07-21T10:00:00.000Z')])

    const result = await getCurrentStreak('child-1', now)

    expect(result).toEqual({ streak: 1, hasAnyCompletedSession: true })
  })

  it('resets to 0 when neither today nor yesterday has a completed Session, but reports hasAnyCompletedSession true', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z') // VN Wed 2026-07-22
    findMany.mockResolvedValueOnce([row('2026-07-19T10:00:00.000Z')])

    const result = await getCurrentStreak('child-1', now)

    expect(result).toEqual({ streak: 0, hasAnyCompletedSession: true })
  })
})
