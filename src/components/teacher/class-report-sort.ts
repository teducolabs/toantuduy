// Pure client-side sort logic for the class report table (Story 5.6, D10).
// Kept out of the component so the semantics are unit-testable.
import type { ClassReportRow } from '@/domain/use-cases/class-report'

export type SortKey = 'completion' | { skillId: string }

// Direction semantics: first click on any header is always 'asc' — for
// completion that means complete-first (UX-DR19 default), for a skill column
// low-first (weak students surface immediately). Second click flips.
export type SortState = { key: SortKey; direction: 'asc' | 'desc' } | null

function isSameKey(a: SortKey, b: SortKey): boolean {
  if (a === 'completion' || b === 'completion') return a === b
  return a.skillId === b.skillId
}

export function nextSortState(current: SortState, clickedKey: SortKey): SortState {
  if (current && isSameKey(current.key, clickedKey)) {
    return { key: clickedKey, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  }
  // A different header always resets to that key's default — only one active
  // sort key at a time (D10).
  return { key: clickedKey, direction: 'asc' }
}

// Stable sort; never mutates the input. Null state = roster (input) order.
export function sortRows(rowList: ClassReportRow[], sortState: SortState): ClassReportRow[] {
  if (!sortState) return [...rowList]

  const indexed = rowList.map((reportRow, index) => ({ reportRow, index }))

  indexed.sort((a, b) => {
    let comparison = 0
    if (sortState.key === 'completion') {
      // asc = complete-first; desc = incomplete-first.
      const rank = (candidate: ClassReportRow) => (candidate.completed ? 0 : 1)
      comparison = rank(a.reportRow) - rank(b.reportRow)
      if (sortState.direction === 'desc') comparison = -comparison
    } else {
      const { skillId } = sortState.key
      const valueA = a.reportRow.accuracyBySkillId?.[skillId]
      const valueB = b.reportRow.accuracyBySkillId?.[skillId]
      // No-data rows sort AFTER rows with data regardless of direction (D10).
      if (valueA === undefined || valueB === undefined) {
        comparison = (valueA === undefined ? 1 : 0) - (valueB === undefined ? 1 : 0)
      } else {
        comparison = sortState.direction === 'asc' ? valueA - valueB : valueB - valueA
      }
    }
    // Stability: fall back to original (roster) order.
    return comparison !== 0 ? comparison : a.index - b.index
  })

  return indexed.map((entry) => entry.reportRow)
}
