import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getHomePathForRole } from '@/lib/role-redirect'

export default async function RootPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  redirect(getHomePathForRole(session.user.role))
}
