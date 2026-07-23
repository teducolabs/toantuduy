import { redirect } from 'next/navigation'
import { getTeacherStatusByEmail } from '@/lib/teacher-status'
import { auth } from '@/locales/vi/auth'
import { common } from '@/locales/vi/common'

// Full-screen pending/rejected message shown after a non-approved teacher's
// credentials sign-in is refused (Story 5.1 AC #3/#4). Unauthenticated by
// necessity — no session is ever established for a non-approved teacher. It
// reveals nothing beyond what the sign-in attempt itself already implied.
export default async function TeacherStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>
}) {
  const { email: rawEmail } = await searchParams
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail
  const teacher = email ? await getTeacherStatusByEmail(email) : null

  if (!teacher || teacher.status === 'APPROVED') {
    redirect('/login')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      {teacher.status === 'REJECTED' ? (
        <>
          <p className="text-body">{auth.teacherRejected}</p>
          {teacher.rejectedReason && <p className="text-body">{auth.teacherRejectedReason(teacher.rejectedReason)}</p>}
        </>
      ) : (
        <p className="text-body">{common.teacherPendingApproval}</p>
      )}
    </main>
  )
}
