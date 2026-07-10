// childProfileId is stored in a signed, httpOnly session cookie — NOT in the NextAuth JWT
import crypto from 'crypto'
import type { NextResponse } from 'next/server'
import type { headers } from 'next/headers'
import { env } from '@/lib/env'

// Derive from the public next/headers API — avoid unstable Next.js internal types.
type HeadersLike = Awaited<ReturnType<typeof headers>>

const COOKIE_NAME = 'child-profile-id'

function sign(profileId: string): string {
  return crypto.createHmac('sha256', env.NEXTAUTH_SECRET).update(profileId).digest('hex')
}

export function setChildProfileCookie(profileId: string, response: NextResponse): void {
  const signature = sign(profileId)
  response.cookies.set(COOKIE_NAME, `${profileId}.${signature}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

export function getChildProfileId(requestHeaders: HeadersLike): string | null {
  const cookieHeader = requestHeaders.get('cookie')
  if (!cookieHeader) return null

  const match = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${COOKIE_NAME}=`))
  if (!match) return null

  const value = match.slice(COOKIE_NAME.length + 1)
  const separatorIndex = value.lastIndexOf('.')
  if (separatorIndex === -1) return null

  const profileId = value.slice(0, separatorIndex)
  const signature = value.slice(separatorIndex + 1)
  const expectedSignature = sign(profileId)

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (signatureBuffer.length !== expectedBuffer.length) return null
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null

  return profileId
}
