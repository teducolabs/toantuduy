'use client'

import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { joinClassAction } from '@/app/(parent)/profiles/actions'
import { classes } from '@/locales/vi/classes'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function JoinClassDialog({ childProfileId, childName }: { childProfileId: string; childName: string }) {
  const [open, setOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const errorId = useId()
  const inputId = useId()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    setError(null)
    if (!nextOpen) {
      setJoinCode('')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedCode = joinCode.trim()
    if (!trimmedCode) {
      setError(classes.joinCodeRequired)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await joinClassAction({ childProfileId, joinCode: trimmedCode })
      if ('error' in result) {
        if (result.error.code === 'INVALID_JOIN_CODE') {
          setError(classes.joinInvalidCode)
        } else if (result.error.code === 'ALREADY_IN_CLASS') {
          setError(classes.joinAlreadyInClass)
        } else {
          setError(classes.joinFailed)
        }
        return
      }
      toast.success(classes.joinSuccess(result.data.className))
      handleOpenChange(false)
    } catch {
      setError(classes.joinFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" aria-label={`${classes.joinClassCta} — ${childName}`} />}
      >
        {classes.joinClassCta}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{classes.joinDialogTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor={inputId}>{classes.joinCodeInputLabel}</Label>
            <Input
              id={inputId}
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder={classes.joinCodeInputPlaceholder}
              maxLength={6}
              autoComplete="off"
              className="font-mono uppercase tracking-widest"
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
            />
          </div>

          {error && (
            <p role="alert" id={errorId} className="text-sm text-feedback-incorrect">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? classes.submitting : classes.joinSubmitCta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
