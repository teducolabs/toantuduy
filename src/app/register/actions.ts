'use server'

// Registration is the one server action WITHOUT a session check — there is no
// session before an account exists.
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { sendEmail } from '@/infrastructure/email/resend'
import { generateVerificationToken } from '@/lib/email-verification-token'
import { auth } from '@/locales/vi/auth'

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterResult = { data: { success: true } } | { error: { code: string; message: string } }

export async function registerParent(input: { email: string; password: string; confirmPassword: string }): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = issue?.path[0]
    const code = field === 'confirmPassword' ? 'PASSWORD_MISMATCH' : field === 'password' ? 'PASSWORD_TOO_SHORT' : field === 'email' ? 'INVALID_EMAIL' : 'VALIDATION_ERROR'
    return { error: { code, message: issue?.message ?? 'Invalid input' } }
  }

  const email = parsed.data.email.trim().toLowerCase()

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return { error: { code: 'EMAIL_IN_USE', message: 'Email address already registered' } }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  let user: { id: string }
  try {
    user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email, passwordHash, role: 'PARENT', emailVerified: null },
      })
      await tx.parentAccount.create({ data: { userId: createdUser.id } })
      return createdUser
    })
  } catch {
    // A concurrent registration for the same email can race past the findUnique
    // check above and hit the User.email unique constraint here.
    return { error: { code: 'EMAIL_IN_USE', message: 'Email address already registered' } }
  }

  await sendVerificationEmail(user.id, email)

  // Registration itself always succeeds once the account is created — an email
  // delivery failure doesn't block sign-up; the user can retry via
  // resendVerificationEmail from the confirmation screen.
  return { data: { success: true } }
}

async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const token = generateVerificationToken(userId)
  const verificationLink = `${env.NEXTAUTH_URL}/verify-email?token=${token}`
  const result = await sendEmail({
    to: email,
    subject: auth.verificationEmailSubject,
    html: `<p>${auth.verificationEmailBody}: <a href="${verificationLink}">${verificationLink}</a></p>`,
  })
  if ('error' in result) {
    console.error('Failed to send verification email', result.error)
  }
}

type ResendVerificationResult = { data: { success: true } } | { error: { code: string; message: string } }

export async function resendVerificationEmail(rawEmail: string): Promise<ResendVerificationResult> {
  const email = rawEmail.trim().toLowerCase()
  const user = await db.user.findUnique({ where: { email } })

  if (!user) {
    // Don't leak whether the email exists — same message as a generic failure.
    return { error: { code: 'RESEND_FAILED', message: 'Could not resend verification email' } }
  }
  if (user.emailVerified) {
    return { error: { code: 'ALREADY_VERIFIED', message: 'Email already verified' } }
  }

  await sendVerificationEmail(user.id, email)
  return { data: { success: true } }
}
