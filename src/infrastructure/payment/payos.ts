// PayOS payment adapter (Story 6.1) — talks ONLY to the PayOS SDK + validated env (AD-2).
// No Prisma/db imports here; subscription state lives in subscription-repository.ts.
// IMPORTANT: HMAC-SHA256 webhook verification (verifyWebhook) is mandatory before any DB mutation (AD-9).
import { PayOS } from '@payos/node'
import { env } from '@/lib/env'

// Lazy singleton so importing this module (e.g. in tests) never constructs the SDK client.
let client: PayOS | null = null

function getClient(): PayOS {
  if (!client) {
    client = new PayOS({
      clientId: env.PAYOS_CLIENT_ID,
      apiKey: env.PAYOS_API_KEY,
      checksumKey: env.PAYOS_CHECKSUM_KEY,
    })
  }
  return client
}

// PayOS constraints:
// - orderCode: positive integer, unique per merchant, ≤ Number.MAX_SAFE_INTEGER
// - description: max 25 characters (VietQR field limit — PayOS rejects longer)
// - amount: integer VNĐ, no decimals
export async function initiatePayment(params: {
  orderCode: number
  amount: number
  description: string
  returnUrl: string
  cancelUrl: string
}): Promise<{ checkoutUrl: string }> {
  const response = await getClient().paymentRequests.create({
    orderCode: params.orderCode,
    amount: params.amount,
    description: params.description,
    returnUrl: params.returnUrl,
    cancelUrl: params.cancelUrl,
  })
  return { checkoutUrl: response.checkoutUrl }
}

// Verifies the webhook body's HMAC-SHA256 signature via the SDK (PAYOS_CHECKSUM_KEY).
// Returns the verified `data` object; THROWS on invalid signature or malformed payload —
// callers must treat any throw as unverified and return 400 with zero DB access.
export async function verifyWebhook(body: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getClient().webhooks.verify(body as any)
}

// Timestamp-based orderCode generator shared with Story 6.3's checkout action.
// Stays under Number.MAX_SAFE_INTEGER until ~year 2255; collision-safe enough for v1 volume.
export function generateOrderCode(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000)
}
