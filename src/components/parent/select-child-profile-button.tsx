'use client'

import { Button } from '@/components/ui/button'
import { profiles } from '@/locales/vi/profiles'

export function SelectChildProfileButton({
  childName,
  isSwitching,
  disabled,
  onSelect,
}: {
  childName: string
  isSwitching: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <Button
      variant="outline"
      className="rounded-brand-sm"
      onClick={onSelect}
      disabled={disabled}
      aria-label={`${profiles.selectCta} ${childName}`}
    >
      {isSwitching ? profiles.submitting : profiles.selectCta}
    </Button>
  )
}
