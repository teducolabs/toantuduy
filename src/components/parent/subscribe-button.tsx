'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { subscribeAction } from '@/app/(parent)/subscription/actions'
import { subscription } from '@/locales/vi/subscription'

export function SubscribeButton({ plan, label = subscription.subscribeCta }: { plan: 'MONTHLY' | 'ANNUAL'; label?: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await subscribeAction(plan)
      if ('error' in result) {
        toast(subscription.checkoutErrorToast)
        return
      }
      // Full-page navigation to the external PayOS checkout domain —
      // router.push is wrong for external URLs.
      window.location.assign(result.data.checkoutUrl)
    })
  }

  return (
    <Button className="w-full" disabled={isPending} onClick={handleClick}>
      {isPending ? subscription.subscribeCtaPending : label}
    </Button>
  )
}
