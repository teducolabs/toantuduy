import Link from 'next/link'
import { subscription } from '@/locales/vi/subscription'

export default function ParentAccountPage() {
  return (
    <main>
      Account — coming soon
      <p className="mt-4">
        <Link
          href="/subscription/plans"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {subscription.viewPlansLink}
        </Link>
      </p>
    </main>
  )
}
