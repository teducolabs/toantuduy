'use client'

import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { saveSessionConfigAction } from '@/app/admin/config/actions'
import { useOnlineStatus } from '@/components/student/use-online-status'
import { admin } from '@/locales/vi/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type SessionConfigFormProps = {
  initialQuestionCount: number
  initialTimeLimitMinutes: number | null
}

function parseBoundedInt(raw: string, min: number, max: number): number | null {
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null
  return parsed
}

export function SessionConfigForm({ initialQuestionCount, initialTimeLimitMinutes }: SessionConfigFormProps) {
  const [questionCount, setQuestionCount] = useState(String(initialQuestionCount))
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(initialTimeLimitMinutes !== null)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(String(initialTimeLimitMinutes ?? 25))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const errorId = useId()
  const isOnline = useOnlineStatus()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const count = parseBoundedInt(questionCount, 5, 30)
    if (count === null) {
      setError(admin.questionCountInvalid)
      return
    }

    let minutes: number | null = null
    if (timeLimitEnabled) {
      minutes = parseBoundedInt(timeLimitMinutes, 1, 180)
      if (minutes === null) {
        setError(admin.timeLimitInvalid)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const result = await saveSessionConfigAction({ questionCount: count, timeLimitMinutes: minutes })

      if ('error' in result) {
        setError(admin.configSaveFailed)
        return
      }

      toast.success(admin.configSavedToast)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="rounded-brand-sm">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="session-config-question-count">{admin.questionCountLabel}</Label>
            <Input
              id="session-config-question-count"
              type="number"
              inputMode="numeric"
              min={5}
              max={30}
              value={questionCount}
              onChange={(event) => setQuestionCount(event.target.value)}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
            />
            <p className="text-sm text-muted-foreground">{admin.questionCountHint}</p>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="session-config-time-limit-enabled"
              checked={timeLimitEnabled}
              onCheckedChange={(checked) => setTimeLimitEnabled(checked === true)}
              aria-describedby={error ? errorId : undefined}
            />
            <Label htmlFor="session-config-time-limit-enabled">{admin.timeLimitToggleLabel}</Label>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="session-config-time-limit-minutes">{admin.timeLimitMinutesLabel}</Label>
            <Input
              id="session-config-time-limit-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              value={timeLimitMinutes}
              onChange={(event) => setTimeLimitMinutes(event.target.value)}
              disabled={!timeLimitEnabled}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
            />
          </div>

          {error && (
            <p role="alert" id={errorId} className="text-sm text-feedback-incorrect">
              {error}
            </p>
          )}

          <div>
            <Button type="submit" className="min-h-11" disabled={isSubmitting || !isOnline}>
              {isSubmitting ? admin.submitting : admin.saveCta}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
