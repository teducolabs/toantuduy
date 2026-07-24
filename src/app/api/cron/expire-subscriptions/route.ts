// Scheduled expiry job (Story 6.1) — the ONLY non-webhook source of
// Subscription.status transitions (AD-9): ACTIVE/CANCELLED → EXPIRED past renewsAt.
// Invoked daily by Vercel Cron (see vercel.json crons[]) as a GET with
// `Authorization: Bearer ${CRON_SECRET}`.
// Node runtime (default) — Prisma requires it; do not set edge.
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { expireDueSubscriptions } from '@/infrastructure/repositories/subscription-repository'

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (req.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const expired = await expireDueSubscriptions(new Date())
  return NextResponse.json({ expired })
}
