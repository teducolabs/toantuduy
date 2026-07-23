import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BookOpen, ClipboardList, BarChart3 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getTeacherAccountStatus } from '@/lib/teacher-status'
import { signOutAction } from '@/lib/auth-actions'
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

  const status = await getTeacherAccountStatus(session.user.id)
  if (status !== 'APPROVED') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-body">{common.teacherPendingApproval}</p>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen">
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
