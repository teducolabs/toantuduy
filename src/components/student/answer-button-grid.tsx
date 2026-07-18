'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitAnswerAction } from '@/app/(student)/actions'

export function AnswerButtonGrid(props: { sessionAnswerId: string; choices: string[]; disabled?: boolean }) {
  const { sessionAnswerId, choices, disabled = false } = props
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const firstButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!disabled) firstButtonRef.current?.focus()
  }, [sessionAnswerId, disabled])

  async function handleTap(choice: string) {
    setIsSubmitting(true)
    const result = await submitAnswerAction(sessionAnswerId, choice)
    if ('error' in result) {
      setIsSubmitting(false)
      toast.error(result.error.message)
      return
    }
    router.refresh()
  }

  return (
    <div data-slot="answer-button-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {choices.map((choice, index) => (
        <button
          key={`${choice}-${index}`}
          ref={index === 0 ? firstButtonRef : undefined}
          type="button"
          className="min-h-16 min-w-11 rounded-brand-lg text-label-student bg-white px-4 py-2 ring-1 ring-foreground/10 disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled || isSubmitting}
          onClick={() => handleTap(choice)}
        >
          {choice}
        </button>
      ))}
    </div>
  )
}
