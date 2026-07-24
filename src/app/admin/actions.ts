'use server'

import { auth } from '@/lib/auth'

// AD-10: role-only admin gate — unlike the teacher gate (AD-6) there is no
// admin status to re-verify in the DB. Shared entry point for all admin
// server actions (Stories 7.2–7.4). Never throws, never redirects.
export async function requireAdmin(): Promise<{ userId: string } | { error: { code: string; message: string } }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }
  }

  return { userId: session.user.id }
}
