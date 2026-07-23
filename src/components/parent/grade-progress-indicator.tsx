import type { GradeBand } from '@prisma/client'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { dashboard } from '@/locales/vi/dashboard'
import { profiles } from '@/locales/vi/profiles'

export function GradeProgressIndicator({
  gradeBand,
  gradeProgress,
}: {
  gradeBand: GradeBand
  gradeProgress: 'early' | 'mid' | 'late' | null
}) {
  if (gradeProgress === null) return null

  return (
    <div data-slot="grade-progress-indicator" className="flex items-center gap-2">
      <span className="text-body">
        {dashboard.gradeProgressLabel(profiles.gradeBandLabels[gradeBand], dashboard.gradeProgressPeriodLabels[gradeProgress])}
      </span>
      <Popover>
        <PopoverTrigger
          className="flex size-5 items-center justify-center rounded-full text-muted-foreground"
          aria-label={dashboard.gradeProgressTooltip}
        >
          ⓘ
        </PopoverTrigger>
        <PopoverContent>{dashboard.gradeProgressTooltip}</PopoverContent>
      </Popover>
    </div>
  )
}
