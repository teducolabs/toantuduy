import { Card } from '@/components/ui/card'
import { AudioButton } from '@/components/student/audio-button'
import { AnswerButtonGrid } from '@/components/student/answer-button-grid'

export function QuestionCard(props: {
  sessionAnswerId: string
  prompt: string
  imageUrl: string | null
  choices: string[]
  audioAutoPlay: boolean
  alreadyAnswered?: boolean
}) {
  const { sessionAnswerId, prompt, imageUrl, choices, audioAutoPlay, alreadyAnswered = false } = props

  return (
    <Card data-slot="question-card" className="rounded-brand-xl shadow-sm bg-white gap-4">
      <div className="flex justify-end px-(--card-spacing)">
        <AudioButton text={prompt} autoPlay={audioAutoPlay} />
      </div>
      {imageUrl ? (
        <div className="px-(--card-spacing)">
          <img src={imageUrl} alt="" loading="lazy" className="h-40 w-full object-contain" />
        </div>
      ) : null}
      <p className="text-question px-(--card-spacing)">{prompt}</p>
      <div className="px-(--card-spacing)">
        <AnswerButtonGrid sessionAnswerId={sessionAnswerId} choices={choices} disabled={alreadyAnswered} />
      </div>
    </Card>
  )
}
