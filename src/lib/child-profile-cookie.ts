// TODO: Implemented in Story 1.3 — child profile cookie management
// childProfileId is stored in a signed, httpOnly session cookie — NOT in the NextAuth JWT
import type { cookies } from 'next/headers'

// Derive type from the public next/headers API to avoid unstable internal paths
type CookieStore = Awaited<ReturnType<typeof cookies>>

const _COOKIE_NAME = 'child-profile-id'

export function setChildProfileCookie(
  _cookies: CookieStore,
  _childProfileId: string
): void {
  throw new Error('Not yet implemented — Story 1.3')
}

export function getChildProfileId(
  _cookies: CookieStore
): string | null {
  throw new Error('Not yet implemented — Story 1.3')
}
