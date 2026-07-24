'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useOnlineStatus } from '@/components/student/use-online-status'
import { shouldFireOfflineToast } from '@/components/parent/dashboard-offline-toast-state'
import { common } from '@/locales/vi/common'

// Portal-wide connectivity toast (UX-DR15) — mounted once in the teacher
// layout. Side-effect only; the falling-edge predicate is shared with the
// parent dashboard (4.5), never re-derived.
export function TeacherOfflineToast() {
  const isOnline = useOnlineStatus()
  const previousRef = useRef(isOnline)
  const hasMountedRef = useRef(false)

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      previousRef.current = isOnline
      return
    }

    if (shouldFireOfflineToast(previousRef.current, isOnline)) {
      toast(common.teacherOfflineToast)
    }
    previousRef.current = isOnline
  }, [isOnline])

  return null
}
