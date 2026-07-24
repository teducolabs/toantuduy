import { describe, it, expect, vi, beforeEach } from 'vitest'

const paymentRequestsCreate = vi.fn()
const webhooksVerify = vi.fn()

vi.mock('@payos/node', () => ({
  PayOS: class {
    paymentRequests = { create: paymentRequestsCreate }
    webhooks = { verify: webhooksVerify }
  },
}))
vi.mock('@/lib/env', () => ({
  env: {
    PAYOS_CLIENT_ID: 'client-id',
    PAYOS_API_KEY: 'api-key',
    PAYOS_CHECKSUM_KEY: 'checksum-key',
  },
}))

import { initiatePayment, verifyWebhook, generateOrderCode } from './payos'

beforeEach(() => {
  paymentRequestsCreate.mockReset()
  webhooksVerify.mockReset()
})

describe('initiatePayment', () => {
  it('passes params through to the SDK and returns the checkoutUrl', async () => {
    paymentRequestsCreate.mockResolvedValueOnce({
      checkoutUrl: 'https://pay.payos.vn/web/abc',
      orderCode: 123,
      paymentLinkId: 'pl_1',
    })

    const params = {
      orderCode: 123,
      amount: 99000,
      description: 'ToanTuDuy goi thang',
      returnUrl: 'https://app.example/return',
      cancelUrl: 'https://app.example/cancel',
    }
    const result = await initiatePayment(params)

    expect(paymentRequestsCreate).toHaveBeenCalledWith(params)
    expect(result).toEqual({ checkoutUrl: 'https://pay.payos.vn/web/abc' })
  })
})

describe('verifyWebhook', () => {
  it('returns the verified data from the SDK', async () => {
    const data = { orderCode: 123, amount: 99000, code: '00' }
    webhooksVerify.mockResolvedValueOnce(data)

    const body = { code: '00', desc: 'success', success: true, data, signature: 'sig' }
    await expect(verifyWebhook(body)).resolves.toEqual(data)
    expect(webhooksVerify).toHaveBeenCalledWith(body)
  })

  it('propagates SDK throws (invalid signature) to the caller', async () => {
    webhooksVerify.mockRejectedValueOnce(new Error('Invalid signature'))

    await expect(verifyWebhook({ signature: 'bad' })).rejects.toThrow('Invalid signature')
  })
})

describe('generateOrderCode', () => {
  it('returns a positive safe integer', () => {
    const code = generateOrderCode()
    expect(Number.isSafeInteger(code)).toBe(true)
    expect(code).toBeGreaterThan(0)
  })

  it('returns distinct consecutive values', () => {
    // Pin the clock and the random suffix so same-millisecond calls can't flake.
    vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
    const random = vi.spyOn(Math, 'random')
    random.mockReturnValueOnce(0.1).mockReturnValueOnce(0.2).mockReturnValueOnce(0.3)

    const codes = new Set([generateOrderCode(), generateOrderCode(), generateOrderCode()])
    expect(codes.size).toBe(3)

    vi.restoreAllMocks()
  })
})
