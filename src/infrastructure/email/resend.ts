// All outbound email must flow through this module; no surface code may import from the Resend SDK directly
import type { ReactElement } from 'react'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { env } from '@/lib/env'
import { emails } from '@/locales/vi/emails'
import { TeacherApprovalEmail } from './templates/teacher-approval-email'
import { TeacherRejectionEmail } from './templates/teacher-rejection-email'

// Temporary Resend sandbox sender — works with any Resend API key without a
// verified domain, but can only deliver to the email address on the Resend
// account itself. Switch to a verified `toantuduy.vn` address before
// broader/production use.
const FROM_ADDRESS = 'ToanTuDuy <onboarding@resend.dev>'

const resend = new Resend(env.RESEND_API_KEY)

export type SendEmailResult = { data: { id: string } } | { error: { code: string } }

type SendEmailOptions = { to: string; subject: string } & ({ html: string; react?: never } | { react: ReactElement; html?: never })

// Email delivery is best-effort: this never throws, so a failed send can never
// roll back or fail the caller's own write (e.g. an approval DB update).
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const html = options.react ? await render(options.react) : options.html

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: options.to,
      subject: options.subject,
      html,
    })

    if (error || !data) {
      console.error('Failed to send email', { to: options.to, subject: options.subject, error })
      return { error: { code: 'EMAIL_SEND_FAILED' } }
    }

    return { data: { id: data.id } }
  } catch (err) {
    console.error('Failed to send email', { to: options.to, subject: options.subject, err })
    return { error: { code: 'EMAIL_SEND_FAILED' } }
  }
}

export async function sendTeacherApprovalEmail(to: string, name: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: emails.teacherApprovalSubject,
    react: TeacherApprovalEmail({ name, loginUrl: `${env.NEXTAUTH_URL}/login` }),
  })
}

export async function sendTeacherRejectionEmail(to: string, name: string, reason: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: emails.teacherRejectionSubject,
    react: TeacherRejectionEmail({ name, reason }),
  })
}
