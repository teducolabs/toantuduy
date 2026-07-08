// TODO: Implemented in Story 6.1 — PayOS payment adapter
// IMPORTANT: HMAC-SHA256 webhook verification is mandatory before any DB mutation
export async function createPaymentLink(_params: {
  amount: number
  description: string
  returnUrl: string
  cancelUrl: string
}): Promise<{ checkoutUrl: string; orderCode: string }> {
  throw new Error('Not yet implemented — Story 6.1')
}
