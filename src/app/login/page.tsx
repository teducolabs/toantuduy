import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getHomePathForRole } from '@/lib/role-redirect'
import { LoginForm, LoginFormSkeleton } from './login-form'

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) {
    const homePath = getHomePathForRole(session.user.role)
    // Guard against a self-redirect loop: an unmapped role falls through to
    // '/login' itself, which would otherwise re-run this check forever.
    if (homePath !== '/login') {
      redirect(homePath)
    }
  }

  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
