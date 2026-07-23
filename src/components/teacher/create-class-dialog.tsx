'use client'

import { useId, useState, type FormEvent } from 'react'
import { createClassAction } from '@/app/(teacher)/classes/actions'
import { classes } from '@/locales/vi/classes'
import { profiles } from '@/locales/vi/profiles'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GradeBand } from '@prisma/client'

const GRADE_BAND_OPTIONS: GradeBand[] = ['GRADE_1', 'GRADE_2', 'GRADE_3']

export function CreateClassDialog({ trigger }: { trigger: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [gradeBand, setGradeBand] = useState<GradeBand | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const errorId = useId()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    setError(null)
    if (!nextOpen) {
      setName('')
      setGradeBand(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(classes.nameRequired)
      return
    }
    if (trimmedName.length > 50) {
      setError(classes.nameTooLong)
      return
    }
    if (!gradeBand) {
      setError(classes.gradeBandRequired)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createClassAction({ name: trimmedName, gradeBand })
      if ('error' in result) {
        setError(classes.createFailed)
        return
      }
      handleOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{classes.createDialogTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="create-class-name">{classes.nameLabel}</Label>
            <Input
              id="create-class-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={classes.namePlaceholder}
              maxLength={50}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="create-class-grade-band">{classes.gradeBandLabel}</Label>
            <Select value={gradeBand} onValueChange={(value) => setGradeBand(value as GradeBand)}>
              <SelectTrigger id="create-class-grade-band" className="w-full" aria-describedby={error ? errorId : undefined}>
                <SelectValue placeholder={classes.gradeBandPlaceholder} />
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
              {isSubmitting ? classes.submitting : classes.createCta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
