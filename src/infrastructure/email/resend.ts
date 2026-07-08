// TODO: Implemented in Story 5.2 — Resend email adapter
// All outbound email must flow through this module; no surface code may import from the Resend SDK directly
export async function sendEmail(_options: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  throw new Error('Not yet implemented — Story 5.2')
}
