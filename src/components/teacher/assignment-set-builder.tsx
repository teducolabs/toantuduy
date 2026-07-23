'use client'

import { useEffect, useId, useState } from 'react'
import {
  getQuestionLibraryAction,
  createAssignmentSetDraftAction,
} from '@/app/(teacher)/assignments/actions'
import {
  canAdvanceFromStep1,
  toggleQuestionSelection,
  canSaveDraft,
  selectionCountLabel,
} from '@/components/teacher/assignment-builder-state'
import { QuestionLibraryRow } from '@/components/teacher/question-library-row'
import { assignments } from '@/locales/vi/assignments'
import { profiles } from '@/locales/vi/profiles'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { GradeBand } from '@prisma/client'
import type { QuestionLibraryItem } from '@/infrastructure/repositories/question-repository'

const GRADE_BAND_OPTIONS: GradeBand[] = ['GRADE_1', 'GRADE_2', 'GRADE_3']
const ALL_SKILLS = 'ALL'

const SAVE_ERROR_MESSAGES: Record<string, string> = {
  TOO_MANY_QUESTIONS: assignments.errorTooManyQuestions,
  INVALID_QUESTIONS: assignments.errorInvalidQuestions,
}

export function AssignmentSetBuilder({
  skills,
  maxQuestions,
}: {
  skills: { id: string; code: string; name: string }[]
  maxQuestions: number
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1
  const [title, setTitle] = useState('')
  const [gradeBand, setGradeBand] = useState<GradeBand | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [step1Error, setStep1Error] = useState<string | null>(null)

  // Step 2 — all state stays mounted across steps so a mid-step failure never
  // loses the partially filled form (UX-DR15 / AC #4).
  const [skillFilter, setSkillFilter] = useState<string>(ALL_SKILLS)
  const [questions, setQuestions] = useState<QuestionLibraryItem[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [fetchFailed, setFetchFailed] = useState(false)
  const [fetchAttempt, setFetchAttempt] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Step 3
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nameId = useId()
  const nameErrorId = useId()
  const gradeBandId = useId()
  const dueDateId = useId()
  const skillFilterId = useId()
  const step2GradeBandId = useId()
  const saveErrorId = useId()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setStep(1)
      setTitle('')
      setGradeBand(null)
      setDueDate('')
      setStep1Error(null)
      setSkillFilter(ALL_SKILLS)
      setQuestions([])
      setFetchFailed(false)
      setSelectedIds([])
      setSaveError(null)
    }
  }

  useEffect(() => {
    if (!open || step !== 2 || !gradeBand) return
    let cancelled = false
    setIsLoadingQuestions(true)
    setFetchFailed(false)
    getQuestionLibraryAction({ gradeBand, ...(skillFilter !== ALL_SKILLS ? { skillId: skillFilter } : {}) })
      .then((result) => {
        if (cancelled) return
        if ('error' in result) {
          setFetchFailed(true)
          return
        }
        setQuestions(result.data.questions)
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingQuestions(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, step, gradeBand, skillFilter, fetchAttempt])

  function handleAdvanceFromStep1() {
    if (!canAdvanceFromStep1(title)) {
      setStep1Error(assignments.nameRequired)
      return
    }
    if (!gradeBand) {
      setStep1Error(profiles.gradeBandRequired)
      return
    }
    setStep1Error(null)
    setStep(2)
  }

  // A set's questions must all match its gradeBand (server integrity check) —
  // changing the band invalidates every prior selection, so clear them all.
  function handleGradeBandChangeInStep2(nextGradeBand: GradeBand) {
    if (nextGradeBand === gradeBand) return
    setGradeBand(nextGradeBand)
    setSelectedIds([])
  }

  async function handleSaveDraft() {
    if (!gradeBand || !canSaveDraft(selectedIds.length)) return
    setSaveError(null)
    setIsSubmitting(true)
    try {
      const result = await createAssignmentSetDraftAction({
        title: title.trim(),
        gradeBand,
        ...(dueDate ? { dueDate } : {}),
        questionIds: selectedIds,
      })
      if ('error' in result) {
        setSaveError(SAVE_ERROR_MESSAGES[result.error.code] ?? assignments.errorCreateFailed)
        return
      }
      handleOpenChange(false)
    } catch {
      setSaveError(assignments.saveFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  const dueDateParts = dueDate ? dueDate.split('-').map(Number) : null
  const atCap = selectedIds.length >= maxQuestions
  const stepTitles = { 1: assignments.step1Title, 2: assignments.step2Title, 3: assignments.step3Title }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={<Button size="sm" />}>{assignments.builderTrigger}</SheetTrigger>
      <SheetContent data-slot="assignment-set-builder" className="rounded-brand-md sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{assignments.sheetTitle}</SheetTitle>
          <p className="text-sm text-muted-foreground">{stepTitles[step]}</p>
        </SheetHeader>

        {step === 1 && (
          <>
            <div className="flex flex-col gap-4 overflow-y-auto px-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor={nameId}>{assignments.nameLabel}</Label>
                <Input
                  id={nameId}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={assignments.namePlaceholder}
                  maxLength={100}
                  aria-describedby={step1Error ? nameErrorId : undefined}
                  aria-invalid={Boolean(step1Error)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor={gradeBandId}>{assignments.gradeBandLabel}</Label>
                <Select value={gradeBand} onValueChange={(value) => setGradeBand(value as GradeBand)}>
                  <SelectTrigger id={gradeBandId} className="w-full" aria-describedby={step1Error ? nameErrorId : undefined}>
                    <SelectValue placeholder={assignments.gradeBandPlaceholder} />
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

              <div className="flex flex-col gap-1">
                <Label htmlFor={dueDateId}>{assignments.dueDateLabel}</Label>
                <Input id={dueDateId} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>

              {step1Error && (
                <p role="alert" id={nameErrorId} className="text-sm text-feedback-incorrect">
                  {step1Error}
                </p>
              )}
            </div>

            <SheetFooter>
              <Button onClick={handleAdvanceFromStep1}>{assignments.continueCta}</Button>
            </SheetFooter>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-4">
              <div className="flex gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Label htmlFor={skillFilterId}>{assignments.skillFilterLabel}</Label>
                  <Select value={skillFilter} onValueChange={(value) => setSkillFilter(value as string)}>
                    <SelectTrigger id={skillFilterId} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_SKILLS}>{assignments.allSkillsOption}</SelectItem>
                      {skills.map((skill) => (
                        <SelectItem key={skill.id} value={skill.id}>
                          {skill.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Label htmlFor={step2GradeBandId}>{assignments.gradeBandLabel}</Label>
                  <Select value={gradeBand} onValueChange={(value) => handleGradeBandChangeInStep2(value as GradeBand)}>
                    <SelectTrigger id={step2GradeBandId} className="w-full">
                      <SelectValue />
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
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {isLoadingQuestions && (
                  <>
                    <Skeleton className="h-11 w-full rounded-brand-sm" />
                    <Skeleton className="h-11 w-full rounded-brand-sm" />
                    <Skeleton className="h-11 w-full rounded-brand-sm" />
                  </>
                )}

                {!isLoadingQuestions && fetchFailed && (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <p role="alert" className="text-sm text-feedback-incorrect">
                      {assignments.fetchError}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setFetchAttempt((attempt) => attempt + 1)}>
                      {assignments.retryCta}
                    </Button>
                  </div>
                )}

                {!isLoadingQuestions && !fetchFailed && questions.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">{assignments.noQuestions}</p>
                )}

                {!isLoadingQuestions &&
                  !fetchFailed &&
                  questions.map((question) => {
                    const checked = selectedIds.includes(question.id)
                    return (
                      <QuestionLibraryRow
                        key={question.id}
                        prompt={question.prompt}
                        skillCode={question.skillCode}
                        skillName={question.skillName}
                        difficultyLevel={question.difficultyLevel}
                        checked={checked}
                        disabled={!checked && atCap}
                        onToggle={() => setSelectedIds((ids) => toggleQuestionSelection(ids, question.id, maxQuestions))}
                      />
                    )
                  })}
              </div>
            </div>

            <SheetFooter className="flex-row items-center justify-between border-t border-border">
              <span className="text-sm font-medium">{selectionCountLabel(selectedIds.length, maxQuestions)}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  {assignments.backCta}
                </Button>
                <Button disabled={!canSaveDraft(selectedIds.length)} onClick={() => setStep(3)}>
                  {assignments.continueCta}
                </Button>
              </div>
            </SheetFooter>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-col gap-3 overflow-y-auto px-4">
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{assignments.summaryNameLabel}</dt>
                  <dd className="text-right font-medium">{title.trim()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{assignments.summaryGradeBandLabel}</dt>
                  <dd className="font-medium">{gradeBand ? profiles.gradeBandLabels[gradeBand] : ''}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{assignments.summaryQuestionCountLabel}</dt>
                  <dd className="font-medium">{assignments.questionCount(selectedIds.length)}</dd>
                </div>
              </dl>

              {dueDateParts && (
                <p className="text-sm text-muted-foreground">{assignments.dueDateDisplay(dueDateParts[2], dueDateParts[1])}</p>
              )}

              {saveError && (
                <p role="alert" id={saveErrorId} className="text-sm text-feedback-incorrect">
                  {saveError}
                </p>
              )}
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-border">
              <Button variant="outline" disabled={isSubmitting} onClick={() => setStep(2)}>
                {assignments.backCta}
              </Button>
              <Button disabled={isSubmitting} onClick={handleSaveDraft} aria-describedby={saveError ? saveErrorId : undefined}>
                {isSubmitting ? assignments.submitting : assignments.saveDraftCta}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
