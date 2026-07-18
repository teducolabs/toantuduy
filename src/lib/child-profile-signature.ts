// Pure HMAC signing/verification for the child-profile-id cookie, built on Web Crypto so the
// same code runs in both Node (Server Components/Actions) and Edge Middleware. Deliberately has
// no dependency on `@/lib/env` — importing that here would pull its full schema (DATABASE_URL,
// RESEND_API_KEY, PAYOS_*, ...) into the Edge Middleware bundle just to get NEXTAUTH_SECRET.

export const CHILD_PROFILE_COOKIE_NAME = 'child-profile-id'

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) return null
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export async function signChildProfileId(profileId: string, secret: string): Promise<string> {
  const key = await importKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(profileId))
  return bufferToHex(signature)
}

export async function verifyChildProfileSignature(profileId: string, signatureHex: string, secret: string): Promise<boolean> {
  const signatureBytes = hexToBytes(signatureHex)
  if (!signatureBytes) return false
  const key = await importKey(secret)
  return crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(profileId))
}

export function parseChildProfileCookieValue(cookieHeader: string | null): { profileId: string; signature: string } | null {
  if (!cookieHeader) return null

  const match = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${CHILD_PROFILE_COOKIE_NAME}=`))
  if (!match) return null

  const value = match.slice(CHILD_PROFILE_COOKIE_NAME.length + 1)
  const separatorIndex = value.lastIndexOf('.')
  if (separatorIndex === -1) return null

  return { profileId: value.slice(0, separatorIndex), signature: value.slice(separatorIndex + 1) }
}
