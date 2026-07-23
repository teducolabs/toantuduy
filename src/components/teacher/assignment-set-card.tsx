import { Card, CardContent } from '@/components/ui/card'
import { assignments } from '@/locales/vi/assignments'
import { profiles } from '@/locales/vi/profiles'
import type { GradeBand } from '@prisma/client'

// Display-only in Story 5.4 (draft editing / tap-to-reopen is a follow-up).
// Status is derived, not stored: assignedAt === null → draft (Story 5.5
// extends this derivation when assignment lands).
export function AssignmentSetCard({
  title,
  gradeBand,
  questionCount,
  assignedAt,
}: {
  title: string
  gradeBand: GradeBand
  questionCount: number
  assignedAt: Date | null
}) {
  const isDraft = assignedAt === null

  return (
    <Card data-slot="assignment-set-card" className="rounded-brand-sm">
      <CardContent className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">
            {profiles.gradeBandLabels[gradeBand]} · {assignments.questionCount(questionCount)}
          </p>
        </div>
        <span className="shrink-0 rounded-brand-sm bg-muted px-2 py-1 text-xs text-muted-foreground">
          {isDraft ? assignments.draftPill : assignments.assignedPill}
        </span>
      </CardContent>
    </Card>
  )
}
