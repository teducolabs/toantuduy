import { notFound } from 'next/navigation'
import { getClassReportAction } from '@/app/(teacher)/reports/actions'
import { ClassReportTable } from '@/components/teacher/class-report-table'
import { assignments } from '@/locales/vi/assignments'

export default async function TeacherClassReportPage({ params }: { params: Promise<{ assignmentSetId: string }> }) {
  const { assignmentSetId } = await params

  const result = await getClassReportAction({ assignmentSetId })
  if ('error' in result) {
    notFound()
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
