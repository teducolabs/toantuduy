import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BookOpen, ClipboardList, BarChart3 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getTeacherAccountStatus } from '@/lib/teacher-status'
import { signOutAction } from '@/lib/auth-actions'
import { TeacherOfflineToast } from '@/components/teacher/teacher-offline-toast'
import { common } from '@/locales/vi/common'

const NAV_ITEMS = [
  { href: '/classes', label: common.teacherNavClasses, Icon: BookOpen },
  { href: '/assignments', label: common.teacherNavAssignments, Icon: ClipboardList },
  { href: '/reports', label: common.teacherNavReports, Icon: BarChart3 },
]

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'TEACHER') {
    redirect('/login')
  }

  // AD-6: fresh DB status read per request — a post-issuance status flip
  // (PENDING/REJECTED or a deleted row) is caught here regardless of the JWT.
  const status = await getTeacherAccountStatus(session.user.id)
  if (status !== 'APPROVED') {
    redirect('/register/teacher/pending')
  }

  return (
    <div className="flex min-h-screen">
      <TeacherOfflineToast />
      <nav className="flex w-14 flex-col gap-1 border-r border-gray-200 p-2 lg:w-56 lg:p-4">
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-brand-md px-2 py-2 text-body hover:bg-accent lg:justify-start lg:px-3"
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-end border-b border-gray-200 px-4 py-3">
          <form action={signOutAction}>
            <button type="submit" className="text-body text-muted-foreground">
              {common.signOut}
            </button>
          </form>
        </div>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  )
}
