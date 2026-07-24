'use client'

import { useId, useState } from 'react'
import { assignAssignmentSetAction } from '@/app/(teacher)/assignments/actions'
import { toggleClassSelection, canAssign } from '@/components/teacher/assignment-builder-state'
import { AssignClassPicker, type AssignableClass } from '@/components/teacher/assign-class-picker'
import { useOnlineStatus } from '@/components/student/use-online-status'
import { assignments } from '@/locales/vi/assignments'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

const ASSIGN_ERROR_MESSAGES: Record<string, string> = {
  SET_NOT_FOUND: assignments.errorSetNotFound,
  INVALID_CLASSES: assignments.errorInvalidClasses,
}

// Assigns an EXISTING draft (D5) — opened from the draft card's "Giao bài"
// button. Failures stay inline with state preserved (UX-DR15).
export function AssignSetDialog({ assignmentSetId, classes }: { assignmentSetId: string; classes: AssignableClass[] }) {
  const [open, setOpen] = useState(false)
  // Offline disables SUBMISSION only (UX-DR15) — browsing stays available.
  const isOnline = useOnlineStatus()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false)

  const errorId = useId()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSelectedIds([])
      setError(null)
      setReplaceConfirmOpen(false)
    }
  }

  async function handleAssign(confirmReplace: boolean) {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await assignAssignmentSetAction({ assignmentSetId, classIds: selectedIds, confirmReplace })
      if ('error' in result) {
        if (result.error.code === 'CLASS_HAS_ACTIVE_SET') {
          setReplaceConfirmOpen(true)
          return
        }
        setError(ASSIGN_ERROR_MESSAGES[result.error.code] ?? assignments.errorAssignFailed)
        return
      }
      handleOpenChange(false)
    } catch {
      setError(assignments.errorAssignFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<Button size="sm" variant="outline" />}>{assignments.assignCta}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{assignments.assignDialogTitle}</DialogTitle>
          </DialogHeader>

          <AssignClassPicker
            classes={classes}
            selectedIds={selectedIds}
            onToggle={(id) => setSelectedIds((ids) => toggleClassSelection(ids, id))}
          />

          {error && (
            <p role="alert" id={errorId} className="text-sm text-feedback-incorrect">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              disabled={!canAssign(selectedIds.length) || isSubmitting || !isOnline}
              onClick={() => handleAssign(false)}
              aria-describedby={error ? errorId : undefined}
            >
              {isSubmitting ? assignments.submitting : assignments.assignCta}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{assignments.replaceConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{assignments.replaceConfirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>{assignments.cancelCta}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting || !isOnline}
              onClick={() => {
                setReplaceConfirmOpen(false)
                void handleAssign(true)
              }}
            >
              {assignments.replaceConfirmCta}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
