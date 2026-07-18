'use server'

import { cookies } from 'next/headers'
import { signOut } from '@/lib/auth'
import { CHILD_PROFILE_COOKIE_NAME } from '@/lib/child-profile-signature'

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(CHILD_PROFILE_COOKIE_NAME)
  await signOut({ redirectTo: '/login' })
}
