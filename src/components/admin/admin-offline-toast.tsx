'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useOnlineStatus } from '@/components/student/use-online-status'
import { shouldFireOfflineToast } from '@/components/parent/dashboard-offline-toast-state'
import { admin } from '@/locales/vi/admin'

// Approval-queue connectivity toast (UX-DR16, 7.2 D8) — mounted once in the
// teachers page, not the admin layout (7.3 owns config-page states). Side-effect
// only; the falling-edge predicate is shared with the parent dashboard (4.5).
export function AdminOfflineToast() {
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
      toast(admin.offlineToast)
    }
    previousRef.current = isOnline
  }, [isOnline])

  return null
}
