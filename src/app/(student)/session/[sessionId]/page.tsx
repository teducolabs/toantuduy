import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getChildProfileId } from '@/lib/child-profile-cookie'
import { db } from '@/lib/db'
import { SessionProgressChip } from '@/components/student/session-progress-chip'
import { student } from '@/locales/vi/student'

export default async function StudentSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const childProfileId = await getChildProfileId(await headers())
  if (!childProfileId) notFound()

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { answers: { include: { question: true }, orderBy: { id: 'asc' } } },
  })
  if (!session || session.childProfileId !== childProfileId) notFound()

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
  const currentQuestion = session.answers[currentIndex]?.question

  return (
    <main>
      <SessionProgressChip current={currentIndex + 1} total={session.answers.length} />
      {currentQuestion ? <p>{currentQuestion.prompt}</p> : null}
    </main>
  )
}
