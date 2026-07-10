import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { getTeacherAccountStatus } from '@/lib/teacher-status'
import { common } from '@/locales/vi/common'

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'TEACHER') {
    redirect('/login')
  }

  const status = await getTeacherAccountStatus(session.user.id)
  if (status !== 'APPROVED') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-body">{common.teacherPendingApproval}</p>
      </main>
    )
  }

  return <>{children}</>
}
