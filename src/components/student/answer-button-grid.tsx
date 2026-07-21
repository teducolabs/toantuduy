'use client'

import { useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'
import {
  computeAnswerButtonState,
  type AnswerButtonState,
  type AnswerFeedback,
} from '@/components/student/answer-button-state'

const STATE_CLASSES: Record<AnswerButtonState, string> = {
  default: 'bg-white ring-1 ring-foreground/10',
  'tapped-correct': 'bg-feedback-correct text-feedback-correct-foreground',
  'tapped-incorrect': 'bg-feedback-incorrect text-feedback-incorrect-foreground',
  'revealed-correct': 'bg-feedback-correct text-feedback-correct-foreground',
  faded: 'bg-white ring-1 ring-foreground/10 opacity-50',
}

export function AnswerButtonGrid(props: {
  sessionAnswerId: string
  choices: string[]
  disabled: boolean
  feedback: AnswerFeedback | null
  onSelect: (choice: string) => void
}) {
  const { sessionAnswerId, choices, disabled, feedback, onSelect } = props
  const firstButtonRef = useRef<HTMLButtonElement>(null)
  const hasFocusedRef = useRef(false)

  // One-shot: focus the first button when this question first becomes
  // interactive. A later disabled→enabled toggle (submit-error re-enable)
  // must not steal focus from the button the student tapped.
  useEffect(() => {
    if (!disabled && !hasFocusedRef.current) {
      hasFocusedRef.current = true
      firstButtonRef.current?.focus()
    }
  }, [sessionAnswerId, disabled])

  return (
    <div data-slot="answer-button-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {choices.map((choice, index) => {
        const state = computeAnswerButtonState(index, choices, feedback)
        return (
          <button
            key={`${choice}-${index}`}
            ref={index === 0 ? firstButtonRef : undefined}
            type="button"
            className={`min-h-16 min-w-11 rounded-brand-lg text-label-student px-4 py-2 inline-flex items-center justify-center gap-2 transition-[background-color,color,opacity] duration-200 ease-in-out motion-reduce:transition-none disabled:pointer-events-none ${STATE_CLASSES[state]} ${feedback === null ? 'disabled:opacity-50' : ''}`}
            disabled={disabled || feedback !== null}
            onClick={() => onSelect(choice)}
          >
            {choice}
            {state === 'tapped-correct' || state === 'revealed-correct' ? (
              <Check aria-hidden="true" className="size-5 shrink-0" />
            ) : null}
            {state === 'tapped-incorrect' ? <X aria-hidden="true" className="size-5 shrink-0" /> : null}
          </button>
        )
      })}
    </div>
  )
}
