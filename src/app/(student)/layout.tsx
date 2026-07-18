import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { resolveActiveChildProfile } from '@/lib/active-child-profile'

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const childProfile = await resolveActiveChildProfile()
  if (!childProfile) {
    redirect('/dashboard')
  }

  return <div data-mode="student" className="bg-student-bg min-h-screen">{children}</div>
}
