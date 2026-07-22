import { headers } from 'next/headers'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { WeeklyActivityStrip } from '@/components/parent/weekly-activity-strip'
import { getChildProfileId } from '@/lib/child-profile-cookie'
import { getDashboardDataAction } from '@/app/(parent)/dashboard/actions'
import { dashboard } from '@/locales/vi/dashboard'

export default async function ParentDashboardPage() {
  const activeProfileId = await getChildProfileId(await headers())
  if (!activeProfileId) {
    return (
      <main>
        <p className="text-body">
          <Link href="/profiles">{dashboard.noActiveProfile}</Link>
        </p>
      </main>
    )
  }

  const result = await getDashboardDataAction(activeProfileId)
  if ('error' in result) {
    return (
      <main>
        <p className="text-body text-muted-foreground">{result.error.message}</p>
      </main>
    )
  }

  return (
    <main>
      <Card data-slot="dashboard-card" className="rounded-brand-md shadow-sm bg-white">
        <div className="px-(--card-spacing)">
          <WeeklyActivityStrip {...result.data.weeklyActivity} />
        </div>
      </Card>
    </main>
  )
}
