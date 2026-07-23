import { describe, it, expect } from 'vitest'
import { render } from '@react-email/render'
import { emails } from '@/locales/vi/emails'
import { TeacherApprovalEmail } from './teacher-approval-email'
import { TeacherRejectionEmail } from './teacher-rejection-email'

describe('TeacherApprovalEmail', () => {
  it('renders the locale greeting with the teacher name, approval copy, and login link', async () => {
    const html = await render(<TeacherApprovalEmail name="Cô Lan" loginUrl="https://toantuduy.vn/login" />)

    expect(html).toContain(emails.greeting('Cô Lan'))
    expect(html).toContain(emails.teacherApprovalBody)
    expect(html).toContain(emails.teacherApprovalCta)
    expect(html).toContain('href="https://toantuduy.vn/login"')
  })

  it('falls back to the nameless greeting when name is empty — no dangling name', async () => {
    const html = await render(<TeacherApprovalEmail name="" loginUrl="https://toantuduy.vn/login" />)

    expect(html).toContain(emails.greetingFallback)
    expect(html).not.toContain(emails.greeting(''))
  })

  it('falls back to the nameless greeting when name is whitespace-only', async () => {
    const html = await render(<TeacherApprovalEmail name="   " loginUrl="https://toantuduy.vn/login" />)

    expect(html).toContain(emails.greetingFallback)
  })
})

describe('TeacherRejectionEmail', () => {
  it('renders the locale greeting, rejection copy, and the reason verbatim', async () => {
    const html = await render(<TeacherRejectionEmail name="Cô Lan" reason="Thiếu thông tin trường học" />)

    expect(html).toContain(emails.greeting('Cô Lan'))
    expect(html).toContain(emails.teacherRejectionBody)
    expect(html).toContain(emails.teacherRejectionReason('Thiếu thông tin trường học'))
  })

  it('falls back to the nameless greeting when name is empty — no dangling name', async () => {
    const html = await render(<TeacherRejectionEmail name="" reason="Lý do bất kỳ" />)

    expect(html).toContain(emails.greetingFallback)
    expect(html).not.toContain(emails.greeting(''))
  })
})
