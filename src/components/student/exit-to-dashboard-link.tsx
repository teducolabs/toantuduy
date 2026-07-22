import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { student } from '@/locales/vi/student'

// The (parent) route group only checks session.user.role, not the childProfileId
// cookie, so navigating here mid-session is always safe (AD-5).
export function ExitToDashboardLink() {
  return (
    <Link
      href="/dashboard"
      data-slot="exit-to-dashboard-link"
      className="text-muted-foreground rounded-brand-sm text-label-student min-h-11 min-w-11 px-2 py-2 inline-flex items-center gap-1"
    >
      <ArrowLeft aria-hidden="true" className="size-5 shrink-0" />
      {student.exitToDashboardCta}
    </Link>
  )
}
