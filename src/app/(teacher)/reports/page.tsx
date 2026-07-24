import { redirect } from 'next/navigation'
import { getClassesAction } from '@/app/(teacher)/classes/actions'
import { getAssignmentSetsAction } from '@/app/(teacher)/assignments/actions'
import { AssignmentSetCard } from '@/components/teacher/assignment-set-card'
import { reports } from '@/locales/vi/reports'

// Index of class reports (5.6 D5): every set that has ever been assigned —
// replaced sets keep their reports (D6) — newest-assigned first.
export default async function TeacherReportsPage() {
  const [setsResult, classesResult] = await Promise.all([getAssignmentSetsAction(), getClassesAction()])
  if ('error' in setsResult || 'error' in classesResult) {
    redirect('/login')
  }

  const assignedSets = setsResult.data.assignmentSets
    .filter((assignmentSet) => assignmentSet.assignedAt !== null)
    .sort((a, b) => (b.assignedAt?.getTime() ?? 0) - (a.assignedAt?.getTime() ?? 0))
  const assignableClasses = classesResult.data.classes.map((classItem) => ({
    id: classItem.id,
    name: classItem.name,
    gradeBand: classItem.gradeBand,
    studentCount: classItem._count.memberships,
  }))

  if (assignedSets.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-body text-muted-foreground">{reports.emptyState}</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-heading">{reports.pageTitle}</h1>

      <ul className="flex flex-col gap-3">
        {assignedSets.map((assignmentSet) => (
          <li key={assignmentSet.id}>
            <AssignmentSetCard
              assignmentSetId={assignmentSet.id}
              title={assignmentSet.title}
              gradeBand={assignmentSet.gradeBand}
              questionCount={assignmentSet._count.questions}
              assignedAt={assignmentSet.assignedAt}
              replacedAt={assignmentSet.replacedAt}
              className={assignmentSet.class?.name ?? null}
              classes={assignableClasses}
              reportHref={`/reports/${assignmentSet.id}`}
            />
          </li>
        ))}
      </ul>
    </main>
  )
}
