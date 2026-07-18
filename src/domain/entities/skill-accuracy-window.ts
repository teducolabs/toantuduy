/**
 * Holds the outcomes of the last WINDOW_SIZE answered Questions for one Skill,
 * oldest first. `answers.length` may be less than WINDOW_SIZE when a Skill has
 * fewer than WINDOW_SIZE recorded answers.
 */
export interface SkillAccuracyWindow {
  skillId: string
  answers: boolean[]
}
