import Link from 'next/link'
import { Check, Home } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Mascot, MASCOT_CLEARANCE_CLASS } from '@/components/student/mascot'
import { student } from '@/locales/vi/student'

export function SessionSummaryCard(props: {
  score: number
  total: number
  skillRows: { name: string; correct: number; total: number }[]
  allotmentExhausted: boolean
}) {
  const { score, total, skillRows, allotmentExhausted } = props

  return (
    <Card data-slot="session-summary-card" className="relative rounded-brand-xl shadow-sm bg-white">
      <CardContent className="flex flex-col gap-4">
        <div className="animate-summary-pop motion-reduce:animate-none">
          <h1 className="text-display">{student.summaryHeadline}</h1>
          <p className="text-display">{student.summaryScoreLabel(score, total)}</p>
        </div>
        <ul className={`flex flex-col gap-2 ${MASCOT_CLEARANCE_CLASS}`}>
          {skillRows.map((row) => (
            <li key={row.name} className="text-label-student flex items-center gap-2">
              <Check aria-hidden="true" className="size-5 shrink-0 text-feedback-correct" />
              {student.skillRowLabel(row.name, row.correct, row.total)}
            </li>
          ))}
        </ul>
        <div className={`flex min-h-11 ${MASCOT_CLEARANCE_CLASS}`}>
          <Link
            href="/"
            className="bg-primary text-primary-foreground rounded-brand-lg text-label-student min-h-11 min-w-11 px-5 py-2 inline-flex items-center justify-center gap-2"
          >
            <Home aria-hidden="true" className="size-5 shrink-0" />
            {allotmentExhausted ? student.doneForTodayCta : student.backToHomeCta}
          </Link>
        </div>
      </CardContent>
      <Mascot state="happy" />
    </Card>
  )
}
