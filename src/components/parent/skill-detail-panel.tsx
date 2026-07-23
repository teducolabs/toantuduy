'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SkillBadge } from '@/components/parent/skill-badge'
import { getSkillDetailAction } from '@/app/(parent)/dashboard/actions'
import { formatVnDateLabel } from '@/infrastructure/repositories/session-repository'
import { dashboard } from '@/locales/vi/dashboard'
import type { SkillSessionDetail } from '@/infrastructure/repositories/dashboard-repository'

export function SkillDetailPanel({
  open,
  onOpenChange,
  childProfileId,
  skillId,
  skillName,
  status,
  accuracy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  childProfileId: string
  skillId: string | null
  skillName: string
  status: 'strong' | 'weak'
  accuracy: number
}) {
  const [sessions, setSessions] = useState<SkillSessionDetail[]>([])

  useEffect(() => {
    if (!skillId) {
      setSessions([])
      return
    }
    let cancelled = false
    getSkillDetailAction(childProfileId, skillId).then((result) => {
      if (cancelled) return
      if ('data' in result) setSessions(result.data.sessions)
    })
    return () => {
      cancelled = true
    }
  }, [childProfileId, skillId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-slot="skill-detail-panel"
        className="lg:static lg:inset-auto lg:w-auto lg:max-w-none lg:border-l lg:shadow-none"
        overlayClassName="lg:hidden"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>{skillName}</span>
            <span>{accuracy}%</span>
            <SkillBadge status={status} />
          </SheetTitle>
        </SheetHeader>

        <ul className="flex flex-col gap-2 px-4">
          {sessions.map((session) => (
            <li key={session.sessionId} className="flex items-center justify-between">
              <span className="text-body">{formatVnDateLabel(new Date(session.completedAt))}</span>
              <span className="text-body">{dashboard.skillDetailSessionAccuracy(session.correct, session.total)}</span>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
