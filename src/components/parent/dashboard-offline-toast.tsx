'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useOnlineStatus } from '@/components/student/use-online-status'
import { shouldFireOfflineToast } from '@/components/parent/dashboard-offline-toast-state'
import { dashboard } from '@/locales/vi/dashboard'

export function DashboardOfflineToast() {
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
      toast(dashboard.offlineToastMessage)
    }
    previousRef.current = isOnline
  }, [isOnline])

  return null
}
