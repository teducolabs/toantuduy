import { headers } from 'next/headers'
import Link from 'next/link'
import { DashboardContent } from '@/components/parent/dashboard-content'
import { DashboardOfflineToast } from '@/components/parent/dashboard-offline-toast'
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

  return (
    <>
      <DashboardOfflineToast />
      <DashboardContent activeProfileId={activeProfileId} initialResult={result} />
    </>
  )
}
