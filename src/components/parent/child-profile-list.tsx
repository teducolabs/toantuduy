import { Card, CardContent } from '@/components/ui/card'
import { ChildProfileForm } from '@/components/parent/child-profile-form'
import { DeleteChildProfileDialog } from '@/components/parent/delete-child-profile-dialog'
import { profiles } from '@/locales/vi/profiles'
import type { ChildProfile } from '@prisma/client'

export function ChildProfileList({ childProfiles }: { childProfiles: ChildProfile[] }) {
  if (childProfiles.length === 0) {
    return <p className="text-body text-muted-foreground">{profiles.emptyState}</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {childProfiles.map((childProfile) => (
        <li key={childProfile.id}>
          <Card>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{childProfile.name}</p>
                <p className="text-sm text-muted-foreground">{profiles.gradeBandLabels[childProfile.gradeBand]}</p>
              </div>
              <div className="flex items-center gap-2">
                <ChildProfileForm
                  mode="edit"
                  profileId={childProfile.id}
                  initialName={childProfile.name}
                  initialGradeBand={childProfile.gradeBand}
                  trigger={profiles.renameCta}
                />
                <DeleteChildProfileDialog profileId={childProfile.id} profileName={childProfile.name} />
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
