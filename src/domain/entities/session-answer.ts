export interface SessionAnswer {
  id: string
  sessionId: string
  questionId: string
  answeredCorrectly: boolean
  difficultyLevelAtAnswer: number
}
