import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClassDetailAction } from '@/app/(teacher)/classes/actions'
import { JoinCodeDisplay } from '@/components/teacher/join-code-display'
import { classes } from '@/locales/vi/classes'
import { profiles } from '@/locales/vi/profiles'
import { reports } from '@/locales/vi/reports'

export default async function TeacherClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params

  const result = await getClassDetailAction({ classId })
  if ('error' in result) {
    notFound()
  }

  const classDetail = result.data.class
  const students = classDetail.memberships.map((membership) => membership.childProfile)
  const activeSet = classDetail.assignmentSets[0] ?? null

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading">{classDetail.name}</h1>
        <p className="text-sm text-muted-foreground">{profiles.gradeBandLabels[classDetail.gradeBand]}</p>
      </div>

      <JoinCodeDisplay code={classDetail.joinCode} />

      {activeSet ? (
        <div className="flex items-center gap-3">
          <p className="font-medium">{activeSet.title}</p>
          <Link href={`/reports/${activeSet.id}`} className="text-sm font-medium text-primary underline underline-offset-4">
            {reports.viewReportCta}
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{classes.noAssignmentPill}</p>
      )}

      {students.length === 0 ? (
        <p className="text-body text-muted-foreground">{classes.noStudents}</p>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">{classes.rosterTitle}</h2>
          <ul className="flex flex-col gap-2">
            {students.map((student) => (
              <li key={student.id} className="rounded-brand-sm border border-gray-200 px-3 py-2">
                <p className="font-medium">{student.name}</p>
                <p className="text-sm text-muted-foreground">{profiles.gradeBandLabels[student.gradeBand]}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
