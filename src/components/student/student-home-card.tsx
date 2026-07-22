import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SessionStartButton } from '@/components/student/session-start-button'
import { student } from '@/locales/vi/student'

export function StudentHomeCard(props: {
  childName: string
  activeSession?: { sessionId: string; progressLabel: string }
}) {
  const { activeSession } = props
  return (
    <Card className="rounded-brand-xl bg-primary text-primary-foreground">
      <CardContent>
        {activeSession ? (
          <Link
            href={`/session/${activeSession.sessionId}`}
            className="bg-primary text-primary-foreground rounded-brand-lg text-label-student min-h-11 min-w-11 px-5 py-2 inline-flex items-center justify-center gap-2"
          >
            <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
            {`${student.resumeSessionCta} ${activeSession.progressLabel}`}
          </Link>
        ) : (
          <SessionStartButton />
        )}
      </CardContent>
    </Card>
  )
}
