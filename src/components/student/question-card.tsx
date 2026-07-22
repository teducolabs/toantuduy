'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { AudioButton } from '@/components/student/audio-button'
import { AnswerButtonGrid } from '@/components/student/answer-button-grid'
import { Mascot, MASCOT_CLEARANCE_CLASS, type MascotState } from '@/components/student/mascot'
import { type AnswerFeedback } from '@/components/student/answer-button-state'
import { OfflineBanner } from '@/components/student/offline-banner'
import { useOnlineStatus } from '@/components/student/use-online-status'
import { completeSessionAction, submitAnswerAction } from '@/app/(student)/actions'
import { student } from '@/locales/vi/student'

const NEXT_BUTTON_DELAY_MS = 500 // UX-DR6: "Tiếp theo →" appears 500ms after feedback
const AUTO_ADVANCE_DELAY_MS = 1500 // UX-DR13: auto-advance on non-final questions

export function QuestionCard(props: {
  sessionId: string
  sessionAnswerId: string
  prompt: string
  imageUrl: string | null
  choices: string[]
  audioAutoPlay: boolean
  alreadyAnswered?: boolean
  isFinalQuestion: boolean
}) {
  const { sessionId, sessionAnswerId, prompt, imageUrl, choices, audioAutoPlay, alreadyAnswered = false, isFinalQuestion } = props
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null)
  const [showNextButton, setShowNextButton] = useState(false)
  const [isAdvancing, startAdvancing] = useTransition()
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const nextButtonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasAdvancedRef = useRef(false)
  const submitLockRef = useRef(false)
  const isMountedRef = useRef(true)
  const isOffline = !useOnlineStatus()

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (nextButtonTimerRef.current) clearTimeout(nextButtonTimerRef.current)
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
    }
  }, [])

  // Re-arm the advance guard when a refresh settles but this instance
  // survived (failed refresh, or the same-key final-question refresh) so
  // "Tiếp theo" always has a retry path instead of latching dead.
  useEffect(() => {
    if (!isAdvancing) hasAdvancedRef.current = false
  }, [isAdvancing])

  // Keyboard focus drops to <body> when feedback disables the answer grid;
  // move it to the "Tiếp theo" button once it appears (deferred from 3.5 review).
  useEffect(() => {
    if (showNextButton) nextButtonRef.current?.focus()
  }, [showNextButton])

  function advance() {
    if (hasAdvancedRef.current) return
    hasAdvancedRef.current = true
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
    if (!isFinalQuestion) {
      startAdvancing(() => {
        router.refresh()
      })
      return
    }
    // Final question: complete the session and land on the summary. The
    // async work stays inside the transition so the isAdvancing-settles
    // effect re-arms hasAdvancedRef on failure — the error path keeps a
    // free retry.
    startAdvancing(async () => {
      const result = await completeSessionAction(sessionId)
      if (!isMountedRef.current) return
      if ('error' in result) {
        toast.error(result.error.message)
        if (result.error.code === 'SESSION_NOT_FINISHED') {
          // Server truth says answers are missing (stale tab) — resync,
          // mirroring the ALREADY_ANSWERED pattern.
          router.refresh()
        }
        return
      }
      router.push(`/summary/${sessionId}`)
    })
  }

  async function handleSelect(choice: string) {
    // Synchronous re-entry lock: a double-tap must submit exactly once.
    // (isSubmitting state applies a render too late to guard this.)
    if (submitLockRef.current) return
    submitLockRef.current = true
    setIsSubmitting(true)
    const result = await submitAnswerAction(sessionAnswerId, choice)
    // Unmounted mid-flight: don't schedule timers no cleanup will clear.
    if (!isMountedRef.current) return
    if ('error' in result) {
      toast.error(result.error.message)
      if (result.error.code === 'ALREADY_ANSWERED') {
        // Server truth says this question is done (stale tab / resumed
        // render) — resync instead of stranding the student here.
        router.refresh()
      }
      submitLockRef.current = false
      setIsSubmitting(false)
      return
    }
    // Feedback state applies immediately — the 200ms in AC #1 is the CSS
    // transition duration, not a delay (UX-DR6).
    setFeedback({ selectedChoice: choice, correctAnswer: result.data.correctAnswer, correct: result.data.correct })
    nextButtonTimerRef.current = setTimeout(() => setShowNextButton(true), NEXT_BUTTON_DELAY_MS)
    if (!isFinalQuestion) {
      autoAdvanceTimerRef.current = setTimeout(advance, AUTO_ADVANCE_DELAY_MS)
    }
  }

  // When the server already marks this question answered (resume render, or
  // the final-question refresh where the key doesn't change and this instance
  // survives), the quiet end state wins over any lingering client feedback.
  const displayFeedback = alreadyAnswered ? null : feedback

  const mascotState: MascotState = displayFeedback === null ? 'neutral' : displayFeedback.correct ? 'happy' : 'gentle'

  return (
    <Card data-slot="question-card" className="relative rounded-brand-xl shadow-sm bg-white gap-4">
      <div className="flex justify-end px-(--card-spacing)">
        <AudioButton text={prompt} autoPlay={audioAutoPlay} />
      </div>
      {imageUrl ? (
        <div className="px-(--card-spacing)">
          <img src={imageUrl} alt={prompt} loading="lazy" className="h-40 w-full object-contain" />
        </div>
      ) : null}
      <p className="text-question px-(--card-spacing)">{prompt}</p>
      <div className="px-(--card-spacing)">
        <AnswerButtonGrid
          sessionAnswerId={sessionAnswerId}
          choices={choices}
          disabled={alreadyAnswered || isSubmitting || isOffline}
          feedback={displayFeedback}
          onSelect={handleSelect}
        />
        {isOffline ? <OfflineBanner /> : null}
        {/* Persistent live region: it must exist before its text changes,
            or screen readers won't announce the feedback. */}
        <p
          role="status"
          className={
            displayFeedback !== null && !displayFeedback.correct
              ? `mt-4 text-label-student ${MASCOT_CLEARANCE_CLASS}`
              : 'sr-only'
          }
        >
          {displayFeedback === null
            ? ''
            : displayFeedback.correct
              ? student.correctFeedbackSr
              : student.correctAnswerReveal(displayFeedback.correctAnswer)}
        </p>
      </div>
      {displayFeedback !== null ? (
        <div className="px-(--card-spacing) pb-2">
          <div className={`flex min-h-11 justify-end ${MASCOT_CLEARANCE_CLASS}`}>
            <button
              ref={nextButtonRef}
              type="button"
              className={`bg-primary text-primary-foreground rounded-brand-lg text-label-student min-h-11 min-w-11 px-5 py-2 inline-flex items-center justify-center gap-2 ${showNextButton ? 'visible' : 'invisible'}`}
              onClick={advance}
            >
              {student.nextCta}
              <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
            </button>
          </div>
        </div>
      ) : null}
      <Mascot state={mascotState} />
    </Card>
  )
}
