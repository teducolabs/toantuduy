import Link from 'next/link'
import { UserCheck, Settings, Library } from 'lucide-react'
import { admin } from '@/locales/vi/admin'

const SECTIONS = [
  { href: '/admin/teachers', label: admin.navTeachers, description: admin.navTeachersDescription, Icon: UserCheck },
  { href: '/admin/config', label: admin.navConfig, description: admin.navConfigDescription, Icon: Settings },
  { href: '/admin/questions', label: admin.navQuestions, description: admin.navQuestionsDescription, Icon: Library },
]

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-heading">{admin.title}</h1>
        <p className="text-body text-muted-foreground">{admin.homeDescription}</p>
      </div>

      <div className="flex flex-col gap-3">
        {SECTIONS.map(({ href, label, description, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 items-start gap-3 rounded-brand-md border border-gray-200 p-4 shadow-sm hover:bg-accent"
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex flex-col gap-1">
              <span className="text-body font-semibold">{label}</span>
              <span className="text-body text-muted-foreground">{description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
