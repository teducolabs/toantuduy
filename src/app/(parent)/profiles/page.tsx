import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { listChildProfilesAction } from '@/app/(parent)/profiles/actions'
import { getChildProfileId } from '@/lib/child-profile-cookie'
import { ChildProfileForm } from '@/components/parent/child-profile-form'
import { ChildProfileList } from '@/components/parent/child-profile-list'
import { profiles } from '@/locales/vi/profiles'

export default async function ParentProfilesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'PARENT') {
    redirect('/login')
  }

  const result = await listChildProfilesAction()
  if ('error' in result) {
    redirect('/login')
  }

  const { childProfiles } = result.data
  const activeProfileId = await getChildProfileId(await headers())

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading">{profiles.pageTitle}</h1>
        <ChildProfileForm mode="create" trigger={profiles.addProfileCta} />
      </div>

      <ChildProfileList childProfiles={childProfiles} activeProfileId={activeProfileId} />
    </main>
  )
}
