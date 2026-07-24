'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { subscription } from '@/locales/vi/subscription'

// Fires the result toast exactly once on mount. The toast is dismissible/missable —
// the result page's inline content is the durable state (UX-DR14).
export function SubscriptionResultToast({ variant }: { variant: 'success' | 'failure' }) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    if (variant === 'success') {
      toast(subscription.successToast)
    } else {
      toast.error(subscription.checkoutErrorToast)
    }
  }, [variant])

  return null
}
