'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cancelSubscriptionAction } from '@/app/(parent)/subscription/actions'
import { subscription } from '@/locales/vi/subscription'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

// effectiveUntil is the formatted renewsAt date passed from the RSC, so the
// parent sees exactly how long access lasts before confirming. No
// router.refresh() on success — the action's revalidatePath('/account')
// re-renders the RSC with the cancelled view.
export function CancelSubscriptionDialog({ effectiveUntil }: { effectiveUntil: string }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    setIsSubmitting(true)
    try {
      const result = await cancelSubscriptionAction()
      if ('error' in result) {
        toast.error(subscription.cancelErrorToast)
        return
      }
      setOpen(false)
      toast.success(subscription.cancelSuccessToast(effectiveUntil))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>{subscription.cancelCta}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{subscription.cancelConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{subscription.cancelConfirmBody(effectiveUntil)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{subscription.cancelConfirmKeepCta}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? subscription.subscribeCtaPending : subscription.cancelCta}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
