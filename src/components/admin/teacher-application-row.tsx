'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { GradeBand } from '@prisma/client'
import { approveTeacherAction, rejectTeacherAction } from '@/app/admin/teachers/actions'
import { useOnlineStatus } from '@/components/student/use-online-status'
import { admin } from '@/locales/vi/admin'
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
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Server→Client boundary: the page pre-formats createdAt (D9) — only plain
// serializable fields cross into this component.
export type TeacherApplicationRowProps = {
  teacherAccountId: string
  fullName: string | null
  schoolName: string
  gradeTaught: GradeBand
  submittedDateLabel: string
}

type ActionError = { code: string; message: string }

function showActionErrorToast(error: ActionError) {
  if (error.code === 'ALREADY_PROCESSED') {
    toast(admin.alreadyProcessedToast)
    return
  }
  toast.error(admin.actionFailedToast)
}

export function TeacherApplicationRow({
  teacherAccountId,
  fullName,
  schoolName,
  gradeTaught,
  submittedDateLabel,
}: TeacherApplicationRowProps) {
  const isOnline = useOnlineStatus()
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const displayName = fullName ?? admin.applicantNameFallback
  const reasonInputId = `reject-reason-${teacherAccountId}`

  async function handleApprove() {
    setIsSubmitting(true)
    try {
      const result = await approveTeacherAction({ teacherAccountId })
      if ('error' in result) {
        showActionErrorToast(result.error)
        return
      }
      toast.success(admin.approveSuccessToast)
    } finally {
      // Row removal comes from revalidatePath's re-render — no local list state.
      setApproveOpen(false)
      setIsSubmitting(false)
    }
  }

  async function handleReject() {
    setIsSubmitting(true)
    try {
      const result = await rejectTeacherAction({ teacherAccountId, reason: reason.trim() || undefined })
      if ('error' in result) {
        showActionErrorToast(result.error)
        return
      }
      toast.success(admin.rejectSuccessToast)
    } finally {
      setRejectOpen(false)
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="rounded-brand-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-body font-semibold">{displayName}</p>
          <p className="text-body text-muted-foreground">
            {schoolName} · {admin.gradeBandLabels[gradeTaught]}
          </p>
          <p className="text-sm text-muted-foreground">{admin.submittedOn(submittedDateLabel)}</p>
        </div>

        <div className="flex items-center gap-2">
          <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
            <AlertDialogTrigger render={<Button className="min-h-11" disabled={isSubmitting || !isOnline} />}>
              {admin.approveCta}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{admin.approveConfirmTitle(displayName)}</AlertDialogTitle>
                <AlertDialogDescription>{admin.approveConfirmBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>{admin.cancelCta}</AlertDialogCancel>
                <AlertDialogAction onClick={handleApprove} disabled={isSubmitting || !isOnline}>
                  {isSubmitting ? admin.submitting : admin.approveConfirmCta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <AlertDialogTrigger render={<Button variant="outline" className="min-h-11" disabled={isSubmitting || !isOnline} />}>
              {admin.rejectCta}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{admin.rejectConfirmTitle(displayName)}</AlertDialogTitle>
                <AlertDialogDescription>{admin.rejectConfirmBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor={reasonInputId}>{admin.rejectReasonLabel}</Label>
                <Input
                  id={reasonInputId}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={admin.rejectReasonPlaceholder}
                  maxLength={500}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>{admin.cancelCta}</AlertDialogCancel>
                <AlertDialogAction onClick={handleReject} disabled={isSubmitting || !isOnline}>
                  {isSubmitting ? admin.submitting : admin.rejectConfirmCta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
