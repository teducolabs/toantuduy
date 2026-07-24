// Pure step logic for the assignment-set builder (Story 5.4). Kept free of
// React/DOM imports per the established pure-helper convention so it is
// directly unit-testable.

import { assignments } from '@/locales/vi/assignments'

export function canAdvanceFromStep1(title: string): boolean {
  return title.trim().length > 0
}

// Toggles a question in/out of the selection. Adding beyond `max` is a no-op —
// this is the client-side cap; the server action re-enforces it (FR-20).
export function toggleQuestionSelection(selectedIds: string[], id: string, max: number): string[] {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((selectedId) => selectedId !== id)
  }
  if (selectedIds.length >= max) {
    return selectedIds
  }
  return [...selectedIds, id]
}

export function canSaveDraft(selectedCount: number): boolean {
  return selectedCount >= 1
}

// Toggles a class in/out of the assign selection — no cap (Story 5.5).
export function toggleClassSelection(selectedIds: string[], id: string): string[] {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((selectedId) => selectedId !== id)
  }
  return [...selectedIds, id]
}

export function canAssign(selectedClassCount: number): boolean {
  return selectedClassCount >= 1
}

export function selectionCountLabel(count: number, max: number): string {
  return assignments.selectionCount(count, max)
}
