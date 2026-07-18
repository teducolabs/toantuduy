import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { listChildProfilesAction } from '@/app/(parent)/profiles/actions'
import { ChildProfileSwitcher } from '@/components/parent/child-profile-switcher'
import { common } from '@/locales/vi/common'

const NAV_ITEMS = [
  { href: '/dashboard', label: common.parentNavDashboard },
  { href: '/profiles', label: common.parentNavProfiles },
  { href: '/subscription', label: common.parentNavSubscription },
  { href: '/account', label: common.parentNavAccount },
]

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'PARENT') {
    redirect('/login')
  }

  const result = await listChildProfilesAction()
  if ('error' in result) {
    redirect('/login')
  }
  const childProfiles = result.data.childProfiles

  return (
    <div className="min-h-screen pb-16 lg:flex lg:pb-0">
      <nav className="hidden lg:flex lg:w-56 lg:flex-col lg:gap-2 lg:border-r lg:border-gray-200 lg:p-4">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-brand-md px-3 py-2 text-body">
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-1 flex-col">
        <div className="flex justify-end border-b border-gray-200 px-4 py-3">
          <ChildProfileSwitcher childProfiles={childProfiles} />
        </div>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-gray-200 bg-background py-2 lg:hidden">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="text-body">
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
