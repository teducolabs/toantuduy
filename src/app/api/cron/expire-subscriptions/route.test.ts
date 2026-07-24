import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// env.ts parses process.env at import time — must be mocked before the route imports it.
vi.mock('@/lib/env', () => ({
  env: { CRON_SECRET: 'test-cron-secret-16ch' },
}))
vi.mock('@/infrastructure/repositories/subscription-repository', () => ({
  expireDueSubscriptions: vi.fn(),
}))

import { expireDueSubscriptions } from '@/infrastructure/repositories/subscription-repository'
import { GET } from './route'

const expire = expireDueSubscriptions as unknown as ReturnType<typeof vi.fn>

function cronRequest(authorization?: string): NextRequest {
  return new NextRequest('http://localhost/api/cron/expire-subscriptions', {
    headers: authorization ? { authorization } : {},
  })
}

beforeEach(() => {
  expire.mockReset()
})

describe('GET /api/cron/expire-subscriptions', () => {
  it('returns 401 and never calls the repository when the Authorization header is missing', async () => {
    const res = await GET(cronRequest())

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'UNAUTHORIZED' })
    expect(expire).not.toHaveBeenCalled()
  })

  it('returns 401 and never calls the repository on a wrong Bearer token', async () => {
    const res = await GET(cronRequest('Bearer wrong-secret'))

    expect(res.status).toBe(401)
    expect(expire).not.toHaveBeenCalled()
  })

  it('expires due subscriptions and reports the count on a correct Bearer token', async () => {
    expire.mockResolvedValueOnce(3)

    const res = await GET(cronRequest('Bearer test-cron-secret-16ch'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ expired: 3 })
    expect(expire).toHaveBeenCalledTimes(1)
    expect(expire.mock.calls[0][0]).toBeInstanceOf(Date)
  })
})
