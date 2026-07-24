import { Card, CardContent } from '@/components/ui/card'
import { AssignmentStartButton } from '@/components/student/assignment-start-button'
import { student } from '@/locales/vi/student'

// UX-DR13: the assignment is a NAMED option below the primary CTA — card bg
// with an orange accent border; primary orange stays reserved for the main CTA.
// dueAt is stored as UTC midnight of the picked date, so UTC getters return
// the intended calendar day.
export function AssignmentCard({
  assignmentSetId,
  title,
  teacherName,
  dueAt,
}: {
  assignmentSetId: string
  title: string
  teacherName: string
  dueAt: Date | null
}) {
  return (
    <Card data-slot="assignment-card" className="rounded-brand-xl border-2 border-primary bg-card">
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="text-label-student font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">
            {student.assignmentFrom(teacherName)}
            {dueAt ? ` · ${student.assignmentDue(dueAt.getUTCDate(), dueAt.getUTCMonth() + 1)}` : ''}
          </p>
        </div>
        <AssignmentStartButton assignmentSetId={assignmentSetId} />
      </CardContent>
    </Card>
  )
}
