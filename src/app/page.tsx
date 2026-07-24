import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getHomePathForRole } from '@/lib/role-redirect'
import { resolveActiveChildProfile } from '@/lib/active-child-profile'
import { requireParentAccountId } from '@/app/(parent)/profiles/actions'
import { getActiveSessionState, getActiveAssignmentsState, getSessionStartGateState } from '@/app/(student)/actions'
import { student } from '@/locales/vi/student'
import { StudentHomeCard } from '@/components/student/student-home-card'
import { FreeTierGateCard } from '@/components/student/free-tier-gate-card'
import { AssignmentCard } from '@/components/student/assignment-card'
import { ExitToDashboardLink } from '@/components/student/exit-to-dashboard-link'

export default async function RootPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role === 'PARENT') {
    const resolved = await requireParentAccountId()
    if (!('error' in resolved)) {
      const childProfile = await resolveActiveChildProfile(resolved.parentAccountId)
      if (childProfile) {
        const gateState = await getSessionStartGateState(childProfile.id, resolved.parentAccountId)
        // D7: assignment cards render only when the free-tier gate is NOT
        // blocked (one card per active assignment, assignedAt desc).
        const assignments = gateState.blocked ? [] : await getActiveAssignmentsState(childProfile.id)
        const assignmentCards = assignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignmentSetId={assignment.id}
            title={assignment.title}
            teacherName={assignment.teacherName}
            dueAt={assignment.dueAt}
          />
        ))

        const activeSession = await getActiveSessionState(childProfile.id)
        if (activeSession) {
          return (
            <div data-mode="student" className="bg-student-bg min-h-screen">
              <ExitToDashboardLink />
              <h1 className="text-display">{student.greeting(childProfile.name)}</h1>
              <StudentHomeCard childName={childProfile.name} activeSession={activeSession} />
              {assignmentCards}
            </div>
          )
        }

        return (
          <div data-mode="student" className="bg-student-bg min-h-screen">
            <ExitToDashboardLink />
            <h1 className="text-display">{student.greeting(childProfile.name)}</h1>
            {gateState.blocked ? (
              <FreeTierGateCard childName={childProfile.name} tomorrowLabel={gateState.tomorrowLabel} />
            ) : (
              <>
                <StudentHomeCard childName={childProfile.name} activeSession={undefined} />
                {assignmentCards}
              </>
            )}
          </div>
        )
      }
    }
  }

  redirect(getHomePathForRole(session.user.role))
}
