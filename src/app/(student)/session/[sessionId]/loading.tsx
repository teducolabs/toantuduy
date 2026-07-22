import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ExitToDashboardLink } from '@/components/student/exit-to-dashboard-link'

export default function StudentSessionLoading() {
  return (
    <main>
      <ExitToDashboardLink />
      <Card data-slot="question-card" className="rounded-brand-xl shadow-sm bg-white gap-4">
        <div className="px-(--card-spacing)">
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="px-(--card-spacing)">
          <Skeleton className="h-7 w-3/4" />
        </div>
      </Card>
    </main>
  )
}
