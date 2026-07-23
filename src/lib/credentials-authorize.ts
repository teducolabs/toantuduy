import { CredentialsSignin } from 'next-auth'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// Fixed-cost dummy hash so a lookup miss still pays the bcrypt.compare cost —
// otherwise response timing reveals whether an email is registered.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-safety', 10)

// Distinguishable error codes surfaced to login-form.tsx via signIn()'s
// result.code — see next-auth's CredentialsSignin subclassing mechanism.
export class EmailNotVerifiedError extends CredentialsSignin {
  code = 'email_not_verified'
}
export class TeacherPendingError extends CredentialsSignin {
  code = 'teacher_pending'
}
export class TeacherRejectedError extends CredentialsSignin {
  code = 'teacher_rejected'
}

export async function authorizeCredentials(
  credentials: Partial<Record<'email' | 'password', unknown>> | undefined,
): Promise<{ id: string; email: string; role: string } | null> {
  if (typeof credentials?.email !== 'string' || typeof credentials?.password !== 'string') {
    return null
  }
  const email = credentials.email.trim().toLowerCase()
  const user = await db.user.findUnique({ where: { email }, include: { teacherAccount: true } })
  const valid = await bcrypt.compare(credentials.password, user?.passwordHash ?? DUMMY_HASH)
  if (!user?.passwordHash || !valid) return null
  if (user.role === 'TEACHER') {
    // Approval — not email verification — is the sign-in gate for teachers.
    // A TEACHER user with no TeacherAccount row is treated as pending.
    if (user.teacherAccount?.status === 'REJECTED') throw new TeacherRejectedError()
    if (user.teacherAccount?.status !== 'APPROVED') throw new TeacherPendingError()
  } else if (!user.emailVerified) {
    throw new EmailNotVerifiedError()
  }
  return { id: user.id, email: user.email, role: user.role }
}
