import { dashboard } from '@/locales/vi/dashboard'

export function SkillBadge({
  status,
  onClick,
}: {
  status: 'strong' | 'weak'
  onClick?: () => void
}) {
  const isStrong = status === 'strong'
  return (
    <button
      type="button"
      data-slot="skill-badge"
      onClick={onClick}
      className={`min-h-11 min-w-11 rounded-full px-3 py-2 text-sm font-medium ${
        isStrong ? 'bg-[--color-skill-strong-bg] text-[--color-skill-strong-fg]' : 'bg-[--color-skill-weak-bg] text-[--color-skill-weak-fg]'
      }`}
    >
      {isStrong ? dashboard.skillBadgeStrong : dashboard.skillBadgeWeak}
    </button>
  )
}
