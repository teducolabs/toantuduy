'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { completeSessionAction } from '@/app/(student)/actions'
import { student } from '@/locales/vi/student'

export function CompleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isNavigating, setIsNavigating] = useState(false)

  function handleClick() {
    startTransition(async () => {
      const result = await completeSessionAction(sessionId)
      if ('error' in result) {
        toast.error(result.error.message)
        return
      }
      setIsNavigating(true)
      router.push(`/summary/${sessionId}`)
    })
  }

  return (
    <button
      type="button"
      data-slot="complete-session-button"
      className="bg-primary text-primary-foreground rounded-brand-lg text-label-student min-h-11 min-w-11 px-5 py-2 inline-flex items-center justify-center gap-2"
      onClick={handleClick}
      disabled={isPending || isNavigating}
    >
      {student.viewResultsCta}
      <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
    </button>
  )
}
