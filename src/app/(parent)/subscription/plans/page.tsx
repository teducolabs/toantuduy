import { SubscriptionPlanCard } from '@/components/parent/subscription-plan-card'
import { getSubscriptionPlansAction } from '@/app/(parent)/subscription/actions'
import { subscription } from '@/locales/vi/subscription'

export default async function SubscriptionPlansPage() {
  const result = await getSubscriptionPlansAction()

  if ('error' in result) {
    return (
      <main>
        <h1 className="text-heading">{subscription.plansTitle}</h1>
        <p className="text-body mt-4">{subscription.loadErrorMessage}</p>
      </main>
    )
  }

  const { monthlyPriceVnd, annualPriceVnd } = result.data

  return (
    <main>
      <h1 className="text-heading">{subscription.plansTitle}</h1>
      <div className="mt-4 flex flex-col gap-4">
        <SubscriptionPlanCard
          name={subscription.monthlyPlanName}
          priceLabel={subscription.priceMonthly(monthlyPriceVnd)}
          bullets={subscription.planBullets}
          plan="MONTHLY"
        />
        {annualPriceVnd !== null && (
          <SubscriptionPlanCard
            name={subscription.annualPlanName}
            priceLabel={subscription.priceAnnual(annualPriceVnd)}
            bullets={subscription.planBullets}
            plan="ANNUAL"
          />
        )}
      </div>
    </main>
  )
}
