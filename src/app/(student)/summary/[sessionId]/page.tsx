import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getChildProfileId } from '@/lib/child-profile-cookie'
import { db } from '@/lib/db'
import { findChildProfileById } from '@/infrastructure/repositories/child-profile-repository'
import { getSessionStartGateState } from '@/app/(student)/actions'
import { computePerSkillBreakdown } from '@/domain/use-cases/session-scoring'
import { skillDisplayName } from '@/locales/vi/skills'
import { SessionSummaryCard } from '@/components/student/session-summary-card'

export default async function StudentSummaryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const childProfileId = await getChildProfileId(await headers())
  if (!childProfileId) notFound()

  const [session, childProfile] = await Promise.all([
    db.session.findUnique({
      where: { id: sessionId },
      include: {
        answers: {
          select: {
            answeredCorrectly: true,
            question: { select: { skillId: true, skill: { select: { code: true, name: true } } } },
          },
          orderBy: { id: 'asc' },
        },
      },
    }),
    findChildProfileById(childProfileId),
  ])
  if (!session || session.childProfileId !== childProfileId) notFound()
  if (!childProfile) notFound()

  // An in-progress/abandoned session has no summary — URL-guessing lands
  // back in the session (FR-7: incomplete sessions expose nothing).
  if (session.completedAt === null) redirect(`/session/${sessionId}`)

  const gateState = await getSessionStartGateState(childProfile.id, childProfile.parentAccountId)

  const skillNameBySkillId = new Map(
    session.answers.map((answer) => [
      answer.question.skillId,
      skillDisplayName(answer.question.skill.code, answer.question.skill.name),
    ]),
  )
  const skillRows = computePerSkillBreakdown(
    session.answers.map((answer) => ({
      skillId: answer.question.skillId,
      answeredCorrectly: answer.answeredCorrectly,
    })),
  ).map((row) => ({
    name: skillNameBySkillId.get(row.skillId) ?? row.skillId,
    correct: row.correct,
    total: row.total,
  }))

  return (
    <main>
      <SessionSummaryCard
        score={session.correctCount}
        total={session.questionCount}
        skillRows={skillRows}
        allotmentExhausted={gateState.blocked}
      />
    </main>
  )
}
