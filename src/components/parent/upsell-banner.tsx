'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { dashboard } from '@/locales/vi/dashboard'

// Fixed UTC+7, no DST — mirrors the VN day-boundary convention used server-side
// by computeVnDayBoundaryUtc/formatVnDateLabel in session-repository.ts. Duplicated
// here (rather than imported) because Presentation code must not import Infrastructure
// modules directly (see project-context.md Architecture Layer Rules).
const VN_OFFSET_MS = 7 * 3600_000

function vnDateKey(now: Date): string {
  const vn = new Date(now.getTime() + VN_OFFSET_MS)
  const month = String(vn.getUTCMonth() + 1).padStart(2, '0')
  const day = String(vn.getUTCDate()).padStart(2, '0')
  return `${vn.getUTCFullYear()}-${month}-${day}`
}

export function UpsellBanner({
  childProfileId,
  childName,
  visible,
}: {
  childProfileId: string
  childName: string
  visible: boolean
}) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const key = `upsell-dismissed-${childProfileId}-${vnDateKey(new Date())}`
    setDismissed(localStorage.getItem(key) === 'true')
  }, [childProfileId])

  if (!visible || dismissed) return null

  function dismiss() {
    const key = `upsell-dismissed-${childProfileId}-${vnDateKey(new Date())}`
    localStorage.setItem(key, 'true')
    setDismissed(true)
  }

  return (
    <Card data-slot="upsell-banner" className="rounded-brand-sm shadow-sm bg-orange-50">
      <div className="px-(--card-spacing) flex items-center justify-between gap-3">
        <p className="text-body">{dashboard.upsellBannerText(childName)}</p>
        <div className="flex items-center gap-1">
          <Link
            href="/subscription/plans"
            className="flex min-h-11 min-w-11 items-center justify-center px-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {dashboard.upsellBannerCta}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={dashboard.upsellBannerDismiss}
            onClick={dismiss}
          >
            ×
          </Button>
        </div>
      </div>
    </Card>
  )
}
