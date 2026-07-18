'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { deleteChildProfileAction } from '@/app/(parent)/profiles/actions'
import { profiles } from '@/locales/vi/profiles'
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

export function DeleteChildProfileDialog({ profileId, profileName }: { profileId: string; profileName: string }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleConfirm() {
    setIsSubmitting(true)
    try {
      const result = await deleteChildProfileAction({ id: profileId })
      if ('error' in result) {
        toast.error(profiles.deleteFailed)
        return
      }
      setOpen(false)
      toast.success(profiles.deleteToast)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>{profiles.deleteCta}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{profiles.deleteConfirmTitle(profileName)}</AlertDialogTitle>
          <AlertDialogDescription>{profiles.deleteConfirmBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{profiles.cancelCta}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? profiles.submitting : profiles.confirmCta}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
