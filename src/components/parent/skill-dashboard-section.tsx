'use client'

import { useState } from 'react'
import { SkillSummarySection } from '@/components/parent/skill-summary-section'
import { SkillDetailPanel } from '@/components/parent/skill-detail-panel'
import { skillDisplayName } from '@/locales/vi/skills'
import type { SkillBreakdownRow } from '@/infrastructure/repositories/dashboard-repository'

export function SkillDashboardSection({
  childProfileId,
  skills,
  hasAnyCompletedSession,
}: {
  childProfileId: string
  skills: SkillBreakdownRow[]
  hasAnyCompletedSession: boolean
}) {
  const [openSkillId, setOpenSkillId] = useState<string | null>(null)

  const openSkill = skills.find((skill) => skill.skillId === openSkillId)
  const openStatus = openSkill?.status === 'strong' ? 'strong' : 'weak'
  const accuracy = openSkill && openSkill.attempts > 0 ? Math.round((openSkill.correct / openSkill.attempts) * 100) : 0

  return (
    <>
      <SkillSummarySection skills={skills} hasAnyCompletedSession={hasAnyCompletedSession} onSkillTap={setOpenSkillId} />
      <SkillDetailPanel
        open={openSkillId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenSkillId(null)
        }}
        childProfileId={childProfileId}
        skillId={openSkillId}
        skillName={openSkill ? skillDisplayName(openSkill.code, openSkill.name) : ''}
        status={openStatus}
        accuracy={accuracy}
      />
    </>
  )
}
