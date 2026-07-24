'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { assignments } from '@/locales/vi/assignments'
import { classes } from '@/locales/vi/classes'
import { profiles } from '@/locales/vi/profiles'
import type { GradeBand } from '@prisma/client'

export type AssignableClass = {
  id: string
  name: string
  gradeBand: GradeBand
  studentCount: number
}

// Checkbox rows of the teacher's classes — same whole-row <label> pattern as
// question-library-row (44px min touch target, UX-DR17).
export function AssignClassPicker({
  classes: classList,
  selectedIds,
  onToggle,
}: {
  classes: AssignableClass[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  if (classList.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{assignments.noClassesToAssign}</p>
  }

  return (
    <div data-slot="assign-class-picker" className="flex flex-col gap-2">
      {classList.map((classItem) => (
        <label
          key={classItem.id}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-brand-sm border border-border px-3 py-2 transition-colors hover:bg-accent"
        >
          <Checkbox
            checked={selectedIds.includes(classItem.id)}
            onCheckedChange={() => onToggle(classItem.id)}
            aria-label={classItem.name}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{classItem.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {profiles.gradeBandLabels[classItem.gradeBand]} · {classes.studentCount(classItem.studentCount)}
          </span>
        </label>
      ))}
    </div>
  )
}
