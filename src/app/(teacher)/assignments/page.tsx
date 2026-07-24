import { redirect } from 'next/navigation'
import { getClassesAction } from '@/app/(teacher)/classes/actions'
import { getAssignmentSetsAction, getAssignmentBuilderContextAction } from '@/app/(teacher)/assignments/actions'
import { AssignmentSetBuilder } from '@/components/teacher/assignment-set-builder'
import { AssignmentSetCard } from '@/components/teacher/assignment-set-card'
import { assignments } from '@/locales/vi/assignments'

export default async function TeacherAssignmentsPage() {
  const [setsResult, contextResult, classesResult] = await Promise.all([
    getAssignmentSetsAction(),
    getAssignmentBuilderContextAction(),
    getClassesAction(),
  ])
  if ('error' in setsResult || 'error' in contextResult || 'error' in classesResult) {
    redirect('/login')
  }

  const assignmentSets = setsResult.data.assignmentSets
  const { skills, maxQuestions } = contextResult.data
  const assignableClasses = classesResult.data.classes.map((classItem) => ({
    id: classItem.id,
    name: classItem.name,
    gradeBand: classItem.gradeBand,
    studentCount: classItem._count.memberships,
  }))

  if (assignmentSets.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-body text-muted-foreground">{assignments.emptyState}</p>
        <AssignmentSetBuilder skills={skills} maxQuestions={maxQuestions} classes={assignableClasses} />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading">{assignments.pageTitle}</h1>
        <AssignmentSetBuilder skills={skills} maxQuestions={maxQuestions} classes={assignableClasses} />
      </div>

      <ul className="flex flex-col gap-3">
        {assignmentSets.map((assignmentSet) => (
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
