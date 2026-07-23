'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { classes } from '@/locales/vi/classes'
import { COPY_CONFIRMATION_MS, computeCopyButtonLabel } from './join-code-copy-state'

export function JoinCodeDisplay({ code }: { code: string }) {
  const [copiedAt, setCopiedAt] = useState<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // Clipboard API unavailable (non-secure context) — no-op gracefully.
      return
    }
    setCopiedAt(Date.now())
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopiedAt(null), COPY_CONFIRMATION_MS)
  }

  const label = computeCopyButtonLabel(copiedAt, copiedAt ?? 0, {
    copy: classes.copyCta,
    copied: classes.copiedCta,
  })

  return (
    <Card className="rounded-brand-sm">
      <CardContent className="flex flex-col items-center gap-3 py-2 text-center">
        <p className="text-sm text-muted-foreground">{classes.joinCodeLabel}</p>
        <p className="font-mono text-3xl font-bold tracking-widest">{code}</p>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {label}
        </Button>
      </CardContent>
    </Card>
  )
}
