import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ParentDashboardLoading() {
  return (
    <main>
      <Card data-slot="dashboard-card" className="rounded-brand-md shadow-sm bg-white gap-4">
        <div className="flex justify-between gap-2 px-(--card-spacing)">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-5 w-1/2 mx-(--card-spacing)" />
        <Skeleton className="h-5 w-1/3 mx-(--card-spacing)" />
      </Card>

      <Card data-slot="skill-card" className="rounded-brand-md shadow-sm bg-white gap-4">
        <div className="px-(--card-spacing) flex flex-col gap-3">
          <Skeleton className="h-5 w-1/4" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </Card>
    </main>
  )
}
