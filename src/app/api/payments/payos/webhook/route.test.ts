import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/infrastructure/payment/payos', () => ({
  verifyWebhook: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/subscription-repository', () => ({
  activateSubscriptionByOrderCode: vi.fn(),
  getParentEmailByOrderCode: vi.fn(),
}))
vi.mock('@/infrastructure/email/resend', () => ({
  sendSubscriptionActivatedEmail: vi.fn(),
}))

import { verifyWebhook } from '@/infrastructure/payment/payos'
import {
  activateSubscriptionByOrderCode,
  getParentEmailByOrderCode,
} from '@/infrastructure/repositories/subscription-repository'
import { sendSubscriptionActivatedEmail } from '@/infrastructure/email/resend'
import { POST } from './route'

const verify = verifyWebhook as unknown as ReturnType<typeof vi.fn>
const activate = activateSubscriptionByOrderCode as unknown as ReturnType<typeof vi.fn>
const getParentEmail = getParentEmailByOrderCode as unknown as ReturnType<typeof vi.fn>
const sendActivatedEmail = sendSubscriptionActivatedEmail as unknown as ReturnType<typeof vi.fn>

function webhookRequest(body: string): NextRequest {
  return new NextRequest('http://localhost/api/payments/payos/webhook', {
    method: 'POST',
    body,
  })
}

beforeEach(() => {
  verify.mockReset()
  activate.mockReset()
  getParentEmail.mockReset()
  sendActivatedEmail.mockReset().mockResolvedValue({ data: { id: 'email-1' } })
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
    getParentEmail.mockResolvedValueOnce('parent@example.vn')
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

  it('sends the activation email to the looked-up address when activation succeeds', async () => {
    verify.mockResolvedValueOnce({ orderCode: 1753000000000123, amount: 99000, code: '00' })
    activate.mockResolvedValueOnce(true)
    getParentEmail.mockResolvedValueOnce('parent@example.vn')

    const res = await POST(webhookRequest(JSON.stringify({ data: {}, signature: 'ok' })))

    expect(res.status).toBe(200)
    expect(getParentEmail).toHaveBeenCalledWith(BigInt(1753000000000123))
    expect(sendActivatedEmail).toHaveBeenCalledTimes(1)
    const [to, renewsAtLabel] = sendActivatedEmail.mock.calls[0]
    expect(to).toBe('parent@example.vn')
    expect(typeof renewsAtLabel).toBe('string')
  })

  it('does not look up or send email when activation is a no-op (replay)', async () => {
    verify.mockResolvedValueOnce({ orderCode: 42, amount: 99000, code: '00' })
    activate.mockResolvedValueOnce(false)

    const res = await POST(webhookRequest(JSON.stringify({ data: {}, signature: 'ok' })))

    expect(res.status).toBe(200)
    expect(getParentEmail).not.toHaveBeenCalled()
    expect(sendActivatedEmail).not.toHaveBeenCalled()
  })

  it('still returns 200 without sending when no parent email is found for the orderCode', async () => {
    verify.mockResolvedValueOnce({ orderCode: 42, amount: 99000, code: '00' })
    activate.mockResolvedValueOnce(true)
    getParentEmail.mockResolvedValueOnce(null)

    const res = await POST(webhookRequest(JSON.stringify({ data: {}, signature: 'ok' })))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ received: true })
    expect(sendActivatedEmail).not.toHaveBeenCalled()
  })
})
