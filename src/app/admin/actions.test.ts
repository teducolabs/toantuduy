import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { requireAdmin } from './actions'

const authMock = auth as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  authMock.mockReset()
})

describe('requireAdmin', () => {
  it('returns the userId for an ADMIN session', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1', role: 'ADMIN' } })

    const result = await requireAdmin()

    expect(result).toEqual({ userId: 'user-1' })
  })

  it('rejects when there is no session', async () => {
    authMock.mockResolvedValue(null)

    const result = await requireAdmin()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects a session without a user', async () => {
    authMock.mockResolvedValue({})

    const result = await requireAdmin()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects a PARENT role (AD-10)', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1', role: 'PARENT' } })

    const result = await requireAdmin()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects a TEACHER role (AD-10)', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1', role: 'TEACHER' } })

    const result = await requireAdmin()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
  })
})
