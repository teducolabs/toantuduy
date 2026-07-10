// Stateless HMAC-signed verification token — no VerificationToken table exists (Story 1.2).
// Same pattern as child-profile-cookie.ts, extended with an embedded expiry.
import crypto from 'crypto'
import { env } from '@/lib/env'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

function sign(userId: string, expiresAtEpochMs: number): string {
  return crypto
    .createHmac('sha256', env.NEXTAUTH_SECRET)
    .update(`${userId}.${expiresAtEpochMs}`)
    .digest('hex')
}

export function generateVerificationToken(userId: string): string {
  const expiresAtEpochMs = Date.now() + TOKEN_TTL_MS
  const signature = sign(userId, expiresAtEpochMs)
  return `${userId}.${expiresAtEpochMs}.${signature}`
}

export function verifyVerificationToken(token: string): { userId: string } | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [userId, expiresAtEpochMsRaw, signature] = parts
  const expiresAtEpochMs = Number(expiresAtEpochMsRaw)
  if (!userId || !Number.isFinite(expiresAtEpochMs)) return null

  const expectedSignature = sign(userId, expiresAtEpochMs)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (signatureBuffer.length !== expectedBuffer.length) return null
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null

  if (Date.now() > expiresAtEpochMs) return null

  return { userId }
}
