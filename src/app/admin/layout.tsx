import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { auth } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return <>{children}</>
}
