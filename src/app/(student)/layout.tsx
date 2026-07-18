import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { resolveActiveChildProfile } from '@/lib/active-child-profile'

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const childProfile = await resolveActiveChildProfile()
  if (!childProfile) {
    redirect('/dashboard')
  }

  return (
    <div
      data-mode="student"
      className="bg-student-bg min-h-screen"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {children}
    </div>
  )
}
