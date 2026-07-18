import { student } from '@/locales/vi/student'

export function SessionProgressChip(props: { current: number; total: number }) {
  return (
    <span data-slot="session-progress-chip" aria-live="polite">
      {student.sessionProgressLabel(props.current, props.total)}
    </span>
  )
}
