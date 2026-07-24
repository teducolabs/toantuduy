import { getSessionConfigAction } from '@/app/admin/config/actions'
import { SessionConfigForm } from '@/components/admin/session-config-form'
import { AdminOfflineToast } from '@/components/admin/admin-offline-toast'
import { admin } from '@/locales/vi/admin'

export default async function AdminConfigPage() {
  const result = await getSessionConfigAction()

  return (
    <div className="flex flex-col gap-6">
      <AdminOfflineToast />
      <h1 className="text-heading">{admin.configHeading}</h1>

      {'error' in result ? (
        <p className="text-body text-muted-foreground">{admin.configLoadFailed}</p>
      ) : (
        <SessionConfigForm
          initialQuestionCount={result.data.questionCount}
          initialTimeLimitMinutes={result.data.timeLimitMinutes}
        />
      )}
    </div>
  )
}
