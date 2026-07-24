import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function SubscriptionPlanCard({
  name,
  priceLabel,
  bullets,
  cta,
}: {
  name: string
  priceLabel: string
  bullets: readonly string[]
  cta: string
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
        {/* Story 6.3 wires this CTA to the checkout server action */}
        <Button className="w-full">{cta}</Button>
      </CardFooter>
    </Card>
  )
}
