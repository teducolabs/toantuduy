import Link from 'next/link'
import { getSubscriptionSummaryAction } from '@/app/(parent)/subscription/actions'
import { resolveAccountSubscriptionView } from '@/app/(parent)/account/account-view-state'
import { CancelSubscriptionDialog } from '@/components/parent/cancel-subscription-dialog'
import { SubscribeButton } from '@/components/parent/subscribe-button'
import { subscription } from '@/locales/vi/subscription'

function PlansLink() {
  return (
    <p className="mt-4">
      <Link
        href="/subscription/plans"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {subscription.viewPlansLink}
      </Link>
    </p>
  )
}

export default async function ParentAccountPage() {
  const result = await getSubscriptionSummaryAction()

  if ('error' in result) {
    return (
      <main>
        <h1 className="text-heading">{subscription.accountTitle}</h1>
        <p className="text-body mt-4">{subscription.loadErrorMessage}</p>
        <PlansLink />
      </main>
    )
  }

  const summary = result.data
  const view = resolveAccountSubscriptionView(summary, new Date())
  // Both non-'none' views have a non-null renewsAt by construction ('active'
  // rows are always ACTIVE-with-renewsAt after webhook activation).
  const effectiveUntil = summary?.renewsAt ? new Date(summary.renewsAt).toLocaleDateString('vi-VN') : ''

  return (
    <main>
      <h1 className="text-heading">{subscription.accountTitle}</h1>
      <section className="mt-6">
        <h2 className="font-semibold">{subscription.subscriptionSectionTitle}</h2>
        {view === 'active' && (
          <div className="mt-4 flex flex-col items-start gap-3">
            <p className="text-body">{subscription.statusActiveLabel}</p>
            <p className="text-body">{subscription.nextBillingDateLabel(effectiveUntil)}</p>
            <CancelSubscriptionDialog effectiveUntil={effectiveUntil} />
          </div>
        )}
        {view === 'cancelled' && (
          <div className="mt-4 flex flex-col items-start gap-3">
            <p className="text-body">{subscription.statusCancelledLabel(effectiveUntil)}</p>
            <SubscribeButton plan="MONTHLY" label={subscription.reactivateCta} />
          </div>
        )}
        {view === 'none' && (
          <div className="mt-4">
            <p className="text-body">{subscription.statusNoneLabel}</p>
            <PlansLink />
          </div>
        )}
      </section>
    </main>
  )
}
