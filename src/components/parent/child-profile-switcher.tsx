'use client'

import { ChevronDown } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ChildProfileForm } from '@/components/parent/child-profile-form'
import { profiles } from '@/locales/vi/profiles'
import type { ChildProfile } from '@prisma/client'

export function ChildProfileSwitcher({ childProfiles }: { childProfiles: ChildProfile[] }) {
  const activeProfile = childProfiles[0]

  return (
    <Sheet>
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
                <li key={childProfile.id} className="rounded-brand-sm border border-gray-200 px-3 py-2">
                  <p className="font-semibold">{childProfile.name}</p>
                  <p className="text-sm text-muted-foreground">{profiles.gradeBandLabels[childProfile.gradeBand]}</p>
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
