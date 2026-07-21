export type AnswerFeedback = { selectedChoice: string; correctAnswer: string; correct: boolean }

export type AnswerButtonState =
  | 'default'
  | 'tapped-correct'
  | 'tapped-incorrect'
  | 'revealed-correct'
  | 'faded'

// Pure classifier for the four post-feedback button states (DESIGN.md
// answer-button spec). Duplicate choice text resolves by first match —
// documented data-quality edge from Story 3.4.
export function computeAnswerButtonState(
  index: number,
  choices: string[],
  feedback: AnswerFeedback | null,
): AnswerButtonState {
  if (!feedback) return 'default'
  if (index === choices.indexOf(feedback.selectedChoice)) {
    return feedback.correct ? 'tapped-correct' : 'tapped-incorrect'
  }
  if (!feedback.correct && index === choices.indexOf(feedback.correctAnswer)) {
    return 'revealed-correct'
  }
  return 'faded'
}
