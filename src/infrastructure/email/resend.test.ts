import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sendMock = vi.hoisted(() => vi.fn())

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

// env.ts parses process.env at import time — mock it so tests need no real keys.
vi.mock('@/lib/env', () => ({
  env: {
    RESEND_API_KEY: 're_test_key',
    NEXTAUTH_URL: 'https://toantuduy.vn',
  },
}))

import { sendEmail, sendTeacherApprovalEmail, sendTeacherRejectionEmail } from './resend'
import { emails } from '@/locales/vi/emails'

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

beforeEach(() => {
  sendMock.mockReset().mockResolvedValue({ data: { id: 'email-1' }, error: null })
  consoleErrorSpy.mockClear()
})

afterEach(() => {
  consoleErrorSpy.mockClear()
})

describe('sendEmail', () => {
  it('returns { data: { id } } on success', async () => {
    const result = await sendEmail({ to: 'a@b.vn', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result).toEqual({ data: { id: 'email-1' } })
    expect(sendMock).toHaveBeenCalledWith({
      from: 'ToanTuDuy <onboarding@resend.dev>',
      to: 'a@b.vn',
      subject: 'Hi',
      html: '<p>Hi</p>',
    })
  })

  it('returns EMAIL_SEND_FAILED and logs when Resend returns an error — does not throw', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'invalid', name: 'validation_error' } })

    const result = await sendEmail({ to: 'a@b.vn', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result).toEqual({ error: { code: 'EMAIL_SEND_FAILED' } })
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('returns EMAIL_SEND_FAILED and logs when the SDK throws (network error) — does not throw', async () => {
    sendMock.mockRejectedValue(new Error('network down'))

    const result = await sendEmail({ to: 'a@b.vn', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result).toEqual({ error: { code: 'EMAIL_SEND_FAILED' } })
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})

describe('sendTeacherApprovalEmail', () => {
  it('sends to the given address with the locale subject and rendered approval content', async () => {
    const result = await sendTeacherApprovalEmail('teacher@school.vn', 'Cô Lan')

    expect(result).toEqual({ data: { id: 'email-1' } })
    const payload = sendMock.mock.calls[0][0]
    expect(payload.to).toBe('teacher@school.vn')
    expect(payload.subject).toBe(emails.teacherApprovalSubject)
    expect(payload.html).toContain(emails.greeting('Cô Lan'))
    expect(payload.html).toContain(emails.teacherApprovalBody)
    expect(payload.html).toContain('href="https://toantuduy.vn/login"')
  })

  it('propagates the non-throwing error shape on failure', async () => {
    sendMock.mockRejectedValue(new Error('boom'))

    const result = await sendTeacherApprovalEmail('teacher@school.vn', 'Cô Lan')

    expect(result).toEqual({ error: { code: 'EMAIL_SEND_FAILED' } })
  })
})

describe('sendTeacherRejectionEmail', () => {
  it('sends to the given address with the locale subject and the reason in the rendered content', async () => {
    const result = await sendTeacherRejectionEmail('teacher@school.vn', 'Cô Lan', 'Thiếu thông tin trường học')

    expect(result).toEqual({ data: { id: 'email-1' } })
    const payload = sendMock.mock.calls[0][0]
    expect(payload.to).toBe('teacher@school.vn')
    expect(payload.subject).toBe(emails.teacherRejectionSubject)
    expect(payload.html).toContain(emails.teacherRejectionReason('Thiếu thông tin trường học'))
  })

  it('propagates the non-throwing error shape on failure', async () => {
    sendMock.mockRejectedValue(new Error('boom'))

    const result = await sendTeacherRejectionEmail('teacher@school.vn', 'Cô Lan', 'Lý do')

    expect(result).toEqual({ error: { code: 'EMAIL_SEND_FAILED' } })
  })
})
