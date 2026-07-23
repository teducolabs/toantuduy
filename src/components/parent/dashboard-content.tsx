'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UpsellBanner } from '@/components/parent/upsell-banner'
import { WeeklyActivityStrip } from '@/components/parent/weekly-activity-strip'
import { SkillDashboardSection } from '@/components/parent/skill-dashboard-section'
import { GradeProgressIndicator } from '@/components/parent/grade-progress-indicator'
import { SessionHistoryList } from '@/components/parent/session-history-list'
import { shouldShowLoadErrorCard } from '@/components/parent/dashboard-content-state'
import { getDashboardDataAction, type DashboardDataResult } from '@/app/(parent)/dashboard/actions'
import { dashboard } from '@/locales/vi/dashboard'

export function DashboardContent({
  activeProfileId,
  initialResult,
}: {
  activeProfileId: string
  initialResult: DashboardDataResult
}) {
  const [result, setResult] = useState(initialResult)
  const [retrying, setRetrying] = useState(false)

  async function retry() {
    setRetrying(true)
    const next = await getDashboardDataAction(activeProfileId)
    setRetrying(false)
    setResult(next)
  }

  if (shouldShowLoadErrorCard(result)) {
    return (
      <main>
        <Card data-slot="dashboard-load-error-card" className="rounded-brand-md shadow-sm bg-white">
          <div className="px-(--card-spacing) flex flex-col gap-3">
            <p className="text-body text-muted-foreground">{dashboard.loadErrorMessage}</p>
            <Button onClick={retry} disabled={retrying}>
              {dashboard.loadErrorRetryCta}
            </Button>
          </div>
        </Card>
      </main>
    )
  }

  if ('error' in result) return null
  const { data } = result

  return (
    <main>
      <UpsellBanner childProfileId={activeProfileId} childName={data.childName} visible={data.showUpsellBanner} />

      <Card data-slot="dashboard-card" className="rounded-brand-md shadow-sm bg-white">
        <div className="px-(--card-spacing)">
          <WeeklyActivityStrip {...data.weeklyActivity} />
        </div>
      </Card>

      <Card data-slot="skill-card" className="rounded-brand-md shadow-sm bg-white">
        <div className="px-(--card-spacing) flex flex-col gap-3">
          <p className="font-semibold">{dashboard.skillSectionTitle}</p>
          <SkillDashboardSection
            childProfileId={activeProfileId}
            skills={data.skillBreakdown}
            hasAnyCompletedSession={data.weeklyActivity.hasAnyCompletedSession}
          />
        </div>
      </Card>

      <Card data-slot="grade-progress-card" className="rounded-brand-md shadow-sm bg-white">
        <div className="px-(--card-spacing) flex flex-col gap-3">
          <p className="font-semibold">{dashboard.gradeProgressSectionTitle}</p>
          <GradeProgressIndicator gradeBand={data.gradeBand} gradeProgress={data.gradeProgress} />
        </div>
      </Card>

      <Card data-slot="session-history-card" className="rounded-brand-md shadow-sm bg-white">
        <div className="px-(--card-spacing) flex flex-col gap-3">
          <p className="font-semibold">{dashboard.sessionHistorySectionTitle}</p>
          <SessionHistoryList childProfileId={activeProfileId} initialSessions={data.sessionHistory} />
        </div>
      </Card>
    </main>
  )
}
