import { SkillBadge } from '@/components/parent/skill-badge'
import { skillDisplayName } from '@/locales/vi/skills'
import { dashboard } from '@/locales/vi/dashboard'
import type { SkillBreakdownRow } from '@/infrastructure/repositories/dashboard-repository'

export function SkillSummarySection({
  skills,
  hasAnyCompletedSession,
  onSkillTap,
}: {
  skills: SkillBreakdownRow[]
  hasAnyCompletedSession: boolean
  onSkillTap: (skillId: string) => void
}) {
  if (!hasAnyCompletedSession) {
    return (
      <div data-slot="skill-summary-section">
        <p className="text-body text-muted-foreground">{dashboard.noSkillDataEver}</p>
      </div>
    )
  }

  const weak = skills.filter((s) => s.status === 'weak')
  const strong = skills.filter((s) => s.status === 'strong')
  const insufficient = skills.filter((s) => s.status === 'insufficient')

  return (
    <div data-slot="skill-summary-section" className="flex flex-col gap-3">
      {weak.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{dashboard.skillGroupWeak}</p>
          <div className="flex flex-wrap gap-2">
            {weak.map((skill) => (
              <div key={skill.skillId} className="flex items-center gap-2">
                <span className="text-body">{skillDisplayName(skill.code, skill.name)}</span>
                <SkillBadge status="weak" onClick={() => onSkillTap(skill.skillId)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {strong.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{dashboard.skillGroupStrong}</p>
          <div className="flex flex-wrap gap-2">
            {strong.map((skill) => (
              <div key={skill.skillId} className="flex items-center gap-2">
                <span className="text-body">{skillDisplayName(skill.code, skill.name)}</span>
                <SkillBadge status="strong" onClick={() => onSkillTap(skill.skillId)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {insufficient.length > 0 && (
        <div className="flex flex-col gap-1">
          {insufficient.map((skill) => (
            <div key={skill.skillId} className="flex items-center gap-2">
              <span className="text-body">{skillDisplayName(skill.code, skill.name)}</span>
              <span className="text-sm text-muted-foreground">{dashboard.skillInsufficientData}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
