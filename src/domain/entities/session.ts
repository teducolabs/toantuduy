export interface Session {
  id: string
  childProfileId: string
  completedAt: string | null
  questionCount: number
  correctCount: number
}
