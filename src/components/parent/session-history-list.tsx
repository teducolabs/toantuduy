'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getMoreSessionHistoryAction } from '@/app/(parent)/dashboard/actions'
import { formatVnDateLabel, computeVnWeekdayIndex } from '@/infrastructure/repositories/session-repository'
import { skillDisplayName } from '@/locales/vi/skills'
import { dashboard } from '@/locales/vi/dashboard'
import type { SessionHistoryRow } from '@/infrastructure/repositories/dashboard-repository'

const SESSION_HISTORY_PAGE_SIZE = 30

export function SessionHistoryList({
  childProfileId,
  initialSessions,
}: {
  childProfileId: string
  initialSessions: SessionHistoryRow[]
}) {
  const [sessions, setSessions] = useState(initialSessions)
  const [skip, setSkip] = useState(initialSessions.length)
  const [hasMore, setHasMore] = useState(initialSessions.length >= SESSION_HISTORY_PAGE_SIZE)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    setLoading(true)
    const result = await getMoreSessionHistoryAction(childProfileId, skip)
    setLoading(false)
    if ('error' in result) return

    setSessions((prev) => [...prev, ...result.data.sessions])
    setSkip((prev) => prev + result.data.sessions.length)
    setHasMore(result.data.sessions.length >= SESSION_HISTORY_PAGE_SIZE)
  }

  if (sessions.length === 0) {
    return <p data-slot="session-history-list" className="text-body text-muted-foreground">{dashboard.sessionHistoryEmpty}</p>
  }

  return (
    <div data-slot="session-history-list" className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {sessions.map((session) => (
          <li key={session.sessionId} className="flex items-center justify-between gap-2">
            <span className="text-body">
              {formatVnDateLabel(new Date(session.completedAt))} · {dashboard.weekdayLabels[computeVnWeekdayIndex(new Date(session.completedAt))]}
            </span>
            <span className="text-body font-semibold">{dashboard.sessionHistoryScoreChip(session.correct, session.total)}</span>
            <div className="flex flex-wrap gap-1">
              {session.skillCodes.map((code) => (
                <span key={code} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {skillDisplayName(code, code)}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {hasMore && (
        <Button variant="ghost" onClick={loadMore} disabled={loading}>
          {dashboard.sessionHistoryLoadMoreCta}
        </Button>
      )}
    </div>
  )
}
