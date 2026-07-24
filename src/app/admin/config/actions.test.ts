import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/infrastructure/repositories/global-config-repository', () => ({
  getSessionQuestionCount: vi.fn(),
  getSessionTimeLimitMinutes: vi.fn(),
  setSessionQuestionCount: vi.fn(),
  setSessionTimeLimitMinutes: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { auth } from '@/lib/auth'
import {
  getSessionQuestionCount,
  getSessionTimeLimitMinutes,
  setSessionQuestionCount,
  setSessionTimeLimitMinutes,
} from '@/infrastructure/repositories/global-config-repository'
import { revalidatePath } from 'next/cache'
import { getSessionConfigAction, saveSessionConfigAction } from './actions'

const authMock = auth as unknown as ReturnType<typeof vi.fn>
const getCountMock = getSessionQuestionCount as unknown as ReturnType<typeof vi.fn>
const getTimeLimitMock = getSessionTimeLimitMinutes as unknown as ReturnType<typeof vi.fn>
const setCountMock = setSessionQuestionCount as unknown as ReturnType<typeof vi.fn>
const setTimeLimitMock = setSessionTimeLimitMinutes as unknown as ReturnType<typeof vi.fn>
const revalidatePathMock = revalidatePath as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  authMock.mockReset()
  getCountMock.mockReset()
  getTimeLimitMock.mockReset()
  setCountMock.mockReset()
  setTimeLimitMock.mockReset()
  revalidatePathMock.mockReset()

  authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
  getCountMock.mockResolvedValue(10)
  getTimeLimitMock.mockResolvedValue(null)
  setCountMock.mockResolvedValue(undefined)
  setTimeLimitMock.mockResolvedValue(undefined)
})

const unauthorizedMatrix: [string, () => void][] = [
  ['no session', () => authMock.mockResolvedValue(null)],
  ['PARENT role', () => authMock.mockResolvedValue({ user: { id: 'user-1', role: 'PARENT' } })],
  ['TEACHER role', () => authMock.mockResolvedValue({ user: { id: 'user-1', role: 'TEACHER' } })],
]

describe('getSessionConfigAction', () => {
  it('returns both config values for an admin', async () => {
    getCountMock.mockResolvedValueOnce(15)
    getTimeLimitMock.mockResolvedValueOnce(20)

    const result = await getSessionConfigAction()

    expect('data' in result && result.data).toEqual({ questionCount: 15, timeLimitMinutes: 20 })
  })

  it('returns LOAD_FAILED when a getter throws', async () => {
    getCountMock.mockRejectedValueOnce(new Error('db down'))

    const result = await getSessionConfigAction()

    expect('error' in result && result.error.code).toBe('LOAD_FAILED')
  })

  it.each(unauthorizedMatrix)('rejects with UNAUTHORIZED when %s (AD-10)', async (_label, arrange) => {
    arrange()

    const result = await getSessionConfigAction()

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
    expect(getCountMock).not.toHaveBeenCalled()
  })
})

describe('saveSessionConfigAction', () => {
  it('saves both keys and revalidates the config page', async () => {
    const result = await saveSessionConfigAction({ questionCount: 15, timeLimitMinutes: 20 })

    expect('data' in result && result.data).toEqual({ questionCount: 15, timeLimitMinutes: 20 })
    expect(setCountMock).toHaveBeenCalledWith(15)
    expect(setTimeLimitMock).toHaveBeenCalledWith(20)
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/config')
  })

  it('passes null through when the time limit is disabled (D1)', async () => {
    const result = await saveSessionConfigAction({ questionCount: 10, timeLimitMinutes: null })

    expect('data' in result).toBe(true)
    expect(setTimeLimitMock).toHaveBeenCalledWith(null)
  })

  const invalidInputs: [string, { questionCount: number; timeLimitMinutes: number | null }][] = [
    ['question count below range (4)', { questionCount: 4, timeLimitMinutes: null }],
    ['question count above range (31)', { questionCount: 31, timeLimitMinutes: null }],
    ['non-integer question count (7.5)', { questionCount: 7.5, timeLimitMinutes: null }],
    ['time limit of 0', { questionCount: 10, timeLimitMinutes: 0 }],
    ['time limit above range (181)', { questionCount: 10, timeLimitMinutes: 181 }],
  ]

  it.each(invalidInputs)('returns VALIDATION_ERROR for %s — no writes, no revalidate', async (_label, input) => {
    const result = await saveSessionConfigAction(input)

    expect('error' in result && result.error.code).toBe('VALIDATION_ERROR')
    expect(setCountMock).not.toHaveBeenCalled()
    expect(setTimeLimitMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('returns SAVE_FAILED when a setter throws — no revalidate', async () => {
    setCountMock.mockRejectedValueOnce(new Error('db down'))

    const result = await saveSessionConfigAction({ questionCount: 15, timeLimitMinutes: null })

    expect('error' in result && result.error.code).toBe('SAVE_FAILED')
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it.each(unauthorizedMatrix)('rejects with UNAUTHORIZED when %s (AD-10)', async (_label, arrange) => {
    arrange()

    const result = await saveSessionConfigAction({ questionCount: 15, timeLimitMinutes: null })

    expect('error' in result && result.error.code).toBe('UNAUTHORIZED')
    expect(setCountMock).not.toHaveBeenCalled()
  })
})
