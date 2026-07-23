import { db } from '@/lib/db'

export async function getTeacherStatusByEmail(
  rawEmail: string,
): Promise<{ status: 'PENDING' | 'APPROVED' | 'REJECTED'; rejectedReason: string | null } | null> {
  const email = rawEmail.trim().toLowerCase()
  const user = await db.user.findUnique({ where: { email }, include: { teacherAccount: true } })
  if (!user?.teacherAccount) return null
  return { status: user.teacherAccount.status, rejectedReason: user.teacherAccount.rejectedReason }
}

export async function getTeacherAccountStatus(
  userId: string,
): Promise<'PENDING' | 'APPROVED' | 'REJECTED' | null> {
  const teacherAccount = await db.teacherAccount.findUnique({ where: { userId } })
  return teacherAccount?.status ?? null
}
