import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getChildProfileId } from '@/lib/child-profile-cookie'
import { db } from '@/lib/db'
import { findChildProfileById } from '@/infrastructure/repositories/child-profile-repository'
import { SessionProgressChip } from '@/components/student/session-progress-chip'
import { QuestionCard } from '@/components/student/question-card'
import { CompleteSessionButton } from '@/components/student/complete-session-button'
import { ExitToDashboardLink } from '@/components/student/exit-to-dashboard-link'
import { student } from '@/locales/vi/student'

export default async function StudentSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const childProfileId = await getChildProfileId(await headers())
  if (!childProfileId) notFound()

  const [session, childProfile] = await Promise.all([
    db.session.findUnique({
      where: { id: sessionId },
      include: { answers: { include: { question: true }, orderBy: { id: 'asc' } } },
    }),
    findChildProfileById(childProfileId),
  ])
  if (!session || session.childProfileId !== childProfileId) notFound()
  if (!childProfile) notFound()

  // A finished session has no question view — back-button/deep-link lands
  // on the summary instead of the quiet already-answered state.
  if (session.completedAt !== null) redirect(`/summary/${sessionId}`)

  // A stale tab/bookmark pointing at a superseded session must never render
  // a question card for it — send the student home to the current session.
  if (session.abandonedAt !== null) redirect('/')

  if (session.answers.length === 0) {
    return (
      <main>
        <ExitToDashboardLink />
        <p>{student.noQuestionsAvailableError}</p>
      </main>
    )
  }

  const firstUnanswered = session.answers.find((answer) => answer.answeredAt === null)
  const currentIndex = firstUnanswered
    ? session.answers.indexOf(firstUnanswered)
    : session.answers.length - 1
  const currentAnswer = session.answers[currentIndex]
  const currentQuestion = currentAnswer?.question

  const choices = Array.isArray(currentQuestion?.choices) ? (currentQuestion.choices as string[]) : []

  return (
    <main>
      <ExitToDashboardLink />
      <SessionProgressChip current={currentIndex + 1} total={session.answers.length} />
      {currentQuestion && currentAnswer ? (
        <QuestionCard
          key={currentAnswer.id}
          sessionId={session.id}
          sessionAnswerId={currentAnswer.id}
          prompt={currentQuestion.prompt}
          imageUrl={currentQuestion.imageUrl}
          choices={choices}
          audioAutoPlay={childProfile.gradeBand === 'GRADE_1'}
          alreadyAnswered={currentAnswer.answeredAt !== null}
          isFinalQuestion={currentIndex === session.answers.length - 1}
        />
      ) : null}
      {/* Dead-end fix: every answer is in but completedAt is still null
          (tab closed before "Tiếp theo →") — give the summary an
          affordance, or this session could never complete. */}
      {!firstUnanswered && session.completedAt === null ? <CompleteSessionButton sessionId={session.id} /> : null}
    </main>
  )
}
