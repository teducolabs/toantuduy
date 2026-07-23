// Pure state helper for the join-code copy button (UX-DR19): after a copy the
// label shows the confirmation for exactly COPY_CONFIRMATION_MS, then reverts.
export const COPY_CONFIRMATION_MS = 2000

export function isCopyConfirmationActive(copiedAt: number | null, now: number): boolean {
  return copiedAt !== null && now - copiedAt < COPY_CONFIRMATION_MS
}

export function computeCopyButtonLabel(
  copiedAt: number | null,
  now: number,
  labels: { copy: string; copied: string },
): string {
  return isCopyConfirmationActive(copiedAt, now) ? labels.copied : labels.copy
}
