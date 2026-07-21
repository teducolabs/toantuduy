import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getChildProfileId } from '@/lib/child-profile-cookie'
import { db } from '@/lib/db'
import { findChildProfileById } from '@/infrastructure/repositories/child-profile-repository'
import { SessionProgressChip } from '@/components/student/session-progress-chip'
import { QuestionCard } from '@/components/student/question-card'
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

  if (session.answers.length === 0) {
    return (
      <main>
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
      <SessionProgressChip current={currentIndex + 1} total={session.answers.length} />
      {currentQuestion && currentAnswer ? (
        <QuestionCard
          key={currentAnswer.id}
          sessionAnswerId={currentAnswer.id}
          prompt={currentQuestion.prompt}
          imageUrl={currentQuestion.imageUrl}
          choices={choices}
          audioAutoPlay={childProfile.gradeBand === 'GRADE_1'}
          alreadyAnswered={currentAnswer.answeredAt !== null}
          isFinalQuestion={currentIndex === session.answers.length - 1}
        />
      ) : null}
    </main>
  )
}
