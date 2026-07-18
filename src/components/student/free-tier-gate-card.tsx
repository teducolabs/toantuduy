import { Card, CardContent } from '@/components/ui/card'
import { student } from '@/locales/vi/student'

export function FreeTierGateCard(props: { childName: string; tomorrowLabel: string }) {
  return (
    <Card className="rounded-brand-xl bg-primary text-primary-foreground">
      <CardContent>
        <p className="text-display">{student.freeTierGateTitle(props.childName)}</p>
        <p>{student.freeTierGateSubtitle(props.tomorrowLabel)}</p>
      </CardContent>
    </Card>
  )
}
