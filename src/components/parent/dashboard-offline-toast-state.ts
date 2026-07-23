// Fires only on the falling edge (previously online, now offline) — never on
// a mount-time snapshot and never again while still offline (AC #3: exactly once per disconnect).
export function shouldFireOfflineToast(previousOnline: boolean, currentOnline: boolean): boolean {
  return previousOnline && !currentOnline
}
