'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { skillDisplayName } from '@/locales/vi/skills'
import { assignments } from '@/locales/vi/assignments'

// UX-DR11 question-library-row: checkbox + one-line prompt preview + Skill tag
// + Difficulty Level. The whole row is a <label> so tapping anywhere toggles
// (44px min touch target, UX-DR17).
export function QuestionLibraryRow({
  prompt,
  skillCode,
  skillName,
  difficultyLevel,
  checked,
  disabled,
  onToggle,
}: {
  prompt: string
  skillCode: string
  skillName: string
  difficultyLevel: number
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <label
      data-slot="question-library-row"
      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-brand-sm border border-border px-3 py-2 transition-colors hover:bg-accent has-data-disabled:cursor-not-allowed has-data-disabled:opacity-60"
    >
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={onToggle} aria-label={prompt} />
      <span className="min-w-0 flex-1 truncate text-sm">{prompt}</span>
      <span className="shrink-0 rounded-brand-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {skillDisplayName(skillCode, skillName)}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{assignments.difficultyLabel(difficultyLevel)}</span>
    </label>
  )
}
