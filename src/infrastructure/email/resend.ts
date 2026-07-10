// All outbound email must flow through this module; no surface code may import from the Resend SDK directly
import { Resend } from 'resend'
import { env } from '@/lib/env'

// Temporary Resend sandbox sender — works with any Resend API key without a
// verified domain, but can only deliver to the email address on the Resend
// account itself. Switch to a verified `toantuduy.vn` address before
// broader/production use.
const FROM_ADDRESS = 'ToanTuDuy <onboarding@resend.dev>'

const resend = new Resend(env.RESEND_API_KEY)

export async function sendEmail(options: { to: string; subject: string; html: string }): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }
}
