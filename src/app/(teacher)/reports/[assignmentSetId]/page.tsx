import { notFound } from 'next/navigation'
import { getClassReportAction } from '@/app/(teacher)/reports/actions'
import { ClassReportContent } from '@/components/teacher/class-report-content'

export default async function TeacherClassReportPage({ params }: { params: Promise<{ assignmentSetId: string }> }) {
  const { assignmentSetId } = await params

  const result = await getClassReportAction({ assignmentSetId })
  // A foreign/draft/missing set is a real 404; any other error (LOAD_FAILED)
  // is retryable and handled by the client wrapper (UX-DR15).
  if ('error' in result && (result.error.code === 'NOT_FOUND' || result.error.code === 'VALIDATION_ERROR')) {
    notFound()
  }

  return <ClassReportContent assignmentSetId={assignmentSetId} initialResult={result} />
}
