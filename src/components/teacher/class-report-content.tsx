'use client'

import { useState } from 'react'
import { getClassReportAction, type ClassReportResult } from '@/app/(teacher)/reports/actions'
import { ClassReportTable } from '@/components/teacher/class-report-table'
import { Button } from '@/components/ui/button'
import { assignments } from '@/locales/vi/assignments'
import { reports } from '@/locales/vi/reports'

// Server-first fetch + client retry via re-invoked server action — the 4.5
// dashboard-content pattern (UX-DR15). The page has already routed
// NOT_FOUND/VALIDATION_ERROR to notFound(); anything reaching here as an
// error is retryable (a retry that lands NOT_FOUND just re-renders the card).
export function ClassReportContent({
  assignmentSetId,
  initialResult,
}: {
  assignmentSetId: string
  initialResult: ClassReportResult
}) {
  const [result, setResult] = useState(initialResult)
  const [retrying, setRetrying] = useState(false)

  async function retry() {
    setRetrying(true)
    try {
      setResult(await getClassReportAction({ assignmentSetId }))
    } catch {
      // Keep the current error card — the action contract never throws, but a
      // network drop mid-flight can.
    } finally {
      setRetrying(false)
    }
  }

  if ('error' in result) {
    return (
      <main className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-3 rounded-brand-md border border-border p-4">
          <p role="alert" className="text-sm text-feedback-incorrect">
            {reports.loadErrorMessage}
          </p>
          <Button variant="outline" size="sm" onClick={retry} disabled={retrying}>
            {assignments.retryCta}
          </Button>
        </div>
      </main>
    )
  }

  const { report } = result.data

  return (
    <main className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-heading">{report.title}</h1>
          {report.status === 'replaced' && (
            <span className="rounded-brand-sm bg-muted px-2 py-1 text-xs text-muted-foreground">{assignments.replacedPill}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {report.className} · {assignments.questionCount(report.questionCount)}
          {report.dueAt ? ` · ${assignments.dueDateDisplay(report.dueAt.getUTCDate(), report.dueAt.getUTCMonth() + 1)}` : ''}
        </p>
      </div>

      <ClassReportTable report={report} />
    </main>
  )
}
