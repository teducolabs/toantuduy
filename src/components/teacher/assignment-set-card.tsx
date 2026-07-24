import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { AssignSetDialog } from '@/components/teacher/assign-set-dialog'
import type { AssignableClass } from '@/components/teacher/assign-class-picker'
import { assignments } from '@/locales/vi/assignments'
import { profiles } from '@/locales/vi/profiles'
import { reports } from '@/locales/vi/reports'
import type { GradeBand } from '@prisma/client'

// Status is derived, not stored (D2): assignedAt === null → draft;
// replacedAt !== null → replaced; else assigned. Drafts get a "Giao bài"
// button (D5); assigned/replaced sets get a report link (5.6 D5) — the prop
// is required so every call site decides explicitly.
export function AssignmentSetCard({
  assignmentSetId,
  title,
  gradeBand,
  questionCount,
  assignedAt,
  replacedAt,
  className,
  classes,
  reportHref,
}: {
  assignmentSetId: string
  title: string
  gradeBand: GradeBand
  questionCount: number
  assignedAt: Date | null
  replacedAt: Date | null
  className: string | null
  classes: AssignableClass[]
  reportHref: string | null
}) {
  const status = assignedAt === null ? 'draft' : replacedAt !== null ? 'replaced' : 'assigned'
  const pill =
    status === 'draft' ? assignments.draftPill : status === 'replaced' ? assignments.replacedPill : assignments.assignedPill

  return (
    <Card data-slot="assignment-set-card" className="rounded-brand-sm">
      <CardContent className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate text-sm text-muted-foreground">
            {profiles.gradeBandLabels[gradeBand]} · {assignments.questionCount(questionCount)}
            {status === 'assigned' && className ? ` · ${className}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status === 'draft' && <AssignSetDialog assignmentSetId={assignmentSetId} classes={classes} />}
          {status !== 'draft' && reportHref !== null && (
            <Link
              href={reportHref}
              className="flex min-h-11 items-center rounded-brand-sm border border-input px-3 text-sm font-medium hover:bg-accent"
            >
              {reports.viewReportCta}
            </Link>
          )}
          <span className="rounded-brand-sm bg-muted px-2 py-1 text-xs text-muted-foreground">{pill}</span>
        </div>
      </CardContent>
    </Card>
  )
}
