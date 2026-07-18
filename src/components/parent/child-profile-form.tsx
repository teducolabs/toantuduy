'use client'

import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { createChildProfileAction, updateChildProfileAction } from '@/app/(parent)/profiles/actions'
import { profiles } from '@/locales/vi/profiles'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GradeBand } from '@prisma/client'

const GRADE_BAND_OPTIONS: GradeBand[] = ['GRADE_1', 'GRADE_2', 'GRADE_3']

type ChildProfileFormProps =
  | { mode: 'create'; trigger: ReactNode }
  | { mode: 'edit'; trigger: ReactNode; profileId: string; initialName: string; initialGradeBand: GradeBand }

export function ChildProfileForm(props: ChildProfileFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(props.mode === 'edit' ? props.initialName : '')
  const [gradeBand, setGradeBand] = useState<GradeBand | null>(props.mode === 'edit' ? props.initialGradeBand : null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const errorId = useId()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    setError(null)
    if (!nextOpen) {
      if (props.mode === 'create') {
        setName('')
        setGradeBand(null)
      } else {
        setName(props.initialName)
        setGradeBand(props.initialGradeBand)
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(profiles.nameRequired)
      return
    }
    if (trimmedName.length > 50) {
      setError(profiles.nameTooLong)
      return
    }
    if (!gradeBand) {
      setError(profiles.gradeBandRequired)
      return
    }

    setIsSubmitting(true)
    try {
      const result =
        props.mode === 'create'
          ? await createChildProfileAction({ name: trimmedName, gradeBand })
          : await updateChildProfileAction({ id: props.profileId, name: trimmedName, gradeBand })

      if ('error' in result) {
        setError(props.mode === 'create' ? profiles.createFailed : profiles.updateFailed)
        return
      }

      handleOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant={props.mode === 'create' ? 'default' : 'outline'} size="sm" />}>
        {props.trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.mode === 'create' ? profiles.createDialogTitle : profiles.editDialogTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="child-profile-name">{profiles.nameLabel}</Label>
            <Input
              id="child-profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={profiles.namePlaceholder}
              maxLength={50}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="child-profile-grade-band">{profiles.gradeBandLabel}</Label>
            <Select value={gradeBand ?? undefined} onValueChange={(value) => setGradeBand(value as GradeBand)}>
              <SelectTrigger id="child-profile-grade-band" className="w-full" aria-describedby={error ? errorId : undefined}>
                <SelectValue placeholder={profiles.gradeBandPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {GRADE_BAND_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {profiles.gradeBandLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p role="alert" id={errorId} className="text-sm text-feedback-incorrect">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? profiles.submitting : profiles.saveCta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
