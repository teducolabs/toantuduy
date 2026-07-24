import { describe, it, expect } from 'vitest'
import { computeClassReport, type ClassReportInput } from './class-report'

const skillA = { id: 'sk-a', code: 'pattern-recognition', name: 'Quy luật' }
const skillB = { id: 'sk-b', code: 'word-problem', name: 'Đọc hiểu' }

const students = [
  { id: 'child-1', name: 'An' },
  { id: 'child-2', name: 'Bình' },
]

function session(
  childProfileId: string,
  completedAt: string,
  answers: { skillId: string; answeredCorrectly: boolean }[],
): ClassReportInput['completedSessions'][number] {
  return { childProfileId, completedAt, answers }
}

describe('computeClassReport', () => {
  it('zero completers: average is null, all rows incomplete with null accuracies (AC #3)', () => {
    const report = computeClassReport({ students, skills: [skillA, skillB], completedSessions: [] })

    expect(report.classAverage).toBeNull()
    expect(report.rows).toEqual([
      { childProfileId: 'child-1', name: 'An', completed: false, accuracyBySkillId: null },
      { childProfileId: 'child-2', name: 'Bình', completed: false, accuracyBySkillId: null },
    ])
  })

  it('one completer: class average equals their per-skill accuracies', () => {
    const report = computeClassReport({
      students,
      skills: [skillA, skillB],
      completedSessions: [
        session('child-1', '2026-07-24T10:00:00.000Z', [
          { skillId: 'sk-a', answeredCorrectly: true },
          { skillId: 'sk-a', answeredCorrectly: false },
          { skillId: 'sk-b', answeredCorrectly: true },
        ]),
      ],
    })

    expect(report.rows[0]).toEqual({
      childProfileId: 'child-1',
      name: 'An',
      completed: true,
      accuracyBySkillId: { 'sk-a': 0.5, 'sk-b': 1 },
    })
    expect(report.rows[1].completed).toBe(false)
    expect(report.classAverage).toEqual({ 'sk-a': 0.5, 'sk-b': 1 })
  })

  it('multiple completers: unweighted mean per student even with different question counts (D4)', () => {
    const report = computeClassReport({
      students,
      skills: [skillA],
      completedSessions: [
        // child-1: 4/4 on skill A → 1.0; child-2: 1/2 → 0.5 → mean 0.75
        session('child-1', '2026-07-24T10:00:00.000Z', [
          { skillId: 'sk-a', answeredCorrectly: true },
          { skillId: 'sk-a', answeredCorrectly: true },
          { skillId: 'sk-a', answeredCorrectly: true },
          { skillId: 'sk-a', answeredCorrectly: true },
        ]),
        session('child-2', '2026-07-24T09:00:00.000Z', [
          { skillId: 'sk-a', answeredCorrectly: true },
          { skillId: 'sk-a', answeredCorrectly: false },
        ]),
      ],
    })

    expect(report.classAverage).toEqual({ 'sk-a': 0.75 })
  })

  it('re-take: uses the most recent completed session only — first in the desc-ordered list (D3)', () => {
    const report = computeClassReport({
      students,
      skills: [skillA],
      completedSessions: [
        // list arrives completedAt desc: newest first
        session('child-1', '2026-07-24T12:00:00.000Z', [{ skillId: 'sk-a', answeredCorrectly: false }]),
        session('child-1', '2026-07-23T12:00:00.000Z', [{ skillId: 'sk-a', answeredCorrectly: true }]),
      ],
    })

    expect(report.rows[0].accuracyBySkillId).toEqual({ 'sk-a': 0 })
    expect(report.classAverage).toEqual({ 'sk-a': 0 })
  })

  it('ignores sessions from children not on the roster (D9)', () => {
    const report = computeClassReport({
      students,
      skills: [skillA],
      completedSessions: [session('child-ghost', '2026-07-24T10:00:00.000Z', [{ skillId: 'sk-a', answeredCorrectly: true }])],
    })

    expect(report.classAverage).toBeNull()
    expect(report.rows.every((row) => !row.completed)).toBe(true)
  })

  it('dedupes the skill list by id preserving first-encounter order', () => {
    const report = computeClassReport({
      students,
      skills: [skillB, skillA, skillB, skillA],
      completedSessions: [],
    })

    expect(report.skills).toEqual([skillB, skillA])
  })

  it('a completer with 0/N correct has accuracy 0 — distinct from "no data"', () => {
    const report = computeClassReport({
      students,
      skills: [skillA],
      completedSessions: [
        session('child-2', '2026-07-24T10:00:00.000Z', [
          { skillId: 'sk-a', answeredCorrectly: false },
          { skillId: 'sk-a', answeredCorrectly: false },
        ]),
      ],
    })

    const row = report.rows.find((candidate) => candidate.childProfileId === 'child-2')
    expect(row?.completed).toBe(true)
    expect(row?.accuracyBySkillId).toEqual({ 'sk-a': 0 })
    expect(report.classAverage).toEqual({ 'sk-a': 0 })
  })

  it('rows come back in roster order (D9/D10 default order)', () => {
    const report = computeClassReport({
      students,
      skills: [skillA],
      completedSessions: [session('child-2', '2026-07-24T10:00:00.000Z', [{ skillId: 'sk-a', answeredCorrectly: true }])],
    })

    expect(report.rows.map((row) => row.childProfileId)).toEqual(['child-1', 'child-2'])
  })
})
