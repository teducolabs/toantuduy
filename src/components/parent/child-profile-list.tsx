'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { ChildProfileForm } from '@/components/parent/child-profile-form'
import { DeleteChildProfileDialog } from '@/components/parent/delete-child-profile-dialog'
import { SelectChildProfileButton } from '@/components/parent/select-child-profile-button'
import { switchActiveChildProfileAction } from '@/app/(parent)/profiles/actions'
import { profiles } from '@/locales/vi/profiles'
import type { ChildProfile } from '@prisma/client'

export function ChildProfileList({
  childProfiles,
  activeProfileId,
}: {
  childProfiles: ChildProfile[]
  activeProfileId: string | null
}) {
  const router = useRouter()
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  if (childProfiles.length === 0) {
    return <p className="text-body text-muted-foreground">{profiles.emptyState}</p>
  }

  async function handleSelect(childProfileId: string) {
    if (switchingId !== null) return

    setSwitchingId(childProfileId)
    try {
      const result = await switchActiveChildProfileAction({ id: childProfileId })
      if ('error' in result) {
        toast.error(profiles.switchFailed)
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      toast.error(profiles.switchFailed)
    } finally {
      setSwitchingId(null)
    }
  }

  return (
    <ul className="flex flex-col gap-3">
      {childProfiles.map((childProfile) => {
        const isActive = childProfile.id === activeProfileId
        return (
          <li key={childProfile.id} aria-current={isActive ? 'true' : undefined}>
            <Card>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{childProfile.name}</p>
                  <p className="text-sm text-muted-foreground">{profiles.gradeBandLabels[childProfile.gradeBand]}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <span className="text-sm text-muted-foreground">{profiles.activeProfileLabel}</span>
                  ) : (
                    <SelectChildProfileButton
                      childName={childProfile.name}
                      isSwitching={switchingId === childProfile.id}
                      disabled={switchingId !== null}
                      onSelect={() => handleSelect(childProfile.id)}
                    />
                  )}
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
        )
      })}
    </ul>
  )
}
