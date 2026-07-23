import { common } from '@/locales/vi/common'

// Unauthenticated pending screen shown right after teacher registration —
// no session exists yet; approval (Epic 7) is the gate, not email verification.
export default function TeacherRegisterPendingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-body">{common.teacherPendingApproval}</p>
    </main>
  )
}
