import { redirect } from 'next/navigation'
import { getClassesAction } from '@/app/(teacher)/classes/actions'
import { getAssignmentSetsAction, getAssignmentBuilderContextAction } from '@/app/(teacher)/assignments/actions'
import { ClassCard } from '@/components/teacher/class-card'
import { CreateClassDialog } from '@/components/teacher/create-class-dialog'
import { AssignmentSetBuilder } from '@/components/teacher/assignment-set-builder'
import { AssignmentSetCard } from '@/components/teacher/assignment-set-card'
import { classes } from '@/locales/vi/classes'
import { assignments } from '@/locales/vi/assignments'

export default async function TeacherClassesPage() {
  const [classesResult, setsResult, contextResult] = await Promise.all([
    getClassesAction(),
    getAssignmentSetsAction(),
    getAssignmentBuilderContextAction(),
  ])
  if ('error' in classesResult || 'error' in setsResult || 'error' in contextResult) {
    redirect('/login')
  }

  const classList = classesResult.data.classes
  const assignmentSets = setsResult.data.assignmentSets
  const { skills, maxQuestions } = contextResult.data
  const assignableClasses = classList.map((classItem) => ({
    id: classItem.id,
    name: classItem.name,
    gradeBand: classItem.gradeBand,
    studentCount: classItem._count.memberships,
  }))

  // 5.3 empty state stays intact: no classes AND no sets → single primary CTA only.
  if (classList.length === 0 && assignmentSets.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-body text-muted-foreground">{classes.emptyState}</p>
        <CreateClassDialog trigger={classes.createClassCta} />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading">{classes.pageTitle}</h1>
        <CreateClassDialog trigger={classes.createClassCta} />
      </div>

      {classList.length === 0 ? (
        <p className="text-body text-muted-foreground">{classes.emptyState}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {classList.map((classItem) => (
            <li key={classItem.id}>
              <ClassCard
                classId={classItem.id}
                name={classItem.name}
                gradeBand={classItem.gradeBand}
                studentCount={classItem._count.memberships}
                activeAssignmentTitle={classItem.assignmentSets[0]?.title ?? null}
              />
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-heading">{assignments.pageTitle}</h2>
          <AssignmentSetBuilder skills={skills} maxQuestions={maxQuestions} classes={assignableClasses} />
        </div>

        {assignmentSets.length === 0 ? (
          <p className="text-body text-muted-foreground">{assignments.emptyState}</p>
        ) : (
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
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
