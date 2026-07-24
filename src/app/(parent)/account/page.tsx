import Link from 'next/link'
import { getSubscriptionSummaryAction } from '@/app/(parent)/subscription/actions'
import { subscription } from '@/locales/vi/subscription'

export default async function ParentAccountPage() {
  // Minimal next-billing-date slice (FR-25) — Story 6.4 rebuilds this page fully.
  // On error the stub renders unchanged (no error UI for a stub page).
  const result = await getSubscriptionSummaryAction()
  const summary = 'data' in result ? result.data : null
  const showBillingDate = summary?.status === 'ACTIVE' && summary.renewsAt !== null

  return (
    <main>
      Account — coming soon
      {showBillingDate && (
        <p className="text-body mt-4">
          {subscription.nextBillingDateLabel(new Date(summary.renewsAt as string).toLocaleDateString('vi-VN'))}
        </p>
      )}
      <p className="mt-4">
        <Link
          href="/subscription/plans"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {subscription.viewPlansLink}
        </Link>
      </p>
    </main>
  )
}
