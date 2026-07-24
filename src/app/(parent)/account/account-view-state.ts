// Pure view resolver for the account page's subscription section.
// 'cancelled' covers any non-ACTIVE row whose paid period is still running:
// CANCELLED, and PENDING_PAYMENT with a future renewsAt (a cancelled parent who
// tapped reactivate then abandoned the PayOS page — still paid-through, so the
// page keeps offering the reactivate CTA). 'none' covers no row, EXPIRED, and
// fresh PENDING_PAYMENT (renewsAt null — never paid).
export function resolveAccountSubscriptionView(
  summary: { status: string; renewsAt: string | null } | null,
  now: Date,
): 'active' | 'cancelled' | 'none' {
  if (summary?.status === 'ACTIVE') return 'active'
  if (summary?.renewsAt != null && new Date(summary.renewsAt) > now) return 'cancelled'
  return 'none'
}
