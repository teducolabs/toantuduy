'use server'

// Registration is the one server action WITHOUT a session check — there is no
// session before an account exists.
import { z } from 'zod'
import { db } from '@/lib/db'

const registerTeacherSchema = z.object({
  name: z.string().trim().min(1).max(100),
  schoolName: z.string().trim().min(1).max(150),
  gradeTaught: z.enum(['GRADE_1', 'GRADE_2', 'GRADE_3']),
  email: z.string().email(),
})

type RegisterTeacherResult = { data: { success: true } } | { error: { code: string; message: string } }

export async function registerTeacher(input: {
  name: string
  schoolName: string
  gradeTaught: string
  email: string
}): Promise<RegisterTeacherResult> {
  const parsed = registerTeacherSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = issue?.path[0]
    const code = field === 'email' ? 'INVALID_EMAIL' : 'VALIDATION_ERROR'
    return { error: { code, message: issue?.message ?? 'Invalid input' } }
  }

  const email = parsed.data.email.trim().toLowerCase()

  // AC #6: this action never throws — even an infrastructure failure resolves
  // to an { error } result.
  let existing: { id: string } | null
  try {
    existing = await db.user.findUnique({ where: { email } })
  } catch {
    return { error: { code: 'REGISTRATION_FAILED', message: 'Registration failed' } }
  }
  if (existing) {
    return { error: { code: 'EMAIL_IN_USE', message: 'Email address already registered' } }
  }

  try {
    await db.$transaction(async (tx) => {
      // Teachers have no password/credentials at registration — approval, not
      // email verification, gates their sign-in (see Story 5.1 AC #1/#3).
      const createdUser = await tx.user.create({
        data: { email, passwordHash: null, role: 'TEACHER', emailVerified: null },
      })
      await tx.teacherAccount.create({
        data: {
          userId: createdUser.id,
          fullName: parsed.data.name,
          schoolName: parsed.data.schoolName,
          gradeTaught: parsed.data.gradeTaught,
          status: 'PENDING',
        },
      })
    })
  } catch {
    // A concurrent registration for the same email can race past the findUnique
    // check above and hit the User.email unique constraint here.
    return { error: { code: 'EMAIL_IN_USE', message: 'Email address already registered' } }
  }

  return { data: { success: true } }
}
