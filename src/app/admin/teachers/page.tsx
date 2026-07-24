import { getPendingTeachersAction } from '@/app/admin/teachers/actions'
import { TeacherApplicationRow } from '@/components/admin/teacher-application-row'
import { AdminOfflineToast } from '@/components/admin/admin-offline-toast'
import { admin } from '@/locales/vi/admin'

export default async function AdminTeachersPage() {
  const result = await getPendingTeachersAction()

  return (
    <div className="flex flex-col gap-6">
      <AdminOfflineToast />
      <h1 className="text-heading">{admin.teachersHeading}</h1>

      {'error' in result ? (
        <p className="text-body text-muted-foreground">{admin.teachersLoadFailed}</p>
      ) : result.data.applications.length === 0 ? (
        <p className="text-body text-muted-foreground">{admin.teachersEmptyState}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.data.applications.map((application) => (
            <li key={application.id}>
              <TeacherApplicationRow
                teacherAccountId={application.id}
                fullName={application.fullName}
                schoolName={application.schoolName}
                gradeTaught={application.gradeTaught}
                submittedDateLabel={application.createdAt.toLocaleDateString('vi-VN')}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
