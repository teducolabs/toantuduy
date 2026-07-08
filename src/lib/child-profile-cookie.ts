// TODO: Implemented in Story 1.3 — child profile cookie management
// childProfileId is stored in a signed, httpOnly session cookie — NOT in the NextAuth JWT
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

const _COOKIE_NAME = 'child-profile-id'

export function setChildProfileCookie(
  _cookies: ReadonlyRequestCookies,
  _childProfileId: string
): void {
  throw new Error('Not yet implemented — Story 1.3')
}

export function getChildProfileId(
  _cookies: ReadonlyRequestCookies
): string | null {
  throw new Error('Not yet implemented — Story 1.3')
}
