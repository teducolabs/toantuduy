import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getHomePathForRole } from '@/lib/role-redirect'
import { resolveActiveChildProfile } from '@/lib/active-child-profile'
import { requireParentAccountId } from '@/app/(parent)/profiles/actions'
import { student } from '@/locales/vi/student'

export default async function RootPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role === 'PARENT') {
    const resolved = await requireParentAccountId()
    if (!('error' in resolved)) {
      const childProfile = await resolveActiveChildProfile(resolved.parentAccountId)
      if (childProfile) {
        return <div data-mode="student" className="bg-student-bg min-h-screen">{student.greeting(childProfile.name)}</div>
      }
    }
  }

  redirect(getHomePathForRole(session.user.role))
}
