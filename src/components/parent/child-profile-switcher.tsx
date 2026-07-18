'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ChildProfileForm } from '@/components/parent/child-profile-form'
import { switchActiveChildProfileAction } from '@/app/(parent)/profiles/actions'
import { profiles } from '@/locales/vi/profiles'
import type { ChildProfile } from '@prisma/client'

export function ChildProfileSwitcher({
  childProfiles,
  activeProfileId,
}: {
  childProfiles: ChildProfile[]
  activeProfileId: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const activeProfile = childProfiles.find((childProfile) => childProfile.id === activeProfileId) ?? childProfiles[0]

  async function handleSwitch(childProfileId: string) {
    if (switchingId !== null) return

    setSwitchingId(childProfileId)
    try {
      const result = await switchActiveChildProfileAction({ id: childProfileId })
      if ('error' in result) {
        toast.error(profiles.switchFailed)
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      toast.error(profiles.switchFailed)
    } finally {
      setSwitchingId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" className="rounded-brand-sm flex items-center gap-2" />}>
        {activeProfile ? (
          <span>
            {activeProfile.name} · {profiles.gradeBandLabels[activeProfile.gradeBand]}
          </span>
        ) : (
          <span>{profiles.switcherEmptyLabel}</span>
        )}
        <ChevronDown size={16} />
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>{profiles.switcherSheetTitle}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4">
          {childProfiles.length === 0 ? (
            <p className="text-body text-muted-foreground">{profiles.emptyState}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {childProfiles.map((childProfile) => (
                <li key={childProfile.id}>
                  <button
                    type="button"
                    onClick={() => handleSwitch(childProfile.id)}
                    disabled={switchingId !== null}
                    className="rounded-brand-sm w-full border border-gray-200 px-3 py-2 text-left disabled:opacity-60"
                    aria-current={childProfile.id === activeProfile?.id ? 'true' : undefined}
                  >
                    <p className="font-semibold">{childProfile.name}</p>
                    <p className="text-sm text-muted-foreground">{profiles.gradeBandLabels[childProfile.gradeBand]}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <ChildProfileForm mode="create" trigger={profiles.addProfileCta} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
