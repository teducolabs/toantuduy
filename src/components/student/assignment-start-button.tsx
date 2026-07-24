'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { startAssignmentSessionAction } from '@/app/(student)/actions'
import { student } from '@/locales/vi/student'

export function AssignmentStartButton({ assignmentSetId }: { assignmentSetId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isNavigating, setIsNavigating] = useState(false)

  function handleClick() {
    startTransition(async () => {
      const result = await startAssignmentSessionAction(assignmentSetId)
      if ('error' in result) {
        toast.error(result.error.message)
        return
      }
      setIsNavigating(true)
      router.push(`/session/${result.data.sessionId}`)
    })
  }

  return (
    <Button variant="outline" className="min-h-16" onClick={handleClick} disabled={isPending || isNavigating}>
      <Play aria-hidden="true" className="size-5 shrink-0" />
      {student.startAssignmentCta}
    </Button>
  )
}
