import { describe, it, expect } from 'vitest'
import { nextSortState, sortRows, type SortState } from './class-report-sort'
import type { ClassReportRow } from '@/domain/use-cases/class-report'

function row(childProfileId: string, completed: boolean, accuracy: Record<string, number> | null): ClassReportRow {
  return { childProfileId, name: childProfileId, completed, accuracyBySkillId: accuracy }
}

// Roster order: an (complete, 50%), binh (incomplete), chi (complete, 100%), dung (complete, 0%)
const rows = [
  row('an', true, { 'sk-a': 0.5 }),
  row('binh', false, null),
  row('chi', true, { 'sk-a': 1 }),
  row('dung', true, { 'sk-a': 0 }),
]

describe('nextSortState', () => {
  it('first click on completion → complete-first (asc)', () => {
    expect(nextSortState(null, 'completion')).toEqual({ key: 'completion', direction: 'asc' })
  })

  it('second click on completion toggles to incomplete-first (desc)', () => {
    expect(nextSortState({ key: 'completion', direction: 'asc' }, 'completion')).toEqual({
      key: 'completion',
      direction: 'desc',
    })
  })

  it('first click on a skill → low-first (asc); second click toggles high-first (desc)', () => {
    const first = nextSortState(null, { skillId: 'sk-a' })
    expect(first).toEqual({ key: { skillId: 'sk-a' }, direction: 'asc' })
    expect(nextSortState(first, { skillId: 'sk-a' })).toEqual({ key: { skillId: 'sk-a' }, direction: 'desc' })
  })

  it('clicking a different key resets to that key default (only one active sort key)', () => {
    const skillSort: SortState = { key: { skillId: 'sk-a' }, direction: 'desc' }
    expect(nextSortState(skillSort, 'completion')).toEqual({ key: 'completion', direction: 'asc' })
    expect(nextSortState({ key: 'completion', direction: 'desc' }, { skillId: 'sk-b' })).toEqual({
      key: { skillId: 'sk-b' },
      direction: 'asc',
    })
    expect(nextSortState(skillSort, { skillId: 'sk-b' })).toEqual({ key: { skillId: 'sk-b' }, direction: 'asc' })
  })
})

describe('sortRows', () => {
  it('null state returns input (roster) order', () => {
    expect(sortRows(rows, null).map((sorted) => sorted.childProfileId)).toEqual(['an', 'binh', 'chi', 'dung'])
  })

  it('does not mutate the input array', () => {
    const copy = [...rows]
    sortRows(rows, { key: 'completion', direction: 'desc' })
    expect(rows).toEqual(copy)
  })

  it('completion asc = complete-first, stable within groups (roster order preserved)', () => {
    const sorted = sortRows(rows, { key: 'completion', direction: 'asc' })
    expect(sorted.map((sortedRow) => sortedRow.childProfileId)).toEqual(['an', 'chi', 'dung', 'binh'])
  })

  it('completion desc = incomplete-first', () => {
    const sorted = sortRows(rows, { key: 'completion', direction: 'desc' })
    expect(sorted.map((sortedRow) => sortedRow.childProfileId)).toEqual(['binh', 'an', 'chi', 'dung'])
  })

  it('skill asc = low-first with no-data rows always last', () => {
    const sorted = sortRows(rows, { key: { skillId: 'sk-a' }, direction: 'asc' })
    expect(sorted.map((sortedRow) => sortedRow.childProfileId)).toEqual(['dung', 'an', 'chi', 'binh'])
  })

  it('skill desc = high-first with no-data rows still last', () => {
    const sorted = sortRows(rows, { key: { skillId: 'sk-a' }, direction: 'desc' })
    expect(sorted.map((sortedRow) => sortedRow.childProfileId)).toEqual(['chi', 'an', 'dung', 'binh'])
  })

  it('skill sort is stable for equal accuracies', () => {
    const tied = [row('a', true, { 'sk-a': 0.5 }), row('b', true, { 'sk-a': 0.5 }), row('c', true, { 'sk-a': 0.5 })]
    const sorted = sortRows(tied, { key: { skillId: 'sk-a' }, direction: 'asc' })
    expect(sorted.map((sortedRow) => sortedRow.childProfileId)).toEqual(['a', 'b', 'c'])
  })
})
