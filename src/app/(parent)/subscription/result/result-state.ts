// Pure resolver for PayOS redirect query params. PayOS appends
// ?code=...&id=...&cancel=true|false&status=PAID|CANCELLED&orderCode=... to BOTH
// returnUrl and cancelUrl — the params, not the route, are the only signal.
// The query string is untrusted display input: this decides which VIEW renders,
// never any subscription state (activation is exclusively the webhook's — AD-9).
export type SubscriptionResult = 'success' | 'failure'

export function resolveSubscriptionResult(
  params: Record<string, string | string[] | undefined>,
): SubscriptionResult {
  const { status, cancel, code } = params
  return status === 'PAID' && cancel !== 'true' && code === '00' ? 'success' : 'failure'
}
