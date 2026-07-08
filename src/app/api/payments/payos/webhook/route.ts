// TODO: Implemented in Story 6.1 — PayOS webhook handler
// IMPORTANT: HMAC-SHA256 signature verification must be performed before any DB mutation
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ error: 'Not yet implemented — Story 6.1' }, { status: 501 })
}
