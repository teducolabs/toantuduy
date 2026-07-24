import Link from 'next/link'
import { SubscriptionResultToast } from '@/components/parent/subscription-result-toast'
import { resolveSubscriptionResult } from './result-state'
import { subscription } from '@/locales/vi/subscription'

// Serves BOTH the PayOS returnUrl and cancelUrl. Performs ZERO subscription
// reads/writes — the query string is untrusted display input only (AD-9).
export default async function SubscriptionResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const variant = resolveSubscriptionResult(params)

  return (
    <main>
      <SubscriptionResultToast variant={variant} />
      {variant === 'success' ? (
        <>
          <h1 className="text-heading">{subscription.resultSuccessTitle}</h1>
          <p className="text-body mt-4">{subscription.resultSuccessBody}</p>
          <p className="mt-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {subscription.goToDashboardLink}
            </Link>
          </p>
        </>
      ) : (
        <>
          <h1 className="text-heading">{subscription.resultFailureTitle}</h1>
          <p className="mt-4">
            <Link
              href="/subscription/plans"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {subscription.backToPlansLink}
            </Link>
          </p>
        </>
      )}
    </main>
  )
}
