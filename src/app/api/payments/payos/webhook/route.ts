// PayOS webhook handler (Story 6.1) — the ONLY payment-driven source of
// Subscription.status transitions (AD-9). Path fixed by AD-9: /api/payments/payos/webhook.
// HMAC-SHA256 signature verification happens BEFORE any DB access — the repository
// is only reached after verifyWebhook succeeds.
// Node runtime (default) — Prisma and the PayOS SDK require it; do not set edge.
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook } from '@/infrastructure/payment/payos'
import { activateSubscriptionByOrderCode } from '@/infrastructure/repositories/subscription-repository'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // ── Verification gate: zero DB access before this point ──────────────────
  let data
  try {
    data = await verifyWebhook(body)
  } catch {
    // Don't log payload contents (buyer info) — signature failures carry no orderCode we trust.
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Verified but non-success (failed/cancelled payment): acknowledge so PayOS
  // stops retrying, mutate nothing.
  if (data.code !== '00') {
    return NextResponse.json({ received: true })
  }

  const renewsAt = new Date(Date.now() + THIRTY_DAYS_MS)
  // `activated` is false on replays (row already ACTIVE) and on PayOS's
  // webhook-registration test payload (orderCode matches no Subscription) — both
  // must still get a 2xx, or PayOS retries / registration fails.
  // Story 6.3 hooks sendSubscriptionActivatedEmail(...) here, gated on `activated`.
  const activated = await activateSubscriptionByOrderCode(BigInt(data.orderCode), renewsAt)
  console.log(`[payos-webhook] orderCode=${data.orderCode} activated=${activated}`)

  return NextResponse.json({ received: true })
}
