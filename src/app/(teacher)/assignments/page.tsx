import { redirect } from 'next/navigation'
import { getAssignmentSetsAction, getAssignmentBuilderContextAction } from '@/app/(teacher)/assignments/actions'
import { AssignmentSetBuilder } from '@/components/teacher/assignment-set-builder'
import { AssignmentSetCard } from '@/components/teacher/assignment-set-card'
import { assignments } from '@/locales/vi/assignments'

export default async function TeacherAssignmentsPage() {
  const [setsResult, contextResult] = await Promise.all([getAssignmentSetsAction(), getAssignmentBuilderContextAction()])
  if ('error' in setsResult || 'error' in contextResult) {
    redirect('/login')
  }

  const assignmentSets = setsResult.data.assignmentSets
  const { skills, maxQuestions } = contextResult.data

  if (assignmentSets.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-body text-muted-foreground">{assignments.emptyState}</p>
        <AssignmentSetBuilder skills={skills} maxQuestions={maxQuestions} />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading">{assignments.pageTitle}</h1>
        <AssignmentSetBuilder skills={skills} maxQuestions={maxQuestions} />
      </div>

      <ul className="flex flex-col gap-3">
        {assignmentSets.map((assignmentSet) => (
          <li key={assignmentSet.id}>
            <AssignmentSetCard
              title={assignmentSet.title}
              gradeBand={assignmentSet.gradeBand}
              questionCount={assignmentSet._count.questions}
              assignedAt={assignmentSet.assignedAt}
            />
          </li>
        ))}
      </ul>
    </main>
  )
}
