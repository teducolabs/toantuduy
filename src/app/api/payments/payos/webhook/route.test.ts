import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/infrastructure/payment/payos', () => ({
  verifyWebhook: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/subscription-repository', () => ({
  activateSubscriptionByOrderCode: vi.fn(),
}))

import { verifyWebhook } from '@/infrastructure/payment/payos'
import { activateSubscriptionByOrderCode } from '@/infrastructure/repositories/subscription-repository'
import { POST } from './route'

const verify = verifyWebhook as unknown as ReturnType<typeof vi.fn>
const activate = activateSubscriptionByOrderCode as unknown as ReturnType<typeof vi.fn>

function webhookRequest(body: string): NextRequest {
  return new NextRequest('http://localhost/api/payments/payos/webhook', {
    method: 'POST',
    body,
  })
}

beforeEach(() => {
  verify.mockReset()
  activate.mockReset()
})

describe('POST /api/payments/payos/webhook', () => {
  it('returns 400 and never touches the repository when the signature is invalid', async () => {
    verify.mockRejectedValueOnce(new Error('Invalid signature'))

    const res = await POST(webhookRequest(JSON.stringify({ signature: 'bad' })))

    expect(res.status).toBe(400)
    expect(activate).not.toHaveBeenCalled()
  })

  it('returns 400 on a malformed JSON body without verifying or mutating', async () => {
    const res = await POST(webhookRequest('not-json{'))

    expect(res.status).toBe(400)
    expect(verify).not.toHaveBeenCalled()
    expect(activate).not.toHaveBeenCalled()
  })

  it('activates the subscription with the orderCode and ~30-day renewsAt on a verified PAID event', async () => {
    verify.mockResolvedValueOnce({ orderCode: 1753000000000123, amount: 99000, code: '00' })
    activate.mockResolvedValueOnce(true)
    const before = Date.now()

    const res = await POST(webhookRequest(JSON.stringify({ data: {}, signature: 'ok' })))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ received: true })
    expect(activate).toHaveBeenCalledTimes(1)
    const [orderCode, renewsAt] = activate.mock.calls[0]
    expect(orderCode).toBe(BigInt(1753000000000123))
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    expect((renewsAt as Date).getTime() - before).toBeGreaterThanOrEqual(thirtyDaysMs - 5000)
    expect((renewsAt as Date).getTime() - before).toBeLessThanOrEqual(thirtyDaysMs + 5000)
  })

  it('acknowledges a verified non-success event with 200 and no activation', async () => {
    verify.mockResolvedValueOnce({ orderCode: 42, amount: 99000, code: '01' })

    const res = await POST(webhookRequest(JSON.stringify({ data: {}, signature: 'ok' })))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ received: true })
    expect(activate).not.toHaveBeenCalled()
  })

  it('still returns 200 when activation matches no row (replay / unknown orderCode)', async () => {
    verify.mockResolvedValueOnce({ orderCode: 42, amount: 99000, code: '00' })
    activate.mockResolvedValueOnce(false)

    const res = await POST(webhookRequest(JSON.stringify({ data: {}, signature: 'ok' })))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ received: true })
  })
})
