import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { CHILD_PROFILE_COOKIE_NAME, parseChildProfileCookieValue, verifyChildProfileSignature } from '@/lib/child-profile-signature'

// Reads NEXTAUTH_SECRET directly from process.env (not `@/lib/env`) — importing the full env
// schema here would require every var it validates (DATABASE_URL, RESEND_API_KEY, ...) to also
// be defined for the Edge Middleware runtime, not just NEXTAUTH_SECRET.
//
// This only catches a tampered/malformed signature. A cookie with a valid signature pointing at
// a soft-deleted profile still reaches the route — that check needs a DB read and is handled by
// the existing redirect-to-/dashboard fallback in the (student) layout and root page instead.
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const parsed = parseChildProfileCookieValue(request.headers.get('cookie'))
  if (!parsed) return NextResponse.next()

  const secret = process.env.NEXTAUTH_SECRET
  const valid = secret ? await verifyChildProfileSignature(parsed.profileId, parsed.signature, secret) : false
  if (valid) return NextResponse.next()

  const response = NextResponse.next()
  response.cookies.delete(CHILD_PROFILE_COOKIE_NAME)
  return response
}

export const config = {
  matcher: ['/', '/session', '/summary', '/dashboard'],
}
