import { dashboard } from '@/locales/vi/dashboard'

export function WeeklyActivityStrip({
  days,
  weeklySessionCount,
  streak,
  hasAnyCompletedSession,
}: {
  days: boolean[]
  weeklySessionCount: number
  streak: number
  hasAnyCompletedSession: boolean
}) {
  return (
    <div data-slot="weekly-activity-strip" className="flex flex-col gap-3">
      <div className="flex justify-between gap-2">
        {days.map((active, i) => (
          <span
            key={i}
            className={`h-8 w-8 rounded-full ${active ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
      <p className="text-body">{dashboard.weeklySummary(weeklySessionCount)}</p>
      {hasAnyCompletedSession ? <p className="text-body">{dashboard.streakLabel(streak)}</p> : null}
    </div>
  )
}
