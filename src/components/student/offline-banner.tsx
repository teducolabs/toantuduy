import { student } from '@/locales/vi/student'

export function OfflineBanner() {
  return (
    <p data-slot="offline-banner" role="status" className="mt-4 text-label-student">
      {student.offlineBanner}
    </p>
  )
}
