import type { GradeBand } from './child-profile'

export interface Question {
  id: string
  prompt: string
  imageUrl: string | null
  choices: unknown
  correctAnswer: string
  skillId: string
  gradeBand: GradeBand
  difficultyLevel: number
}
