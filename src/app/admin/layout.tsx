import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { UserCheck, Settings, Library } from 'lucide-react'
import { auth } from '@/lib/auth'
import { signOutAction } from '@/lib/auth-actions'
import { common } from '@/locales/vi/common'
import { admin } from '@/locales/vi/admin'

const NAV_ITEMS = [
  { href: '/admin/teachers', label: admin.navTeachers, Icon: UserCheck },
  { href: '/admin/config', label: admin.navConfig, Icon: Settings },
  { href: '/admin/questions', label: admin.navQuestions, Icon: Library },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3">
        <Link href="/admin" className="flex min-h-11 items-center rounded-brand-md px-3 py-2 text-heading">
          {admin.title}
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 items-center gap-2 rounded-brand-md px-3 py-2 text-body hover:bg-accent"
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <form action={signOutAction}>
          <button type="submit" className="min-h-11 rounded-brand-md px-3 py-2 text-body text-muted-foreground hover:bg-accent">
            {common.signOut}
          </button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
