import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { SubscribeButton } from '@/components/parent/subscribe-button'

export function SubscriptionPlanCard({
  name,
  priceLabel,
  bullets,
  plan,
}: {
  name: string
  priceLabel: string
  bullets: readonly string[]
  plan: 'MONTHLY' | 'ANNUAL'
}) {
  return (
    <Card data-slot="subscription-plan-card" className="rounded-brand-md">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <p className="text-2xl font-semibold">{priceLabel}</p>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-5 text-body">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <SubscribeButton plan={plan} />
      </CardFooter>
    </Card>
  )
}
