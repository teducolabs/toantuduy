import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { classes } from '@/locales/vi/classes'
import { profiles } from '@/locales/vi/profiles'
import type { GradeBand } from '@prisma/client'

export function ClassCard({
  classId,
  name,
  gradeBand,
  studentCount,
  activeAssignmentTitle,
}: {
  classId: string
  name: string
  gradeBand: GradeBand
  studentCount: number
  activeAssignmentTitle: string | null
}) {
  return (
    <Link href={`/classes/${classId}`} className="block">
      <Card className="rounded-brand-md transition-colors hover:bg-accent">
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">
              {profiles.gradeBandLabels[gradeBand]} · {classes.studentCount(studentCount)}
            </p>
          </div>
          <span className="max-w-40 shrink-0 truncate rounded-brand-sm bg-muted px-2 py-1 text-xs text-muted-foreground">
            {activeAssignmentTitle ?? classes.noAssignmentPill}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
