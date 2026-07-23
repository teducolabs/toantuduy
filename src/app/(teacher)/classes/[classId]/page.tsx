import { notFound } from 'next/navigation'
import { getClassDetailAction } from '@/app/(teacher)/classes/actions'
import { JoinCodeDisplay } from '@/components/teacher/join-code-display'
import { classes } from '@/locales/vi/classes'
import { profiles } from '@/locales/vi/profiles'

export default async function TeacherClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params

  const result = await getClassDetailAction({ classId })
  if ('error' in result) {
    notFound()
  }

  const classDetail = result.data.class
  const students = classDetail.memberships.map((membership) => membership.childProfile)

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading">{classDetail.name}</h1>
        <p className="text-sm text-muted-foreground">{profiles.gradeBandLabels[classDetail.gradeBand]}</p>
      </div>

      <JoinCodeDisplay code={classDetail.joinCode} />

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
