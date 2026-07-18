import {
  WINDOW_SIZE,
  ACCURACY_UP_THRESHOLD,
  ACCURACY_DOWN_THRESHOLD,
  DEFAULT_DIFFICULTY_LEVEL,
  MIN_DIFFICULTY_LEVEL,
  MAX_DIFFICULTY_LEVEL,
} from '../constants'
import type { Question } from '../entities/question'
import type { SkillAccuracyWindow } from '../entities/skill-accuracy-window'

// Neutral weight assigned to a Skill with no answer history — neither
// favored nor penalized in the weighted selection below.
const NEUTRAL_SKILL_WEIGHT = 1
// Small floor added to every weight so a Skill at 100% accuracy still has a
// nonzero (if small) chance of being picked, rather than being excluded outright.
const WEIGHT_FLOOR = 0.1

function clampDifficultyLevel(level: number): number {
  return Math.min(MAX_DIFFICULTY_LEVEL, Math.max(MIN_DIFFICULTY_LEVEL, level))
}

/**
 * Per-Skill accuracy (over the trailing WINDOW_SIZE answers) and the
 * Difficulty Level that accuracy targets, per AD-11's up/down thresholds.
 */
function computeSkillTarget(window: SkillAccuracyWindow | undefined): {
  targetLevel: number
  weight: number
} {
  if (!window || window.answers.length === 0) {
    return { targetLevel: DEFAULT_DIFFICULTY_LEVEL, weight: NEUTRAL_SKILL_WEIGHT }
  }

  const trailing = window.answers.slice(-WINDOW_SIZE)
  const correctCount = trailing.filter(Boolean).length
  const accuracy = correctCount / trailing.length

  let targetLevel = DEFAULT_DIFFICULTY_LEVEL
  if (accuracy > ACCURACY_UP_THRESHOLD) {
    targetLevel = DEFAULT_DIFFICULTY_LEVEL + 1
  } else if (accuracy < ACCURACY_DOWN_THRESHOLD) {
    targetLevel = DEFAULT_DIFFICULTY_LEVEL - 1
  }

  // Weight is inversely proportional to accuracy: weaker Skills get picked
  // more often (AC #4 — proportionally more Questions for accuracy <50%).
  const weight = (1 - accuracy) + WEIGHT_FLOOR

  return { targetLevel: clampDifficultyLevel(targetLevel), weight }
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0)
  let roll = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return items[i]
  }
  return items[items.length - 1]
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Selects the next Question to present, weighting toward Skills where the
 * Child Profile's recent accuracy is weakest, and targeting a Difficulty
 * Level derived from that Skill's sliding-window accuracy.
 *
 * `availableQuestions` must already be pre-filtered to the Child Profile's
 * Grade Band by the caller — this function never fetches or filters by
 * Grade Band itself, it only ever returns a Question drawn from
 * `availableQuestions` (AC #5).
 */
export function selectNextQuestion(
  skillAccuracyHistory: SkillAccuracyWindow[],
  availableQuestions: Question[],
): Question {
  if (availableQuestions.length === 0) {
    throw new Error('selectNextQuestion: no available questions')
  }

  const firstGradeBand = availableQuestions[0].gradeBand
  const allSameGradeBand = availableQuestions.every((q) => q.gradeBand === firstGradeBand)
  if (!allSameGradeBand) {
    throw new Error(
      'selectNextQuestion: availableQuestions must be pre-filtered to a single Grade Band',
    )
  }

  const seenSkillIds = new Set<string>()
  for (const window of skillAccuracyHistory) {
    if (seenSkillIds.has(window.skillId)) {
      throw new Error(
        `selectNextQuestion: duplicate skillAccuracyHistory entry for skillId "${window.skillId}"`,
      )
    }
    seenSkillIds.add(window.skillId)
  }

  const historyBySkillId = new Map(skillAccuracyHistory.map((w) => [w.skillId, w]))
  const skillIds = Array.from(
    new Set([
      ...skillAccuracyHistory.map((w) => w.skillId),
      ...availableQuestions.map((q) => q.skillId),
    ]),
  )

  const targets = new Map(skillIds.map((skillId) => [skillId, computeSkillTarget(historyBySkillId.get(skillId))]))

  const chosenSkillId = pickWeighted(
    skillIds,
    skillIds.map((skillId) => targets.get(skillId)!.weight),
  )
  const chosenTarget = targets.get(chosenSkillId)!

  const matching = availableQuestions.filter(
    (q) => q.skillId === chosenSkillId && q.difficultyLevel === chosenTarget.targetLevel,
  )

  if (matching.length > 0) {
    return pickRandom(matching)
  }

  // Scoped fallback: no Question matches this Skill/Difficulty-Level
  // combination — fall back to a random pick across all available
  // Questions, ignoring Skill/Difficulty targeting (AC #6).
  return pickRandom(availableQuestions)
}
