import { redirect } from 'next/navigation'
import { getClassesAction } from '@/app/(teacher)/classes/actions'
import { ClassCard } from '@/components/teacher/class-card'
import { CreateClassDialog } from '@/components/teacher/create-class-dialog'
import { classes } from '@/locales/vi/classes'

export default async function TeacherClassesPage() {
  const result = await getClassesAction()
  if ('error' in result) {
    redirect('/login')
  }

  const classList = result.data.classes

  if (classList.length === 0) {
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

      <ul className="flex flex-col gap-3">
        {classList.map((classItem) => (
          <li key={classItem.id}>
            <ClassCard
              classId={classItem.id}
              name={classItem.name}
              gradeBand={classItem.gradeBand}
              studentCount={classItem._count.memberships}
            />
          </li>
        ))}
      </ul>
    </main>
  )
}
