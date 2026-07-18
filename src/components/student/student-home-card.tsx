import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SessionStartButton } from '@/components/student/session-start-button'
import { student } from '@/locales/vi/student'

export function StudentHomeCard(props: {
  childName: string
  activeSession?: { progressLabel: string }
}) {
  const { activeSession } = props
  return (
    <Card className="rounded-brand-xl bg-primary text-primary-foreground">
      <CardContent>
        {activeSession ? (
          <Button className="min-h-16">
            {`${student.resumeSessionCta} ${activeSession.progressLabel}`}
          </Button>
        ) : (
          <SessionStartButton />
        )}
      </CardContent>
    </Card>
  )
}
