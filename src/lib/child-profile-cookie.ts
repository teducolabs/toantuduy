// childProfileId is stored in a signed, httpOnly session cookie — NOT in the NextAuth JWT
import type { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import {
  CHILD_PROFILE_COOKIE_NAME,
  parseChildProfileCookieValue,
  signChildProfileId,
  verifyChildProfileSignature,
} from '@/lib/child-profile-signature'

// Accepts anything exposing `.get(name)` — both the `ReadonlyHeaders` returned by `await
// headers()` and a standard `Headers` object satisfy this.
type HeaderGetter = Pick<Headers, 'get'>

// Both NextResponse.cookies (route handlers) and the mutable store returned by
// `await cookies()` (server actions) expose this same `.set()` shape.
type CookieSetter = Pick<NextResponse['cookies'], 'set'>

export async function setChildProfileCookie(profileId: string, cookieSetter: CookieSetter): Promise<void> {
  const signature = await signChildProfileId(profileId, env.NEXTAUTH_SECRET)
  cookieSetter.set(CHILD_PROFILE_COOKIE_NAME, `${profileId}.${signature}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

export async function getChildProfileId(requestHeaders: HeaderGetter): Promise<string | null> {
  const parsed = parseChildProfileCookieValue(requestHeaders.get('cookie'))
  if (!parsed) return null

  const valid = await verifyChildProfileSignature(parsed.profileId, parsed.signature, env.NEXTAUTH_SECRET)
  return valid ? parsed.profileId : null
}
