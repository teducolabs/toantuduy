import { db } from '@/lib/db'

export async function getTeacherAccountStatus(
  userId: string,
): Promise<'PENDING' | 'APPROVED' | 'REJECTED' | null> {
  const teacherAccount = await db.teacherAccount.findUnique({ where: { userId } })
  return teacherAccount?.status ?? null
}
